const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get help with using the to-do list bot"),

  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setTitle("To-Do/To-Buy List Bot - Help")
        .setColor(0x0099ff)
        .setDescription(
          "This bot helps you maintain to-do lists or shopping lists for your server. Each channel can have its own list, and each user can have a personal list."
        )
        .addFields(
          {
            name: "Basic Commands",
            value:
              "`/add` - Add a new item to your list\n" +
              "`/list` - View your to-do/to-buy list\n" +
              "`/edit` - Edit an existing item\n" +
              "`/check` - Toggle completion status of an item\n" +
              "`/clear` - Clear completed or all items from your list",
          },
          {
            name: "Interactive Features",
            value:
              "• **Buttons** - Most list displays have action buttons\n" +
              "• **Selection Menus** - Easily select items to manage\n" +
              "• **Pagination** - Navigate through long lists\n" +
              "• **Categories** - Organize items by type\n" +
              "• **Priorities** - Set high/medium/low priorities\n" +
              "• **Due Dates** - Add deadlines to your items",
          },
          {
            name: "Personal Lists",
            value:
              "Use the `personal` option with most commands to work with your personal list instead of the channel list. Personal lists are private to you and accessible from any channel.",
          },
          {
            name: "Tips",
            value:
              "• Use **filters** when viewing lists to focus on specific items\n" +
              "• Items are automatically **sorted** by priority and completion status\n" +
              "• Use the selection menu under lists to quickly manage items\n" +
              "• Overdue items are highlighted automatically",
          }
        )
        .setFooter({
          text: "To view details for a specific command, type / and click on the command name",
        });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error displaying the help information.",
        ephemeral: true,
      });
    }
  },
};
