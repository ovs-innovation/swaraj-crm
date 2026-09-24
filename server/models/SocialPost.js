import mongoose from 'mongoose';

const socialPostSchema = new mongoose.Schema(
  {
    caption: { type: String, default: '', trim: true },
    hashtags: { type: String, default: '', trim: true },
    message: { type: String, default: '' },
    platform: {
      type: String,
      enum: ['facebook', 'instagram', 'both'],
      required: true,
    },
    images: [
      {
        path: String,
        url: String,
        originalName: String,
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'publishing', 'published', 'failed'],
      default: 'draft',
    },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    facebookPostId: { type: String, default: '' },
    instagramPostId: { type: String, default: '' },
    facebookResponse: { type: mongoose.Schema.Types.Mixed },
    instagramResponse: { type: mongoose.Schema.Types.Mixed },
    errorMessage: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('SocialPost', socialPostSchema);
