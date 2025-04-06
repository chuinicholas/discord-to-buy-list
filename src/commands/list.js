const { SlashCommandBuilder } = require("discord.js");
const { getChannelData, getUserData } = require("../database/database");
const {
  createListEmbed,
  createNavigationButtons,
  createListActionButtons,
  createItemSelectMenu,
} = require("../utils/listHelpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("View your to-do/to-buy list")
    .addBooleanOption((option) =>
      option
        .setName("personal")
        .setDescription("View your personal list instead of channel list")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Filter items by category")
        .setRequired(false)
        .addChoices(
          { name: "All Categories", value: "all" },
          { name: "🛒 Groceries", value: "groceries" },
          { name: "💼 Work", value: "work" },
          { name: "👤 Personal", value: "personal" },
          { name: "❤️ Health", value: "health" },
          { name: "🏠 Home", value: "home" },
          { name: "📋 Other", value: "other" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("show")
        .setDescription("Filter items by completion status")
        .setRequired(false)
        .addChoices(
          { name: "All Items", value: "all" },
          { name: "Completed Items", value: "completed" },
          { name: "Pending Items", value: "pending" }
        )
    ),

  async execute(interaction) {
    const isPersonal = interaction.options.getBoolean("personal") || false;
    const categoryFilter = interaction.options.getString("category") || "all";
    const statusFilter = interaction.options.getString("show") || "all";

    try {
      // Get the items from the appropriate list
      let items = [];
      let listTitle = "To-Buy List";

      if (isPersonal) {
        const userData = await getUserData(interaction.user.id);
        const listName = userData.settings.defaultList;
        items = userData.lists[listName].items;
        listTitle = `${interaction.user.username}'s Personal List`;
      } else {
        const channelData = await getChannelData(interaction.channelId);
        items = channelData.list.items;
        listTitle = `#${interaction.channel.name} List`;
      }

      // Apply filters
      let filteredItems = [...items];

      // Category filter
      if (categoryFilter !== "all") {
        filteredItems = filteredItems.filter(
          (item) => item.category === categoryFilter
        );
      }

      // Status filter
      if (statusFilter === "completed") {
        filteredItems = filteredItems.filter((item) => item.completed);
      } else if (statusFilter === "pending") {
        filteredItems = filteredItems.filter((item) => !item.completed);
      }

      // Sort by priority and completion status
      filteredItems.sort((a, b) => {
        // First sort by completion (incomplete first)
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }

        // Then by priority (high first)
        const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }

        // Then by due date if present (earliest first)
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        } else if (a.dueDate) {
          return -1;
        } else if (b.dueDate) {
          return 1;
        }

        // Finally by creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Apply pagination and create the embed
      const { embed, totalPages, currentPage } = createListEmbed(
        filteredItems,
        listTitle
      );

      // Add filters to the footer if any are active
      if (categoryFilter !== "all" || statusFilter !== "all") {
        const filters = [];
        if (categoryFilter !== "all")
          filters.push(`Category: ${categoryFilter}`);
        if (statusFilter !== "all") filters.push(`Status: ${statusFilter}`);

        const currentFooter = embed.data.footer.text;
        embed.setFooter({
          text: `${currentFooter} | Filters: ${filters.join(", ")}`,
        });
      }

      // Create components
      const components = [];

      // Navigation buttons (if we have more than one page)
      if (totalPages > 1) {
        components.push(
          createNavigationButtons(
            currentPage,
            totalPages,
            `list_nav${isPersonal ? "_personal" : ""}`
          )
        );
      }

      // Item selection menu
      if (filteredItems.length > 0) {
        components.push(
          createItemSelectMenu(
            filteredItems,
            `list_select${isPersonal ? "_personal" : ""}`,
            0
          )
        );
      }

      // Action buttons
      components.push(
        createListActionButtons(`list_action${isPersonal ? "_personal" : ""}`)
      );

      // Send the response
      await interaction.reply({
        embeds: [embed],
        components,
        ephemeral: isPersonal,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error displaying your list.",
        ephemeral: true,
      });
    }
  },
};
