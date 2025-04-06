require("dotenv").config();
const clientId = process.env.APPLICATION_ID;

// These permissions include:
// - View Channels
// - Send Messages
// - Embed Links
// - Read Message History
// - Use External Emojis
// - Add Reactions
// plus application commands scope
const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=274877910080&scope=bot%20applications.commands`;

console.log("Use this link to invite your bot with all required permissions:");
console.log(inviteLink);
console.log(
  "\nMake sure to remove the bot from your server first, then re-add it using this link."
);
