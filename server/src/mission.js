// Veckans uppdrag för klassen. Byts varje måndag och räknas fram ur de
// rundor som klassen spelat sedan veckan började (serverns tidszon, sätt TZ).

const WEEK = 7 * 86400000;

export const MISSIONS = [
  { id: 'pairs', per: 25, title: n => `Poppa ${n} bubbelpar tillsammans`, unit: 'bubbelpar' },
  { id: 'answers', per: 60, title: n => `Svara rätt på ${n} frågor tillsammans`, unit: 'rätta svar' },
  { id: 'rounds', per: 6, title: n => `Spela ${n} rundor tillsammans`, unit: 'rundor' },
  { id: 'stars', per: 12, title: n => `Samla ${n} stjärnor tillsammans`, unit: 'stjärnor' }
];

export function weekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // måndag
  return d.getTime();
}

export function missionFor(start, playerCount) {
  const m = MISSIONS[Math.floor(start / WEEK) % MISSIONS.length];
  const raw = m.per * Math.max(5, playerCount);
  const goal = Math.ceil(raw / 10) * 10;
  return { ...m, goal };
}

export async function classMission(db, t, classId, playerCount, now = new Date()) {
  const start = weekStart(now);
  const m = missionFor(start, playerCount);
  const q = db(t.rounds).join(t.players, `${t.rounds}.player_id`, `${t.players}.id`)
    .where(`${t.players}.class_id`, classId).andWhere(`${t.rounds}.created_at`, '>=', start);
  let row;
  if (m.id === 'pairs') row = await q.clone().where(`${t.rounds}.mode`, 'bubbles').sum({ v: `${t.rounds}.total` }).first();
  else if (m.id === 'answers') row = await q.clone().sum({ v: `${t.rounds}.score` }).first();
  else if (m.id === 'rounds') row = await q.clone().count({ v: '*' }).first();
  else row = await q.clone().sum({ v: `${t.rounds}.stars` }).first();
  return {
    id: m.id, title: m.title(m.goal), unit: m.unit, goal: m.goal,
    progress: Number(row?.v) || 0,
    endsAt: start + WEEK
  };
}
