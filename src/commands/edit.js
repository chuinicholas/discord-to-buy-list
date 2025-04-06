const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const {
  getChannelData,
  saveChannelData,
  getUserData,
  saveUserData,
} = require("../database/database");
const {
  createPriorityMenu,
  createCategoryMenu,
} = require("../utils/listHelpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("edit")
    .setDescription("Edit an item in your list")
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription("The item number to edit")
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("New text for the item")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("due_date")
        .setDescription(
          'New due date in YYYY-MM-DD format (or "none" to remove)'
        )
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("personal")
        .setDescription("Edit from your personal list instead of channel list")
        .setRequired(false)
    ),

  async execute(interaction) {
    const itemNumber = interaction.options.getInteger("number");
    const newText = interaction.options.getString("text");
    const newDueDate = interaction.options.getString("due_date");
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

      // Check if the user owns the item or has permission
      if (item.createdBy !== interaction.user.id) {
        // Allow server admins to edit any item in channel lists
        const hasPermission =
          !isPersonal && interaction.member.permissions.has("ADMINISTRATOR");

        if (!hasPermission) {
          return interaction.reply({
            content: "You can only edit items that you added.",
            ephemeral: true,
          });
        }
      }

      // Update item properties
      let changes = [];

      if (newText) {
        item.text = newText;
        changes.push("text");
      }

      if (newDueDate) {
        if (newDueDate.toLowerCase() === "none") {
          item.dueDate = null;
          changes.push("due date (removed)");
        } else {
          const dueDate = new Date(newDueDate);
          if (isNaN(dueDate.getTime())) {
            return interaction.reply({
              content: "Invalid date format. Please use YYYY-MM-DD format.",
              ephemeral: true,
            });
          }
          item.dueDate = dueDate.toISOString();
          changes.push("due date");
        }
      }

      // Update timestamp
      item.updatedAt = new Date().toISOString();

      // If no changes were specified, prompt the user to use the modal
      if (changes.length === 0) {
        // Create a modal for editing
        const modal = new ModalBuilder()
          .setCustomId(
            `edit_modal:${isPersonal ? "personal:" : ""}${itemIndex}`
          )
          .setTitle(`Edit Item #${itemNumber}`);

        // Add text input field
        const textInput = new TextInputBuilder()
          .setCustomId("text")
          .setLabel("Edit item text")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(item.text)
          .setRequired(true)
          .setMaxLength(100);

        // Add due date input field
        const dueDateInput = new TextInputBuilder()
          .setCustomId("due_date")
          .setLabel("Due date (YYYY-MM-DD or leave empty for none)")
          .setStyle(TextInputStyle.Short)
          .setValue(item.dueDate ? item.dueDate.split("T")[0] : "")
          .setRequired(false)
          .setPlaceholder("e.g. 2023-12-31");

        // Add components to modal
        modal.addComponents(
          new ActionRowBuilder().addComponents(textInput),
          new ActionRowBuilder().addComponents(dueDateInput)
        );

        // Show the modal
        await interaction.showModal(modal);
        return;
      }

      // Save the updated list
      if (isPersonal) {
        await saveUserData(interaction.user.id, userData);
      } else {
        await saveChannelData(interaction.channelId, channelData);
      }

      // Respond with the updated item
      await interaction.reply({
        content: `Updated item #${itemNumber}: **${
          item.text
        }**\nChanged: ${changes.join(", ")}`,
        ephemeral: isPersonal,
      });

      // If not using a modal, we can also offer priority and category selects
      if (!isPersonal && changes.length > 0) {
        const components = [
          new ActionRowBuilder().addComponents(
            createPriorityMenu(`edit_priority:${item.id}`)
          ),
          new ActionRowBuilder().addComponents(
            createCategoryMenu(`edit_category:${item.id}`)
          ),
        ];

        await interaction.followUp({
          content: "You can also update the priority or category:",
          components,
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error editing your item.",
        ephemeral: true,
      });
    }
  },
};
