import mongoose from 'mongoose';

const assignmentHistorySchema = new mongoose.Schema(
  {
    dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer', required: true },
    fromAreaManager: { type: mongoose.Schema.Types.ObjectId, ref: 'AreaManager' },
    toAreaManager: { type: mongoose.Schema.Types.ObjectId, ref: 'AreaManager', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('AssignmentHistory', assignmentHistorySchema);
