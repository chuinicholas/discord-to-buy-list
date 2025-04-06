const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  getChannelData,
  saveChannelData,
  getUserData,
  saveUserData,
} = require("../database/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear items from your list")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("What items to clear")
        .setRequired(true)
        .addChoices(
          { name: "Completed items only", value: "completed" },
          { name: "All items (complete reset)", value: "all" }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName("personal")
        .setDescription(
          "Clear items from your personal list instead of channel list"
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    const clearType = interaction.options.getString("type");
    const isPersonal = interaction.options.getBoolean("personal") || false;

    try {
      // Get the appropriate list
      let items = [];
      let userData, channelData, listName;

      if (isPersonal) {
        userData = await getUserData(interaction.user.id);
        listName = userData.settings.defaultList;
        items = userData.lists[listName].items;
      } else {
        channelData = await getChannelData(interaction.channelId);
        items = channelData.list.items;
      }

      // Create confirmation buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(
            `clear_confirm:${clearType}:${isPersonal ? "personal" : "channel"}`
          )
          .setLabel("Confirm")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("clear_cancel")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      // Calculate what will be cleared
      let message;
      if (clearType === "all") {
        const count = items.length;
        message = `Are you sure you want to clear all ${count} items from the ${
          isPersonal ? "personal" : "channel"
        } list? This cannot be undone.`;
      } else {
        const completedCount = items.filter((item) => item.completed).length;
        message = `Are you sure you want to clear ${completedCount} completed items from the ${
          isPersonal ? "personal" : "channel"
        } list? This cannot be undone.`;
      }

      // Ask for confirmation
      await interaction.reply({
        content: message,
        components: [row],
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error processing your request.",
        ephemeral: true,
      });
    }
  },
};
