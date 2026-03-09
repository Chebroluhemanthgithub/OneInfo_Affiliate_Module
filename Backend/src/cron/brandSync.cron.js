const cron = require("node-cron");
const { exec } = require("child_process");
const path = require("path");

// Schedule brand sync once a day at 2:00 AM
cron.schedule("0 2 * * *", () => {
  console.log("Starting daily brand sync...");
  
  const scriptPath = path.join(__dirname, "../../scripts/sync-brands.js");
  
  exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Brand sync error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Brand sync stderr: ${stderr}`);
      return;
    }
    console.log(`Brand sync completed: ${stdout}`);
  });
});

console.log("Brand sync cron job scheduled (daily at 2 AM)");
