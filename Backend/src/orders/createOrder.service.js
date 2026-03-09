const CommissionRule = require("../commission/commissionRule.model");
const Order = require("./order.model");
const AffiliateLink = require("../links/affiliateLink.model");

/**
 * Creates or updates an order based on platform data.
 * Standarized lifecycle: pending, approved, declined, paid
 */
async function createOrder(data) {
  // 🔹 Step 1: Idempotency & Status Transitions
  const existingOrder = await Order.findOne({ orderId: data.orderId });
  if (existingOrder) {
  
    const oldStatus = existingOrder.status;
    if (data.status && existingOrder.status !== data.status) {
      console.log(`Updating order ${data.orderId} status: ${existingOrder.status} -> ${data.status}`);
      existingOrder.status = data.status;
      await existingOrder.save();
      return { order: existingOrder, isNew: false, oldStatus };
    }
    return { order: existingOrder, isNew: false, oldStatus };
  }

  // 🔹 Step 2: Extract Tracking Data (subId/shortCode)
  // Higher priority: explicitly provided creatorId/shortCode
  let creatorId = data.creatorId;
  let shortCode = data.shortCode;

  // Fallback: Resolve from subid/subid1 if not provided
  const networkSubId = data.subid1 || data.subId || data.subid;
  
  if (networkSubId && !shortCode) {
    const link = await AffiliateLink.findOne({ shortCode: networkSubId.toString() });
    if (link) {
      creatorId = link.creatorId;
      shortCode = link.shortCode;
    } else {
      console.warn("No affiliate link found for network subId:", networkSubId);
      // We don't return null yet; we might still have data.creatorId
    }
  }

  // 🔹 Step 3: Fetch commission rules
  const rule = await CommissionRule.findOne({
    platform: data.platform,
    category: data.category
  });

  if (!rule) {
    throw new Error(`Commission rule not found for ${data.platform}/${data.category}`);
  }

  // 🔹 Step 4: Calculate commissions
  let brandCommissionAmount, creatorCommissionAmount, platformCommissionAmount;
  const creatorRate = rule.creatorCommissionRate;

  if (data.platform === "admitad") {
    // Admitad gives literal payout, we split it based on creatorCommissionRate (%)
    brandCommissionAmount = data.orderValue;
    creatorCommissionAmount = brandCommissionAmount * (creatorRate / 100);
    platformCommissionAmount = brandCommissionAmount - creatorCommissionAmount;
  } else {
    // Generic Percentage Logic (Flipkart/Amazon/etc)
    brandCommissionAmount = (data.orderValue * rule.brandCommissionRate) / 100;
    creatorCommissionAmount = (data.orderValue * rule.creatorCommissionRate) / 100;
    platformCommissionAmount = brandCommissionAmount - creatorCommissionAmount;
  }

  // 🔹 Step 5: Save order
  const order = await Order.create({
    shortCode: shortCode || data.shortCode,
    creatorId: creatorId || data.creatorId,
    orderId: data.orderId,
    productName: data.productName || "Admitad Product",
    orderValue: data.rawAmount || data.orderValue,

    // Network / Brand attribution (optional)
    brandId: data.brandId || (shortCode ? (await AffiliateLink.findOne({ shortCode })).brandId : undefined),
    networkId: data.networkId || (shortCode ? (await AffiliateLink.findOne({ shortCode })).networkId : undefined),
    networkTransactionId: data.networkTransactionId || data.networkTxId || null,

    brandCommissionRate: data.platform === "admitad" ? 0 : rule.brandCommissionRate,
    brandCommissionAmount,

    creatorCommissionRate: creatorRate,
    creatorCommissionAmount,

    platformCommissionAmount,

    platform: data.platform,
    category: data.category,
    status: data.status || "pending" 
  });

  return { order, isNew: true };
}

module.exports = { createOrder };
