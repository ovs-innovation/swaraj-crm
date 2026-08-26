import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema(
  {
    dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer', required: true },
    areaManager: { type: mongoose.Schema.Types.ObjectId, ref: 'AreaManager', required: true },
    visitDate: { type: Date, required: true },
    visitTime: { type: String },
    notes: { type: String, trim: true },
    media: [{ type: String }],
    gpsLocation: {
      latitude: Number,
      longitude: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Visit', visitSchema);
