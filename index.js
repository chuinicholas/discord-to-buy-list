require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");
const {
  getChannelData,
  saveChannelData,
  getUserData,
  saveUserData,
} = require("./src/database/database");

// Add these at the top of your index.js file, after requires
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully.");
  if (client && client.destroy) {
    client.destroy();
  }
  process.exit(0);
});

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, "src/commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  // Set a new item in the Collection with the key as the command name and the value as the command module
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

// Load events
const eventsPath = path.join(__dirname, "src/events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Scheduled task: Check for overdue items and send reminders
// Run every day at 9:00 AM
cron.schedule("0 9 * * *", async () => {
  try {
    console.log("Running scheduled task: Checking for overdue items...");

    // Get all channels from cache
    client.channels.cache.forEach(async (channel) => {
      // Only check text channels
      if (!channel.isTextBased() || channel.isDMBased()) return;

      try {
        // Get channel data
        const channelData = await getChannelData(channel.id);
        const items = channelData.list.items;

        // Find items that are due today or overdue
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueItems = items.filter((item) => {
          if (!item.dueDate || item.completed) return false;

          const dueDate = new Date(item.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          return dueDate <= today;
        });

        // Send reminder if there are overdue items
        if (overdueItems.length > 0) {
          const dueTodayItems = overdueItems.filter((item) => {
            const dueDate = new Date(item.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          });

          const pastDueItems = overdueItems.filter((item) => {
            const dueDate = new Date(item.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() < today.getTime();
          });

          let message = "📅 **To-Do List Reminder**\n\n";

          if (dueTodayItems.length > 0) {
            message += "**Items due today:**\n";
            dueTodayItems.forEach((item) => {
              message += `- ${item.text}\n`;
            });
            message += "\n";
          }

          if (pastDueItems.length > 0) {
            message += "**Overdue items:**\n";
            pastDueItems.forEach((item) => {
              const dueDate = new Date(item.dueDate).toLocaleDateString();
              message += `- ${item.text} (Due: ${dueDate})\n`;
            });
          }

          message += "\nUse `/list` to see all items and manage them.";

          await channel.send(message);
        }
      } catch (error) {
        console.error(`Error checking channel ${channel.id}:`, error);
      }
    });
  } catch (error) {
    console.error("Error in scheduled task:", error);
  }
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

// Add this near the end of your file, after client login
console.log("Bot is starting up...");

// Also export the client for potential use in the API endpoint
module.exports = { client };
