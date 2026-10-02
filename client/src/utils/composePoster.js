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

export const loadPosterImage = async (src) => {
  if (!src) throw new Error('Could not read the picture');

  const tryDirectImg = (imgSrc, crossOrigin = false) =>
    new Promise((resolve, reject) => {
      const im = new Image();
      if (crossOrigin) im.crossOrigin = 'anonymous';
      im.onload = () => resolve(im);
      im.onerror = (e) => reject(e);
      im.src = imgSrc;
    });

  // 1. If it's already a blob: or data: URL, load directly
  if (typeof src === 'string' && (src.startsWith('blob:') || src.startsWith('data:'))) {
    try {
      return await tryDirectImg(src, false);
    } catch {
      throw new Error('Could not read the picture');
    }
  }

  // 2. Detect same-origin
  const isSameOrigin =
    typeof window !== 'undefined' &&
    (src.startsWith('/') ||
      src.startsWith('./') ||
      src.startsWith(window.location.origin) ||
      (!src.startsWith('http://') && !src.startsWith('https://')));

  // 3. For same-origin images, fetch as Blob -> createObjectURL.
  // This completely bypasses CORS restrictions and cannot taint the canvas.
  if (isSameOrigin) {
    try {
      const res = await fetch(src, { cache: 'no-cache' });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        return await tryDirectImg(blobUrl, false);
      }
    } catch {
      // Fall through if fetch fails
    }

    try {
      // Direct load without crossOrigin for same-origin (does not taint canvas)
      return await tryDirectImg(src, false);
    } catch {
      // Fall through
    }
  }

  // 4. For external/cross-origin URLs, try fetch with CORS
  try {
    const res = await fetch(src, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      return await tryDirectImg(blobUrl, false);
    }
  } catch {
    // Fall through
  }

  // 5. Try direct Image with crossOrigin
  try {
    return await tryDirectImg(src, true);
  } catch {
    // Fall through
  }

  // 6. Try backend proxy for external images
  if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
    try {
      const proxyUrl = `/api/posters/proxy-image?url=${encodeURIComponent(src)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        return await tryDirectImg(blobUrl, false);
      }
    } catch {
      // Fall through
    }
  }

  // 7. Last resort: direct load without crossOrigin
  try {
    return await tryDirectImg(src, false);
  } catch {
    throw new Error('Could not read the picture');
  }
};

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

const drawRoundedRect = (ctx, x, y, width, height, radius, fillStyle, strokeStyle, strokeWidth) => {
  ctx.save();
  ctx.beginPath();
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle && strokeWidth) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
  ctx.restore();
};

const fitText = (ctx, text, maxWidth) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = String(text || '');
  while (str.length > 3 && ctx.measureText(str + '...').width > maxWidth) {
    str = str.slice(0, -1);
  }
  return str + '...';
};

export const splitAddress = (addressText) => {
  const raw = String(addressText || '').trim();
  if (!raw) return { line1: '', line2: '' };

  if (raw.includes('\n')) {
    const parts = raw.split('\n').map((s) => s.trim()).filter(Boolean);
    return { line1: parts[0] || '', line2: parts.slice(1).join(' ') };
  }

  const branchMatch = raw.search(/शाखा|branch|branches|tehsil|तहसील|dist|district|near|opp/i);
  if (branchMatch > 4) {
    const l1 = raw.slice(0, branchMatch).replace(/[, -]+$/, '').trim();
    const l2 = raw.slice(branchMatch).trim();
    if (l1 && l2) return { line1: l1, line2: l2 };
  }

  const commaParts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const half = Math.ceil(commaParts.length / 2);
    const l1 = commaParts.slice(0, half).join(', ');
    const l2 = commaParts.slice(half).join(', ');
    return { line1: l1, line2: l2 };
  }

  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length > 5) {
    const half = Math.ceil(words.length / 2);
    return { line1: words.slice(0, half).join(' '), line2: words.slice(half).join(' ') };
  }

  return { line1: raw, line2: '' };
};

const drawIconCircle = (ctx, cx, cy, r, type) => {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (type === 'pin') {
    ctx.fillStyle = '#BA0C2F';
    const pinR = r * 0.44;
    const pinCY = cy - r * 0.14;
    ctx.beginPath();
    ctx.arc(cx, pinCY, pinR, Math.PI * 0.9, Math.PI * 0.1, false);
    ctx.lineTo(cx, cy + r * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, pinCY, pinR * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'phone') {
    ctx.fillStyle = '#BA0C2F';
    ctx.translate(cx, cy);
    const s = (r * 1.05) / 24;
    ctx.scale(s, s);
    const p = new Path2D(
      'M-7.8,-6.2 C-8.2,-5.8 -8.4,-5.2 -8.4,-4.6 C-8.4,1.8 -3.2,7.0 3.2,7.0 C3.8,7.0 4.4,6.8 4.8,6.4 L6.3,4.9 C6.8,4.4 6.8,3.6 6.3,3.1 L3.9,0.7 C3.4,0.2 2.6,0.2 2.1,0.7 L1.1,1.7 C-0.5,0.7 -1.8,-0.6 -2.8,-2.2 L-1.8,-3.2 C-1.3,-3.7 -1.3,-4.5 -1.8,-5.0 L-4.2,-7.4 C-4.7,-7.9 -5.5,-7.9 -6.0,-7.4 Z'
    );
    ctx.fill(p);
  }
  ctx.restore();
};

export const composePosterBlob = async (imageSrc, letterhead, values, preloaded, options = {}) => {
  await document.fonts.ready;
  const img = preloaded || (await loadPosterImage(imageSrc));
  const aspectMode = options.aspectRatio || letterhead?.aspectRatio || '4:5';

  let W, H;
  if (aspectMode === '4:5') {
    W = 2160;
    H = 2700;
  } else if (aspectMode === '1:1') {
    W = 2160;
    H = 2160;
  } else {
    const s = sizeTo8k(img.naturalWidth, img.naturalHeight);
    W = s.W;
    H = s.H;
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw background image with center-cover cropping
  const targetAspect = W / H;
  const imgAspect = (img.naturalWidth || W) / (img.naturalHeight || H);
  let sx = 0, sy = 0, sWidth = img.naturalWidth, sHeight = img.naturalHeight;
  if (imgAspect > targetAspect) {
    sWidth = img.naturalHeight * targetAspect;
    sx = (img.naturalWidth - sWidth) / 2;
  } else if (imgAspect < targetAspect) {
    sHeight = img.naturalWidth / targetAspect;
    sy = (img.naturalHeight - sHeight) / 2;
  }
  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, W, H);

  // 1. Draw Top-Left & Top-Right Brand Badges / Custom Logos
  if (options.showBrandBadges !== false) {
    const leftLogo = options.topLeftLogoSrc !== undefined ? options.topLeftLogoSrc : '/swaraj-gold-seal.svg';
    const rightLogo = options.topRightLogoSrc !== undefined ? options.topRightLogoSrc : '/swaraj-josh-badge.svg';

    if (leftLogo && leftLogo !== 'none') {
      try {
        const sealImg = await loadPosterImage(leftLogo);
        const aspect = (sealImg.naturalWidth && sealImg.naturalHeight) ? (sealImg.naturalWidth / sealImg.naturalHeight) : 1;
        const sealW = Math.round(W * 0.165);
        const sealH = Math.round(sealW / aspect);
        const sealX = Math.round(W * 0.04);
        const sealY = Math.round(H * 0.032);
        ctx.drawImage(sealImg, sealX, sealY, sealW, sealH);
      } catch (err) {
        console.warn('Could not draw left logo:', err);
      }
    }

    if (rightLogo && rightLogo !== 'none') {
      try {
        const joshImg = await loadPosterImage(rightLogo);
        const aspect = (joshImg.naturalWidth && joshImg.naturalHeight) ? (joshImg.naturalWidth / joshImg.naturalHeight) : (320 / 180);
        const joshW = Math.round(W * 0.23);
        const joshH = Math.round(joshW / aspect);
        const joshX = W - joshW - Math.round(W * 0.04);
        const joshY = Math.round(H * 0.032);
        ctx.drawImage(joshImg, joshX, joshY, joshW, joshH);
      } catch (err) {
        console.warn('Could not draw right logo:', err);
      }
    }
  }

  // 2. Swaraj Official Dealership Footer Strip
  const stripH = Math.round(H * 0.076);
  const stripY = H - stripH;
  const footerBg = options.footerBg || letterhead?.footerBg || '#BA0C2F'; // Official Swaraj Crimson Red
  const dealerColor = options.dealerColor || '#00843D';
  const dealerBg = options.dealerBg || '#ffffff';

  ctx.fillStyle = footerBg;
  ctx.fillRect(0, stripY, W, stripH);

  // Subtle top accent line
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(0, stripY, W, Math.max(1, Math.round(H * 0.0012)));

  const padX = Math.round(W * 0.018);
  const innerH = Math.round(stripH * 0.76);
  const innerY = Math.round(stripY + (stripH - innerH) / 2);

  const dealerName = String(values?.headerText || '').trim() || 'मॉडल एजन्सीज';
  const addressText = String(values?.headerSub || '').trim() || 'एन. एच. 6 बेला, भंडारा- 441906\nशाखा-तुमसर, साकोली, आसगाव, लाखांदूर';
  const phoneText = String(values?.footerLeft || '').trim() || '+91 80075 48833';
  const extraText = String(values?.footerRight || '').trim() || '+91 77750 00051';

  // 3. Left Section: Crisp Card with Dealer Name
  const badgeW = Math.round(W * 0.28);
  const badgeX = padX;
  const badgeRadius = Math.round(innerH * 0.12);
  drawRoundedRect(ctx, badgeX, innerY, badgeW, innerH, badgeRadius, dealerBg, null, 0);

  const dealerFontSize = Math.round(innerH * 0.44);
  ctx.font = `bold ${dealerFontSize}px "Noto Sans Devanagari", "Inter", sans-serif`;
  ctx.fillStyle = dealerColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fittedName = fitText(ctx, dealerName, badgeW - Math.round(badgeW * 0.08));
  ctx.fillText(fittedName, badgeX + badgeW / 2, innerY + innerH / 2);

  // 4. Middle Section: Location Icon + 2-Line Address
  const centerStartX = badgeX + badgeW + Math.round(W * 0.016);
  const divX = W - Math.round(W * 0.27);
  const iconR = Math.round(innerH * 0.24);
  const iconCY = stripY + stripH / 2;
  const pinCX = centerStartX + iconR;
  drawIconCircle(ctx, pinCX, iconCY, iconR, 'pin');

  const addrStartX = pinCX + iconR + Math.round(W * 0.01);
  const addrMaxW = divX - addrStartX - Math.round(W * 0.014);
  const addrFontSize = Math.round(innerH * 0.22);

  const { line1, line2 } = splitAddress(addressText);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (line2) {
    ctx.font = `bold ${addrFontSize}px "Noto Sans Devanagari", "Inter", sans-serif`;
    ctx.fillText(fitText(ctx, line1, addrMaxW), addrStartX, iconCY - addrFontSize * 0.65);
    ctx.font = `500 ${Math.round(addrFontSize * 0.88)}px "Noto Sans Devanagari", "Inter", sans-serif`;
    ctx.fillText(fitText(ctx, line2, addrMaxW), addrStartX, iconCY + addrFontSize * 0.65);
  } else {
    ctx.font = `600 ${addrFontSize}px "Noto Sans Devanagari", "Inter", sans-serif`;
    ctx.fillText(fitText(ctx, line1, addrMaxW), addrStartX, iconCY);
  }

  // 5. Vertical Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = Math.max(1.5, Math.round(W * 0.0012));
  ctx.beginPath();
  ctx.moveTo(divX, innerY + innerH * 0.12);
  ctx.lineTo(divX, innerY + innerH * 0.88);
  ctx.stroke();

  // 6. Right Section: Phone Icon + 2-Line Contact Numbers
  const rightStartX = divX + Math.round(W * 0.015);
  const phoneCX = rightStartX + iconR;
  drawIconCircle(ctx, phoneCX, iconCY, iconR, 'phone');

  const phoneStartX = phoneCX + iconR + Math.round(W * 0.01);
  const phoneMaxW = (W - padX) - phoneStartX;
  const phoneFontSize = Math.round(innerH * 0.22);

  if (extraText) {
    ctx.font = `bold ${phoneFontSize}px "Noto Sans Devanagari", "Inter", sans-serif`;
    ctx.fillText(fitText(ctx, phoneText, phoneMaxW), phoneStartX, iconCY - phoneFontSize * 0.62);
    ctx.font = `bold ${phoneFontSize}px "Noto Sans Devanagari", "Inter", sans-serif`;
    ctx.fillText(fitText(ctx, extraText, phoneMaxW), phoneStartX, iconCY + phoneFontSize * 0.62);
  } else {
    ctx.font = `bold ${phoneFontSize}px "Noto Sans Devanagari", "Inter", sans-serif`;
    ctx.fillText(fitText(ctx, phoneText, phoneMaxW), phoneStartX, iconCY);
  }

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

