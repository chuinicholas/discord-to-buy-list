const moment = require("moment");
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

// Priority levels and their colors
const PRIORITIES = {
  HIGH: { value: "high", label: "High", color: 0xff5555, emoji: "🔴" },
  MEDIUM: { value: "medium", label: "Medium", color: 0xffaa00, emoji: "🟠" },
  LOW: { value: "low", label: "Low", color: 0x55ff55, emoji: "🟢" },
  NONE: { value: "none", label: "None", color: 0x0099ff, emoji: "⚪" },
};

// Categories with emojis
const CATEGORIES = [
  { value: "groceries", label: "Groceries", emoji: "🛒" },
  { value: "work", label: "Work", emoji: "💼" },
  { value: "personal", label: "Personal", emoji: "👤" },
  { value: "health", label: "Health", emoji: "❤️" },
  { value: "home", label: "Home", emoji: "🏠" },
  { value: "other", label: "Other", emoji: "📋" },
];

// Create a new item
function createItem(text, userId) {
  return {
    id: Date.now().toString(),
    text,
    completed: false,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    updatedAt: new Date().toISOString(),
  };
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return "No due date";
  return moment(dateString).format("MMM D, YYYY");
}

// Format relative time for display
function formatRelativeTime(dateString) {
  return moment(dateString).fromNow();
}

// Create priority select menu
function createPriorityMenu(customId) {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("Set priority level")
    .addOptions(
      Object.values(PRIORITIES).map((priority) => ({
        label: priority.label,
        value: priority.value,
        emoji: priority.emoji,
        description: `Set to ${priority.label} priority`,
      }))
    );
}

// Create category select menu
function createCategoryMenu(customId) {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("Set category")
    .addOptions(
      CATEGORIES.map((category) => ({
        label: category.label,
        value: category.value,
        emoji: category.emoji,
        description: `Set to ${category.label} category`,
      }))
    );
}

// Create an embed for list display
function createListEmbed(
  items,
  title = "To-Buy List",
  startIndex = 0,
  itemsPerPage = 10
) {
  // Handle pagination
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentPage = Math.floor(startIndex / itemsPerPage) + 1;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageItems = items.slice(startIndex, endIndex);

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x0099ff)
    .setFooter({
      text: `Page ${currentPage}/${
        totalPages || 1
      } • Total items: ${totalItems}`,
    })
    .setTimestamp();

  if (pageItems.length === 0) {
    embed.setDescription("The list is empty. Add items with `/add` command.");
    return { embed, totalPages, currentPage };
  }

  // Format items for display
  const description = pageItems
    .map((item, index) => {
      const itemNumber = startIndex + index + 1;
      const status = item.completed ? "✅" : "⬜";

      let itemLine = `${itemNumber}. ${status} **${item.text}**`;

      return itemLine;
    })
    .join("\n");

  embed.setDescription(description);

  return { embed, totalPages, currentPage };
}

// Create navigation buttons for pagination
function createNavigationButtons(currentPage, totalPages, baseCustomId) {
  const row = new ActionRowBuilder();

  // First page button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${baseCustomId}:first`)
      .setLabel("◀◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 1)
  );

  // Previous page button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${baseCustomId}:prev`)
      .setLabel("◀")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage <= 1)
  );

  // Page indicator (non-interactive)
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${baseCustomId}:page`)
      .setLabel(`${currentPage}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );

  // Next page button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${baseCustomId}:next`)
      .setLabel("▶")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage >= totalPages)
  );

  // Last page button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${baseCustomId}:last`)
      .setLabel("▶▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages)
  );

  return row;
}

// Create action buttons for list items
function createListActionButtons(baseCustomId) {
  const row = new ActionRowBuilder();

  // Add item button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${baseCustomId}:add`)
      .setLabel("Add")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Success)
  );

  // Refresh list button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${baseCustomId}:refresh`)
      .setLabel("Refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary)
  );

  // Clear completed button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${baseCustomId}:clear_completed`)
      .setLabel("Clear Completed")
      .setEmoji("🧹")
      .setStyle(ButtonStyle.Danger)
  );

  return row;
}

