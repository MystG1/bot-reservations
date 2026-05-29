const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "reservations.json");

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (err) {
    return [];
  }
}

function write(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const db = {
  run(sql, params, callback) {
    const data = read();
    const query = sql.toUpperCase();

    if (query.includes("DELETE")) {
      const idToDelete = params?.[0];
      // CORRECTION : On force la comparaison en Number pour éviter les bugs de type
      const filteredData = data.filter((item) => Number(item.id) !== Number(idToDelete));
      write(filteredData);

      if (callback) callback(null);
      return;
    }

    const entry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      userId: params?.[0],
      username: params?.[1],
      type: params?.[2],
      teamName: params?.[3],
      date: params?.[4],
      slot: params?.[5],
      threadId: params?.[6],
      createdAt: params?.[7]
    };

    data.push(entry);
    write(data);

    if (callback) callback(null);
  },

  all(sql, params, callback) {
    const cb = typeof params === "function" ? params : callback;
    const data = read();
    if (cb) cb(null, data);
  }
};

module.exports = db;