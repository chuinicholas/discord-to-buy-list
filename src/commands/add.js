const { SlashCommandBuilder } = require("discord.js");
const {
  getChannelData,
  saveChannelData,
  getUserData,
  saveUserData,
} = require("../database/database");
const { createItem } = require("../utils/listHelpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add a new item to your list")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("The item to add to your list")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("personal")
        .setDescription("Add to your personal list instead of channel list")
        .setRequired(false)
    ),

  async execute(interaction) {
    const itemText = interaction.options.getString("item");
    const isPersonal = interaction.options.getBoolean("personal") || false;

    try {
      // Create the new item
      const newItem = createItem(itemText, interaction.user.id);

      // Add to personal or channel list
      if (isPersonal) {
        const userData = await getUserData(interaction.user.id);
        const listName = userData.settings.defaultList;

        userData.lists[listName].items.push(newItem);
        await saveUserData(interaction.user.id, userData);

        await interaction.reply({
          content: `Added to your personal list: **${itemText}**`,
          ephemeral: true,
        });
      } else {
        const channelData = await getChannelData(interaction.channelId);

        channelData.list.items.push(newItem);
        await saveChannelData(interaction.channelId, channelData);

        await interaction.reply({
          content: `Added to channel list: **${itemText}**`,
          ephemeral: false,
        });
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error adding your item.",
        ephemeral: true,
      });
    }
  },
};
