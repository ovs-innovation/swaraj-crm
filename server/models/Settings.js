import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "Swaraj" },
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
      primaryColor: { type: String, default: "#0078D4" },
      secondaryColor: { type: String, default: "#1a1a2e" },
    },
    letterhead: {
      imageUrl: { type: String, default: "" },
      headerText: { type: String, default: "SWARAJ" },
      headerSub: {
        type: String,
        default: "Dealer CRM · Mahindra & Mahindra Ltd.",
      },
      footerLeft: { type: String, default: "Confidential — internal use" },
      footerRight: { type: String, default: "www.swarajtractors.com" },
      headerPct: { type: Number, default: 16 },
      footerPct: { type: Number, default: 11 },
      headerBg: { type: String, default: "rgba(0, 90, 158, 0.72)" },
      footerBg: { type: String, default: "rgba(28, 25, 23, 0.72)" },
      fontFamily: { type: String, default: "Inter" },
      headerSize: { type: Number, default: 28 },
      subSize: { type: Number, default: 14 },
      footerSize: { type: Number, default: 13 },
      bold: { type: Boolean, default: true },
      italic: { type: Boolean, default: false },
      align: { type: String, default: "center" },
      headerColor: { type: String, default: "#ffffff" },
      footerColor: { type: String, default: "#ffffff" },
      pos: { type: mongoose.Schema.Types.Mixed, default: {} },
      texts: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: true },
);

export default mongoose.model("Settings", settingsSchema);
