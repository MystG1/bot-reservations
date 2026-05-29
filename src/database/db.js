const fs = require("fs");

const DB_FILE = "./reservations.json";

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

function read() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function write(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const db = {

  run(sql, params, callback) {

    const data = read();

    const entry = {
      id: Date.now(),
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
  }

};

module.exports = db;