const mongoose = require("mongoose");

const AffiliateLinkSchema = new mongoose.Schema(
  {
    // Core identifiers
    shortCode:   { type: String, required: true, unique: true, index: true },
    creatorId:   { type: String, required: true },

    // URLs
    originalUrl:  { type: String, required: true },   // raw product URL
    affiliateUrl: { type: String, required: true },   // Admitad BASE_LINK tracking URL
    publicUrl:    { type: String, required: true },   // https://www.oneinfo.ai/share/:code

    // Platform
    platform:     { type: String, default: "admitad" },

    // Network & Brand (new)
    brandId:      { type: String, index: true },
    networkId:    { type: String, index: true },
    normalizedUrl: { type: String, index: true }, // For robust de-duplication
    subId:        { type: String, default: "" },

    // Product metadata (scraped)
    productTitle: { type: String, default: "" },
    productImage: { type: String, default: "" },

    // Analytics
    clickCount:   { type: Number, default: 0 },

    // Link lifecycle
    isActive:     { type: Boolean, default: true },   // admin can disable
    expiresAt:    { type: Date, default: null },       // null = never expires
  },
  {
    timestamps: true, // adds createdAt + updatedAt
  }
);

// ─────────────────────────────────────────────
// Production-Grade De-duplication Index
// Prevents duplicate rows for the same creator, network, and product.
// ─────────────────────────────────────────────
AffiliateLinkSchema.index(
  { creatorId: 1, networkId: 1, normalizedUrl: 1 },
  { unique: true }
);

// ─────────────────────────────────────────────
// Compound index for creator dashboard queries
// (1000+ creators × N links each — keeps queries fast)
// ─────────────────────────────────────────────
AffiliateLinkSchema.index({ creatorId: 1, createdAt: -1 });

module.exports =
  mongoose.models.AffiliateLink ||
  mongoose.model("AffiliateLink", AffiliateLinkSchema);

  
  