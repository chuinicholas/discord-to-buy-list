const { Events, InteractionType } = require("discord.js");
const {
  getChannelData,
  saveChannelData,
  getUserData,
  saveUserData,
} = require("../database/database");
const {
  PRIORITIES,
  CATEGORIES,
  createListEmbed,
  createNavigationButtons,
  createListActionButtons,
  createItemSelectMenu,
  createItemActionButtons,
  createPriorityMenu,
  createCategoryMenu,
  createItem,
} = require("../utils/listHelpers");
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      // Handle different types of interactions
      if (interaction.isChatInputCommand()) {
        // Handle slash commands
        const command = interaction.client.commands.get(
          interaction.commandName
        );

        if (!command) {
          console.error(
            `No command matching ${interaction.commandName} was found.`
          );
          return;
        }

        try {
          await command.execute(interaction);
        } catch (error) {
          console.error(error);
          await interaction.reply({
            content: "There was an error executing this command!",
            ephemeral: true,
          });
        }
      } else if (interaction.isButton()) {
        // Handle button interactions
        await handleButtonInteraction(interaction);
      } else if (interaction.isStringSelectMenu()) {
        // Handle select menu interactions
        await handleSelectMenuInteraction(interaction);
      } else if (interaction.type === InteractionType.ModalSubmit) {
        // Handle modal submissions
        await handleModalSubmit(interaction);
      }
    } catch (error) {
      console.error("Error handling interaction:", error);
    }
  },
};

