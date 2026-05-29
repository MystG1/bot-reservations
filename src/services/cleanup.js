const cron = require("node-cron");
const db = require("../database/db");

function startCleanup(client) {
  // S'exécute toutes les heures à la minute 0
  cron.schedule("0 * * * *", async () => {
    console.log("🧹 Vérification des réservations expirées...");
    const now = new Date();

    db.all(`SELECT * FROM reservations`, [], async (err, rows) => {
      if (err) {
        return console.error("❌ Erreur lors de la lecture de la BDD :", err);
      }

      if (!rows || rows.length === 0) return;

      for (const reservation of rows) {
        // Recréation de la date cible (Ex: "2026-05-29T16:40:00")
        const reservationDate = new Date(`${reservation.date}T${reservation.slot}:00`);

        if (reservationDate < now) {
          // 1. Tenter de supprimer le thread sur Discord
          if (reservation.threadId) {
            try {
              const thread = await client.channels.fetch(reservation.threadId);
              if (thread) {
                await thread.delete();
                console.log(`🗑 Thread Discord supprimé : ${reservation.threadId}`);
              }
            } catch (e) {
              // Évite le crash si le salon a déjà été supprimé à la main
              console.log(`ℹ️ Thread ${reservation.threadId} déjà introuvable sur Discord.`);
            }
          }

          // 2. Nettoyer la ligne dans la base de données
          db.run(
            `DELETE FROM reservations WHERE id = ?`,
            [reservation.id],
            (deleteErr) => {
              if (deleteErr) {
                console.error(`❌ Erreur BDD pour la suppression de l'ID ${reservation.id} :`, deleteErr);
              } else {
                console.log(`🗑 Réservation BDD nettoyée (ID: ${reservation.id})`);
              }
            }
          );
        }
      }
    });
  });
}

module.exports = {
  startCleanup
};