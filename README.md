# Discord To-Buy List Bot

A feature-rich Discord bot that manages to-do and to-buy lists for your server. Each channel has its own list, and each user can have their own personal lists.

## Features

- **Slash Commands** - Easy-to-use, discoverable commands
- **Interactive UI** - Buttons, select menus, and modals for intuitive interaction
- **Pagination** - Navigate through long lists with ease
- **Categories** - Organize items by type (Groceries, Work, Personal, etc.)
- **Priorities** - Set high/medium/low priority levels with color coding
- **Due Dates** - Add deadlines to items with automatic reminders
- **Personal Lists** - Private lists accessible from any channel
- **Multi-item Management** - Select and act on items through dropdown menus
- **Reaction-based Interaction** - Toggle item status with reactions

## Setup Instructions

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a Discord bot in the [Discord Developer Portal](https://discord.com/developers/applications)
4. Enable the "MESSAGE CONTENT" privileged intent in the bot settings
5. Copy your bot token and Application ID
6. Edit the `.env` file and add your token and application ID:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   APPLICATION_ID=your_application_id_here
   ```
7. Register the slash commands:
   ```
   npm run deploy-commands
   ```
8. Invite the bot to your server (generate an invite URL in the Discord Developer Portal)
9. Run the bot:
   ```
   npm start
   ```

## Commands

- `/add` - Add a new item to your list
- `/list` - View your to-do/to-buy list with filtering options
- `/edit` - Edit an existing item
- `/check` - Toggle completion status of an item
- `/clear` - Clear completed or all items from your list
- `/help` - Get help with using the bot

## Interactive Features

- **Buttons** for quick actions:

  - Toggle completion status
  - Edit items
  - Delete items
  - Navigate through pages
  - Clear completed items

- **Select Menus** for easy selection:
  - Select items to manage
  - Set priority levels
  - Assign categories
- **Modal Forms** for editing:
  - Edit item text with a comfortable text area
  - Set due dates in a convenient format

## Host Your Bot 24/7

For your bot to be available all the time, consider hosting it on one of these platforms:

- [Heroku](https://www.heroku.com/)
- [Replit](https://replit.com/)
- [Glitch](https://glitch.com/)
- [Railway.app](https://railway.app/)
- [DigitalOcean](https://www.digitalocean.com/)

## Development

- Run in development mode with auto-restart:

  ```
  npm run dev
  ```

- Update slash commands after changes:
  ```
  npm run deploy-commands
  ```

## Examples

```
/add item:Buy milk category:groceries priority:high
/list category:groceries
/edit number:1 text:Buy almond milk
/check number:2
/clear type:completed
```

## License

ISC
