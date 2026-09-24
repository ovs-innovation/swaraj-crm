export const needsFfmpeg = (job) => {
  const s = job.editSpec || {};
  if (Number(s.trimStart) > 0 || Number(s.trimEnd) > 0) return true;
  if (Number(s.rotate)) return true;
  if (s.flipH || s.flipV) return true;
  if (s.aspect && s.aspect !== 'original') return true;
  if (s.resolution && s.resolution !== 'original' && s.resolution !== '720' && !s.compress) return true;
  if ((s.texts || []).some((layer) => layer?.text?.trim())) return true;
  if (s.muteOriginal) return true;
  if (job.watermarkPath || job.introPath || job.outroPath || job.musicPath || job.srtPath) return true;
  if ((job.mergePaths || []).length) return true;
  return false;
};

export const pointEditedAtOriginal = (job) => {
  job.editedPath = job.originalPath;
  job.editedUrl = job.originalUrl;
  job.thumbnailUrl = job.thumbnailUrl || '';
  job.thumbnailPath = job.thumbnailPath || '';
};
