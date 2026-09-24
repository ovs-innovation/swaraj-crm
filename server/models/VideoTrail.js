import mongoose from 'mongoose';

const videoTrailSchema = new mongoose.Schema(
  {
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoJob', required: true, immutable: true },
    at: { type: Date, default: Date.now, immutable: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', immutable: true },
    actorName: { type: String, default: '', immutable: true },
    action: { type: String, required: true, immutable: true },
    detail: { type: String, default: '', immutable: true },
  },
  { timestamps: false, versionKey: false }
);

videoTrailSchema.index({ video: 1, at: 1 });

videoTrailSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
  throw new Error('Video trail is immutable');
});

export default mongoose.model('VideoTrail', videoTrailSchema);
