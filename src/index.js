require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const db = require("./database/db");
const { startCleanup } = require("./services/cleanup");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const reservationCache = {};
const userReplies = {};

const BUTTON_CHANNEL_ID = process.env.PANEL_CHANNEL_ID;
const FORUM_CHANNEL_ID = process.env.FORUM_CHANNEL_ID;

// ==========================================
// SÉCURITÉ GLOBALE ANTI-CRASH
// ==========================================
process.on('unhandledRejection', error => {
  console.error('⚠️ [Erreur Capturée] Rejet non géré :', error);
});

process.on('uncaughtException', error => {
  console.error('⚠️ [Erreur Capturée] Exception non gérée :', error);
});

// =========================
// GENERATE SLOTS EVA
// =========================
function generateSlots(date) {
  const slots = [];
  const d = new Date(date);
  const day = d.getDay();

  let startHour;
  let endHour;

  if (day >= 1 && day <= 5) {
    startHour = 16;
    endHour = 24;
  } else if (day === 6) {
    startHour = 12;
    endHour = 25;
  } else {
    startHour = 10;
    endHour = 20;
  }

  let currentHour = startHour;
  let currentMinute = 0;

  while (currentHour < endHour) {
    const displayHour = currentHour % 24;
    slots.push(
      `${String(displayHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`
    );
    currentMinute += 40;

    if (currentMinute >= 60) {
      currentMinute -= 60;
      currentHour++;
    }
  }
  return slots;
}

// =========================
// GENERATE MONTH BUTTONS
// =========================
function generateMonthButtons() {
  const rows = [];
  let buttons = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(now.getMonth() + i);

    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    buttons.push(
      new ButtonBuilder()
        .setCustomId(`select_day_${year}_${month}_${i}`)
        .setLabel(`${date.toLocaleString("fr-FR", { month: "long" })} ${year}`)
        .setStyle(ButtonStyle.Secondary)
    );

    if (buttons.length === 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons));
      buttons = [];
    }
  }

  if (buttons.length > 0) {
    rows.push(new ActionRowBuilder().addComponents(buttons));
  }
  return rows;
}

// =========================
// READY
// =========================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Connecté : ${client.user.tag}`);
  startCleanup(client);

  try {
    const channel = await client.channels.fetch(BUTTON_CHANNEL_ID);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_reservation")
        .setLabel("📅 Créer une réservation")
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      content: "🎮 EVA Réservation",
      components: [row]
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi du bouton initial :", error);
  }
});