// Handle button interactions
async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;

  // Handle list navigation buttons (pagination)
  if (customId.startsWith("list_nav")) {
    const isPersonal = customId.includes("_personal");
    const action = customId.split(":")[1]; // first, prev, next, last

    // Get the appropriate list
    let items = [];
    let listTitle;

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

    // Get current page from the button label
    const pageInfo = interaction.message.components[0].components.find((c) =>
      c.data.custom_id.includes(":page")
    ).data.label;
    const [currentPage, totalPages] = pageInfo.split("/").map(Number);

    // Calculate the new start index based on the action
    const itemsPerPage = 10;
    let newStartIndex;

    switch (action) {
      case "first":
        newStartIndex = 0;
        break;
      case "prev":
        newStartIndex = Math.max(0, (currentPage - 2) * itemsPerPage);
        break;
      case "next":
        newStartIndex = currentPage * itemsPerPage;
        break;
      case "last":
        newStartIndex = (totalPages - 1) * itemsPerPage;
        break;
      default:
        newStartIndex = 0;
    }

    // Create new embed and components
    const {
      embed,
      totalPages: newTotalPages,
      currentPage: newCurrentPage,
    } = createListEmbed(items, listTitle, newStartIndex);

    const components = [];

    // Navigation buttons
    components.push(
      createNavigationButtons(
        newCurrentPage,
        newTotalPages,
        `list_nav${isPersonal ? "_personal" : ""}`
      )
    );

    // Item selection menu
    if (items.length > 0) {
      components.push(
        createItemSelectMenu(
          items,
          `list_select${isPersonal ? "_personal" : ""}`,
          newStartIndex
        )
      );
    }

    // Action buttons
    components.push(
      createListActionButtons(`list_action${isPersonal ? "_personal" : ""}`)
    );

    // Update the message
    await interaction.update({
      embeds: [embed],
      components,
    });

    // Handle list action buttons
  } else if (customId.startsWith("list_action")) {
    const isPersonal = customId.includes("_personal");
    const action = customId.split(":")[1]; // add, refresh, clear_completed

    if (action === "add") {
      // Open a modal for adding a new item
      const modal = new ModalBuilder()
        .setCustomId(`add_modal:${isPersonal ? "personal" : "channel"}`)
        .setTitle("Add New Item");

      // Add text input field
      const textInput = new TextInputBuilder()
        .setCustomId("text")
        .setLabel("Item text")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Enter the item description")
        .setRequired(true)
        .setMaxLength(100);

      // Add components to modal
      modal.addComponents(new ActionRowBuilder().addComponents(textInput));

      // Show the modal
      await interaction.showModal(modal);
      return;
    } else if (action === "refresh") {
      // Simply refresh the current list view
      // First, defer the update to show we're processing
      await interaction.deferUpdate();

      // Get the appropriate list
      let items = [];
      let listTitle;

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

      // Create new embed and components
      const { embed, totalPages, currentPage } = createListEmbed(
        items,
        listTitle
      );

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
      if (items.length > 0) {
        components.push(
          createItemSelectMenu(
            items,
            `list_select${isPersonal ? "_personal" : ""}`,
            0
          )
        );
      }

      // Action buttons
      components.push(
        createListActionButtons(`list_action${isPersonal ? "_personal" : ""}`)
      );

      // Update the message
      await interaction.editReply({
        embeds: [embed],
        components,
      });
    } else if (action === "clear_completed") {
      // Clear completed items
      // Get the appropriate list
      let items = [];
      let userData, channelData;

      if (isPersonal) {
        userData = await getUserData(interaction.user.id);
        const listName = userData.settings.defaultList;
        items = userData.lists[listName].items;

        // Filter out completed items
        const completedCount = items.filter((item) => item.completed).length;
        userData.lists[listName].items = items.filter(
          (item) => !item.completed
        );

        // Save the updated list
        await saveUserData(interaction.user.id, userData);

        // Show confirmation
        await interaction.reply({
          content: `Cleared ${completedCount} completed items from your personal list.`,
          ephemeral: true,
        });
      } else {
        channelData = await getChannelData(interaction.channelId);
        items = channelData.list.items;

        // Filter out completed items
        const completedCount = items.filter((item) => item.completed).length;
        channelData.list.items = items.filter((item) => !item.completed);

        // Save the updated list
        await saveChannelData(interaction.channelId, channelData);

        // Show confirmation
        await interaction.reply({
          content: `Cleared ${completedCount} completed items from the channel list.`,
          ephemeral: false,
        });
      }

      // Also update the original message
      // First, get the updated list
      items = isPersonal
        ? userData.lists[userData.settings.defaultList].items
        : channelData.list.items;
      const listTitle = isPersonal
        ? `${interaction.user.username}'s Personal List`
        : `#${interaction.channel.name} List`;

      // Create new embed and components
      const { embed, totalPages, currentPage } = createListEmbed(
        items,
        listTitle
      );

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
      if (items.length > 0) {
        components.push(
          createItemSelectMenu(
            items,
            `list_select${isPersonal ? "_personal" : ""}`,
            0
          )
        );
      }

      // Action buttons
      components.push(
        createListActionButtons(`list_action${isPersonal ? "_personal" : ""}`)
      );

      // Update the original message
      await interaction.message.edit({
        embeds: [embed],
        components,
      });
    }

    // Handle clear confirmation buttons
  } else if (customId.startsWith("clear_confirm")) {
    const [_, clearType, listType] = customId.split(":");
    const isPersonal = listType === "personal";

    // Get the appropriate list
    let items = [];
    let userData, channelData, listName;

    if (isPersonal) {
      userData = await getUserData(interaction.user.id);
      listName = userData.settings.defaultList;
      items = userData.lists[listName].items;

      // Clear items based on the clearType
      if (clearType === "all") {
        const count = items.length;
        userData.lists[listName].items = [];
        await saveUserData(interaction.user.id, userData);

        await interaction.update({
          content: `Cleared all ${count} items from your personal list.`,
          components: [],
        });
      } else {
        const completedItems = items.filter((item) => item.completed);
        const completedCount = completedItems.length;

        userData.lists[listName].items = items.filter(
          (item) => !item.completed
        );
        await saveUserData(interaction.user.id, userData);

        await interaction.update({
          content: `Cleared ${completedCount} completed items from your personal list.`,
          components: [],
        });
      }
    } else {
      channelData = await getChannelData(interaction.channelId);
      items = channelData.list.items;

      // Clear items based on the clearType
      if (clearType === "all") {
        const count = items.length;
        channelData.list.items = [];
        await saveChannelData(interaction.channelId, channelData);

        await interaction.update({
          content: `Cleared all ${count} items from the channel list.`,
          components: [],
        });

        // Also send a public message
        await interaction.followUp({
          content: `${interaction.user.username} cleared all ${count} items from the list.`,
          ephemeral: false,
        });
      } else {
        const completedItems = items.filter((item) => item.completed);
        const completedCount = completedItems.length;

        channelData.list.items = items.filter((item) => !item.completed);
        await saveChannelData(interaction.channelId, channelData);

        await interaction.update({
          content: `Cleared ${completedCount} completed items from the channel list.`,
          components: [],
        });

        // Also send a public message
        await interaction.followUp({
          content: `${interaction.user.username} cleared ${completedCount} completed items from the list.`,
          ephemeral: false,
        });
      }
    }
  } else if (customId === "clear_cancel") {
    // Cancel the clear operation
    await interaction.update({
      content: "Operation cancelled.",
      components: [],
    });
  }

  // Handle item action buttons
  if (
    customId.includes(":toggle:") ||
    customId.includes(":edit:") ||
    customId.includes(":delete:")
  ) {
    const parts = customId.split(":");
    const action = parts[1]; // toggle, edit, delete
    const itemId = parts[2];
    const isPersonal = customId.startsWith("item_action_personal");

    console.log(
      `Item action button clicked: ${action} for item ID: ${itemId}, isPersonal: ${isPersonal}`
    );

    // Get the appropriate list and find the item
    let items = [];
    let userData, channelData, listName;
    let item, itemIndex;

    try {
      if (isPersonal) {
        userData = await getUserData(interaction.user.id);
        listName = userData.settings.defaultList;
        items = userData.lists[listName].items;
        console.log(`Personal items for action: ${items.length} items`);
      } else {
        channelData = await getChannelData(interaction.channelId);
        items = channelData.list.items;
        console.log(`Channel items for action: ${items.length} items`);
      }

      // Use string comparison for reliable matching
      itemIndex = items.findIndex((i) => String(i.id) === String(itemId));
      console.log(`Item index for ID ${itemId}: ${itemIndex}`);

      if (itemIndex === -1) {
        console.error(
          `Item not found for action. ID: ${itemId}, Available IDs: ${items
            .map((i) => i.id)
            .join(", ")}`
        );
        return await interaction.reply({
          content: "Item not found. It may have been deleted.",
          ephemeral: true,
        });
      }

      item = items[itemIndex];
      console.log(`Found item: ${item.text.substring(0, 20)}`);

      switch (action) {
        case "toggle":
          // Toggle completion status
          item.completed = !item.completed;
          item.updatedAt = new Date().toISOString();

          // Save the updated list
          if (isPersonal) {
            await saveUserData(interaction.user.id, userData);
          } else {
            await saveChannelData(interaction.channelId, channelData);
          }

          // Respond with the updated status
          const status = item.completed ? "completed ✅" : "pending ⬜";
          await interaction.reply({
            content: `Marked item as ${status}:\n**${item.text}**`,
            ephemeral: isPersonal,
          });
          break;

        case "edit":
          // Create a modal for editing
          const editModal = new ModalBuilder()
            .setCustomId(
              `edit_modal:${isPersonal ? "personal:" : ""}${itemIndex}`
            )
            .setTitle(`Edit Item`);

          // Add text input field
          const textInput = new TextInputBuilder()
            .setCustomId("text")
            .setLabel("Edit item text")
            .setStyle(TextInputStyle.Paragraph)
            .setValue(item.text)
            .setRequired(true)
            .setMaxLength(100);

          // Add components to modal
          editModal.addComponents(
            new ActionRowBuilder().addComponents(textInput)
          );

          // Show the modal
          await interaction.showModal(editModal);
          break;

        case "delete":
          // Remove the item from the list
          if (isPersonal) {
            userData.lists[listName].items.splice(itemIndex, 1);
            await saveUserData(interaction.user.id, userData);
          } else {
            channelData.list.items.splice(itemIndex, 1);
            await saveChannelData(interaction.channelId, channelData);
          }

          await interaction.reply({
            content: `Deleted item:\n**${item.text}**`,
            ephemeral: isPersonal,
          });
          break;
      }
    } catch (error) {
      console.error("Error handling item action:", error);
      await interaction.reply({
        content:
          "There was an error handling this action. Please try again later.",
        ephemeral: true,
      });
    }
  }
}

