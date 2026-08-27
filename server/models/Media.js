import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['image', 'video', 'document'],
      required: true,
    },
    url: { type: String, required: true },
    publicId: { type: String },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    uploadSource: {
      type: String,
      enum: ['admin', 'dealer'],
      default: 'dealer',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminComment: { type: String, trim: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
  },
  { timestamps: true }
);

  mediaSchema.index({ dealer: 1, status: 1, createdAt: -1 });
  mediaSchema.index({ createdAt: -1 });

export default mongoose.model('Media', mediaSchema);
