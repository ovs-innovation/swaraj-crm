const KEYS = ['headerText', 'headerSub', 'footerLeft', 'footerRight'];
export const UHD_8K = 7680;

const fallbackTexts = {
  headerText: { x: 4, y: 3, w: 55, size: 28, font: 'Inter', bold: true, italic: false, align: 'left', color: '#ffffff', value: '' },
  headerSub: { x: 4, y: 9, w: 70, size: 14, font: 'Inter', bold: false, italic: false, align: 'left', color: '#ffffff', value: '' },
  footerLeft: { x: 4, y: 90, w: 40, size: 13, font: 'Inter', bold: false, italic: false, align: 'left', color: '#ffffff', value: '' },
  footerRight: { x: 55, y: 90, w: 40, size: 13, font: 'Inter', bold: false, italic: false, align: 'right', color: '#ffffff', value: '' },
};

export const sizeTo8k = (nw, nh) => {
  const w = Math.max(1, nw || 1);
  const h = Math.max(1, nh || 1);
  const long = Math.max(w, h);
  const scale = Math.max(UHD_8K / long, 1);
  return { W: Math.round(w * scale), H: Math.round(h * scale), scale };
};

export const loadPosterImage = (src) =>
  new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Could not read the picture'));
    im.src = src;
  });

const wrapLines = (ctx, text, maxWidth) => {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const test = `${line} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines.slice(0, 4);
};

const blobFromCanvas = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('compose failed'))), 'image/jpeg', 0.95);
  });

export const composePosterBlob = async (imageSrc, letterhead, values, preloaded) => {
  await document.fonts.ready;
  const img = preloaded || (await loadPosterImage(imageSrc));
  const { W, H } = sizeTo8k(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, W, H);

  const headerPct = letterhead?.headerPct ?? 16;
  const footerPct = letterhead?.footerPct ?? 11;
  ctx.fillStyle = letterhead?.headerBg || 'rgba(122, 8, 18, 0.72)';
  ctx.fillRect(0, 0, W, (headerPct / 100) * H);
  ctx.fillStyle = letterhead?.footerBg || 'rgba(28, 25, 23, 0.72)';
  ctx.fillRect(0, H - (footerPct / 100) * H, W, (footerPct / 100) * H);

  KEYS.forEach((key) => {
    const base = { ...fallbackTexts[key], ...(letterhead?.texts?.[key] || {}) };
    const text = String(values[key] || '').trim();
    if (!text) return;
    const size = (Number(base.size) || 16) * (W / 900);
    ctx.font = `${base.italic ? 'italic' : 'normal'} ${base.bold ? 700 : 400} ${size}px "${base.font}", "Noto Sans Devanagari", sans-serif`;
    ctx.fillStyle = base.color || '#ffffff';
    ctx.textBaseline = 'top';
    const align = base.align || 'left';
    ctx.textAlign = align;
    const boxW = ((Number(base.w) || 40) / 100) * W;
    let x = ((Number(base.x) || 4) / 100) * W;
    if (align === 'center') x += boxW / 2;
    if (align === 'right') x += boxW;
    const y = ((Number(base.y) || 4) / 100) * H;
    const lines = wrapLines(ctx, text, boxW);
    lines.forEach((line, i) => {
      ctx.fillText(line, x, y + i * size * 1.15, boxW);
    });
  });

  return blobFromCanvas(canvas);
};

export const composeOverlayBlob = async (imageSrc, texts) => {
  await document.fonts.ready;
  const img = await loadPosterImage(imageSrc);
  const { W, H } = sizeTo8k(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, W, H);
  Object.values(texts || {}).forEach((base) => {
    const text = String(base?.value || '').trim();
    if (!text) return;
    const size = (Number(base.size) || 16) * (W / 900);
    ctx.font = `${base.italic ? 'italic' : 'normal'} ${base.bold ? 700 : 400} ${size}px "${base.font || 'Inter'}", "Noto Sans Devanagari", sans-serif`;
    ctx.fillStyle = base.color || '#ffffff';
    ctx.textBaseline = 'top';
    const align = base.align || 'left';
    ctx.textAlign = align;
    const boxW = ((Number(base.w) || 40) / 100) * W;
    let x = ((Number(base.x) || 4) / 100) * W;
    if (align === 'center') x += boxW / 2;
    if (align === 'right') x += boxW;
    const y = ((Number(base.y) || 4) / 100) * H;
    wrapLines(ctx, text, boxW).forEach((line, i) => {
      ctx.fillText(line, x, y + i * size * 1.15, boxW);
    });
  });
  return blobFromCanvas(canvas);
};

export const cellFromRow = (row, header) => {
  if (!row || !header) return '';
  if (row[header] != null && String(row[header]).trim()) return String(row[header]).trim();
  const want = String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
  const found = Object.keys(row).find((k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '') === want);
  return found ? String(row[found] || '').trim() : '';
};

const nkey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const guessPosterMapping = (headers = []) => {
  const mapping = { headerText: '', headerSub: '', footerLeft: '', footerRight: '' };
  const pick = (test) => headers.find((h) => test(nkey(h))) || '';
  mapping.headerText = pick((h) => (/dealername|firm|shop|outlet/.test(h) || h === 'name' || h === 'naam' || h.endsWith('name')) && !/code|file/.test(h));
  mapping.headerSub = pick((h) => /address|city|district|state|location|area/.test(h) && !/email/.test(h));
  mapping.footerLeft = pick((h) => /mobile|phonenumber|phone|whatsapp|contact|mob|tel/.test(h));
  mapping.footerRight = pick((h) => /website|weburl|www|url|site/.test(h)) || pick((h) => /dealercode|code|gst|email/.test(h));
  if (!mapping.headerText) mapping.headerText = headers[0] || '';
  return mapping;
};

