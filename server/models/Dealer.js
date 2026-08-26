import mongoose from 'mongoose';

const dealerSchema = new mongoose.Schema(
  {
    dealerName: { type: String, required: true, trim: true },
    dealerCode: { type: String, required: true, unique: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    alternateMobile: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    state: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    pincode: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    pan: { type: String, trim: true },
    facebookLink: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },
    preferredLanguage: { type: String, default: 'Hindi', trim: true },
    areaManager: { type: mongoose.Schema.Types.ObjectId, ref: 'AreaManager' },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    profileImage: { type: String },
  },
  { timestamps: true }
);

dealerSchema.index(
  { dealerName: 'text', dealerCode: 'text', contactPerson: 'text' },
  { default_language: 'english', language_override: 'textSearchLang' }
);

export default mongoose.model('Dealer', dealerSchema);
