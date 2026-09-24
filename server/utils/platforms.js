export const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'linkedin',
  'youtube',
  'threads',
  'x',
  'telegram',
  'whatsapp',
];

export const normalizePlatforms = (value) => {
  if (!value) return [];
  if (value === 'both') return ['facebook', 'instagram'];
  if (Array.isArray(value)) return value.map((p) => String(p).toLowerCase());
  return [String(value).toLowerCase()];
};

export const upsertPublication = (job, platform) => {
  if (!job.publications) job.publications = [];
  let row = job.publications.find((p) => p.platform === platform);
  if (!row) {
    row = { platform, status: 'pending', attempts: [], externalId: '' };
    job.publications.push(row);
  }
  return job.publications.find((p) => p.platform === platform);
};
