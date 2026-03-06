const { Queue } = require("bullmq");
const connection = require("../config/redis");

const orderQueue = new Queue("orderQueue", { connection });

module.exports = orderQueue;