// Create select menu for item selection
function createItemSelectMenu(
  items,
  customId,
  startIndex = 0,
  itemsPerPage = 10
) {
  try {
    // Ensure inputs are valid
    if (!Array.isArray(items)) {
      console.error("Items is not an array:", items);
      items = [];
    }

    if (typeof customId !== "string" || !customId) {
      console.error("Invalid customId for item select menu:", customId);
      customId = "list_select_fallback";
    }

    startIndex = Math.max(0, Number(startIndex) || 0);
    itemsPerPage = Math.min(25, Math.max(1, Number(itemsPerPage) || 10));

    const pageItems = items.slice(
      startIndex,
      Math.min(startIndex + itemsPerPage, items.length)
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder("Select an item to manage")
      .setMinValues(1)
      .setMaxValues(1);

    // Add options for each item
    try {
      pageItems.forEach((item, index) => {
        try {
          const itemNumber = startIndex + index + 1;
          const status = item.completed ? "✅" : "⬜";
          const priorityEmoji =
            Object.values(PRIORITIES).find(
              (p) => p.value === (item.priority || "none")
            )?.emoji || "⚪";

          // Ensure text is a string and handle potential undefined
          const itemText = item.text ? String(item.text) : "(No text)";

          // Truncate text if too long
          const truncatedText =
            itemText.length > 80 ? itemText.substring(0, 77) + "..." : itemText;

          selectMenu.addOptions({
            label: `Item #${itemNumber}: ${truncatedText.substring(0, 25)}${
              truncatedText.length > 25 ? "..." : ""
            }`,
            description: truncatedText.substring(0, 50),
            value: item.id || String(startIndex + index), // Fallback to index if id is missing
            emoji: status,
          });
        } catch (error) {
          console.error("Error adding item to select menu:", error, item);
          // Skip this item if it causes an error
        }
      });
    } catch (forEachError) {
      console.error("Error iterating items:", forEachError);
    }

    // If no items were added to the options, add a placeholder option
    if (pageItems.length === 0 || selectMenu.options.length === 0) {
      selectMenu
        .addOptions({
          label: "No items in list",
          description: "Add items using the Add button or /add command",
          value: "none",
        })
        .setDisabled(true);
    }

    return new ActionRowBuilder().addComponents(selectMenu);
  } catch (error) {
    console.error("Error creating item select menu:", error);
    // Return a fallback menu as a safety net
    const fallbackMenu = new StringSelectMenuBuilder()
      .setCustomId(customId || "list_select_error")
      .setPlaceholder("No items available")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions({
        label: "No items available",
        description: "There was an error loading the items",
        value: "none",
      })
      .setDisabled(true);

    return new ActionRowBuilder().addComponents(fallbackMenu);
  }
}

// Create item action buttons
function createItemActionButtons(itemId, baseCustomId) {
  try {
    // Validate inputs to prevent errors
    if (!itemId || !baseCustomId) {
      console.error(
        "Missing required parameters for createItemActionButtons:",
        { itemId, baseCustomId }
      );
      itemId = itemId || "undefined";
      baseCustomId = baseCustomId || "item_action";
    }

    // Ensure itemId is a string
    const safeItemId = String(itemId);
    console.log(
      `Creating action buttons for item ID: ${safeItemId}, baseCustomId: ${baseCustomId}`
    );

    const row = new ActionRowBuilder();

    // Toggle completion status
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${baseCustomId}:toggle:${safeItemId}`)
        .setLabel("Toggle Complete")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Primary)
    );

    // Edit item
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${baseCustomId}:edit:${safeItemId}`)
        .setLabel("Edit")
        .setEmoji("✏️")
        .setStyle(ButtonStyle.Secondary)
    );

    // Delete item
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${baseCustomId}:delete:${safeItemId}`)
        .setLabel("Delete")
        .setEmoji("🗑️")
        .setStyle(ButtonStyle.Danger)
    );

    return row;
  } catch (error) {
    console.error("Error creating item action buttons:", error);

    // Create a fallback button row with a disabled button
    const fallbackRow = new ActionRowBuilder();
    fallbackRow.addComponents(
      new ButtonBuilder()
        .setCustomId("item_action_error")
        .setLabel("Error Loading Actions")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    return fallbackRow;
  }
}

module.exports = {
  PRIORITIES,
  CATEGORIES,
  createItem,
  formatDate,
  formatRelativeTime,
  createPriorityMenu,
  createCategoryMenu,
  createListEmbed,
  createNavigationButtons,
  createListActionButtons,
  createItemSelectMenu,
  createItemActionButtons,
};
