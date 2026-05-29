function generateSlots(date) {

  const slots = [];

  const d = new Date(date);
  const day = d.getDay();

  let startHour;
  let endHour;

  // Lundi → Vendredi
  if (day >= 1 && day <= 5) {
    startHour = 16;
    endHour = 24;
  }

  // Samedi
  else if (day === 6) {
    startHour = 12;
    endHour = 25;
  }

  // Dimanche
  else {
    startHour = 10;
    endHour = 20;
  }

  let currentHour = startHour;
  let currentMinute = 0;

  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMinute === 0)
  ) {

    slots.push(
      `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`
    );

    currentMinute += 40;

    if (currentMinute >= 60) {
      currentMinute -= 60;
      currentHour++;
    }
  }

  return slots;
}

function getSlotsByDate(dateStr) {

  const date = new Date(dateStr);
  const day = date.getDay();

  // Lundi → Vendredi
  if (day >= 1 && day <= 5) {
    return generateSlots("16:00", "00:00");
  }

  // Samedi
  if (day === 6) {
    return generateSlots("12:40", "00:40");
  }

  // Dimanche
  return generateSlots("10:00", "20:00");
}

module.exports = {
  getSlotsByDate
};