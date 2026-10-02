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

  // 2. Swaraj Official 3-Tier Promotional Footer Card
  const stripH = Math.round(H * 0.205); // ~20.5% of poster height matching mockup
  const stripY = H - stripH;

  const greenH = Math.round(stripH * 0.25); // ~25% for bottom green website bar
  const greenY = H - greenH;
  const redH = stripH - greenH; // ~75% for top red section (dealer name + white pill)
  const redY = stripY;

  const dealerName = String(values?.headerText || '').trim() || 'M/S DANGA TRADERS';
  const addressText = String(values?.headerSub || '').trim() || 'Near Shiv Temple, Plot No. 37-38, Mansarovar Colony, Morra Road';
  const phoneText = String(values?.footerLeft || '').trim() || '8854049039';
  const extraText = String(values?.footerRight || '').trim() || 'www.swarajtractors.com';

  // -------------------------------------------------------------
  // TIER 1 & 2: RED SECTION WITH ROUNDED TOP CORNERS
  // -------------------------------------------------------------
  const topRadius = Math.round(W * 0.025);
  const redGrad = ctx.createLinearGradient(0, redY, 0, redY + redH);
  redGrad.addColorStop(0, '#860017');
  redGrad.addColorStop(1, '#52000A');
  drawRoundedTopRect(ctx, 0, redY, W, redH, topRadius, redGrad);

  // Top highlight line on red section
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(topRadius, redY, W - topRadius * 2, Math.max(2, Math.round(H * 0.0014)));

  // TIER 1: DEALER NAME HEADER
  const headerAreaH = Math.round(redH * 0.48);
  const headerCY = redY + Math.round(headerAreaH * 0.44);

  // Parse prefix (e.g. M/S, M/s, Shree)
  const rawDealer = dealerName.trim();
  const m = rawDealer.match(/^(M\/S\.?|M\/s\.?|MS\.?|SHREE|SHRI)\s+/i);
  const prefix = m ? m[0].toUpperCase() : '';
  const company = m ? rawDealer.slice(m[0].length).trim().toUpperCase() : rawDealer.toUpperCase();

  const maxHeaderW = W * 0.92;
  let dealerFontSize = Math.round(headerAreaH * 0.58);
  const dealerFont = (s) => `900 ${s}px "Montserrat", "Inter", "Noto Sans Devanagari", sans-serif`;
  ctx.font = dealerFont(dealerFontSize);

  while (((prefix ? ctx.measureText(prefix).width : 0) + ctx.measureText(company).width) > maxHeaderW && dealerFontSize > 24) {
    dealerFontSize -= 1;
    ctx.font = dealerFont(dealerFontSize);
  }

  const prefixW = prefix ? ctx.measureText(prefix).width : 0;
  const companyW = ctx.measureText(company).width;
  const totalDealerW = prefixW + companyW;
  const dealerStartX = (W - totalDealerW) / 2;

  ctx.textBaseline = 'middle';
  if (prefix) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(prefix, dealerStartX, headerCY);
    ctx.fillStyle = '#FFE066'; // Golden Yellow
    ctx.fillText(company, dealerStartX + prefixW, headerCY);
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFE066';
    ctx.fillText(company, W / 2, headerCY);
  }

  // Decorative double dash '=' below dealer name
  const dashY = headerCY + Math.round(dealerFontSize * 0.52);
  const dashW = Math.round(W * 0.032);
  const dashH = Math.max(2, Math.round(dealerFontSize * 0.065));
  ctx.fillStyle = '#FFE066';
  ctx.fillRect(W / 2 - dashW / 2, dashY - dashH * 1.5, dashW, dashH);
  ctx.fillRect(W / 2 - dashW / 2, dashY + dashH * 0.5, dashW, dashH);

  // TIER 2: WHITE PILL CARD (ADDRESS & PHONE)
  const pillMarginX = Math.round(W * 0.015);
  const pillW = W - pillMarginX * 2;
  const pillH = Math.round(redH * 0.49);
  const pillY = redY + Math.round(redH * 0.47);
  const pillR = Math.round(pillH * 0.28);

  drawRoundedRect(ctx, pillMarginX, pillY, pillW, pillH, pillR, '#FFFDF8', 'rgba(0,0,0,0.15)', Math.max(1, Math.round(W * 0.0008)));

  const pillCY = pillY + pillH / 2;
  const divX = pillMarginX + Math.round(pillW * 0.525);

  // Inner Divider inside pill
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
  ctx.lineWidth = Math.max(1.5, Math.round(W * 0.001));
  ctx.beginPath();
  ctx.moveTo(divX, pillY + pillH * 0.14);
  ctx.lineTo(divX, pillY + pillH * 0.86);
  ctx.stroke();

  // LEFT SIDE OF PILL: ADDRESS
  const pinR = Math.round(pillH * 0.30);
  const pinCX = pillMarginX + Math.round(pillW * 0.032) + pinR;
  drawIconCircle(ctx, pinCX, pillCY, pinR, 'pin', '#8A001A', '#FBECEE');

  const addrStartX = pinCX + pinR + Math.round(pillW * 0.016);
  const addrMaxW = divX - addrStartX - Math.round(pillW * 0.018);
  const addrLines = splitAddressLines(addressText, 2);
  let addrFontSize = Math.round(pillH * 0.34); // Increased: ~58px
  const addrFont = (s) => `900 ${s}px "Montserrat", "Inter", "Noto Sans Devanagari", sans-serif`;
  ctx.font = addrFont(addrFontSize);
  while (addrLines.some((l) => ctx.measureText(l).width > addrMaxW) && addrFontSize > 14) {
    addrFontSize -= 0.5;
    ctx.font = addrFont(addrFontSize);
  }

  ctx.fillStyle = '#1C1917'; // Rich dark near-black
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (addrLines.length === 1) {
    ctx.fillText(addrLines[0], addrStartX, pillCY);
  } else if (addrLines.length === 2) {
    ctx.fillText(addrLines[0], addrStartX, pillCY - addrFontSize * 0.58);
    ctx.fillText(addrLines[1], addrStartX, pillCY + addrFontSize * 0.58);
  } else {
    const sp = addrFontSize * 1.05;
    ctx.fillText(addrLines[0], addrStartX, pillCY - sp);
    ctx.fillText(addrLines[1], addrStartX, pillCY);
    ctx.fillText(addrLines[2], addrStartX, pillCY + sp);
  }

  // RIGHT SIDE OF PILL: PHONE NUMBER
  const phoneR = Math.round(pillH * 0.30);
  const phoneCX = divX + Math.round(pillW * 0.032) + phoneR;
  drawIconCircle(ctx, phoneCX, pillCY, phoneR, 'phone', '#FFFFFF', '#8A001A');

  const phoneStartX = phoneCX + phoneR + Math.round(pillW * 0.016);
  const phoneMaxW = (pillMarginX + pillW - Math.round(pillW * 0.02)) - phoneStartX;
  const cleanPhone = formatContactNumbers(phoneText);

  let phoneFontSize = Math.round(pillH * 0.52); // Increased: ~88px
  const phoneFont = (s) => `900 ${s}px "Montserrat", "Inter", sans-serif`;
  ctx.font = phoneFont(phoneFontSize);
  while (ctx.measureText(cleanPhone).width > phoneMaxW && phoneFontSize > 16) {
    phoneFontSize -= 0.5;
    ctx.font = phoneFont(phoneFontSize);
  }

  ctx.fillStyle = '#8A001A'; // Deep crimson red
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(cleanPhone, phoneStartX, pillCY);

  // -------------------------------------------------------------
  // TIER 3: SWARAJ FOREST GREEN WEBSITE BAR
  // -------------------------------------------------------------
  ctx.fillStyle = '#004728'; // Official Swaraj Forest Green
  ctx.fillRect(0, greenY, W, greenH);

  // Accent divider on top of green bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(0, greenY, W, Math.max(2, Math.round(H * 0.001)));

  const greenCY = greenY + greenH / 2;
  const cleanUrl = String(extraText || 'www.swarajtractors.com').replace(/^https?:\/\//i, '');
  let urlFontSize = Math.round(greenH * 0.48); // Increased: ~68px
  const urlFont = (s) => `900 ${s}px "Inter", "Montserrat", sans-serif`;
  ctx.font = urlFont(urlFontSize);

  const globeBadgeR = Math.round(greenH * 0.33);
  const badgeGap = Math.round(W * 0.014);
  let urlTextW = ctx.measureText(cleanUrl).width;
  let totalContentW = globeBadgeR * 2 + badgeGap + urlTextW;

  while (totalContentW > W * 0.75 && urlFontSize > 16) {
    urlFontSize -= 0.5;
    ctx.font = urlFont(urlFontSize);
    urlTextW = ctx.measureText(cleanUrl).width;
    totalContentW = globeBadgeR * 2 + badgeGap + urlTextW;
  }

  const contentStartX = (W - totalContentW) / 2;
  const globeCX = contentStartX + globeBadgeR;
  const urlStartX = contentStartX + globeBadgeR * 2 + badgeGap;

  // White circular badge with green globe
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(globeCX, greenCY, globeBadgeR, 0, Math.PI * 2);
  ctx.fill();
  drawGlobeIcon(ctx, globeCX, greenCY, globeBadgeR * 0.72, '#004728');

  // Website URL Text
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(cleanUrl, urlStartX, greenCY);

  // Flanking Double Accent Lines
  const lineGap = Math.max(3, Math.round(greenH * 0.065));
  const leftStart = Math.round(W * 0.055);
  const leftEnd = contentStartX - Math.round(W * 0.024);
  const rightStart = contentStartX + totalContentW + Math.round(W * 0.024);
  const rightEnd = W - Math.round(W * 0.055);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = Math.max(1.5, Math.round(W * 0.0009));

  if (leftEnd > leftStart + 25) {
    ctx.beginPath();
    ctx.moveTo(leftStart, greenCY - lineGap);
    ctx.lineTo(leftEnd, greenCY - lineGap);
    ctx.moveTo(leftStart, greenCY + lineGap);
    ctx.lineTo(leftEnd, greenCY + lineGap);
    ctx.stroke();
  }

  if (rightEnd > rightStart + 25) {
    ctx.beginPath();
    ctx.moveTo(rightStart, greenCY - lineGap);
    ctx.lineTo(rightEnd, greenCY - lineGap);
    ctx.moveTo(rightStart, greenCY + lineGap);
    ctx.lineTo(rightEnd, greenCY + lineGap);
    ctx.stroke();
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

