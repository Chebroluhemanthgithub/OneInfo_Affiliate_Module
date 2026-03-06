require("dotenv").config();
const IORedis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const isCloudRedis = redisUrl.includes("upstash.io") || redisUrl.startsWith("rediss://");

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: isCloudRedis ? { rejectUnauthorized: false } : undefined,
});

connection.on("error", (err) => {
  console.error("Redis Connection Error:", err);
});

module.exports = connection;
