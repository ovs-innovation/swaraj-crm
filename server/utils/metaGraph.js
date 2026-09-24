import fs from 'fs/promises';
import path from 'path';

const version = () => process.env.META_GRAPH_VERSION || 'v21.0';
const pageId = () => process.env.META_PAGE_ID || '';
const pageToken = () => process.env.META_PAGE_ACCESS_TOKEN || '';
const igUserId = () => process.env.META_IG_USER_ID || '';
const publicBase = () => (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

export const metaConfigStatus = () => {
  const token = Boolean(pageToken());
  const page = Boolean(pageId());
  const ig = Boolean(igUserId());
  return {
    facebookReady: token && page,
    instagramReady: token && ig,
    publicBaseUrl: publicBase() || '',
    graphVersion: version(),
  };
};

const graphUrl = (p) => `https://graph.facebook.com/${version()}${p.startsWith('/') ? p : `/${p}`}`;

const parseBody = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text || `HTTP ${res.status}` } };
  }
};

const graphJson = async (p, { method = 'GET', search, json } = {}) => {
  const url = new URL(graphUrl(p));
  if (search) {
    Object.entries(search).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url, {
    method,
    headers: json ? { 'Content-Type': 'application/json' } : undefined,
    body: json ? JSON.stringify(json) : undefined,
  });
  const data = await parseBody(res);
  if (!res.ok || data.error) {
    const err = new Error(data.error?.message || `Meta API error (${res.status})`);
    err.meta = data;
    throw err;
  }
  return data;
};

const graphForm = async (p, fields, filePath, fieldName = 'source') => {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') form.append(k, String(v));
  });
  if (filePath) {
    const buf = await fs.readFile(filePath);
    form.append(fieldName, new Blob([buf]), path.basename(filePath));
  }
  const res = await fetch(graphUrl(p), { method: 'POST', body: form });
  const data = await parseBody(res);
  if (!res.ok || data.error) {
    const err = new Error(data.error?.message || `Meta API error (${res.status})`);
    err.meta = data;
    throw err;
  }
  return data;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const publicFileUrl = (relUrl) => {
  if (!relUrl) return '';
  if (relUrl.startsWith('http://') || relUrl.startsWith('https://')) return relUrl;
  const base = publicBase();
  if (!base) return '';
  const clean = relUrl.startsWith('/') ? relUrl : `/${relUrl}`;
  return `${base}${clean}`;
};

const photoCdnUrl = async (photoId) => {
  const data = await graphJson(`/${photoId}`, {
    search: { fields: 'images', access_token: pageToken() },
  });
  const images = data.images || [];
  return images[0]?.source || '';
};

const unpublishedPhoto = async (filePath) => {
  const data = await graphForm(
    `/${pageId()}/photos`,
    { published: 'false', access_token: pageToken() },
    filePath
  );
  return data.id;
};

