const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./reservations.db");

db.serialize(() => {

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

});

module.exports = db;