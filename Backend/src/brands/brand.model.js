const mongoose = require("mongoose");

const BrandSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    networkId: { type: String, required: true, index: true },
    networkCampaignId: { type: Number, index: true },
    networkCampaignLink: { type: String, default: "" }, // Campaign-specific base tracking link
    category: { type: String, default: "" },
    domain: { type: String, default: "", index: true }, // Legacy/Primary domain
    domains: { type: [String], default: [], index: true }, // Supported domains list
    logoUrl: { type: String, default: "" },
    cookieDays: { type: Number, default: 30 },
    defaultCommission: { type: Number, default: 0 },
    allowedTraffic: { type: [String], default: [] },
    networkStatus: { type: String, default: "active", index: true }, // e.g., 'joined', 'pending'
    status: { type: String, default: "active" }, // Admin controlled status
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Brand || mongoose.model("Brand", BrandSchema);