export const publishToFacebook = async ({ files, message, scheduledUnix }) => {
  if (!pageId() || !pageToken()) {
    throw new Error('Facebook is not configured. Set META_PAGE_ID and META_PAGE_ACCESS_TOKEN.');
  }

  if (scheduledUnix) {
    const mediaIds = [];
    for (const file of files) {
      const id = await unpublishedPhoto(file.path);
      mediaIds.push(id);
    }
    const payload = {
      message,
      published: 'false',
      scheduled_publish_time: String(scheduledUnix),
      access_token: pageToken(),
    };
    mediaIds.forEach((id, i) => {
      payload[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
    });
    const data = await graphForm(`/${pageId()}/feed`, payload);
    return { id: data.id || data.post_id, raw: data };
  }

  if (files.length === 1) {
    const data = await graphForm(
      `/${pageId()}/photos`,
      { caption: message, access_token: pageToken() },
      files[0].path
    );
    return { id: data.post_id || data.id, raw: data };
  }

  const mediaIds = [];
  for (const file of files) {
    mediaIds.push(await unpublishedPhoto(file.path));
  }
  const fields = { message, access_token: pageToken() };
  mediaIds.forEach((id, i) => {
    fields[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
  });
  const data = await graphForm(`/${pageId()}/feed`, fields);
  return { id: data.id || data.post_id, raw: data };
};

const waitIgContainer = async (creationId) => {
  for (let i = 0; i < 30; i += 1) {
    const st = await graphJson(`/${creationId}`, {
      search: { fields: 'status_code,status', access_token: pageToken() },
    });
    if (st.status_code === 'FINISHED' || st.status_code === 'PUBLISHED') return;
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') {
      throw new Error(st.status || 'Instagram container failed');
    }
    await sleep(2000);
  }
};

const resolveIgImageUrl = async (file) => {
  const direct = publicFileUrl(file.url);
  if (direct && !/localhost|127\.0\.0\.1/.test(direct)) return direct;
  if (pageId() && pageToken()) {
    const photoId = await unpublishedPhoto(file.path);
    const cdn = await photoCdnUrl(photoId);
    if (cdn) return cdn;
  }
  throw new Error(
    'Instagram needs a public image URL. Set PUBLIC_BASE_URL to an https domain that can serve /uploads, or configure a Facebook Page token so images can be staged.'
  );
};

export const publishToInstagram = async ({ files, message }) => {
  if (!igUserId() || !pageToken()) {
    throw new Error('Instagram is not configured. Set META_IG_USER_ID and META_PAGE_ACCESS_TOKEN.');
  }
  if (!files.length) throw new Error('Instagram requires at least one image.');

  const urls = [];
  for (const file of files) {
    urls.push(await resolveIgImageUrl(file));
  }

  let creationId;
  if (urls.length === 1) {
    const created = await graphJson(`/${igUserId()}/media`, {
      method: 'POST',
      search: {
        image_url: urls[0],
        caption: message,
        access_token: pageToken(),
      },
    });
    creationId = created.id;
  } else {
    const children = [];
    for (const imageUrl of urls) {
      const item = await graphJson(`/${igUserId()}/media`, {
        method: 'POST',
        search: {
          image_url: imageUrl,
          is_carousel_item: 'true',
          access_token: pageToken(),
        },
      });
      children.push(item.id);
    }
    const carousel = await graphJson(`/${igUserId()}/media`, {
      method: 'POST',
      search: {
        media_type: 'CAROUSEL',
        children: children.join(','),
        caption: message,
        access_token: pageToken(),
      },
    });
    creationId = carousel.id;
  }

  await waitIgContainer(creationId);
  const published = await graphJson(`/${igUserId()}/media_publish`, {
    method: 'POST',
    search: { creation_id: creationId, access_token: pageToken() },
  });
  return { id: published.id, raw: { creationId, ...published } };
};

export const publishToFacebookVideo = async ({ filePath, message, scheduledUnix, thumbPath }) => {
  if (!pageId() || !pageToken()) {
    throw new Error('Facebook is not configured. Set META_PAGE_ID and META_PAGE_ACCESS_TOKEN.');
  }
  const fields = {
    description: message,
    access_token: pageToken(),
  };
  if (scheduledUnix) {
    fields.published = 'false';
    fields.scheduled_publish_time = String(scheduledUnix);
  }
  const data = await graphForm(`/${pageId()}/videos`, fields, filePath, 'source');
  if (thumbPath) {
    try {
      await graphForm(`/${data.id}`, { access_token: pageToken() }, thumbPath, 'source');
    } catch {
      // thumbnail optional
    }
  }
  return { id: data.id, raw: data };
};

export const publishToInstagramVideo = async ({ fileUrl, coverUrl, message }) => {
  if (!igUserId() || !pageToken()) {
    throw new Error('Instagram is not configured. Set META_IG_USER_ID and META_PAGE_ACCESS_TOKEN.');
  }
  if (!fileUrl || /localhost|127\.0\.0\.1/.test(fileUrl)) {
    throw new Error('Instagram video needs PUBLIC_BASE_URL pointing to a public https host that serves /uploads.');
  }
  const created = await graphJson(`/${igUserId()}/media`, {
    method: 'POST',
    search: {
      media_type: 'REELS',
      video_url: fileUrl,
      caption: message,
      cover_url: coverUrl || undefined,
      access_token: pageToken(),
    },
  });
  await waitIgContainer(created.id);
  const published = await graphJson(`/${igUserId()}/media_publish`, {
    method: 'POST',
    search: { creation_id: created.id, access_token: pageToken() },
  });
  return { id: published.id, raw: { creationId: created.id, ...published } };
};

export const publicUploadUrl = (relUrl) => publicFileUrl(relUrl);

export const buildMessage = (caption, hashtags) => {
  const cap = String(caption || '').trim();
  const tags = String(hashtags || '')
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
    .join(' ');
  if (cap && tags) return `${cap}\n\n${tags}`;
  return cap || tags;
};
