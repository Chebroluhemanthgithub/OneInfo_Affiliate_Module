const AffiliateLink = require("../links/affiliateLink.model");
const LinkStats = require("../models/linkStats.model");
const CreatorStats = require("../models/creatorStats.model");
const Creator = require("../creators/creator.model");
const Order = require("../orders/order.model");
const fs = require("fs");
const path = require("path");
const logFile = path.resolve(__dirname, "../../tmp/gql-debug.log");

// Ensure tmp exists
const tmpDir = path.dirname(logFile);
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

module.exports = {
  Query: {
    /**
     * me: returns { name, stats, links(limit) }
     * Matches Dashboard.jsx GraphQL query exactly
     */
    me: async (_, __, { creatorId }) => {
      fs.appendFileSync(logFile, `GraphQL me query: creatorId=${creatorId}\n`);
      if (!creatorId) throw new Error("Unauthorized");

      // Fetch creator name
      const creator = await Creator.findById(creatorId).lean();
      const name = creator ? creator.name : "Creator";

      // Fetch pre-aggregated stats (O(1))
      const statsDoc = await CreatorStats.findOne({ creatorId }).lean();

      const stats = {
        totalClicks:         statsDoc?.totalClicks          || 0,
        lifetimeCommission:  statsDoc?.lifetimeCommission   || 0,
        pendingCommission:   statsDoc?.pendingCommission     || 0,
        approvedCommission:  statsDoc?.approvedCommission    || 0,
        paidCommission:      statsDoc?.paidCommission        || 0,
        totalOrders:         statsDoc?.lifetimeOrders        || 0,
      };

      return { name, stats, creatorId };
    },

    /**
     * me.links resolver handles limit arg
     */

    /**
     * myOrders: paginated orders for creator
     */
    myOrders: async (_, { page, limit }, { creatorId }) => {
      if (!creatorId) throw new Error("Unauthorized");

      const validPage  = Math.max(1, page);
      const validLimit = Math.min(Math.max(1, limit), 100);
      const skip = (validPage - 1) * validLimit;

      const [orders, totalCount] = await Promise.all([
        Order.find({ creatorId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(validLimit)
          .lean(),
        Order.countDocuments({ creatorId }),
      ]);

      return {
        orders: orders.map((o) => ({
          orderId:                  o.orderId,
          productName:              o.productName,
          orderValue:               o.orderValue,
          creatorCommissionAmount:  o.creatorCommissionAmount,
          status:                   o.status,
          platform:                 o.platform,
          createdAt:                o.createdAt ? o.createdAt.toISOString() : null,
        })),
        totalCount,
        hasMore: skip + orders.length < totalCount,
      };
    },
    // Aggregation: total commission grouped by network
    totalCommissionByNetwork: async () => {
      const pipeline = [
        {
          $group: {
            _id: "$networkId",
            creatorEarnings: { $sum: "$creatorCommissionAmount" },
            brandPayout: { $sum: "$brandCommissionAmount" },
            platformRevenue: { $sum: "$platformCommissionAmount" },
          },
        },
        { $sort: { platformRevenue: -1 } },
      ];

      const results = await Order.aggregate(pipeline);
      return results.map((r) => ({
        networkId: r._id,
        creatorEarnings: r.creatorEarnings || 0,
        brandPayout: r.brandPayout || 0,
        platformRevenue: r.platformRevenue || 0,
      }));
    },

    // Aggregation: total commission grouped by brand
    totalCommissionByBrand: async () => {
      const pipeline = [
        {
          $group: {
            _id: "$brandId",
            creatorEarnings: { $sum: "$creatorCommissionAmount" },
            brandPayout: { $sum: "$brandCommissionAmount" },
            platformRevenue: { $sum: "$platformCommissionAmount" },
          },
        },
        { $sort: { brandPayout: -1 } },
      ];

      const results = await Order.aggregate(pipeline);
      return results.map((r) => ({
        brandId: r._id,
        creatorEarnings: r.creatorEarnings || 0,
        brandPayout: r.brandPayout || 0,
        platformRevenue: r.platformRevenue || 0,
      }));
    },

    // Aggregation: creator earnings per brand
    creatorEarningsByBrand: async (_, { creatorId }) => {
      const pipeline = [
        { $match: { creatorId } },
        {
          $group: {
            _id: "$brandId",
            creatorEarnings: { $sum: "$creatorCommissionAmount" },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { creatorEarnings: -1 } },
      ];

      const results = await Order.aggregate(pipeline);
      return results.map((r) => ({
        brandId: r._id,
        creatorEarnings: r.creatorEarnings || 0,
        totalOrders: r.totalOrders || 0,
      }));
    },
  },

  Creator: {
    /**
     * links: fetch links for the creator with limit and click stats
     */
    links: async (parent, { limit }, context) => {
      // Robustly get creatorId (either from context OR passed from parent if we update 'me')
      const creatorId = context.creatorId || parent.creatorId;
      
      fs.appendFileSync(logFile, `GraphQL Creator.links: creatorId=${creatorId} limit=${limit} date=${new Date().toISOString()}\n`);
      if (!creatorId) return [];

      // Default limit to 100 for better visibility as requested
      const finalLimit = limit || 100;

      // Fetch links sorted by newest first
      const links = await AffiliateLink.find({ creatorId })
        .sort({ createdAt: -1 })
        .limit(finalLimit)
        .lean();

      if (!links.length) return [];

      // Fetch click stats for these links
      const linkStats = await LinkStats.find({
        shortCode: { $in: links.map((l) => l.shortCode) },
      }).lean();

      const clickMap = {};
      linkStats.forEach((ls) => (clickMap[ls.shortCode] = ls.totalClicks));

      const baseUrl = process.env.BASE_URL || "http://localhost:4000";

      return links.map((link) => ({
        shortCode:    link.shortCode,
        originalUrl:  link.originalUrl,
        publicUrl:    link.publicUrl || `${baseUrl}/share/${link.shortCode}`,
        platform:     link.platform,
        productTitle: link.productTitle || "",
        productImage: link.productImage || "",
        clicks:       clickMap[link.shortCode] || 0,
        createdAt:    link.createdAt ? link.createdAt.toISOString() : null,
      }));
    },
  },
};
