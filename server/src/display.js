// Färdiga texter för det publika API:t, så att andra sajter (t.ex. klassens
// schema) kan visa status utan att känna till spelets regler.
// Speglar konstanterna i public/game.js – håll dem i synk.

export const PET_STAGES = [[0, 'Ägg', '🥚'], [10, 'Bebis', '🐣'], [40, 'Liten', '🐾'], [100, 'Stor', '💜'], [200, 'Jätte', '✨'], [400, 'Kung', '👑']];
const TREATS = {
  glass: ['🍦', 'en glass'], pizza: ['🍕', 'en pizzabit'], banan: ['🍌', 'en banan'], tarta: ['🎂', 'en tårtbit'], kaka: ['🍪', 'en kaka'],
  popcorn: ['🍿', 'popcorn'], boll: ['⚽', 'en ny boll'], ballong: ['🎈', 'en ballong'], jordgubb: ['🍓', 'jordgubbar']
};
const WISH_TEXT = {
  answers: w => `svara rätt på ${w.need} frågor`, minus: w => `svara rätt på ${w.need} minusfrågor`, dubbel: w => `svara rätt på ${w.need} dubbelfrågor`,
  bubbles: w => `poppa alla bubbelpar som blir ${w.n}`, number: w => `klara talet ${w.n} med minst två stjärnor`,
  streak: () => 'få 5 rätt i rad', stars3: () => 'få tre stjärnor på en runda', daily: () => 'klara dagens utmaning'
};
export const MEDALS = {
  't-z1': ['🏅', 'Kompisbyns medalj'], 't-z2': ['🌳', 'Skogsmedaljen'], 't-z3': ['🐠', 'Sjömedaljen'], 't-z4': ['⛰️', 'Toppmedaljen'], expert: ['🎓', 'Expertmössan'],
  't-mz1': ['🍄', 'Svampmedaljen'], 't-mz2': ['🦔', 'Igelkottsmedaljen'], 't-mz3': ['🦇', 'Grottmedaljen'], 't-mz4': ['🧊', 'Ismedaljen'], mexpert: ['🧙', 'Minustrollkarlen'],
  't-dz1': ['🧦', 'Strumpmedaljen'], 't-dz2': ['🏰', 'Slottsmedaljen'], dexpert: ['👯', 'Dubbelmästaren']
};
const EXPERTS = { plus: ['🎓', 'Talkamratexpert'], minus: ['🧙', 'Minusexpert'], dubbel: ['👯', 'Dubbelexpert'] };

export const dayNumber = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
const genitive = n => (/[sxz]$/i.test(n) ? n : n + 's');

export function medalIcons(path) {
  return Object.keys(MEDALS).filter(k => (path[k] || 0) > 0).map(k => MEDALS[k][0]).join('');
}

export function petView(pet, today = dayNumber()) {
  const xp = pet.xp || 0;
  const stage = PET_STAGES.reduce((s, [min], i) => (xp >= min ? i : s), 0);
  const [, stageName, icon] = PET_STAGES[stage];
  const next = PET_STAGES[stage + 1];
  const name = pet.name || 'Plutt';
  const daysAway = pet.last ? today - pet.last : null;
  let mood, moodText;
  if (stage === 0) { mood = 'ägg'; moodText = 'Ägget väntar på att kläckas.'; }
  else if (daysAway == null || daysAway >= 2) { mood = 'hungrig'; moodText = `${name} är hungrig och längtar efter att spela.`; }
  else if (pet.wishDay === today && pet.wishCount >= 3) { mood = 'överlycklig'; moodText = `${name} har fått allt den önskat sig idag.`; }
  else { mood = 'glad'; moodText = `${name} mår bra.`; }
  const w = pet.wish;
  const wish = stage > 0 && w && w.day === today && WISH_TEXT[w.type]
    ? { icon: (TREATS[w.treat] || TREATS.glass)[0], treat: (TREATS[w.treat] || TREATS.glass)[1], text: WISH_TEXT[w.type](w), have: w.have, need: w.need }
    : null;
  return { name, xp, stage, stageName, icon, nextAt: next ? next[0] : null, mood, moodText, wish };
}

export function eventText(e) {
  switch (e.type) {
    case 'medal': { const m = MEDALS[e.detail]; return m ? `${e.name} vann ${m[1]} ${m[0]}` : `${e.name} vann en medalj 🏅`; }
    case 'expert': { const x = EXPERTS[e.detail]; return `${e.name} blev ${x ? x[1] : 'expert'} ${x ? x[0] : '🎓'}`; }
    case 'daily': return `${e.name} har gjort dagens utmaning ${e.detail} dagar i rad 🔥`;
    case 'book': return `${e.name} har samlat alla klistermärken 📒`;
    case 'pet': return `${genitive(e.name)} husdjur blev kung 👑`;
    case 'mission': return 'Klassen klarade veckans uppdrag 🎉';
    default: return `${e.name} gjorde något bra`;
  }
}
