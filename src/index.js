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
// BANQUE DE GIFS PAR AMBIANCE
// ==========================================
const GIF_THEMES = {
  tryhard: [
    "https://media.giphy.com/media/6gNQv9XZUJRtGx2RHu/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmIwazlsemp1eHBqM2NtYm40dnlzdTN6ZnFwMGttbzdldDFuM2VicCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/K91OXsr6lSjh5qxQBb/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2Z1NG1uY3hqN25nY2lnaWQxZ3c5NnRydHU1ZDVzd2p5dGdtaDdnaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/qirT6LrQo2BOw/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGp1MDR1dm5vYzBoaG1odmYxYWliMjllN2IxMjc4Z2pxaGI3ZDgweSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/2s8sU8xIUJSSY/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eGExMDF0Z3hrbmY5MGdxMnUxbDBpY2RtbXlnbGsyeGh2OGdvZnJxZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/jAW1omkFeJkNSkht48/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGg4eHpxNHFiZ2szbjBvaTRsY20wMnI3cWY3bDJydWdpa2RhMWUxbSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/wqnkRfvYEejx69bjun/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3lud282YjB5aTRlZTI3aHBkdHY5MnhvcHZ6Y3FuYzhpbnkzZW01aiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/oOzOYcb0mQZYiNkph6/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGk3YTVtNjllaXZqeHhudm4zbTkwMXZubHh6dXZscmd0am1kcGxxZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vVJe0aiWuCkqYy3GsQ/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbHZ5M3BjdHBlYW44bjd0bzJwc3F4cHNkNzZzcGlmNG1qbzc5dGVhYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8SNHEWM66EE9WF5xUi/giphy.gif",
    ""
  ],
  chill: [
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmZsd24wbXkyaGF4OTZkZGJ6NW1ldjAwY2czdGtubjF3aGI1YWM4cyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/XNQDgvHvDFnITnAAU5/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmZsd24wbXkyaGF4OTZkZGJ6NW1ldjAwY2czdGtubjF3aGI1YWM4cyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1AE8LbiGWJHjXXjEU7/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MmdwbHQxMnY1cTI4MDdhemYwdTEwcHZjOWV1NzVuYmgzMGR6a2NqOCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/fGCa0O9sogzEOTbBaP/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZDFhMndjYmFoeXJuZHkwYmp6MHhlNWx0aHQ2N2plNnZtaW1yNno4NCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6zXzFmGm2excJXpLQc/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dHU4bTJkY2RuYmM5aDRlM2twcnV5b3Axemp2cmdldzJjdXQyYmtydCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JbVTO5me5IQLJC0xvu/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MjczbzA1eTc2Y3QwaGxnem05ZmU5d2t1dzZ4bzRyZGVwMm16cW8zdSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LypoBlWAyjlF5J5SWV/giphy.gif",
    ""
  ],
  fun: [
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm4za3VoNXhzYzV1YjliaG45MHU2YnRraXQ5cm44d2UxNXV2cGR4bCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/13hxeOYjoTWtK8/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZmdrYmE4c3E0dWt0ejU0YzhyY2VzMDNvNTZhcjQzbXVxeDcxMXl5NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/UTIjSi97Rbq4H1AlbV/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MjgxeDFpMGdqMm1vNzk0Z3M4NGh0dDBkdHlkZ29hOXE5c2l5MWc0ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/emLvIMJHUhO5MFeU80/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExamhhbnpndGVqYnRpcTgxYzNxbWMwcWF1bTRvb2I1YjZ4NGQxZ3k4MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/HiERcJIEURCZ56TqgZ/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNW1ycGx3NTlyemE4MTVtNXdocDhiMDlmbzllZzNoc3V6N2MxOGd0ZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/eMUDHPNgBJ4UpnqfmB/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dHk4cjY3MXhkY3dpengwNXQ3YXN6emkyenBlanJlbWluNzI3OTNscSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/GhCziiVAcdpKPjOHpI/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dHk4cjY3MXhkY3dpengwNXQ3YXN6emkyenBlanJlbWluNzI3OTNscSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/PZdKY4pfyvZXELZ82Z/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXJpZ2d5MjgzZzNxbjRneHhjdHRkZXZqeDZ1N3MybDN0MWlhcHd2bCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/RRB40Ax5BM8OdM2pMC/giphy.gif",
    ""
  ],
  gaming: [
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3NmeHBxYXp3Z3NmZ3dwdmRjODB0OXk4MW0wMnI6b2tzeXdqdHVzNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnRJgxg9bZJvtS/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGdrMGViNmMzajV1YXVydXg2enBmMjJxbnpzNDB0OXh3ZzVxeTc1ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Sy2lziCOPymAbNA1NW/giphy.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzMzcnhsMXRkZmcycWc2dGMzcGVpbWxja3Qyc3JheWdiM3VnMTc4MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ySYrjcQFCJICLr4kUw/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExamgxbzRiN2FneGE1MTVwZnFxM2ozZnh4djBnempwZnl2aHl4eGlhNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NKWW55ukTMB9qNA3Cl/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYWs2dGRzamZtYnltbmN1aHE0azlndWl3MzBrcmhnOXdheHZzcnRoaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LlTYKN146VMyI/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDExaW5uYXdrZHBnNnMycTJxOGRvcW50cWo2OTdoMXpseXZvODZ3cSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hxcqplz2tpt6ylcNwN/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MzZhOWZnc2wzaGkzdTIzOG50MjF1ZHZoczd3dmNvZXRudnpocXo3cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/rNJlmYy4Uoxk0pqB42/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXNmNzcxZmVuNW02eG9mNjNzemV5OGl5MmY2ZXJnYThveDk4NThteiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3og0IF4QM5XYI6tF3G/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHZlNjNiMjNvd2l4OWQybDdwNGN6ZHJsejY3aTM3cHJwOTd3cmhoYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/f0sATHPZHuHAq2Wj34/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cnB6bHp6b2hsZmttZTluM3htMm83czJ4OHg4cWNsajYzY3hhOXFxMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/tCDjkAJG0ANi1k1c9K/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmIybmdpazdob2dlY2d2Zms0azdsZ213cnl3ZGlhbHNpc3Q5cTM5NyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xQcUyue226cM0/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXFlZ3VoejQ0bnJiNmtydHhwZTl0eGVpOTdoZXltamdlNmx0Y3piYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/2Vuto7CotrpgAKMVoS/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnllYWptcmNqN3JyNHozcG1vbHlib2N6b240ZGh6YnZkZG5pZGZ6eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/DWo6beGJTTqFi/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnllYWptcmNqN3JyNHozcG1vbHlib2N6b240ZGh6YnZkZG5pZGZ6eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JErAGpPtUV8ze/giphy.gif",
    ""
  ]
};

