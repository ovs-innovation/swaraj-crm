import { useState } from 'react';
import { mediaUrl, isVideo, isImage } from '../../utils/mediaUrl';

const MediaPreview = ({ item, height = 150 }) => {
  const [failed, setFailed] = useState(false);
  const src = mediaUrl(item?.url);

  if (isVideo(item)) {
    return (
      <video
        src={src}
        controls
        preload="none"
        style={{ width: '100%', height, objectFit: 'cover', borderRadius: 8, background: '#0f172a' }}
      />
    );
  }

  if (isImage(item) && !failed) {
    return (
      <img
        src={src}
        alt={item.description || 'Upload'}
        style={{ width: '100%', height, objectFit: 'cover', borderRadius: 8, background: '#f1f5f9' }}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div style={{ height, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#64748b' }}>
      {failed ? 'Preview unavailable' : (item?.type || 'FILE').toUpperCase()}
    </div>
  );
};

export default MediaPreview;
