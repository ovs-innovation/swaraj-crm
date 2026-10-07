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

const drawRoundedTopRect = (ctx, x, y, width, height, r, fillStyle) => {
  ctx.save();
  ctx.beginPath();
  const radius = Math.min(r, width / 2, height);
  ctx.moveTo(x, y + height);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  ctx.restore();
};

const drawGlobeIcon = (ctx, cx, cy, r, color = '#004728') => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.8, r * 0.13);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  // Equator
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.82, cy);
  ctx.lineTo(cx + r * 0.82, cy);
  ctx.stroke();
  // Longitudinal ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.42, r * 0.82, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Center axis
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.82);
  ctx.lineTo(cx, cy + r * 0.82);
  ctx.stroke();
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

export const splitAddressLines = (addressText, maxLines = 2) => {
  const raw = String(addressText || '').trim().replace(/\s+/g, ' ');
  if (!raw) return [];

  if (raw.includes('\n')) {
    const parts = raw.split('\n').map((s) => s.trim()).filter(Boolean);
    if (parts.length <= maxLines) return parts;
    return [...parts.slice(0, maxLines - 1), parts.slice(maxLines - 1).join(' ')];
  }

  const words = raw.split(' ').filter(Boolean);
  if (words.length <= 3 && raw.length <= 25) {
    return [raw];
  }

  const targetHalf = Math.floor(raw.length / 2);
  let bestIdx = 1;
  let minDiff = Infinity;
  let curLen = 0;

  for (let i = 0; i < words.length - 1; i += 1) {
    curLen += words[i].length + (i > 0 ? 1 : 0);
    const diff = Math.abs(curLen - targetHalf);
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i + 1;
    }
  }

  const l1 = words.slice(0, bestIdx).join(' ').trim();
  const l2 = words.slice(bestIdx).join(' ').trim();
  return l2 ? [l1, l2] : [l1];
};

export const splitAddress = (addressText) => {
  const lines = splitAddressLines(addressText, 2);
  return {
    lines,
    line1: lines[0] || '',
    line2: lines[1] || '',
  };
};

export const splitDealerName = (name) => {
  const raw = String(name || '').trim().replace(/\s+/g, ' ');
  if (!raw) return { line1: '', line2: '' };
  if (raw.length <= 15) return { line1: raw, line2: '' };
  const words = raw.split(' ').filter(Boolean);
  if (words.length <= 1) return { line1: raw, line2: '' };

  const targetHalf = Math.floor(raw.length / 2);
  let bestIdx = 1;
  let minDiff = Infinity;
  let curLen = 0;
  for (let i = 0; i < words.length - 1; i += 1) {
    curLen += words[i].length + (i > 0 ? 1 : 0);
    const diff = Math.abs(curLen - targetHalf);
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i + 1;
    }
  }
  return {
    line1: words.slice(0, bestIdx).join(' ').trim(),
    line2: words.slice(bestIdx).join(' ').trim(),
  };
};

export const formatContactNumbers = (rawText) => {
  if (!rawText) return '';
  const str = String(rawText).trim();
  if (!str) return '';

  if (str.includes(',')) {
    return str.split(',').map((s) => s.trim()).filter(Boolean).join(', ');
  }

  const parts = str.split(/[\/;|]|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts.join(', ');
  }

  const digitsOnly = str.replace(/\D/g, '');
  if (digitsOnly.length === 20) {
    return `${digitsOnly.slice(0, 10)}, ${digitsOnly.slice(10)}`;
  }

  const tokens = str.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2 && tokens.every((t) => t.replace(/\D/g, '').length >= 7)) {
    return tokens.join(', ');
  }

  return str;
};

