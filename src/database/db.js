const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "reservations.json");

// Initialisation du fichier JSON s'il n'existe pas
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
  // Simule les requêtes d'écriture (INSERT et DELETE)
  run(sql, params, callback) {
    const data = read();
    const query = sql.toUpperCase();

    // Cas 1 : S'il s'agit d'une suppression (utilisé par cleanup.js)
    if (query.includes("DELETE")) {
      const idToDelete = params?.[0];
      // On filtre pour ne garder que ce qui n'est pas l'ID à supprimer
      const filteredData = data.filter((item) => item.id !== idToDelete);
      write(filteredData);

      if (callback) callback(null);
      return;
    }

    // Cas 2 : S'il s'agit d'un ajout (utilisé par index.js)
    const entry = {
      id: Date.now() + Math.floor(Math.random() * 1000), // Évite les doublons d'ID si bouclage rapide
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

  // Simule la récupération de données (utilisé par cleanup.js)
  all(sql, params, callback) {
    // Si aucun paramètre n'est fourni mais qu'un callback est là
    const cb = typeof params === "function" ? params : callback;
    const data = read();

    // On renvoie directement toutes les lignes du JSON au callback
    if (cb) cb(null, data);
  }
};

module.exports = db;