// Handle select menu interactions
async function handleSelectMenuInteraction(interaction) {
  try {
    const customId = interaction.customId;
    console.log(`Processing select menu interaction: ${customId}`);

    // Handle item selection menu
    if (customId.startsWith("list_select")) {
      const isPersonal = customId.includes("_personal");
      const selectedId = interaction.values[0];
      console.log(`Selected item ID: ${selectedId}`);

      if (selectedId === "none") {
        return await interaction.reply({
          content: "There are no items to select.",
          ephemeral: true,
        });
      }

      try {
        // Get the appropriate list and find the item
        let items = [];
        let userData, channelData, listName;
        let item, itemIndex;

        if (isPersonal) {
          userData = await getUserData(interaction.user.id);
          listName = userData.settings.defaultList;
          items = userData.lists[listName].items;
          console.log(
            "Personal items:",
            JSON.stringify(
              items.map((i) => ({ id: i.id, text: i.text.substring(0, 20) }))
            )
          );
        } else {
          channelData = await getChannelData(interaction.channelId);
          items = channelData.list.items;
          console.log(
            "Channel items:",
            JSON.stringify(
              items.map((i) => ({ id: i.id, text: i.text.substring(0, 20) }))
            )
          );
        }

        // Check if items is valid
        if (!Array.isArray(items)) {
          console.error("Items is not an array:", items);
          return await interaction.reply({
            content:
              "There was an error accessing your list. Please try again or use /debug to fix list issues.",
            ephemeral: true,
          });
        }

        console.log(
          `Looking for item with ID: ${selectedId} in array of ${items.length} items`
        );

        // Find the selected item - use string comparison to be safe
        item = items.find((i) => String(i.id) === String(selectedId));
        itemIndex = items.findIndex((i) => String(i.id) === String(selectedId));

        console.log(`Item found: ${!!item}, index: ${itemIndex}`);

        if (!item) {
          console.error(
            `Item not found. Selected ID: ${selectedId}, Available IDs: ${items
              .map((i) => i.id)
              .join(", ")}`
          );
          return await interaction.reply({
            content: "Item not found. It may have been deleted or modified.",
            ephemeral: true,
          });
        }

        console.log(`Creating action buttons for item: ${item.id}`);

        // Create action buttons for the item
        const components = [
          createItemActionButtons(
            item.id,
            `item_action${isPersonal ? "_personal" : ""}`
          ),
        ];

        // Ensure item has a text property
        const itemText = item.text ? String(item.text) : "(No text)";

        console.log(`Replying with item details: ${itemText.substring(0, 30)}`);

        // Show the item details with action buttons
        await interaction.reply({
          content:
            `**Item #${itemIndex + 1}: ${itemText}**\n` +
            `Status: ${item.completed ? "Completed ✅" : "Pending ⬜"}\n\n` +
            "Select an action:",
          components,
          ephemeral: true,
        });

        console.log("Reply sent successfully");
      } catch (error) {
        console.error("Error handling item selection:", error);
        console.error("Error stack:", error.stack);
        await interaction.reply({
          content:
            "There was an error selecting this item. Please try again or use /debug to fix list issues.",
          ephemeral: true,
        });
      }
    }
    // Handle quick toggle selection
    else if (customId.startsWith("quick_toggle")) {
      try {
        const isPersonal = customId.includes("_personal");
        const selectedId = interaction.values[0];
        console.log(`Quick toggle for ID: ${selectedId}`);

        if (selectedId === "none") {
          return await interaction.reply({
            content: "There are no items to select.",
            ephemeral: true,
          });
        }

        // Get the appropriate list and find the item
        let items = [];
        let userData, channelData, listName;
        let item, itemIndex;

        if (isPersonal) {
          userData = await getUserData(interaction.user.id);
          listName = userData.settings.defaultList;
          items = userData.lists[listName].items;
          console.log(
            "Personal items for quick toggle:",
            JSON.stringify(
              items.map((i) => ({ id: i.id, text: i.text.substring(0, 20) }))
            )
          );
        } else {
          channelData = await getChannelData(interaction.channelId);
          items = channelData.list.items;
          console.log(
            "Channel items for quick toggle:",
            JSON.stringify(
              items.map((i) => ({ id: i.id, text: i.text.substring(0, 20) }))
            )
          );
        }

        // Check if items is valid
        if (!Array.isArray(items)) {
          console.error("Items is not an array:", items);
          return await interaction.reply({
            content:
              "There was an error accessing your list. Please try again or use /debug to fix list issues.",
            ephemeral: true,
          });
        }

        console.log(
          `Quick toggle: Looking for item with ID: ${selectedId} in array of ${items.length} items`
        );

        // Find the selected item - use string comparison to be safe
        item = items.find((i) => String(i.id) === String(selectedId));
        itemIndex = items.findIndex((i) => String(i.id) === String(selectedId));

        console.log(`Quick toggle: Item found: ${!!item}, index: ${itemIndex}`);

        if (!item) {
          console.error(
            `Quick toggle: Item not found. Selected ID: ${selectedId}, Available IDs: ${items
              .map((i) => i.id)
              .join(", ")}`
          );
          return await interaction.reply({
            content: "Item not found. It may have been deleted or modified.",
            ephemeral: true,
          });
        }

        // Toggle the completion status
        const oldStatus = item.completed;
        item.completed = !item.completed;
        item.updatedAt = new Date().toISOString();
        console.log(
          `Toggled item status from ${oldStatus} to ${item.completed}`
        );

        // Save the updated list
        if (isPersonal) {
          await saveUserData(interaction.user.id, userData);
          console.log("Saved updated personal user data");
        } else {
          await saveChannelData(interaction.channelId, channelData);
          console.log("Saved updated channel data");
        }

        // Get item text with fallback
        const itemText = item.text ? String(item.text) : "(No text)";

        // Respond with the updated status
        const status = item.completed ? "completed ✅" : "pending ⬜";
        const emoji = item.completed ? "🎉" : "📝";

        console.log(`Updating interaction with new status: ${status}`);

        // Show confirmation and update the list view
        await interaction.update({
          content: `${emoji} Marked item #${
            itemIndex + 1
          } as ${status}:\n**${itemText}**`,
          components: [],
        });

        console.log("Interaction updated successfully");

        // Also refresh the original list if needed
        try {
          if (interaction.message) {
            // Get updated list
            const updatedItems = isPersonal
              ? (await getUserData(interaction.user.id)).lists[listName].items
              : (await getChannelData(interaction.channelId)).list.items;

            const listTitle = isPersonal
              ? `${interaction.user.username}'s Personal List`
              : `#${interaction.channel.name} List`;

            // Create updated embed and components
            const { embed, totalPages, currentPage } = createListEmbed(
              updatedItems,
              listTitle
            );

            const components = [];

            // Navigation buttons if needed
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
            if (updatedItems.length > 0) {
              components.push(
                createItemSelectMenu(
                  updatedItems,
                  `list_select${isPersonal ? "_personal" : ""}`,
                  0
                )
              );
            }

            // Action buttons
            components.push(
              createListActionButtons(
                `list_action${isPersonal ? "_personal" : ""}`
              )
            );

            // Send a followup message with the updated list
            await interaction.followUp({
              content: "Here's the updated list:",
              embeds: [embed],
              components,
              ephemeral: true,
            });
          }
        } catch (error) {
          console.error("Error updating list view after quick toggle:", error);
          // The toggle was still successful, so we don't need to notify about this error
        }
      } catch (error) {
        console.error("Error handling quick toggle:", error);
        await interaction.reply({
          content:
            "There was an error toggling this item. Please try again or use /debug to fix list issues.",
          ephemeral: true,
        });
      }
    }
  } catch (error) {
    console.error("Error in select menu interaction:", error);
    // Try to respond to the user
    try {
      await interaction.reply({
        content:
          "There was an error processing your selection. Please try again.",
        ephemeral: true,
      });
    } catch (replyError) {
      console.error("Could not reply with error message:", replyError);
    }
  }
}