export const formatSinglePhone = (num) => {
  if (!num) return '';
  const str = String(num).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2)}`;
  }
  return str;
};

export const formatCombinedContacts = (c1, c2) => {
  const parts = [];
  const raw1 = String(c1 || '').trim();
  const raw2 = String(c2 || '').trim();

  if (raw1.includes('/') || raw1.includes(',') || raw1.includes(';')) {
    const subParts = raw1.split(/[\/,;]+/).map((s) => s.trim()).filter(Boolean);
    subParts.forEach((p) => {
      const formatted = formatSinglePhone(p);
      if (formatted && !parts.includes(formatted)) parts.push(formatted);
    });
  } else if (raw1) {
    parts.push(formatSinglePhone(raw1));
  }

  if (raw2 && !raw2.toLowerCase().includes('swarajtractors.com')) {
    if (raw2.includes('/') || raw2.includes(',') || raw2.includes(';')) {
      const subParts = raw2.split(/[\/,;]+/).map((s) => s.trim()).filter(Boolean);
      subParts.forEach((p) => {
        const formatted = formatSinglePhone(p);
        if (formatted && !parts.includes(formatted)) parts.push(formatted);
      });
    } else {
      const formatted = formatSinglePhone(raw2);
      if (formatted && !parts.includes(formatted)) parts.push(formatted);
    }
  }

  return parts.length > 0 ? parts.join(' / ') : '+91 9423467974 / +91 8805982101';
};

const drawPinIconOnly = (ctx, cx, cy, r, color = '#00843D') => {
  ctx.save();
  ctx.fillStyle = color;
  const pinR = r * 0.72;
  const pinCY = cy - r * 0.22;
  ctx.beginPath();
  ctx.arc(cx, pinCY, pinR, Math.PI * 0.85, Math.PI * 0.15, false);
  ctx.lineTo(cx, cy + r * 0.85);
  ctx.closePath();
  ctx.fill();

  // White inner hole
  ctx.fillStyle = '#ECEEF1';
  ctx.beginPath();
  ctx.arc(cx, pinCY, pinR * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawWhitePhoneIcon = (ctx, cx, cy, r) => {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.translate(cx, cy);
  const s = (r * 1.3) / 24;
  ctx.scale(s, s);
  const p = new Path2D(
    'M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z'
  );
  ctx.translate(-12, -12);
  ctx.fill(p);
  ctx.restore();
};

const drawIconCircle = (ctx, cx, cy, r, type, color = '#BA0C2F', bgColor = '#ffffff') => {
  ctx.save();
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (type === 'pin') {
    ctx.fillStyle = color;
    const pinR = r * 0.44;
    const pinCY = cy - r * 0.14;
    ctx.beginPath();
    ctx.arc(cx, pinCY, pinR, Math.PI * 0.9, Math.PI * 0.1, false);
    ctx.lineTo(cx, cy + r * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(cx, pinCY, pinR * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'phone') {
    ctx.fillStyle = color;
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

  let W, H, stripH, imgH;
  if (aspectMode === '4:5') {
    W = 2160;
    H = 2700;
    stripH = Math.round(H * 0.142);
    imgH = H - stripH;
  } else if (aspectMode === '1:1') {
    W = 2160;
    H = 2160;
    stripH = Math.round(H * 0.155);
    imgH = H - stripH;
  } else {
    // Preserve 100% of original image dimensions and attach footer cleanly below
    W = 2160;
    stripH = Math.round(W * 0.15);
    const scale = W / (img.naturalWidth || W);
    imgH = Math.round((img.naturalHeight || W) * scale);
    H = imgH + stripH;
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Base canvas background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);

  // Draw background image strictly in image zone (0, 0, W, imgH) - NEVER covered by footer
  if (aspectMode === 'original') {
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, W, imgH);
  } else {
    const targetAspect = W / imgH;
    const imgAspect = (img.naturalWidth || W) / (img.naturalHeight || imgH);
    let sx = 0, sy = 0, sWidth = img.naturalWidth, sHeight = img.naturalHeight;
    if (imgAspect > targetAspect) {
      sWidth = img.naturalHeight * targetAspect;
      sx = (img.naturalWidth - sWidth) / 2;
    } else if (imgAspect < targetAspect) {
      sHeight = img.naturalWidth / targetAspect;
      sy = (img.naturalHeight - sHeight) / 2;
    }
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, W, imgH);
  }

  // 1. Draw Top-Left & Top-Right Brand Badges / Custom Logos
  if (options.showBrandBadges !== false) {
    const leftLogo = options.topLeftLogoSrc !== undefined ? options.topLeftLogoSrc : null;
    const rightLogo = options.topRightLogoSrc !== undefined ? options.topRightLogoSrc : '/swaraj-logo.png';

    if (leftLogo && leftLogo !== 'none') {
      try {
        const sealImg = await loadPosterImage(leftLogo);
        const aspect = (sealImg.naturalWidth && sealImg.naturalHeight) ? (sealImg.naturalWidth / sealImg.naturalHeight) : 1;
        const sealW = Math.round(W * 0.165);
        const sealH = Math.round(sealW / aspect);
        const sealX = Math.round(W * 0.04);
        const sealY = Math.round(imgH * 0.038);
        ctx.drawImage(sealImg, sealX, sealY, sealW, sealH);
      } catch (err) {
        console.warn('Could not draw left logo:', err);
      }
    }

    if (rightLogo && rightLogo !== 'none') {
      try {
        const logoImg = await loadPosterImage(rightLogo);
        const aspect = (logoImg.naturalWidth && logoImg.naturalHeight) ? (logoImg.naturalWidth / logoImg.naturalHeight) : (320 / 100);
        const logoW = Math.round(W * 0.17);
        const logoH = Math.round(logoW / aspect);
        const logoX = W - logoW - Math.round(W * 0.04);
        const logoY = Math.round(imgH * 0.038);
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
      } catch (err) {
        console.warn('Could not draw right logo:', err);
      }
    }
  }

  // 2. Client Reference Clean Light Footer Card Strip (Positioned directly below the image)
  const stripY = imgH;
  const footerBgColor = options.footerBg && options.footerBg !== '#BA0C2F' ? options.footerBg : '#ECEEF1';

  // Fill footer panel background
  ctx.fillStyle = footerBgColor;
  ctx.fillRect(0, stripY, W, stripH);

  // Top Red Accent Line across full width
  const topLineWidth = Math.max(4, Math.round(H * 0.0022));
  ctx.fillStyle = '#D32F2F'; // Swaraj Red accent
  ctx.fillRect(0, stripY, W, topLineWidth);

  const dealerTagline = String(options.dealerTagline !== undefined ? options.dealerTagline : (values?.dealerTagline || '')).trim();
  const dealerName = String(values?.headerText || '').trim() || 'साईनाथ ट्रॅक्टर्स';
  const addressText = String(values?.headerSub || '').trim() || 'जिनींग प्रेससमोर, नेवासा रोड, ता. शेवगाव, जि. अहिल्यानगर';
  const phone1 = String(values?.footerLeft || '').trim();
  const phone2 = String(values?.footerRight || '').trim();
  const combinedPhones = formatCombinedContacts(phone1, phone2);

  // Center divider position
  const dividerX = Math.round(W * 0.485);
  ctx.strokeStyle = '#6B7280';
  ctx.lineWidth = Math.max(2, Math.round(W * 0.0011));
  ctx.beginPath();
  ctx.moveTo(dividerX, stripY + Math.round(stripH * 0.10));
  ctx.lineTo(dividerX, stripY + Math.round(stripH * 0.90));
  ctx.stroke();

  // LEFT SIDE: DEALER IDENTITY
  const leftPadX = Math.round(W * 0.032);
  const leftMaxW = dividerX - leftPadX - Math.round(W * 0.018);

  // Top tagline (rendered only if provided)
  if (dealerTagline) {
    const taglineY = stripY + Math.round(stripH * 0.20);
    let tagFontSize = Math.round(stripH * 0.135);
    const tagFont = (s) => `700 ${s}px "Noto Sans Devanagari", "Montserrat", "Inter", sans-serif`;
    ctx.font = tagFont(tagFontSize);
    while (ctx.measureText(dealerTagline).width > leftMaxW && tagFontSize > 16) {
      tagFontSize -= 0.5;
      ctx.font = tagFont(tagFontSize);
    }
    ctx.fillStyle = '#1E293B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(dealerTagline, leftPadX, taglineY);
  }

  // Dealer Name: Smart 1-line or 2-line rendering for maximum impact & size
  const { line1: dLine1, line2: dLine2 } = splitDealerName(dealerName);
  const dealerColor = options.dealerColor || '#D32F2F';
  ctx.fillStyle = dealerColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const dealerFont = (s) => `900 ${s}px "Noto Sans Devanagari", "Montserrat", "Inter", sans-serif`;

  if (dLine2) {
    // 2-line bold layout
    let dFontSize = Math.round(stripH * (dealerTagline ? 0.28 : 0.34));
    ctx.font = dealerFont(dFontSize);
    while ((ctx.measureText(dLine1).width > leftMaxW || ctx.measureText(dLine2).width > leftMaxW) && dFontSize > 22) {
      dFontSize -= 0.5;
      ctx.font = dealerFont(dFontSize);
    }
    const dLineY1 = dealerTagline ? (stripY + Math.round(stripH * 0.48)) : (stripY + Math.round(stripH * 0.35));
    const dLineY2 = dealerTagline ? (stripY + Math.round(stripH * 0.76)) : (stripY + Math.round(stripH * 0.65));
    ctx.fillText(dLine1, leftPadX, dLineY1);
    ctx.fillText(dLine2, leftPadX, dLineY2);
  } else {
    // Single punchy massive line centered vertically
    let dFontSize = Math.round(stripH * (dealerTagline ? 0.44 : 0.52));
    ctx.font = dealerFont(dFontSize);
    while (ctx.measureText(dealerName).width > leftMaxW && dFontSize > 24) {
      dFontSize -= 1;
      ctx.font = dealerFont(dFontSize);
    }
    const dealerY = dealerTagline ? (stripY + Math.round(stripH * 0.62)) : (stripY + Math.round(stripH * 0.50));
    ctx.fillText(dealerName, leftPadX, dealerY);
  }

  // RIGHT SIDE: ADDRESS & PHONE
  const rightStartX = dividerX + Math.round(W * 0.020);
  const rightPadRight = Math.round(W * 0.032);
  const rightMaxW = W - rightPadRight - rightStartX;

  // Row 1: Address with green location pin (Bigger & Bolder)
  const addrCY = stripY + Math.round(stripH * 0.24);
  const pinR = Math.round(stripH * 0.10);
  const pinCX = rightStartX + pinR;
  drawPinIconOnly(ctx, pinCX, addrCY, pinR, '#00843D');

  const addrStartX = pinCX + pinR + Math.round(W * 0.010);
  const addrMaxW = (W - rightPadRight) - addrStartX;
  const addrLines = splitAddressLines(addressText, 2);
  let addrFontSize = addrLines.length > 1 ? Math.round(stripH * 0.14) : Math.round(stripH * 0.17);
  const addrFont = (s) => `800 ${s}px "Noto Sans Devanagari", "Montserrat", "Inter", sans-serif`;
  ctx.font = addrFont(addrFontSize);
  while (addrLines.some((l) => ctx.measureText(l).width > addrMaxW) && addrFontSize > 16) {
    addrFontSize -= 0.5;
    ctx.font = addrFont(addrFontSize);
  }
  ctx.fillStyle = '#1E293B';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (addrLines.length === 1) {
    ctx.fillText(addrLines[0], addrStartX, addrCY);
  } else {
    ctx.fillText(addrLines[0], addrStartX, addrCY - addrFontSize * 0.58);
    ctx.fillText(addrLines[1], addrStartX, addrCY + addrFontSize * 0.58);
  }

  // Row 2: Green Phone Pill Badge
  const pillY = stripY + Math.round(stripH * 0.49);
  const pillH = Math.round(stripH * 0.40);
  const pillW = rightMaxW;
  const pillR = Math.round(pillH * 0.18);
  drawRoundedRect(ctx, rightStartX, pillY, pillW, pillH, pillR, '#00843D');

  const pillCY = pillY + pillH / 2;
  const phoneR = Math.round(pillH * 0.25);
  const phoneCX = rightStartX + Math.round(pillH * 0.40);
  drawWhitePhoneIcon(ctx, phoneCX, pillCY, phoneR);

  const phoneStartX = phoneCX + phoneR + Math.round(W * 0.009);
  const phoneMaxW = (rightStartX + pillW - Math.round(pillH * 0.3)) - phoneStartX;
  let phoneFontSize = Math.round(pillH * 0.54);
  const phoneFont = (s) => `900 ${s}px "Montserrat", "Inter", sans-serif`;
  ctx.font = phoneFont(phoneFontSize);
  while (ctx.measureText(combinedPhones).width > phoneMaxW && phoneFontSize > 18) {
    phoneFontSize -= 0.5;
    ctx.font = phoneFont(phoneFontSize);
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(combinedPhones, phoneStartX, pillCY);

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

