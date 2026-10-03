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
  streak: () => 'få 5 rätt i rad', stars3: () => 'få tre stjärnor på en runda', daily: () => 'klara dagens utmaning',
  focus: () => 'träna veckans fokustal'
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
  else if (pet.wishDay === today && pet.wishCount >= 1) { mood = 'överlycklig'; moodText = `${name} fick sin önskan idag.`; }
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

// En enda försiktig mening från husdjuret, för en liten pratbubbla på andra
// sajter. Det viktigaste vinner: hunger, önskan, dagens utmaning, klassens uppdrag.
// Lärarens fokus, t.ex. "p7" → "talkamraterna till 7"
export function focusLabel(f) {
  const m = /^([pmd])(\d{1,2})$/.exec(f || '');
  if (!m) return null;
  const n = Number(m[2]);
  return m[1] === 'p' ? `talkamraterna till ${n}` : m[1] === 'm' ? `minus från ${n}` : `dubblorna upp till ${n}`;
}
export const validFocus = f => f === null || f === '' || (/^[pm](\d{1,2})$/.test(f) && +f.slice(1) >= 1 && +f.slice(1) <= 20) || (/^d(\d{1,2})$/.test(f) && +f.slice(1) >= 1 && +f.slice(1) <= 10);

function trickyTip(tricky) {
  const top = Object.entries(tricky || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  const [, w, n, a] = /^([md]?)(\d+):(\d+)$/.exec(top[0]).map((v, i) => (i > 1 ? Number(v) : v));
  if (w === 'd') return `Kom ihåg: ${n} + ${n} = ${2 * n} 🧠`;
  if (w === 'm') return `Kom ihåg: ${n} − ${a} = ${n - a} 🧠`;
  return `Kom ihåg: ${a} och ${n - a} är kompisar till ${n} 🧠`;
}

// En enda försiktig mening från husdjuret, för en liten pratbubbla på andra sajter.
// Hunger och en önskan går först. Annars växlar bubblan (varannan timme) mellan
// lugnare saker: lärarens fokus, dagens utmaning, klassens uppdrag, ett minnestips.
export function nudge({ pet, daily, mission, focus, tricky, today = dayNumber(), now = new Date() }) {
  const p = petView(pet, today);
  if (p.stage === 0) return { kind: 'egg', text: 'Ägget väntar på dig. Spela en runda så kläcks det! 🥚' };
  if (p.mood === 'hungrig') return { kind: 'hungry', text: 'Jag är hungrig! Spelar vi en runda? 🍓' };
  if (p.wish) return { kind: 'wish', text: `Kan du ${p.wish.text}? Då får jag ${p.wish.treat} ${p.wish.icon}` };
  const options = [];
  const fl = focusLabel(focus);
  if (fl) options.push({ kind: 'focus', text: `Den här veckan tränar vi ${fl} ✏️` });
  if (!(daily && daily.day === today)) {
    options.push({ kind: 'daily', text: daily && daily.streak > 1 && daily.day === today - 1 ? `Dagens utmaning väntar! Håll sviten på ${daily.streak} dagar 🔥` : 'Dagens utmaning väntar på dig! 🔥' });
  }
  if (mission && mission.progress < mission.goal) options.push({ kind: 'mission', text: `Klassen har ${mission.progress} av ${mission.goal} ${mission.unit}. Hjälper du till? 🤝` });
  if (mission && mission.progress >= mission.goal) options.push({ kind: 'done', text: 'Klassen klarade veckans uppdrag! 🎉' });
  const tip = trickyTip(tricky);
  if (tip) options.push({ kind: 'tip', text: tip });
  if (!options.length) return { kind: 'happy', text: `${p.name} mår toppen idag 💜` };
  return options[(today * 12 + Math.floor(now.getHours() / 2)) % options.length];
}
