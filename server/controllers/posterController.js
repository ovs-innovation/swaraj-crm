import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Poster from '../models/Poster.js';
import SheetJob from '../models/SheetJob.js';
import Dealer from '../models/Dealer.js';
import { asyncHandler } from '../utils/helpers.js';
import { parseDealerSheet } from '../utils/parseDealerSheet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const submitSheet = asyncHandler(async (req, res) => {
  if (req.user.role !== 'area_manager' || !req.user.areaManagerRef) {
    return res.status(403).json({ success: false, message: 'Only area managers can send a sheet' });
  }
  if (!req.file) return res.status(400).json({ success: false, message: 'Upload an Excel sheet' });
  try {
    const parsed = await parseDealerSheet(req.file.path, req.file.originalname);
    const job = await SheetJob.create({
      areaManager: req.user.areaManagerRef,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      headers: parsed.headers,
      rows: parsed.rows,
      mapping: parsed.mapping,
      createdBy: req.user._id,
    });
    res.json({ success: true, data: job });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    res.status(400).json({ success: false, message: err.message || 'Could not read sheet' });
  }
});

export const getSheets = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'area_manager') {
    filter.areaManager = req.user.areaManagerRef;
  }
  const sheets = await SheetJob.find(filter)
    .populate('areaManager', 'name employeeId')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ success: true, data: sheets });
});

export const getSheet = asyncHandler(async (req, res) => {
  const job = await SheetJob.findById(req.params.id).populate('areaManager', 'name employeeId');
  if (!job) return res.status(404).json({ success: false, message: 'Sheet not found' });
  if (req.user.role === 'area_manager' && String(job.areaManager?._id || job.areaManager) !== String(req.user.areaManagerRef)) {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  if (!job.rowsEdited) {
    try {
      const filePath = path.join(__dirname, '..', String(job.fileUrl || '').replace(/^\//, ''));
      if (job.fileUrl && fs.existsSync(filePath)) {
        const parsed = await parseDealerSheet(filePath, job.fileName);
        job.headers = parsed.headers;
        job.rows = parsed.rows;
        if (!job.mapping || !job.mapping.headerText) job.mapping = parsed.mapping;
        await job.save();
      }
    } catch {
      /* keep stored rows */
    }
  }
  res.json({ success: true, data: job });
});

export const updateSheet = asyncHandler(async (req, res) => {
  if (req.user.role === 'area_manager') {
    return res.status(403).json({ success: false, message: 'Only Super Admin can edit the Excel data' });
  }
  const job = await SheetJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Sheet not found' });
  if (Array.isArray(req.body.rows)) job.rows = req.body.rows;
  if (req.body.mapping) job.mapping = req.body.mapping;
  job.rowsEdited = true;
  await job.save();
  res.json({ success: true, data: job });
});

export const savePosters = asyncHandler(async (req, res) => {
  if (req.user.role === 'area_manager') {
    return res.status(403).json({ success: false, message: 'Area managers only send the sheet. Super Admin creates posters.' });
  }
  if (!req.body.sheetId) {
    return res.status(400).json({ success: false, message: 'Open the Excel sheet that was sent, then create posters' });
  }
  const job = await SheetJob.findById(req.body.sheetId);
  if (!job) return res.status(404).json({ success: false, message: 'Sheet not found' });
  const areaManagerId = job.areaManager;
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ success: false, message: 'No pictures generated' });

  const names = [].concat(req.body.dealerName || []);
  const created = [];
  for (let i = 0; i < files.length; i += 1) {
    const name = String(names[i] || '').trim();
    let dealer = null;
    if (name) {
      const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      dealer = await Dealer.findOne({
        areaManager: areaManagerId,
        $or: [{ dealerName: new RegExp(`^${safe}$`, 'i') }, { dealerCode: new RegExp(`^${safe}$`, 'i') }],
      }).select('_id dealerName');
    }
    created.push(
      await Poster.create({
        areaManager: areaManagerId,
        sheet: job._id,
        dealer: dealer?._id,
        dealerName: dealer?.dealerName || name || `Dealer ${i + 1}`,
        url: `/uploads/${files[i].filename}`,
        status: 'draft',
        createdBy: req.user._id,
      })
    );
  }
  job.status = 'generated';
  await job.save();
  res.json({ success: true, data: created });
});

export const sendToAreaManager = asyncHandler(async (req, res) => {
  if (req.user.role === 'area_manager') {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  const job = await SheetJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Sheet not found' });
  const owned = await Poster.countDocuments({ sheet: job._id, areaManager: job.areaManager });
  if (!owned) {
    return res.status(400).json({ success: false, message: 'Create posters from this sheet first' });
  }
  const result = await Poster.updateMany(
    { sheet: job._id, areaManager: job.areaManager },
    { $set: { status: 'pending_am', reviewedBy: null, reviewNote: '' } }
  );
  job.status = 'sent_am';
  await job.save();
  res.json({ success: true, data: { sent: result.modifiedCount || owned, areaManager: job.areaManager } });
});

export const getPosters = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'area_manager') {
    if (!req.user.areaManagerRef) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    filter.areaManager = req.user.areaManagerRef;
    filter.status = { $in: ['pending_am', 'approved', 'rejected'] };
  } else {
    if (req.query.sheetId) filter.sheet = req.query.sheetId;
    else if (req.query.areaManagerId) filter.areaManager = req.query.areaManagerId;
  }
  const posters = await Poster.find(filter)
    .populate('dealer', 'dealerName dealerCode')
    .populate('areaManager', 'name employeeId')
    .populate('sheet', 'fileName')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json({ success: true, data: posters });
});

