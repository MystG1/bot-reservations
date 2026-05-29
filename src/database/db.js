// Remplacez l'ancien require de sqlite3 par better-sqlite3
const Database = require("better-sqlite3");
const db = new Database("./reservations.db");

// Le reste de votre code de création de table (db.run...) reste identique !
db.run(`
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    username TEXT,
    type TEXT,
    teamName TEXT,
    date TEXT,
    slot TEXT,
    threadId TEXT,
    createdAt TEXT
  )
`);

module.exports = db;