// Handle modal submissions
async function handleModalSubmit(interaction) {
  const customId = interaction.customId;

  // Handle add modal
  if (customId.startsWith("add_modal:")) {
    const isPersonal = customId.split(":")[1] === "personal";

    try {
      // Get the values from the modal
      const text = interaction.fields.getTextInputValue("text");

      // Create the new item
      const newItem = createItem(text, interaction.user.id);

      // Add to personal or channel list
      if (isPersonal) {
        const userData = await getUserData(interaction.user.id);
        const listName = userData.settings.defaultList;

        userData.lists[listName].items.push(newItem);
        await saveUserData(interaction.user.id, userData);

        // Show confirmation
        await interaction.reply({
          content: `Added to your personal list: **${text}**`,
          ephemeral: true,
        });

        // Also refresh the list if this was triggered from a list view
        if (interaction.message) {
          try {
            // Get updated list
            const updatedUserData = await getUserData(interaction.user.id);
            const updatedItems = updatedUserData.lists[listName].items;
            const listTitle = `${interaction.user.username}'s Personal List`;

            // Create updated embed and components
            const { embed, totalPages, currentPage } = createListEmbed(
              updatedItems,
              listTitle
            );

            const components = [];

            // Add navigation buttons if needed
            if (totalPages > 1) {
              components.push(
                createNavigationButtons(
                  currentPage,
                  totalPages,
                  `list_nav_personal`
                )
              );
            }

            // Add item selection menu
            if (updatedItems.length > 0) {
              components.push(
                createItemSelectMenu(updatedItems, `list_select_personal`, 0)
              );
            }

            // Add action buttons
            components.push(createListActionButtons(`list_action_personal`));

            // Update the message
            await interaction.message.edit({
              embeds: [embed],
              components,
            });
          } catch (error) {
            console.error("Error updating list after add:", error);
            // No need to notify the user as the item was still added successfully
          }
        }
      } else {
        const channelData = await getChannelData(interaction.channelId);

        channelData.list.items.push(newItem);
        await saveChannelData(interaction.channelId, channelData);

        // Show confirmation
        await interaction.reply({
          content: `Added to channel list: **${text}**`,
          ephemeral: false,
        });

        // Also refresh the list if this was triggered from a list view
        if (interaction.message) {
          try {
            // Get updated list
            const updatedChannelData = await getChannelData(
              interaction.channelId
            );
            const updatedItems = updatedChannelData.list.items;
            const listTitle = `#${interaction.channel.name} List`;

            // Create updated embed and components
            const { embed, totalPages, currentPage } = createListEmbed(
              updatedItems,
              listTitle
            );

            const components = [];

            // Add navigation buttons if needed
            if (totalPages > 1) {
              components.push(
                createNavigationButtons(currentPage, totalPages, `list_nav`)
              );
            }

            // Add item selection menu
            if (updatedItems.length > 0) {
              components.push(
                createItemSelectMenu(updatedItems, `list_select`, 0)
              );
            }

            // Add action buttons
            components.push(createListActionButtons(`list_action`));

            // Update the message
            await interaction.message.edit({
              embeds: [embed],
              components,
            });
          } catch (error) {
            console.error("Error updating list after add:", error);
            // The item was still added successfully, so we don't need to notify the user about this error
          }
        }
      }
    } catch (error) {
      console.error("Error in add modal submission:", error);
      await interaction.reply({
        content: "There was an error adding your item. Please try again.",
        ephemeral: true,
      });
    }
  }

  // Handle edit modal
  else if (customId.startsWith("edit_modal:")) {
    const parts = customId.split(":");
    const isPersonal = parts[1] === "personal";
    const itemIndex = parseInt(parts[isPersonal ? 2 : 1], 10);

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
    if (itemIndex >= items.length || itemIndex < 0) {
      return await interaction.reply({
        content: `Error: Item doesn't exist in the list. It may have been deleted.`,
        ephemeral: true,
      });
    }

    // Get the item
    const item = items[itemIndex];

    // Get the values from the modal
    const newText = interaction.fields.getTextInputValue("text");

    // Update item properties
    let changes = [];

    if (newText !== item.text) {
      item.text = newText;
      changes.push("text");
    }

    // Update timestamp
    item.updatedAt = new Date().toISOString();

    // Save the updated list
    if (isPersonal) {
      await saveUserData(interaction.user.id, userData);
    } else {
      await saveChannelData(interaction.channelId, channelData);
    }

    // If no changes were made
    if (changes.length === 0) {
      return await interaction.reply({
        content: "No changes were made to the item.",
        ephemeral: true,
      });
    }

    // Respond with the updated item
    await interaction.reply({
      content: `Updated item #${itemIndex + 1}: **${
        item.text
      }**\nChanged: ${changes.join(", ")}`,
      ephemeral: isPersonal,
    });
  }
}
