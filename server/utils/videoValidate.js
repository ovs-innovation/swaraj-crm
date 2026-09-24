import { spawn } from 'child_process';
import fs from 'fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

const FFPROBE = process.env.FFPROBE_PATH || ffprobeInstaller.path;
const FFMPEG = process.env.FFMPEG_PATH || ffmpegInstaller.path;

const maxMb = () => Number(process.env.VIDEO_MAX_MB || 512);
const maxSec = () => Number(process.env.VIDEO_MAX_SEC || 180);
const minW = () => Number(process.env.VIDEO_MIN_WIDTH || 480);
const maxFps = () => Number(process.env.VIDEO_MAX_FPS || 60);
const allowedVideo = (process.env.VIDEO_CODECS || 'h264,hevc,mpeg4,vp8,vp9,av1').split(',');
const allowedAudio = (process.env.AUDIO_CODECS || 'aac,mp3,opus,vorbis,pcm_s16le').split(',');

export const probeFile = (filePath) =>
  new Promise((resolve, reject) => {
    const proc = spawn(FFPROBE, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', filePath]);
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => {
      out += d.toString();
    });
    proc.stderr.on('data', (d) => {
      err += d.toString();
    });
    proc.on('error', (e) => reject(e));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || 'ffprobe failed'));
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error('Could not read video metadata'));
      }
    });
  });

export const validateUpload = async (file) => {
  const errors = [];
  const sizeMb = (file.size || (fs.existsSync(file.path) ? fs.statSync(file.path).size : 0)) / (1024 * 1024);
  if (sizeMb > maxMb()) errors.push(`File is ${sizeMb.toFixed(1)} MB. Max ${maxMb()} MB.`);

  let probe = null;
  try {
    probe = await probeFile(file.path);
  } catch (err) {
    errors.push(`Unsupported or corrupt video: ${err.message}`);
    return { ok: false, errors, probe: null };
  }

  const video = (probe.streams || []).find((s) => s.codec_type === 'video');
  const audio = (probe.streams || []).find((s) => s.codec_type === 'audio');
  const duration = Number(probe.format?.duration || video?.duration || 0);
  const width = Number(video?.width || 0);
  const height = Number(video?.height || 0);
  const rate = String(video?.avg_frame_rate || '0/1').split('/');
  const fps = Number(rate[0] || 0) / Math.max(1, Number(rate[1] || 1));

  if (!video) errors.push('No video stream found.');
  if (duration > maxSec()) errors.push(`Duration ${Math.round(duration)}s. Max ${maxSec()}s.`);
  if (width && width < minW()) errors.push(`Width ${width}px is below ${minW()}px.`);
  if (fps && fps > maxFps()) errors.push(`FPS ${fps.toFixed(1)} is above ${maxFps()}.`);
  if (video?.codec_name && !allowedVideo.includes(video.codec_name)) {
    errors.push(`Video codec ${video.codec_name} is not allowed.`);
  }
  if (audio?.codec_name && !allowedAudio.includes(audio.codec_name)) {
    errors.push(`Audio codec ${audio.codec_name} is not allowed.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    probe: {
      duration,
      width,
      height,
      fps: Number(fps.toFixed(2)),
      videoCodec: video?.codec_name || '',
      audioCodec: audio?.codec_name || '',
      sizeMb: Number(sizeMb.toFixed(2)),
    },
  };
};

export const binOk = (bin) =>
  new Promise((resolve) => {
    const proc = spawn(bin, ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });

export const ffmpegBins = () => ({ ffmpeg: FFMPEG, ffprobe: FFPROBE });
