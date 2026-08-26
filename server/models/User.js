import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'area_manager', 'dealer'],
      default: 'area_manager',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    areaManagerRef: { type: mongoose.Schema.Types.ObjectId, ref: 'AreaManager' },
    dealerRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer' },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
