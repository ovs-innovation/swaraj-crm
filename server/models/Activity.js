import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['dealer', 'area_manager', 'media', 'visit', 'assignment', 'user'],
      required: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model('Activity', activitySchema);
