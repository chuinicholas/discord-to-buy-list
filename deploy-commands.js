require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "src/commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
    console.log(`Loaded command: ${command.data.name}`);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands globally.`
    );

    // First, clear any existing commands
    console.log("Clearing existing commands...");
    await rest.put(Routes.applicationCommands(process.env.APPLICATION_ID), {
      body: [],
    });

    console.log("Waiting 2 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Then register the commands globally
    console.log("Registering commands globally...");
    const data = await rest.put(
      Routes.applicationCommands(process.env.APPLICATION_ID),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
    console.log("Commands should appear for all users within 5-30 minutes.");
  } catch (error) {
    console.error("Error deploying commands:", error);
  }
})();
