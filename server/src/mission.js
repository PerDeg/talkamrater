// Veckans uppdrag för klassen. Byts varje måndag och räknas fram ur de
// rundor som klassen spelat sedan veckan började (serverns tidszon, sätt TZ).
import { insertId } from './db.js';

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

async function sumFor(db, t, m, classId, start, playerId) {
  let q = db(t.rounds).join(t.players, `${t.rounds}.player_id`, `${t.players}.id`)
    .where(`${t.players}.class_id`, classId).andWhere(`${t.rounds}.created_at`, '>=', start);
  if (playerId) q = q.andWhere(`${t.rounds}.player_id`, playerId);
  let row;
  if (m.id === 'pairs') row = await q.where(`${t.rounds}.mode`, 'bubbles').sum({ v: `${t.rounds}.total` }).first();
  else if (m.id === 'answers') row = await q.sum({ v: `${t.rounds}.score` }).first();
  else if (m.id === 'rounds') row = await q.count({ v: '*' }).first();
  else row = await q.sum({ v: `${t.rounds}.stars` }).first();
  return Number(row?.v) || 0;
}

export async function classMission(db, t, classId, playerCount, playerId = null, now = new Date()) {
  const start = weekStart(now);
  const m = missionFor(start, playerCount);
  return {
    id: m.id, title: m.title(m.goal), unit: m.unit, goal: m.goal, start,
    progress: await sumFor(db, t, m, classId, start),
    mine: playerId ? await sumFor(db, t, m, classId, start, playerId) : 0,
    endsAt: start + WEEK
  };
}

// Lägger in en händelse "Klassen klarade veckans uppdrag" första gången målet nås.
export async function celebrateMission(db, t, client, classId, playerId, mission) {
  if (mission.progress < mission.goal) return false;
  const detail = String(mission.start);
  const had = await db(t.events).where({ class_id: classId, type: 'mission', detail }).first();
  if (had) return false;
  await insertId(db, client, t.events, { class_id: classId, player_id: playerId, type: 'mission', detail, created_at: Date.now() });
  return true;
}
