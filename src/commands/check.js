const { SlashCommandBuilder } = require("discord.js");
const {
  getChannelData,
  saveChannelData,
  getUserData,
  saveUserData,
} = require("../database/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("check")
    .setDescription("Toggle the completion status of an item")
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription("The item number to toggle")
        .setRequired(true)
        .setMinValue(1)
    )
    .addBooleanOption((option) =>
      option
        .setName("personal")
        .setDescription(
          "Check item in your personal list instead of channel list"
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    const itemNumber = interaction.options.getInteger("number");
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

      // Check if the item exists
      if (itemNumber > items.length || itemNumber < 1) {
        return interaction.reply({
          content: `Error: Item #${itemNumber} doesn't exist in the list. Use /list to see all items.`,
          ephemeral: true,
        });
      }

      // Get the item (array is 0-indexed, but user input is 1-indexed)
      const itemIndex = itemNumber - 1;
      const item = items[itemIndex];

      if (!item) {
        return interaction.reply({
          content: `Error: Item #${itemNumber} couldn't be found. Please use /list to see all items.`,
          ephemeral: true,
        });
      }

      // Toggle the completed status
      item.completed = !item.completed;

      // Update timestamp
      item.updatedAt = new Date().toISOString();

      // Save the updated list
      if (isPersonal) {
        await saveUserData(interaction.user.id, userData);
      } else {
        await saveChannelData(interaction.channelId, channelData);
      }

      // Respond with the updated status
      const status = item.completed ? "completed ✅" : "pending ⬜";
      const emoji = item.completed ? "🎉" : "📝";

      await interaction.reply({
        content: `${emoji} Marked item #${itemNumber} as ${status}:\n**${item.text}**`,
        ephemeral: isPersonal,
      });
    } catch (error) {
      console.error("Error in check command:", error);
      await interaction.reply({
        content: "There was an error updating the item status.",
        ephemeral: true,
      });
    }
  },
};
