const fs = require("fs").promises;
const path = require("path");

// Database file path
const dbPath = path.join(__dirname, "data.json");

// Default database structure
const defaultDb = {
  users: {},
  channels: {},
  guilds: {},
};

// Initialize database
async function initDatabase() {
  try {
    await fs.access(dbPath);
    // If file exists, load it
    const data = await fs.readFile(dbPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, create it with default structure
    await fs.writeFile(dbPath, JSON.stringify(defaultDb, null, 2));
    return { ...defaultDb };
  }
}

// Save database
async function saveDatabase(db) {
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
}

// Get user data
async function getUserData(userId) {
  const db = await initDatabase();
  if (!db.users[userId]) {
    db.users[userId] = {
      lists: {
        default: {
          items: [],
          created: new Date().toISOString(),
        },
      },
      settings: {
        defaultList: "default",
      },
    };
    await saveDatabase(db);
  }
  return db.users[userId];
}

// Save user data
async function saveUserData(userId, userData) {
  const db = await initDatabase();
  db.users[userId] = userData;
  await saveDatabase(db);
}

// Get channel data
async function getChannelData(channelId) {
  const db = await initDatabase();
  if (!db.channels[channelId]) {
    db.channels[channelId] = {
      list: {
        items: [],
        created: new Date().toISOString(),
      },
      settings: {},
    };
    await saveDatabase(db);
  }
  return db.channels[channelId];
}

// Save channel data
async function saveChannelData(channelId, channelData) {
  const db = await initDatabase();
  db.channels[channelId] = channelData;
  await saveDatabase(db);
}

// Get guild data
async function getGuildData(guildId) {
  const db = await initDatabase();
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = {
      settings: {},
      sharedLists: {},
    };
    await saveDatabase(db);
  }
  return db.guilds[guildId];
}

// Save guild data
async function saveGuildData(guildId, guildData) {
  const db = await initDatabase();
  db.guilds[guildId] = guildData;
  await saveDatabase(db);
}

module.exports = {
  getUserData,
  saveUserData,
  getChannelData,
  saveChannelData,
  getGuildData,
  saveGuildData,
};
