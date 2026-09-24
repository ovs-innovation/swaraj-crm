import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { isInsideUploads } from './fileSecurity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG_PATH || ffmpegInstaller.path;
const FFPROBE = process.env.FFPROBE_PATH || ffprobeInstaller.path;

const escDraw = (s) =>
  String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/\n/g, ' ');

const escSub = (p) =>
  path
    .resolve(p)
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");

const fontFile = () => {
  const win = 'C:/Windows/Fonts/arial.ttf';
  if (fs.existsSync(win)) return win.replace(/\\/g, '/').replace(/:/g, '\\:');
  return '';
};

export const probeDuration = (filePath) =>
  new Promise((resolve) => {
    const proc = spawn(FFPROBE, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let out = '';
    proc.stdout.on('data', (d) => {
      out += d.toString();
    });
    proc.on('close', () => resolve(Number(out) || 0));
    proc.on('error', () => resolve(0));
  });

const parseTime = (line) => {
  const m = String(line).match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
};

const runFfmpeg = (args, { duration = 0, onProgress } = {}) =>
  new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, ['-hide_banner', '-y', ...args]);
    let err = '';
    proc.stderr.on('data', (buf) => {
      const chunk = buf.toString();
      err += chunk;
      if (onProgress && duration) {
        const t = parseTime(chunk);
        if (t) onProgress(Math.min(99, Math.round((t / duration) * 100)));
      }
    });
    proc.on('error', (e) => reject(new Error(`FFmpeg missing or failed to start: ${e.message}`)));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.slice(-800) || `FFmpeg exited ${code}`));
    });
  });

const aspectSize = (aspect) => {
  if (aspect === '9:16') return { w: 1080, h: 1920 };
  if (aspect === '1:1') return { w: 1080, h: 1080 };
  if (aspect === '16:9') return { w: 1920, h: 1080 };
  return null;
};

const resScale = (resolution) => {
  if (resolution === '1080') return 1080;
  if (resolution === '720') return 720;
  if (resolution === '480') return 480;
  return 0;
};

