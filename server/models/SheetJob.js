import mongoose from 'mongoose';

const sheetJobSchema = new mongoose.Schema(
  {
    areaManager: { type: mongoose.Schema.Types.ObjectId, ref: 'AreaManager', required: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    headers: { type: [String], default: [] },
    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
    mapping: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['pending', 'generated', 'sent_am', 'done'], default: 'pending' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

sheetJobSchema.index({ status: 1, createdAt: -1 });
sheetJobSchema.index({ areaManager: 1, createdAt: -1 });

export default mongoose.model('SheetJob', sheetJobSchema);
