import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const loadPdfParse = () => {
  try {
    return require('pdf-parse');
  } catch {
    return null;
  }
};

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const cleanCell = (v) => {
  if (v == null || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toLocaleDateString('en-IN');
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (v > 1e9 && v < 1e13) return String(Math.round(v));
    return String(v);
  }
  return String(v).replace(/\s+/g, ' ').trim();
};

const guessField = (header) => {
  const h = norm(header);
  if (!h) return null;
  if (/website|weburl|www|url|site/.test(h)) return 'footerRight';
  if (/mobile|phonenumber|phone|whatsapp|contactno|contact|mob|tel/.test(h)) return 'footerLeft';
  if (/address|city|district|state|jagah|sthan|location|area/.test(h) && !/email/.test(h)) return 'headerSub';
  if ((/dealername|firm|shop|outlet/.test(h) || (h === 'name' || h === 'naam' || h.endsWith('name'))) && !/code|file/.test(h)) {
    return 'headerText';
  }
  if (/dealercode|code|gst|email/.test(h)) return 'footerRight';
  return null;
};

export const guessMapping = (headers) => {
  const mapping = { headerText: '', headerSub: '', footerLeft: '', footerRight: '' };
  headers.forEach((h) => {
    const field = guessField(h);
    if (field && !mapping[field]) mapping[field] = h;
  });
  if (!mapping.headerText) {
    mapping.headerText = headers.find((h) => /name|dealer/i.test(h)) || headers[0] || '';
  }
  return mapping;
};

const parsePdfRows = async (buf) => {
  const pdfParse = loadPdfParse();
  if (!pdfParse) {
    throw new Error('PDF reader is not available. Please upload Excel (.xlsx).');
  }
  const data = await pdfParse(buf);
  const lines = String(data.text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const split = (line) => line.split(/\s{2,}|\t|\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  let header = split(lines[0]);
  if (header.length < 2) header = ['Name', 'Details'];
  return lines.slice(1).map((line) => {
    const parts = split(line);
    const row = {};
    header.forEach((h, i) => {
      row[h] = parts[i] || (i === 0 ? line : '');
    });
    return row;
  });
};

const headerScore = (cells) =>
  cells.filter((c) => /name|dealer|phone|mobile|address|city|code|web|email|contact/i.test(String(c))).length;

const aoaToRows = (aoa) => {
  const lines = (aoa || []).filter((r) => Array.isArray(r) && r.some((c) => cleanCell(c)));
  if (!lines.length) return [];
  let hi = 0;
  for (let i = 0; i < Math.min(12, lines.length); i += 1) {
    if (headerScore(lines[i]) >= 2) {
      hi = i;
      break;
    }
  }
  const seen = {};
  const headers = lines[hi].map((h, i) => {
    let name = cleanCell(h) || `Column ${i + 1}`;
    if (seen[name]) {
      seen[name] += 1;
      name = `${name} ${seen[name]}`;
    } else seen[name] = 1;
    return name;
  });
  return lines.slice(hi + 1).map((line) => {
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cleanCell(line[i]);
    });
    return row;
  });
};

export const parseDealerSheet = async (filePath, originalName) => {
  const ext = path.extname(originalName || filePath).toLowerCase();
  const buf = fs.readFileSync(filePath);
  let rows = [];
  if (ext === '.pdf') {
    rows = await parsePdfRows(buf);
  } else {
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, raw: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false });
    rows = aoaToRows(aoa);
  }
  rows = rows.filter((r) => Object.values(r).some((v) => String(v).trim()));
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return { headers, rows, mapping: guessMapping(headers) };
};