export const renderVideo = async (job, onProgress, forensic = {}) => {
  const spec = job.editSpec || {};
  const outName = `edit-${job._id}-${Date.now()}.mp4`;
  const outPath = path.join(path.dirname(job.originalPath), outName);
  const outUrl = `/uploads/${path.basename(outPath)}`;

  const inputs = [];
  const addIn = (p) => {
    if (p && fs.existsSync(p) && isInsideUploads(p)) {
      inputs.push(p);
      return inputs.length - 1;
    }
    return -1;
  };

  const introIdx = addIn(job.introPath);
  const mainIdx = addIn(job.originalPath);
  if (mainIdx < 0) throw new Error('Original video file is missing');
  const mergeIdx = (job.mergePaths || []).map((p) => addIn(p)).filter((i) => i >= 0);
  const outroIdx = addIn(job.outroPath);
  const musicIdx = addIn(job.musicPath);
  const markIdx = addIn(job.watermarkPath);

  const size = aspectSize(spec.aspect);
  const maxH = resScale(spec.resolution);
  const crf = spec.compress ? '28' : '23';

  let vf = [];
  if (spec.rotate === 90) vf.push('transpose=1');
  if (spec.rotate === 270) vf.push('transpose=2');
  if (spec.rotate === 180) vf.push('transpose=1,transpose=1');
  if (spec.flipH) vf.push('hflip');
  if (spec.flipV) vf.push('vflip');
  if (size) {
    vf.push(`crop='min(iw,ih*${size.w}/${size.h})':'min(ih,iw*${size.h}/${size.w})'`);
    vf.push(`scale=${size.w}:${size.h}:force_original_aspect_ratio=decrease`);
    vf.push(`pad=${size.w}:${size.h}:(ow-iw)/2:(oh-ih)/2`);
  } else if (maxH) {
    vf.push(`scale=-2:${maxH}`);
  }

  const font = fontFile();
  (spec.texts || []).forEach((layer) => {
    if (!layer?.text) return;
    const x = `w*${Number(layer.x ?? 0.08)}`;
    const y = `h*${Number(layer.y ?? 0.08)}`;
    const sizePx = Number(layer.size) || 36;
    const color = (layer.color || '#ffffff').replace('#', '');
    const fontPart = font ? `fontfile=${font}:` : '';
    vf.push(
      `drawtext=${fontPart}text='${escDraw(layer.text)}':fontsize=${sizePx}:fontcolor=${color}:x=${x}:y=${y}:box=1:boxcolor=black@0.35:boxborderw=8`
    );
  });

  if (job.srtPath && fs.existsSync(job.srtPath)) {
    vf.push(`subtitles='${escSub(job.srtPath)}'`);
  }
  if (forensic.mark) {
    const fontPart = font ? `fontfile=${font}:` : '';
    vf.push(
      `drawtext=${fontPart}text='${escDraw(forensic.mark)}':fontsize=9:fontcolor=white@0.07:x=10:y=h-16`
    );
  }

  const filters = [];
  const labeled = [];
  const chain = (idx, label) => {
    const core = vf.length ? `[${idx}:v]${vf.join(',')}[${label}v]` : `[${idx}:v]format=yuv420p[${label}v]`;
    filters.push(core);
    labeled.push(label);
  };

  if (introIdx >= 0) chain(introIdx, 'in');
  chain(mainIdx, 'mn');
  mergeIdx.forEach((idx, i) => chain(idx, `mg${i}`));
  if (outroIdx >= 0) chain(outroIdx, 'ot');

  let lastV = 'mnv';
  if (labeled.length > 1) {
    const concatIn = labeled.map((l) => `[${l}v]`).join('');
    filters.push(`${concatIn}concat=n=${labeled.length}:v=1:a=0[catv]`);
    lastV = 'catv';
  }

  if (markIdx >= 0) {
    filters.push(`[${markIdx}:v]scale=180:-1[wm]`);
    filters.push(`[${lastV}][wm]overlay=W-w-24:24[outv]`);
    lastV = 'outv';
  }

  const mute = Boolean(spec.muteOriginal);
  const ov = mute ? 0 : Number(spec.originalVolume ?? 1);
  const mv = Number(spec.musicVolume ?? 0.35);
  if (musicIdx >= 0) {
    if (mute) {
      filters.push(`[${musicIdx}:a]volume=${mv}[outa]`);
    } else {
      filters.push(`[${mainIdx}:a]volume=${ov}[a0]`);
      filters.push(`[${musicIdx}:a]volume=${mv}[a1]`);
      filters.push('[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[outa]');
    }
  } else if (mute) {
    filters.push('anullsrc=r=44100:cl=stereo[outa]');
  } else {
    filters.push(`[${mainIdx}:a]volume=${ov}[outa]`);
  }

  const args = [];
  inputs.forEach((p) => {
    args.push('-i', p);
  });

  const start = Number(spec.trimStart) || 0;
  const end = Number(spec.trimEnd) || 0;
  if (start > 0) args.push('-ss', String(start));

  args.push('-filter_complex', filters.join(';'));
  args.push('-map', `[${lastV}]`, '-map', '[outa]');
  if (end > start) args.push('-t', String(end - start));
  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf, '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart');
  const metaSafe = (s) => String(s || '').replace(/[\r\n=;]/g, '').slice(0, 180);
  if (forensic.comment) {
    args.push(
      '-metadata', `title=${metaSafe(forensic.title || 'Swaraj CRM')}`,
      '-metadata', `artist=${metaSafe(forensic.dealerId)}`,
      '-metadata', `album=${metaSafe(forensic.videoId)}`,
      '-metadata', `comment=${metaSafe(forensic.comment)}`,
      '-metadata', `date=${metaSafe(forensic.date)}`
    );
  }
  args.push(outPath);

  const duration = (await probeDuration(job.originalPath)) || 30;
  await runFfmpeg(args, { duration, onProgress });

  let thumbUrl = job.thumbnailUrl;
  let thumbPath = job.thumbnailPath;
  if (!thumbPath || !fs.existsSync(thumbPath)) {
    const tName = `thumb-${job._id}-${Date.now()}.jpg`;
    const tPath = path.join(path.dirname(outPath), tName);
    try {
      await runFfmpeg(['-i', outPath, '-ss', '00:00:01', '-frames:v', '1', tPath]);
      thumbPath = tPath;
      thumbUrl = `/uploads/${tName}`;
    } catch {
      // keep existing
    }
  }

  return { outPath, outUrl, thumbPath, thumbUrl };
};
