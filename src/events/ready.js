const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // Set bot's status
    client.user.setPresence({
      activities: [
        {
          name: "/help for commands",
          type: ActivityType.Playing,
        },
      ],
      status: "online",
    });

    console.log(`Bot is serving ${client.guilds.cache.size} servers`);
  },
};
