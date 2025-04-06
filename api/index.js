// This file serves as an API endpoint for Vercel
const { spawn } = require("child_process");
const path = require("path");

let botProcess = null;

// Function to start the bot
function startBot() {
  if (botProcess) return;

  const botPath = path.join(__dirname, "../index.js");
  console.log("Starting bot from: " + botPath);

  botProcess = spawn("node", [botPath], {
    stdio: "inherit",
  });

  botProcess.on("error", (error) => {
    console.error("Failed to start bot process:", error);
    botProcess = null;
  });

  botProcess.on("close", (code) => {
    console.log(`Bot process exited with code ${code}`);
    botProcess = null;
  });
}

// Attempt to start the bot
startBot();

// API endpoint handler
module.exports = (req, res) => {
  // Try to start the bot if it's not running
  if (!botProcess) {
    startBot();
  }

  res.status(200).json({
    status: "online",
    message: "Discord bot is running",
    timestamp: new Date().toISOString(),
  });
};
