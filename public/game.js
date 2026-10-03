(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const genitive = n => (/[sxz]$/i.test(n) ? n : n + 's');
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MINUS = '−';

  /* ================= Innehåll ================= */
  const STICKERS = [
    ['🦖','T-rex'],['🦄','Enhörning'],['🐙','Bläckfisk'],['🦊','Räv'],['🐼','Panda'],['🚀','Raket'],
    ['🌈','Regnbåge'],['🦁','Lejon'],['🐸','Groda'],['🐳','Val'],['🦋','Fjäril'],['🍕','Pizza'],
    ['⚽','Fotboll'],['🎸','Gitarr'],['🐉','Drake'],['🦕','Långhals'],['🐯','Tiger'],['🐨','Koala'],
    ['🦉','Uggla'],['🍩','Munk'],['🛸','UFO'],['🐬','Delfin'],['🦈','Haj'],['🐢','Sköldpadda'],
    ['🦒','Giraff'],['🐧','Pingvin'],['🤖','Robot'],['👑','Krona'],['🌋','Vulkan'],['🏆','Pokal']
  ];
  const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐯', '🐨', '🐵', '🐰', '🐶', '🐱', '🦄', '🐲'];
  const PIN_PICS = ['🐶', '🐱', '🐸', '🦊', '🐼', '🦁', '🍎', '🍕', '🚗', '🚀', '⚽', '🌈'];
  const TITLES = [[0,'Talspanare'],[10,'Talkompis'],[25,'Plusproffs'],[50,'Mattehjälte'],[100,'Talkamratmästare'],[200,'Mattelegend'],[400,'Mattegeni']];
  const titleFor = t => TITLES.filter(([min]) => t >= min).pop()[1];

  // Bara svenska hejarop, så att talsyntesen läser dem rätt
  const CHEERS = ['Hurra!','Jippi!','Toppen!','Snyggt!','Klockrent!','Kanon!','Jättebra!','Grymt!','Superbra!','Mattemagi!','Helt rätt!','Strålande!','Bingo!','Fantastiskt!','Häftigt!','Ja, ja, ja!','Briljant!','Pang på!'];
  const nameCheers = () => [`Bra jobbat ${save.name}!`, `Heja ${save.name}!`, `${save.name}, du är en mattestjärna!`, `Så ska det se ut, ${save.name}!`];
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
  const GUEST_KEY = 'talkamrater-v1';
  const ACCOUNT_KEY = 'talkamrater-account';
  const PREFS_KEY = 'talkamrater-prefs';
  const CLASS_KEY = 'talkamrater-class';
  const ls = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const FIELDS = ['best', 'total', 'rounds', 'stickers', 'path', 'records', 'tricky', 'pet', 'daily'];
  const freshProgress = () => ({
    best: {}, total: 0, rounds: 0, stickers: [], path: {}, records: {}, tricky: {},
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
    return withDefaults({ name: g.name || 'Edwin' }, g);
  }
  const oldGuest = ls.get(GUEST_KEY) || {};
  const prefs = Object.assign({ sound: oldGuest.sound ?? true, voice: oldGuest.voice ?? true, world: 'plus', seenCheers: {}, flip: null }, ls.get(PREFS_KEY) || {});
  const savePrefs = () => ls.set(PREFS_KEY, prefs);
  if (!WORLDS[prefs.world]) prefs.world = 'plus';

  let save = loadGuest();

  /* ================= Server och synk ================= */
  const net = { online: false, token: null, player: null, timer: 0, inflight: false, classInfo: null };

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

  function logRound(r) { if (net.player) api('POST', 'me/rounds', r).catch(() => {}); }
  function postEvent(type, detail) { if (net.player) api('POST', 'me/events', { type, detail: String(detail) }).catch(() => {}); }

  function useAccount(token, player, progress, dirty = false) {
    net.token = token; net.player = player;
    save = withDefaults({ name: player.name }, progress);
    ls.set(ACCOUNT_KEY, { token, player, progress: progressOf(save), dirty });
    if (dirty) sync();
  }

  async function logout(expired) {
    if (net.token && !expired) { try { await api('POST', 'logout'); } catch (e) {} }
    ls.del(ACCOUNT_KEY);
    net.token = null; net.player = null; net.classInfo = null;
    save = loadGuest();
    goHome();
    if (expired) cheer('Logga in igen');
  }

  async function refreshClassInfo() {
    if (!net.player || !net.online) return null;
    try {
      net.classInfo = await api('GET', 'me/class');
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
    const cached = ls.get(ACCOUNT_KEY);
    if (cached && cached.token && cached.player) {
      net.token = cached.token; net.player = cached.player;
      save = withDefaults({ name: cached.player.name }, cached.progress);
    }
    renderStart();
    try {
      const h = await api('GET', 'health');
      net.online = !!(h && h.app === 'talkamrater');
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
    refreshClassInfo();
  }

  /* ================= Ljud ================= */
  let ac = null;
  function audio() {
    if (!prefs.sound) return null;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) { return null; }
  }
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
    sad() { [523, 494, 440].forEach((f, i) => tone(f, i * .18, .3, 'triangle', .1)); }
  };

  /* ================= Röst ================= */
  function say(text) {
    if (!prefs.voice) return;
    try {
      const s = window.speechSynthesis; if (!s) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(text.replaceAll(MINUS, ' minus ').replace(/[^\p{L}\p{N}\s!?,.+=-]/gu, ''));
      u.lang = 'sv-SE';
      const v = s.getVoices().find(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith('sv'));
      if (v) u.voice = v;
      u.rate = 1.05; u.pitch = 1.25;
      s.speak(u);
    } catch (e) {}
  }

  /* ================= Konfetti och hejarop ================= */
  const cv = $('#fx'), cx = cv.getContext('2d');
  const COLORS = ['#2F6BFF', '#FF6B3D', '#FFC83D', '#1FA866', '#E23D7A', '#FFFFFF'];
  let parts = [], raf = 0;
  function sizeCanvas() { const d = window.devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); }
  addEventListener('resize', sizeCanvas); sizeCanvas();
  function burst(x, y, n = 40, power = 1) {
    if (reduced) n = Math.min(n, 8);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, sp = (3 + Math.random() * 7) * power;
      parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 4 * power, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
        r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: pick(COLORS), life: 80 + Math.random() * 40 });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function rain(n = 160) {
    if (reduced) n = 20;
    for (let i = 0; i < n; i++) {
      parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .6, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3,
        w: 7 + Math.random() * 6, h: 10 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: pick(COLORS), life: 260 });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
    for (const p of parts) {
      p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2);
      cx.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) cx.clearRect(0, 0, innerWidth, innerHeight);
  }
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
    window.scrollTo({ top: 0 });
  }
  function talk(text, mood) {
    const scr = $('#' + current);
    const sp = $('.speech', scr), m = $('.mascot', scr);
    if (sp) sp.textContent = text;
    if (m && mood) { m.classList.remove('happy', 'oops'); void m.offsetWidth; m.classList.add(mood); }
  }
  function stopGame() {
    try { speechSynthesis.cancel(); } catch (e) {}
    clearTimeout(timer); clearInterval(ticker);
    G = null; D = null;
  }
  function goHome() { stopGame(); renderStart(); show('start'); }

  const starStr = n => [0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}">★</span>`).join('');
  const mascotHTML = '<div class="mascot happy" aria-hidden="true"><div class="eyes"><i></i><i></i></div><div class="mouth"></div></div>';
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
  const PET_STAGES = [[0, 'Ägg'], [6, 'Bebis'], [20, 'Liten'], [45, 'Stor'], [90, 'Jätte'], [160, 'Kung']];
  const PET_ICONS = ['🥚', '🐣', '🐾', '💜', '✨', '👑'];
  const petStage = xp => PET_STAGES.reduce((s, [min], i) => (xp >= min ? i : s), 0);
  const petName = () => save.pet.name || 'Plutt';
  function petMood() {
    const p = save.pet;
    if (!p.last) return { cls: 'mood-new', text: 'Ägget väntar på dig. Spela en runda så börjar det kläckas!' };
    const days = today() - p.last;
    if (petStage(p.xp) === 0) return { cls: 'mood-happy', text: 'Ägget gungar! Spela mer så kläcks det snart.' };
    if (days <= 0) return { cls: 'mood-happy', text: pick([`${petName()} är mätt och glad!`, `${petName()} dansar av glädje!`, `${petName()} älskar matte!`]) };
    if (days === 1) return { cls: 'mood-ok', text: `${petName()} undrar om ni ska spela idag.` };
    if (days <= 3) return { cls: 'mood-hungry', text: `${petName()} är hungrig! Spela en runda för att mata.` };
    return { cls: 'mood-hungry', text: `${petName()} har längtat efter dig! En runda så blir allt bra igen.` };
  }
  function petHTML(stage, moodCls) {
    if (stage === 0) return `<div class="pet egg ${moodCls}" aria-hidden="true"><i class="spot s1"></i><i class="spot s2"></i><i class="spot s3"></i></div>`;
    return `<div class="pet stage-${stage} ${moodCls}" aria-hidden="true">
      ${stage >= 3 ? '<i class="horn h1"></i><i class="horn h2"></i>' : ''}
      ${stage >= 4 ? '<i class="wing w1"></i><i class="wing w2"></i>' : ''}
      <i class="belly"></i><i class="eye e1"></i><i class="eye e2"></i><i class="mouth"></i>
      ${stage >= 2 ? '<i class="cheek c1"></i><i class="cheek c2"></i>' : ''}
      ${stage >= 5 ? '<span class="crown">👑</span>' : ''}
    </div>`;
  }
  function feedPet(food) {
    const p = save.pet;
    const before = petStage(p.xp);
    p.xp += food; p.last = today(); if (!p.born) p.born = today();
    const after = petStage(p.xp);
    return after > before ? after : 0;
  }
  function renderPet() {
    const st = petStage(save.pet.xp), mood = petMood();
    $('#petView').innerHTML = petHTML(st, mood.cls);
    $('#petName').textContent = petName();
    $('#petStageName').textContent = PET_STAGES[st][1];
    $('#petMood').textContent = mood.text;
    const next = PET_STAGES[st + 1];
    const from = PET_STAGES[st][0];
    $('#petMeter').style.width = next ? (100 * (save.pet.xp - from) / (next[0] - from)) + '%' : '100%';
    $('#petNext').textContent = next ? `${next[0] - save.pet.xp} 🍓 kvar tills ${petName()} blir ${next[1].toLowerCase()}` : `${petName()} är fullvuxen kung!`;
  }
  $('#petBtn').addEventListener('click', () => {
    const el = $('#petView .pet'); if (!el) return;
    el.classList.remove('jump'); void el.offsetWidth; el.classList.add('jump');
    sfx.select();
    const st = petStage(save.pet.xp);
    const lines = st === 0 ? ['Knack knack!', 'Det rör sig där inne!', 'Snart, snart …'] : ['Hihi, det kittlas!', 'Mer matte!', `Jag gillar dig, ${save.name}!`, 'Mums, stjärnfrukt!', 'Vet du vad 7 + 3 är? Tio!'];
    const line = pick(lines);
    $('#petMood').textContent = line;
    say(line);
  });
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
    if (q.w === 'plus') { q.form = rnd(0, 2); q.ans = q.n - q.a; q.max = q.n; }
    else if (q.w === 'minus') { q.form = Math.random() < 0.7 ? 0 : 1; q.ans = q.form === 0 ? q.n - q.a : q.a; q.max = q.n; }
    else { q.form = rnd(0, 2); q.ans = q.form === 0 ? 2 * q.n : q.n; q.max = q.form === 0 ? Math.max(12, 2 * q.n + 3) : Math.max(6, q.n + 3); }
    return q;
  }
  function allQs(w, n) {
    if (w === 'dubbel') {
      let qs = range(1, n).map(L => ({ w, n: L, a: L }));
      while (qs.length < 4) qs = qs.concat(range(1, n).map(L => ({ w, n: L, a: L })));
      return shuffle(qs);
    }
    return shuffle(range(0, n).map(a => ({ w, n, a })));
  }
  function rndQ(w, lo, hi) {
    const n = rnd(Math.max(1, lo), hi);
    if (w === 'dubbel') return { w, n, a: n };
    const a = n >= 2 && Math.random() < 0.85 ? rnd(1, n - 1) : rnd(0, n);
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
  function stations(wid) {
    const w = WORLDS[wid], p = w.prefix, list = [];
    for (const z of w.zones) {
      for (let n = z.from; n <= z.to; n++) {
        list.push({ world: wid, kind: 'number', id: `${p}n${n}`, n, zone: z, name: w.level(n), done: (save.best[`${p}${n}:find`] || 0) >= 2 });
      }
      list.push({ world: wid, kind: 'test', id: 't-' + z.id, zone: z, name: `Prov: ${z.name}`, lo: z.from, hi: z.to, count: z.test.count, pass: z.test.pass, done: (save.path['t-' + z.id] || 0) > 0 });
      if (z.challenge) list.push({ world: wid, kind: 'challenge', zone: z, ...z.challenge, done: (save.path[z.challenge.id] || 0) > 0 });
    }
    list.push({ world: wid, kind: 'final', ...w.final, done: (save.path[w.final.id] || 0) > 0 });
    let open = true;
    list.forEach(s => { s.open = open; if (!s.done) open = false; });
    return list;
  }
  const stationById = id => WORLD_IDS.flatMap(stations).find(s => s.id === id);
  const doneCount = wid => stations(wid).filter(s => s.done).length;

  function stationDetail(s) {
    const p = WORLDS[s.world].prefix;
    if (s.kind === 'number') return s.done ? starStr(save.best[`${p}${s.n}:find`]) : 'Klara rundan med minst ★★';
    if (s.kind === 'test') return s.done ? `Klarat! ${save.path[s.id]} av ${s.count} rätt` : `${s.count} frågor · ${s.pass} rätt behövs`;
    if (s.kind === 'challenge') return s.done ? `Klarat! Rekord ${save.records[s.id] || 0}` : `${s.secs} sekunder · mål ${s.goal} rätt`;
    return s.done ? `Du är ${WORLDS[s.world].expertTitle.toLowerCase()}!` : `${s.count} frågor · ${s.pass} rätt behövs`;
  }
  const nodeIcon = s => (s.kind === 'number' ? (s.done || s.open ? s.n : '🔒')
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
      el.innerHTML = `<svg class="road" aria-hidden="true"><path class="bed"/><path class="dash"/></svg>
        <div class="zone-head"><h3>${z.name}<small>${w.id === 'dubbel' ? 'Dubblor' : 'Talen'} ${z.from}–${z.to}</small></h3><span class="medal ${save.path['t-' + z.id] ? 'on' : ''}" title="${medal[1]}">${medal[0]}</span></div>
        <div class="stops"></div>`;
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
    b.setAttribute('aria-label', `${s.name}. ${s.done ? 'Klarad' : s.open ? 'Nästa steg' : 'Låst'}`);
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
    if (s.kind === 'number') return s.world === 'plus' ? openMode(s.n) : startFindLevel(s.world, s.n);
    showIntro(s);
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
    } else {
      $('#introTitle').textContent = s.name;
      list.innerHTML = `<li>📝 ${s.count} frågor: ${what}</li><li>🎯 ${s.pass} rätt behövs för att klara</li><li>🙈 Inga pärlor nu, du har dem i huvudet!</li>`;
      talk(s.kind === 'final' ? `Det här är det stora provet, ${save.name}. Klarar du det blir du ${w.expertTitle}!` : 'Ett svar per fråga. Ta det lugnt och tänk efter.');
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

  function renderWorldTabs(el, onChange) {
    el.innerHTML = '';
    WORLD_IDS.forEach(id => {
      const b = document.createElement('button');
      b.textContent = WORLDS[id].tab;
      b.setAttribute('aria-pressed', String(prefs.world === id));
      b.addEventListener('click', () => { if (prefs.world === id) return; prefs.world = id; savePrefs(); sfx.select(); onChange(); });
      el.appendChild(b);
    });
  }

  /* ================= Startsidan ================= */
  function renderStart() {
    const w = W();
    $('#hello').textContent = `Hej ${save.name}!`;
    $('#heroFace').innerHTML = net.player ? `<div class="avatar-big" aria-hidden="true">${net.player.avatar}</div>` : mascotHTML;
    $('#nameInput').value = save.name;
    $('#rankName').textContent = titleFor(save.total);
    $('#totalStars').textContent = save.total;
    $('#stickerCount').textContent = `${STICKERS.filter(([e]) => save.stickers.includes(e)).length} av ${STICKERS.length}`;

    renderDaily();
    renderPet();
    renderWorldTabs($('#worldTabs'), renderStart);

    const all = stations(w.id), done = all.filter(s => s.done).length;
    const next = all.find(s => !s.done);
    $('#roadLabel').textContent = w.id === 'plus' ? 'Vägen till expert' : `${w.name}: vägen till expert`;
    $('#roadCount').textContent = `Steg ${done} av ${all.length}`;
    $('#roadMeter').style.width = (100 * done / all.length) + '%';
    $('#roadNext').innerHTML = next ? `Nästa: <span>${esc(next.name)}</span>` : `<span>Du är ${w.expertTitle}!</span>`;
    $('#openRoad').textContent = done === 0 ? 'Börja resan' : next ? 'Fortsätt resan' : 'Titta på vägen';

    const tricky = Object.values(save.tricky).filter(v => v > 0).length;
    $('#trickyPanel').hidden = tricky === 0;
    $('#trickyText').textContent = `${tricky} ${tricky === 1 ? 'uppgift har' : 'uppgifter har'} varit kluriga. Öva på dem så blir de lätta!`;

    $('#freeTitle').textContent = `Fri träning: ${w.name}`;
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
    $('#classCard').hidden = !acc;
    $('#joinCard').hidden = acc || !net.online;
    if (acc) {
      const ci = net.classInfo;
      const fresh = ci ? ci.myCheers - (prefs.seenCheers[net.player.id] || 0) : 0;
      $('#classCardSmall').textContent = net.player.className || '';
      $('#classCardText').textContent = ci && ci.mission ? `Veckans uppdrag: ${ci.mission.progress} av ${ci.mission.goal} ${ci.mission.unit}` : 'Se kompisarna och klassens stjärnburk.';
      $('#cheerBadge').hidden = fresh <= 0;
      $('#cheerBadge').textContent = fresh > 0 ? `👏 ${fresh} nya hejarop` : '';
    }
    $('#nameField').hidden = acc;
    $('#resetBtn').hidden = acc;
    $('#logoutBtn').hidden = !acc;
    $('#whoLine').hidden = !acc;
    if (acc) $('#whoLine').textContent = `${net.player.avatar} ${net.player.name} i ${net.player.className || 'klassen'}`;

    $('#soundBtn').setAttribute('aria-pressed', String(prefs.sound));
    $('#soundBtn').textContent = prefs.sound ? '🔊' : '🔇';
    $('#voiceBtn').setAttribute('aria-pressed', String(prefs.voice));
  }

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
  function startFindLevel(w, n) {
    const Wd = WORLDS[w];
    startFind({ kind: 'train', world: w, level: `${Wd.prefix}${n}`, mode: 'find', label: Wd.level(n), qs: allQs(w, n), beads: true, retry: true });
  }
  function startMix(i) {
    const w = W(), m = w.mixes[i];
    startFind({ kind: 'mix', world: w.id, level: m.key, mixIndex: i, mode: 'find', label: m.label, qs: randQs(w.id, 12, m.lo, m.hi), beads: true, retry: true });
  }
  function startTricky() {
    const qs = questionsTricky();
    if (!qs.length) return goHome();
    startFind({ kind: 'tricky', world: 'plus', level: 'tricky', mode: 'find', label: 'Kluriga kamrater', qs, beads: true, retry: true });
  }
  function startTest(s) {
    startFind({ kind: s.kind, world: s.world, level: s.id, mode: 'test', label: s.name, qs: randQs(s.world, s.count, s.lo, s.hi), beads: false, retry: false, station: s });
  }

  function startFind(cfg) {
    stopGame();
    G = { ...cfg, game: 'find', idx: 0, mistakes: 0, score: 0, streak: 0, bestStreak: 0, firstTry: 0, missed: [], marks: [] };
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
    $('#beads').hidden = !G.beads;
    if (G.beads) renderBeads(q, false, false);
    $('#findExplain').textContent = G.beads ? '' : `Fråga ${G.idx + 1} av ${G.qs.length}`;
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
      if (G.beads) renderBeads(q, true, false);
      if (G.tries === 0) { G.firstTry++; G.score++; G.marks[G.idx] = true; markTricky(q, false); }
      else G.marks[G.idx] = false;
      G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
      setStreak($('#findStreak'), G.streak);
      $('#findExplain').innerHTML = explainRight(q);
      celebrate(btn, G.streak);
      G.idx++;
      renderProgress($('#findProgress'), G.idx, G.qs.length, -1, G.marks);
      timer = setTimeout(() => (G.idx >= G.qs.length ? finishFind() : nextFind()), STREAKS[G.streak] ? 1900 : 1400);
      return;
    }
    btn.classList.add('wrong'); btn.disabled = true;
    G.mistakes++; G.streak = 0;
    if (G.tries === 0) { markTricky(q, true); G.missed.push(q); }
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
  function startBubbles(n) {
    stopGame();
    // Alla par som blir n, t.ex. 8: 0+8, 1+7, 2+6, 3+5, 4+4
    const pairs = shuffle(range(0, pairCount(n) - 1).map(a => [a, n - a]));
    const waveCount = Math.ceil(pairs.length / WAVE);
    const per = Math.ceil(pairs.length / waveCount);
    const waves = [];
    for (let i = 0; i < pairs.length; i += per) waves.push(pairs.slice(i, i + per));
    G = { game: 'bubbles', kind: 'train', world: 'plus', mode: 'bubbles', level: String(n), n, waves, wave: 0, pairs: pairs.length, found: 0, mistakes: 0, streak: 0, bestStreak: 0, firstTry: 0, missStreak: 0, sel: null, busy: false };
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
      markTricky(q, false);
      $('#chScore').textContent = G.score;
      setStreak($('#chStreak'), G.streak);
      $('#chEquation').innerHTML = equationHTML(q, true);
      celebrate(btn, G.streak, true);
      if (G.score === G.station.goal) { cheer('Målet klart!', true); say('Målet klart! Fortsätt!'); }
      timer = setTimeout(nextChallenge, 350);
    } else {
      btn.classList.add('wrong');
      G.mistakes++; G.streak = 0;
      markTricky(q, true);
      setStreak($('#chStreak'), 0);
      sfx.wrong();
      $$('#chAnswers .ans').forEach(x => { if (+x.dataset.v === q.ans) x.classList.add('correct-was'); });
      $('#chEquation').innerHTML = equationHTML(q, true);
      $('#chExplain').textContent = `Rätt svar var ${q.ans}.`;
      timer = setTimeout(nextChallenge, 1100);
    }
  }

  /* ================= Kompisduell ================= */
  const DUEL_MODES = [
    { id: 'p10', label: 'Talkamrater 1–10', w: 'plus', lo: 2, hi: 10 },
    { id: 'p20', label: 'Talkamrater 1–20', w: 'plus', lo: 2, hi: 20 },
    { id: 'tio', label: 'Tiokamrater', w: 'plus', lo: 10, hi: 10 },
    { id: 'm10', label: 'Minus 1–10', w: 'minus', lo: 2, hi: 10 },
    { id: 'dub', label: 'Dubblor', w: 'dubbel', lo: 1, hi: 10 }
  ];
  let duelMode = 'p10', duelTarget = 7;
  function openDuel() {
    stopGame();
    show('duel');
    $('#duelSetup').hidden = false; $('#duelPlay').hidden = true; $('#duelWin').hidden = true;
    if (!$('#duelP1').value) $('#duelP1').value = save.name;
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
    $$('#duelTargets .chip').forEach(b => {
      b.setAttribute('aria-pressed', String(+b.dataset.t === duelTarget));
      b.onclick = () => { duelTarget = +b.dataset.t; $$('#duelTargets .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); sfx.select(); };
    });
  }
  function startDuel() {
    stopGame();
    const m = DUEL_MODES.find(x => x.id === duelMode);
    prefs.flip = $('#duelFlip').checked; savePrefs();
    D = { m, target: duelTarget, busy: true, q: null, last: null,
      p: [{ name: $('#duelP1').value.trim() || 'Spelare 1', score: 0, lock: 0 }, { name: $('#duelP2').value.trim() || 'Spelare 2', score: 0, lock: 0 }] };
    $('#duelSetup').hidden = true; $('#duelWin').hidden = true; $('#duelPlay').hidden = false;
    $('#duelPlay').classList.toggle('flip', prefs.flip);
    [0, 1].forEach(i => {
      const h = $('#half' + i);
      h.classList.remove('won', 'lost', 'locked');
      $('.dname', h).textContent = D.p[i].name;
      $('.dscore', h).textContent = '0';
      $('.dmsg', h).textContent = 'Gör dig redo …';
      $('.deq', h).innerHTML = '';
      $('.dans', h).innerHTML = '';
    });
    $('#duelTarget').textContent = `Först till ${D.target}`;
    sfx.tick();
    timer = setTimeout(nextDuel, 1200);
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
    }
    // Klarade tal-steg sparas också i path, så att lärarsidan ser hela vägen
    WORLD_IDS.forEach(w => stations(w).forEach(s => { if (s.kind === 'number' && s.done) save.path[s.id] = 1; }));
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
      for (let i = 0; i < (daily ? 2 : 1); i++) {
        const owned = new Set(save.stickers);
        const missing = STICKERS.filter(([e]) => !owned.has(e));
        const prize = missing.length ? pick(missing) : pick(STICKERS);
        prizes.push({ e: prize[0], name: prize[1], dup: !missing.length });
        save.stickers.push(prize[0]);
      }
    }
    const bookDone = !save.path.book && STICKERS.every(([e]) => save.stickers.includes(e));
    if (bookDone) save.path.book = 1;

    // Mata husdjuret
    const food = r.stars + 1;
    const grew = feedPet(food);

    persist();
    logRound({ level: g.level, mode: g.mode, stars: r.stars, score: r.score, total: r.total, mistakes: g.mistakes });

    const newTitle = titleFor(save.total);
    if (medalKey) postEvent('medal', medalKey);
    if (newTitle !== oldTitle) postEvent('title', newTitle);
    if (daily && DAILY_MILESTONES.includes(daily)) postEvent('daily', daily);
    if (grew) postEvent('pet', grew);
    if (bookDone) postEvent('book', 'alla');
    if (r.newRecord && r.passed && g.station) postEvent('record', `${g.station.id}:${r.score}`);

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

    const notes = [];
    if (newTitle !== oldTitle) notes.push(`Ny titel! Nu är du <b>${newTitle}</b>`);
    if (medal) notes.push(`Du vann <b>${medal[1]}</b> ${medal[0]}`);
    if (daily) notes.push(`🔥 Dagens utmaning klar! <b>${daily} ${daily === 1 ? 'dag' : 'dagar'} i rad</b>`);
    if (afterDone > beforeDone && next && g.kind !== 'daily') notes.push(`Ett steg till på vägen till expert! Nästa: <b>${esc(next.name)}</b>`);
    if (r.newRecord) notes.push('Nytt rekord!');
    notes.push(grew
      ? `🍓 ${esc(petName())} åt ${food} stjärnfrukter och <b>växte till ${PET_STAGES[grew][1].toLowerCase()}!</b>`
      : `🍓 ${esc(petName())} åt ${food} ${food === 1 ? 'stjärnfrukt' : 'stjärnfrukter'}. Mums!`);
    if (!r.passed && g.missed && g.missed.length) {
      notes.push(`Öva lite extra på: <b>${g.missed.slice(0, 4).map(equationText).join(', ')}</b>`);
    }
    $('#unlock').hidden = !notes.length;
    $('#unlock').innerHTML = notes.join('<br>');

    $('#reward').hidden = !prizes.length && !medal;
    if (medal) { $('#rewardEm').textContent = medal[0]; $('#rewardText').textContent = `${medal[1]}! Och ett klistermärke: ${prizes[0].e} ${prizes[0].name}`; }
    else if (prizes.length === 2) { $('#rewardEm').textContent = prizes[0].e + prizes[1].e; $('#rewardText').textContent = `Två klistermärken: ${prizes[0].name} och ${prizes[1].name}!`; }
    else if (prizes.length) { $('#rewardEm').textContent = prizes[0].e; $('#rewardText').textContent = prizes[0].dup ? `En till ${prizes[0].name.toLowerCase()} till samlingen!` : `Nytt klistermärke: ${prizes[0].name}!`; }
    $('#totalStars').textContent = save.total;

    lastStart = g;
    $('#againBtn').textContent = r.passed ? 'Spela igen' : 'Försök igen';
    const fromRoad = roadContext || !!g.station;
    $('#otherBtn').textContent = fromRoad ? 'Vägen till expert' : 'Till start';
    $('#otherBtn').onclick = () => (fromRoad ? openRoad(wid) : goHome());

    if (r.passed) {
      sfx.fanfare(); rain(); setTimeout(() => rain(80), 700);
      if (grew) setTimeout(() => { cheer(`${petName()} växte!`, true); sfx.streak(); }, 1300);
      else if (medal) setTimeout(() => cheer(medal[1], true), 1200);
      else if (newTitle !== oldTitle) setTimeout(() => cheer(newTitle, true), 1200);
      say(medal ? `Hurra ${save.name}! Du klarade provet och vann ${medal[1]}!`
        : daily ? `Hurra! Dagens utmaning klar, ${daily} ${daily === 1 ? 'dag' : 'dagar'} i rad!`
        : r.stars === 3 ? `Hurra! Tre stjärnor, ${save.name}! Du är grym!`
        : `Bra jobbat ${save.name}! Du fick ${r.stars} ${r.stars === 1 ? 'stjärna' : 'stjärnor'}.`);
    } else {
      sfx.sad();
      say(`Bra försök ${save.name}! Öva lite till, sen klarar du det.`);
    }
  }
  function equationText(q) {
    if (q.w === 'plus') return `${q.a} + ${q.n - q.a} = ${q.n}`;
    if (q.w === 'minus') return `${q.n} ${MINUS} ${q.a} = ${q.n - q.a}`;
    return `${q.n} + ${q.n} = ${2 * q.n}`;
  }

  $('#againBtn').addEventListener('click', () => {
    const g = lastStart; if (!g) return goHome();
    if (g.game === 'bubbles') startBubbles(g.n);
    else if (g.game === 'challenge') startChallenge(stationById(g.station.id));
    else if (g.mode === 'test') startTest(stationById(g.station.id));
    else if (g.kind === 'train') startFindLevel(g.world, +String(g.level).replace(/^[md]/, ''));
    else if (g.kind === 'mix') { prefs.world = g.world; startMix(g.mixIndex || 0); }
    else if (g.kind === 'tricky') startTricky();
    else if (g.kind === 'daily') startDaily();
  });
  $('#bookBtn').addEventListener('click', openBook);

  /* ================= Diplom ================= */
  function showDiploma(wid, celebrateNow) {
    stopGame();
    const w = WORLDS[wid];
    show('diploma');
    $('#dipTitle').textContent = w.expertTitle;
    $('#dipText').textContent = w.diploma;
    $('#dipSeal').textContent = EXPERT_ICON[wid];
    $('#dipName').textContent = save.name;
    $('#dipDate').textContent = new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
    $('#dipPrint').hidden = !net.online;
    $('#dipRoad').onclick = () => openRoad(wid);
    if (celebrateNow) {
      sfx.fanfare(); rain(220); setTimeout(() => rain(160), 900); setTimeout(() => sfx.fanfare(), 1200);
      setTimeout(() => cheer(`${w.expertTitle}!`, true), 600);
      say(`Grattis ${save.name}! Nu är du ${w.expertTitle}!`);
    }
  }
  $('#dipPrint').addEventListener('click', () => { try { window.print(); } catch (e) {} });

  /* ================= Klistermärken ================= */
  function openBook() {
    stopGame();
    const counts = {};
    save.stickers.forEach(e => { counts[e] = (counts[e] || 0) + 1; });
    const got = STICKERS.filter(([e]) => counts[e]).length;
    $('#bookCount').textContent = `${got} av ${STICKERS.length}`;
    $('#medalRow').innerHTML = WORLD_IDS.map(w => Object.entries(WORLDS[w].medals).map(([k, [e, name]]) => (save.path[k]
      ? `<div class="slot"><div><div class="em">${e}</div><small>${name}</small></div></div>`
      : `<div class="slot missing" title="${name}">?</div>`)).join('')).join('');
    const g = $('#bookGrid'); g.innerHTML = '';
    STICKERS.forEach(([e, name]) => {
      g.insertAdjacentHTML('beforeend', counts[e]
        ? `<div class="slot"><div><div class="em">${e}</div><small>${name}</small>${counts[e] > 1 ? ` <span class="x">×${counts[e]}</span>` : ''}</div></div>`
        : `<div class="slot missing" aria-label="Inte hittad än">?</div>`);
    });
    show('book');
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
  function openJoin() {
    stopGame();
    show('join');
    joinCode(ls.get(CLASS_KEY) || '');
  }
  function joinCode(prefill) {
    $('#joinBack').onclick = goHome;
    body().innerHTML = `<div class="formstack">
      <h2>Skriv klasskoden</h2>
      <p class="lead">Koden får du av din lärare, till exempel SOL-4821.</p>
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
        joinWho();
      } catch (e) { $('#joinErr').textContent = e.message; $('#codeGo').disabled = false; }
    };
    $('#codeGo').addEventListener('click', go);
    $('#classCode').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('#classCode').focus();
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
      goHome();
      refreshClassInfo();
      sfx.fanfare(); rain(120);
      cheer(`Välkommen ${res.player.name}!`, true);
      say(`Välkommen ${res.player.name}!`);
    };
    if (!hasProgress(progressOf(guest))) return finishLogin(false);
    $('#joinBack').onclick = () => finishLogin(false);
    body().innerHTML = `<div class="formstack"><h2>Ta med dina stjärnor?</h2>
      <p class="lead">På den här enheten finns ${guest.total} stjärnor och ${guest.stickers.length} klistermärken som inte är sparade i klassen. Är det dina?</p>
      <button class="chunky coral" id="mergeYes">Ja, ta med dem</button>
      <button class="chunky ghost" id="mergeNo">Nej, de är någon annans</button></div>`;
    $('#mergeYes').addEventListener('click', () => finishLogin(true));
    $('#mergeNo').addEventListener('click', () => finishLogin(false));
  }

  /* ================= Knappar ================= */
  $('#brand').addEventListener('click', goHome);
  $$('[data-home]').forEach(b => b.addEventListener('click', goHome));
  $('#openRoad').addEventListener('click', () => openRoad());
  $('#pickFind').addEventListener('click', () => startFindLevel('plus', chosenN));
  $('#pickBubbles').addEventListener('click', () => startBubbles(chosenN));
  $('#mixA').addEventListener('click', () => { roadContext = false; startMix(0); });
  $('#mixB').addEventListener('click', () => { roadContext = false; startMix(1); });
  $('#trickyBtn').addEventListener('click', () => { roadContext = false; startTricky(); });
  $('#dailyBtn').addEventListener('click', () => { roadContext = false; startDaily(); });
  $('#openBook').addEventListener('click', openBook);
  $('#openDuel').addEventListener('click', openDuel);
  $('#duelGo').addEventListener('click', startDuel);
  $('#duelAgain').addEventListener('click', startDuel);
  $('#duelSetupBtn').addEventListener('click', openDuel);
  $('#duelQuit').addEventListener('click', goHome);
  $('#openClass').addEventListener('click', openClass);
  $('#openJoin').addEventListener('click', openJoin);
  $('#logoutBtn').addEventListener('click', () => logout(false));
  $('#nameInput').addEventListener('input', e => {
    save.name = e.target.value.trim() || 'Edwin';
    $('#hello').textContent = `Hej ${save.name}!`;
    persist();
  });
  $('#soundBtn').addEventListener('click', () => { prefs.sound = !prefs.sound; savePrefs(); renderStart(); if (prefs.sound) sfx.select(); });
  $('#voiceBtn').addEventListener('click', () => { prefs.voice = !prefs.voice; savePrefs(); renderStart(); if (prefs.voice) say('Hej!'); else try { speechSynthesis.cancel(); } catch (e) {} });
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
  try { speechSynthesis && speechSynthesis.getVoices(); } catch (e) {}

  boot();
})();
