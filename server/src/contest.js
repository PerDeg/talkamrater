// Klasskamp mellan klasser på samma skola, t.ex. "Skolans bubbelberg".
// Varje klass bygger sitt eget berg mot ett eget mål som beror på hur många
// elever klassen har, så att små och stora klasser har samma chans. Klasserna
// visas i bokstavsordning, aldrig som en placering. Tanken är att heja:
// "4A har byggt 70 % av sitt berg. Nu kör vi!"
import { insertId } from './db.js';

export const METRICS = {
  pairs: { unit: 'bubbelpar', per: 40, icon: '🫧', mountain: 'bubbelberg' },
  answers: { unit: 'rätta svar', per: 100, icon: '✅', mountain: 'svarsberg' },
  rounds: { unit: 'rundor', per: 10, icon: '🎮', mountain: 'rundberg' },
  stars: { unit: 'stjärnor', per: 20, icon: '⭐', mountain: 'stjärnberg' }
};
export const MILESTONES = [25, 50, 75, 100];
// Hur länge en avslutad kamp syns kvar för eleverna
const SHOW_ENDED = 7 * 86400000;

export const classGoal = (metric, players) => Math.ceil(METRICS[metric].per * Math.max(5, players) / 10) * 10;
export const validMetric = m => Object.hasOwn(METRICS, m);

async function scores(db, t, contest, classIds) {
  if (!classIds.length) return {};
  let q = db(t.rounds).join(t.players, `${t.rounds}.player_id`, `${t.players}.id`)
    .whereIn(`${t.players}.class_id`, classIds)
    .andWhere(`${t.rounds}.created_at`, '>=', Number(contest.starts_at));
  if (contest.ends_at) q = q.andWhere(`${t.rounds}.created_at`, '<', Number(contest.ends_at));
  if (contest.metric === 'pairs') q = q.andWhere(`${t.rounds}.mode`, 'bubbles').sum({ v: `${t.rounds}.total` });
  else if (contest.metric === 'answers') q = q.sum({ v: `${t.rounds}.score` });
  else if (contest.metric === 'rounds') q = q.count({ v: '*' });
  else q = q.sum({ v: `${t.rounds}.stars` });
  const rows = await q.select(`${t.players}.class_id as cid`).groupBy(`${t.players}.class_id`);
  return Object.fromEntries(rows.map(r => [Number(r.cid), Number(r.v) || 0]));
}

// Kampen som den ser ut just nu, från en klass perspektiv (mine = den egna klassen)
export async function contestView(db, t, contest, myClassId = null, now = Date.now()) {
  const m = METRICS[contest.metric];
  const cls = await db(t.contestClasses).join(t.classes, `${t.contestClasses}.class_id`, `${t.classes}.id`)
    .where(`${t.contestClasses}.contest_id`, contest.id).select(`${t.classes}.id`, `${t.classes}.name`);
  const ids = cls.map(c => Number(c.id));
  const counts = ids.length ? await db(t.players).whereIn('class_id', ids).groupBy('class_id').select('class_id', db.raw('count(*) as n')) : [];
  const sizeOf = id => Number(counts.find(c => Number(c.class_id) === id)?.n) || 0;
  const sc = await scores(db, t, contest, ids);
  const classes = cls.map(c => {
    const id = Number(c.id), progress = sc[id] || 0, goal = classGoal(contest.metric, sizeOf(id));
    return { id, name: c.name, progress, goal, percent: Math.min(100, Math.floor(100 * progress / goal)), mine: id === Number(myClassId) };
  }).sort((a, b) => a.name.localeCompare(b.name, 'sv'));
  const ended = !!contest.ends_at && Number(contest.ends_at) <= now;
  return {
    id: Number(contest.id), title: contest.title, metric: contest.metric, unit: m.unit, icon: m.icon, mountain: m.mountain,
    active: !!contest.active, ended, startsAt: Number(contest.starts_at), endsAt: contest.ends_at ? Number(contest.ends_at) : null,
    total: classes.reduce((s, c) => s + c.progress, 0), classes
  };
}

// Den kamp en klass är med i just nu (eller nyss avslutad), om någon
export async function contestForClass(db, t, classId, now = Date.now()) {
  return db(t.contests).join(t.contestClasses, `${t.contests}.id`, `${t.contestClasses}.contest_id`)
    .where(`${t.contestClasses}.class_id`, classId).andWhere(`${t.contests}.active`, true)
    .andWhere(`${t.contests}.starts_at`, '<=', now)
    .andWhere(q => q.whereNull(`${t.contests}.ends_at`).orWhere(`${t.contests}.ends_at`, '>', now - SHOW_ENDED))
    .orderBy(`${t.contests}.id`, 'desc').select(`${t.contests}.*`).first();
}

// När en klass når 25, 50, 75 eller 100 % hamnar det i flödet hos alla klasser i kampen.
// Detaljen är "kamp|procent|klassnamn", så att texten kan byggas utan uppslag.
export async function celebrateContest(db, t, client, contest, view, classId, playerId) {
  const me = view.classes.find(c => c.id === Number(classId));
  if (!me || view.ended) return [];
  const reached = [];
  for (const pct of MILESTONES.filter(p => me.percent >= p)) {
    const detail = `${view.id}|${pct}|${me.name}`.slice(0, 40);
    const had = await db(t.events).where({ class_id: classId, type: 'contest', detail }).first();
    if (had) continue;
    const now = Date.now();
    for (const c of view.classes) {
      await insertId(db, client, t.events, { class_id: c.id, player_id: playerId, type: 'contest', detail, created_at: now });
    }
    reached.push(pct);
  }
  return reached;
}

// Text för en kamphändelse: "4A har byggt halva sitt bubbelberg! 🏔️"
export function contestEventText(detail, metric = 'pairs') {
  const [, pct, ...rest] = String(detail).split('|');
  const name = rest.join('|') || 'En klass';
  const what = { 25: 'en fjärdedel av', 50: 'halva', 75: 'tre fjärdedelar av', 100: 'hela' }[pct] || `${pct} % av`;
  return `${name} har byggt ${what} sitt berg! 🏔️`;
}

// En hejande mening om kampen, för pratbubblan. Växlar mellan de andra klasserna.
export function contestCheer(view, now = new Date()) {
  if (!view || !view.classes.length) return null;
  const mine = view.classes.find(c => c.mine);
  if (view.ended) return `${view.title} är slut! Tillsammans byggde skolan ${view.total} ${view.unit} 🏔️`;
  const others = view.classes.filter(c => !c.mine && c.progress > 0);
  if (others.length) {
    const o = others[Math.floor(now.getHours() / 2) % others.length];
    return `${o.name} har byggt ${o.percent} % av sitt ${view.mountain}. Nu kör vi! 🏔️`;
  }
  return mine ? `Vårt ${view.mountain} är på ${mine.percent} %. Nu bygger vi! 🏔️` : null;
}
