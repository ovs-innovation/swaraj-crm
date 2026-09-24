import { notifyRole } from './notify.js';

let cache = { at: 0, data: null };
let lastAlert = 0;

export const inspectMetaToken = async () => {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return { ok: false, publishEnabled: false, detail: 'META_PAGE_ACCESS_TOKEN missing', expiresAt: null };
  if (cache.data && Date.now() - cache.at < 5 * 60 * 1000) return cache.data;
  try {
    const url = new URL('https://graph.facebook.com/debug_token');
    url.searchParams.set('input_token', token);
    url.searchParams.set('access_token', token);
    const res = await Promise.race([
      fetch(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Meta debug timeout')), 8000)),
    ]);
    const json = await res.json();
    const data = json.data || {};
    const expiresAt = data.expires_at ? new Date(data.expires_at * 1000) : null;
    const expired = data.is_valid === false || (expiresAt && expiresAt.getTime() < Date.now());
    const soon = expiresAt && expiresAt.getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000;
    const result = {
      ok: Boolean(data.is_valid) && !expired,
      publishEnabled: Boolean(data.is_valid) && !expired,
      detail: expired
        ? 'Page token expired — publish is disabled'
        : soon
          ? `Token expires ${expiresAt.toISOString().slice(0, 10)} — refresh soon`
          : expiresAt
            ? `Valid until ${expiresAt.toISOString().slice(0, 10)}`
            : data.is_valid
              ? 'Valid (no expiry reported)'
              : json.error?.message || 'Token check failed',
      expiresAt,
      soon,
    };
    cache = { at: Date.now(), data: result };
    if ((!result.publishEnabled || soon) && Date.now() - lastAlert > 6 * 60 * 60 * 1000) {
      lastAlert = Date.now();
      await notifyRole('super_admin', {
        title: expired ? 'Meta token expired' : 'Meta token expiring',
        body: result.detail,
        type: 'meta_token',
        link: '/super-admin/health',
      }).catch(() => {});
    }
    return result;
  } catch (err) {
    const result = { ok: false, publishEnabled: false, detail: err.message, expiresAt: null, soon: false };
    cache = { at: Date.now(), data: result };
    return result;
  }
};

export const assertPublishAllowed = async () => {
  const token = await inspectMetaToken();
  if (!token.publishEnabled) {
    const err = new Error(token.detail || 'Publishing disabled until Meta token is updated');
    err.status = 423;
    throw err;
  }
};
