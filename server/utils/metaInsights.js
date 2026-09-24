const version = () => process.env.META_GRAPH_VERSION || 'v21.0';
const token = () => process.env.META_PAGE_ACCESS_TOKEN || '';

const graphGet = async (id, fields) => {
  const url = new URL(`https://graph.facebook.com/${version()}/${id}`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('access_token', token());
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Meta insights failed');
  return data;
};

const insightMap = (insights) => {
  const out = {};
  (insights?.data || []).forEach((row) => {
    const val = row.values?.[0]?.value;
    out[row.name] = typeof val === 'object' ? val : Number(val || 0);
  });
  return out;
};

export const fetchVideoAnalytics = async (job) => {
  const analytics = { facebook: null, instagram: null, fetchedAt: new Date() };
  if (job.facebookPostId && token()) {
    try {
      const data = await graphGet(
        job.facebookPostId,
        'views,likes.summary(true),comments.summary(true),shares'
      );
      analytics.facebook = {
        reach: Number(data.views || 0),
        likes: Number(data.likes?.summary?.total_count || 0),
        comments: Number(data.comments?.summary?.total_count || 0),
        shares: Number(data.shares?.count || 0),
      };
    } catch (err) {
      analytics.facebook = { error: err.message };
    }
  }
  if (job.instagramPostId && token()) {
    try {
      const data = await graphGet(
        job.instagramPostId,
        'like_count,comments_count,insights.metric(impressions,reach,saved,plays,views)'
      );
      const map = insightMap(data.insights);
      analytics.instagram = {
        views: Number(map.plays || map.views || 0),
        reach: Number(map.reach || map.impressions || 0),
        likes: Number(data.like_count || 0),
        comments: Number(data.comments_count || 0),
        saves: Number(map.saved || 0),
      };
    } catch (err) {
      analytics.instagram = { error: err.message };
    }
  }
  return analytics;
};