// ==========================================
// SÉCURITÉ GLOBALE ANTI-CRASH
// ==========================================
process.on('unhandledRejection', error => {
  console.error('⚠️ [Erreur Capturée] Rejet non géré : ', error);
});

process.on('uncaughtException', error => {
  console.error('⚠️ [Erreur Capturée] Exception non gérée : ', error);
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

    if (interaction.customId.startsWith("presence_")) {
      await interaction.deferUpdate();

      const message = interaction.message;
      const embed = message.embeds[0];
      if (!embed) return;

      let accepted = embed.fields[0].value === "*Personne pour l'instant*" ? [] : embed.fields[0].value.split("\n");
      let declined = embed.fields[1].value === "*Personne pour l'instant*" ? [] : embed.fields[1].value.split("\n");
      let tentative = embed.fields[2].value === "*Personne pour l'instant*" ? [] : embed.fields[2].value.split("\n");

      const userTag = `• ${interaction.user.username}`;

      accepted = accepted.filter(u => u !== userTag);
      declined = declined.filter(u => u !== userTag);
      tentative = tentative.filter(u => u !== userTag);

      if (interaction.customId === "presence_accept") accepted.push(userTag);
      if (interaction.customId === "presence_decline") declined.push(userTag);
      if (interaction.customId === "presence_tentative") tentative.push(userTag);

      const acceptedValue = accepted.length > 0 ? accepted.join("\n") : "*Personne pour l'instant*";
      const declinedValue = declined.length > 0 ? declined.join("\n") : "*Personne pour l'instant*";
      const tentativeValue = tentative.length > 0 ? tentative.join("\n") : "*Personne pour l'instant*";

      const updatedEmbed = {
        title: embed.title,
        color: embed.color,
        fields: [
          { name: `✅ Accepted (${accepted.length})`, value: acceptedValue, inline: true },
          { name: `❌ Declined (${declined.length})`, value: declinedValue, inline: true },
          { name: `❓ Tentative (${tentative.length})`, value: tentativeValue, inline: true }
        ],
        image: embed.image,
        footer: embed.footer
      };

      await message.edit({ embeds: [updatedEmbed] });
      return;
    }

    if (interaction.customId === "create_reservation") {
      await interaction.deferReply({ flags: 64 });

      userReplies[interaction.user.id] = interaction;

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
      return;
    }

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

    if (interaction.customId === "training_mix") {
      reservationCache[interaction.user.id] = {
        type: "MIX",
        teamName: null,
        enemyTeam: null,
        selectedSlots: [],
        comment: null,
        theme: "fun"
      };

      await interaction.update({
        content: "📅 Choisis un mois :",
        components: generateMonthButtons()
      });
      return;
    }

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

    if (interaction.customId === "enemy_no") {
      await interaction.update({
        content: "📅 Choisis un mois :",
        components: generateMonthButtons()
      });
      return;
    }

    // SELECT MONTH -> CORRIGÉ AVEC MAX 2 MENUS DEROULANTS (QUINZAINES) POUR EVITER LES CRASHES (5 MAX)
    if (interaction.customId.startsWith("select_day_")) {
      const parts = interaction.customId.split("_");
      const year = parseInt(parts[2]);
      const month = parseInt(parts[3]);

      const now = new Date();
      const daysInMonth = new Date(year, month, 0).getDate();
      const monthLabel = new Date(year, month - 1).toLocaleString("fr-FR", { month: "long" });

      const part1Options = [];
      const part2Options = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const targetDate = new Date(formattedDate);

        // Filtrer les jours passés si c'est le mois en cours
        if (
          year === now.getFullYear() &&
          month === (now.getMonth() + 1) &&
          d < now.getDate()
        ) {
          continue; 
        }

        let dayNameRaw = targetDate.toLocaleDateString("fr-FR", { weekday: "long" });
        const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1);
        const labelFormat = `${dayName} ${d} ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`;

        const option = {
          label: labelFormat,
          value: formattedDate
        };

        // Séparation propre en 2 quinzaines maximum (1 à 15, et 16+)
        if (d <= 15) {
          part1Options.push(option);
        } else {
          part2Options.push(option);
        }
      }

      const rows = [];

      // Ajout du premier menu déroulant (Jours 1 à 15) s'il contient des jours valides
      if (part1Options.length > 0) {
        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`day_select_part_1`)
              .setPlaceholder(`📅 Jours du 1er au 15 ${monthLabel}`)
              .addOptions(part1Options)
          )
        );
      }

      // Ajout du deuxième menu déroulant (Jours 16 à fin du mois) s'il contient des jours valides
      if (part2Options.length > 0) {
        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`day_select_part_2`)
              .setPlaceholder(`📅 Jours du 16 au ${daysInMonth} ${monthLabel}`)
              .addOptions(part2Options)
          )
        );
      }

      await interaction.update({
        content: `│ 📆 Sélectionne ton jour pour le mois de **${monthLabel.toUpperCase()}** :`,
        components: rows
      });
      return;
    }

    if (interaction.customId.startsWith("slot_")) {
      const slot = interaction.customId.replace("slot_", "");
      const data = reservationCache[interaction.user.id];

      if (!data) return;

      if (data.selectedSlots.includes(slot)) {
        data.selectedSlots = data.selectedSlots.filter(s => s !== slot);
      } else {
        if (data.selectedSlots.length >= 2) {
          await interaction.reply({
            content: "❌ Tu ne peux pas sélectionner plus de 2 créneaux horaires par réservation.",
            flags: 64
          });
          setTimeout(async () => {
            try { await interaction.deleteReply(); } catch (err) {}
          }, 3000);
          return;
        }

        if (data.selectedSlots.length === 1) {
          const firstSlot = data.selectedSlots[0];
          const allAvailableSlots = generateSlots(data.date).slice(0, 20);

          const indexFirst = allAvailableSlots.indexOf(firstSlot);
          const indexNew = allAvailableSlots.indexOf(slot);

          if (Math.abs(indexFirst - indexNew) !== 1) {
            await interaction.reply({
              content: `❌ Les créneaux doivent être consécutifs (ex: ${firstSlot} et le créneau juste avant ou juste après).`,
              flags: 64
            });
            setTimeout(async () => {
              try { await interaction.deleteReply(); } catch (err) {}
            }, 3000);
            return;
          }
        }

        data.selectedSlots.push(slot);
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

    if (interaction.customId === "confirm_slots") {
      const data = reservationCache[interaction.user.id];

      if (!data || data.selectedSlots.length === 0) {
        return interaction.reply({
          content: "❌ Aucun créneau sélectionné.",
          flags: 64
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("theme_tryhard").setLabel("🔥 Tryhard").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("theme_chill").setLabel("☕ Chill").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("theme_fun").setLabel("🎉 Fun").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("theme_gaming").setLabel("😏 Choix du chef").setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({
        content: "🎬 **Étape Visuelle :** Un petit GIF pour animé ta réservation 😏 ",
        components: [row]
      });
      return;
    }

    if (interaction.customId.startsWith("theme_")) {
      const themeSelected = interaction.customId.replace("theme_", "");
      
      if (reservationCache[interaction.user.id]) {
        reservationCache[interaction.user.id].theme = themeSelected;
      }

      const modal = new ModalBuilder()
        .setCustomId("comment_modal")
        .setTitle("Ajouter un commentaire");

      const input = new TextInputBuilder()
        .setCustomId("reservation_comment")
        .setLabel("Commentaire (Optionnel, mettez '/' si vide)")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Ex: Merci de laisser les places dispos, niveau souhaité, ...")
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
    // S'adapte automatiquement à l'un ou l'autre des menus de quinzaine
    if (interaction.customId.startsWith("day_select_part_")) {
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

      const cleanDateDisplay = new Date(date).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      await interaction.update({
        content: `📆 **${cleanDateDisplay.toUpperCase()}**\n\nChoisis tes créneaux :`,
        components: rows
      });
      return;
    }
  }

  // =========================
  // MODALS
  // =========================
  if (interaction.isModalSubmit()) {

    if (interaction.customId === "team_name_modal") {
      const teamName = interaction.fields.getTextInputValue("team_name");

      reservationCache[interaction.user.id] = {
        type: "Entraînement équipe",
        teamName,
        enemyTeam: null,
        selectedSlots: [],
        comment: null,
        theme: "fun"
      };

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("enemy_yes").setLabel("✅ Oui").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("enemy_no").setLabel("❌ Non").setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({
        content: "Avez-vous déjà une équipe adverse ?",
        components: [row]
      });
      return;
    }

    if (interaction.customId === "enemy_team_modal") {
      const enemyTeam = interaction.fields.getTextInputValue("enemy_team");

      if (reservationCache[interaction.user.id]) {
        reservationCache[interaction.user.id].enemyTeam = enemyTeam;
      }

      await interaction.update({
        content: "📅 Choisis un mois :",
        components: generateMonthButtons()
      });
      return;
    }

    if (interaction.customId === "comment_modal") {
      const comment = interaction.fields.getTextInputValue("reservation_comment");
      const data = reservationCache[interaction.user.id];

      if (!data) {
        return interaction.reply({ content: "❌ Session expirée. Veuillez recommencer.", flags: 64 });
      }

      data.comment = comment;
      
      await interaction.update({
        content: "⌛ Création de la réservation en cours...",
        components: []
      });

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

        const themeList = GIF_THEMES[data.theme] || GIF_THEMES["fun"];
        const chosenGif = themeList[Math.floor(Math.random() * themeList.length)];

        const threadName = data.teamName && data.enemyTeam
          ? `${data.teamName} vs ${data.enemyTeam} - ${formattedDate} | ${firstSlot} ${secondSlot ? `- ${secondSlot}` : ''}`
          : `${data.teamName || data.type} - ${formattedDate} | ${firstSlot} ${secondSlot ? `- ${secondSlot}` : ''}`;

        const messageContent = `Réservation faite par : <@${interaction.user.id}>

${data.teamName ? `👥 Équipe : ${data.teamName}\n` : ""}${data.enemyTeam ? `⚔️ Adversaire : ${data.enemyTeam}\n` : ""}
📝 Commentaire :
*${data.comment}*`;

        const presenceEmbed = {
          title: "Réservation",
          color: 0xf1c40f,
          fields: [
            { name: "✅ Accepted (0)", value: "*Personne pour l'instant*", inline: true },
            { name: "❌ Declined (0)", value: "*Personne pour l'instant*", inline: true },
            { name: "❓ Tentative (0)", value: "*Personne pour l'instant*", inline: true }
          ],
          image: { url: chosenGif },
          footer: { text: `Créé par ${interaction.user.username}` }
        };

        const presenceRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("presence_accept").setEmoji("✅").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("presence_decline").setEmoji("❌").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("presence_tentative").setEmoji("❓").setStyle(ButtonStyle.Secondary)
        );

        const thread = await forum.threads.create({
          name: threadName,
          message: {
            content: messageContent,
            embeds: [presenceEmbed],
            components: [presenceRow]
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

        await interaction.editReply({
          content: "✅ **Réservation créée avec succès !** Le salon du forum a été configuré."
        });

        const initialInteraction = userReplies[interaction.user.id];
        if (initialInteraction) {
          try {
            await initialInteraction.deleteReply();
          } catch (err) {
            console.error("Impossible de supprimer le menu initial :", err);
          }
        }

        setTimeout(async () => {
          try {
            await interaction.deleteReply();
          } catch (err) {}
          
          delete userReplies[interaction.user.id];
          delete reservationCache[interaction.user.id];
        }, 3000);

      } catch (error) {
        console.error("Erreur lors de l'finalisation :", error);
        await interaction.editReply({ content: "❌ Une erreur est survenue lors de la création.", components: [] });
      }
      return;
    }
  }
});

client.login(process.env.TOKEN);