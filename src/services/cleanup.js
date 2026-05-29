const cron = require("node-cron");
const db = require("../database/db");

function startCleanup(client) {

  cron.schedule("0 * * * *", async () => {

    console.log("🧹 Vérification des réservations expirées...");

    const now = new Date();

    db.all(
      `SELECT * FROM reservations`,
      [],
      async (err, rows) => {

        for (const reservation of rows) {

          const reservationDate = new Date(
            `${reservation.date}T${reservation.slot}:00`
          );

          if (reservationDate < now) {

            try {

              const channel = await client.channels.fetch(
                process.env.FORUM_CHANNEL_ID
              );

              const thread =
  await client.channels.fetch(
    reservation.messageId
  );

if (thread) {
  await thread.delete();
}

              if (message) {
                await message.delete();
              }

            } catch (e) {
              console.log("Message déjà supprimé");
            }

            db.run(
              `DELETE FROM reservations WHERE id = ?`,
              [reservation.id]
            );

            console.log(
              `🗑 Réservation supprimée : ${reservation.id}`
            );
          }
        }
      }
    );

  });

}

module.exports = {
  startCleanup
};