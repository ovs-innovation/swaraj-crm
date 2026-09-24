import fs from 'fs';
import path from 'path';

const unlink = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return false;
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
};

export const cleanupJobRenders = (job) => {
  const keep = new Set(
    [
      job.originalPath,
      job.editedPath,
      job.thumbnailPath,
      job.watermarkPath,
      job.introPath,
      job.outroPath,
      job.musicPath,
      job.srtPath,
      ...(job.mergePaths || []),
    ].filter(Boolean)
  );
  const last = job.versions?.[job.versions.length - 1];
  if (last?.path) keep.add(last.path);

  let removed = 0;
  (job.versions || []).slice(0, -1).forEach((ver) => {
    if (ver.path && !keep.has(ver.path) && unlink(ver.path)) {
      ver.purged = true;
      removed += 1;
    }
  });

  const dir = job.originalPath ? path.dirname(job.originalPath) : '';
  if (dir && fs.existsSync(dir)) {
    const prefix = `edit-${job._id}`;
    fs.readdirSync(dir).forEach((name) => {
      if (!name.startsWith(prefix) && !name.startsWith(`thumb-${job._id}`)) return;
      const full = path.join(dir, name);
      if (!keep.has(full) && unlink(full)) removed += 1;
    });
  }
  return removed;
};

export const folderBytes = (dir) => {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const walk = (p) => {
    fs.readdirSync(p, { withFileTypes: true }).forEach((ent) => {
      const full = path.join(p, ent.name);
      if (ent.isDirectory()) walk(full);
      else total += fs.statSync(full).size;
    });
  };
  walk(dir);
  return total;
};
