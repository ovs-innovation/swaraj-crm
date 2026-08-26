import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'Vastora' },
    companyLogo: { type: String },
    companyAddress: { type: String },
    companyEmail: { type: String },
    companyPhone: { type: String },
    passwordPolicy: {
      minLength: { type: Number, default: 6 },
      requireUppercase: { type: Boolean, default: false },
      requireNumber: { type: Boolean, default: false },
    },
    theme: {
      primaryColor: { type: String, default: '#E31837' },
      secondaryColor: { type: String, default: '#1a1a2e' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