export const reviewPoster = asyncHandler(async (req, res) => {
  const poster = await Poster.findById(req.params.id);
  if (!poster) return res.status(404).json({ success: false, message: 'Not found' });
  if (req.user.role === 'area_manager') {
    if (String(poster.areaManager) !== String(req.user.areaManagerRef)) {
      return res.status(403).json({ success: false, message: 'This poster is for another area manager' });
    }
    if (poster.status !== 'pending_am') {
      return res.status(400).json({ success: false, message: 'This poster is not waiting for your approval' });
    }
  } else if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  const status = req.body.status === 'rejected' ? 'rejected' : 'approved';
  poster.status = status;
  poster.reviewedBy = req.user._id;
  poster.reviewNote = req.body.note || '';
  await poster.save();
  res.json({ success: true, data: poster });
});

export const deletePoster = asyncHandler(async (req, res) => {
  if (req.user.role === 'area_manager') {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  const poster = await Poster.findById(req.params.id);
  if (!poster) return res.status(404).json({ success: false, message: 'Not found' });
  const filePath = path.join(__dirname, '..', poster.url.replace(/^\//, ''));
  fs.unlink(filePath, () => {});
  await poster.deleteOne();
  res.json({ success: true });
});

const unlinkPosterFile = (poster) => {
  if (!poster?.url) return;
  fs.unlink(path.join(__dirname, '..', poster.url.replace(/^\//, '')), () => {});
};

export const updatePoster = asyncHandler(async (req, res) => {
  if (req.user.role === 'area_manager') {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  const poster = await Poster.findById(req.params.id);
  if (!poster) return res.status(404).json({ success: false, message: 'Not found' });
  if (req.body.dealerName != null) {
    const name = String(req.body.dealerName).trim();
    if (name) poster.dealerName = name;
  }
  if (req.body.layout) {
    try {
      poster.layout = typeof req.body.layout === 'string' ? JSON.parse(req.body.layout) : req.body.layout;
    } catch {
      /* ignore bad layout json */
    }
  }
  if (req.file) {
    unlinkPosterFile(poster);
    poster.url = `/uploads/${req.file.filename}`;
  }
  await poster.save();
  res.json({ success: true, data: poster });
});

export const bulkDeletePosters = asyncHandler(async (req, res) => {
  if (req.user.role === 'area_manager') {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  const ids = [].concat(req.body.ids || []).filter(Boolean);
  const filter = {};
  if (req.body.all && req.body.sheetId) filter.sheet = req.body.sheetId;
  else if (ids.length) filter._id = { $in: ids };
  else return res.status(400).json({ success: false, message: 'Nothing selected to delete' });

  const posters = await Poster.find(filter);
  posters.forEach(unlinkPosterFile);
  const result = await Poster.deleteMany(filter);
  res.json({ success: true, data: { deleted: result.deletedCount } });
});
