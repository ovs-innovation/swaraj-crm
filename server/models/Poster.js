import mongoose from 'mongoose';

const posterSchema = new mongoose.Schema(
  {
    areaManager: { type: mongoose.Schema.Types.ObjectId, ref: 'AreaManager', required: true },
    sheet: { type: mongoose.Schema.Types.ObjectId, ref: 'SheetJob' },
    dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer' },
    dealerName: { type: String, trim: true },
    url: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending_am', 'approved', 'rejected'],
      default: 'draft',
    },
    row: { type: mongoose.Schema.Types.Mixed, default: {} },
    layout: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, default: '' },
  },
  { timestamps: true }
);

posterSchema.index({ areaManager: 1, createdAt: -1 });

export default mongoose.model('Poster', posterSchema);
