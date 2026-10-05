(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  // Lilla Plutt som ikon (lila med ögon), i stället för en emoji
  const MINI_PLUTT = '<span class="tb-plutt" aria-hidden="true"><i></i><i></i></span>';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const genitive = n => (/[sxz]$/i.test(n) ? n : n + 's');
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MINUS = '−';

  /* ================= Innehåll ================= */
  // Klistermärken: [emoji, namn, sällsynthet]. Ordningen får inte ändras (index = id "s0", "s1" …
  // för byten), nya läggs alltid sist.
  const STICKERS = [
    ['🦖','T-rex',2],['🦄','Enhörning',2],['🐙','Bläckfisk',1],['🦊','Räv',0],['🐼','Panda',0],['🚀','Raket',1],
    ['🌈','Regnbåge',1],['🦁','Lejon',0],['🐸','Groda',0],['🐳','Val',1],['🦋','Fjäril',0],['🍕','Pizza',0],
    ['⚽','Fotboll',0],['🎸','Gitarr',1],['🐉','Drake',2],['🦕','Långhals',1],['🐯','Tiger',0],['🐨','Koala',0],
    ['🦉','Uggla',1],['🍩','Munk',0],['🛸','UFO',2],['🐬','Delfin',0],['🦈','Haj',1],['🐢','Sköldpadda',0],
    ['🦒','Giraff',0],['🐧','Pingvin',0],['🤖','Robot',1],['👑','Krona',3],['🌋','Vulkan',2],['🏆','Pokal',3],
    ['💎','Diamant',3],['☄️','Komet',3],['🌟','Superstjärna',3],
    // Nya läggs alltid sist, så att sparade byten (som pekar på platsen i listan) stämmer
    ['🐶','Hund',0],['🐱','Katt',0],['🐰','Kanin',0],['🐮','Ko',0],['🐷','Gris',0],['🐝','Bi',0],
    ['🐞','Nyckelpiga',0],['🍌','Banan',0],['🎈','Ballong',0],['🚲','Cykel',0],['🐌','Snigel',0],
    ['🦩','Flamingo',1],['🦜','Papegoja',1],['🐘','Elefant',1],['🦀','Krabba',1],['🚂','Tåg',1],
    ['🎡','Pariserhjul',1],['🛹','Skateboard',1],['🧁','Muffins',1],
    ['🦚','Påfågel',2],['🪐','Saturnus',2],['🧜','Sjöjungfru',2],['🦦','Utter',2],['🎠','Karusell',2],
    ['🌠','Stjärnfall',3],['🌌','Vintergatan',3],['🎆','Fyrverkeri',3]
  ];
  // Sällsynthet: chans per dragning (i procent), och hur många jordgubbar en dubblett är värd
  const RARITY = [
    { name: 'Vanlig', plural: 'Vanliga', weight: 72, boost: 68, berries: 1 },
    { name: 'Ovanlig', plural: 'Ovanliga', weight: 21, boost: 23, berries: 2 },
    { name: 'Sällsynt', plural: 'Sällsynta', weight: 6, boost: 7.5, berries: 5 },
    { name: 'Legendarisk', plural: 'Legendariska', weight: 1, boost: 1.5, berries: 12 }
  ];
  // Långt ifrån varje runda ger ett klistermärke. Medaljer och dagens utmaning ger alltid ett.
  const STICKER_CHANCE = { 1: 0.1, 2: 0.2, 3: 0.35 };
  const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐯', '🐨', '🐵', '🐰', '🐶', '🐱', '🦄', '🐲'];
  const PIN_PICS = ['🐶', '🐱', '🐸', '🦊', '🐼', '🦁', '🍎', '🍕', '🚗', '🚀', '⚽', '🌈'];
  // Titlar efter stjärnor. Höga gränser: man ska inte kunna bli mattegeni på en eftermiddag.
  const TITLES = [[0,'Talspanare'],[30,'Talkompis'],[80,'Plusproffs'],[160,'Räknestjärna'],[300,'Mattehjälte'],[500,'Talkamratmästare'],[800,'Mattetrollkarl'],[1200,'Mattelegend'],[2000,'Mattegeni']];
  const titleFor = t => TITLES.filter(([min]) => t >= min).pop()[1];
  // Varje nivå har ett eget märke, som man får när man når den
  const TITLE_BADGES = ['🔍', '🤝', '➕', '🌟', '🦸', '🏅', '🧙', '🐉', '🧠'];
  const tierFor = t => TITLES.reduce((n, [min], i) => (t >= min ? i : n), 0);
  // Titeln som en badge: stjärnorna i stjärnan, och hur långt det är till nästa titel
  let shownTier = null;
  function renderRank() {
    const t = save.total, tier = TITLES.reduce((n, [min], i) => (t >= min ? i : n), 0);
    const [from, name] = TITLES[tier], next = TITLES[tier + 1];
    const badge = $('#rankBadge');
    badge.dataset.tier = tier;
    // Stjärnan visar nivån (1–9), så att den alltid får plats. Stjärnorna står i texten bredvid.
    $('#rankStars').textContent = tier + 1;
    $('.rank-star').dataset.len = 1;
    $('#rankName').textContent = name;
    $('#rankMeter').style.width = next ? `${Math.round(100 * (t - from) / (next[0] - from))}%` : '100%';
    $('#rankNext').textContent = next ? `${next[0] - t} ★ kvar till ${next[1]}` : 'Högsta titeln! 🏆';
    $('#rankLevel').textContent = `Nivå ${tier + 1} av ${TITLES.length} · ${t} ★`;
    // Resan: alla nivåer som en väg, med märket för varje nivå och var man är nu
    badge.onclick = () => {
      // Stigen slingrar sig fram och tillbaka: märkena turas om att stå till vänster och höger
      const R = 92, X = i => (i % 2 ? 80 : 20), Y = i => i * R + R / 2;
      const seg = i => `C ${X(i - 1)} ${Y(i - 1) + R / 2} ${X(i)} ${Y(i) - R / 2} ${X(i)} ${Y(i)}`;
      const trail = upto => `M ${X(0)} ${Y(0)} ` + TITLES.slice(1, upto + 1).map((_, k) => seg(k + 1)).join(' ');
      openSheet(`<h3>Din resa</h3><p>Varje stjärna du tar för dig framåt på stigen. Du är på nivå ${tier + 1} av ${TITLES.length}.</p>
        <div class="journey" style="height:${TITLES.length * R}px">
          <svg class="jr-path" viewBox="0 0 100 ${TITLES.length * R}" preserveAspectRatio="none" aria-hidden="true">
            <path class="jr-road" d="${trail(TITLES.length - 1)}"/>
            ${tier ? `<path class="jr-road-done" d="${trail(tier)}"/>` : ''}
            <path class="jr-dash" d="${trail(TITLES.length - 1)}"/>
          </svg>
          <ol>${TITLES.map(([min, n], i) => {
          const st = i < tier ? 'done' : i === tier ? 'here' : 'next'; // klassen blir jr-done osv.
          const sub = st === 'done' ? 'Klar ✓' : st === 'here' ? (next ? `Du är här · ${next[0] - t} ★ kvar` : 'Du är här · högsta nivån! 🏆') : `${min} ★ · ${min - t} kvar`;
          return `<li class="jr jr-${st} ${i % 2 ? 'jr-right' : 'jr-left'}" style="height:${R}px"><span class="jr-badge" aria-hidden="true">${TITLE_BADGES[i]}${st === 'next' ? '<i>🔒</i>' : ''}</span>
            <span class="jr-txt"><small>Nivå ${i + 1}</small><b>${esc(n)}</b><em>${sub}</em>${st === 'here' && next ? `<span class="jr-meter"><i style="width:${Math.round(100 * (t - from) / (next[0] - from))}%"></i></span>` : ''}</span></li>`;
        }).join('')}</ol></div>
        <p class="jr-note">Varje nivå har ett eget märke. Du får det när du når nivån.</p>
        <button class="chunky ghost" data-close>Stäng</button>`);
      const here = $('#sheetBody .jr-here');
      if (here) setTimeout(() => here.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
    };
    badge.setAttribute('aria-label', `Nivå ${tier + 1} av ${TITLES.length}: ${name}. ${t} stjärnor.${next ? ` ${next[0] - t} stjärnor kvar till ${next[1]}.` : ''}`);
    if (shownTier != null && tier > shownTier) { badge.classList.remove('up'); void badge.offsetWidth; badge.classList.add('up'); }
    shownTier = tier;
  }

  // Bara svenska hejarop, så att talsyntesen läser dem rätt
  const CHEERS = ['Hurra!','Jippi!','Toppen!','Snyggt!','Klockrent!','Kanon!','Jättebra!','Grymt!','Superbra!','Mattemagi!','Helt rätt!','Strålande!','Bingo!','Fantastiskt!','Häftigt!','Ja, ja, ja!','Briljant!','Pang på!'];
  // Namnet används i hejarop; utan namn blir det "kompis"
  const nm = () => save.name || 'kompis';
  const nameCheers = () => [`Bra jobbat ${nm()}!`, `Heja ${nm()}!`, `${nm()}, du är en mattestjärna!`, `Så ska det se ut, ${nm()}!`];
  const OOPS = ['Nästan! Försök igen.', 'Oj, inte riktigt. Du klarar det!', 'Prova en gång till!', 'Hmm, räkna en gång till.'];
  const STREAKS = { 3: '3 i rad!', 5: '5 i rad! Hurra!', 7: '7 i rad! Ostoppbar!', 10: '10 i rad! Legendariskt!', 15: '15 i rad! Mästare!', 20: '20 i rad! Otroligt!' };

  /* ================= Världar ================= */
  // Varje värld har egna tal, egen väg till expert, egna medaljer och ett eget diplom.
  const WORLDS = {
    plus: {
      id: 'plus', tab: 'Plus', name: 'Talkamrater', prefix: '', levels: range(1, 20),
      level: n => `Talet ${n}`,
      mixes: [{ label: 'Blandat 1–10', lo: 2, hi: 10, key: 'mix10' }, { label: 'Blandat 1–20', lo: 2, hi: 20, key: 'mix20' }],
      zones: [
        { id: 'z1', name: 'Kompisbyn', from: 1, to: 5, test: { count: 10, pass: 8 } },
        { id: 'z2', name: 'Tiokamratskogen', from: 6, to: 10, test: { count: 12, pass: 10 },
          challenge: { id: 'c10', name: 'Tiokamrater på tid', lo: 10, hi: 10, secs: 60, goal: 12 } },
        { id: 'z3', name: 'Bubbelsjön', from: 11, to: 15, test: { count: 12, pass: 10 } },
        { id: 'z4', name: 'Tjugotoppen', from: 16, to: 20, test: { count: 12, pass: 10 },
          challenge: { id: 'c20', name: 'Blixtrundan 1–20', lo: 1, hi: 20, secs: 60, goal: 10 } }
      ],
      final: { id: 'expert', name: 'Expertprovet', lo: 1, hi: 20, count: 20, pass: 18 },
      medals: { 't-z1': ['🏅', 'Kompisbyns medalj'], 't-z2': ['🌳', 'Skogsmedaljen'], 't-z3': ['🐠', 'Sjömedaljen'], 't-z4': ['⛰️', 'Toppmedaljen'], expert: ['🎓', 'Expertmössan'] },
      expertTitle: 'Talkamratexpert', diploma: 'kan alla talkamrater från 1 till 20 och har klarat Expertprovet.'
    },
    minus: {
      id: 'minus', tab: 'Minus', name: 'Minus', prefix: 'm', levels: range(1, 20),
      level: n => `Minus från ${n}`,
      mixes: [{ label: 'Minus 1–10', lo: 2, hi: 10, key: 'mmix10' }, { label: 'Minus 1–20', lo: 2, hi: 20, key: 'mmix20' }],
      zones: [
        { id: 'mz1', name: 'Svampbyn', from: 1, to: 5, test: { count: 10, pass: 8 } },
        { id: 'mz2', name: 'Igelkottsskogen', from: 6, to: 10, test: { count: 12, pass: 10 },
          challenge: { id: 'mc10', name: 'Minus från 10 på tid', lo: 10, hi: 10, secs: 60, goal: 10 } },
        { id: 'mz3', name: 'Grottsjön', from: 11, to: 15, test: { count: 12, pass: 10 } },
        { id: 'mz4', name: 'Isberget', from: 16, to: 20, test: { count: 12, pass: 10 },
          challenge: { id: 'mc20', name: 'Minusblixten 1–20', lo: 1, hi: 20, secs: 60, goal: 8 } }
      ],
      final: { id: 'mexpert', name: 'Minusprovet', lo: 1, hi: 20, count: 20, pass: 18 },
      medals: { 't-mz1': ['🍄', 'Svampmedaljen'], 't-mz2': ['🦔', 'Igelkottsmedaljen'], 't-mz3': ['🦇', 'Grottmedaljen'], 't-mz4': ['🧊', 'Ismedaljen'], mexpert: ['🧙', 'Minustrollkarlen'] },
      expertTitle: 'Minusexpert', diploma: 'kan räkna minus med alla tal från 1 till 20 och har klarat Minusprovet.'
    },
    dubbel: {
      id: 'dubbel', tab: 'Dubblor', name: 'Dubblor', prefix: 'd', levels: range(1, 10),
      level: n => `Dubblor till ${n}`,
      mixes: [{ label: 'Dubblor 1–5', lo: 1, hi: 5, key: 'dmix5' }, { label: 'Dubblor 1–10', lo: 1, hi: 10, key: 'dmix10' }],
      zones: [
        { id: 'dz1', name: 'Dubbeldalen', from: 1, to: 5, test: { count: 10, pass: 8 } },
        { id: 'dz2', name: 'Spegelslottet', from: 6, to: 10, test: { count: 12, pass: 10 },
          challenge: { id: 'dc1', name: 'Dubbelblixten', lo: 1, hi: 10, secs: 60, goal: 10 } }
      ],
      final: { id: 'dexpert', name: 'Dubbelprovet', lo: 1, hi: 10, count: 15, pass: 13 },
      medals: { 't-dz1': ['🧦', 'Strumpmedaljen'], 't-dz2': ['🏰', 'Slottsmedaljen'], dexpert: ['👯', 'Dubbelmästaren'] },
      expertTitle: 'Dubbelexpert', diploma: 'kan alla dubblor och halvor upp till 20 och har klarat Dubbelprovet.'
    }
  };
  const WORLD_IDS = Object.keys(WORLDS);
  const ALL_MEDALS = Object.assign({}, ...WORLD_IDS.map(w => WORLDS[w].medals));
  const EXPERT_ICON = { plus: '🎓', minus: '🧙', dubbel: '👯' };

  /* ================= Lagring ================= */
  // Testläget (/test/) har en egen server-databas och egna nycklar här, så att
  // det aldrig blandas ihop med det riktiga spelet på samma enhet
  const DEMO = /\/test\/(index\.html)?$/.test(location.pathname);
  const KP = DEMO ? 'talkamrater-test' : 'talkamrater';
  const GUEST_KEY = KP + '-v1';
  const ACCOUNT_KEY = KP + '-account';
  const PREFS_KEY = KP + '-prefs';
  const CLASS_KEY = KP + '-class';
  const ls = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const FIELDS = ['best', 'total', 'rounds', 'stickers', 'path', 'records', 'tricky', 'skill', 'dates', 'swapped', 'pet', 'daily'];
  const freshProgress = () => ({
    best: {}, total: 0, rounds: 0, stickers: [], path: {}, records: {}, tricky: {}, skill: {}, dates: {}, swapped: {},
    pet: { xp: 0, last: 0, born: 0, name: '' }, daily: { day: 0, streak: 0, best: 0, count: 0 }
  });
  const progressOf = s => Object.fromEntries(FIELDS.map(k => [k, s[k]]));
  const hasProgress = p => p && (p.total > 0 || (p.stickers || []).length > 0);
  function withDefaults(base, p) {
    const f = freshProgress();
    const s = Object.assign(base, f, p || {});
    s.pet = Object.assign(f.pet, (p && p.pet) || {});
    s.daily = Object.assign(f.daily, (p && p.daily) || {});
    return s;
  }
  function loadGuest() {
    const g = ls.get(GUEST_KEY) || {};
    return withDefaults({ name: g.name || '' }, g);
  }
  const oldGuest = ls.get(GUEST_KEY) || {};
  const prefs = Object.assign({ sound: oldGuest.sound ?? true, voice: oldGuest.voice ?? true, world: 'plus', seenCheers: {}, flip: null }, ls.get(PREFS_KEY) || {});
  const savePrefs = () => ls.set(PREFS_KEY, prefs);
  if (!WORLDS[prefs.world]) prefs.world = 'plus';

  let save = loadGuest();

  /* ================= Server och synk ================= */
  const net = { online: false, token: null, player: null, timer: 0, inflight: false, classInfo: null, buddy: null };

  async function api(method, path, body) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch('api/' + path, {
        method, cache: 'no-store', signal: ctl.signal,
        headers: { 'content-type': 'application/json', ...(net.token ? { authorization: 'Bearer ' + net.token } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = r.status === 204 ? null : await r.json().catch(() => null);
      if (!r.ok) { const e = new Error((data && data.error) || 'Något gick fel. Försök igen.'); e.status = r.status; throw e; }
      return data;
    } catch (e) {
      if (!e.status) e.message = 'Kommer inte åt servern just nu. Kolla internet och försök igen.';
      throw e;
    } finally { clearTimeout(to); }
  }

  function persist() {
    renderBerries();
    if (net.player) {
      ls.set(ACCOUNT_KEY, { token: net.token, player: net.player, progress: progressOf(save), dirty: true });
      clearTimeout(net.timer);
      net.timer = setTimeout(sync, 800);
    } else {
      ls.set(GUEST_KEY, save);
    }
  }

  async function sync() {
    if (!net.player || net.inflight) return;
    net.inflight = true;
    const sent = JSON.stringify(progressOf(save));
    try {
      const res = await api('PUT', 'me/progress', { progress: JSON.parse(sent) });
      if (JSON.stringify(progressOf(save)) === sent) {
        withDefaults(save, res.progress);
        ls.set(ACCOUNT_KEY, { token: net.token, player: net.player, progress: progressOf(save), dirty: false });
        if (current === 'start') renderStart();
      } else {
        net.timer = setTimeout(sync, 300);
      }
    } catch (e) {
      if (e.status === 401) { await logout(true); }
      else { clearTimeout(net.timer); net.timer = setTimeout(sync, 20000); }
    } finally { net.inflight = false; }
  }
  addEventListener('online', () => { if (net.player) sync(); });

  // Loggar rundan och visar hur mycket den hjälpte klassens veckouppdrag
  async function logRound(r) {
    if (!net.player) return;
    try {
      const res = await api('POST', 'me/rounds', r);
      const m = res && res.mission;
      if (!m) return;
      const before = net.classInfo && net.classInfo.mission ? net.classInfo.mission.mine : null;
      if (net.classInfo) net.classInfo.mission = m;
      const added = before == null ? 0 : m.mine - before;
      if (current === 'done' && added > 0) addDoneRow({ ic: '🤝', t: 'Du hjälpte klassen', s: `+${added} ${esc(m.unit)} · uppdraget är på ${m.progress} av ${m.goal}`, tone: 'class' });
      if (net.classInfo && m.everyone) net.classInfo.mission.everyone = m.everyone;
      // Kompisutmaning: hur långt ni har kommit, och firande när ni klarat den
      const bd = res.buddy;
      if (bd && net.buddy) {
        const was = net.buddy.challenge;
        net.buddy.challenge = bd;
        const grewB = was && was.id === bd.id ? bd.progress - was.progress : 0;
        if (current === 'done' && grewB > 0) addDoneRow({ ic: '🤜', t: `Kompisutmaningen med ${esc(bd.mate.name)}`, s: `${Math.min(bd.progress, bd.goal)} av ${bd.goal} ${esc(bd.unit)}`, tone: 'class' });
        if (bd.justDone) claimBuddy(bd);
      }
      // Klasskamp: hur mycket rundan byggde på klassens berg
      const k = res.contest, ck = net.classInfo && net.classInfo.contest;
      if (k) {
        const mineBefore = ck ? (ck.classes.find(c => c.mine) || {}).progress : null;
        const grew = mineBefore == null ? 0 : k.progress - mineBefore;
        if (ck) { const me = ck.classes.find(c => c.mine); if (me) Object.assign(me, { progress: k.progress, percent: k.percent }); ck.total += Math.max(0, grew); }
        if (current === 'done' && grew > 0) addDoneRow({ ic: '🏔️', t: `Klassens ${esc(k.mountain)}`, s: `+${grew} ${esc(k.unit)} · nu på ${k.percent} %`, tone: 'class' });
        if (k.reached && k.reached.length) {
          const pct = k.reached[k.reached.length - 1];
          const txt = pct >= 100 ? `Vårt ${k.mountain} är klart!` : `Vårt ${k.mountain} är på ${pct} %!`;
          setTimeout(() => { cheer(txt, true); rain(180); sfx.fanfare(); say(`Hurra! ${txt} Nu kör vi!`); }, 2200);
        }
      }
      if (res.completed) {
        setTimeout(() => { cheer('Klassen klarade veckans uppdrag!', true); rain(220); sfx.fanfare(); say('Hurra! Klassen klarade veckans uppdrag!'); }, 1500);
      } else if (res.allIn) {
        setTimeout(() => { cheer('Alla i klassen är med!', true); rain(160); sfx.fanfare(); say('Hurra! Nu har alla i klassen varit med den här veckan!'); }, 1500);
      }
      if (res.allIn || (m.everyone && m.everyone.allIn)) allInBonus(m);
    } catch (e) {}
  }
  // Hemliga presenter från klasskompisar: husdjuret får en godsak, men ingen
  // får veta vem den kom från
  const GIFT_XP = 3;
  let giftsBusy = false;
  async function receiveGifts(gifts) {
    if (!gifts.length || giftsBusy) return;
    giftsBusy = true;
    try {
      await api('POST', 'me/gifts/seen');
      // Klistermärken som någon i klassen har delat med sig av
      const stickerGifts = gifts.filter(g => String(g.treat).startsWith('st:'));
      gifts = gifts.filter(g => !String(g.treat).startsWith('st:'));
      stickerGifts.forEach((g, i) => {
        const st = STICKERS[Number(String(g.treat).slice(4))];
        if (!st) return;
        save.stickers.push(st[0]);
        setTimeout(() => { cheer(`Ett klistermärke från klassen: ${st[0]}`, true); rain(60); say(`Någon i klassen gav dig ett klistermärke: ${lowerName(st[1])}!`); }, 600 + i * 2600);
      });
      if (stickerGifts.length) persist();
      if (!gifts.length) { if (current === 'start') renderStart(); return; }
      for (const g of gifts) { save.pet.xp += GIFT_XP; save.pet.treats = (save.pet.treats || 0) + 1; }
      const t = treatOf({ treat: gifts[gifts.length - 1].treat });
      prefs.lastGift = { day: today(), treat: t[0], n: gifts.length }; savePrefs();
      persist();
      const text = gifts.length === 1 ? `Någon i klassen gav ${petName()} ${t[2]}! ${t[1]}` : `${petName()} fick ${gifts.length} hemliga presenter från klassen! 🎁`;
      setTimeout(() => { cheer(text, true); sfx.streak(); rain(70); say(gifts.length === 1 ? `Någon i klassen gav ${petName()} ${t[2]}!` : `${petName()} fick ${gifts.length} hemliga presenter!`); }, 600);
      if (current === 'start') renderStart();
    } catch (e) {} finally { giftsBusy = false; }
  }
  // Skickas när man klarar dagens utmaning
  async function sendGift() {
    if (!net.player || isSolo()) return;
    try {
      const t = pick(TREATS);
      const r = await api('POST', 'me/gift', { treat: t[0] });
      if (r && r.sent && current === 'done') addDoneRow({ ic: '🎁', t: 'Hemlig present skickad', s: `${t[2]} ${t[1]} till en klasskompis husdjur`, tone: 'class' });
    } catch (e) {}
  }
  // Alla med-bonus: när hela klassen har spelat under veckan får alla ett extra klistermärke
  function allInBonus(m) {
    const wk = dayNumber(new Date(m.start));
    if (!m.start || (save.dates.allin || 0) >= wk) return;
    save.dates.allin = wk;
    const prize = giveSticker(true);
    persist();
    setTimeout(() => { cheer(`Alla med-bonus! ${prize.e}`, true); rain(120); say('Alla i klassen har spelat den här veckan! Du får ett extra klistermärke.'); }, 2600);
  }
  function postEvent(type, detail) { if (net.player && !isSolo()) api('POST', 'me/events', { type, detail: String(detail) }).catch(() => {}); }

  function useAccount(token, player, progress, dirty = false) {
    net.token = token; net.player = player;
    save = withDefaults({ name: player.name }, progress);
    ls.set(ACCOUNT_KEY, { token, player, progress: progressOf(save), dirty });
    if (dirty) sync();
  }

  async function logout(expired) {
    if (DEMO) return startDemo();
    if (net.token && !expired) { try { await api('POST', 'logout'); } catch (e) {} }
    ls.del(ACCOUNT_KEY);
    net.token = null; net.player = null; net.classInfo = null; net.buddy = null;
    save = loadGuest();
    goHome();
    if (expired) cheer('Logga in igen');
  }

  // Eget konto utan klass: inga klassfunktioner
  const isSolo = () => !!(net.player && net.player.solo);
  async function refreshClassInfo() {
    if (!net.player || !net.online || isSolo()) return null;
    try {
      net.classInfo = await api('GET', 'me/class');
      refreshBuddy();
      receiveGifts(net.classInfo.gifts || []);
      if (net.classInfo.mission && net.classInfo.mission.everyone && net.classInfo.mission.everyone.allIn) allInBonus(net.classInfo.mission);
      const seen = prefs.seenCheers[net.player.id] || 0;
      const fresh = net.classInfo.myCheers - seen;
      if (current === 'start') {
        renderStart();
        if (fresh > 0) {
          cheer(fresh === 1 ? 'En kompis hejade på dig!' : `${fresh} kompisar hejade på dig!`, true);
          say(fresh === 1 ? 'En kompis hejade på dig!' : `${fresh} kompisar hejade på dig!`);
          rain(60);
        }
      }
      return net.classInfo;
    } catch (e) { return null; }
  }

  async function boot() {
    if (DEMO) return bootDemo();
    const cached = ls.get(ACCOUNT_KEY);
    if (cached && cached.token && cached.player) {
      net.token = cached.token; net.player = cached.player;
      save = withDefaults({ name: cached.player.name }, cached.progress);
    }
    // Länk från t.ex. klassens webbsida: ?klass=SOL-4821 öppnar "Gå med i klassen"
    let klass = '';
    try {
      const params = new URLSearchParams(location.search);
      klass = (params.get('klass') || '').trim();
      if (params.has('klass')) history.replaceState(null, '', location.pathname);
    } catch (e) {}
    renderStart();
    if (needsWelcome() && !klass) showWelcome();
    try {
      const h = await api('GET', 'health');
      net.online = !!(h && h.app === 'talkamrater');
      voiceState.server = net.online && !!h.tts;
      voiceState.voices = (h && Array.isArray(h.voices) && h.voices.length) ? h.voices : (voiceState.server ? ['standard'] : []);
    } catch (e) { net.online = false; }
    if (net.online && net.token) {
      try {
        const me = await api('GET', 'me');
        // Osparade ändringar från enheten skickas upp och slås ihop på servern
        if (cached.dirty) useAccount(net.token, me.player, cached.progress, true);
        else useAccount(net.token, me.player, me.progress);
      } catch (e) {
        if (e.status === 401) { await logout(true); return; }
      }
    }
    if (current === 'start') renderStart();
    if (current === 'welcome') showWelcome();
    if (klass && !net.player && net.online) openJoin(klass);
    refreshClassInfo();
  }

  /* ================= Ändringslogg ================= */
  // Det nyaste först. Höj APP_VERSION och lägg till en rad när något ändras i spelet.
  const CHANGELOG = [
    ['1.17', '5 okt 2026', ['Tydligare sammanfattning efter en runda, en rad per sak.', 'En tydlig huvudknapp för att gå vidare, och Spela igen under.', 'Lärarens fokus står alltid överst i Idag, och läraren kan välja flera fokus och se vem som tränat.', 'Plutt hoppar själv i Plutts hopp, ingen känguru.', 'Talkamraterna hälsar alltid på Hem, och din figur är profilbilden uppe till höger.', 'Tallinjen och Plutts hopp har ett tal i mitten på de lättare nivåerna.', 'Titeln visar vilken nivå du är på. Tryck på den så ser du hela resan, med ett eget märke för varje nivå.']],
    ['1.16', '5 okt 2026', ['Klappa Plutt på Hem så säger han något.', 'Petar man för många gånger blir han sur, säger till fröken och tar till slut en tupplur.']],
    ['1.15', '5 okt 2026', ['Ändringslogg under Inställningar.', 'Testläge för vuxna: se hur en inbjudan, lärarens fokus eller en kompisutmaning ser ut, utan att röra riktiga elever.', 'Mer luft runt titeln på Hem, och stjärnan rymmer fyra siffror.', 'Mer luft längst ner, ovanför menyn.', 'Idag påminner om Kom ihåg-prov och obesvarade inbjudningar, och ger ett tips om dagen.']],
    ['1.14', '5 okt 2026', ['Plutts nivå syns på Hem, med en mätare till nästa nivå.', 'Idag-rutan har blivit solig och färgglad.']],
    ['1.13', '5 okt 2026', ['🍓 i sidhuvudet och ⚙️ Inställningar för ljud, röst och konto.', '27 nya klistermärken, 60 totalt.', 'Tryck på en medalj så står det hur du får den.', 'Fri träning visar hur många stjärnor du tagit av max.', 'Klasskampen syns i Idag.']],
    ['1.12', '5 okt 2026', ['Ny startsida med flikarna Hem, Träna, Plutt och Klassen.', 'Plutts korg med jordgubbar.', 'Svårare att bli expert: tre stjärnor på allt.']],
    ['1.11', '5 okt 2026', ['Plutt växer i tio steg och får en garderob.', 'Glänsande klistermärken, och dela med klassen.']],
    ['1.10', '5 okt 2026', ['Klistermärken i fyra nivåer, från vanliga till legendariska.', 'Byt dubbletter mot jordgubbar.']],
    ['1.9', '5 okt 2026', ['Kompisutmaning med en kompis på skolan.', 'Nytt!-rutor när något nytt kommer.', 'Svårare Plutts hopp, och "Oj, hjälp!" när han ramlar.']],
    ['1.8', '5 okt 2026', ['Fler utmaningar: tallinjen, Plutts hopp och hemliga ordet.', 'Titeln som en badge med stjärnan.']],
    ['1.7', '4 okt 2026', ['Ny röst som hejar, och röstfigurer att välja mellan.', 'Eget konto utan klass.', 'Skolor och klasskamp där alla hejar på varandra.']],
    ['1.6', '4 okt 2026', ['Längre väg till expert.', 'Klassens gemensamma uppdrag och lagkamp.']],
    ['1.5', '3 okt 2026', ['Välkomstskärm, lärarens fokus och husdjurets önskningar.', 'Installera spelet som en app.']],
    ['1.4', '3 okt 2026', ['Ljud och uppläsning fungerar på iPhone.']],
    ['1.3', '3 okt 2026', ['Minus, dubblor, husdjur, dagens utmaning och kompisduell.']],
    ['1.2', '3 okt 2026', ['Logga in med klassen och följ vägen till expert.']],
    ['1.0', '2 okt 2026', ['Första versionen: träna talkamrater från 1 till 20.']]
  ];
  const APP_VERSION = CHANGELOG[0][0];
  function openChangelog() {
    openSheet(`<h3>Vad är nytt?</h3><p>Du har version ${APP_VERSION}.</p>
      <div class="changelog">${CHANGELOG.map(([v, d, items], i) => `<section class="cl-ver${i === 0 ? ' now' : ''}"><header><b>Version ${v}</b><small>${d}</small></header><ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>`).join('')}</div>
      <div class="sh-actions"><button class="chunky" id="clBack">Tillbaka till inställningar</button></div>`);
    $('#clBack').onclick = () => openSettings();
  }
  $('#changelogBtn').addEventListener('click', () => { sfx.select(); openChangelog(); });

  /* ================= Testläget ================= */
  // En påhittad klass med Alva, Sam och grannklassen. Knapparna låter servern
  // skapa en viss situation, t.ex. en inbjudan från Alva, och sedan visas den
  // precis som för en elev.
  const DEMO_TESTS = [
    ['Kompisutmaning', [['invite', '📩 Alva bjuder in dig'], ['sent', '⏳ Du väntar på svar från Sam'], ['active', '🤝 Pågående utmaning'],
      ['almost', '🏁 Nästan klar (spela en runda)'], ['mateplays', '🦄 Alva spelar en runda']]],
    ['Läraren', [['focus', '✏️ Träna på talkamraterna till 7'], ['focusminus', '✏️ Träna på minus från 10'], ['focusmany', '✏️ Tre fokus på en gång'], ['nofocus', '🧽 Inget fokus']]],
    ['Klassen', [['contest', '🏔️ Klassens berg nästan på 75 %'], ['gift', '🎁 Hemlig present till Plutt'], ['cheer', '👏 Kompisar hejar på dig']]]
  ];
  async function startDemo() {
    try {
      const r = await api('POST', 'demo/start', { name: (save && save.name) || 'Testaren' });
      ls.del(GUEST_KEY);
      useAccount(r.token, r.player, r.progress);
      net.classInfo = null; net.buddy = null;
      await refreshClassInfo();
      startTab = 'home';
      renderStart(); show('start');
    } catch (e) { cheer(e.message); }
  }
  async function bootDemo() {
    $('#demoBar').hidden = false;
    document.body.classList.add('demo');
    renderStart();
    try {
      const h = await api('GET', 'health');
      net.online = !!(h && h.app === 'talkamrater');
      voiceState.server = net.online && !!h.tts;
      voiceState.voices = (h && Array.isArray(h.voices) && h.voices.length) ? h.voices : (voiceState.server ? ['standard'] : []);
    } catch (e) { net.online = false; return cheer('Testläget når inte servern'); }
    const cached = ls.get(ACCOUNT_KEY);
    if (cached && cached.token) {
      net.token = cached.token;
      try { const me = await api('GET', 'me'); useAccount(cached.token, me.player, me.progress); await refreshClassInfo(); renderStart(); return; }
      catch (e) { /* servern har startat om: ny testare */ }
    }
    await startDemo();
  }
  function openDemo() {
    openSheet(`<h3>🧪 Testläge</h3>
      <p>Här är allt på låtsas: en egen klass med Alva och Sam och en grannklass. Inget sparas hos riktiga elever. Välj vad du vill se:</p>
      ${DEMO_TESTS.map(([head, list]) => `<div class="demo-group"><b>${head}</b>${list.map(([id, label]) => `<button class="chunky ghost" data-test="${id}">${label}</button>`).join('')}</div>`).join('')}
      <div class="sh-actions"><button class="chunky coral" data-test="reset">Börja om från början</button><a class="chunky" href="../">Lämna testläget</a><button class="textbtn" data-close>Stäng</button></div>`);
    $$('#sheetBody [data-test]').forEach(b => b.addEventListener('click', () => runDemo(b.dataset.test)));
  }
  async function runDemo(id) {
    closeSheet();
    if (id === 'reset') { ls.del(ACCOUNT_KEY); return startDemo(); }
    try {
      const r = await api('POST', 'demo/scenario', { id });
      // Hämta allt på nytt, precis som när en elev öppnar spelet
      const me = await api('GET', 'me');
      net.player = me.player;
      ls.set(ACCOUNT_KEY, { token: net.token, player: net.player, progress: progressOf(save), dirty: false });
      await refreshClassInfo();
      await refreshBuddy();
      if (current !== 'start') { stopGame(); show('start'); }
      setTab(id === 'contest' ? 'class' : 'home');
      renderStart();
      cheer(r.text);
    } catch (e) {
      if (e.status === 401) return startDemo();
      cheer(e.message);
    }
  }
  $('#demoBtn').addEventListener('click', () => { sfx.select(); openDemo(); });

  /* ================= Installera som app (PWA) ================= */
  let installEvt = null;
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function renderInstall() {
    const card = $('#installCard');
    const visible = !DEMO && net.online && !standalone() && !prefs.installHidden && (installEvt || isIOS);
    card.hidden = !visible;
    if (!visible) return;
    $('#installText').innerHTML = installEvt
      ? 'Lägg spelet på hemskärmen så startar det som en egen app.'
      : 'Tryck på <b>Dela</b>-knappen i Safari och välj <b>Lägg till på hemskärmen</b>. Då startar spelet som en egen app.';
    $('#installBtn').hidden = !installEvt;
  }
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderInstall(); });
  addEventListener('appinstalled', () => { installEvt = null; prefs.installHidden = true; savePrefs(); renderInstall(); });
  $('#installBtn').addEventListener('click', async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch (e) {}
    installEvt = null; renderInstall();
  });
  $('#installHide').addEventListener('click', () => { prefs.installHidden = true; savePrefs(); renderInstall(); });
  if (!DEMO && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  /* ================= Ljud ================= */
  // Mobiler (särskilt iOS) spelar inget webbljud förrän en tryckning har
  // "låst upp" det. Vi låser upp vid första tryckningen och håller ljudet
  // vid liv när appen kommer tillbaka från bakgrunden.
  let ac = null;
  function audioContext() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      // iOS avbryter ljudet ibland (samtal, annan app, talsyntes). Starta igen när det går.
      ac.onstatechange = () => { if (ac.state !== 'running' && ac.state !== 'closed' && !document.hidden) ac.resume().catch(() => {}); };
    }
    return ac;
  }
  function audio() {
    if (!prefs.sound) return null;
    try {
      const a = audioContext();
      if (a && a.state !== 'running') a.resume().catch(() => {});
      return a;
    } catch (e) { return null; }
  }

  // iOS: spela ljud även när telefonen står på ljudlöst (ljudströmbrytaren).
  // Nyare iOS har navigator.audioSession; äldre behöver ett tyst <audio>-element.
  let silentEl = null;
  function silentWavUrl() {
    const rate = 8000, n = rate / 2, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  function playThroughMuteSwitch() {
    try {
      if (navigator.audioSession) { navigator.audioSession.type = 'playback'; return; }
      if (!/iPad|iPhone|iPod/.test(navigator.userAgent) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return;
      if (!silentEl) {
        silentEl = document.createElement('audio');
        silentEl.setAttribute('x-webkit-airplay', 'deny');
        silentEl.preload = 'auto'; silentEl.loop = true; silentEl.src = silentWavUrl();
      }
      silentEl.play().catch(() => {});
    } catch (e) {}
  }

  let unlocked = false;
  function unlockAudio() {
    // Rösten från servern spelas också som vanligt ljud, så lås upp för den med
    if (prefs.sound || prefs.voice) {
      playThroughMuteSwitch();
      try {
        const a = audioContext();
        if (a) {
          if (a.state !== 'running') a.resume().catch(() => {});
          // En kort tyst ton i samma tryckning låser upp ljudet på iOS
          const b = a.createBuffer(1, 1, 22050), src = a.createBufferSource();
          src.buffer = b; src.connect(a.destination); src.start(0);
        }
      } catch (e) {}
    }
    if (!unlocked && prefs.voice && window.speechSynthesis) {
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0; u.lang = 'sv-SE';
        speechSynthesis.speak(u);
      } catch (e) {}
    }
    unlocked = true;
  }
  // Varje tryckning ser till att ljudet är igång (iOS pausar det i bakgrunden)
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, () => {
    if (!unlocked || (ac && ac.state !== 'running') || (silentEl && silentEl.paused)) { unlockAudio(); warmVoice(); }
  }, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (silentEl) silentEl.pause(); }
    else unlocked = false; // lås upp igen vid nästa tryckning
  });

  function tone(freq, start, dur, type = 'sine', vol = 0.18, toFreq) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + start;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const sfx = {
    right() { tone(784, 0, .14); tone(1047, .09, .18); tone(1319, .18, .32); },
    quick() { tone(988, 0, .1); tone(1319, .06, .16); },
    wrong() { tone(330, 0, .16, 'triangle', .14); tone(247, .14, .28, 'triangle', .14); },
    pop() { tone(500, 0, .09, 'sine', .22, 1400); tone(1800, .05, .06, 'triangle', .06); },
    select() { tone(660, 0, .07, 'sine', .1); },
    tick() { tone(880, 0, .08, 'square', .05); },
    streak() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .06, .16, 'square', .06)); },
    fanfare() {
      [[523,0],[659,.12],[784,.24],[1047,.36]].forEach(([f, s]) => tone(f, s, .2, 'triangle', .16));
      [1047, 1319, 1568].forEach(f => tone(f, .55, .7, 'triangle', .1));
    },
    sad() { [523, 494, 440].forEach((f, i) => tone(f, i * .18, .3, 'triangle', .1)); },
    // Visslande fall när Plutt ramlar
    fall() { tone(900, 0, .7, 'sine', .14, 160); tone(140, .72, .18, 'triangle', .16, 80); }
  };

  /* ================= Röst ================= */
  // Två vägar:
  // 1. Serverns röst (Piper). Färdiga ljudfiler som spelas som vanligt ljud.
  //    Fungerar på iPhone, i hemskärmsappen och även i ljudlöst läge.
  // 2. Annars telefonens egen talsyntes (Web Speech). Den är opålitlig på mobiler.
  const speechText = text => String(text).replaceAll(MINUS, ' minus ').replace(/(\d)\s*-\s*(\d)/g, '$1 minus $2')
    .replaceAll('+', ' plus ').replaceAll('=', ' är ').replace(/[^\p{L}\p{N}\s!?,.'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  const voiceState = { server: false, voices: [], last: '', error: '' };
  // Röstfigurer. Servern har två riktiga röster (lisa och nst). Plutt är Lisa
  // uppspelad lite fortare och ljusare, Robot får en metallisk ton här i telefonen.
  const VOICE_FIGS = [
    { id: 'plutt', label: '💜 Plutt', voice: 'lisa', rate: 1.17, sample: n => `Hej ${n}! Jag är Plutt. Nu räknar vi!` },
    { id: 'lisa', label: '👩 Lisa', voice: 'lisa', rate: 1.0, sample: n => `Hej ${n}! Jag heter Lisa. Vad bra du räknar!` },
    { id: 'nils', label: '👨 Nils', voice: 'nst', rate: 1.04, sample: n => `Hej ${n}! Jag heter Nils. Kör hårt!` },
    { id: 'robot', label: '🤖 Robot', voice: 'nst', rate: 0.96, robot: true, sample: n => `Bip bop. Hej ${n}. Jag är en räknerobot.` }
  ];
  // Plutt och Robot fungerar med vilken röst som helst, Lisa och Nils kräver sin röst
  const figsAvailable = () => VOICE_FIGS.filter(f => f.id === 'plutt' || f.id === 'robot' || voiceState.voices.includes(f.voice));
  const voiceFig = () => { const list = figsAvailable(); return list.find(f => f.id === prefs.voiceFig) || list[0] || VOICE_FIGS[0]; };
  const serverVoiceOf = f => (voiceState.voices.includes(f.voice) ? f.voice : voiceState.voices[0] || '');
  const ttsCache = new Map(); // text -> Promise<AudioBuffer>
  let ttsSrc = null, sayId = 0;
  function decode(a, buf) {
    // Äldre Safari kan bara avkoda med callback
    return new Promise((res, rej) => { const p = a.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); });
  }
  function ttsBuffer(text, voice = serverVoiceOf(voiceFig())) {
    const key = voice + '|' + text;
    if (ttsCache.has(key)) return ttsCache.get(key);
    const p = fetch('api/tts?t=' + encodeURIComponent(text) + (voice ? '&v=' + encodeURIComponent(voice) : ''))
      .then(r => { if (!r.ok) throw new Error('tts ' + r.status); return r.arrayBuffer(); })
      .then(buf => decode(audioContext(), buf));
    p.catch(() => ttsCache.delete(key));
    ttsCache.set(key, p);
    if (ttsCache.size > 120) ttsCache.delete(ttsCache.keys().next().value);
    return p;
  }
  // Hämta de vanligaste hejaropen i förväg, så att de kommer direkt
  let warmed = '';
  function warmVoice() {
    const v = serverVoiceOf(voiceFig());
    if (warmed === v || !voiceState.server || !prefs.voice || !audioContext()) return;
    warmed = v;
    const list = [...CHEERS, ...nameCheers(), ...OOPS, ...Object.values(STREAKS)].map(speechText);
    (async () => { for (const t of list) { if (warmed !== v) return; try { await ttsBuffer(t, v); } catch (e) { return; } } })();
  }
  function say(text) {
    if (!prefs.voice) return;
    const clean = speechText(text);
    if (!clean) return;
    const id = ++sayId;
    stopVoiceOutput();
    const a = voiceState.server ? audioContext() : null;
    if (!a) return sayNative(clean);
    const fig = voiceFig();
    ttsBuffer(clean, serverVoiceOf(fig)).then(buf => {
      if (id !== sayId) return; // något nyare ska sägas
      if (a.state !== 'running') a.resume().catch(() => {});
      const src = a.createBufferSource(), g = a.createGain();
      g.gain.value = 1;
      src.buffer = buf;
      src.playbackRate.value = fig.rate; // högre tempo = ljusare röst
      if (fig.robot) {
        // Ringmodulering: rösten gånger en låg ton ger en metallisk robotröst
        const carrier = a.createOscillator(), ring = a.createGain(), dry = a.createGain();
        carrier.type = 'sine'; carrier.frequency.value = 60;
        ring.gain.value = 0; carrier.connect(ring.gain);
        dry.gain.value = 0.35;
        src.connect(ring).connect(g); src.connect(dry).connect(g);
        carrier.start();
        src.onended = () => { try { carrier.stop(); } catch (e) {} };
      } else src.connect(g);
      g.connect(a.destination);
      src.start();
      ttsSrc = src;
      voiceState.last = 'server';
    }).catch(e => { voiceState.error = e.message; if (id === sayId) sayNative(clean); });
  }

  let voices = [];
  const loadVoices = () => { try { voices = speechSynthesis.getVoices() || []; } catch (e) {} };
  if (window.speechSynthesis) {
    loadVoices();
    try { speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (e) {}
  }
  const swedishVoice = () => {
    const sv = voices.filter(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith('sv'));
    // Föredra bättre röster (Enhanced/Premium/Google) om de finns
    return sv.find(v => /enhanced|premium|förbättrad|google/i.test(v.name)) || sv[0] || null;
  };
  let currentUtterance = null, speakTimer = 0;
  function sayNative(text) {
    if (!window.speechSynthesis) return;
    try {
      const s = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'sv-SE';
      const v = swedishVoice();
      if (v) u.voice = v;
      const fig = voiceFig();
      u.rate = 1.05; u.pitch = fig.id === 'plutt' ? 1.4 : fig.id === 'robot' ? 0.6 : 1.1;
      u.onstart = () => { voiceState.last = 'native'; };
      u.onerror = e => { voiceState.error = 'telefonens röst: ' + (e.error || 'fel'); };
      currentUtterance = u; // håll kvar referensen, annars kan Safari tappa meningen
      clearTimeout(speakTimer);
      if (s.speaking || s.pending) {
        // iOS tappar ibland det som sägs direkt efter cancel(), så vänta lite
        s.cancel();
        speakTimer = setTimeout(() => s.speak(u), 80);
      } else {
        if (s.paused) s.resume();
        s.speak(u);
      }
    } catch (e) {}
  }
  function stopVoiceOutput() {
    if (ttsSrc) { try { ttsSrc.stop(); } catch (e) {} ttsSrc = null; }
    clearTimeout(speakTimer);
    try { if (window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel(); } catch (e) {}
  }
  function stopSpeech() { sayId++; stopVoiceOutput(); }

  function renderVoicePick() {
    const figs = figsAvailable();
    $('#voicePickBox').hidden = !voiceState.server || !prefs.voice || figs.length < 2;
    const row = $('#voicePick'); row.innerHTML = '';
    const cur = voiceFig();
    figs.forEach(f => {
      const b = document.createElement('button');
      b.className = 'chip'; b.textContent = f.label; b.setAttribute('aria-pressed', String(f.id === cur.id));
      b.addEventListener('click', () => {
        prefs.voiceFig = f.id; savePrefs(); unlockAudio();
        renderVoicePick(); say(f.sample(nm())); warmVoice();
      });
      row.appendChild(b);
    });
  }

  // "Testa ljudet": spelar en ton och säger en mening, och visar vad som händer.
  // Bra för att felsöka på en telefon.
  async function soundTest() {
    unlockAudio();
    const box = $('#soundStatus'); box.hidden = false;
    const a = audioContext();
    const lines = [];
    const wasSound = prefs.sound, wasVoice = prefs.voice;
    prefs.sound = true; prefs.voice = true;
    sfx.fanfare();
    lines.push(`Ljud: ${a ? a.state : 'saknas'}${navigator.audioSession ? ` · läge ${navigator.audioSession.type}` : ''}${silentEl ? ' · tyst spår ' + (silentEl.paused ? 'pausat' : 'spelar') : ''}`);
    lines.push(voiceState.server ? `Röst: ${voiceFig().label.replace(/^\S+ /, '')} från servern (${voiceState.voices.join(', ')})` : 'Röst: telefonens egen');
    loadVoices();
    const sv = swedishVoice();
    lines.push(window.speechSynthesis ? `Telefonens röster: ${voices.length}, svensk: ${sv ? sv.name : 'ingen'}` : 'Telefonen har ingen talsyntes');
    box.textContent = lines.join('\n') + '\nSpelar upp …';
    voiceState.error = ''; voiceState.last = '';
    setTimeout(() => say(`Hej ${nm()}! Hör du mig? Sju plus tre är tio.`), 900);
    setTimeout(() => {
      prefs.sound = wasSound; prefs.voice = wasVoice;
      lines.push(voiceState.last === 'server' ? 'Talet spelades från servern ✓'
        : voiceState.last === 'native' ? 'Talet spelades med telefonens röst ✓'
        : `Talet startade inte${voiceState.error ? ` (${voiceState.error})` : ''}`);
      lines.push(prefs.sound && prefs.voice ? 'Hörde du inget? Kolla volymen och att telefonen inte är på stör ej.' : 'Obs: ljud eller röst är avstängt i spelet (knapparna högst upp).');
      box.textContent = lines.join('\n');
    }, 4000);
  }

  /* ================= Konfetti och hejarop ================= */
  const cv = $('#fx'), cx = cv.getContext('2d');
  const COLORS = ['#2F6BFF', '#FF6B3D', '#FFC83D', '#1FA866', '#E23D7A', '#FFFFFF'];
  let parts = [], raf = 0;
  // Ritytans storlek i CSS-pixlar. Används i stället för innerWidth/innerHeight, som
  // ändras utan resize-händelse på iPhone (zoom, adressfält) och då lämnade spår kvar.
  let fxW = 0, fxH = 0;
  function sizeCanvas() {
    const d = window.devicePixelRatio || 1;
    fxW = cv.clientWidth || innerWidth; fxH = cv.clientHeight || innerHeight;
    cv.width = Math.round(fxW * d); cv.height = Math.round(fxH * d);
    cx.setTransform(d, 0, 0, d, 0, 0);
  }
  addEventListener('resize', sizeCanvas); sizeCanvas();
  if (window.visualViewport) visualViewport.addEventListener('resize', sizeCanvas);
  // Rensa hela ritytan, oavsett transform och storlek
  function clearFx() {
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); cx.restore();
  }
  const MAX_PARTS = 500;
  function burst(x, y, n = 40, power = 1) {
    if (reduced) n = Math.min(n, 8);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, sp = (3 + Math.random() * 7) * power;
      parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 4 * power, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
        r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: pick(COLORS), life: 80 + Math.random() * 40 });
    }
    startFx();
  }
  function rain(n = 160) {
    if (reduced) n = 20;
    for (let i = 0; i < n; i++) {
      parts.push({ x: Math.random() * fxW, y: -20 - Math.random() * fxH * .6, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3,
        w: 7 + Math.random() * 6, h: 10 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: pick(COLORS), life: 260 });
    }
    startFx();
  }
  function startFx() {
    if (parts.length > MAX_PARTS) parts = parts.slice(parts.length - MAX_PARTS);
    if (cv.clientWidth !== fxW || cv.clientHeight !== fxH) sizeCanvas();
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    clearFx();
    // Bort med allt som är klart eller har hamnat utanför skärmen
    parts = parts.filter(p => p.life > 0 && p.y < fxH + 40 && p.x > -60 && p.x < fxW + 60);
    for (const p of parts) {
      p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2);
      cx.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) clearFx();
  }
  // Appen i bakgrunden: släpp konfettin, så att inget ligger kvar när man kommer tillbaka
  document.addEventListener('visibilitychange', () => { if (document.hidden) { parts = []; if (raf) cancelAnimationFrame(raf); raf = 0; clearFx(); } });
  const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  function cheer(text, mega = false) {
    const d = document.createElement('div');
    d.className = 'cheer' + (mega ? ' mega' : '');
    d.textContent = text;
    document.body.appendChild(d);
    // Krymp texten tills den får plats på skärmen (även långa ord på mobil)
    let size = parseFloat(getComputedStyle(d).fontSize);
    while (size > 22 && (d.scrollWidth > d.clientWidth || d.scrollHeight > size * 2.3)) {
      size -= 2; d.style.fontSize = size + 'px';
    }
    setTimeout(() => d.remove(), 1300);
  }

  /* ================= Skärmar ================= */
  let current = 'start';
  let G = null, D = null, timer = 0, ticker = 0;
  function show(id) {
    current = id;
    $$('.screen').forEach(s => { s.hidden = s.id !== id; });
    document.body.classList.toggle('duel-mode', id === 'duel');
    document.body.classList.toggle('on-start', id === 'start');
    window.scrollTo({ top: 0 });
  }
  function talk(text, mood) {
    const scr = $('#' + current);
    const sp = $('.speech', scr), m = $('.mascot', scr);
    if (sp) sp.textContent = text;
    if (m && mood) { m.classList.remove('happy', 'oops'); void m.offsetWidth; m.classList.add(mood); }
  }
  function stopGame() {
    wishNote = null;
    stopSpeech();
    clearTimeout(timer); clearInterval(ticker);
    G = null; D = null;
  }
  function goHome() { if (needsWelcome()) return showWelcome(); stopGame(); renderStart(); show('start'); }

  const starStr = n => [0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}">★</span>`).join('');
  const mascotHTML = '<div class="mascot happy" aria-hidden="true"><div class="eyes"><i></i><i></i></div><div class="mouth"></div><i class="pal"></i></div>';
  const myFace = () => (net.player ? net.player.avatar : '🙂');
  const W = () => WORLDS[prefs.world];
  function bestOf(w, n) {
    const p = WORLDS[w].prefix;
    return Math.max(save.best[p + n + ':find'] || 0, w === 'plus' ? save.best[n + ':bubbles'] || 0 : 0);
  }

  /* ================= Dagnummer ================= */
  const dayNumber = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const today = () => dayNumber();

  /* ================= Husdjuret ================= */
  // Husdjuret växer av jordgubbar/stjärnfrukter (stjärnor från rundor, önskningar,
  // presenter, kompisutmaningar och bytta klistermärken). Tio steg, och det ska ta
  // väldigt många rundor att bli kung och legend. Speglas i server/src/display.js.
  const PET_STAGES = [[0, 'Ägg'], [20, 'Bebis'], [80, 'Knatte'], [180, 'Liten'], [350, 'Skolplutt'], [600, 'Stor'],
    [1000, 'Superplutt'], [1600, 'Jätte'], [2500, 'Kung'], [4000, 'Legend']];
  const PET_ICONS = ['🥚', '🐣', '🧸', '🐾', '🎒', '💜', '🦸', '✨', '👑', '🌟'];
  // Vad husdjuret säger när man klappar det, olika för varje steg
  const PET_LINES = [
    ['Knack knack!', 'Det rör sig där inne!', 'Snart, snart …'],
    ['Bä-bä! 😢', 'Jag vill ha mjölk!', 'Gosa med mig!', 'Bu-hu, jag är så liten …'],
    ['Hihi, det kittlas!', 'Leka! Leka!', 'Titta, jag kan hoppa!', 'Mer! Mer!'],
    ['Mer matte!', 'Vet du vad 7 + 3 är? Tio!', 'Jag gillar dig, {n}!', 'Mums, jordgubbar!'],
    ['Jag har pluggat talkamrater!', 'Visste du att 6 + 4 också blir 10?', 'Läxor? Ja tack!', 'Glasögonen gör mig smart.'],
    ['Jag är stor och stark nu!', 'Vi är ett bra lag, {n}!', 'Kom igen, en runda till!'],
    ['Superplutt till undsättning!', 'Inget tal är för svårt för oss!', 'Wohoo, jag kan nästan flyga!'],
    ['JÄTTEMYCKET matte!', 'Jag är så stor att jag ser hela skolan!', 'En jätte behöver jättemycket jordgubbar.'],
    ['Jag, Kung Plutt, befaller: mer matte!', 'Ganska coolt att vara kung, va?', 'Snyggt jobbat, mitt kungliga räknegeni!'],
    ['Jag är en legend, och det är du också, {n}!', 'Vi har klarat allt tillsammans!', 'Legendariskt!']
  ];
  // Plutts garderob: saker som köps med jordgubbar från korgen (price).
  // Finare saker kostar mer och kräver ett större husdjur (stage).
  const WARDROBE = [
    { id: 'keps', icon: '🧢', name: 'Keps', slot: 'head', price: 20, stage: 1 },
    { id: 'rosett', icon: '🎀', name: 'Rosett', slot: 'neck', price: 20, stage: 1 },
    { id: 'halsduk', icon: '🧣', name: 'Halsduk', slot: 'neck', price: 40, stage: 2 },
    { id: 'solhatt', icon: '👒', name: 'Solhatt', slot: 'head', price: 50, stage: 2 },
    { id: 'glasogon', icon: '👓', name: 'Glasögon', slot: 'face', price: 70, stage: 3 },
    { id: 'solglas', icon: '🕶️', name: 'Solglasögon', slot: 'face', price: 100, stage: 4 },
    { id: 'mossa', icon: '🎓', name: 'Studentmössa', slot: 'head', price: 120, stage: 4 },
    { id: 'hogatt', icon: '🎩', name: 'Hög hatt', slot: 'head', price: 180, stage: 5 },
    { id: 'mantel', icon: '🦸', name: 'Supermantel', slot: 'back', price: 250, stage: 5 },
    { id: 'guldkrona', icon: '👑', name: 'Guldkrona', slot: 'head', price: 450, stage: 6 },
    { id: 'regnbage', icon: '🌈', name: 'Regnbågsmantel', slot: 'back', price: 600, stage: 7 }
  ];
  const SLOT_NAME = { head: 'huvudet', face: 'ögonen', neck: 'halsen', back: 'ryggen' };
  const ownsItem = id => (save.records['it-' + id] || 0) > 0;
  const petWear = () => String(save.pet.wear || '').split(',').filter(id => ownsItem(id));
  // Högst en önskan per dag, och inte alla dagar, så att det inte blir tjat
  const WISH_XP = 5, WISHES_PER_DAY = 1;
  const petStage = xp => PET_STAGES.reduce((s, [min], i) => (xp >= min ? i : s), 0);
  const petName = () => save.pet.name || 'Plutt';

  // Önskningar: "Lös det här så får jag en glass!"
  const TREATS = [['glass', '🍦', 'en glass'], ['pizza', '🍕', 'en pizzabit'], ['banan', '🍌', 'en banan'], ['tarta', '🎂', 'en tårtbit'],
    ['kaka', '🍪', 'en kaka'], ['popcorn', '🍿', 'popcorn'], ['boll', '⚽', 'en ny boll'], ['ballong', '🎈', 'en ballong'], ['jordgubb', '🍓', 'jordgubbar']];
  const inWorld = (w, fn) => () => { prefs.world = w; savePrefs(); roadContext = false; fn(); };
  const WISH_TYPES = {
    answers: { make: () => ({ need: pick([10, 12, 15]) }), text: w => `Svara rätt på ${w.need} frågor`, go: () => inWorld('plus', () => startMix(1))() },
    minus: { make: () => ({ need: pick([6, 8]) }), text: w => `Svara rätt på ${w.need} minusfrågor`, go: () => inWorld('minus', () => startMix(0))() },
    dubbel: { make: () => ({ need: pick([5, 6]) }), text: w => `Svara rätt på ${w.need} dubbelfrågor`, go: () => inWorld('dubbel', () => startMix(1))() },
    bubbles: { make: () => ({ n: rnd(6, 14) }), text: w => `Poppa alla bubbelpar som blir ${w.n}`, go: w => inWorld('plus', () => startBubbles(w.n))() },
    number: { make: () => ({ n: rnd(5, 18) }), text: w => `Klara talet ${w.n} med minst två stjärnor`, go: w => inWorld('plus', () => startFindLevel('plus', w.n))() },
    streak: { make: () => ({}), text: () => 'Få 5 rätt i rad', go: () => inWorld('plus', () => startMix(1))() },
    stars3: { make: () => ({}), text: () => 'Få tre stjärnor på en runda', go: () => inWorld('plus', () => startMix(0))() },
    daily: { make: () => ({}), ok: () => !dailyDone(), text: () => 'Klara dagens utmaning', go: () => startDaily() },
    focus: { make: () => ({ f: pick(teacherFocuses()) }), ok: () => !!teacherFocus(), text: w => `Träna ${focusText(w.f || teacherFocus())} en gång`,
      go: w => startFocus(w.f || teacherFocus()) }
  };
  const treatOf = w => TREATS.find(t => t[0] === (w && w.treat)) || TREATS[0];
  const wishDay = () => { const d = today(); return (d * 7 + (save.pet.born || 0)) % 3 !== 0; }; // två dagar av tre
  function newWish() {
    const types = Object.keys(WISH_TYPES).filter(t => !WISH_TYPES[t].ok || WISH_TYPES[t].ok());
    // Har läraren satt ett fokus blir det ofta önskan
    const type = teacherFocus() && Math.random() < 0.5 ? 'focus' : pick(types);
    return { type, need: 1, have: 0, n: 0, ...WISH_TYPES[type].make(), treat: pick(TREATS)[0], day: today() };
  }
  function currentWish() {
    const p = save.pet;
    if (petStage(p.xp) === 0) return null;
    if (p.wishDay !== today()) { p.wishDay = today(); p.wishCount = 0; p.wish = null; }
    if (p.wish && !WISH_TYPES[p.wish.type]) p.wish = null;
    if (!p.wish && p.wishCount < WISHES_PER_DAY && wishDay()) { p.wish = newWish(); persist(); }
    return p.wish;
  }
  let wishNote = null;
  function wishProgress(ev) {
    const p = save.pet, w = p.wish;
    if (!w || w.day !== today()) return;
    let hit = false;
    switch (w.type) {
      case 'answers': hit = ev.kind === 'answer'; break;
      case 'minus': hit = ev.kind === 'answer' && ev.w === 'minus'; break;
      case 'dubbel': hit = ev.kind === 'answer' && ev.w === 'dubbel'; break;
      case 'streak': hit = ev.kind === 'answer' && ev.streak >= 5; break;
      case 'bubbles': hit = ev.kind === 'round' && ev.game === 'bubbles' && ev.n === w.n; break;
      case 'number': hit = ev.kind === 'round' && ev.game === 'find' && ev.kindOf === 'train' && ev.world === 'plus' && ev.n === w.n && ev.stars >= 2; break;
      case 'stars3': hit = ev.kind === 'round' && ev.stars === 3; break;
      case 'daily': hit = ev.kind === 'round' && ev.daily; break;
      case 'focus': hit = ev.kind === 'round' && ev.focus; break;
    }
    if (!hit) return;
    w.have = Math.min(w.need, w.have + 1);
    if (w.have < w.need) return;
    const t = treatOf(w);
    p.wish = null; p.wishCount++; p.treats++;
    const grew = feedPet(WISH_XP);
    wishNote = { t, grew };
    setTimeout(() => { cheer(`${petName()} fick ${t[2]}! ${t[1]}`, true); sfx.streak(); say(`Tack ${nm()}! Nu fick jag ${t[2]}!`); }, 700);
  }

  function petMood() {
    const p = save.pet;
    const st = petStage(p.xp);
    if (st === 0) {
      const left = PET_STAGES[1][0] - p.xp;
      return { cls: p.last ? 'mood-happy' : 'mood-new', text: p.last ? `Ägget gungar! ${left} 🍓 till så kläcks det.` : 'Ägget väntar på dig. Varje stjärna du tar värmer det!' };
    }
    const days = p.last ? today() - p.last : 99;
    if (days >= 2) {
      if (st === 1) return { cls: 'mood-hungry', text: `Bu-hu! ${petName()} gråter av hunger 😢 Spela en runda så blir det bra igen.` };
      if (st >= 8) return { cls: 'mood-hungry', text: `${st === 8 ? 'Kungen' : 'Legenden'} är hungrig! Ett kungligt mål mat, tack. 👑` };
      return { cls: 'mood-hungry', text: days <= 3 ? `${petName()} är hungrig! Spela en runda för att mata.` : `${petName()} har längtat efter dig! En runda så blir allt bra igen.` };
    }
    if (prefs.lastGift && prefs.lastGift.day === today()) {
      const t = treatOf({ treat: prefs.lastGift.treat });
      return { cls: 'mood-happy', text: `${petName()} fick ${t[2]} ${t[1]} från någon i klassen idag! 🎁` };
    }
    if (p.wishDay === today() && p.wishCount >= WISHES_PER_DAY) return { cls: 'mood-happy', text: `${petName()} fick sin önskan idag och är överlycklig! 💜` };
    if (p.wish) return { cls: days <= 0 ? 'mood-happy' : 'mood-ok', text: days <= 0 ? `${petName()} är mätt men har en önskan …` : `${petName()} har en önskan idag.` };
    if (st === 1 && days > 0) return { cls: 'mood-ok', text: `${petName()} snyftar lite och vill ha mat. 🥺` };
    if (st >= 8) return { cls: days <= 0 ? 'mood-happy' : 'mood-ok', text: days <= 0 ? `${petName()} sitter på tronen och ser väldigt cool ut. 😎` : `Kung ${petName()} väntar på dagens matte.` };
    return { cls: days <= 0 ? 'mood-happy' : 'mood-ok', text: days <= 0 ? pick([`${petName()} är mätt och glad!`, `${petName()} gillar att räkna med dig!`]) : `${petName()} undrar om ni ska spela idag.` };
  }
  // Husdjuret ritat med CSS. Varje steg får nya detaljer: bebisen har tårar,
  // skolplutten glasögon, superplutten mantel, kungen krona och solglasögon,
  // legenden en glänsande aura. wear = saker från garderoben.
  function petHTML(stage, moodCls, wear = []) {
    if (stage === 0) return `<div class="pet egg ${moodCls}" aria-hidden="true"><i class="spot s1"></i><i class="spot s2"></i><i class="spot s3"></i></div>`;
    const has = id => wear.includes(id);
    const cape = has('mantel') ? 'cape red' : has('regnbage') ? 'cape rainbow' : stage === 6 || stage === 7 ? 'cape red' : stage === 9 ? 'cape gold' : '';
    const head = WARDROBE.find(w => w.slot === 'head' && has(w.id));
    const face = WARDROBE.find(w => w.slot === 'face' && has(w.id));
    const neck = WARDROBE.find(w => w.slot === 'neck' && has(w.id));
    return `<div class="pet stage-${stage} ${moodCls}${stage === 9 ? ' legend' : ''}" aria-hidden="true">
      ${cape ? `<i class="${cape}"></i>` : ''}
      ${stage >= 3 ? '<i class="horn h1"></i><i class="horn h2"></i>' : ''}
      ${stage >= 5 ? '<i class="wing w1"></i><i class="wing w2"></i>' : ''}
      ${stage === 2 ? '<i class="tuft"></i>' : ''}
      <i class="belly"></i><i class="eye e1"></i><i class="eye e2"></i><i class="mouth"></i>
      ${stage >= 2 ? '<i class="cheek c1"></i><i class="cheek c2"></i>' : ''}
      ${stage === 1 ? '<i class="tear t1"></i><i class="tear t2"></i>' : ''}
      ${face ? `<span class="acc face">${face.icon}</span>` : stage === 4 ? '<i class="specs"></i>' : stage >= 8 ? '<span class="acc face">🕶️</span>' : ''}
      ${head ? `<span class="acc head">${head.icon}</span>` : stage >= 8 ? '<span class="crown">👑</span>' : ''}
      ${neck ? `<span class="acc neck">${neck.icon}</span>` : ''}
      ${stage === 9 ? '<i class="sparkle k1">✨</i><i class="sparkle k2">✨</i>' : ''}
    </div>`;
  }
  function feedPet(food) {
    const p = save.pet;
    const before = petStage(p.xp);
    if (food > 0) { p.xp += food; p.last = today(); if (!p.born) p.born = today(); }
    const after = petStage(p.xp);
    return after > before ? after : 0;
  }
  function renderPet() {
    const st = petStage(save.pet.xp), wish = currentWish(), mood = petMood();
    $('#petView').innerHTML = petHTML(st, mood.cls, petWear());
    $('#petName').textContent = petName();
    $('#petStageName').textContent = `Nivå ${st + 1} av ${PET_STAGES.length} · ${PET_STAGES[st][1]}`;
    $('#petMood').textContent = mood.text;
    const next = PET_STAGES[st + 1];
    const from = PET_STAGES[st][0];
    $('#petMeter').style.width = next ? (100 * (save.pet.xp - from) / (next[0] - from)) + '%' : '100%';
    $('#petNext').textContent = next ? `${next[0] - save.pet.xp} 🍓 kvar tills ${petName()} blir ${next[1].toLowerCase()} (steg ${st + 1} av ${PET_STAGES.length})` : `${petName()} är en legend! Högsta steget. 🌟`;
    const box = $('#petWish');
    box.hidden = !wish;
    if (wish) {
      const t = treatOf(wish);
      $('#wishIcon').textContent = t[1];
      $('#wishText').textContent = `"Lös det här så får jag ${t[2]}!" ${WISH_TYPES[wish.type].text(wish)}.`;
      $('#wishMeter').style.width = (100 * wish.have / wish.need) + '%';
      $('#wishCount').textContent = wish.need > 1 ? `${wish.have} av ${wish.need}` : (wish.have ? 'Klart!' : 'Inte klart än');
      $('#wishBtn').textContent = `Hjälp ${petName()}!`;
    }
  }
  $('#ctFocusBtn').addEventListener('click', () => startFocus());
  $('#wishBtn').addEventListener('click', () => { const w = save.pet.wish; if (w && WISH_TYPES[w.type]) WISH_TYPES[w.type].go(w); });
  // Petar man för många gånger i rad blir husdjuret trött på det, och till slut tar det en tupplur
  const PET_ANNOYED = ['Aj aj!', 'Aj! Inte så hårt!', 'Det där kittlas inte längre …', 'Nu räcker det faktiskt!', 'Sluta pilla på mig!',
    'Jag säger till fröken!', 'Hörru, jag är inte en knapp!', 'Hmpf! Nu blir jag sur.', 'Okej, nu tar jag en tupplur. Zzz …'];
  const PET_SLEEPY = ['Zzz …', 'Pssst, jag sover.', 'Snark … fem plus fem … snark …', 'Väck mig sen, {n}.'];
  const PET_CALM = 5, PET_WINDOW = 6000, PET_NAP = 15000;
  let petTaps = [], petNapUntil = 0, petLast = '';
  // Inte samma mening två gånger i rad
  const freshLine = list => pick(list.length > 1 ? list.filter(x => x !== petLast) : list);
  function petTap(el, out) {
    if (!el) return;
    const now = Date.now(), st = petStage(save.pet.xp);
    petTaps = petTaps.filter(x => now - x < PET_WINDOW);
    petTaps.push(now);
    let line, mood = 'jump';
    if (now < petNapUntil) { line = freshLine(PET_SLEEPY); mood = 'sleepy'; }
    else if (petTaps.length > PET_CALM) {
      const i = Math.min(petTaps.length - PET_CALM - 1, PET_ANNOYED.length - 1);
      line = PET_ANNOYED[i]; mood = 'grumpy';
      if (i === PET_ANNOYED.length - 1) {
        petNapUntil = now + PET_NAP; petTaps = []; mood = 'sleepy';
        setTimeout(() => $$('.pet.sleepy').forEach(p => p.classList.remove('sleepy')), PET_NAP);
      }
    } else line = freshLine(PET_LINES[st]);
    petLast = line;
    line = line.replace('{n}', nm());
    el.classList.remove('jump', 'grumpy', 'sleepy'); void el.offsetWidth; el.classList.add(mood);
    sfx[mood === 'grumpy' ? 'wrong' : 'select']();
    if (mood === 'grumpy') setTimeout(() => el.classList.remove('grumpy'), 600);
    // Bebisen gråter en skvätt när man klappar den
    if (st === 1 && mood !== 'sleepy') { el.classList.add('crying'); setTimeout(() => el.classList.remove('crying'), 2200); }
    if (out) out(line);
    say(line);
  }
  $('#petBtn').addEventListener('click', () => petTap($('#petView .pet'), line => { $('#petMood').textContent = line; }));
  let homeSayTimer = 0;
  $('#homePetView').addEventListener('click', () => petTap($('#homePetView .pet'), line => {
    const m = $('#homePetMood');
    m.textContent = `”${line}”`; m.classList.add('saying');
    clearTimeout(homeSayTimer);
    homeSayTimer = setTimeout(() => { m.classList.remove('saying'); m.textContent = petMood().text; }, 4000);
  }));
  $('#petRename').addEventListener('click', () => {
    const box = $('#petName');
    if (!box) return;
    const input = document.createElement('input');
    input.className = 'pet-name-input'; input.maxLength = 16; input.value = petName(); input.setAttribute('aria-label', 'Husdjurets namn');
    box.replaceWith(input); input.focus(); input.select();
    const done = () => {
      save.pet.name = input.value.replace(/[<>]/g, '').trim().slice(0, 16) || 'Plutt';
      persist();
      const span = document.createElement('span'); span.id = 'petName'; span.textContent = petName();
      input.replaceWith(span);
      renderPet();
    };
    input.addEventListener('blur', done, { once: true });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  });

  /* ================= Dagens utmaning ================= */
  const DAILY_THEMES = {
    1: { title: 'Tiokamratmåndag', w: 'plus', lo: 10, hi: 10 },
    2: { title: 'Minustisdag', w: 'minus', lo: 2, hi: 10 },
    3: { title: 'Dubbelonsdag', w: 'dubbel', lo: 1, hi: 10 },
    4: { title: 'Torsdagstoppen', w: 'plus', lo: 11, hi: 20 },
    5: { title: 'Fredagsmixen', w: 'mix' },
    6: { title: 'Lördagsgodis', w: 'plus', lo: 2, hi: 20 },
    0: { title: 'Söndagsrundan', w: 'plus', lo: 2, hi: 12 }
  };
  const DAILY_MILESTONES = [3, 5, 7, 10, 14, 21, 30, 50, 100];
  function seeded(seed, fn) {
    // Samma frågor för alla som spelar samma dag
    let t = seed >>> 0;
    const real = Math.random;
    Math.random = () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
    try { return fn(); } finally { Math.random = real; }
  }
  const dailyTheme = () => DAILY_THEMES[new Date().getDay()];
  function dailyQuestions() {
    const th = dailyTheme();
    return seeded(today() * 9973, () => {
      if (th.w === 'mix') return shuffle([...randQs('plus', 3, 2, 20), ...randQs('minus', 3, 2, 20), ...randQs('dubbel', 2, 1, 10)]);
      return randQs(th.w, 8, th.lo, th.hi);
    });
  }
  const dailyDone = () => save.daily.day === today();
  const dailyStreak = () => (save.daily.day >= today() - 1 ? save.daily.streak : 0);
  function renderDaily() {
    const th = dailyTheme(), done = dailyDone(), streak = dailyStreak();
    $('#dailyTitle').textContent = th.title;
    $('#dailyStreak').textContent = streak ? `🔥 ${streak} ${streak === 1 ? 'dag' : 'dagar'} i rad` : 'Starta en ny svit!';
    $('#dailyText').textContent = done
      ? 'Klar för idag! Kom tillbaka imorgon för nästa utmaning.'
      : '8 frågor, samma för alla idag. Klara den och få ett extra klistermärke!';
    $('#dailyBtn').textContent = done ? 'Öva igen' : 'Kör!';
    $('#dailyCard').classList.toggle('is-done', done);
  }
  function startDaily() {
    const th = dailyTheme();
    startFind({ kind: 'daily', world: th.w === 'mix' ? 'plus' : th.w, level: 'daily', mode: 'find', label: `Dagens: ${th.title}`, qs: dailyQuestions(), beads: true, retry: true });
  }

  /* ================= Frågor per värld ================= */
  function prepQ(q) {
    if (q.form != null && q.fixed) {
      if (q.w === 'minus') { q.ans = q.form === 0 ? q.n - q.a : q.a; q.max = q.n; }
      else if (q.w === 'dubbel') { q.ans = q.form === 0 ? 2 * q.n : q.n; q.max = q.form === 0 ? Math.max(12, 2 * q.n + 3) : Math.max(6, q.n + 3); }
      else { q.ans = q.n - q.a; q.max = q.n; }
      return q;
    }
    if (q.w === 'plus') { q.form = rnd(0, 2); q.ans = q.n - q.a; q.max = q.n; }
    else if (q.w === 'minus') { q.form = Math.random() < 0.7 ? 0 : 1; q.ans = q.form === 0 ? q.n - q.a : q.a; q.max = q.n; }
    else { q.form = rnd(0, 2); q.ans = q.form === 0 ? 2 * q.n : q.n; q.max = q.form === 0 ? Math.max(12, 2 * q.n + 3) : Math.max(6, q.n + 3); }
    return q;
  }
  // Alla kamrater till n, men de lätta paren (med 0 och 1) bara en gång.
  // De svårare paren kommer i båda ordningarna, t.ex. 3+5 och 5+3.
  const easyPair = (n, a) => Math.min(a, n - a) <= 1;
  function allQs(w, n) {
    if (w === 'dubbel') {
      let qs = range(1, n).map(L => ({ w, n: L, a: L }));
      while (qs.length < 4) qs = qs.concat(range(1, n).map(L => ({ w, n: L, a: L })));
      return shuffle(qs);
    }
    const qs = [];
    for (let a = 0; a <= Math.floor(n / 2); a++) {
      const b = n - a;
      qs.push({ w, n, a: Math.random() < 0.5 ? a : b });
      if (a !== b && !easyPair(n, a)) qs.push({ w, n, a: qs[qs.length - 1].a === a ? b : a });
    }
    return spreadOut(shuffle(qs));
  }
  // Undvik samma par två gånger i rad
  function spreadOut(qs) {
    for (let i = 1; i < qs.length; i++) {
      if (Math.min(qs[i].a, qs[i].n - qs[i].a) === Math.min(qs[i - 1].a, qs[i - 1].n - qs[i - 1].a) && qs[i].n === qs[i - 1].n) {
        const j = qs.findIndex((q, k) => k > i && (q.n !== qs[i].n || Math.min(q.a, q.n - q.a) !== Math.min(qs[i].a, qs[i].n - qs[i].a)));
        if (j > 0) [qs[i], qs[j]] = [qs[j], qs[i]];
      }
    }
    return qs;
  }
  function rndQ(w, lo, hi) {
    // Större tal oftare än små, så att det inte blir mest x+1
    const span = hi - Math.max(1, lo);
    const n = Math.max(1, lo) + Math.floor(Math.sqrt(Math.random()) * (span + 1));
    if (w === 'dubbel') return { w, n, a: n };
    const a = n >= 4 && Math.random() < 0.85 ? rnd(2, n - 2) : rnd(0, n);
    return { w, n, a };
  }
  function randQs(w, count, lo, hi) {
    const qs = [], seen = new Set();
    let guard = 0;
    while (qs.length < count && guard++ < 1000) {
      const q = rndQ(w, lo, hi);
      const key = q.n + ':' + q.a;
      if (seen.has(key) && guard < 500) continue;
      if (qs.length && qs[qs.length - 1].n === q.n && lo !== hi && guard < 500) continue;
      seen.add(key); qs.push(q);
    }
    return qs;
  }
  function trickyKey(q) {
    if (q.w === 'dubbel') return `d${q.n}:${q.n}`;
    return `${q.w === 'minus' ? 'm' : ''}${q.n}:${Math.min(q.a, q.n - q.a)}`;
  }
  function qFromKey(k) {
    const m = /^([md]?)(\d+):(\d+)$/.exec(k); if (!m) return null;
    const w = m[1] === 'm' ? 'minus' : m[1] === 'd' ? 'dubbel' : 'plus';
    const n = +m[2], a = +m[3];
    return { w, n, a: w === 'dubbel' ? n : Math.random() < 0.5 ? a : n - a };
  }
  // Färdighet per tal och värld (0–10), plus en total färdighet "g" för hela
  // spelet. Pärlorna styrs av den högsta av dem, så att de inte kommer tillbaka
  // bara för att man byter tal. Ett fel sänker båda, så hjälpen kommer tillbaka
  // när det börjar bli svårt.
  const skillKey = q => q.w[0] + q.n;
  const skillOf = q => Math.max(save.skill[skillKey(q)] || 0, save.skill.g || 0);
  const clamp10 = v => Math.max(0, Math.min(10, v));
  function markSkill(q, correctFirstTry) {
    const k = skillKey(q);
    save.skill[k] = clamp10((save.skill[k] || 0) + (correctFirstTry ? 1 : -2));
    save.skill.g = clamp10((save.skill.g || 0) + (correctFirstTry ? 1 : -3));
  }
  // full = pärlor med tomma ringar, faint = svaga pärlor, none = inga pärlor
  const beadMode = q => (skillOf(q) >= 7 ? 'none' : skillOf(q) >= 4 ? 'faint' : 'full');
  const knows = (w, n) => (save.skill[w[0] + n] || 0) >= 7;

  function markTricky(q, wrong) {
    const k = trickyKey(q);
    if (wrong) save.tricky[k] = Math.min(9, (save.tricky[k] || 0) + 2);
    else if (save.tricky[k]) { save.tricky[k]--; if (!save.tricky[k]) delete save.tricky[k]; }
  }
  function questionsTricky() {
    const keys = Object.entries(save.tricky).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k]) => k);
    const qs = keys.map(qFromKey).filter(Boolean);
    let i = 0;
    while (qs.length < 6 && keys.length) { const q = qFromKey(keys[i++ % keys.length]); if (q) qs.push(q); }
    return shuffle(qs);
  }

  const gapHTML = (val, filled) => `<span class="gap${filled ? ' filled' : ''}">${filled ? val : '?'}</span>`;
  function equationHTML(q, filled) {
    const A = `<span class="a">${q.a}</span>`, N = v => `<span class="total">${v}</span>`;
    const op = s => `<span class="op">${s}</span>`;
    if (q.w === 'plus') {
      const g = gapHTML(q.n - q.a, filled);
      return [`${A}${op('+')}${g}${op('=')}${N(q.n)}`, `${g}${op('+')}${A}${op('=')}${N(q.n)}`, `${N(q.n)}${op('=')}${A}${op('+')}${g}`][q.form];
    }
    if (q.w === 'minus') {
      if (q.form === 0) return `${N(q.n)}${op(MINUS)}${A}${op('=')}${gapHTML(q.n - q.a, filled)}`;
      return `${N(q.n)}${op(MINUS)}${gapHTML(q.a, filled)}${op('=')}<span class="a">${q.n - q.a}</span>`;
    }
    const L = q.n;
    if (q.form === 0) return `<span class="a">${L}</span>${op('+')}<span class="a">${L}</span>${op('=')}${gapHTML(2 * L, filled)}`;
    if (q.form === 1) return `${gapHTML(L, filled)}${op('+')}${gapHTML(L, filled)}${op('=')}${N(2 * L)}`;
    return `<span class="word">Hälften av</span>${N(2 * L)}${op('=')}${gapHTML(L, filled)}`;
  }
  // Pärlorna: rader med sorter (ka = blå, kb = orange, empty = tom ring, gone = borttagen)
  function beadRows(q, filled, hint) {
    const rep = (k, n) => Array(Math.max(0, n)).fill(k);
    if (q.w === 'plus') {
      const known = rep('ka', q.a), miss = rep(filled ? 'kb' : 'empty', q.n - q.a);
      return { rows: [q.form === 1 ? [...miss, ...known] : [...known, ...miss]], number: 'empty' };
    }
    if (q.w === 'minus') {
      const left = q.n - q.a;
      if (q.form === 0) return { rows: [[...rep(filled ? 'kb' : 'empty', left), ...rep('gone', q.a)]], number: 'empty' };
      return { rows: [[...rep('ka', left), ...rep(filled ? 'gone' : 'empty', q.a)]], number: 'empty' };
    }
    const L = q.n;
    if (q.form === 0) return { rows: [rep('ka', L), rep('kb', L)], number: hint ? 'all' : '' };
    if (filled || hint) return { rows: [rep('ka', L), rep('kb', L)], number: '' };
    return { rows: [rep('ka', 2 * L)], number: '' };
  }
  function showBeads(q, filled, hint) {
    $('#beads').hidden = q.mode === 'none';
    $('#beads').classList.toggle('faint', q.mode === 'faint');
    if (q.mode !== 'none') renderBeads(q, filled, hint);
  }
  function renderBeads(q, filled, hint) {
    const { rows, number } = beadRows(q, filled, hint);
    const wrap = $('#beads'); wrap.innerHTML = '';
    let count = 0, popDelay = 0;
    for (const row of rows) {
      for (let r = 0; r < Math.ceil(row.length / 10); r++) {
        const line = document.createElement('div'); line.className = 'beadrow';
        for (let f = 0; f < 2; f++) {
          const five = document.createElement('div'); five.className = 'five';
          for (let k = 0; k < 5; k++) {
            const i = r * 10 + f * 5 + k; if (i >= row.length) break;
            const kind = row[i];
            const b = document.createElement('span');
            b.className = 'bead ' + kind;
            if (kind === 'kb' && filled) b.style.animationDelay = (popDelay++ * 0.05) + 's';
            if (hint && (number === 'all' || kind === number)) { count++; b.classList.add('hint'); b.textContent = count; }
            five.appendChild(b);
          }
          if (five.childElementCount) line.appendChild(five);
        }
        wrap.appendChild(line);
      }
    }
  }
  function explainRight(q) {
    if (q.w === 'plus') return `<span class="a">${q.a}</span> och <span class="b">${q.n - q.a}</span> är talkamrater till ${q.n}!`;
    if (q.w === 'minus') return `${q.n} ${MINUS} ${q.a} = ${q.n - q.a}, för <span class="a">${q.a}</span> och <span class="b">${q.n - q.a}</span> är talkamrater till ${q.n}!`;
    return `${q.n} + ${q.n} = ${2 * q.n}. Dubbelt så många!`;
  }
  function explainWrong(q, v) {
    if (q.w === 'plus') { const s = q.a + v; return `${q.a} + ${v} = ${s}. Det ska bli ${q.n}, så ${s < q.n ? 'det behövs fler' : 'det blev för många'}.`; }
    if (q.w === 'minus') {
      if (q.form === 0) return `Kolla med plus: ${v} + ${q.a} = ${v + q.a}, inte ${q.n}.`;
      return `${q.n} ${MINUS} ${v} = ${q.n - v}, inte ${q.n - q.a}.`;
    }
    if (q.form === 0) return `${q.n} + ${q.n} är inte ${v}. Räkna båda grupperna.`;
    return `${v} + ${v} = ${2 * v}, inte ${2 * q.n}.`;
  }
  function promptFor(q, first) {
    if (q.w === 'plus') return first ? `Vem är kompis med ${q.a} så att de blir ${q.n} tillsammans?`
      : pick([`Vilket tal fattas?`, `Hur många ringar är tomma?`, `${q.a} och vem blir ${q.n}?`, `Nästa! Hitta kompisen till ${q.a}.`]);
    if (q.w === 'minus') return q.form === 0 ? `Du har ${q.n}. ${q.a} försvinner. Hur många är kvar?` : `${q.n} minus vad blir ${q.n - q.a}?`;
    return [`Vad är dubbelt så mycket som ${q.n}?`, `Vilket tal plus sig självt blir ${2 * q.n}?`, `Vad är hälften av ${2 * q.n}?`][q.form];
  }
  function choicesFor(q) {
    const want = Math.min(4, q.max + 1);
    const b = q.ans;
    const set = new Set([b]);
    for (const c of shuffle([b - 1, b + 1, b - 2, b + 2, b + 3, b - 3])) { if (set.size >= want) break; if (c >= 0 && c <= q.max) set.add(c); }
    while (set.size < want) set.add(rnd(0, q.max));
    return shuffle([...set]);
  }
  function renderAnswers(container, q, onPick) {
    container.innerHTML = '';
    const opts = choicesFor(q);
    container.classList.toggle('two', opts.length <= 2);
    opts.forEach(v => {
      const b = document.createElement('button');
      b.className = 'ans'; b.textContent = v; b.dataset.v = v;
      b.addEventListener('click', () => onPick(b, v));
      container.appendChild(b);
    });
  }

  /* ================= Vägen till expert ================= */
  // Varje tal på vägen har tre moment: Lära (med pärlor), Öva (på ett annat sätt)
  // och Kunna (ett kort talprov utan pärlor). Efter vartannat tal kommer en
  // repetition, och zonens prov öppnas först när allt i zonen är klart.
  // Kan man redan ett tal (pärlorna har försvunnit) hoppas Lära över.
  const MOMENTS = {
    plus: [
      { id: 'learn', label: 'Lära', icon: '📿', text: n => `Hitta kamraterna till ${n} med pärlorna. Minst ★★.` },
      { id: 'practice', label: 'Öva', icon: '🫧', text: n => `Poppa alla bubbelpar som blir ${n}. Minst ★★.` },
      { id: 'master', label: 'Kunna', icon: '🎯', text: () => 'Ett kort talprov utan pärlor.' }
    ],
    minus: [
      { id: 'learn', label: 'Lära', icon: '📿', text: n => `Minus från ${n} med pärlorna. Minst ★★.` },
      { id: 'practice', label: 'Öva', icon: '🔄', text: () => 'Åt båda hållen: hur många är kvar, och hur många försvann? Minst ★★.' },
      { id: 'master', label: 'Kunna', icon: '🎯', text: () => 'Ett kort talprov utan pärlor.' }
    ],
    dubbel: [
      { id: 'learn', label: 'Lära', icon: '📿', text: n => `Dubblorna upp till ${n} med pärlorna. Minst ★★.` },
      { id: 'practice', label: 'Öva', icon: '✂️', text: () => 'Halvor: dela talet i två lika delar. Minst ★★.' },
      { id: 'master', label: 'Kunna', icon: '🎯', text: () => 'Ett kort prov utan pärlor.' }
    ]
  };
  const practiceKey = (wid, n) => (wid === 'plus' ? `${n}:bubbles` : wid === 'minus' ? `m${n}:both` : `d${n}:half`);
  const masterId = (wid, n) => `k-${WORLDS[wid].prefix}n${n}`;
  function momentsFor(wid, n, zonePassed) {
    const p = WORLDS[wid].prefix;
    const learnStars = save.best[`${p}${n}:find`] || 0, practiceStars = save.best[practiceKey(wid, n)] || 0;
    const learnDone = learnStars >= 2 || (save.path[`${p}n${n}`] || 0) > 0;
    const state = {
      learn: { done: zonePassed || learnDone || knows(wid, n), stars: learnStars, skipped: !learnDone && !zonePassed && knows(wid, n) },
      practice: { done: zonePassed || practiceStars >= 2, stars: practiceStars },
      master: { done: zonePassed || (save.path[masterId(wid, n)] || 0) > 0, stars: null }
    };
    return MOMENTS[wid].map(m => ({ ...m, ...state[m.id], text: m.text(n) }));
  }
  // Talprovet: kort, utan pärlor, ett fel får man göra
  function numTestCfg(wid, n) {
    if (wid === 'dubbel') { const count = n <= 2 ? 4 : 6; return { lo: 1, hi: n, count, pass: count - 1 }; }
    const count = n <= 3 ? 5 : 8;
    return { lo: n, hi: n, count, pass: count - 1 };
  }
  function stations(wid) {
    const w = WORLDS[wid], p = w.prefix, list = [];
    for (const z of w.zones) {
      // Den som redan klarat zonens prov behöver inte göra om zonen
      const zonePassed = (save.path['t-' + z.id] || 0) > 0;
      for (let n = z.from; n <= z.to; n++) {
        const moments = momentsFor(wid, n, zonePassed);
        list.push({ world: wid, kind: 'number', id: `${p}n${n}`, n, zone: z, name: w.level(n), moments, done: moments.every(m => m.done) });
        const k = n - z.from + 1;
        if (k % 2 === 0 && n < z.to) {
          const id = `r-${z.id}-${k}`, small = n <= 3;
          list.push({ world: wid, kind: 'review', id, zone: z, name: 'Repetition', lo: z.from, hi: n,
            count: small ? 6 : 8, pass: small ? 5 : 6, done: zonePassed || (save.path[id] || 0) > 0 });
        }
      }
      list.push({ world: wid, kind: 'test', id: 't-' + z.id, zone: z, name: `Prov: ${z.name}`, lo: z.from, hi: z.to, count: z.test.count, pass: z.test.pass, done: zonePassed });
      if (z.challenge) list.push({ world: wid, kind: 'challenge', zone: z, ...z.challenge, done: (save.path[z.challenge.id] || 0) > 0 });
    }
    // Expertprovet kräver att allt är gjort och ★★★ på alla Lära- och Öva-moment
    const missing = list.filter(s => s.kind === 'number').reduce((n, s) => n + s.moments.filter(m => m.id !== 'master' && (m.stars || 0) < 3).length, 0);
    list.push({ world: wid, kind: 'final', ...w.final, done: (save.path[w.final.id] || 0) > 0, missing });
    let open = true;
    list.forEach(s => { s.open = open && (s.kind !== 'final' || s.done || missing === 0); if (!s.done) open = false; });
    return list;
  }
  const stationById = id => WORLD_IDS.flatMap(stations).find(s => s.id === id);
  // Framsteg på vägen räknat i moment: ett tal är tre moment, allt annat ett
  function pathUnits(wid) {
    const all = stations(wid);
    return {
      done: all.reduce((sum, s) => sum + (s.kind === 'number' ? s.moments.filter(m => m.done).length : s.done ? 1 : 0), 0),
      total: all.reduce((sum, s) => sum + (s.kind === 'number' ? s.moments.length : 1), 0)
    };
  }
  const doneCount = wid => pathUnits(wid).done;
  const nextMoment = s => s.moments.find(m => !m.done);
  const stepName = s => (s.kind === 'number' && !s.done ? `${s.name}: ${nextMoment(s).label}` : s.name);

  // Kom ihåg-provet: en vecka efter ett klarat zonprov kan medaljen fås att
  // glänsa. Frivilligt, det stoppar aldrig vägen.
  const RECALL_DAYS = 7;
  function recallFor(wid, z) {
    const id = 't-' + z.id, day = save.dates[id];
    if (!save.path[id] || save.path['s-' + id] || !day || today() - day < RECALL_DAYS) return null;
    return { world: wid, kind: 'recall', id: 's-' + id, zone: z, name: `Kom ihåg: ${z.name}`, lo: z.from, hi: z.to, count: 5, pass: 4 };
  }
  const recallsWaiting = () => WORLD_IDS.flatMap(w => WORLDS[w].zones.map(z => recallFor(w, z)).filter(Boolean));
  // Prov som klarades innan datum sparades räknas från idag
  function fixDates() {
    let changed = false;
    for (const k of Object.keys(ALL_MEDALS)) if (k.startsWith('t-') && save.path[k] && !save.dates[k]) { save.dates[k] = today(); changed = true; }
    if (changed) persist();
  }

  function stationDetail(s) {
    if (s.kind === 'number') {
      const dots = s.moments.map(m => (m.done ? '●' : '○')).join('');
      return s.done ? `<span class="dots">${dots}</span> Klart!` : `<span class="dots">${dots}</span> ${s.open ? `Nu: ${nextMoment(s).label}` : 'Lära · Öva · Kunna'}`;
    }
    if (s.kind === 'review') return s.done ? `Klarat! ${save.path[s.id]} av ${s.count} rätt` : `Blandat ${s.lo}–${s.hi} · ${s.pass} av ${s.count} rätt`;
    if (s.kind === 'test') return s.done ? `Klarat! ${save.path[s.id] || ''} ${save.path[s.id] ? `av ${s.count} rätt` : ''}` : `${s.count} frågor · ${s.pass} rätt behövs`;
    if (s.kind === 'challenge') return s.done ? `Klarat! Rekord ${save.records[s.id] || 0}` : `${s.secs} sekunder · mål ${s.goal} rätt`;
    if (s.done) return `Du är ${WORLDS[s.world].expertTitle.toLowerCase()}!`;
    if (s.missing) return `Kräver ★★★ på alla övningar: ${s.missing} kvar`;
    return `${s.count} frågor · ${s.pass} rätt behövs`;
  }
  const nodeIcon = s => (s.kind === 'number' ? (s.done || s.open ? s.n : '🔒')
    : s.kind === 'review' ? (s.done ? '✓' : s.open ? '🔁' : '🔒')
    : s.kind === 'test' ? (s.done ? '✓' : s.open ? '📝' : '🔒')
    : s.kind === 'challenge' ? (s.done ? '✓' : s.open ? '⏱️' : '🔒')
    : (s.done ? EXPERT_ICON[s.world] : s.open ? '🏆' : '🔒'));

  function renderRoad() {
    const w = W(), all = stations(w.id);
    $('#roadTitle').innerHTML = w.id === 'plus' ? 'Vägen till <em>expert</em>' : `${w.name}: vägen till <em>expert</em>`;
    renderWorldTabs($('#roadTabs'), () => openRoad());
    const wrap = $('#zones'); wrap.innerHTML = '';
    const zigzag = [0, 14, 28, 14];
    for (const z of w.zones) {
      const medal = w.medals['t-' + z.id];
      const el = document.createElement('div');
      el.className = 'panel zone';
      const rc = recallFor(w.id, z), shine = !!save.path['s-t-' + z.id];
      el.innerHTML = `<svg class="road" aria-hidden="true"><path class="bed"/><path class="dash"/></svg>
        <div class="zone-head"><h3>${z.name}<small>${w.id === 'dubbel' ? 'Dubblor' : 'Talen'} ${z.from}–${z.to}</small></h3><span class="medal ${save.path['t-' + z.id] ? 'on' : ''}${shine ? ' shine' : ''}" title="${medal[1]}${shine ? ' (glänser)' : ''}">${medal[0]}</span></div>
        ${rc ? '<button class="recall-btn" data-recall>✨ Kom ihåg-prov: få medaljen att glänsa</button>' : ''}
        <div class="stops"></div>`;
      if (rc) $('[data-recall]', el).addEventListener('click', () => { roadContext = true; showIntro(rc); });
      const stops = $('.stops', el);
      all.filter(s => s.zone === z).forEach((s, i) => stops.appendChild(stopButton(s, zigzag[i % 4])));
      wrap.appendChild(el);
    }
    const fin = all[all.length - 1];
    const finEl = document.createElement('div');
    finEl.className = 'panel zone';
    finEl.innerHTML = `<div class="zone-head"><h3>${fin.name}<small>${w.id === 'dubbel' ? 'Alla dubblor 1–10' : 'Alla talen 1–20'}</small></h3><span class="medal ${fin.done ? 'on' : ''}">${w.medals[fin.id][0]}</span></div><div class="stops"></div>`;
    $('.stops', finEl).appendChild(stopButton(fin, 14));
    wrap.appendChild(finEl);
    requestAnimationFrame(drawRoads);
  }

  function stopButton(s, x) {
    const b = document.createElement('button');
    b.className = 'stop' + (s.done ? ' done' : s.open ? ' open' : '');
    b.style.setProperty('--x', x + '%');
    b.disabled = !s.open && !s.done;
    b.innerHTML = `<span class="node kind-${s.kind}" data-me="${s.open && !s.done ? myFace() : ''}">${nodeIcon(s)}</span>
      <span class="txt"><b>${esc(s.name)}</b><small>${stationDetail(s)}</small></span>`;
    b.setAttribute('aria-label', `${s.name}. ${s.done ? 'Klarad' : s.open ? 'Nästa steg' : 'Låst'}${s.kind === 'number' ? `, ${s.moments.filter(m => m.done).length} av 3 moment` : ''}`);
    b.addEventListener('click', () => openStation(s));
    return b;
  }

  function drawRoads() {
    for (const zone of $$('#zones .zone')) {
      const svg = $('svg.road', zone); if (!svg) continue;
      const box = zone.getBoundingClientRect();
      const pts = $$('.node', zone).map(n => { const r = n.getBoundingClientRect(); return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2]; });
      if (pts.length < 2) continue;
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y0 + y1) / 2;
        d += ` C${x0},${my} ${x1},${my} ${x1},${y1}`;
      }
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      $$('path', svg).forEach(p => p.setAttribute('d', d));
    }
  }
  addEventListener('resize', () => { if (current === 'road') drawRoads(); });

  let roadContext = false;
  function openStation(s) {
    roadContext = true;
    if (s.kind === 'number') return openStep(s);
    showIntro(s);
  }

  // Ett tal på vägen: tre moment i tur och ordning
  const STEP_TALK = [
    n => `Först lär vi oss ${n}. Pärlorna hjälper dig!`,
    () => pick(['Nu övar vi på ett nytt sätt. Det gör hjärnan stark!', 'Öva, öva! Varje gång blir det lite lättare.']),
    () => 'Sista momentet! Visa att du kan det utan pärlor.'
  ];
  function openStep(s) {
    stopGame();
    roadContext = true;
    show('step');
    const w = WORLDS[s.world], what = s.world === 'plus' ? `talkamraterna till ${s.n}` : s.world === 'minus' ? `minus från ${s.n}` : `dubblorna upp till ${s.n}`;
    const done = s.moments.filter(m => m.done).length;
    $('#stepTitle').textContent = s.name;
    $('#stepSub').textContent = done === s.moments.length ? 'Klart! Spela gärna igen, repetition gör dig ännu säkrare.' : `${done} av ${s.moments.length} moment klara`;
    const first = s.moments.findIndex(m => !m.done);
    const box = $('#moments'); box.innerHTML = '';
    s.moments.forEach((m, i) => {
      const open = m.done || i === first;
      const b = document.createElement('button');
      b.className = 'moment' + (m.done ? ' done' : open ? ' open' : '');
      b.disabled = !open;
      b.innerHTML = `<span class="mi" aria-hidden="true">${m.done ? '✓' : open ? m.icon : '🔒'}</span>
        <span class="mt"><b>${i + 1}. ${m.label}</b><small>${m.skipped ? 'Du kan redan talet, så det här momentet är klart! 💪' : esc(m.text)}</small></span>
        ${m.id !== 'master' && m.done ? `<span class="ms" aria-label="${m.stars || 0} stjärnor">${starStr(m.stars || 0)}${(m.stars || 0) < 3 ? '<small>★★★ till expert</small>' : ''}</span>` : ''}`;
      b.addEventListener('click', () => startMoment(s, m));
      box.appendChild(b);
    });
    talk(first < 0 ? `Du kan ${what}! Bra jobbat, ${nm()}!` : STEP_TALK[first](s.n), 'happy');
    $('#stepBack').onclick = () => openRoad(s.world);
    const cur = $('#moments .moment.open:not(.done)');
    if (cur) cur.focus({ preventScroll: true });
  }
  function startMoment(s, m) {
    const extra = { stepId: s.id };
    if (m.id === 'learn') return startFindLevel(s.world, s.n, false, extra);
    if (m.id === 'master') return startNumTest(s.world, s.n, extra);
    if (s.world === 'plus') return startBubbles(s.n, extra);
    if (s.world === 'minus') return startBoth(s.n, extra);
    return startHalves(s.n, extra);
  }

  function showIntro(s) {
    show('intro');
    const list = $('#introList');
    const w = WORLDS[s.world];
    const what = w.id === 'dubbel' ? `dubblor och halvor ${s.lo}–${s.hi}` : w.id === 'minus' ? `minus med talen ${s.lo}–${s.hi}` : `talen ${s.lo}–${s.hi}`;
    if (s.kind === 'challenge') {
      $('#introTitle').textContent = s.name;
      list.innerHTML = `<li>⏱️ ${s.secs} sekunder</li><li>🎯 Mål: ${s.goal} rätt</li><li>${s.lo === s.hi ? (w.id === 'minus' ? `Minus från ${s.lo}` : `Bara kamrater till ${s.lo}`) : `Blandat: ${what}`}</li>`;
      talk(save.records[s.id] ? `Ditt rekord är ${save.records[s.id]}. Kan du slå det?` : 'Svara så snabbt du kan. Fel gör inget, fortsätt bara!');
    } else if (s.kind === 'review' || s.kind === 'recall') {
      $('#introTitle').textContent = s.name;
      list.innerHTML = `<li>🔁 ${s.count} blandade frågor: ${what}</li><li>🎯 ${s.pass} rätt behövs</li><li>🙈 Inga pärlor, ett svar per fråga</li>`;
      talk(s.kind === 'recall'
        ? `Det var ett tag sedan du klarade ${s.zone.name}. Kommer du ihåg? Då börjar medaljen glänsa! ✨`
        : 'Nu blandar vi talen du har lärt dig. Kommer du ihåg dem?');
    } else {
      $('#introTitle').textContent = s.name;
      list.innerHTML = `<li>📝 ${s.count} frågor: ${what}</li><li>🎯 ${s.pass} rätt behövs för att klara</li><li>🙈 Inga pärlor nu, du har dem i huvudet!</li>`;
      talk(s.kind === 'final' ? `Det här är det stora provet, ${nm()}. Klarar du det blir du ${w.expertTitle}!` : 'Ett svar per fråga. Ta det lugnt och tänk efter.');
    }
    $('#introGo').onclick = () => (s.kind === 'challenge' ? startChallenge(s) : startTest(s));
    $('#introBack').onclick = () => openRoad();
  }

  function openRoad(wid) {
    stopGame();
    if (wid && WORLDS[wid]) { prefs.world = wid; savePrefs(); }
    renderRoad();
    show('road');
    const cur = $('#zones .stop.open');
    if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }), 60);
  }

  const WORLD_ICON = { plus: '➕', minus: '➖', dubbel: '✌️' };
  function renderWorldTabs(el, onChange) {
    el.innerHTML = '';
    WORLD_IDS.forEach(id => {
      const b = document.createElement('button');
      b.textContent = `${WORLD_ICON[id]} ${WORLDS[id].tab}`;
      b.setAttribute('aria-pressed', String(prefs.world === id));
      b.addEventListener('click', () => { if (prefs.world === id) return; prefs.world = id; savePrefs(); sfx.select(); onChange(); });
      el.appendChild(b);
    });
  }

  /* ================= Startsidan: flikar ================= */
  // Hem (det man kan göra nu), Träna, Plutt och Klassen, med en meny längst ner
  let startTab = 'home';
  function applyTab() {
    $$('.tabpane').forEach(p => { p.hidden = p.dataset.pane !== startTab; });
    $$('#tabbar button').forEach(b => { if (b.dataset.tab === startTab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  function setTab(tab) {
    startTab = tab;
    if (current !== 'start') { stopGame(); renderStart(); show('start'); }
    else applyTab();
    window.scrollTo({ top: 0 });
  }
  $$('#tabbar button').forEach(b => b.addEventListener('click', () => { sfx.select(); setTab(b.dataset.tab); }));
  // Listan "Idag": det viktigaste man kan göra just nu, högst sex rader
  function renderToday() {
    const items = [];
    const w = W(), all = stations(w.id), next = all.find(s => !s.done);
    // Lärarens fokus står alltid överst, ett per tal
    for (const f of teacherFocuses().slice(0, 3)) {
      const done = focusTrainedToday(f);
      items.push({ ic: done ? '✅' : '✏️', t: done ? `Bra! Du har tränat ${focusText(f)}` : `Läraren vill att du tränar ${focusText(f)}`,
        s: done ? 'Träna gärna en gång till' : 'Veckans fokus', go: 'Träna', fn: () => startFocus(f), focus: true });
    }
    if (next) items.push({ main: true, ic: '🗺️', t: 'Vägen till expert', s: `${w.tab}: ${stepName(next)}`, go: 'Fortsätt', fn: () => (next.open ? openStation(next) : openRoad()) });
    const wish = currentWish();
    if (wish) items.push({ ic: treatOf(wish)[1], t: `${petName()} har en önskan`, s: WISH_TYPES[wish.type].text(wish), go: 'Hjälp', fn: () => WISH_TYPES[wish.type].go(wish) });
    const c = net.buddy && net.buddy.challenge;
    if (c && c.status === 'pending' && c.role === 'to') items.push({ ic: '🤝', t: `${c.mate.name} vill utmana dig`, s: c.title, go: 'Svara', fn: () => setTab('class') });
    else if (c && c.status === 'active') items.push({ ic: '🤝', t: 'Kompisutmaning', s: `${c.progress} av ${c.goal} ${c.unit} med ${c.mate.name}`, go: 'Visa', fn: () => setTab('class') });
    else if (c && c.status === 'pending' && c.role === 'from') items.push({ ic: '⏳', t: `Väntar på ${c.mate.name}`, s: 'Din inbjudan till kompisutmaning', go: 'Visa', fn: () => setTab('class') });
    // Kom ihåg-provet: få en medalj att glänsa
    const rc = recallsWaiting()[0];
    if (rc) items.push({ ic: '✨', t: 'Kom ihåg-prov', s: `Få medaljen från ${rc.zone.name} att glänsa`, go: 'Kör', fn: () => { roadContext = true; showIntro(rc); } });
    const tricky = Object.values(save.tricky).filter(v => v > 0).length;
    if (tricky) items.push({ ic: '🧩', t: 'Kluriga uppgifter', s: `${tricky} ${tricky === 1 ? 'uppgift' : 'uppgifter'} att öva på`, go: 'Öva', fn: () => { roadContext = false; startTricky(); } });
    const m = net.classInfo && net.classInfo.mission;
    if (m && net.player && !isSolo()) items.push({ ic: '🎯', t: 'Klassens uppdrag', s: `${Math.min(m.progress, m.goal)} av ${m.goal} ${m.unit}`, go: 'Visa', fn: () => setTab('class') });
    // Klasskampen: bara hur långt det egna berget har kommit, aldrig en placering
    const k = net.player && !isSolo() && net.classInfo && net.classInfo.contest;
    const kMine = k && !k.ended && k.classes && k.classes.find(x => x.mine);
    if (kMine) items.push({ ic: '🏔️', t: k.title, s: `Vårt ${k.mountain} är på ${kMine.percent} %. Nu bygger vi!`, go: 'Heja', fn: () => openClass() });
    const d = stickerDups();
    if (d) items.push({ ic: '🃏', t: `${d} ${d === 1 ? 'dubblett' : 'dubbletter'}`, s: 'Byt mot jordgubbar till kläder och mat', go: 'Byt', fn: () => openBook() });
    // Ett tips om dagen om något man inte har gjort än, så att det inte blir tjat
    const tips = [];
    if (canBuddy() && !c) tips.push({ ic: '🤝', t: 'Utmana en kompis', s: 'Klara ett mål tillsammans och få varsin kompisbricka', go: 'Bjud in', fn: () => openBuddy() });
    for (const [id, X] of Object.entries(EXTRAS)) {
      if (!Object.keys(save.best).some(k => k.startsWith(X.prefix) && k.endsWith(':' + X.mode))) tips.push({ ic: X.icon, t: `Har du provat ${X.title.startsWith('Plutt') ? X.title : X.title.toLowerCase()}?`, s: { line: 'Hitta var talen bor på linjen', jump: 'Hjälp Plutt att hoppa rätt', word: 'Räkna fram ett hemligt ord' }[id] || X.title, go: 'Testa', fn: () => openExtra(id) });
    }
    const tip = tips.length ? { ...tips[today() % tips.length], tip: true } : null;
    $('#todaySub').textContent = new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
    const box = $('#todoList'); box.innerHTML = '';
    [...items.slice(0, tip ? 5 : 6), ...(tip ? [tip] : [])].forEach(it => {
      const b = document.createElement('button');
      b.className = 'todo-row' + (it.main ? ' main' : '') + (it.tip ? ' tip' : '') + (it.focus ? ' focus' : '');
      b.innerHTML = `<span class="ti" aria-hidden="true">${it.ic}</span><span><b>${esc(it.t)}</b><small>${esc(it.s)}</small></span><span class="tg">${it.go}</span>`;
      b.addEventListener('click', () => { sfx.select(); it.fn(); });
      box.appendChild(b);
    });
    if (!items.length && !tip) box.innerHTML = '<p class="stats">Allt klart för idag! Spela gärna mer under Träna.</p>';
    // Prickar i menyn: något väntar i den fliken
    const dot = (tab, on) => { const el = $(`#tabbar [data-tab="${tab}"] .dot`); if (el) el.hidden = !on; };
    const fresh = net.classInfo && net.player ? net.classInfo.myCheers - (prefs.seenCheers[net.player.id] || 0) : 0;
    dot('class', !!(c && c.status === 'pending' && c.role === 'to') || fresh > 0);
    dot('pet', !!wish || d > 0);
  }
  function renderPetTab() {
    const st = petStage(save.pet.xp), b = basket();
    $('#homePetView').innerHTML = petHTML(st, petMood().cls, petWear());
    $('#homePetName').textContent = petName();
    // Nivån syns tydligt: "Nivå 5 av 10 · Skolplutt" och hur långt det är kvar till nästa
    $('#homePetStage').textContent = `${PET_ICONS[st]} Nivå ${st + 1} av ${PET_STAGES.length} · ${PET_STAGES[st][1]}`;
    const nx = PET_STAGES[st + 1], fr = PET_STAGES[st][0];
    $('#homePetMeter').style.width = nx ? (100 * (save.pet.xp - fr) / (nx[0] - fr)) + '%' : '100%';
    if (!$('#homePetMood').classList.contains('saying')) $('#homePetMood').textContent = petMood().text;
    $('#basketCount').innerHTML = `${b} <small>${b === 1 ? 'jordgubbe' : 'jordgubbar'}</small>`;
    $('#basketText').textContent = b ? `Mata ${petName()} så växer den, eller köp kläder.` : 'Byt dubbletter i klistermärkesboken så fylls korgen.';
    // Garderoben: små rutor med vad som finns, vad det kostar och vad som är låst
    const owned = WARDROBE.filter(it => ownsItem(it.id)), worn = petWear();
    $('#wardCount').textContent = `${owned.length} av ${WARDROBE.length}`;
    const canBuy = WARDROBE.filter(it => !ownsItem(it.id) && st >= it.stage && b >= it.price);
    const nextItem = WARDROBE.find(it => !ownsItem(it.id) && st >= it.stage);
    $('#wardText').textContent = canBuy.length ? `Du har råd med ${canBuy.length === 1 ? lowerName(canBuy[0].name) : `${canBuy.length} saker`}! 🛍️`
      : nextItem ? `${nextItem.name} kostar ${nextItem.price} 🍓. Du har ${b}.`
      : owned.length === WARDROBE.length ? `${petName()} har allt! Byt kläder när du vill.` : `Fler kläder låses upp när ${petName()} växer.`;
    $('#wardRow').innerHTML = WARDROBE.map(it => {
      const own = ownsItem(it.id), lock = !own && st < it.stage;
      const tag = worn.includes(it.id) ? 'På' : own ? '✓' : lock ? '🔒' : `${it.price}🍓`;
      return `<span class="ward-it${own ? ' own' : ''}${lock ? ' lock' : ''}${canBuy.includes(it) ? ' buy' : ''}" title="${esc(it.name)}"><span aria-hidden="true">${it.icon}</span><small>${tag}</small></span>`;
    }).join('');
    // Klistermärken per nivå, så att man ser vad som är kvar att leta efter
    $('#stickerTiers').innerHTML = RARITY.map((r, i) => {
      const tier = STICKERS.filter(x => x[2] === i), got = tier.filter(([e]) => stickerCount(e) > 0).length;
      return `<div class="st-tier r${i}"><span>${r.plural}</span><span class="st-bar"><i style="width:${100 * got / tier.length}%"></i></span><b>${got}/${tier.length}</b></div>`;
    }).join('');
    $('#basketFeed').disabled = b === 0 || st === 0;
    $('#basketFeed').textContent = b ? `Mata ${Math.min(10, b)} 🍓` : 'Korgen är tom';
  }
  $('#homePetOpen').addEventListener('click', () => { sfx.select(); setTab('pet'); });
  $('#basketFeed').addEventListener('click', () => feedFromBasket(10));
  $('#basketWardrobe').addEventListener('click', openWardrobe);
  $('#wardRow').addEventListener('click', openWardrobe);

  /* ================= Startsidan ================= */
  function renderStart() {
    const w = W();
    $('#hello').textContent = save.name ? `Hej ${save.name}!` : 'Hej!';
    // Talkamraterna hälsar alltid. Den egna figuren är profilbilden uppe till höger.
    if (!$('#heroFace .mascot')) $('#heroFace').innerHTML = mascotHTML;
    renderProfileBtn();
    $('#nameInput').value = save.name;
    renderRank();
    renderBerries();
    $('#stickerCount').textContent = `${STICKERS.filter(([e]) => save.stickers.includes(e)).length} av ${STICKERS.length}`;
    const dups = stickerDups();
    $('#stickerText').textContent = dups ? `Du har ${dups} ${dups === 1 ? 'dubblett' : 'dubbletter'} att byta mot jordgubbar till ${petName()}!` : `Samla alla ${STICKERS.length}. Några är legendariska och väldigt svåra att hitta!`;

    renderDaily();
    renderPet();
    renderWorldTabs($('#worldTabs'), renderStart);

    fixDates();
    const all = stations(w.id), units = pathUnits(w.id);
    const next = all.find(s => !s.done);
    // Kortet visar tydligt vilket räknesätt vägen gäller
    $('#roadCard').dataset.world = w.id;
    $('#roadWorld').textContent = `${WORLD_ICON[w.id]} ${w.tab}${w.id === 'plus' ? ' · talkamrater' : ''}`;
    $('#roadLabel').textContent = `Vägen till expert i ${w.tab.toLowerCase()}`;
    $('#roadCount').textContent = `Steg ${units.done} av ${units.total}`;
    $('#roadMeter').style.width = (100 * units.done / units.total) + '%';
    const recalls = recallsWaiting().filter(r => r.world === w.id);
    $('#roadNext').innerHTML = (next ? `Nästa: <span>${esc(stepName(next))}</span>` : `<span>Du är ${w.expertTitle}!</span>`)
      + (recalls.length ? `<br><span class="recall-note">✨ Ett Kom ihåg-prov väntar</span>` : '');
    $('#openRoad').textContent = units.done === 0 ? 'Börja resan' : next ? 'Fortsätt resan' : 'Titta på vägen';

    const tricky = Object.values(save.tricky).filter(v => v > 0).length;
    $('#trickyPanel').hidden = tricky === 0;
    $('#trickyText').textContent = `${tricky} ${tricky === 1 ? 'uppgift har' : 'uppgifter har'} varit kluriga. Öva på dem så blir de lätta!`;

    $('#freeTitle').textContent = `Fri träning: ${w.tab}`;
    const freeGot = w.levels.reduce((sum, n) => sum + bestOf(w.id, n), 0);
    $('#freeStars').innerHTML = `<span class="star" aria-hidden="true">★</span> ${freeGot} av ${w.levels.length * 3}`;
    $('#freeStars').setAttribute('aria-label', `${freeGot} av ${w.levels.length * 3} stjärnor`);
    const g = $('#numgrid'); g.innerHTML = '';
    for (const n of w.levels) {
      const b = document.createElement('button');
      b.className = 'num' + (n > 10 ? ' big' : '');
      const best = bestOf(w.id, n);
      b.innerHTML = `${w.id === 'minus' ? `<small class="pre">${MINUS}</small>` : w.id === 'dubbel' ? '<small class="pre">2×</small>' : ''}${n}<span class="s" aria-hidden="true">${starStr(best)}</span>`;
      b.setAttribute('aria-label', `${w.level(n)}, ${best} stjärnor`);
      b.addEventListener('click', () => { roadContext = false; if (w.id === 'plus') openMode(n); else startFindLevel(w.id, n); });
      g.appendChild(b);
    }
    $('#mixA').textContent = w.mixes[0].label;
    $('#mixB').textContent = w.mixes[1].label;

    const acc = !!net.player;
    renderClassTop();
    renderInstall();
    const solo = isSolo();
    $('#joinCard').hidden = !net.online || (acc && !solo);
    $('#joinCardTitle').textContent = solo ? 'Går du i en klass?' : 'Spela med din klass';
    $('#joinCardText').textContent = solo
      ? 'Skriv klasskoden från din lärare, så följer dina stjärnor, ditt husdjur och din väg med in i klassen.'
      : 'Hjälps åt med veckans uppdrag, heja på varandra och spara dina stjärnor på alla enheter. Spelar du hemma kan du skapa ett eget konto.';
    $('#openJoin').textContent = solo ? 'Gå med i en klass' : 'Gå med i klassen';
    $('#openAccount').hidden = solo;
    $('#nameField').hidden = acc;
    $('#resetBtn').hidden = acc;
    $('#logoutBtn').hidden = !acc;
    $('#whoLine').hidden = !acc;
    if (acc) $('#whoLine').textContent = solo ? `${net.player.avatar} ${net.player.name} · din kod ${net.player.classCode}`
      : `${net.player.avatar} ${net.player.name} i ${net.player.className || 'klassen'}`;

    renderVoicePick();
    renderExtrasCard();
    renderNews();
    renderBuddyCard();
    renderPetTab();
    renderToday();
    $('#noClassText').hidden = (!!net.player && !isSolo()) || !$('#joinCard').hidden;
    applyTab();
    document.body.classList.toggle('on-start', current === 'start');
    renderSettings();
  }
  // Kugghjulet blir elevens figur när man har ett konto, med ett litet kugghjul i hörnet
  function renderProfileBtn() {
    const btn = $('#settingsBtn'), av = net.player && net.player.avatar;
    btn.classList.toggle('profile', !!av);
    btn.innerHTML = av ? `<span class="pf-av" aria-hidden="true">${esc(av)}</span><span class="pf-gear" aria-hidden="true">⚙️</span>` : '⚙️';
    btn.setAttribute('aria-label', av ? `${net.player.name}: profil och inställningar` : 'Inställningar');
    btn.title = av ? 'Profil och inställningar' : 'Inställningar';
  }
  // Jordgubbarna i sidhuvudet: det man kan handla kläder och mat för
  function renderBerries() {
    const el = $('#berryCount');
    if (el && save) el.textContent = basket();
  }
  function renderSettings() {
    $('#soundBtn').setAttribute('aria-pressed', String(prefs.sound));
    $('#soundBtn .tg-ic').textContent = prefs.sound ? '🔊' : '🔇';
    $('#voiceBtn').setAttribute('aria-pressed', String(prefs.voice));
    $('#settingsBtn').classList.toggle('muted', !prefs.sound);
  }

  // Lärarens fokus: ett eller flera tal, t.ex. "p7,m10" = talkamraterna till 7 och minus från 10
  const teacherFocuses = () => String((net.player && net.player.focus) || '').split(',').map(x => x.trim()).filter(f => /^[pmd]\d{1,2}$/.test(f));
  const teacherFocus = () => teacherFocuses()[0] || null;
  const focusWorld = f => ({ p: 'plus', m: 'minus', d: 'dubbel' })[f[0]];
  const focusText = f => (f[0] === 'p' ? `talkamraterna till ${f.slice(1)}` : f[0] === 'm' ? `minus från ${f.slice(1)}` : `dubblorna upp till ${f.slice(1)}`);
  const focusListText = list => (list.length < 2 ? list.map(focusText).join('') : `${list.slice(0, -1).map(focusText).join(', ')} och ${focusText(list[list.length - 1])}`);
  const focusTrainedToday = f => (save.dates['f-' + f] || 0) === today();
  function startFocus(f = teacherFocus()) {
    if (!f) return;
    roadContext = false;
    startFindLevel(focusWorld(f), +f.slice(1), true);
  }

  // Klassen överst på startsidan: veckans uppdrag, ditt bidrag och senaste händelsen
  function renderClassTop() {
    const box = $('#classTop');
    if (!net.player || isSolo()) { box.hidden = true; return; }
    box.hidden = false;
    const ci = net.classInfo;
    $('#ctName').textContent = net.player.className || 'Klassen';
    const fl = teacherFocuses();
    $('#ctFocus').hidden = !fl.length;
    if (fl.length) $('#ctFocusText').textContent = `Läraren vill att du tränar ${focusListText(fl)}`;
    const fresh = ci ? ci.myCheers - (prefs.seenCheers[net.player.id] || 0) : 0;
    $('#cheerBadge').hidden = fresh <= 0;
    $('#cheerBadge').textContent = fresh > 0 ? `👏 ${fresh} ${fresh === 1 ? 'nytt hejarop' : 'nya hejarop'}` : '';
    if (!ci || !ci.mission) {
      $('#ctMission').textContent = net.online ? 'Hämtar klassens uppdrag …' : 'Klassen syns när du har internet.';
      $('#ctMeter').style.width = '0%'; $('#ctMine').textContent = ''; $('#ctEvent').hidden = true;
      return;
    }
    const m = ci.mission;
    const done = m.progress >= m.goal;
    $('#ctMission').textContent = m.title;
    $('#ctMeter').style.width = Math.min(100, 100 * m.progress / m.goal) + '%';
    $('#ctProgress').textContent = done ? `Klart! ${m.progress} ${m.unit} 🎉` : `${m.progress} av ${m.goal} ${m.unit}`;
    $('#ctMine').textContent = m.mine > 0 ? `Du har bidragit med ${m.mine} ${m.unit}. Tack! 🤝` : 'Spela en runda så hjälper du klassen!';
    const all = m.everyone;
    $('#ctAll').hidden = !all || all.players < 2;
    if (all && all.players >= 2) $('#ctAll').textContent = all.allIn ? `🌟 Alla ${all.players} är med den här veckan!` : `👥 ${all.contributed} av ${all.players} har varit med den här veckan`
      + (ci.pet && ci.pet.stage > 0 ? ` · ${ci.pet.icon} ${ci.pet.name} ${ci.pet.mood === 'längtar' ? 'längtar' : 'är glad'}` : '');
    const cheerLine = contestCheer(ci.contest);
    $('#ctContest').hidden = !cheerLine;
    if (cheerLine) $('#ctContest').textContent = cheerLine;
    const ev = ci.events && ci.events[0];
    $('#ctEvent').hidden = !ev;
    if (ev) $('#ctEvent').innerHTML = `${esc(ev.avatar)} ${eventText(ev)}`;
    $('#classTop').classList.toggle('is-done', done);
  }

  /* ================= Nyheter ================= */
  // "Nytt! Nu kan du träna på …" visas tills eleven har sett det. Det som är sett
  // sparas i framstegen (dates['n-<id>']) så att det gäller på alla enheter.
  // Lägg nya nyheter först i listan; bara en visas åt gången.
  const NEWS = [
    { id: 'stickers2', icon: '🪐', title: '27 nya klistermärken', text: 'Nu finns det 60 klistermärken att samla, bland annat tre nya legendariska. Kan du hitta Vintergatan?',
      go: 'Öppna boken', action: () => openBook() },
    { id: 'buddy1', icon: '🤝', title: 'Kompisutmaning', text: 'Utmana en kompis på skolan. Klarar ni målet tillsammans får ni varsin kompisbricka!',
      go: 'Utmana en kompis', when: () => canBuddy(), action: () => openBuddy() },
    { id: 'jump2', icon: MINI_PLUTT, title: 'Svårare hopp för Plutt', text: 'Plutts hopp har nya nivåer med hopp om 3, 4, 20 och 25, och linjer som börjar mitt i.',
      go: 'Hjälp Plutt', action: () => openExtra('jump') },
    { id: 'extras1', icon: '📏', title: 'Nu kan du träna på tallinjen', text: 'Hitta var talen bor, hjälp Plutt att hoppa rätt och knäck hemliga ord.',
      go: 'Testa nu', action: () => openExtra('line') }
  ];
  function currentNews() {
    // Nytt veckouppdrag för klassen: "Nu har vi ett nytt uppdrag!"
    const m = net.classInfo && net.classInfo.mission;
    if (m && net.player && !isSolo()) {
      const wk = dayNumber(new Date(m.start));
      if ((save.dates['n-mission'] || 0) < wk) {
        return { id: 'mission', value: wk, icon: '🎯', title: 'Nu har vi ett nytt uppdrag!', text: `${m.title}. Hela klassen hjälps åt!`, go: 'Till klassen', action: () => openClass() };
      }
    }
    return NEWS.find(n => !save.dates['n-' + n.id] && (!n.when || n.when())) || null;
  }
  function seeNews(n) {
    save.dates['n-' + n.id] = n.value || today();
    persist();
  }
  function renderNews() {
    const n = currentNews();
    $('#newsCard').hidden = !n || needsWelcome();
    if (!n) return;
    $('#newsIcon').innerHTML = n.icon;
    $('#newsTitle').textContent = n.title;
    $('#newsText').textContent = n.text;
    $('#newsGo').textContent = n.go;
    $('#newsGo').onclick = () => { seeNews(n); sfx.select(); n.action(); };
    $('#newsHide').onclick = () => { seeNews(n); sfx.select(); renderNews(); };
  }

  /* ================= Kompisutmaning ================= */
  // Bjud in en kompis på skolan till ett gemensamt mål. En utmaning åt gången.
  const canBuddy = () => !!(net.player && !isSolo() && net.online);
  const BUDDY_XP = 15;
  async function refreshBuddy() {
    if (!canBuddy()) { net.buddy = null; return null; }
    try {
      net.buddy = await api('GET', 'me/buddies');
      const c = net.buddy.challenge;
      if (c && c.status === 'done' && !c.claimed) claimBuddy(c);
      if (current === 'start') renderBuddyCard();
      return net.buddy;
    } catch (e) { return null; }
  }
  async function buddyDo(action, c) {
    try {
      const r = await api('POST', `me/challenge/${c.id}/${action}`);
      if (net.buddy) net.buddy.challenge = r.challenge;
      renderBuddyCard();
      return r;
    } catch (e) { cheer(e.message); return null; }
  }
  // Klarad utmaning: kompisbricka och mat till husdjuret (en gång per elev)
  async function claimBuddy(c) {
    if (c.claiming) return;
    c.claiming = true;
    const r = await buddyDo('claim', c);
    if (!r || r.already) return;
    save.records.buddies = (save.records.buddies || 0) + 1;
    const grew = feedPet(BUDDY_XP);
    persist();
    setTimeout(() => {
      cheer(`Kompisbricka! 🤝`, true); rain(200); sfx.fanfare();
      say(`Hurra! Du och ${c.mate.name} klarade kompisutmaningen! Ni får varsin kompisbricka.`);
      if (grew) setTimeout(() => cheer(`${petName()} växte!`, true), 1600);
    }, 900);
  }
  const daysLeftText = ms => { const d = Math.max(0, Math.ceil((ms - Date.now()) / 86400000)); return d <= 1 ? 'sista dagen' : `${d} dagar kvar`; };
  function renderBuddyCard() {
    const card = $('#buddyCard');
    card.hidden = !canBuddy() || !net.buddy;
    if (card.hidden) return;
    const c = net.buddy.challenge, body = $('#buddyBody'), sub = $('#buddySub');
    card.classList.toggle('done', !!c && c.status === 'done');
    const mate = c ? `<span class="bd-mates"><span class="em" aria-hidden="true">${esc(myFace())}</span>+<span class="em" aria-hidden="true">${esc(c.mate.avatar)}</span> ${esc(c.mate.name)}${c.mate.className ? ` <small>(${esc(c.mate.className)})</small>` : ''}</span>` : '';
    if (!c) {
      sub.textContent = 'Klara ett mål tillsammans';
      body.innerHTML = `<p>Utmana en kompis på skolan. Klarar ni målet på tre dagar får ni varsin kompisbricka och extra mat till ${esc(petName())}.</p>
        <div class="bd-row"><button class="chunky sun" id="bdNew">Utmana en kompis</button></div>`;
      $('#bdNew').onclick = openBuddy;
    } else if (c.status === 'pending' && c.role === 'from') {
      sub.textContent = 'Väntar på svar';
      body.innerHTML = `${mate}<p>${esc(c.title)}. Väntar på att ${esc(c.mate.name)} ska svara …</p>
        <div class="bd-row"><button class="textbtn" id="bdCancel">Ta tillbaka inbjudan</button></div>`;
      $('#bdCancel').onclick = () => buddyDo('cancel', c);
    } else if (c.status === 'pending') {
      sub.textContent = 'Du har fått en inbjudan!';
      body.innerHTML = `${mate}<p>${esc(c.mate.name)} vill göra en kompisutmaning med dig: <b>${esc(c.title)}</b> på tre dagar.</p>
        <div class="bd-row"><button class="chunky coral" id="bdYes">Ja, vi kör!</button><button class="textbtn" id="bdNo">Nej tack</button></div>`;
      $('#bdYes').onclick = async () => { if (await buddyDo('accept', c)) { sfx.fanfare(); cheer('Nu kör ni!', true); say(`Nu kör du och ${c.mate.name}!`); } };
      $('#bdNo').onclick = () => buddyDo('decline', c);
    } else if (c.status === 'active') {
      sub.textContent = daysLeftText(c.endsAt);
      body.innerHTML = `${mate}<p>${esc(c.title)}</p>
        <div class="meter"><i style="width:${Math.min(100, 100 * c.progress / c.goal)}%"></i></div>
        <div class="bd-split"><span>Du: ${c.mine}</span><span>${c.progress} av ${c.goal} ${esc(c.unit)}</span><span>${esc(c.mate.name)}: ${c.theirs}</span></div>
        <div class="bd-row"><button class="textbtn" id="bdQuit">Avsluta utmaningen</button></div>`;
      let armed = false;
      $('#bdQuit').onclick = e => { if (!armed) { armed = true; e.target.textContent = 'Säker? Tryck igen'; return; } buddyDo('cancel', c); };
    } else if (c.status === 'done') {
      sub.textContent = 'Klart! 🎉';
      body.innerHTML = `${mate}<p>Ni klarade det! ${c.progress} ${esc(c.unit)} tillsammans. Ni fick varsin kompisbricka 🤝</p>
        <div class="bd-row"><button class="chunky sun" id="bdAgain">Ny utmaning</button><button class="textbtn" id="bdOk">Okej!</button></div>`;
      $('#bdAgain').onclick = openBuddy;
      $('#bdOk').onclick = () => buddyDo('seen', c);
    } else {
      sub.textContent = c.status === 'declined' ? 'Inte den här gången' : 'Tiden tog slut';
      body.innerHTML = `${mate}<p>${c.status === 'declined' ? `${esc(c.mate.name)} kunde inte den här gången. Utmana någon annan!`
        : c.progress ? `Ni kom till ${c.progress} av ${c.goal} ${esc(c.unit)}. Bra kämpat, försök igen!` : `${esc(c.mate.name)} hann inte svara. Försök igen!`}</p>
        <div class="bd-row"><button class="chunky sun" id="bdAgain">Ny utmaning</button><button class="textbtn" id="bdOk">Okej!</button></div>`;
      $('#bdAgain').onclick = async () => { await buddyDo('seen', c); openBuddy(); };
      $('#bdOk').onclick = () => buddyDo('seen', c);
    }
  }
  const B = { goal: 'answers', mate: null };
  async function openBuddy() {
    stopGame();
    show('buddy');
    talk('Välj ett mål och en kompis. Ni hjälps åt, och klarar ni det får ni varsin kompisbricka!', 'happy');
    $('#buddyErr').textContent = '';
    $('#buddyMates').innerHTML = '<p class="stats">Hämtar kompisar …</p>';
    const d = await refreshBuddy();
    if (current !== 'buddy') return;
    if (!d) { $('#buddyMates').innerHTML = '<p class="error">Kommer inte åt servern just nu.</p>'; return; }
    if (d.challenge && ['pending', 'active'].includes(d.challenge.status)) { goHome(); cheer('Du har redan en kompisutmaning'); return; }
    const goals = $('#buddyGoals'); goals.innerHTML = '';
    d.goals.forEach(g => {
      const b = document.createElement('button');
      b.className = 'chip'; b.textContent = g.title; b.setAttribute('aria-pressed', String(g.id === B.goal));
      b.onclick = () => { B.goal = g.id; $$('#buddyGoals .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); sfx.select(); };
      goals.appendChild(b);
    });
    const list = $('#buddyMates'); list.innerHTML = '';
    if (!d.mates.length) list.innerHTML = '<p class="stats">Det finns inga kompisar att utmana än.</p>';
    let grp = null;
    B.mate = null;
    d.mates.forEach(m => {
      const g = m.sameClass ? 'Din klass' : m.className;
      if (g !== grp) { grp = g; list.insertAdjacentHTML('beforeend', `<span class="grp">${esc(g)}</span>`); }
      const b = document.createElement('button');
      b.className = 'mate-pick'; b.disabled = m.busy; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `<span class="em" aria-hidden="true">${esc(m.avatar)}</span><b>${esc(m.name)}</b><small>${m.busy ? 'Har redan en utmaning' : m.sameClass ? 'Din klass' : esc(m.className)}</small>`;
      b.onclick = () => { B.mate = m.id; $$('#buddyMates .mate-pick').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('#buddySend').disabled = false; sfx.select(); };
      list.appendChild(b);
    });
    $('#buddySend').disabled = true;
  }
  $('#buddySend').addEventListener('click', async () => {
    if (!B.mate) return;
    $('#buddySend').disabled = true;
    try {
      const r = await api('POST', 'me/challenge', { toId: B.mate, metric: B.goal });
      net.buddy = { ...(net.buddy || {}), challenge: r.challenge };
      goHome();
      cheer('Inbjudan skickad! 🤝', true); sfx.fanfare();
      say(`Inbjudan skickad till ${r.challenge.mate.name}!`);
    } catch (e) { $('#buddyErr').textContent = e.message; $('#buddySend').disabled = false; }
  });

  // Första gången: välj namn eller gå med i klassen. Inget förvalt namn.
  function needsWelcome() { return !net.player && !save.name && !ls.get(ACCOUNT_KEY); }
  function showWelcome() {
    stopGame();
    show('welcome');
    $('#welcomeJoin').hidden = !net.online;
    $('#welcomeAccount').hidden = !net.online;
    $('#welcomeOr').hidden = !net.online;
    $('#welcomeName').value = '';
  }
  function welcomeStart() {
    const name = $('#welcomeName').value.replace(/[<>]/g, '').trim().slice(0, 16);
    if (name.length < 2) { $('#welcomeErr').textContent = 'Skriv ditt namn (minst två bokstäver).'; $('#welcomeName').focus(); return; }
    save.name = name; persist();
    goHome();
    cheer(`Välkommen ${name}!`, true); sfx.fanfare(); say(`Välkommen ${name}! Nu kör vi!`);
  }
  $('#welcomeGo').addEventListener('click', welcomeStart);
  $('#welcomeName').addEventListener('keydown', e => { if (e.key === 'Enter') welcomeStart(); });
  $('#welcomeJoinBtn').addEventListener('click', () => openJoin());
  $('#welcomeAccountBtn').addEventListener('click', () => openAccount());
  $('#welcomeLoginBtn').addEventListener('click', () => openJoin());

  /* ================= Välj spelsätt (plus) ================= */
  let chosenN = 8;
  const pairCount = n => Math.floor(n / 2) + 1;
  function openMode(n) {
    chosenN = n;
    stopGame();
    $('#modeN').textContent = n;
    const a = n >= 2 ? rnd(1, n - 1) : 0;
    $('#demoFind').innerHTML = `<span class="a">${a}</span> + <span class="b">?</span> = ${n}`;
    $('#demoBubbles').innerHTML = `<span class="a">${a}</span> + <span class="b">${n - a}</span>`;
    $('#findInfo').textContent = `Alla ${n + 1} kamraterna till ${n}, från 0 + ${n} till ${n} + 0. Pärlorna hjälper dig.`;
    $('#bubInfo').textContent = `Poppa alla ${pairCount(n)} paren som blir ${n}.`;
    $('#bestFind').innerHTML = 'Bäst: ' + starStr(save.best[n + ':find'] || 0);
    $('#bestBubbles').innerHTML = 'Bäst: ' + starStr(save.best[n + ':bubbles'] || 0);
    const p = $('#pairs'); p.innerHTML = '';
    for (let i = 0; i <= n; i++) p.insertAdjacentHTML('beforeend', `<span class="domino" aria-label="${i} plus ${n - i}"><span>${i}</span><span>${n - i}</span></span>`);
    $('details.friends').open = false;
    $('#mode .back').onclick = () => (roadContext ? openRoad() : goHome());
    show('mode');
  }

  /* ================= Spel: Hitta kamraten / prov ================= */
  function startFindLevel(w, n, isFocus, extra = {}) {
    const Wd = WORLDS[w];
    startFind({ kind: 'train', world: w, n, focus: !!isFocus || teacherFocuses().includes(`${w[0]}${n}`), level: `${Wd.prefix}${n}`, mode: 'find',
      label: isFocus ? `Fokus: ${Wd.level(n)}` : Wd.level(n), qs: allQs(w, n), beads: true, retry: true,
      ...extra, again: () => startFindLevel(w, n, isFocus, extra) });
  }
  // Öva minus åt båda hållen: "8 − 3 = ?" och "8 − ? = 5" varannan gång
  function startBoth(n, extra = {}) {
    const qs = allQs('minus', n).map((q, i) => ({ ...q, form: i % 2, fixed: true }));
    startFind({ kind: 'train', world: 'minus', n, level: `m${n}`, mode: 'both', label: `Minus från ${n}: åt båda hållen`, qs, beads: true, retry: true,
      ...extra, again: () => startBoth(n, extra) });
  }
  // Öva halvor: "Hälften av 12" och "? + ? = 12"
  function startHalves(n, extra = {}) {
    let qs = range(1, n).map((L, i) => ({ w: 'dubbel', n: L, a: L, form: i % 3 === 2 ? 1 : 2, fixed: true }));
    while (qs.length < 4) qs = qs.concat(qs.map(q => ({ ...q, form: q.form === 2 ? 1 : 2 })));
    startFind({ kind: 'train', world: 'dubbel', n, level: `d${n}`, mode: 'half', label: `Halvor upp till ${2 * n}`, qs: shuffle(qs), beads: true, retry: true,
      ...extra, again: () => startHalves(n, extra) });
  }
  // Talprovet (Kunna): kort och utan pärlor
  function startNumTest(w, n, extra = {}) {
    const c = numTestCfg(w, n), Wd = WORLDS[w];
    const station = { world: w, kind: 'numtest', id: masterId(w, n), name: `Talprov: ${Wd.level(n)}`, ...c };
    startFind({ kind: 'numtest', world: w, n, level: station.id, mode: 'test', label: station.name, qs: randQs(w, c.count, c.lo, c.hi), beads: false, retry: false, station,
      ...extra, again: () => startNumTest(w, n, extra) });
  }
  function startMix(i) {
    const w = W(), m = w.mixes[i];
    const qs = randQs(w.id, 12, m.lo, m.hi);
    // Lärarens fokus kommer oftare: var tredje fråga, och fokusen turas om
    const fs = teacherFocuses().filter(f => focusWorld(f) === w.id);
    if (fs.length) for (let k = 0, j = 0; k < qs.length; k += 3, j++) { const n = +fs[j % fs.length].slice(1); qs[k] = rndQ(w.id, n, n); }
    startFind({ kind: 'mix', world: w.id, level: m.key, mixIndex: i, mode: 'find', label: m.label, qs, beads: true, retry: true });
  }
  function startTricky() {
    const qs = questionsTricky();
    if (!qs.length) return goHome();
    startFind({ kind: 'tricky', world: 'plus', level: 'tricky', mode: 'find', label: 'Kluriga kamrater', qs, beads: true, retry: true });
  }
  function startTest(s) {
    startFind({ kind: s.kind, world: s.world, level: s.id, mode: 'test', label: s.name, qs: randQs(s.world, s.count, s.lo, s.hi), beads: false, retry: false, station: s,
      again: () => startTest(s) });
  }

  function startFind(cfg) {
    stopGame();
    G = { ...cfg, game: 'find', idx: 0, mistakes: 0, score: 0, streak: 0, bestStreak: 0, firstTry: 0, missed: [], marks: [], skillStart: { ...save.skill } };
    show('find');
    $('#findLabel').textContent = cfg.label;
    $('#findProgress').classList.toggle('many', cfg.qs.length > 12);
    setStreak($('#findStreak'), 0);
    nextFind();
  }

  function renderProgress(el, done, total, nowIdx, marks) {
    el.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const d = document.createElement('i');
      if (i < done) d.className = marks && marks[i] === false ? 'miss' : 'done';
      else if (i === nowIdx) d.className = 'now';
      el.appendChild(d);
    }
  }
  function setStreak(el, s) {
    el.textContent = `🔥 ${s}`;
    el.classList.remove('bump'); void el.offsetWidth; if (s) el.classList.add('bump');
  }

  function nextFind() {
    const q = prepQ(G.qs[G.idx]);
    G.cur = q; G.tries = 0; G.locked = false;
    renderProgress($('#findProgress'), G.idx, G.qs.length, G.idx, G.marks);
    $('#equation').innerHTML = equationHTML(q, false);
    q.mode = G.beads ? beadMode(q) : 'none';
    showBeads(q, false, false);
    $('#findExplain').textContent = !G.beads ? `Fråga ${G.idx + 1} av ${G.qs.length}`
      : q.mode === 'none' ? 'Inga pärlor här, du kan det här! 💪' : '';
    renderAnswers($('#answers'), q, answerFind);
    if (!G.retry) { if (G.idx === 0) talk('Lycka till! Tänk efter, ett svar per fråga.'); }
    else talk(promptFor(q, G.idx === 0));
  }

  function answerFind(btn, v) {
    if (!G || G.locked || btn.disabled) return;
    const q = G.cur;
    if (v === q.ans) {
      G.locked = true;
      btn.classList.add('right');
      $$('#answers .ans').forEach(x => { x.disabled = true; });
      $('#equation').innerHTML = equationHTML(q, true);
      showBeads(q, true, false);
      if (G.tries === 0) { G.firstTry++; G.score++; G.marks[G.idx] = true; markTricky(q, false); markSkill(q, true); }
      else G.marks[G.idx] = false;
      G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
      setStreak($('#findStreak'), G.streak);
      wishProgress({ kind: 'answer', w: q.w, streak: G.streak });
      $('#findExplain').innerHTML = explainRight(q);
      celebrate(btn, G.streak);
      G.idx++;
      renderProgress($('#findProgress'), G.idx, G.qs.length, -1, G.marks);
      timer = setTimeout(() => (G.idx >= G.qs.length ? finishFind() : nextFind()), STREAKS[G.streak] ? 1900 : 1400);
      return;
    }
    btn.classList.add('wrong'); btn.disabled = true;
    G.mistakes++; G.streak = 0;
    if (G.tries === 0) { markTricky(q, true); markSkill(q, false); G.missed.push(q); }
    G.tries++;
    setStreak($('#findStreak'), 0);
    sfx.wrong();
    if (!G.retry) {
      // Prov: visa rätt svar och gå vidare
      G.locked = true;
      G.marks[G.idx] = false;
      $$('#answers .ans').forEach(x => { x.disabled = true; if (+x.dataset.v === q.ans) x.classList.add('correct-was'); });
      $('#equation').innerHTML = equationHTML(q, true);
      $('#findExplain').innerHTML = `Rätt svar var ${q.ans}. ${explainRight(q)}`;
      talk(pick(['Ingen fara, nästa!', 'Den tar vi nästa gång!', 'Kämpa på!']), 'oops');
      G.idx++;
      timer = setTimeout(() => (G.idx >= G.qs.length ? finishFind() : nextFind()), 2400);
      return;
    }
    $('#findExplain').textContent = explainWrong(q, v);
    // Svårt? Då kommer pärlorna tillbaka som hjälp
    if (G.beads && q.mode !== 'full') { q.mode = 'full'; showBeads(q, false, false); }
    if (G.tries >= 2 && G.beads) {
      renderBeads(q, false, true);
      talk(q.w === 'dubbel' ? 'Titta, jag har delat pärlorna i två lika stora grupper!' : 'Räkna de tomma ringarna, jag har numrerat dem åt dig!', 'oops');
    } else talk(pick(OOPS), 'oops');
  }

  function celebrate(el, streak, quiet) {
    if (quiet) sfx.quick(); else sfx.right();
    const [x, y] = centerOf(el);
    burst(x, y, quiet ? 18 : 36);
    const big = STREAKS[streak];
    if (big) {
      setTimeout(() => { sfx.streak(); cheer(big, true); rain(90); say(big); }, 250);
      talk(pick(nameCheers()), 'happy');
    } else if (!quiet) {
      const c = pick(CHEERS);
      cheer(c);
      say(Math.random() < 0.3 ? pick(nameCheers()) : c);
      talk(Math.random() < 0.5 ? pick(nameCheers()) : c, 'happy');
    }
  }

  function finishFind() {
    const total = G.qs.length;
    if (G.mode === 'test') {
      const s = G.station;
      const passed = G.score >= s.pass;
      const stars = !passed ? 0 : G.score === total ? 3 : G.score >= total - 1 ? 2 : 1;
      return finish({ passed, stars, score: G.score, total, stats: `${G.score} rätt av ${total} · ${s.pass} behövdes` });
    }
    const m = G.mistakes;
    const stars = m <= Math.ceil(total * 0.1) ? 3 : m <= Math.ceil(total * 0.3) ? 2 : 1;
    finish({ passed: true, stars, score: G.firstTry, total, stats: `${total} rätt av ${total} · ${G.firstTry} på första försöket · bästa svit ${G.bestStreak} i rad` });
  }

  /* ================= Spel: Bubbelpoppen ================= */
  const BUB_COLORS = ['var(--blue)', 'var(--coral)', 'var(--leaf)', 'var(--berry)', 'var(--grape)', '#14A3B8'];
  const WAVE = 6;
  function startBubbles(n, extra = {}) {
    stopGame();
    // Alla par som blir n, t.ex. 8: 0+8, 1+7, 2+6, 3+5, 4+4
    const pairs = shuffle(range(0, pairCount(n) - 1).map(a => [a, n - a]));
    const waveCount = Math.ceil(pairs.length / WAVE);
    const per = Math.ceil(pairs.length / waveCount);
    const waves = [];
    for (let i = 0; i < pairs.length; i += per) waves.push(pairs.slice(i, i + per));
    G = { ...extra, again: () => startBubbles(n, extra), game: 'bubbles', kind: 'train', world: 'plus', mode: 'bubbles', level: String(n), n, waves, wave: 0, pairs: pairs.length, found: 0, mistakes: 0, streak: 0, bestStreak: 0, firstTry: 0, missStreak: 0, sel: null, busy: false };
    show('bubbles');
    $('#bubN').textContent = n;
    $('#bubLabel').textContent = `Talet ${n}`;
    $('#found').innerHTML = '';
    $('#bubExplain').textContent = '';
    setStreak($('#bubStreak'), 0);
    renderProgress($('#bubProgress'), 0, G.pairs, 0);
    renderWave();
    talk(`Hitta alla ${G.pairs} paren som blir ${n} och poppa dem!`);
  }

  function renderWave() {
    const vals = shuffle(G.waves[G.wave].flat());
    G.waveLeft = G.waves[G.wave].length;
    const pond = $('#pond'); pond.innerHTML = '';
    vals.forEach(v => {
      const b = document.createElement('button');
      b.className = 'bubble'; b.textContent = v; b.dataset.v = v;
      b.style.setProperty('--c', pick(BUB_COLORS));
      b.style.setProperty('--d', (-Math.random() * 3).toFixed(2) + 's');
      b.setAttribute('aria-label', `Bubbla ${v}`);
      b.addEventListener('click', () => tapBubble(b));
      pond.appendChild(b);
    });
    G.busy = false;
  }

  function tapBubble(b) {
    if (!G || G.busy || b.classList.contains('popped')) return;
    if (!G.sel) { G.sel = b; b.classList.add('sel'); sfx.select(); return; }
    if (G.sel === b) { b.classList.remove('sel'); G.sel = null; return; }
    const a = G.sel, x = +a.dataset.v, y = +b.dataset.v;
    a.classList.remove('sel'); G.sel = null;
    if (x + y === G.n) {
      a.classList.add('popped'); b.classList.add('popped');
      a.disabled = b.disabled = true;
      sfx.pop();
      const [x1, y1] = centerOf(a), [x2, y2] = centerOf(b);
      burst(x1, y1, 22, .8); burst(x2, y2, 22, .8);
      G.found++; G.waveLeft--; G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
      wishProgress({ kind: 'answer', w: 'plus', streak: G.streak });
      if (G.missStreak === 0) G.firstTry++;
      G.missStreak = 0;
      setStreak($('#bubStreak'), G.streak);
      renderProgress($('#bubProgress'), G.found, G.pairs, G.found);
      $('#found').insertAdjacentHTML('beforeend', `<span class="domino"><span>${Math.min(x, y)}</span><span>${Math.max(x, y)}</span></span>`);
      $('#bubExplain').innerHTML = `<span class="a">${x}</span> + <span class="b">${y}</span> = ${G.n}. Pop!`;
      setTimeout(() => celebrate(b, G.streak), 120);
      if (G.found >= G.pairs) { G.busy = true; timer = setTimeout(finishBubbles, 1500); }
      else if (G.waveLeft === 0) {
        G.busy = true; G.wave++;
        timer = setTimeout(() => { renderWave(); talk(`Nya bubblor! ${G.pairs - G.found} par kvar.`, 'happy'); }, 1100);
      }
    } else {
      [a, b].forEach(el => { el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble'); setTimeout(() => el.classList.remove('wobble'), 500); });
      G.mistakes++; G.streak = 0; G.missStreak++;
      markTricky({ w: 'plus', n: G.n, a: x }, true);
      setStreak($('#bubStreak'), 0);
      sfx.wrong();
      const s = x + y;
      $('#bubExplain').textContent = `${x} + ${y} = ${s}. Vi letar efter ${G.n}, så ${s < G.n ? 'det är för lite' : 'det är för mycket'}.`;
      talk(G.missStreak >= 2 ? 'Tryck på "Tips, tack!" om du vill ha hjälp.' : pick(OOPS), 'oops');
    }
  }

  $('#tipBtn').addEventListener('click', () => {
    if (!G || G.game !== 'bubbles' || G.busy) return;
    const live = $$('#pond .bubble:not(.popped)');
    let first = G.sel || live[0];
    let partner = live.find(o => o !== first && +o.dataset.v + +first.dataset.v === G.n);
    if (!partner) {
      for (const f of live) { const p = live.find(o => o !== f && +o.dataset.v + +f.dataset.v === G.n); if (p) { first = f; partner = p; break; } }
    }
    if (!partner) return;
    [first, partner].forEach(el => { el.classList.remove('tip'); void el.offsetWidth; el.classList.add('tip'); setTimeout(() => el.classList.remove('tip'), 2500); });
    talk(`Titta på ${first.dataset.v}. Vem behöver den för att bli ${G.n}?`);
  });

  function finishBubbles() {
    const m = G.mistakes;
    const stars = m <= 1 ? 3 : m <= Math.max(3, Math.ceil(G.pairs * 0.5)) ? 2 : 1;
    finish({ passed: true, stars, score: G.firstTry, total: G.pairs, stats: `Alla ${G.pairs} par poppade · ${G.firstTry} på första försöket · bästa svit ${G.bestStreak} i rad` });
  }

  /* ================= Spel: Utmaning på tid ================= */
  function startChallenge(s) {
    stopGame();
    G = { game: 'challenge', kind: 'challenge', world: s.world, mode: 'challenge', level: s.id, station: s, score: 0, mistakes: 0, streak: 0, bestStreak: 0, locked: true, last: null };
    show('challenge');
    $('#chScore').textContent = '0';
    $('#chSecs').textContent = s.secs;
    $('#chBar').style.width = '100%';
    $('#chBar').classList.remove('low');
    setStreak($('#chStreak'), 0);
    $('#chPlay').hidden = true;
    const cd = $('#chCount'); cd.hidden = false;
    let c = 3;
    const step = () => {
      if (!G || G.game !== 'challenge') return;
      if (c > 0) { cd.textContent = c; cd.style.animation = 'none'; void cd.offsetWidth; cd.style.animation = ''; sfx.tick(); c--; timer = setTimeout(step, 800); }
      else {
        cd.textContent = 'Kör!'; sfx.right();
        timer = setTimeout(() => {
          cd.hidden = true; $('#chPlay').hidden = false;
          G.end = Date.now() + s.secs * 1000;
          ticker = setInterval(chTick, 100);
          nextChallenge();
        }, 500);
      }
    };
    step();
  }
  function chTick() {
    if (!G || G.game !== 'challenge') return;
    const left = Math.max(0, G.end - Date.now());
    const s = G.station;
    $('#chSecs').textContent = Math.ceil(left / 1000);
    $('#chBar').style.width = (100 * left / (s.secs * 1000)) + '%';
    $('#chBar').classList.toggle('low', left < 10000);
    if (left <= 0) {
      clearInterval(ticker); clearTimeout(timer);
      G.locked = true;
      $$('#chAnswers .ans').forEach(x => { x.disabled = true; });
      const passed = G.score >= s.goal;
      const old = save.records[s.id] || 0;
      const newRecord = G.score > old && G.score > 0;
      save.records[s.id] = Math.max(old, G.score);
      const stars = !passed ? 0 : G.score >= s.goal + 6 ? 3 : G.score >= s.goal + 3 ? 2 : 1;
      cheer('Tiden är slut!');
      timer = setTimeout(() => finish({ passed, stars, score: G.score, total: G.score + G.mistakes, newRecord,
        stats: `${G.score} rätt på ${s.secs} sekunder · mål ${s.goal}${newRecord ? ' · nytt rekord!' : ` · rekord ${save.records[s.id]}`}` }), 1200);
    }
  }
  function nextChallenge() {
    const s = G.station;
    let q;
    do { q = rndQ(s.world, s.lo, s.hi); } while (G.last && q.n === G.last.n && q.a === G.last.a && s.lo !== s.hi);
    prepQ(q);
    G.cur = q; G.last = q; G.locked = false;
    $('#chEquation').innerHTML = equationHTML(q, false);
    $('#chExplain').textContent = '';
    renderAnswers($('#chAnswers'), q, answerChallenge);
  }
  function answerChallenge(btn, v) {
    if (!G || G.locked) return;
    const q = G.cur;
    G.locked = true;
    if (v === q.ans) {
      btn.classList.add('right');
      G.score++; G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
      markTricky(q, false); markSkill(q, true);
      $('#chScore').textContent = G.score;
      wishProgress({ kind: 'answer', w: q.w, streak: G.streak });
      setStreak($('#chStreak'), G.streak);
      $('#chEquation').innerHTML = equationHTML(q, true);
      celebrate(btn, G.streak, true);
      if (G.score === G.station.goal) { cheer('Målet klart!', true); say('Målet klart! Fortsätt!'); }
      timer = setTimeout(nextChallenge, 350);
    } else {
      btn.classList.add('wrong');
      G.mistakes++; G.streak = 0;
      markTricky(q, true); markSkill(q, false);
      setStreak($('#chStreak'), 0);
      sfx.wrong();
      $$('#chAnswers .ans').forEach(x => { if (+x.dataset.v === q.ans) x.classList.add('correct-was'); });
      $('#chEquation').innerHTML = equationHTML(q, true);
      $('#chExplain').textContent = `Rätt svar var ${q.ans}.`;
      timer = setTimeout(nextChallenge, 1100);
    }
  }

  /* ================= Fler utmaningar: tallinjen, Plutts hopp, hemliga ordet ================= */
  // Egna övningar med nivåer som låses upp i tur och ordning (minst ★★ på nivån före).
  const LINE_LEVELS = [
    { name: 'Talen 0–10', hint: 'Ett steg i taget' },
    { name: 'Upp till 20', hint: 'Hopp om 1 och 2' },
    { name: 'Hopp om 2 och 5', hint: 'Upp till 50' },
    { name: 'Upp till 100', hint: 'Hopp om 5 och 10' },
    { name: 'Mitt i', hint: 'T.ex. mellan 40 och 60' },
    { name: 'Klurigt', hint: 'Bara några tal står ut' }
  ];
  // Plutts hopp har egna, svårare nivåer: redan första nivån blandar hoppstorlekar
  const JUMP_LEVELS = [
    { name: 'Hopp om 1, 2 och 5', hint: 'Ett tal i mitten hjälper till' },
    { name: 'Hopp om 2, 5 och 10', hint: 'Linjen börjar inte på 0, med ett tal i mitten' },
    { name: 'Hopp om 3 och 4', hint: 'Kluriga hopp' },
    { name: 'Två tal på linjen', hint: 'Räkna hoppen mellan dem' },
    { name: 'Stora hopp', hint: 'Hopp om 10, 20, 25 och 50' },
    { name: 'Mitt i linjen', hint: 'Plutt startar mitt på linjen' }
  ];
  const WORD_LEVELS = [
    { name: 'Plus upp till 10', hint: 'Korta ord' },
    { name: 'Plus upp till 20', hint: 'Ord med fyra bokstäver' },
    { name: 'Plus och minus', hint: 'Upp till 20' },
    { name: 'Blandat', hint: 'Med dubblor och tal som fattas' },
    { name: 'Tiotal', hint: 'Långa ord och tal upp till 100' }
  ];
  const EXTRAS = {
    line: { title: 'Tallinjen', icon: '📏', prefix: 'nl', mode: 'line', levels: LINE_LEVELS, count: 8,
      talk: 'Varje streck på tallinjen är ett tal. Kan du hitta var talen bor?' },
    jump: { title: 'Plutts hopp', icon: MINI_PLUTT, prefix: 'nj', mode: 'jump', levels: JUMP_LEVELS, count: 6,
      talk: 'Säg hur stora hoppen är mellan strecken. Svarar du rätt studsar jag hela vägen. Annars ramlar jag!' },
    word: { title: 'Hemliga ordet', icon: '🔤', prefix: 'w', mode: 'word', levels: WORD_LEVELS,
      talk: 'Räkna ut talet, leta upp det i kodnyckeln och få fram bokstaven. Vilket ord blir det?' }
  };
  const extraStars = (id, i) => save.best[`${EXTRAS[id].prefix}${i}:${EXTRAS[id].mode}`] || 0;
  const extraOpen = (id, i) => i === 0 || extraStars(id, i - 1) >= 2;
  const extraReached = id => EXTRAS[id].levels.reduce((n, _, i) => (extraOpen(id, i) ? i + 1 : n), 1);

  function renderExtrasCard() {
    for (const id of Object.keys(EXTRAS)) {
      const el = $(`[data-lv="${id}"]`);
      if (el) el.textContent = `Nivå ${extraReached(id)} av ${EXTRAS[id].levels.length}`;
    }
  }
  let extraCtx = null;
  function openExtra(id) {
    stopGame();
    extraCtx = id;
    const X = EXTRAS[id];
    show('extra');
    $('#extraTitle').innerHTML = `${X.icon} ${esc(X.title)}`;
    talk(X.talk, 'happy');
    const box = $('#extraLevels'); box.innerHTML = '';
    X.levels.forEach((lv, i) => {
      const open = extraOpen(id, i), stars = extraStars(id, i);
      const b = document.createElement('button');
      b.className = 'level' + (open ? '' : ' locked') + (stars ? ' done' : '');
      b.disabled = !open;
      b.innerHTML = `<span class="lv-n" aria-hidden="true">${open ? i + 1 : '🔒'}</span>
        <span class="lv-t"><b>${esc(lv.name)}</b><small>${esc(lv.hint)}</small></span>
        <span class="lv-s" aria-label="${stars} stjärnor">${starStr(stars)}</span>`;
      b.addEventListener('click', () => startExtra(id, i));
      box.appendChild(b);
    });
  }
  function startExtra(id, i) {
    if (id === 'word') return startWord(i);
    return startLine(id, i);
  }
  // Låser rundan upp nästa nivå? Räknas ut innan finish() sparar stjärnorna.
  function unlockNote(id, i, stars) {
    const X = EXTRAS[id];
    if (stars >= 2 && extraStars(id, i) < 2 && i + 1 < X.levels.length) return `🔓 Ny nivå: <b>${esc(X.levels[i + 1].name)}</b>!`;
    if (stars >= 2 && i + 1 === X.levels.length && extraStars(id, i) < 2) return `🏆 Du har klarat alla nivåer i ${esc(X.title)}!`;
    return null;
  }
  const extraStarsFor = (mistakes, total) => (mistakes <= Math.ceil(total * 0.1) ? 3 : mistakes <= Math.ceil(total * 0.35) ? 2 : 1);

  /* ---------- Tallinjen ---------- */
  // En tallinje: start, hoppets storlek, antal streck och vilka streck som har ett tal utskrivet
  function makeLine(lv, forJump) {
    for (let guard = 0; guard < 200; guard++) {
      let start = 0, step = 1, n = 11, labels = null;
      if (lv === 0) { step = 1; start = 0; labels = [0, 5, 10]; }
      else if (lv === 1) { if (Math.random() < 0.5) { step = 1; start = 10; } else { step = 2; start = 0; } }
      else if (lv === 2) { step = pick([2, 5]); n = pick([6, 11]); start = 10 * rnd(0, 5); }
      else if (lv === 3) { step = pick([5, 10]); start = step === 10 ? 0 : pick([0, 50]); }
      else if (lv === 4) { step = pick([1, 2, 2, 5]); start = 10 * rnd(1, 8); }
      else { step = pick([2, 5, 10]); n = pick([6, 8, 11]); start = step * rnd(1, 9); }
      const end = start + step * (n - 1);
      if (end > 100) continue;
      if (!labels) {
        if (lv === 5) {
          // Två tal någonstans på linjen, resten får man räkna fram
          const a = forJump ? 0 : rnd(0, 2), b = Math.min(n - 1, a + rnd(2, 4));
          labels = [a, b];
        } else labels = [0, n - 1];
        // På de lättare nivåerna står ett tal i mitten också, som hjälp
        if (lv >= 1 && lv <= 3 && n % 2 === 1) labels.push((n - 1) / 2);
      }
      return { start, step, n, labels: new Set(labels), end };
    }
    return { start: 0, step: 1, n: 11, labels: new Set([0, 10]), end: 10 };
  }
  const tickVal = (L, i) => L.start + i * L.step;
  // Tallinjer för Plutts hopp. from = strecket där Plutt börjar (det första talet som står ut).
  // Hoppstorlekarna på varje nivå. Används också som svarsalternativ, så att
  // alternativen passar nivån (inget "1" när hoppen är 2, 5 och 10).
  const JUMP_STEPS = [[1, 2, 5], [2, 5, 10], [3, 4], [2, 3, 4, 5, 10], [10, 20, 25, 50], [2, 3, 4, 5, 10, 20, 25]];
  function makeJumpLine(lv) {
    for (let guard = 0; guard < 300; guard++) {
      let step, start, n, a = 0, b;
      const steps = JUMP_STEPS[lv];
      step = pick(steps);
      if (lv === 0) { start = pick([0, 10, 20]); n = rnd(6, 11); }
      else if (lv === 1) { start = 10 * rnd(1, 6); n = rnd(5, 9); }
      else if (lv === 2) { start = step * rnd(0, 6); n = rnd(5, 8); }
      else if (lv === 3) { start = 10 * rnd(0, 5); n = rnd(6, 9); b = rnd(2, 4); }
      else if (lv === 4) { start = step * rnd(0, 4); n = rnd(5, 7); b = rnd(2, 3); }
      else { start = step * rnd(0, 8); n = rnd(7, 9); a = rnd(1, 3); b = a + rnd(2, 4); }
      if (b == null) b = n - 1;
      const end = start + step * (n - 1);
      if (b >= n || end > (lv >= 4 ? 300 : 100) || (end > 99 && n > 8)) continue;
      const labels = [a, b];
      // De två första nivåerna får ett tal i mitten, så att det inte blir för svårt
      if (lv <= 1 && b - a >= 3) labels.push(a + Math.floor((b - a) / 2));
      return { start, step, n, end, labels: new Set(labels), from: a, hops: b - a, steps };
    }
    return { start: 0, step: 2, n: 6, end: 10, labels: new Set([0, 5]), from: 0, hops: 5, steps: [1, 2, 5] };
  }

  // Ritar tallinjen som SVG. Plutt är en liten figur i samma SVG, så att han kan studsa.
  const NL = { w: 700, h: 230, x0: 45, x1: 655, y: 150 };
  const tickX = (L, i) => NL.x0 + i * (NL.x1 - NL.x0) / (L.n - 1);
  function drawLine(L, opts = {}) {
    const box = $('#numline');
    const ticks = Array.from({ length: L.n }, (_, i) => {
      const x = tickX(L, i), shown = L.labels.has(i) || (opts.reveal && opts.reveal.has(i));
      return `<g class="tick${L.labels.has(i) ? ' given' : ''}" data-i="${i}">
        <rect class="hit" x="${x - 28}" y="40" width="56" height="190" rx="10"></rect>
        <line x1="${x}" y1="${NL.y - 22}" x2="${x}" y2="${NL.y + 22}"></line>
        <text class="lbl${shown ? '' : ' hidden'}" x="${x}" y="${NL.y + 64}">${tickVal(L, i)}</text>
      </g>`;
    }).join('');
    const marker = opts.marker != null ? `<g class="marker" transform="translate(${tickX(L, opts.marker)} ${NL.y - 34})"><path d="M-22 -40h44l-22 32z"/><text y="-50">?</text></g>` : '';
    box.innerHTML = `<svg viewBox="0 0 ${NL.w} ${NL.h}" role="img" aria-label="Tallinje från ${L.start} till ${L.end}">
      <line class="axis" x1="${NL.x0 - 30}" y1="${NL.y}" x2="${NL.x1 + 30}" y2="${NL.y}"></line>
      ${ticks}${marker}
      <g class="flag" transform="translate(${NL.x1} ${NL.y - 24})"><line y1="0" y2="-80"></line><path d="M0 -80h40l-10 14 10 14H0z"/></g>
      <g class="jumper" hidden><ellipse class="jb" cx="0" cy="-26" rx="26" ry="24"/><ellipse class="jbelly" cx="0" cy="-18" rx="14" ry="10"/>
        <circle class="je" cx="-9" cy="-32" r="6"/><circle class="je" cx="9" cy="-32" r="6"/><circle class="jp" cx="-8" cy="-31" r="3"/><circle class="jp" cx="10" cy="-31" r="3"/>
        <text class="jcount" y="-62"></text></g>
      <text class="jhelp" y="${NL.y - 120}">Oj, hjälp!</text>
    </svg>`;
    return $('svg', box);
  }
  function revealLabels(svg, idxs, cls = '') {
    idxs.forEach(i => { const t = $(`.tick[data-i="${i}"] .lbl`, svg); if (t) { t.classList.remove('hidden'); if (cls) { t.classList.remove('good', 'bad'); t.classList.add(cls); } } });
  }
  // Räkna från närmaste utskrivna tal fram till målet: "40, 42, 44, 46"
  function countPath(L, target) {
    const from = [...L.labels].sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
    const dir = target >= from ? 1 : -1, out = [];
    for (let i = from; ; i += dir) { out.push(i); if (i === target) break; }
    return out;
  }

  function startLine(id, lv) {
    stopGame();
    const X = EXTRAS[id];
    G = { game: id, kind: 'train', world: 'plus', extra: id, lv, level: `${X.prefix}${lv}`, mode: X.mode, idx: 0, total: X.count,
      mistakes: 0, score: 0, streak: 0, bestStreak: 0, marks: [], again: () => startLine(id, lv) };
    show('line');
    $('#line').dataset.game = id;
    $('#lineLabel').textContent = `${X.title}: ${X.levels[lv].name}`;
    $('#lineBack').onclick = () => openExtra(id);
    setStreak($('#lineStreak'), 0);
    nextLine();
  }
  function lineRight(btn, firstTry) {
    if (firstTry) { G.score++; G.marks[G.idx] = true; } else G.marks[G.idx] = false;
    G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
    setStreak($('#lineStreak'), G.streak);
    wishProgress({ kind: 'answer', w: 'plus', streak: G.streak });
    if (btn) celebrate(btn, G.streak);
    G.idx++;
    renderProgress($('#lineProgress'), G.idx, G.total, -1, G.marks);
  }
  function lineWrong() {
    G.mistakes++; G.streak = 0;
    setStreak($('#lineStreak'), 0);
    sfx.wrong();
  }
  function lineNext(delay) {
    const g = G;
    timer = setTimeout(() => { if (G !== g) return; if (G.idx >= G.total) finishLine(); else nextLine(); }, delay);
  }
  function nextLine() {
    renderProgress($('#lineProgress'), G.idx, G.total, G.idx, G.marks);
    $('#lineExplain').textContent = '';
    $('#lineAnswers').innerHTML = '';
    G.tries = 0; G.locked = false;
    if (G.game === 'jump') return nextJump();
    const L = makeLine(G.lv, false);
    const free = Array.from({ length: L.n }, (_, i) => i).filter(i => !L.labels.has(i));
    const target = pick(free);
    G.L = L; G.target = target;
    G.form = G.idx % 2 === 0 ? 'which' : 'tap';
    if (G.form === 'which') {
      const svg = drawLine(L, { marker: target });
      $('#lineQ').textContent = 'Vilket tal står Plutt-pilen på?';
      talk(G.idx === 0 ? 'Titta på talen som står ut. Hur stora är hoppen mellan strecken?' : pick(['Vilket tal är det?', 'Räkna från ett tal du ser.', 'Vilket tal bor där?']));
      const ans = tickVal(L, target);
      const set = new Set([ans]);
      for (const c of shuffle([ans + L.step, ans - L.step, ans + 1, ans - 1, ans + 2 * L.step, ans - 2 * L.step, ans + 10, ans - 10])) {
        if (set.size >= 4) break;
        if (c >= Math.max(0, L.start - L.step) && c <= L.end + L.step && c !== ans) set.add(c);
      }
      const box = $('#lineAnswers'); box.classList.remove('two');
      shuffle([...set]).forEach(v => {
        const b = document.createElement('button');
        b.className = 'ans'; b.textContent = v; b.dataset.v = v;
        b.addEventListener('click', () => answerWhich(b, v, svg));
        box.appendChild(b);
      });
    } else {
      const svg = drawLine(L);
      const val = tickVal(L, target);
      $('#lineQ').innerHTML = `Tryck på strecket där <b>${val}</b> bor.`;
      talk(`Var bor talet ${val}?`);
      svg.classList.add('tappable');
      $$('.tick', svg).forEach(t => t.addEventListener('click', () => answerTap(t, +t.dataset.i, svg)));
    }
  }
  function explainLine(L, target) {
    const path = countPath(L, target).map(i => tickVal(L, i));
    return `Varje hopp är ${L.step}. Räkna: ${path.join(', ')}.`;
  }
  function answerWhich(btn, v, svg) {
    if (!G || G.locked || btn.disabled) return;
    const L = G.L, ans = tickVal(L, G.target);
    if (v === ans) {
      G.locked = true;
      btn.classList.add('right');
      $$('#lineAnswers .ans').forEach(x => { x.disabled = true; });
      revealLabels(svg, [G.target], 'good');
      $('#lineExplain').textContent = `${ans} bor där! ${explainLine(L, G.target)}`;
      lineRight(btn, G.tries === 0);
      return lineNext(1700);
    }
    btn.classList.add('wrong'); btn.disabled = true;
    G.tries++; lineWrong();
    if (G.tries >= 2) revealLabels(svg, countPath(L, G.target).filter(i => i !== G.target));
    $('#lineExplain').textContent = G.tries >= 2 ? `Räkna med mig: ${countPath(L, G.target).map(i => (i === G.target ? '?' : tickVal(L, i))).join(', ')}` : `Inte ${v}. Hur stort är varje hopp?`;
    talk(pick(OOPS), 'oops');
  }
  function answerTap(el, i, svg) {
    if (!G || G.locked) return;
    const L = G.L;
    if (i === G.target) {
      G.locked = true;
      el.classList.add('right');
      revealLabels(svg, [i], 'good');
      $('#lineExplain').textContent = `Ja! Där bor ${tickVal(L, i)}. ${explainLine(L, i)}`;
      lineRight(el, G.tries === 0);
      return lineNext(1700);
    }
    el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 600);
    revealLabels(svg, [i], 'bad');
    G.tries++; lineWrong();
    $('#lineExplain').textContent = `Där bor ${tickVal(L, i)}. Ska vi längre ${tickVal(L, i) < tickVal(L, G.target) ? 'fram' : 'bak'}?`;
    talk(pick(OOPS), 'oops');
    if (G.tries >= 3) {
      G.locked = true;
      revealLabels(svg, countPath(L, G.target), 'good');
      $('#lineExplain').textContent = `Här bor ${tickVal(L, G.target)}. ${explainLine(L, G.target)}`;
      G.marks[G.idx] = false; G.idx++;
      lineNext(2600);
    }
  }

  /* ---------- Plutts hopp ---------- */
  function nextJump() {
    const L = makeJumpLine(G.lv);
    G.L = L;
    const svg = drawLine(L);
    G.svg = svg;
    placeJumper(svg, L, L.from, 0, '');
    $('#lineQ').textContent = 'Hur stora är hoppen mellan strecken?';
    talk(G.idx === 0 ? 'Titta på talen som står ut och räkna hur stort varje hopp är!' : pick(['Hur långt ska jag hoppa?', 'Hjälp mig att hoppa rätt!', 'Hur stora är hoppen nu?']));
    // Svarsalternativ: andra hoppstorlekar på nivån och vanliga misstag, som att
    // räkna strecken i stället för hoppens storlek, eller dubbelt och hälften.
    // Aldrig 1 om nivån inte har hopp om 1.
    const s0 = L.step;
    const ok = c => Number.isInteger(c) && c > 0 && c !== s0 && (c !== 1 || L.steps.includes(1));
    const others = shuffle(L.steps.filter(ok)).slice(0, 2);
    const mistakes = shuffle([L.hops, s0 * 2, s0 / 2, ...(s0 >= 3 && s0 <= 5 ? [s0 + 1, s0 - 1] : [])]);
    const set = new Set([s0]);
    for (const c of [...others, ...mistakes, ...shuffle(L.steps)]) {
      if (set.size >= 4) break;
      if (ok(c)) set.add(c);
    }
    const box = $('#lineAnswers'); box.classList.remove('two');
    [...set].sort((a, b) => a - b).forEach(v => {
      const b = document.createElement('button');
      b.className = 'ans'; b.textContent = v; b.dataset.v = v;
      b.addEventListener('click', () => answerJump(b, v));
      box.appendChild(b);
    });
  }
  function placeJumper(svg, L, i, dy, count, rot = 0) {
    const j = $('.jumper', svg); j.removeAttribute('hidden'); // SVG har ingen .hidden-egenskap
    j.setAttribute('transform', `translate(${typeof i === 'number' ? tickX(L, i) : i.x} ${NL.y - 6 + dy}) rotate(${rot}) scale(1.35)`);
    $('.jcount', j).textContent = count;
  }
  // En studs från streck a till b, med en båge
  function hop(svg, L, a, b, count, ms = 300) {
    const g = G;
    return new Promise(res => {
      const x0 = tickX(L, a), x1 = tickX(L, b), t0 = performance.now();
      const step = now => {
        if (G !== g) return res(false);
        const t = Math.min(1, (now - t0) / ms);
        placeJumper(svg, L, { x: x0 + (x1 - x0) * t }, -70 * 4 * t * (1 - t), t > 0.6 ? count : '');
        if (t < 1) requestAnimationFrame(step); else { sfx.tick(); res(true); }
      };
      requestAnimationFrame(step);
    });
  }
  function fall(svg, L, i) {
    const g = G;
    return new Promise(res => {
      const t0 = performance.now(), x = tickX(L, i);
      const step = now => {
        if (G !== g) return res(false);
        const t = Math.min(1, (now - t0) / 900);
        placeJumper(svg, L, { x: x + 40 * t }, -30 * Math.sin(Math.min(1, t * 3) * Math.PI) + 260 * t * t, '', 200 * t);
        if (t < 1) requestAnimationFrame(step); else res(true);
      };
      requestAnimationFrame(step);
    });
  }
  async function answerJump(btn, v) {
    if (!G || G.locked || btn.disabled) return;
    G.locked = true;
    const L = G.L, svg = G.svg, g = G;
    $$('#lineAnswers .ans').forEach(x => { x.disabled = true; });
    btn.classList.add('picked');
    const f = L.from, base = tickVal(L, f);
    placeJumper(svg, L, f, 0, base);
    // Plutt hoppar med elevens hoppstorlek och jämför med talen som står ut
    let failAt = -1;
    for (let i = f + 1; i < L.n; i++) {
      const count = base + (i - f) * v;
      if (!(await hop(svg, L, i - 1, i, count, L.n > 8 ? 240 : 300))) return;
      if (L.labels.has(i) && count !== tickVal(L, i)) { failAt = i; break; }
    }
    if (G !== g) return;
    if (failAt < 0) {
      btn.classList.add('right');
      $('.flag', svg).classList.add('won');
      revealLabels(svg, Array.from({ length: L.n }, (_, i) => i), 'good');
      $('#lineExplain').textContent = `Hoppen var ${L.step} stora! Plutt kom ända fram. 🚩`;
      lineRight(btn, G.tries === 0);
      say(pick([`Jippi! Hoppen var ${L.step}!`, 'Hela vägen fram!', 'Studs, studs, hurra!']));
      return lineNext(1900);
    }
    // Fel: talet stämmer inte, Plutt snubblar och ramlar ner
    $(`.tick[data-i="${failAt}"] .lbl`, svg).classList.add('bad');
    lineWrong();
    G.tries++;
    // "Oj, hjälp!" när Plutt tappar balansen och ramlar
    const help = $('.jhelp', svg);
    help.setAttribute('x', Math.min(NL.x1 - 60, Math.max(NL.x0 + 60, tickX(L, failAt))));
    help.classList.add('show');
    sfx.fall();
    say(pick(['Oj, hjälp!', 'Oj oj oj, hjälp!', 'Hjälp! Jag ramlar!']));
    await fall(svg, L, failAt);
    help.classList.remove('show');
    talk(`Oj! Jag räknade ${base + (failAt - f) * v}, men här står ${tickVal(L, failAt)}!`, 'oops');
    if (G !== g) return;
    $('#lineExplain').textContent = `Hoppen var inte ${v}. Från ${base} till ${tickVal(L, failAt)} är det ${failAt - f} hopp.`;
    btn.classList.remove('picked'); btn.classList.add('wrong');
    if (G.tries >= 2) {
      // Visa rätt svar och gå vidare
      revealLabels(svg, Array.from({ length: L.n }, (_, i) => i));
      $('#lineExplain').textContent = `Hoppen var ${L.step} stora: ${Array.from({ length: Math.min(L.n, 6) }, (_, i) => tickVal(L, i)).join(', ')} …`;
      $$('#lineAnswers .ans').forEach(x => { if (+x.dataset.v === L.step) x.classList.add('correct-was'); });
      G.marks[G.idx] = false; G.idx++;
      renderProgress($('#lineProgress'), G.idx, G.total, -1, G.marks);
      return lineNext(2600);
    }
    placeJumper(svg, L, f, 0, '');
    G.locked = false;
    $$('#lineAnswers .ans').forEach(x => { if (!x.classList.contains('wrong')) x.disabled = false; });
  }
  function finishLine() {
    const X = EXTRAS[G.game], stars = extraStarsFor(G.mistakes, G.total);
    const note = unlockNote(G.game, G.lv, stars);
    finish({ passed: true, stars, score: G.score, total: G.total, notes: note ? [note] : [],
      stats: `${G.score} av ${G.total} rätt på första försöket · bästa svit ${G.bestStreak} i rad · ${X.levels[G.lv].name}` });
  }

  /* ---------- Hemliga ordet ---------- */
  const WORDS = [
    ['SOL', '☀️'], ['ORM', '🐍'], ['MUS', '🐭'], ['BÅT', '⛵'], ['TÅG', '🚂'], ['UFO', '🛸'], ['SNÖ', '❄️'], ['ÖRN', '🦅'],
    ['KATT', '🐱'], ['HUND', '🐶'], ['BOLL', '⚽'], ['FISK', '🐟'], ['HÄST', '🐴'], ['GRIS', '🐷'], ['KAKA', '🍪'], ['MÅNE', '🌙'], ['BUSS', '🚌'], ['ÄGG', '🥚'],
    ['GLASS', '🍦'], ['RAKET', '🚀'], ['DRAKE', '🐉'], ['UGGLA', '🦉'], ['BANAN', '🍌'], ['TIGER', '🐯'], ['LEJON', '🦁'], ['ROBOT', '🤖'],
    ['PIZZA', '🍕'], ['ÄPPLE', '🍎'], ['TÅRTA', '🎂'], ['BJÖRN', '🐻'], ['PANDA', '🐼'], ['ZEBRA', '🦓'], ['KRONA', '👑'], ['PIRAT', '🏴‍☠️']
  ];
  const WORD_LEN = [[3], [3, 4], [4], [4, 5], [5]];
  const WORD_MAX = [10, 20, 20, 20, 100];
  const ALPHABET = 'ABCDEFGHIJKLMNOPRSTUVYÅÄÖ';
  // En uppgift vars svar är v, efter nivå. På tiotalsnivån utan minnessiffra:
  // entalen och tiotalen räknas var för sig (23 + 14, 58 − 23, 40 + 20).
  function wordTask(lv, v) {
    if (lv >= 4) {
      const T = Math.floor(v / 10), U = v % 10;
      const type = U === 0 && T >= 2 ? pick(['tens', 'plus', 'minus']) : pick(['plus', 'minus']);
      if (type === 'tens') { const a = 10 * rnd(1, T - 1); return { text: `${a} + ${v - a}`, v }; }
      if (type === 'minus' && v <= 89) {
        const t2 = rnd(1, Math.min(4, Math.floor((99 - v) / 10))), u2 = rnd(0, 9 - U);
        const sub = 10 * t2 + u2;
        return { text: `${v + sub} ${MINUS} ${sub}`, v };
      }
      const t1 = rnd(1, Math.max(1, T - 1)), u1 = rnd(0, U);
      const a = 10 * t1 + u1;
      return { text: `${a} + ${v - a}`, v };
    }
    const max = WORD_MAX[lv];
    const opts = [];
    if (v >= 2) opts.push('plus');
    if (lv >= 2 && v < max) opts.push('minus');
    if (lv >= 3 && v % 2 === 0 && v >= 2 && v <= 20) opts.push('dubbel');
    if (lv >= 3 && v >= 1 && v <= 15) opts.push('missing');
    const type = opts.length ? pick(opts) : 'plus';
    if (type === 'dubbel') return { text: `${v / 2} + ${v / 2}`, v };
    if (type === 'minus') { const top = rnd(v + 1, Math.min(max, v + 10)); return { text: `${top} ${MINUS} ${top - v}`, v }; }
    if (type === 'missing') { const a = rnd(1, Math.min(9, max - v)); return { text: `${a} + ? = ${a + v}`, v, missing: true }; }
    const a = rnd(v >= 2 ? 1 : 0, Math.max(0, v - 1)); return { text: `${a} + ${v - a}`, v };
  }
  function startWord(lv) {
    stopGame();
    const lens = WORD_LEN[lv];
    const [word, emoji] = pick(WORDS.filter(([w]) => lens.includes([...w].length) && w !== (prefs.lastWord || '')));
    prefs.lastWord = word; savePrefs();
    const letters = [...word], max = WORD_MAX[lv];
    // Varje bokstav får ett eget tal, plus några låtsasbokstäver i nyckeln
    const pool = shuffle(lv >= 4 ? range(21, 89) : range(2, max));
    const key = {};
    const distinct = [...new Set(letters)];
    distinct.forEach((l, i) => { key[l] = pool[i]; });
    shuffle([...ALPHABET].filter(l => !distinct.includes(l))).slice(0, 4).forEach((l, i) => { key[l] = pool[distinct.length + i]; });
    G = { game: 'word', kind: 'train', world: 'plus', extra: 'word', lv, level: `w${lv}`, mode: 'word', word, emoji, letters, key,
      tasks: letters.map(l => wordTask(lv, key[l])), idx: 0, step: 'num', mistakes: 0, score: 0, streak: 0, bestStreak: 0, tries: 0,
      again: () => startWord(lv) };
    show('word');
    $('#wordLabel').textContent = `Hemliga ordet: ${WORD_LEVELS[lv].name}`;
    $('#wordBack').onclick = () => openExtra('word');
    setStreak($('#wordStreak'), 0);
    const keyBox = $('#codeKey'); keyBox.innerHTML = '';
    Object.entries(key).sort((a, b) => a[1] - b[1]).forEach(([l, n]) => {
      const b = document.createElement('button');
      b.className = 'keytile'; b.dataset.n = n; b.dataset.l = l;
      b.innerHTML = `<span class="kn">${n}</span><span class="kl">${l}</span>`;
      b.setAttribute('aria-label', `${n} är ${l}`);
      b.addEventListener('click', () => pickLetter(b));
      keyBox.appendChild(b);
    });
    talk(`Ett hemligt ord med ${letters.length} bokstäver. Räkna ut talet och leta upp bokstaven i nyckeln!`, 'happy');
    nextWordTask();
  }
  function renderSlots() {
    $('#wordSlots').innerHTML = G.letters.map((l, i) => `<span class="slot-l${i < G.idx ? ' got' : i === G.idx ? ' now' : ''}">${i < G.idx ? l : '?'}</span>`).join('');
  }
  function nextWordTask() {
    renderSlots();
    G.step = 'num'; G.tries = 0; G.locked = false;
    const t = G.tasks[G.idx];
    $('#wordEq').innerHTML = t.missing ? esc(t.text).replace('?', '<span class="gap">?</span>') : `${esc(t.text)} = <span class="gap">?</span>`;
    $('#wordExplain').textContent = `Bokstav ${G.idx + 1} av ${G.letters.length}`;
    $('#codeKey').classList.remove('active');
    $$('#codeKey .keytile').forEach(x => x.classList.remove('hit', 'wrong'));
    const v = t.v, set = new Set([v]);
    for (const c of shuffle([v + 1, v - 1, v + 2, v - 2, v + 10, v - 10])) { if (set.size >= 4) break; if (c >= 0) set.add(c); }
    const box = $('#wordAnswers'); box.innerHTML = ''; box.hidden = false;
    shuffle([...set]).forEach(n => {
      const b = document.createElement('button');
      b.className = 'ans'; b.textContent = n; b.dataset.v = n;
      b.addEventListener('click', () => answerWordNum(b, n));
      box.appendChild(b);
    });
    if (G.idx > 0) talk(pick(['Nästa bokstav!', 'Vad blir det nu?', 'Ordet växer fram!']));
  }
  function answerWordNum(btn, n) {
    if (!G || G.game !== 'word' || G.step !== 'num' || btn.disabled) return;
    const t = G.tasks[G.idx];
    if (n === t.v) {
      btn.classList.add('right');
      $$('#wordAnswers .ans').forEach(x => { x.disabled = true; });
      $('#wordEq').innerHTML = t.missing ? esc(t.text).replace('?', `<span class="gap filled">${t.v}</span>`) : `${esc(t.text)} = <span class="gap filled">${t.v}</span>`;
      sfx.quick();
      G.step = 'letter';
      $('#codeKey').classList.add('active');
      $('#wordExplain').innerHTML = `Rätt, <b>${t.v}</b>! Leta upp ${t.v} i kodnyckeln och tryck på bokstaven.`;
      talk(`Vilken bokstav är ${t.v}?`, 'happy');
      return;
    }
    btn.classList.add('wrong'); btn.disabled = true;
    G.mistakes++; G.tries++; G.streak = 0; setStreak($('#wordStreak'), 0);
    sfx.wrong(); talk(pick(OOPS), 'oops');
  }
  function pickLetter(tile) {
    if (!G || G.game !== 'word' || G.step !== 'letter') return;
    const t = G.tasks[G.idx];
    if (+tile.dataset.n !== t.v) {
      tile.classList.add('wrong'); setTimeout(() => tile.classList.remove('wrong'), 500);
      G.mistakes++; G.tries++; G.streak = 0; setStreak($('#wordStreak'), 0);
      sfx.wrong();
      $('#wordExplain').innerHTML = `Det där är ${tile.dataset.n}. Leta efter <b>${t.v}</b>.`;
      return;
    }
    G.step = 'done';
    tile.classList.add('hit');
    if (G.tries === 0) G.score++;
    G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
    setStreak($('#wordStreak'), G.streak);
    wishProgress({ kind: 'answer', w: 'plus', streak: G.streak });
    celebrate(tile, G.streak, true);
    G.idx++;
    renderSlots();
    if (G.idx >= G.letters.length) {
      $('#codeKey').classList.remove('active');
      $('#wordEq').innerHTML = `<span class="word-reveal">${esc(G.word)} <span aria-hidden="true">${G.emoji}</span></span>`;
      $('#wordAnswers').hidden = true;
      const pretty = G.word[0] + G.word.slice(1).toLowerCase();
      $('#wordExplain').textContent = `Det hemliga ordet var ${G.word}!`;
      cheer(`${G.word}! ${G.emoji}`, true); rain(120);
      say(`Det hemliga ordet var ${pretty}!`);
      const g = G;
      timer = setTimeout(() => {
        if (G !== g) return;
        const stars = extraStarsFor(G.mistakes, G.letters.length * 2);
        const note = unlockNote('word', G.lv, stars);
        finish({ passed: true, stars, score: G.score, total: G.letters.length, notes: [`🔤 Ordet var <b>${esc(G.word)}</b> ${G.emoji}`, ...(note ? [note] : [])],
          stats: `${G.letters.length} bokstäver · ${G.score} utan fel · ${WORD_LEVELS[G.lv].name}` });
      }, 2600);
      return;
    }
    timer = setTimeout(() => { if (G && G.game === 'word') nextWordTask(); }, 700);
  }
  $$('.extra-btn').forEach(b => b.addEventListener('click', () => { roadContext = false; openExtra(b.dataset.extra); }));

  /* ================= Kompisduell ================= */
  const DUEL_MODES = [
    { id: 'p10', label: 'Talkamrater 1–10', w: 'plus', lo: 2, hi: 10 },
    { id: 'p20', label: 'Talkamrater 1–20', w: 'plus', lo: 2, hi: 20 },
    { id: 'tio', label: 'Tiokamrater', w: 'plus', lo: 10, hi: 10 },
    { id: 'm10', label: 'Minus 1–10', w: 'minus', lo: 2, hi: 10 },
    { id: 'dub', label: 'Dubblor', w: 'dubbel', lo: 1, hi: 10 }
  ];
  let duelMode = 'p10', duelTarget = 7;
  // Tillsammans: två spelare turas om och hjälps åt mot klockan
  let duelKind = 'duel', coopTarget = 12;
  const COOP_SECS = 90;
  function renderDuelKind() {
    const coop = duelKind === 'coop';
    $$('#duelKind .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === duelKind)));
    $('#duelTitle').innerHTML = coop ? 'Lag<em>kamp</em>' : 'Kompis<em>duell</em>';
    $('#duelKindText').textContent = coop
      ? `Ni turas om att svara och hjälps åt. Klarar laget målet på ${COOP_SECS} sekunder?`
      : 'Båda får samma fråga. Vem hittar svaret först?';
    $('#duelModesLabel').textContent = coop ? 'Vad ska ni träna på?' : 'Vad ska ni tävla i?';
    $('#duelTargetsLabel').textContent = coop ? `Lagets mål på ${COOP_SECS} sekunder` : 'Först till';
    $('#duelGo').textContent = coop ? 'Starta lagkampen!' : 'Starta duellen!';
    const row = $('#duelTargets'); row.innerHTML = '';
    (coop ? [8, 12, 16] : [5, 7, 10]).forEach(t => {
      const b = document.createElement('button');
      b.className = 'chip'; b.dataset.t = t; b.textContent = coop ? `${t} rätt` : t;
      b.setAttribute('aria-pressed', String(t === (coop ? coopTarget : duelTarget)));
      b.addEventListener('click', () => { if (coop) coopTarget = t; else duelTarget = t; sfx.select(); renderDuelKind(); });
      row.appendChild(b);
    });
  }
  $$('#duelKind .chip').forEach(b => b.addEventListener('click', () => { duelKind = b.dataset.k; sfx.select(); renderDuelKind(); }));
  function openDuel() {
    stopGame();
    show('duel');
    $('#duelSetup').hidden = false; $('#duelPlay').hidden = true; $('#duelWin').hidden = true;
    if (!$('#duelP1').value) $('#duelP1').value = save.name || 'Spelare 1';
    if (!$('#duelP2').value) $('#duelP2').value = 'Kompis';
    if (prefs.flip == null) prefs.flip = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    $('#duelFlip').checked = prefs.flip;
    const row = $('#duelModes'); row.innerHTML = '';
    DUEL_MODES.forEach(m => {
      const b = document.createElement('button');
      b.className = 'chip'; b.textContent = m.label; b.setAttribute('aria-pressed', String(m.id === duelMode));
      b.addEventListener('click', () => { duelMode = m.id; $$('#duelModes .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); sfx.select(); });
      row.appendChild(b);
    });
    renderDuelKind();
  }
  function startDuel() {
    stopGame();
    const m = DUEL_MODES.find(x => x.id === duelMode);
    prefs.flip = $('#duelFlip').checked; savePrefs();
    D = { m, coop: duelKind === 'coop', target: duelKind === 'coop' ? coopTarget : duelTarget, busy: true, q: null, last: null, turn: 0, score: 0,
      p: [{ name: $('#duelP1').value.trim() || 'Spelare 1', score: 0, lock: 0 }, { name: $('#duelP2').value.trim() || 'Spelare 2', score: 0, lock: 0 }] };
    $('#duelSetup').hidden = true; $('#duelWin').hidden = true; $('#duelPlay').hidden = false;
    $('#duelPlay').classList.toggle('flip', prefs.flip);
    [0, 1].forEach(i => {
      const h = $('#half' + i);
      h.classList.remove('won', 'lost', 'locked', 'waiting');
      $('.dname', h).textContent = D.p[i].name;
      $('.dscore', h).textContent = '0';
      $('.dmsg', h).textContent = 'Gör dig redo …';
      $('.deq', h).innerHTML = '';
      $('.dans', h).innerHTML = '';
    });
    $('#duelTarget').textContent = D.coop ? `Lagets mål: ${D.target} rätt` : `Först till ${D.target}`;
    sfx.tick();
    if (!D.coop) { timer = setTimeout(nextDuel, 1200); return; }
    D.turn = Math.random() < 0.5 ? 0 : 1;
    timer = setTimeout(() => {
      if (!D) return;
      D.end = Date.now() + COOP_SECS * 1000;
      ticker = setInterval(coopTick, 200);
      coopTick();
      nextCoop();
    }, 1200);
  }
  function coopTick() {
    if (!D || !D.coop) return;
    const left = Math.max(0, D.end - Date.now());
    $('#duelTarget').textContent = `⏱ ${Math.ceil(left / 1000)} s · ${D.score} av ${D.target}`;
    if (left <= 0 && !D.over) endCoop(false);
  }
  function nextCoop() {
    if (!D || D.over) return;
    let q;
    do { q = rndQ(D.m.w, D.m.lo, D.m.hi); } while (D.last && q.n === D.last.n && q.a === D.last.a && D.m.lo !== D.m.hi);
    prepQ(q);
    D.q = q; D.last = q; D.busy = false;
    const i = D.turn, h = $('#half' + i), o = $('#half' + (1 - i));
    h.classList.remove('won', 'lost', 'waiting'); o.classList.remove('won', 'lost'); o.classList.add('waiting');
    $('.deq', h).innerHTML = equationHTML(q, false);
    $('.deq', o).innerHTML = equationHTML(q, false);
    $('.dmsg', h).textContent = 'Din tur!';
    $('.dmsg', o).textContent = `Heja på ${D.p[i].name}! 📣`;
    $('.dans', o).innerHTML = '';
    renderAnswers($('.dans', h), q, (b, v) => coopPick(i, b, v));
  }
  function coopPick(i, btn, v) {
    if (!D || D.busy || D.over || i !== D.turn) return;
    D.busy = true;
    const h = $('#half' + i), o = $('#half' + (1 - i)), P = D.p[i];
    [0, 1].forEach(k => { $('.deq', $('#half' + k)).innerHTML = equationHTML(D.q, true); });
    $$('.ans', h).forEach(x => { x.disabled = true; });
    if (v === D.q.ans) {
      D.score++; P.score++;
      btn.classList.add('right'); sfx.right();
      const [x, y] = centerOf(btn); burst(x, y, 30);
      $('.dscore', h).textContent = P.score;
      $('.dmsg', h).textContent = pick(['Rätt! Bra lagjobb!', 'Snyggt!', 'Pang!', 'Ja!']);
      $('.dmsg', o).textContent = `${P.name} fixade det! Nu är det din tur.`;
      coopTick();
      if (D.score >= D.target) { D.over = true; timer = setTimeout(() => endCoop(true), 700); return; }
      if (D.score === Math.ceil(D.target / 2)) { cheer('Halvvägs!'); say('Halvvägs! Heja laget!'); }
      timer = setTimeout(() => { D.turn = 1 - i; nextCoop(); }, 900);
    } else {
      btn.classList.add('wrong'); sfx.wrong();
      $$('.ans', h).forEach(x => { if (+x.textContent === D.q.ans) x.classList.add('correct-was'); });
      $('.dmsg', h).textContent = `Rätt svar var ${D.q.ans}. Ingen fara!`;
      $('.dmsg', o).textContent = `Nu är det din tur, ${D.p[1 - i].name}!`;
      timer = setTimeout(() => { D.turn = 1 - i; nextCoop(); }, 1600);
    }
  }
  function endCoop(won) {
    if (!D) return;
    D.over = true; D.busy = true;
    clearInterval(ticker);
    $('#duelWin .seal').textContent = won ? '🤝' : '⏱️';
    $('#duelWinText').textContent = won ? 'Ni klarade det tillsammans!' : 'Tiden är slut!';
    $('#duelWinScore').textContent = `${D.score} av ${D.target}`;
    $('#duelWinSub').textContent = won ? `${D.p[0].name} och ${D.p[1].name}, vilket lag!` : pick(['Så nära! Försök igen, ni klarar det.', 'Bra kämpat! Ett försök till?']);
    $('#duelAgain').textContent = won ? 'Spela igen' : 'Försök igen';
    $('#duelWin').hidden = false;
    if (won) { sfx.fanfare(); rain(200); say(`Hurra! ${D.p[0].name} och ${D.p[1].name} klarade det tillsammans!`); }
    else { sfx.sad(); say('Tiden är slut! Bra kämpat, försök igen!'); }
  }
  function nextDuel() {
    if (!D) return;
    let q;
    do { q = rndQ(D.m.w, D.m.lo, D.m.hi); } while (D.last && q.n === D.last.n && q.a === D.last.a && D.m.lo !== D.m.hi);
    prepQ(q);
    D.q = q; D.last = q; D.busy = false;
    const opts = choicesFor(q);
    [0, 1].forEach(i => {
      const h = $('#half' + i);
      h.classList.remove('won', 'lost', 'locked');
      $('.deq', h).innerHTML = equationHTML(q, false);
      $('.dmsg', h).textContent = '';
      const box = $('.dans', h); box.innerHTML = '';
      box.classList.toggle('two', opts.length <= 2);
      shuffle(opts.slice()).forEach(v => {
        const b = document.createElement('button');
        b.className = 'ans'; b.textContent = v;
        b.addEventListener('click', () => duelPick(i, b, v));
        box.appendChild(b);
      });
    });
  }
  function duelPick(i, btn, v) {
    if (!D || D.busy) return;
    const P = D.p[i], h = $('#half' + i);
    if (Date.now() < P.lock) return;
    if (v === D.q.ans) {
      D.busy = true;
      P.score++;
      btn.classList.add('right');
      sfx.right();
      const [x, y] = centerOf(btn); burst(x, y, 30);
      $('.dscore', h).textContent = P.score;
      h.classList.add('won');
      const o = $('#half' + (1 - i)); o.classList.add('lost');
      [0, 1].forEach(k => { $('.deq', $('#half' + k)).innerHTML = equationHTML(D.q, true); });
      $('.dmsg', h).textContent = pick(['Poäng!', 'Snabbast!', 'Blixtsnabbt!', 'Pang!']);
      $('.dmsg', o).textContent = `${D.q.ans} var rätt. Nästa gång!`;
      if (P.score >= D.target) timer = setTimeout(() => winDuel(i), 900);
      else timer = setTimeout(nextDuel, 1300);
    } else {
      P.lock = Date.now() + 1300;
      btn.classList.add('wrong');
      sfx.wrong();
      h.classList.add('locked');
      $('.dmsg', h).textContent = 'Oj! Vänta lite …';
      const q = D.q;
      setTimeout(() => { if (D && D.q === q && !D.busy) { h.classList.remove('locked'); $('.dmsg', h).textContent = ''; } btn.classList.remove('wrong'); }, 1300);
    }
  }
  function winDuel(i) {
    if (!D) return;
    const w = D.p[i], l = D.p[1 - i];
    $('#duelWin .seal').textContent = '🏆';
    $('#duelAgain').textContent = 'Revansch!';
    $('#duelWinText').textContent = `${w.name} vann!`;
    $('#duelWinScore').textContent = `${w.score} – ${l.score}`;
    $('#duelWinSub').textContent = pick([`Bra kämpat båda två!`, `${l.name}, revansch?`, 'Vilken match!']);
    $('#duelWin').hidden = false;
    sfx.fanfare(); rain(200);
    say(`${w.name} vann! Bra kämpat båda två!`);
    D.busy = true;
  }

  /* ================= Rundan klar ================= */
  let lastStart = null;
  function finish(r) {
    clearInterval(ticker);
    const g = G;
    const wid = g.world || 'plus';
    const beforeDone = doneCount(wid);
    const oldTitle = titleFor(save.total);
    const scoreKey = g.kind === 'train' || g.kind === 'mix' ? `${g.level}:${g.mode}` : null;
    if (scoreKey) save.best[scoreKey] = Math.max(save.best[scoreKey] || 0, r.stars);
    let medal = null, medalKey = null;
    if (g.station && r.passed) {
      const key = g.station.id;
      if (!save.path[key] && ALL_MEDALS[key]) { medal = ALL_MEDALS[key]; medalKey = key; }
      save.path[key] = Math.max(save.path[key] || 0, r.score || 1);
      // När provet klarades, så att Kom ihåg-provet kan komma en vecka senare
      if (g.station.kind === 'test' && !save.dates[key]) save.dates[key] = today();
    }
    // Klarade Lära-moment sparas också i path, så att lärarsidan ser hela vägen
    WORLD_IDS.forEach(w => stations(w).forEach(s => {
      if (s.kind !== 'number') return;
      if (s.moments[0].done) save.path[s.id] = 1;
      if (s.moments[1].done) save.path['o-' + s.id] = 1;
    }));
    const shined = g.station && g.station.kind === 'recall' && r.passed;
    // Lärarens fokus: kom ihåg att eleven tränat på det idag
    if (g.focus && g.kind === 'train' && g.n) save.dates[`f-${g.world[0]}${g.n}`] = today();
    save.total += r.stars;
    save.rounds++;

    // Dagens utmaning
    let daily = 0;
    if (g.kind === 'daily' && !dailyDone()) {
      const d = save.daily;
      d.streak = d.day === today() - 1 ? d.streak + 1 : 1;
      d.day = today(); d.count++; d.best = Math.max(d.best, d.streak);
      daily = d.streak;
    }

    // Klistermärken (dagens utmaning ger ett extra)
    const prizes = [];
    if (r.passed) {
      const sure = daily || (g.station && ['test', 'final', 'challenge'].includes(g.station.kind));
      if (sure || Math.random() < (STICKER_CHANCE[r.stars] || 0)) prizes.push(giveSticker(r.stars === 3));
    }
    const bookDone = !save.path.book && STICKERS.every(([e]) => save.stickers.includes(e));
    if (bookDone) save.path.book = 1;

    // Mata husdjuret
    // Mata husdjuret: en stjärnfrukt per stjärna
    const food = r.stars;
    let grew = feedPet(food);
    wishProgress({ kind: 'round', game: g.game, world: wid, n: g.n, stars: r.stars, daily: !!daily, kindOf: g.kind, focus: !!g.focus });
    if (wishNote && wishNote.grew) grew = wishNote.grew;

    persist();
    const roundInfo = { level: g.level, mode: g.mode, stars: r.stars, score: r.score, total: r.total, mistakes: g.mistakes };
    logRound(roundInfo);

    const newTitle = titleFor(save.total);
    // Bara stora händelser till klassflödet, så att det inte svämmar över
    if (medalKey) postEvent('medal', medalKey);
    if (daily && [7, 30, 100].includes(daily)) postEvent('daily', daily);
    if (daily) sendGift();
    if (grew >= 8) postEvent('pet', grew); // kung och legend syns i klassflödet
    if (bookDone) postEvent('book', 'alla');

    if (g.kind === 'final' && r.passed) {
      postEvent('expert', wid);
      return showDiploma(wid, true);
    }

    const afterDone = doneCount(wid);
    const next = stations(wid).find(s => !s.done);

    show('done');
    const titles = r.passed
      ? { 3: ['Hurra!', 'Jippi!', 'Superstjärna!', 'Fantastiskt!'], 2: ['Snyggt jobbat!', 'Bra kämpat!', 'Toppen!'], 1: ['Du klarade det!', 'Heja dig!'], 0: ['Klarat!'] }[r.stars]
      : ['Nästan!', 'Bra försök!'];
    $('#doneTitle').textContent = medal ? 'Godkänt!' : pick(titles);
    $('#bigStars').hidden = !r.passed;
    $$('#bigStars span').forEach((s, i) => { s.className = i < r.stars ? 'on' : ''; s.style.animationDelay = (0.25 + i * 0.25) + 's'; });
    $('#doneStats').textContent = r.stats;

    // Sammanfattningen: en rad per sak, med ikon, rubrik och en kort förklaring
    const rows = [];
    const row = (ic, t, sub = '', tone = '') => rows.push({ ic, t, s: sub, tone });
    if (medal) row(medal[0], `Du vann ${esc(medal[1])}!`, 'Den finns nu i klistermärkesboken', 'big');
    if (newTitle !== oldTitle) row(TITLE_BADGES[tierFor(save.total)], `Ny nivå: ${esc(newTitle)}!`, `Nivå ${tierFor(save.total) + 1} av ${TITLES.length} · du fick ett nytt märke`, 'big');
    if (daily) row('🔥', 'Dagens utmaning klar!', `${daily} ${daily === 1 ? 'dag' : 'dagar'} i rad`, 'big');
    const step = g.stepId ? stationById(g.stepId) : null;
    if (step && afterDone > beforeDone) {
      const n = step.moments.filter(m => m.done).length;
      if (step.done) row('🎉', `${esc(step.name)} är klart!`, next ? `Nästa: ${esc(stepName(next))}` : 'Alla tre momenten');
      else row('✅', `Moment klart: ${n} av 3`, `${esc(step.name)} · nästa: ${esc(nextMoment(step).label)}`);
    } else if (afterDone > beforeDone && next && g.kind !== 'daily') row('🗺️', 'Ett steg till på vägen', `Nästa: ${esc(stepName(next))}`);
    if (shined) row('✨', `${esc(ALL_MEDALS[g.station.id.slice(2)][1])} glänser nu`, 'Du kom ihåg!');
    if (step && r.passed === false && g.kind === 'numtest') row('💡', 'Du är nära!', 'Öva lite till i Lära eller Öva, sen provar du igen.');
    if (r.newRecord) row('🏆', 'Nytt rekord!');
    if (g.skillStart) {
      // Pärlorna: säg till när de försvinner eller kommer tillbaka, men max två rader
      const label = k => (k[0] === 'p' ? `talkamraterna till ${k.slice(1)}` : k[0] === 'm' ? `minus från ${k.slice(1)}` : `dubblorna till ${k.slice(1)}`);
      const was = g.skillStart.g || 0, now = save.skill.g || 0;
      const beadRows = [];
      if (was < 7 && now >= 7) beadRows.push(['💪', 'Pärlorna försvinner', 'Du har svarat rätt så många gånger. De kommer tillbaka om du behöver dem.']);
      else if (was >= 4 && now < 4) beadRows.push(['🔵', 'Pärlorna är tillbaka', 'Som hjälp ett tag. Det är helt okej!']);
      if (now < 7) {
        for (const [k, v] of Object.entries(save.skill)) {
          if (k === 'g') continue;
          const before = g.skillStart[k] || 0;
          if (before < 7 && v >= 7) beadRows.push(['💪', 'Du kan dem!', `Pärlorna för ${label(k)} har försvunnit.`]);
        }
      }
      beadRows.slice(0, 2).forEach(x => row(...x));
    }
    if (r.notes) r.notes.forEach(n => rows.push(noteRow(n)));
    if (wishNote) row(wishNote.t[1], 'Önskan uppfylld!', `${esc(petName())} fick ${wishNote.t[2]}`, 'pet');
    wishNote = null;
    const pst = petStage(save.pet.xp), pnext = PET_STAGES[pst + 1];
    if (grew) row('🎉', `${esc(petName())} växte!`, `Nu är ${esc(petName())} ${PET_STAGES[grew][1].toLowerCase()}`, 'pet');
    else if (food) row('🍓', `${esc(petName())} fick ${food} ${food === 1 ? 'jordgubbe' : 'jordgubbar'}`, pnext ? `${pnext[0] - save.pet.xp} kvar till nästa nivå` : 'Mums!', 'pet');
    if (!r.passed && g.missed && g.missed.length) row('🧩', 'Öva lite extra på', g.missed.slice(0, 4).map(equationText).join(', '));
    // Klistermärken blir en rad bland de andra, inte en egen stor ruta
    for (const p of prizes) row(p.e, p.isNew ? 'Nytt klistermärke!' : 'Ett klistermärke till', p.isNew ? prizeText(p) : `${prizeText(p)} · byt dubbletter mot jordgubbar`, p.rarity === 3 ? 'legend' : 'sticker');
    renderDoneRows(rows);

    $('#reward').hidden = true;
    if (prizes.some(p => p.shiny)) setTimeout(() => { cheer('GLÄNSANDE! ✨', true); rain(200); sfx.streak(); say('Wow! Ett glänsande klistermärke!'); }, 3600);
    const best = prizes.reduce((m, p) => Math.max(m, p.rarity), -1);
    if (best >= 2) setTimeout(() => { cheer(best === 3 ? 'LEGENDARISKT!' : 'Sällsynt!', true); rain(best === 3 ? 260 : 120); sfx.streak(); say(best === 3 ? 'Wow! Ett legendariskt klistermärke!' : 'Ett sällsynt klistermärke!'); }, 1800);
    renderBerries();

    lastStart = g;
    // Knapparna: en tydlig huvudknapp (vidare när det gick bra, försök igen annars),
    // en knapp för det andra, och Hem längst ner
    const fromRoad = roadContext || !!g.station;
    let goText, goFn;
    if (g.extra) { goText = 'Välj nivå'; goFn = () => openExtra(g.extra); }
    else if (step && !step.done) { goText = r.passed ? 'Nästa moment' : `Till ${step.name}`; goFn = () => openStep(stationById(step.id)); }
    else if (fromRoad) { goText = 'Vägen till expert'; goFn = () => openRoad(wid); }
    else { goText = 'Till Hem'; goFn = () => goHome(); }
    const ok = !!r.passed;
    $('#otherBtn').innerHTML = `${esc(goText)} <span aria-hidden="true">➜</span>`;
    $('#otherBtn').onclick = goFn;
    $('#againBtn').innerHTML = `<span aria-hidden="true">🔁</span> ${ok ? 'Spela igen' : 'Försök igen'}`;
    $('#otherBtn').className = 'chunky ' + (ok ? 'sun' : 'ghost');
    $('#againBtn').className = 'chunky ' + (ok ? 'ghost' : 'sun');
    $('.done-actions').classList.toggle('retry-first', !ok);
    $('#doneHome').hidden = goText === 'Till Hem';

    if (r.passed) {
      sfx.fanfare(); rain(); setTimeout(() => rain(80), 700);
      if (grew) setTimeout(() => { cheer(`${petName()} växte!`, true); sfx.streak(); }, 1300);
      else if (medal) setTimeout(() => cheer(medal[1], true), 1200);
      else if (newTitle !== oldTitle) setTimeout(() => cheer(newTitle, true), 1200);
      say(medal ? `Hurra ${nm()}! Du klarade provet och vann ${medal[1]}!`
        : daily ? `Hurra! Dagens utmaning klar, ${daily} ${daily === 1 ? 'dag' : 'dagar'} i rad!`
        : r.stars === 3 ? `Hurra! Tre stjärnor, ${nm()}! Du är grym!`
        : `Bra jobbat ${nm()}! Du fick ${r.stars} ${r.stars === 1 ? 'stjärna' : 'stjärnor'}.`);
    } else {
      sfx.sad();
      say(`Bra försök ${nm()}! Öva lite till, sen klarar du det.`);
    }
  }
  function equationText(q) {
    if (q.w === 'plus') return `${q.a} + ${q.n - q.a} = ${q.n}`;
    if (q.w === 'minus') return `${q.n} ${MINUS} ${q.a} = ${q.n - q.a}`;
    return `${q.n} + ${q.n} = ${2 * q.n}`;
  }

  $('#againBtn').addEventListener('click', () => {
    const g = lastStart; if (!g) return goHome();
    if (g.again) return g.again();
    if (g.game === 'bubbles') startBubbles(g.n);
    else if (g.game === 'challenge') startChallenge(stationById(g.station.id));
    else if (g.mode === 'test') startTest(stationById(g.station.id));
    else if (g.kind === 'train') startFindLevel(g.world, +String(g.level).replace(/^[md]/, ''));
    else if (g.kind === 'mix') { prefs.world = g.world; startMix(g.mixIndex || 0); }
    else if (g.kind === 'tricky') startTricky();
    else if (g.kind === 'daily') startDaily();
  });
  $('#doneHome').addEventListener('click', () => goHome());
  // Raderna i sammanfattningen efter en runda
  const doneRowHTML = x => `<div class="done-row${x.tone ? ' dr-' + x.tone : ''}"><span class="dr-ic" aria-hidden="true">${x.ic}</span><span class="dr-txt"><b>${x.t}</b>${x.s ? `<small>${x.s}</small>` : ''}</span></div>`;
  function renderDoneRows(rows) {
    const box = $('#unlock');
    box.innerHTML = rows.map(doneRowHTML).join('');
    box.hidden = !rows.length;
  }
  // Rader som kommer från servern lite senare, t.ex. klassens uppdrag
  function addDoneRow(x) {
    const box = $('#unlock');
    box.insertAdjacentHTML('beforeend', doneRowHTML(x));
    box.hidden = false;
  }
  // Gamla textrader, t.ex. "🔤 Ordet var <b>ÄGG</b> 🥚": första tecknet blir ikonen
  function noteRow(html) {
    const m = /^([^\s\p{L}\p{N}<]+)\s+([\s\S]*)$/u.exec(html);
    return m ? { ic: m[1], t: m[2], s: '' } : { ic: '⭐', t: html, s: '' };
  }

  /* ================= Diplom ================= */
  function showDiploma(wid, celebrateNow) {
    stopGame();
    const w = WORLDS[wid];
    show('diploma');
    $('#dipTitle').textContent = w.expertTitle;
    $('#dipText').textContent = w.diploma;
    $('#dipSeal').textContent = EXPERT_ICON[wid];
    $('#dipName').textContent = save.name || 'en riktig mattestjärna';
    $('#dipDate').textContent = new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
    $('#dipPrint').hidden = !net.online;
    $('#dipRoad').onclick = () => openRoad(wid);
    if (celebrateNow) {
      sfx.fanfare(); rain(220); setTimeout(() => rain(160), 900); setTimeout(() => sfx.fanfare(), 1200);
      setTimeout(() => cheer(`${w.expertTitle}!`, true), 600);
      say(`Grattis ${nm()}! Nu är du ${w.expertTitle}!`);
    }
  }
  $('#dipPrint').addEventListener('click', () => { try { window.print(); } catch (e) {} });

  /* ================= Klistermärken ================= */
  // Sällsynthet, dragning och byten. Ett byte räknas upp i save.swapped (per id),
  // så antalet man har = antal i listan minus antal bytta.
  // Glänsande varianter sparas som "✨" + emoji och räknas för sig (id "g3" i stället för "s3")
  const SHINY = '✨', SHINY_CHANCE = 0.03;
  const stickerId = (e, shiny) => (shiny ? 'g' : 's') + STICKERS.findIndex(([x]) => x === e);
  function stickerCount(e, shiny = false) {
    const key = shiny ? SHINY + e : e;
    const n = save.stickers.reduce((c, x) => c + (x === key), 0);
    return Math.max(0, n - (save.swapped[stickerId(e, shiny)] || 0));
  }
  // Dubbletter per sällsynthet (vanliga klistermärken, inte glänsande)
  const dupsByRarity = () => RARITY.map((_, r) => STICKERS.filter(x => x[2] === r).reduce((sum, [e]) => sum + Math.max(0, stickerCount(e) - 1), 0));
  const stickerDups = () => STICKERS.reduce((sum, [e]) => sum + Math.max(0, stickerCount(e) - 1), 0);
  const lowerName = n => (n === n.toUpperCase() ? n : n.toLowerCase()); // "UFO" förblir UFO
  const prizeText = p => `${lowerName(p.name)}${p.rarity ? ` (${RARITY[p.rarity].name.toLowerCase()})` : ''}`;
  // Dra ett klistermärke: först sällsynthet, sedan helst ett man inte har inom den
  function giveSticker(boost) {
    const w = RARITY.map(r => (boost ? r.boost : r.weight));
    let roll = Math.random() * w.reduce((a, b) => a + b, 0), rarity = 0;
    while (roll >= w[rarity]) { roll -= w[rarity]; rarity++; }
    const tier = STICKERS.filter(x => x[2] === rarity);
    const missing = tier.filter(([e]) => stickerCount(e) === 0);
    const [e, name] = missing.length && Math.random() < 0.7 ? pick(missing) : pick(tier);
    // Ibland kommer en glänsande variant, en egen samlarsak
    const shiny = Math.random() < SHINY_CHANCE;
    const isNew = stickerCount(e, shiny) === 0;
    save.stickers.push(shiny ? SHINY + e : e);
    return { e: shiny ? SHINY + e : e, name: shiny ? `glänsande ${lowerName(name)}` : name, rarity, isNew, shiny };
  }
  // Plutts korg: jordgubbar från bytta dubbletter. Används till kläder eller som mat.
  // Två räknare som bara växer (intjänat och använt), så att sammanslagning blir rätt.
  const basket = () => Math.max(0, (save.records.bEarn || 0) - (save.records.bSpent || 0));
  const earnBerries = n => { save.records.bEarn = (save.records.bEarn || 0) + n; };
  function spendBerries(n) {
    if (basket() < n) return false;
    save.records.bSpent = (save.records.bSpent || 0) + n;
    return true;
  }
  function feedFromBasket(n) {
    n = Math.min(n, basket());
    if (n <= 0 || !spendBerries(n)) return;
    const grew = feedPet(n);
    persist();
    sfx.pop(); cheer(`Mums! ${n} 🍓`, n >= 20);
    say(pick([`Mums, ${n} jordgubbar!`, 'Tack, det var gott!', 'Smaskens!']));
    if (grew) setTimeout(() => { cheer(`${petName()} växte och blev ${PET_STAGES[grew][1].toLowerCase()}!`, true); sfx.fanfare(); rain(160); }, 900);
    if (current === 'start') renderStart();
    if (current === 'wardrobe') openWardrobe();
  }
  // Byt en dubblett mot jordgubbar till korgen. Det sista exemplaret går aldrig att byta.
  function tradeSticker(e, quiet, shiny = false) {
    if (stickerCount(e, shiny) < 2) return 0;
    const id = stickerId(e, shiny), rar = STICKERS.find(([x]) => x === e)[2];
    save.swapped[id] = (save.swapped[id] || 0) + 1;
    const berries = RARITY[rar].berries * (shiny ? 3 : 1);
    earnBerries(berries);
    if (!quiet) afterTrade(berries);
    return berries;
  }
  function tradeAll() {
    let berries = 0;
    STICKERS.forEach(([e]) => { while (stickerCount(e) > 1) berries += tradeSticker(e, true); });
    if (berries) afterTrade(berries);
  }
  function afterTrade(berries) {
    persist();
    sfx.pop();
    cheer(`+${berries} 🍓 i korgen`, berries >= 5);
    say(berries >= 5 ? `${berries} jordgubbar i korgen!` : pick(['Plopp, i korgen!', 'En till jordgubbe!']));
    closeSheet();
    openBook(true);
  }
  // Plutts garderob: köp saker med jordgubbar från korgen och klä husdjuret
  function setWear(list) {
    save.pet.wear = list.length ? list.join(',') : 'none';
    persist();
  }
  function openWardrobe() {
    stopGame();
    const st = petStage(save.pet.xp), wear = petWear(), b = basket();
    show('wardrobe');
    $('#wdTitle').textContent = genitive(petName());
    $('#wdPet').innerHTML = petHTML(st, 'mood-happy', wear);
    $('#wdStage').textContent = `${petName()} · ${PET_STAGES[st][1]}`;
    $('#wdText').innerHTML = st === 0
      ? 'Ägget måste kläckas innan det kan ha kläder på sig. Spela några rundor!'
      : `I korgen: <b class="berries">${b} 🍓</b><br>Köp kläder här, eller mata ${esc(petName())} så växer den. Fler jordgubbar får du genom att byta dubbletter i klistermärkesboken.`;
    $('#wdFeed').hidden = st === 0 || b === 0;
    $('#wdFeed').textContent = `Mata ${petName()} med ${Math.min(10, b)} 🍓`;
    const grid = $('#wdGrid'); grid.innerHTML = '';
    WARDROBE.forEach(it => {
      const owned = ownsItem(it.id), on = wear.includes(it.id), locked = st < it.stage;
      const el = document.createElement('div');
      el.className = 'wd-item' + (locked && !owned ? ' locked' : '') + (on ? ' on' : '');
      el.innerHTML = `<span class="wi" aria-hidden="true">${it.icon}</span><b>${esc(it.name)}</b>
        <small>${owned ? `Sitter på ${SLOT_NAME[it.slot]}` : locked ? `🔒 När ${esc(petName())} är ${PET_STAGES[it.stage][1].toLowerCase()}` : `${it.price} 🍓`}</small>`;
      const btn = document.createElement('button');
      if (owned) {
        btn.className = 'chunky ' + (on ? 'ghost' : 'sun');
        btn.textContent = on ? 'Ta av' : 'Ta på';
        btn.onclick = () => {
          const rest = petWear().filter(id => id !== it.id && (on || WARDROBE.find(w => w.id === id).slot !== it.slot));
          setWear(on ? rest : [...rest, it.id]);
          sfx.select(); openWardrobe();
        };
      } else if (!locked) {
        btn.className = 'chunky coral'; btn.textContent = b >= it.price ? `Köp för ${it.price} 🍓` : `${it.price - b} 🍓 kvar`; btn.disabled = b < it.price;
        btn.onclick = () => {
          if (!spendBerries(it.price)) return;
          save.records['it-' + it.id] = 1;
          setWear([...petWear().filter(id => WARDROBE.find(w => w.id === id).slot !== it.slot), it.id]);
          sfx.fanfare(); rain(90); cheer(`${it.icon} ${it.name}!`, true);
          say(pick([`Snyggt! ${petName()} har fått ${it.name.toLowerCase()}!`, 'Wow, vad fin jag blev!', 'Titta på mig!']));
          openWardrobe();
        };
      }
      if (btn.textContent) el.appendChild(btn);
      grid.appendChild(el);
    });
  }
  $('#wdFeed').addEventListener('click', () => feedFromBasket(10));
  $('#petWardrobe').addEventListener('click', openWardrobe);
  $('#wdBook').addEventListener('click', () => openBook());

  // Dela en dubblett med klassen: den går anonymt till någon i klassen som saknar den
  async function shareSticker(e, name, btn) {
    if (stickerCount(e) < 2) return;
    btn.disabled = true;
    try {
      const r = await api('POST', 'me/share', { e, id: stickerId(e) });
      if (r.sent) {
        const id = stickerId(e);
        save.swapped[id] = (save.swapped[id] || 0) + 1;
        save.records.shared = (save.records.shared || 0) + 1;
        persist();
        closeSheet();
        sfx.fanfare(); cheer('Delat! 💛', true);
        say(`Snällt! Någon i klassen som saknade ${lowerName(name)} får den nu.`);
        openBook(true);
      } else {
        btn.disabled = false;
        cheer(r.reason === 'everyone' ? `Alla i klassen har redan ${lowerName(name)}!` : 'Du har delat fem idag. Fortsätt imorgon!');
      }
    } catch (err) { btn.disabled = false; cheer(err.message); }
  }
  // En ruta som glider upp nerifrån, med stora knappar (lätt att träffa på mobilen)
  function openSheet(html) {
    const sh = $('#sheet');
    $('#settingsBox').hidden = true;
    $('#sheetBody').innerHTML = html;
    sh.hidden = false;
    requestAnimationFrame(() => sh.classList.add('open'));
  }
  function closeSheet() {
    const sh = $('#sheet');
    if (!sh || sh.hidden) return;
    sh.classList.remove('open');
    setTimeout(() => { sh.hidden = true; }, 200);
  }
  // Inställningarna ligger i samma ruta, så de nås från alla skärmar
  function openSettings() {
    openSheet('');
    renderSettings(); renderVoicePick();
    $('#appVersion').textContent = APP_VERSION;
    // I testläget leder länken tillbaka till det riktiga spelet
    $('#demoLink').href = DEMO ? '../' : 'test/';
    $('#demoLink').textContent = DEMO ? '🚪 Lämna testläget' : '🧪 Testläge för vuxna';
    $('#demoLink').hidden = !net.online; // testläget behöver servern
    $('#settingsBox').hidden = false;
  }
  $('#settingsBtn').addEventListener('click', () => { sfx.select(); openSettings(); });
  $('#berryPill').addEventListener('click', () => { sfx.select(); closeSheet(); if (!needsWelcome()) setTab('pet'); });
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet' || e.target.closest('[data-close]')) closeSheet(); });
  // Klistermärket i närbild: byt, dela eller läs om det
  function stickerSheet(e) {
    const [, name, r] = STICKERS.find(([x]) => x === e);
    const n = stickerCount(e), sh = stickerCount(e, true), canShare = net.player && !isSolo() && net.online;
    const val = RARITY[r].berries;
    if (!n && !sh) {
      return openSheet(`<div class="sh-big r${r}">?</div><h3>Inte hittat än</h3><p class="sh-rar r${r}">${RARITY[r].name}</p>
        <p>${r === 3 ? 'Legendariska klistermärken är väldigt sällsynta. Bara ungefär ett av hundra!' : r === 2 ? 'Sällsynta klistermärken kommer ibland, särskilt när du får tre stjärnor.' : 'Spela vidare, så dyker det upp!'}</p>
        <button class="chunky ghost" data-close>Stäng</button>`);
    }
    openSheet(`<div class="sh-big r${r}${sh ? ' has-shiny' : ''}">${e}</div><h3>${esc(name)}</h3><p class="sh-rar r${r}">${RARITY[r].name}</p>
      <p>Du har <b>${n}</b>${sh ? ` och <b>${sh} glänsande ✨</b>` : ''}. ${n > 1 ? 'Det sista sparas alltid i boken.' : 'Den här har du bara en av, så den sparas i boken.'}</p>
      <div class="sh-actions">
        ${n > 1 ? `<button class="chunky coral" id="shTrade">Byt 1 mot ${val} 🍓</button>` : ''}
        ${n > 2 ? `<button class="chunky sun" id="shTradeAll">Byt alla ${n - 1} extra mot ${(n - 1) * val} 🍓</button>` : ''}
        ${n > 1 && canShare ? `<button class="chunky" id="shShare">Dela 1 med klassen 🎁</button>` : ''}
        ${sh > 1 ? `<button class="chunky sun" id="shShiny">Byt 1 glänsande mot ${val * 3} 🍓</button>` : ''}
        <button class="chunky ghost" data-close>Stäng</button>
      </div>
      ${n > 1 && canShare ? '<p class="sh-note">Dela går till någon i klassen som saknar den. Ingen får veta vem.</p>' : ''}`);
    const on = (id, fn) => { const b = $('#' + id); if (b) b.onclick = fn; };
    on('shTrade', () => tradeSticker(e));
    on('shTradeAll', () => { let got = 0; while (stickerCount(e) > 1) got += tradeSticker(e, true); afterTrade(got); });
    on('shShiny', () => tradeSticker(e, false, true));
    on('shShare', () => shareSticker(e, name, $('#shShare')));
  }
  // Var en medalj finns och vad som krävs, t.ex. zonprovet i Kompisbyn
  function medalWhere(k) {
    for (const w of WORLD_IDS) {
      const W0 = WORLDS[w];
      if (!W0.medals[k]) continue;
      if (k === W0.final.id) return { w, text: `Klara ${W0.final.name} i ${W0.tab.toLowerCase()}. Provet öppnas när du har ★★★ på alla övningar på vägen till expert i ${W0.tab.toLowerCase()}.` };
      const z = W0.zones.find(z => 't-' + z.id === k);
      return { w, text: `Klara provet i ${z.name} på vägen till expert i ${W0.tab.toLowerCase()}. Där tränar du talen ${z.from} till ${z.to}.` };
    }
    return null;
  }
  function medalSheet(k) {
    if (k === 'buddy') {
      const nb = save.records.buddies || 0;
      openSheet(`<div class="sh-big r1">🤝</div><h3>Kompisbricka</h3>
        <p>Du får en kompisbricka när du och en klasskompis klarar en kompisutmaning tillsammans.${nb ? ` Du har ${nb}!` : ''}</p>
        <div class="sh-actions"><button class="chunky sun" id="shGo">Till kompisutmaningen</button><button class="chunky ghost" data-close>Stäng</button></div>`);
      $('#shGo').onclick = () => { closeSheet(); setTab('class'); };
      return;
    }
    const where = medalWhere(k), [e, name] = ALL_MEDALS[k], have = !!save.path[k], shine = !!save.path['s-' + k];
    const zoneMedal = k.startsWith('t-');
    openSheet(`<div class="sh-big r3${have ? '' : ' dim'}">${e}</div><h3>${esc(name)}</h3>
      <p class="sh-rar r3">${have ? (shine ? 'Vunnen och glänsande ✨' : 'Vunnen! 🎉') : 'Inte vunnen än'}</p>
      <p>${esc(where.text)}</p>
      ${zoneMedal ? `<p>${shine ? 'Den glänser för att du kom ihåg allt en vecka senare.' : 'En vecka efter provet kommer ett Kom ihåg-prov. Klarar du det börjar medaljen glänsa ✨'}</p>` : ''}
      <div class="sh-actions"><button class="chunky sun" id="shGo">${have ? 'Till vägen' : 'Gå dit'}</button><button class="chunky ghost" data-close>Stäng</button></div>`);
    $('#shGo').onclick = () => { closeSheet(); openRoad(where.w); };
  }
  function openBook(keepScroll) {
    stopGame();
    const got = STICKERS.filter(([e]) => stickerCount(e) > 0).length;
    const shinies = STICKERS.filter(([e]) => stickerCount(e, true) > 0).length;
    $('#bookCount').textContent = `${got} av ${STICKERS.length}${shinies ? ` · ✨ ${shinies} glänsande` : ''}`;
    // Varje medalj är en knapp: tryck så står det vad som krävs och var man gör det
    $('#medalRow').innerHTML = WORLD_IDS.map(w => Object.entries(WORLDS[w].medals).map(([k, [e, name]]) => (save.path[k]
      ? `<button class="slot${save.path['s-' + k] ? ' shine' : ''}" data-medal="${k}"><div><div class="em">${e}</div><small>${name}${save.path['s-' + k] ? ' ✨' : ''}</small></div></button>`
      : `<button class="slot missing" data-medal="${k}" aria-label="${name}, inte vunnen än"><div><div class="em">${e}</div><small>?</small></div></button>`)).join('')).join('');
    const nb = save.records.buddies || 0;
    if (nb || (net.player && !isSolo())) $('#medalRow').insertAdjacentHTML('beforeend', `<button class="slot${nb ? '' : ' missing'}" data-medal="buddy"><div><div class="em">🤝</div><small>Kompisbricka${nb > 1 ? ` <span class="x">×${nb}</span>` : ''}</small></div></button>`);
    $$('#medalRow [data-medal]').forEach(b => b.addEventListener('click', () => { sfx.select(); medalSheet(b.dataset.medal); }));
    // Flödet: dubbletter → jordgubbar i korgen → kläder eller mat
    const dups = stickerDups();
    const worth = STICKERS.reduce((sum, [e, , r]) => sum + Math.max(0, stickerCount(e) - 1) * RARITY[r].berries, 0);
    $('#tradeBox').innerHTML = `
      <div class="flow"><span><i aria-hidden="true">🃏</i>Dubbletter</span><span><i aria-hidden="true">🍓</i>Korgen: ${basket()}</span><span><i aria-hidden="true">👕</i>Kläder eller mat</span></div>
      <p>${dups ? `Du har <b>${dups} ${dups === 1 ? 'dubblett' : 'dubbletter'}</b> värda <b>${worth} 🍓</b>. Tryck på ett klistermärke för att byta eller dela.` : 'Tryck på ett klistermärke för att se det. Har du flera av samma kan du byta dem mot jordgubbar.'}</p>
      <div class="flow-actions">${dups ? `<button class="chunky coral" id="tradeAll">Byt alla dubbletter</button>` : ''}<button class="chunky sun" id="toWardrobe">👕 Till garderoben</button></div>`;
    const ta = $('#tradeAll');
    if (ta) ta.onclick = tradeAll;
    $('#toWardrobe').onclick = openWardrobe;
    // Uppdelat per sällsynthet, med rubrik och antal
    const g = $('#bookGrid'); g.innerHTML = '';
    RARITY.forEach((rar, r) => {
      const list = STICKERS.filter(x => x[2] === r);
      const have = list.filter(([e]) => stickerCount(e) || stickerCount(e, true)).length;
      g.insertAdjacentHTML('beforeend', `<h3 class="rar-head r${r}">${rar.plural} <small>${have} av ${list.length} · ${rar.berries} 🍓 per dubblett</small></h3>`);
      const grid = document.createElement('div'); grid.className = 'book';
      list.forEach(([e, name]) => {
        const n = stickerCount(e), sh = stickerCount(e, true);
        const b = document.createElement('button');
        b.className = `slot r${r}` + (n || sh ? '' : ' missing') + (sh ? ' has-shiny' : '') + (n > 1 ? ' dup' : '');
        b.innerHTML = n || sh
          ? `<div><div class="em">${e}</div><small>${name}</small>${n > 1 ? ` <span class="x">×${n}</span>` : ''}${sh ? `<span class="shiny">✨${sh > 1 ? `×${sh}` : ''}</span>` : ''}</div>`
          : '<span>?</span>';
        b.setAttribute('aria-label', n || sh ? `${name}, ${rar.name.toLowerCase()}, ${n} st${sh ? `, ${sh} glänsande` : ''}` : `${rar.name} klistermärke, inte hittat än`);
        b.addEventListener('click', () => stickerSheet(e));
        grid.appendChild(b);
      });
      g.appendChild(grid);
    });
    if (current !== 'book') show('book');
    else if (!keepScroll) window.scrollTo({ top: 0 });
  }

  /* ================= Klassen ================= */
  function eventText(e) {
    const n = `<b>${esc(e.name)}</b>`;
    switch (e.type) {
      case 'medal': { const m = ALL_MEDALS[e.detail]; return m ? `${n} vann ${m[1]} ${m[0]}` : `${n} vann en medalj 🏅`; }
      case 'expert': { const w = WORLDS[e.detail]; return `${n} blev ${w ? w.expertTitle : 'expert'}! ${EXPERT_ICON[e.detail] || '🎓'}`; }
      case 'title': return `${n} har fått titeln ${esc(e.detail)}! ⭐`;
      case 'daily': return `${n} har gjort dagens utmaning ${esc(e.detail)} dagar i rad! 🔥`;
      case 'book': return `${n} har samlat alla klistermärken! 📒`;
      case 'mission': return `🎉 <b>Klassen klarade veckans uppdrag!</b> Sista biten: ${n}`;
      case 'contest': {
        const [, pct, ...rest] = String(e.detail).split('|');
        const what = { 25: 'en fjärdedel av', 50: 'halva', 75: 'tre fjärdedelar av', 100: 'hela' }[pct] || `${esc(pct)} % av`;
        return `🏔️ <b>${esc(rest.join('|') || 'En klass')}</b> har byggt ${what} sitt berg! Nu kör vi!`;
      }
      case 'buddy': { const [a, b] = String(e.detail).split('|'); return `🤝 <b>${esc(a)}</b> och <b>${esc(b || '')}</b> klarade en kompisutmaning!`; }
      case 'allin': return `🌟 <b>Alla i klassen har varit med den här veckan!</b> Alla får ett extra klistermärke.`;
      case 'pet': return `<b>${esc(genitive(e.name))}</b> husdjur växte och blev ${esc((PET_STAGES[+e.detail] || [0, 'större'])[1].toLowerCase())}! ${PET_ICONS[+e.detail] || '🐾'}`;
      case 'record': {
        const [id, sc] = String(e.detail).split(':');
        const st = stationById(id);
        return `${n} satte rekord i ${esc(st ? st.name : 'en utmaning')}: ${esc(sc)} rätt! ⏱️`;
      }
      default: return `${n} gjorde något bra!`;
    }
  }
  function ago(ms) {
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 2) return 'nyss';
    if (m < 60) return `${m} min sedan`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} tim sedan`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'igår' : `${d} dagar sedan`;
  }
  async function openClass() {
    stopGame();
    show('class');
    $('#classTitle').textContent = net.player.className || 'Klassen';
    $('#mates').innerHTML = '<p class="stats">Hämtar klassen …</p>';
    $('#feed').innerHTML = '';
    $('#cheerNews').hidden = true;
    renderAvatarPicker();
    if (net.inflight || ls.get(ACCOUNT_KEY)?.dirty) await sync();
    const c = await refreshClassInfo();
    if (current !== 'class') return;
    if (!c) { $('#mates').innerHTML = '<p class="error">Kommer inte åt klassen just nu. Kolla internet och försök igen.</p>'; return; }
    renderClass(c);
  }
  function renderClass(c) {
    $('#classTitle').textContent = c.name;
    const seen = prefs.seenCheers[net.player.id] || 0;
    const fresh = c.myCheers - seen;
    if (fresh > 0) {
      $('#cheerNews').hidden = false;
      $('#cheerNews').textContent = fresh === 1 ? '👏 En kompis har hejat på dig!' : `👏 ${fresh} kompisar har hejat på dig!`;
    }
    prefs.seenCheers[net.player.id] = c.myCheers; savePrefs();
    // Veckans uppdrag
    const m = c.mission;
    $('#missionTitle').textContent = m.title;
    $('#missionMeter').style.width = Math.min(100, 100 * m.progress / m.goal) + '%';
    const daysLeft = Math.max(0, Math.ceil((m.endsAt - Date.now()) / 86400000));
    $('#missionText').textContent = m.progress >= m.goal
      ? `Uppdraget klart! ${m.progress} ${m.unit}. Grymt jobbat allihop!`
      : `${m.progress} av ${m.goal} ${m.unit} · ${daysLeft <= 1 ? 'sista dagen' : `${daysLeft} dagar kvar`}`;
    const all = m.everyone;
    $('#missionAll').hidden = !all || all.players < 2;
    if (all && all.players >= 2) {
      $('#missionAll').innerHTML = all.allIn
        ? `🌟 <b>Alla ${all.players} har varit med!</b> Alla med-bonus: ett extra klistermärke till alla.`
        : `👥 <b>${all.contributed} av ${all.players}</b> har varit med den här veckan. När alla har spelat en runda får alla ett extra klistermärke!`;
    }
    renderContest(c.contest);
    renderClassPet(c.pet);
    renderWall(c);
    // Stjärnburken
    $('#jarGoal').textContent = `Mål: ${c.goal} ★`;
    $('#jarBig').innerHTML = `${c.total} <span>★</span>`;
    $('#jarMeter').style.width = Math.min(100, 100 * c.total / c.goal) + '%';
    $('#jarText').textContent = c.total >= c.goal
      ? 'Ni har fyllt stjärnburken! Fråga er lärare om en klassbelöning.'
      : `Alla stjärnor i klassen hamnar i burken. ${c.goal - c.total} kvar till målet!`;
    // Händelser
    const feed = $('#feed');
    feed.innerHTML = c.events.length ? '' : '<p class="stats">Här syns det när någon i klassen vinner en medalj, blir expert eller får en ny titel.</p>';
    c.events.forEach(e => {
      const li = document.createElement('div');
      li.className = 'event' + (e.mine ? ' mine' : '');
      const done = e.mine || e.cheered;
      li.innerHTML = `<span class="em" aria-hidden="true">${esc(e.avatar)}</span>
        <div class="etxt"><p>${eventText(e)}</p><small>${ago(e.at)}</small></div>
        <button class="heja" ${done ? 'disabled' : ''} aria-label="Heja på ${esc(e.name)}">👏 <span>${e.cheers || ''}</span>${done ? '' : ' Heja!'}</button>`;
      const btn = $('.heja', li);
      if (!done) btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const r = await api('POST', `events/${e.id}/cheer`);
          btn.innerHTML = `👏 <span>${r.cheers}</span>`;
          const [x, y] = centerOf(btn); burst(x, y, 30); sfx.right();
        } catch (err) { btn.disabled = false; }
      });
      feed.appendChild(li);
    });
    // Klasskompisar
    $('#mates').innerHTML = c.players.map(p => `<div class="mate${p.me ? ' me' : ''}">
        <span class="em" aria-hidden="true">${esc(p.avatar)}</span><b>${esc(p.name)}${p.me ? ' (du)' : ''}</b>
        <small>★ ${p.stars} · ${p.stickers} klistermärken${p.dailyStreak > 1 ? ` · 🔥${p.dailyStreak}` : ''}</small>
        <span class="medals" aria-label="${p.medals} medaljer">${PET_ICONS[petStage(p.petXp || 0)]} ${'🏅'.repeat(Math.min(p.medals || 0, 10))}${(p.experts || []).map(w => EXPERT_ICON[w] || '').join('')}</span>
      </div>`).join('');
    if (c.total >= c.goal || m.progress >= m.goal) rain(80);
  }
  // Klasskamp: varje klass bygger sitt eget berg mot ett eget mål. Bokstavsordning,
  // ingen placering. Hejaropet visar hur det går för en annan klass.
  function contestCheer(k) {
    if (!k || !k.classes || !k.classes.length) return '';
    const mine = k.classes.find(c => c.mine);
    if (k.ended) return `🏔️ ${k.title} är slut! Tillsammans byggde skolan ${k.total} ${k.unit}.`;
    const others = k.classes.filter(c => !c.mine && c.progress > 0);
    if (others.length) {
      const o = others[Math.floor(Date.now() / 7200000) % others.length];
      return `🏔️ ${o.name} har byggt ${o.percent} % av sitt ${k.mountain}. Nu kör vi!`;
    }
    return mine ? `🏔️ Vårt ${k.mountain} är på ${mine.percent} %. Nu bygger vi!` : '';
  }
  function renderContest(k) {
    $('#contestPanel').hidden = !k;
    if (!k) return;
    $('#contestTitle').textContent = k.title;
    const left = k.endsAt ? Math.max(0, Math.ceil((k.endsAt - Date.now()) / 86400000)) : null;
    $('#contestSub').textContent = k.ended ? 'Klar' : left != null ? (left <= 1 ? 'Sista dagen' : `${left} dagar kvar`) : 'Alla hjälps åt';
    $('#mountains').innerHTML = k.classes.map(c => `<div class="mtn${c.mine ? ' mine' : ''}" aria-label="${esc(c.name)}: ${c.percent} procent av berget">
        <span class="flag" aria-hidden="true">${c.percent >= 100 ? '🚩' : ''}</span>
        <span class="peak" style="--fill:${c.percent}%" aria-hidden="true"></span>
        <b>${esc(c.name)}</b><small>${c.percent} %</small></div>`).join('');
    $('#contestText').textContent = contestCheer(k);
    $('#contestTotal').textContent = `Hela skolan har byggt ${k.total} ${k.unit} tillsammans.`;
  }
  // Klassplutten växer av allas rundor och blir glad när många spelar
  function renderClassPet(p) {
    $('#classPet').hidden = !p;
    if (!p) return;
    const cls = { 'ägg': 'mood-new', 'längtar': 'mood-hungry', 'glad': 'mood-ok' }[p.mood] || 'mood-happy';
    // Klassplutten har sex steg; rita dem med husdjurens utseende för ägg, bebis, liten, stor, jätte och kung
    $('#cpView').innerHTML = petHTML([0, 1, 3, 5, 7, 8][p.stage] || 0, cls);
    $('#cpStage').textContent = `${p.name} · ${p.stageName}`;
    $('#cpMood').textContent = p.moodText;
    $('#cpMeter').style.width = p.percent + '%';
    $('#cpNext').textContent = p.nextAt ? `${p.rounds} rundor av ${p.nextAt} tills ${p.name} växer` : `${p.name} är fullvuxen!`;
  }
  // Kunskapsväggen: hur många i klassen som kan varje tal. Inga namn,
  // bara en bild av vad klassen kan tillsammans och var vi kan hjälpas åt.
  let wallWorld = 'plus';
  function renderWall(c) {
    const wall = c.wall || {};
    $('#wallPanel').hidden = !c.wall;
    if (!c.wall) return;
    const tabs = $('#wallTabs'); tabs.innerHTML = '';
    WORLD_IDS.forEach(id => {
      const b = document.createElement('button');
      b.textContent = WORLDS[id].tab; b.setAttribute('aria-pressed', String(wallWorld === id));
      b.addEventListener('click', () => { wallWorld = id; sfx.select(); renderWall(c); });
      tabs.appendChild(b);
    });
    const w = WORLDS[wallWorld], total = c.players.length;
    $('#wallGrid').innerHTML = w.levels.map(n => {
      const k = wallWorld[0] + n, cnt = wall[k] || 0, share = total ? cnt / total : 0;
      const mine = knows(wallWorld, n);
      return `<div class="wtile${mine ? ' mine' : ''}" style="--share:${share.toFixed(2)}" aria-label="${esc(w.level(n))}: ${cnt} av ${total} kan${mine ? ', du också' : ''}">
        <b>${wallWorld === 'minus' ? MINUS : wallWorld === 'dubbel' ? '2×' : ''}${n}</b><small>${cnt}</small></div>`;
    }).join('');
    const known = w.levels.filter(n => wall[wallWorld[0] + n]).length;
    // Tips om vad klassen kan träna på: de tal färst kan, helst de lite större
    const low = w.levels.filter(n => (wall[wallWorld[0] + n] || 0) < Math.max(1, total / 3))
      .sort((x, y) => (wall[wallWorld[0] + x] || 0) - (wall[wallWorld[0] + y] || 0) || y - x).slice(0, 4).sort((x, y) => x - y);
    $('#wallText').innerHTML = known === 0
      ? 'När någon kan ett tal så bra att pärlorna försvinner lyser rutan upp här.'
      : `Siffran visar hur många som kan talet. ⭐ = du kan det.${low.length ? ` Klassen kan träna mer på <b>${low.join(', ')}</b>. Kan du det? Hjälp en kompis!` : ' Klassen kan alla tal. Grymt!'}`;
  }
  function renderAvatarPicker() {
    const row = $('#myAvatar'); row.innerHTML = '';
    AVATARS.forEach(a => {
      const b = document.createElement('button');
      b.textContent = a; b.setAttribute('aria-pressed', String(net.player.avatar === a)); b.setAttribute('aria-label', 'Välj figur ' + a);
      b.addEventListener('click', async () => {
        try {
          await api('PATCH', 'me', { avatar: a });
          net.player.avatar = a;
          ls.set(ACCOUNT_KEY, { ...(ls.get(ACCOUNT_KEY) || {}), player: net.player });
          sfx.select();
          openClass();
        } catch (e) { $('#mates').insertAdjacentHTML('afterbegin', `<p class="error">${esc(e.message)}</p>`); }
      });
      row.appendChild(b);
    });
  }

  /* ================= Gå med i klassen ================= */
  const J = { cls: null, code: '' };
  const body = () => $('#joinBody');
  function openJoin(code) {
    if (isSolo()) return openMove();
    stopGame();
    show('join');
    joinCode(code || ls.get(CLASS_KEY) || '', !!code);
  }
  function joinCode(prefill, auto) {
    $('#joinBack').onclick = () => (needsWelcome() ? showWelcome() : goHome());
    body().innerHTML = `<div class="formstack">
      <h2>Skriv din kod</h2>
      <p class="lead">Klasskoden får du av din lärare, till exempel SOL-4821. Har du ett eget konto skriver du din egen kod.</p>
      <input class="codefield" id="classCode" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="14" value="${esc(prefill)}" aria-label="Klasskod">
      <p class="error" id="joinErr"></p>
      <button class="chunky coral" id="codeGo">Fortsätt</button></div>`;
    const go = async () => {
      const code = $('#classCode').value.trim();
      if (!code) return;
      $('#codeGo').disabled = true;
      try {
        const res = await api('GET', 'classes/' + encodeURIComponent(code));
        J.cls = res; J.code = res.class.code;
        ls.set(CLASS_KEY, J.code);
        if (res.class.solo) return loginSolo();
        joinWho();
      } catch (e) { $('#joinErr').textContent = e.message; $('#codeGo').disabled = false; }
    };
    $('#codeGo').addEventListener('click', go);
    $('#classCode').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('#classCode').focus();
    if (auto) go();
  }
  function joinWho() {
    $('#joinBack').onclick = () => joinCode(J.code);
    const kids = J.cls.players.map(p => `<button class="kid" data-id="${p.id}"><span class="em" aria-hidden="true">${esc(p.avatar)}</span><span>${esc(p.name)}</span></button>`).join('');
    body().innerHTML = `<h2>${esc(J.cls.class.name)}</h2><p class="lead">Vem är du? Tryck på ditt namn.</p>
      <div class="kids">${kids}<button class="kid new" id="kidNew"><span class="em" aria-hidden="true">✨</span><span>Jag är ny</span></button></div>`;
    $$('.kid[data-id]').forEach(b => b.addEventListener('click', () => {
      const p = J.cls.players.find(x => x.id === +b.dataset.id);
      if (p.needsPin) choosePin(p.name, pin => api('POST', 'login', { code: J.code, playerId: p.id, pin }), () => joinWho());
      else pinPad({ title: `Hej ${p.name}!`, lead: 'Tryck dina tre hemliga bilder.', back: joinWho, submit: pin => api('POST', 'login', { code: J.code, playerId: p.id, pin }) });
    }));
    $('#kidNew').addEventListener('click', joinNew);
  }
  // Eget konto: bara en spelare bakom koden, så direkt till bildkoden
  function loginSolo() {
    const p = J.cls.players[0];
    if (!p) return joinCode(J.code);
    const submit = pin => api('POST', 'login', { code: J.code, playerId: p.id, pin });
    if (p.needsPin) return choosePin(p.name, submit, () => joinCode(J.code));
    pinPad({ title: `Hej ${p.name}!`, lead: 'Tryck dina tre hemliga bilder.', back: () => joinCode(J.code), submit });
  }
  // Skapa ett eget konto utan klass
  function openAccount() {
    stopGame();
    show('join');
    J.cls = null; J.code = '';
    $('#joinBack').onclick = () => (needsWelcome() ? showWelcome() : goHome());
    let avatar = pick(AVATARS);
    body().innerHTML = `<div class="formstack"><h2>Skapa eget konto</h2>
      <p class="lead">Spelet kommer ihåg dina stjärnor, ditt husdjur och din väg, på alla enheter.</p>
      <label class="lead" for="newName">Vad heter du? Skriv ditt förnamn.</label>
      <input class="textfield" id="newName" maxlength="24" autocomplete="off" value="${esc(save.name || '')}">
      <span class="lead">Välj en figur</span>
      <div class="pickrow" id="avPick"></div>
      <p class="error" id="joinErr"></p>
      <button class="chunky coral" id="newGo">Fortsätt</button></div>`;
    const paint = () => $$('#avPick button').forEach(b => b.setAttribute('aria-pressed', String(b.textContent === avatar)));
    AVATARS.forEach(a => {
      const b = document.createElement('button'); b.textContent = a; b.setAttribute('aria-label', 'Figur ' + a);
      b.addEventListener('click', () => { avatar = a; paint(); sfx.select(); });
      $('#avPick').appendChild(b);
    });
    paint();
    $('#newGo').addEventListener('click', () => {
      const name = $('#newName').value.trim();
      if (name.length < 2) { $('#joinErr').textContent = 'Skriv ditt namn (minst två bokstäver).'; return; }
      choosePin(name, pin => api('POST', 'accounts', { name, avatar, pin }), openAccount);
    });
    $('#newName').focus();
  }
  // Ett eget konto går med i en klass. Allt följer med.
  function openMove() {
    stopGame();
    show('join');
    $('#joinBack').onclick = goHome;
    body().innerHTML = `<div class="formstack">
      <h2>Gå med i en klass</h2>
      <p class="lead">Skriv klasskoden från din lärare, till exempel SOL-4821. Allt du har samlat följer med.</p>
      <input class="codefield" id="classCode" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="14" aria-label="Klasskod">
      <p class="error" id="joinErr"></p>
      <button class="chunky coral" id="codeGo">Fortsätt</button></div>`;
    const go = async () => {
      const code = $('#classCode').value.trim();
      if (!code) return;
      $('#codeGo').disabled = true;
      try {
        const res = await api('GET', 'classes/' + encodeURIComponent(code));
        if (res.class.solo) throw new Error('Det där är ett eget konto, inte en klass. Fråga din lärare efter klasskoden.');
        moveConfirm(res);
      } catch (e) { $('#joinErr').textContent = e.message; $('#codeGo').disabled = false; }
    };
    $('#codeGo').addEventListener('click', go);
    $('#classCode').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('#classCode').focus();
  }
  function moveConfirm(res) {
    $('#joinBack').onclick = openMove;
    body().innerHTML = `<div class="formstack">
      <h2>${esc(res.class.name)}</h2>
      <p class="lead">Du går med som:</p>
      <input class="textfield" id="moveName" maxlength="24" autocomplete="off" value="${esc(net.player.name)}" aria-label="Ditt namn i klassen">
      <p class="lead">Sen loggar du in med klasskoden och samma bildkod som nu. Din egen kod slutar gälla.</p>
      <p class="error" id="joinErr"></p>
      <button class="chunky coral" id="moveGo">Gå med i klassen</button></div>`;
    $('#moveGo').addEventListener('click', async () => {
      $('#moveGo').disabled = true;
      try {
        const r = await api('POST', 'me/join', { code: res.class.code, name: $('#moveName').value.trim() });
        net.player = r.player;
        ls.set(ACCOUNT_KEY, { ...(ls.get(ACCOUNT_KEY) || {}), player: net.player });
        ls.set(CLASS_KEY, res.class.code);
        goHome();
        refreshClassInfo();
        sfx.fanfare(); rain(140);
        cheer(`Välkommen till ${res.class.name}!`, true);
        say(`Välkommen till klassen, ${net.player.name}!`);
      } catch (e) { $('#joinErr').textContent = e.message; $('#moveGo').disabled = false; }
    });
  }
  function joinNew() {
    $('#joinBack').onclick = joinWho;
    let avatar = pick(AVATARS);
    body().innerHTML = `<div class="formstack"><h2>Välkommen!</h2>
      <label class="lead" for="newName">Vad heter du? Skriv ditt förnamn.</label>
      <input class="textfield" id="newName" maxlength="24" autocomplete="off">
      <span class="lead">Välj en figur</span>
      <div class="pickrow" id="avPick"></div>
      <p class="error" id="joinErr"></p>
      <button class="chunky coral" id="newGo">Fortsätt</button></div>`;
    const paint = () => $$('#avPick button').forEach(b => b.setAttribute('aria-pressed', String(b.textContent === avatar)));
    AVATARS.forEach(a => {
      const b = document.createElement('button'); b.textContent = a; b.setAttribute('aria-label', 'Figur ' + a);
      b.addEventListener('click', () => { avatar = a; paint(); sfx.select(); });
      $('#avPick').appendChild(b);
    });
    paint();
    $('#newGo').addEventListener('click', () => {
      const name = $('#newName').value.trim();
      if (name.length < 2) { $('#joinErr').textContent = 'Skriv ditt namn (minst två bokstäver).'; return; }
      choosePin(name, pin => api('POST', `classes/${encodeURIComponent(J.code)}/players`, { name, avatar, pin }), joinNew);
    });
    $('#newName').focus();
  }
  function choosePin(name, submit, back) {
    pinPad({
      title: 'Välj en hemlig bildkod', lead: `${name}, tryck tre bilder som du kommer ihåg. Berätta inte för någon!`, back,
      submit: first => {
        // Bekräfta koden en gång till
        setTimeout(() => pinPad({
          title: 'Tryck samma bilder igen', lead: 'Så att vi vet att du kommer ihåg dem.', back: () => choosePin(name, submit, back),
          submit: again => (again.join() === first.join() ? submit(again) : Promise.reject(new Error('Det blev inte samma bilder. Försök igen!')))
        }), 300);
        return Promise.resolve(null);
      }
    });
  }
  function pinPad({ title, lead, back, submit }) {
    $('#joinBack').onclick = back;
    let pin = [];
    body().innerHTML = `<h2>${esc(title)}</h2><p class="lead">${esc(lead)}</p>
      <div class="pinslots" id="slots"><span></span><span></span><span></span></div>
      <div class="pinpad" id="pad"></div>
      <div class="pinactions"><button class="chunky ghost" id="pinUndo">Sudda</button></div>
      <p class="error center" id="joinErr"></p>`;
    const paint = () => $$('#slots span').forEach((s, i) => { s.textContent = pin[i] != null ? PIN_PICS[pin[i]] : ''; s.classList.toggle('full', pin[i] != null); });
    PIN_PICS.forEach((p, i) => {
      const b = document.createElement('button'); b.textContent = p; b.setAttribute('aria-label', 'Bild ' + (i + 1));
      b.addEventListener('click', async () => {
        if (pin.length >= 3) return;
        pin.push(i); sfx.select(); paint();
        if (pin.length === 3) {
          try {
            const res = await submit(pin.slice());
            if (res && res.token) afterLogin(res);
          } catch (e) {
            $('#joinErr').textContent = e.message; sfx.wrong();
            setTimeout(() => { pin = []; paint(); }, 600);
          }
        }
      });
      $('#pad').appendChild(b);
    });
    $('#pinUndo').addEventListener('click', () => { pin.pop(); paint(); });
  }
  function afterLogin(res) {
    const guest = loadGuest();
    const finishLogin = mergeGuest => {
      useAccount(res.token, res.player, res.progress);
      if (mergeGuest) {
        const gp = progressOf(guest);
        for (const k of ['best', 'path', 'records']) for (const [key, v] of Object.entries(gp[k])) save[k][key] = Math.max(save[k][key] || 0, v);
        save.total += gp.total; save.rounds += gp.rounds;
        save.stickers = [...save.stickers, ...gp.stickers];
        save.pet.xp += gp.pet.xp; save.pet.last = Math.max(save.pet.last, gp.pet.last);
        if (!save.pet.name) save.pet.name = gp.pet.name;
        if (gp.daily.day > save.daily.day) save.daily = gp.daily;
        ls.set(GUEST_KEY, withDefaults({ name: guest.name }, {}));
        persist();
      }
      const welcome = () => {
        goHome();
        refreshClassInfo();
        sfx.fanfare(); rain(120);
        cheer(`Välkommen ${res.player.name}!`, true);
        say(`Välkommen ${res.player.name}!`);
      };
      if (!res.code) return welcome();
      // Nytt eget konto: visa koden som behövs för att logga in på en annan enhet
      $('#joinBack').onclick = welcome;
      body().innerHTML = `<div class="codecard"><h2>Ditt konto är klart!</h2>
        <p class="lead">Det här är din egen kod. Skriv upp den, eller be en vuxen spara den. Den behövs när du vill spela på en annan enhet.</p>
        <span class="bigcode">${esc(res.code)}</span>
        <p class="lead">Du loggar in med koden och dina tre hemliga bilder.</p>
        <button class="chunky coral" id="codeOk">Jag har sparat koden</button></div>`;
      $('#codeOk').addEventListener('click', welcome);
    };
    if (!hasProgress(progressOf(guest))) return finishLogin(false);
    $('#joinBack').onclick = () => finishLogin(false);
    body().innerHTML = `<div class="formstack"><h2>Ta med dina stjärnor?</h2>
      <p class="lead">På den här enheten finns ${guest.total} stjärnor och ${guest.stickers.length} klistermärken som inte är sparade i ${res.player.solo ? 'ditt konto' : 'klassen'}. Är det dina?</p>
      <button class="chunky coral" id="mergeYes">Ja, ta med dem</button>
      <button class="chunky ghost" id="mergeNo">Nej, de är någon annans</button></div>`;
    $('#mergeYes').addEventListener('click', () => finishLogin(true));
    $('#mergeNo').addEventListener('click', () => finishLogin(false));
  }

  /* ================= Knappar ================= */
  $('#brand').addEventListener('click', () => { if (needsWelcome()) return goHome(); setTab('home'); });
  $$('[data-home]').forEach(b => b.addEventListener('click', goHome));
  $('#openRoad').addEventListener('click', () => openRoad());
  $('#pickFind').addEventListener('click', () => startFindLevel('plus', chosenN));
  $('#pickBubbles').addEventListener('click', () => startBubbles(chosenN));
  $('#mixA').addEventListener('click', () => { roadContext = false; startMix(0); });
  $('#mixB').addEventListener('click', () => { roadContext = false; startMix(1); });
  $('#trickyBtn').addEventListener('click', () => { roadContext = false; startTricky(); });
  $('#dailyBtn').addEventListener('click', () => { roadContext = false; startDaily(); });
  $('#openBook').addEventListener('click', () => openBook());
  $('#openDuel').addEventListener('click', openDuel);
  $('#duelGo').addEventListener('click', startDuel);
  $('#duelAgain').addEventListener('click', startDuel);
  $('#duelSetupBtn').addEventListener('click', openDuel);
  $('#duelQuit').addEventListener('click', goHome);
  $('#openClass').addEventListener('click', openClass);
  $('#openJoin').addEventListener('click', () => openJoin());
  $('#openAccount').addEventListener('click', () => openAccount());
  $('#logoutBtn').addEventListener('click', () => logout(false));
  $('#nameInput').addEventListener('input', e => {
    save.name = e.target.value.replace(/[<>]/g, '').trim().slice(0, 16);
    $('#hello').textContent = save.name ? `Hej ${save.name}!` : 'Hej!';
    persist();
  });
  $('#soundBtn').addEventListener('click', () => { prefs.sound = !prefs.sound; savePrefs(); renderSettings(); if (prefs.sound) { unlockAudio(); sfx.right(); } else if (silentEl) silentEl.pause(); });
  $('#soundTest').addEventListener('click', soundTest);
  $('#voiceBtn').addEventListener('click', () => {
    prefs.voice = !prefs.voice; savePrefs(); renderSettings(); renderVoicePick();
    if (!prefs.voice) return stopSpeech();
    loadVoices();
    if (voiceState.server) say(`Hej ${nm()}!`);
    else if (!window.speechSynthesis) cheer('Rösten finns inte här');
    else if (voices.length && !swedishVoice()) cheer('Ingen svensk röst på enheten');
    else say(`Hej ${nm()}!`);
  });
  let resetArmed = 0;
  $('#resetBtn').addEventListener('click', e => {
    if (!resetArmed) {
      e.target.textContent = 'Säker? Klicka igen';
      resetArmed = setTimeout(() => { resetArmed = 0; e.target.textContent = 'Nollställ allt'; }, 3000);
      return;
    }
    clearTimeout(resetArmed); resetArmed = 0;
    save = withDefaults({ name: save.name }, {});
    persist();
    e.target.textContent = 'Nollställ allt';
    renderStart();
  });

  boot();
})();
