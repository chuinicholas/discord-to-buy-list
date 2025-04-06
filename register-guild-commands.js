require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Ask for the server/guild ID
if (process.argv.length < 3) {
  console.error("Please provide your server/guild ID as an argument!");
  console.error("Usage: node register-guild-commands.js YOUR_GUILD_ID");
  console.error(
    "To clear commands: node register-guild-commands.js YOUR_GUILD_ID --clear"
  );
  process.exit(1);
}

const guildId = process.argv[2];
const shouldClear = process.argv.includes("--clear");

const commands = [];
const commandsPath = path.join(__dirname, "src/commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

// Only load commands if we're not clearing
if (!shouldClear) {
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
      console.log(`Loaded command for guild: ${command.data.name}`);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    if (shouldClear) {
      console.log(`Clearing all commands for guild ${guildId}...`);

      // The put method with empty array clears all commands
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.APPLICATION_ID, guildId),
        { body: [] }
      );

      console.log(`Successfully cleared all commands for guild ${guildId}.`);
    } else {
      console.log(
        `Started refreshing ${commands.length} application (/) commands for guild ${guildId}.`
      );

      // The put method is used to fully refresh all commands in the guild
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.APPLICATION_ID, guildId),
        { body: commands }
      );

      console.log(
        `Successfully reloaded ${data.length} application (/) commands for guild ${guildId}.`
      );
      console.log(
        "These commands should be available immediately in your server."
      );
      console.log(
        "\nIf members still cannot see commands, check these issues:"
      );
      console.log(
        "1. Make sure bot has permission to create slash commands in your server"
      );
      console.log("2. Verify members have permission to use slash commands");
      console.log("3. Try having members restart their Discord client");
    }
  } catch (error) {
    console.error("Error registering guild commands:", error);
  }
})();
