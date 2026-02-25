const { createClient } = require("redis");

const redisConnection = createClient({
  url: "redis://127.0.0.1:6379",
});

redisConnection.on("connect", () => {
  console.log("✅ Redis connected");
});

redisConnection.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

redisConnection.connect();

module.exports = redisConnection;
