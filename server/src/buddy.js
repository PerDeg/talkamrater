// Kompisutmaning: en elev bjuder in en kompis på samma skola (eller i samma klass
// om klassen inte hör till en skola) till ett gemensamt mål, t.ex. 40 rätta svar
// på tre dagar. Varje elev kan bara ha en utmaning åt gången. Klarar de målet får
// båda en kompisbricka och extra mat till husdjuret.
import { insertId } from './db.js';

const DAY = 86400000;
export const BUDDY_DAYS = 3;
const PENDING_MS = 2 * DAY;       // en obesvarad inbjudan gäller i två dagar
const SHOW_RESULT_MS = 7 * DAY;   // hur länge ett avslutat resultat visas
export const BUDDY_GOALS = {
  answers: { unit: 'rätta svar', goal: 40, title: n => `Svara rätt på ${n} frågor tillsammans` },
  pairs: { unit: 'bubbelpar', goal: 30, title: n => `Poppa ${n} bubbelpar tillsammans` },
  rounds: { unit: 'rundor', goal: 6, title: n => `Spela ${n} rundor tillsammans` },
  stars: { unit: 'stjärnor', goal: 15, title: n => `Samla ${n} stjärnor tillsammans` }
};
const OPEN = ['pending', 'active'];

// Kompisar man kan utmana: samma skola, annars samma klass. Aldrig egna konton.
export async function buddyMates(db, t, player) {
  const c = await db(t.classes).where({ id: player.class_id }).first();
  if (!c || c.solo) return [];
  const classes = c.school_id ? await db(t.classes).where({ school_id: c.school_id, solo: false }) : [c];
  const ids = classes.map(k => k.id);
  const players = await db(t.players).whereIn('class_id', ids).whereNot({ id: player.id }).select('id', 'name', 'avatar', 'class_id');
  const busyRows = await db(t.buddies).whereIn('status', OPEN).select('from_id', 'to_id');
  const busy = new Set(busyRows.flatMap(r => [Number(r.from_id), Number(r.to_id)]));
  return players.map(p => ({
    id: Number(p.id), name: p.name, avatar: p.avatar, sameClass: Number(p.class_id) === Number(c.id),
    className: classes.find(k => Number(k.id) === Number(p.class_id))?.name || '', busy: busy.has(Number(p.id))
  })).sort((a, b) => (b.sameClass - a.sameClass) || a.className.localeCompare(b.className, 'sv') || a.name.localeCompare(b.name, 'sv'));
}

// Gamla inbjudningar och utmaningar som tagit slut
async function expire(db, t, now = Date.now()) {
  await db(t.buddies).where({ status: 'pending' }).andWhere('created_at', '<', now - PENDING_MS).update({ status: 'expired' });
  await db(t.buddies).where({ status: 'active' }).andWhere('ends_at', '<', now).update({ status: 'expired' });
}

async function sumFor(db, t, metric, playerId, from, to) {
  let q = db(t.rounds).where({ player_id: playerId }).andWhere('created_at', '>=', from).andWhere('created_at', '<', to);
  let row;
  if (metric === 'pairs') row = await q.where({ mode: 'bubbles' }).sum({ v: 'total' }).first();
  else if (metric === 'answers') row = await q.sum({ v: 'score' }).first();
  else if (metric === 'rounds') row = await q.count({ v: '*' }).first();
  else row = await q.sum({ v: 'stars' }).first();
  return Number(row?.v) || 0;
}

export async function buddyView(db, t, row, meId, now = Date.now()) {
  const role = Number(row.from_id) === Number(meId) ? 'from' : 'to';
  const mateId = role === 'from' ? row.to_id : row.from_id;
  const mate = await db(t.players).leftJoin(t.classes, `${t.players}.class_id`, `${t.classes}.id`)
    .where(`${t.players}.id`, mateId).select(`${t.players}.name`, `${t.players}.avatar`, `${t.classes}.name as className`).first();
  const g = BUDDY_GOALS[row.metric];
  let mine = 0, theirs = 0;
  if (row.accepted_at) {
    const to = Math.min(Number(row.done_at || now), Number(row.ends_at || now)) + 1;
    mine = await sumFor(db, t, row.metric, meId, Number(row.accepted_at), to);
    theirs = await sumFor(db, t, row.metric, mateId, Number(row.accepted_at), to);
  }
  return {
    id: Number(row.id), role, status: row.status, metric: row.metric, unit: g.unit, goal: Number(row.goal), title: g.title(Number(row.goal)),
    mate: { id: Number(mateId), name: mate?.name || 'Kompisen', avatar: mate?.avatar || '🙂', className: mate?.className || '' },
    progress: mine + theirs, mine, theirs,
    createdAt: Number(row.created_at), endsAt: row.ends_at ? Number(row.ends_at) : null,
    claimed: !!(role === 'from' ? row.claimed_from : row.claimed_to)
  };
}

