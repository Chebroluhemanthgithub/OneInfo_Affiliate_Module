const { Queue } = require("bullmq");

const payoutQueue = new Queue("payoutQueue", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
});

module.exports = payoutQueue;
