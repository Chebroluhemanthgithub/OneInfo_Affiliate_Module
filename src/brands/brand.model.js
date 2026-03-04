const mongoose = require("mongoose");

const BrandSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    networkId: { type: String, required: true, index: true },
    networkCampaignId: { type: Number },
    category: { type: String, default: "" },
    domain: { type: String, default: "", index: true },
    logoUrl: { type: String, default: "" },
    cookieDays: { type: Number, default: 30 },
    defaultCommission: { type: Number, default: 0 },
    allowedTraffic: { type: [String], default: [] },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Brand || mongoose.model("Brand", BrandSchema);