// Elevens utmaning just nu: en inbjudan, en pågående, eller ett resultat som inte är sett
export async function currentBuddy(db, t, meId, now = Date.now()) {
  await expire(db, t, now);
  const me = Number(meId);
  const open = await db(t.buddies).whereIn('status', OPEN).andWhere(q => q.where({ from_id: me }).orWhere({ to_id: me })).orderBy('id', 'desc').first();
  if (open) return buddyView(db, t, open, me, now);
  // Avslutade som eleven inte sett (eller inte hämtat belöningen för)
  const done = await db(t.buddies).whereIn('status', ['done', 'expired', 'declined'])
    .andWhere('created_at', '>', now - SHOW_RESULT_MS - BUDDY_DAYS * DAY)
    .andWhere(q => q.where(w => w.where({ from_id: me, seen_from: false })).orWhere(w => w.where({ to_id: me, seen_to: false })))
    .orderBy('id', 'desc').first();
  return done ? buddyView(db, t, done, me, now) : null;
}

export async function createBuddy(db, t, client, player, toId, metric, now = Date.now()) {
  await expire(db, t, now);
  const g = BUDDY_GOALS[metric];
  if (!g) return { error: 'Okänd sorts utmaning.' };
  const mates = await buddyMates(db, t, player);
  const mate = mates.find(m => m.id === Number(toId));
  if (!mate) return { error: 'Den kompisen finns inte på din skola.' };
  const mine = await db(t.buddies).whereIn('status', OPEN).andWhere(q => q.where({ from_id: player.id }).orWhere({ to_id: player.id })).first();
  if (mine) return { error: 'Du har redan en kompisutmaning. Avsluta den först.' };
  if (mate.busy) return { error: `${mate.name} har redan en kompisutmaning just nu.` };
  // Gamla resultat räknas som sedda när man startar en ny
  await db(t.buddies).where({ from_id: player.id }).update({ seen_from: true });
  await db(t.buddies).where({ to_id: player.id }).update({ seen_to: true });
  const id = await insertId(db, client, t.buddies, { from_id: player.id, to_id: mate.id, metric, goal: g.goal, status: 'pending', created_at: now });
  return { id };
}

// accept, decline, cancel, seen, claim
export async function buddyAction(db, t, meId, id, action, now = Date.now()) {
  await expire(db, t, now);
  const row = await db(t.buddies).where({ id: Number(id) || 0 }).first();
  const me = Number(meId);
  if (!row || (Number(row.from_id) !== me && Number(row.to_id) !== me)) return { error: 'Utmaningen finns inte.', status: 404 };
  const isFrom = Number(row.from_id) === me;
  const set = patch => db(t.buddies).where({ id: row.id }).update(patch);
  switch (action) {
    case 'accept':
      if (isFrom || row.status !== 'pending') return { error: 'Inbjudan går inte att svara på längre.' };
      await set({ status: 'active', accepted_at: now, ends_at: now + BUDDY_DAYS * DAY });
      return { ok: true };
    case 'decline':
      if (isFrom || row.status !== 'pending') return { error: 'Inbjudan går inte att svara på längre.' };
      await set({ status: 'declined', seen_to: true });
      return { ok: true };
    case 'cancel':
      // Inbjudaren kan ta tillbaka en inbjudan, och båda kan avsluta en pågående utmaning
      if (row.status === 'pending' && !isFrom) return { error: 'Svara Nej tack i stället.' };
      if (!OPEN.includes(row.status)) return { error: 'Utmaningen är redan slut.' };
      await set({ status: 'cancelled', seen_from: true, seen_to: true });
      return { ok: true };
    case 'seen':
      await set(isFrom ? { seen_from: true } : { seen_to: true });
      return { ok: true };
    case 'claim':
      if (row.status !== 'done') return { error: 'Utmaningen är inte klar.' };
      if (isFrom ? row.claimed_from : row.claimed_to) return { ok: true, already: true };
      // Resultatet står kvar tills eleven trycker Okej (seen)
      await set(isFrom ? { claimed_from: true } : { claimed_to: true });
      return { ok: true, already: false };
    default:
      return { error: 'Okänd åtgärd.', status: 404 };
  }
}

// Efter en runda: är den pågående utmaningen klar? Då hamnar det i klassflödet.
export async function checkBuddy(db, t, client, player, now = Date.now()) {
  const row = await db(t.buddies).where({ status: 'active' }).andWhere(q => q.where({ from_id: player.id }).orWhere({ to_id: player.id })).first();
  if (!row) return null;
  const view = await buddyView(db, t, row, player.id, now);
  if (view.progress < view.goal) return { ...view, justDone: false };
  await db(t.buddies).where({ id: row.id, status: 'active' }).update({ status: 'done', done_at: now });
  const a = await db(t.players).where({ id: row.from_id }).first(), b = await db(t.players).where({ id: row.to_id }).first();
  const detail = `${a.name.slice(0, 19)}|${b.name.slice(0, 19)}`;
  for (const classId of new Set([Number(a.class_id), Number(b.class_id)])) {
    await insertId(db, client, t.events, { class_id: classId, player_id: player.id, type: 'buddy', detail, created_at: now });
  }
  return { ...view, status: 'done', justDone: true };
}

// En mening för pratbubblan
export function buddyNudge(view) {
  if (!view) return null;
  if (view.status === 'pending' && view.role === 'to') return `${view.mate.name} vill göra en kompisutmaning med dig! 🤝`;
  if (view.status === 'active') return `Du och ${view.mate.name} har ${view.progress} av ${view.goal} ${view.unit}. Kör! 🤝`;
  return null;
}
