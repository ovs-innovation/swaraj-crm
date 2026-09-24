import mongoose from 'mongoose';

const videoJobSchema = new mongoose.Schema(
  {
    dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer', required: true },
    areaManager: { type: mongoose.Schema.Types.ObjectId, ref: 'AreaManager' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    caption: { type: String, default: '', trim: true },
    hashtags: { type: String, default: '', trim: true },
    originalUrl: { type: String, required: true },
    originalPath: { type: String, required: true },
    editedUrl: { type: String, default: '' },
    editedPath: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    thumbnailPath: { type: String, default: '' },
    watermarkUrl: { type: String, default: '' },
    watermarkPath: { type: String, default: '' },
    introPath: { type: String, default: '' },
    outroPath: { type: String, default: '' },
    musicPath: { type: String, default: '' },
    srtPath: { type: String, default: '' },
    mergePaths: [{ type: String }],
    editSpec: { type: mongoose.Schema.Types.Mixed, default: {} },
    versions: [
      {
        url: String,
        path: String,
        spec: mongoose.Schema.Types.Mixed,
        createdAt: { type: Date, default: Date.now },
        note: String,
      },
    ],
    renderLogs: [
      {
        at: { type: Date, default: Date.now },
        message: String,
        progress: Number,
        level: { type: String, default: 'info' },
      },
    ],
    status: {
      type: String,
      enum: [
        'pending_review',
        'editing',
        'queued',
        'rendering',
        'waiting_am',
        'changes_requested',
        'ready_to_publish',
        'scheduled',
        'publishing',
        'published',
        'failed',
      ],
      default: 'pending_review',
    },
    renderProgress: { type: Number, default: 0 },
    changeRequest: { type: String, default: '' },
    approvedByAm: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    platform: { type: String, enum: ['facebook', 'instagram', 'both', ''], default: '' },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    facebookPostId: { type: String, default: '' },
    instagramPostId: { type: String, default: '' },
    facebookResponse: { type: mongoose.Schema.Types.Mixed },
    instagramResponse: { type: mongoose.Schema.Types.Mixed },
    errorMessage: { type: String, default: '' },
    durationSec: { type: Number, default: 0 },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandTemplate' },
    comments: [
      {
        atSec: { type: Number, required: true },
        text: { type: String, required: true, trim: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    analytics: { type: mongoose.Schema.Types.Mixed, default: null },
    queuedAt: { type: Date },
    renderStartedAt: { type: Date },
    renderFinishedAt: { type: Date },
    lastRenderMs: { type: Number, default: 0 },
    probe: { type: mongoose.Schema.Types.Mixed, default: null },
    forensic: { type: mongoose.Schema.Types.Mixed, default: null },
    publishLock: { type: Boolean, default: false },
    publications: [
      {
        platform: { type: String, required: true },
        status: { type: String, default: 'pending' },
        externalId: { type: String, default: '' },
        response: { type: mongoose.Schema.Types.Mixed },
        attempts: [
          {
            at: { type: Date, default: Date.now },
            attempt: Number,
            ok: Boolean,
            error: String,
          },
        ],
        scheduledAt: Date,
        publishedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

videoJobSchema.index({ status: 1, createdAt: -1 });
videoJobSchema.index({ dealer: 1, createdAt: -1 });
videoJobSchema.index({ areaManager: 1, status: 1 });

export default mongoose.model('VideoJob', videoJobSchema);
