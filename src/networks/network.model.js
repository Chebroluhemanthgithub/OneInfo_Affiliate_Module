const mongoose = require("mongoose");

const NetworkSchema = new mongoose.Schema(
  {
    _id: { type: String },
    key: { type: String, required: true, index: true }, // e.g. 'admitad', 'cuelinks'
    name: { type: String, required: true },
    type: { type: String, default: "affiliate_network" },
    apiKey: { type: String, default: "" },
    baseTrackingUrl: { type: String, default: "" },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Network || mongoose.model("Network", NetworkSchema);
