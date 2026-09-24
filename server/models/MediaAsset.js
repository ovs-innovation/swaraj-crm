import mongoose from 'mongoose';

const mediaAssetSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['video', 'image', 'logo', 'intro', 'outro', 'music', 'font'],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    path: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('MediaAsset', mediaAssetSchema);
