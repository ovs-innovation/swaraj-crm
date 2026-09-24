import mongoose from 'mongoose';

const brandTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' },
    intro: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' },
    outro: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' },
    watermark: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' },
    music: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' },
    defaultSpec: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('BrandTemplate', brandTemplateSchema);
