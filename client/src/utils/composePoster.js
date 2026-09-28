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

const drawIconCircle = (ctx, cx, cy, r, type) => {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (type === 'pin') {
    ctx.fillStyle = '#BA0C2F';
    const pinR = r * 0.45;
    const pinY = cy - r * 0.15;
    ctx.beginPath();
    ctx.arc(cx, pinY, pinR, Math.PI, 0, false);
    ctx.lineTo(cx, cy + r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, pinY, pinR * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'phone') {
    ctx.fillStyle = '#BA0C2F';
    ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📞', cx, cy);
  }
  ctx.restore();
};

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

  let swarajLogo = null;
  try {
    swarajLogo = await loadPosterImage('/swaraj-logo.png');
  } catch {
    // Continue if logo file not reachable
  }

  // 1. Draw Green Swaraj Logo in Top-Left Area
  if (swarajLogo) {
    const logoAspect = swarajLogo.naturalWidth / swarajLogo.naturalHeight;
    const topLogoW = Math.round(W * 0.16); // 16% of poster width
    const topLogoH = Math.round(topLogoW / (logoAspect || 3.0));
    const topLogoX = Math.round(W * 0.032);
    const topLogoY = Math.round(H * 0.035);
    const pad = Math.round(topLogoH * 0.16);

    // Crisp white rounded badge
    drawRoundedRect(
      ctx,
      topLogoX - pad,
      topLogoY - pad,
      topLogoW + pad * 2,
      topLogoH + pad * 2,
      Math.round((topLogoH + pad * 2) * 0.22),
      '#ffffff',
      'rgba(0, 0, 0, 0.12)',
      Math.max(1, Math.round(W * 0.001))
    );
    ctx.drawImage(swarajLogo, topLogoX, topLogoY, topLogoW, topLogoH);
  }

  // Modern Swaraj Bottom Brand Strip (no top blue band, no bottom black band)
  const stripH = Math.round(H * 0.088);
  const stripY = H - stripH;
  const footerBg = letterhead?.footerBg || '#BA0C2F'; // Official Swaraj Crimson Red

  // 2. Draw solid red footer strip
  ctx.fillStyle = footerBg;
  ctx.fillRect(0, stripY, W, stripH);

  // Top accent line
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(0, stripY, W, Math.max(2, Math.round(H * 0.0025)));

  const padX = Math.round(W * 0.016);
  const innerH = Math.round(stripH * 0.76);
  const innerY = Math.round(stripY + (stripH - innerH) / 2);

  const dealerName = String(values.headerText || '').trim();
  const addressText = String(values.headerSub || '').trim();
  const phoneText = String(values.footerLeft || '').trim();
  const extraText = String(values.footerRight || '').trim();

  // 3. Left White Badge (Dealer Name in bold Swaraj Green)
  const badgeW = Math.round(W * 0.30);
  const badgeX = padX;
  const badgeRadius = Math.round(innerH * 0.22);
  drawRoundedRect(ctx, badgeX, innerY, badgeW, innerH, badgeRadius, '#ffffff', '#BA0C2F', Math.max(1, Math.round(innerH * 0.035)));

  const nameStartX = badgeX + Math.round(badgeW * 0.06);
  const nameMaxW = badgeW - Math.round(badgeW * 0.12);
  const dealerFontSize = Math.round(innerH * 0.44);
  ctx.font = `bold ${dealerFontSize}px "Noto Sans Devanagari", "Inter", sans-serif`;
  ctx.fillStyle = '#008744';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const fittedName = fitText(ctx, dealerName || 'Swaraj Dealer', nameMaxW);
  ctx.fillText(fittedName, nameStartX, innerY + innerH / 2);

  // 3. Center Section: 📍 Location Pin + Address / Branches
  const centerStartX = badgeX + badgeW + Math.round(W * 0.015);
  const centerEndX = Math.round(W * 0.74);
  const iconR = Math.round(innerH * 0.22);
  const iconCY = stripY + stripH / 2;
  const pinCX = centerStartX + iconR;
  drawIconCircle(ctx, pinCX, iconCY, iconR, 'pin');

  const addrStartX = pinCX + iconR + Math.round(W * 0.008);
  const addrMaxW = centerEndX - addrStartX;
  const addrFontSize = Math.round(innerH * 0.22);

  const rawWords = addressText.split(/\s+/).filter(Boolean);
  let line1 = addressText;
  let line2 = '';
  if (rawWords.length > 5 || ctx.measureText(addressText).width > addrMaxW) {
    const half = Math.ceil(rawWords.length / 2);
    line1 = rawWords.slice(0, half).join(' ');
    line2 = rawWords.slice(half).join(' ');
  }

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (line2) {
    ctx.font = `bold ${addrFontSize}px "Noto Sans Devanagari", "Inter", sans-serif`;
    ctx.fillText(fitText(ctx, line1, addrMaxW), addrStartX, iconCY - addrFontSize * 0.65);
    ctx.font = `400 ${Math.round(addrFontSize * 0.88)}px "Noto Sans Devanagari", "Inter", sans-serif`;
    ctx.fillText(fitText(ctx, line2, addrMaxW), addrStartX, iconCY + addrFontSize * 0.65);
  } else {
    ctx.font = `600 ${addrFontSize}px "Noto Sans Devanagari", "Inter", sans-serif`;
    ctx.fillText(fitText(ctx, line1, addrMaxW), addrStartX, iconCY);
  }

  // Vertical divider before contact
  const divX = centerEndX + Math.round(W * 0.012);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = Math.max(1, Math.round(W * 0.0015));
  ctx.beginPath();
  ctx.moveTo(divX, innerY + innerH * 0.12);
  ctx.lineTo(divX, innerY + innerH * 0.88);
  ctx.stroke();

  // 4. Right Section: 📞 Phone + Contacts
  const rightStartX = divX + Math.round(W * 0.015);
  const phoneCX = rightStartX + iconR;
  drawIconCircle(ctx, phoneCX, iconCY, iconR, 'phone');

  const phoneStartX = phoneCX + iconR + Math.round(W * 0.008);
  const phoneMaxW = (W - padX) - phoneStartX;
  const phoneFontSize = Math.round(innerH * 0.22);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (extraText) {
    ctx.font = `bold ${phoneFontSize}px "Noto Sans Devanagari", "Inter", sans-serif`;
    ctx.fillText(fitText(ctx, phoneText, phoneMaxW), phoneStartX, iconCY - phoneFontSize * 0.65);
    ctx.font = `500 ${Math.round(phoneFontSize * 0.88)}px "Noto Sans Devanagari", "Inter", sans-serif`;
    ctx.fillText(fitText(ctx, extraText, phoneMaxW), phoneStartX, iconCY + phoneFontSize * 0.65);
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