// =========================
// INTERACTIONS
// =========================
client.on(Events.InteractionCreate, async (interaction) => {

  // =========================
  // BUTTONS
  // =========================
  if (interaction.isButton()) {

    // CREATE RESERVATION
    if (interaction.customId === "create_reservation") {
      await interaction.deferReply({ flags: 64 });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("training_team")
          .setLabel("👥 Entraînement équipe")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("training_mix")
          .setLabel("🎯 MIX")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({
        content: "Choisis le format :",
        components: [row]
      });

      if (!userReplies[interaction.user.id]) userReplies[interaction.user.id] = [];
      userReplies[interaction.user.id].push(interaction);
      return;
    }

    // TEAM
    if (interaction.customId === "training_team") {
      const modal = new ModalBuilder()
        .setCustomId("team_name_modal")
        .setTitle("Nom de l'équipe");

      const input = new TextInputBuilder()
        .setCustomId("team_name")
        .setLabel("Nom de l'équipe")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      return interaction.showModal(modal);
    }

    // MIX
    if (interaction.customId === "training_mix") {
      await interaction.deferReply({ flags: 64 });

      reservationCache[interaction.user.id] = {
        type: "MIX",
        teamName: null,
        enemyTeam: null,
        selectedSlots: [],
        comment: null
      };

      await interaction.editReply({
        content: "📅 Choisis un mois :",
        components: generateMonthButtons()
      });

      if (!userReplies[interaction.user.id]) userReplies[interaction.user.id] = [];
      userReplies[interaction.user.id].push(interaction);
      return;
    }

    // ENEMY YES
    if (interaction.customId === "enemy_yes") {
      const modal = new ModalBuilder()
        .setCustomId("enemy_team_modal")
        .setTitle("Équipe adverse");

      const input = new TextInputBuilder()
        .setCustomId("enemy_team")
        .setLabel("Nom de l'équipe adverse")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      return interaction.showModal(modal);
    }

    // ENEMY NO
    if (interaction.customId === "enemy_no") {
      await interaction.deferReply({ flags: 64 });

      await interaction.editReply({
        content: "📅 Choisis un mois :",
        components: generateMonthButtons()
      });

      if (!userReplies[interaction.user.id]) userReplies[interaction.user.id] = [];
      userReplies[interaction.user.id].push(interaction);
      return;
    }

    // SELECT MONTH
    if (interaction.customId.startsWith("select_day_")) {
      const parts = interaction.customId.split("_");
      const year = parseInt(parts[2]);
      const month = parseInt(parts[3]);

      const now = new Date();
      const currentDate = new Date(year, month - 1);
      const daysInMonth = new Date(year, month, 0).getDate();

      const startDay =
        currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear()
          ? now.getDate()
          : 1;

      const options = [];

      for (let d = startDay; d <= daysInMonth; d++) {
        const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const dayName = new Date(formattedDate).toLocaleDateString("fr-FR", { weekday: "long" });

        options.push({
          label: `${dayName} ${d}`,
          value: formattedDate
        });
      }

      const rows = [];
      rows.push(
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("day_select_1")
            .setPlaceholder("📆 Jours 1 → 25")
            .addOptions(options.slice(0, 25))
        )
      );

      if (options.length > 25) {
        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("day_select_2")
              .setPlaceholder("📆 Jours 26 → 31")
              .addOptions(options.slice(25))
          )
        );
      }

      await interaction.update({
        content: "📆 Sélectionne un jour :",
        components: rows
      });

      if (!userReplies[interaction.user.id]) userReplies[interaction.user.id] = [];
      userReplies[interaction.user.id].push(interaction);
      return;
    }

    // SLOT SELECT
    if (interaction.customId.startsWith("slot_")) {
      const slot = interaction.customId.replace("slot_", "");
      const data = reservationCache[interaction.user.id];

      if (!data) return;

      if (!data.selectedSlots.includes(slot)) {
        data.selectedSlots.push(slot);
      } else {
        data.selectedSlots = data.selectedSlots.filter(s => s !== slot);
      }

      const slots = generateSlots(data.date);
      const rows = [];
      let buttons = [];
      const limitedSlots = slots.slice(0, 20);

      for (const s of limitedSlots) {
        const selected = data.selectedSlots.includes(s);

        buttons.push(
          new ButtonBuilder()
            .setCustomId(`slot_${s}`)
            .setLabel(selected ? `✅ ${s}` : s)
            .setStyle(selected ? ButtonStyle.Success : ButtonStyle.Secondary)
        );

        if (buttons.length === 5) {
          rows.push(new ActionRowBuilder().addComponents(buttons));
          buttons = [];
        }
      }

      if (buttons.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(buttons));
      }

      rows.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("confirm_slots")
            .setLabel("✅ Valider")
            .setStyle(ButtonStyle.Success)
        )
      );

      await interaction.update({
        content: `📆 ${data.date}\n\nChoisis tes créneaux :`,
        components: rows
      });
      return;
    }

    // CONFIRM SLOTS
    if (interaction.customId === "confirm_slots") {
      const data = reservationCache[interaction.user.id];

      if (!data || data.selectedSlots.length === 0) {
        return interaction.reply({
          content: "❌ Aucun créneau sélectionné.",
          flags: 64
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("comment_modal")
        .setTitle("Ajouter un commentaire");

      const input = new TextInputBuilder()
        .setCustomId("reservation_comment")
        .setLabel("Commentaire (Optionnel, mettez '/' si vide)")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Ex: Précisions, retard, matériel nécessaire...")
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      return interaction.showModal(modal);
    }
  }

  // =========================
  // SELECT MENU
  // =========================
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "day_select_1" || interaction.customId === "day_select_2") {
      const date = interaction.values[0];

      if (!reservationCache[interaction.user.id]) return;

      reservationCache[interaction.user.id].date = date;
      reservationCache[interaction.user.id].selectedSlots = [];

      const slots = generateSlots(date);
      const rows = [];
      let buttons = [];
      const limitedSlots = slots.slice(0, 20);

      for (const slot of limitedSlots) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`slot_${slot}`)
            .setLabel(slot)
            .setStyle(ButtonStyle.Secondary)
        );

        if (buttons.length === 5) {
          rows.push(new ActionRowBuilder().addComponents(buttons));
          buttons = [];
        }
      }

      if (buttons.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(buttons));
      }

      rows.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("confirm_slots")
            .setLabel("✅ Valider")
            .setStyle(ButtonStyle.Success)
        )
      );

      await interaction.update({
        content: `📆 ${date}\n\nChoisis tes créneaux :`,
        components: rows
      });
      return;
    }
  }

  // =========================
  // MODALS
  // =========================
  if (interaction.isModalSubmit()) {

    // TEAM NAME
    if (interaction.customId === "team_name_modal") {
      const teamName = interaction.fields.getTextInputValue("team_name");

      reservationCache[interaction.user.id] = {
        type: "Entraînement équipe",
        teamName,
        enemyTeam: null,
        selectedSlots: [],
        comment: null
      };

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("enemy_yes").setLabel("✅ Oui").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("enemy_no").setLabel("❌ Non").setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({
        content: "Avez-vous déjà une équipe adverse ?",
        components: [row],
        flags: 64
      });

      if (!userReplies[interaction.user.id]) userReplies[interaction.user.id] = [];
      userReplies[interaction.user.id].push(interaction);
      return;
    }

    // ENEMY TEAM MODAL
    if (interaction.customId === "enemy_team_modal") {
      const enemyTeam = interaction.fields.getTextInputValue("enemy_team");

      if (reservationCache[interaction.user.id]) {
        reservationCache[interaction.user.id].enemyTeam = enemyTeam;
      }

      await interaction.reply({
        content: "📅 Choisis un mois :",
        components: generateMonthButtons(),
        flags: 64
      });

      if (!userReplies[interaction.user.id]) userReplies[interaction.user.id] = [];
      userReplies[interaction.user.id].push(interaction);
      return;
    }

    // COMMENT MODAL (Étape finale et envoi au Forum)
    if (interaction.customId === "comment_modal") {
      const comment = interaction.fields.getTextInputValue("reservation_comment");
      const data = reservationCache[interaction.user.id];

      if (!data) {
        return interaction.reply({ content: "❌ Session expirée. Veuillez recommencer.", flags: 64 });
      }

      data.comment = comment;
      await interaction.deferReply({ flags: 64 });

      try {
        const forum = await client.channels.fetch(FORUM_CHANNEL_ID);
        const slotList = data.selectedSlots.map(s => `• ${s}`).join("\n");
        const firstSlot = data.selectedSlots[0];
        const secondSlot = data.selectedSlots[1] || "";

        const formattedDate = new Date(data.date).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        const cuteGifs = [
          "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHoyaXppenpkanJnYmlyeW13aXY1c3IwbTZob3hoOWZteDZ3aG9xYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/IX20ivGhtfXNZsghVU/giphy.gif",
          "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExb25keHJqdHpuZ2czMTRwZnRvdWZtNWV4dm9pNHlla2RnOWt0d250dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NKWW55ukTMB9qNA3Cl/giphy.gif",
          "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExajF6am04dTBjczV3czFyancxdGhuNXhyYzR2MWY3Ymt3YWdzYW56NCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7qDGemThdesa0mze/giphy.gif"
        ];
        const randomGif = cuteGifs[Math.floor(Math.random() * cuteGifs.length)];

        const threadName = data.teamName && data.enemyTeam
          ? `${data.teamName} vs ${data.enemyTeam} - ${formattedDate} | ${firstSlot} ${secondSlot ? `- ${secondSlot}` : ''}`
          : `${data.teamName || data.type} - ${formattedDate} | ${firstSlot} ${secondSlot ? `- ${secondSlot}` : ''}`;

        const messageContent = `👤 Réservation faite par : <@${interaction.user.id}>
        
📝 Commentaire :
*${data.comment}*`;

        const thread = await forum.threads.create({
          name: threadName,
          message: {
            content: messageContent,
            embeds: [{ image: { url: randomGif } }]
          }
        });

        for (const slot of data.selectedSlots) {
          db.run(
            `INSERT INTO reservations (userId, username, type, teamName, date, slot, threadId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              interaction.user.id,
              interaction.user.username,
              data.type,
              data.teamName,
              data.date,
              slot,
              thread.id,
              new Date().toISOString()
            ]
          );
        }

        // On affiche le message de succès final
        await interaction.editReply({
          content: "✅ Réservation créée avec succès avec votre commentaire !",
          components: []
        });

        // On enregistre cette dernière interaction pour qu'elle soit aussi effacée
        if (!userReplies[interaction.user.id]) userReplies[interaction.user.id] = [];
        userReplies[interaction.user.id].push(interaction);

        // Nettoyage complet (incluant le message de succès) après 3 secondes
        setTimeout(async () => {
          try {
            const replies = userReplies[interaction.user.id] || [];
            for (const reply of replies) {
              try { await reply.deleteReply(); } catch (err) {}
            }
            delete userReplies[interaction.user.id];
          } catch (err) {}
        }, 3000);

        delete reservationCache[interaction.user.id];

      } catch (error) {
        console.error("Erreur lors de la finalisation avec commentaire :", error);
        await interaction.editReply({ content: "❌ Une erreur est survenue lors de la création de la réservation.", components: [] });
      }
      return;
    }
  }
});

client.login(process.env.TOKEN);