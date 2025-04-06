require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log("\nServers this bot is in:");
  console.log("-------------------------");

  client.guilds.cache.forEach((guild) => {
    console.log(`Server Name: ${guild.name}`);
    console.log(`Server ID: ${guild.id}`);
    console.log("-------------------------");
  });

  console.log("\nUse this ID with the register-guild-commands.js script:");
  console.log("node register-guild-commands.js YOUR_SERVER_ID_HERE");

  client.destroy(); // Disconnect after showing the info
});

client.login(process.env.DISCORD_TOKEN);
