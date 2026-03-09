const cron = require("node-cron");
const cuelinksService = require("../services/affiliate/cuelinks.service");
const orderQueue = require("../queue/order.queue");
const SyncState = require("../models/syncState.model");
const Brand = require("../brands/brand.model");

cron.schedule("*/30 * * * *", async () => {
  console.log("Running Cuelinks sync...");

  try {
    let state = await SyncState.findOne({ platform: "cuelinks" });
    let dateStart;

    if (!state) {
      dateStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    } else {
      const ONE_HOUR = 60 * 60 * 1000;
      const safeStartTime = new Date(state.lastSync.getTime() - ONE_HOUR);
      dateStart = safeStartTime.toISOString();
    }

    const dateEnd = new Date().toISOString();

    const actions = await cuelinksService.fetchActions(dateStart, dateEnd);

    console.log(`Fetched ${actions.length} transactions from Cuelinks since ${dateStart}.`);

    if (actions.length > 0) {
      for (const action of actions) {
        // Attempt to discover brand by campaign id (cid or campaign_id)
        let brandId = null;
        const cid = action.cid || action.campaign_id || action.camp_id || action.campaign;
        if (cid) {
          const brand = await Brand.findOne({ 
            networkCampaignId: Number(cid), 
            networkId: 'cuelinks' 
          }).lean();
          if (brand) brandId = brand._id;
        }

        // Prepare payload for order creation queue
        const payload = {
          subId: action.subid1 || action.sub_id1 || action.subid || action.sub_id || null,
          orderId: action.order_id || action.id || action.transaction_id || action.transactionId,
          orderValue: action.payment || action.commission || null,
          rawAmount: action.price || action.amount || null,
          status: action.status || action.state || "pending",
          platform: "cuelinks",
          category: action.category || "general",
          brandId: brandId,
          networkTransactionId: action.transaction_id || action.transactionId || action.id || null,
        };

        await orderQueue.add("createOrder", payload, {
          attempts: 3,
          backoff: 5000,
          removeOnComplete: true,
        });
      }

      // Update sync state after processing
      await SyncState.updateOne(
        { platform: "cuelinks" },
        { lastSync: new Date() },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error("Cuelinks Cron Error:", err.message);
  }
});

console.log("Cuelinks cron job scheduled (every 30 minutes)");
