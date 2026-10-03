(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= Innehåll ================= */
  const STICKERS = [
    ['🦖','T-rex'],['🦄','Enhörning'],['🐙','Bläckfisk'],['🦊','Räv'],['🐼','Panda'],['🚀','Raket'],
    ['🌈','Regnbåge'],['🦁','Lejon'],['🐸','Groda'],['🐳','Val'],['🦋','Fjäril'],['🍕','Pizza'],
    ['⚽','Fotboll'],['🎸','Gitarr'],['🐉','Drake'],['🦕','Långhals'],['🐯','Tiger'],['🐨','Koala'],
    ['🦉','Uggla'],['🍩','Munk'],['🛸','UFO'],['🐬','Delfin'],['🦈','Haj'],['🐢','Sköldpadda'],
    ['🦒','Giraff'],['🐧','Pingvin'],['🤖','Robot'],['👑','Krona'],['🌋','Vulkan'],['🏆','Pokal']
  ];
  const MEDALS = [
    ['t-z1', '🏅', 'Kompisbyns medalj'], ['t-z2', '🌳', 'Skogsmedaljen'], ['t-z3', '🐠', 'Sjömedaljen'],
    ['t-z4', '⛰️', 'Toppmedaljen'], ['expert', '🎓', 'Expertmössan']
  ];
  const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐯', '🐨', '🐵', '🐰', '🐶', '🐱', '🦄', '🐲'];
  const PIN_PICS = ['🐶', '🐱', '🐸', '🦊', '🐼', '🦁', '🍎', '🍕', '🚗', '🚀', '⚽', '🌈'];
  const TITLES = [[0,'Talspanare'],[10,'Talkompis'],[25,'Plusproffs'],[50,'Mattehjälte'],[100,'Talkamratmästare'],[200,'Mattelegend']];
  const titleFor = t => TITLES.filter(([min]) => t >= min).pop()[1];

  // Bara svenska hejarop, så att talsyntesen läser dem rätt
  const CHEERS = ['Hurra!','Jippi!','Toppen!','Snyggt!','Klockrent!','Kanon!','Jättebra!','Grymt!','Superbra!','Mattemagi!','Helt rätt!','Strålande!','Bingo!','Fantastiskt!','Häftigt!','Ja, ja, ja!','Briljant!','Pang på!'];
  const nameCheers = () => [`Bra jobbat ${save.name}!`, `Heja ${save.name}!`, `${save.name}, du är en mattestjärna!`, `Så ska det se ut, ${save.name}!`];
  const OOPS = ['Nästan! Försök igen.', 'Oj, inte riktigt. Du klarar det!', 'Prova en gång till!', 'Hmm, räkna en gång till.'];
  const STREAKS = { 3: '3 i rad!', 5: '5 i rad! Hurra!', 7: '7 i rad! Ostoppbar!', 10: '10 i rad! Legendariskt!', 15: '15 i rad! Mästare!', 20: '20 i rad! Otroligt!' };

  // Vägen till expert: fyra områden med tal, prov och utmaningar, sist Expertprovet.
  const ZONES = [
    { id: 'z1', name: 'Kompisbyn', from: 1, to: 5, test: { count: 10, pass: 8 } },
    { id: 'z2', name: 'Tiokamratskogen', from: 6, to: 10, test: { count: 12, pass: 10 },
      challenge: { id: 'c10', name: 'Tiokamrater på tid', lo: 10, hi: 10, secs: 60, goal: 12 } },
    { id: 'z3', name: 'Bubbelsjön', from: 11, to: 15, test: { count: 12, pass: 10 } },
    { id: 'z4', name: 'Tjugotoppen', from: 16, to: 20, test: { count: 12, pass: 10 },
      challenge: { id: 'c20', name: 'Blixtrundan 1–20', lo: 1, hi: 20, secs: 60, goal: 10 } }
  ];

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
  const FIELDS = ['best', 'total', 'rounds', 'stickers', 'path', 'records', 'tricky'];
  const freshProgress = () => ({ best: {}, total: 0, rounds: 0, stickers: [], path: {}, records: {}, tricky: {} });
  const progressOf = s => Object.fromEntries(FIELDS.map(k => [k, s[k]]));
  const hasProgress = p => p && (p.total > 0 || (p.stickers || []).length > 0);

  function loadGuest() {
    const g = ls.get(GUEST_KEY) || {};
    return Object.assign({ name: 'Edwin' }, freshProgress(), g);
  }
  const oldGuest = ls.get(GUEST_KEY) || {};
  const prefs = Object.assign({ sound: oldGuest.sound ?? true, voice: oldGuest.voice ?? true }, ls.get(PREFS_KEY) || {});
  const savePrefs = () => ls.set(PREFS_KEY, prefs);

  let save = loadGuest();

  /* ================= Server och synk ================= */
  const net = { online: false, token: null, player: null, timer: 0, inflight: false };

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
        Object.assign(save, res.progress);
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

  function logRound(r) {
    if (!net.player) return;
    api('POST', 'me/rounds', r).catch(() => {});
  }

  function useAccount(token, player, progress, dirty = false) {
    net.token = token; net.player = player;
    save = Object.assign({ name: player.name }, freshProgress(), progress);
    ls.set(ACCOUNT_KEY, { token, player, progress: progressOf(save), dirty });
    if (dirty) sync();
  }

  async function logout(expired) {
    if (net.token && !expired) { try { await api('POST', 'logout'); } catch (e) {} }
    ls.del(ACCOUNT_KEY);
    net.token = null; net.player = null;
    save = loadGuest();
    goHome();
    if (expired) talkLater('Du behöver logga in igen.');
  }

  async function boot() {
    const cached = ls.get(ACCOUNT_KEY);
    if (cached && cached.token && cached.player) {
      // Visa direkt från cachen, synka sedan
      net.token = cached.token; net.player = cached.player;
      save = Object.assign({ name: cached.player.name }, freshProgress(), cached.progress || {});
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
      const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s!?,.+=-]/gu, ''));
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
  let G = null, timer = 0, ticker = 0;
  function show(id) {
    current = id;
    $$('.screen').forEach(s => { s.hidden = s.id !== id; });
    window.scrollTo({ top: 0 });
  }
  function talk(text, mood) {
    const scr = $('#' + current);
    const sp = $('.speech', scr), m = $('.mascot', scr);
    if (sp) sp.textContent = text;
    if (m && mood) { m.classList.remove('happy', 'oops'); void m.offsetWidth; m.classList.add(mood); }
  }
  let pendingTalk = '';
  const talkLater = text => { pendingTalk = text; };
  function stopGame() {
    try { speechSynthesis.cancel(); } catch (e) {}
    clearTimeout(timer); clearInterval(ticker);
    G = null;
  }
  function goHome() { stopGame(); renderStart(); show('start'); }

  const starStr = n => [0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}">★</span>`).join('');
  const bestOf = n => Math.max(save.best[n + ':find'] || 0, save.best[n + ':bubbles'] || 0);
  const mascotHTML = '<div class="mascot happy" aria-hidden="true"><div class="eyes"><i></i><i></i></div><div class="mouth"></div></div>';
  const myFace = () => (net.player ? net.player.avatar : '🙂');

  /* ================= Vägen till expert ================= */
  function stations() {
    const list = [];
    for (const z of ZONES) {
      for (let n = z.from; n <= z.to; n++) {
        list.push({ kind: 'number', id: 'n' + n, n, zone: z, name: `Talet ${n}`, done: (save.best[n + ':find'] || 0) >= 2 });
      }
      list.push({ kind: 'test', id: 't-' + z.id, zone: z, name: `Prov: ${z.name}`, lo: z.from, hi: z.to, count: z.test.count, pass: z.test.pass, done: (save.path['t-' + z.id] || 0) > 0 });
      if (z.challenge) list.push({ kind: 'challenge', zone: z, ...z.challenge, done: (save.path[z.challenge.id] || 0) > 0 });
    }
    list.push({ kind: 'final', id: 'expert', name: 'Expertprovet', lo: 1, hi: 20, count: 20, pass: 18, done: (save.path.expert || 0) > 0 });
    let open = true;
    list.forEach(s => { s.open = open; if (!s.done) open = false; });
    return list;
  }
  const doneCount = () => stations().filter(s => s.done).length;

  function stationDetail(s) {
    if (s.kind === 'number') return s.done ? starStr(save.best[s.n + ':find']) : 'Hitta kamraten med minst ★★';
    if (s.kind === 'test') return s.done ? `Klarat! ${save.path[s.id]} av ${s.count} rätt` : `${s.count} frågor · ${s.pass} rätt behövs`;
    if (s.kind === 'challenge') return s.done ? `Klarat! Rekord ${save.records[s.id] || 0}` : `${s.secs} sekunder · mål ${s.goal} rätt`;
    return s.done ? 'Du är expert!' : `${s.count} frågor · ${s.pass} rätt behövs`;
  }
  const nodeIcon = s => (s.kind === 'number' ? (s.done ? s.n : s.open ? s.n : '🔒')
    : s.kind === 'test' ? (s.done ? '✓' : s.open ? '📝' : '🔒')
    : s.kind === 'challenge' ? (s.done ? '✓' : s.open ? '⏱️' : '🔒')
    : (s.done ? '🎓' : s.open ? '🏆' : '🔒'));

  function renderRoad() {
    const all = stations();
    const wrap = $('#zones'); wrap.innerHTML = '';
    const zigzag = [0, 14, 28, 14];
    for (const z of ZONES) {
      const medal = MEDALS.find(m => m[0] === 't-' + z.id);
      const zoneStops = all.filter(s => s.zone === z);
      const el = document.createElement('div');
      el.className = 'panel zone';
      el.innerHTML = `<svg class="road" aria-hidden="true"><path class="bed"/><path class="dash"/></svg>
        <div class="zone-head"><h3>${z.name}<small>Talen ${z.from}–${z.to}</small></h3><span class="medal ${save.path['t-' + z.id] ? 'on' : ''}" title="${medal[2]}">${medal[1]}</span></div>
        <div class="stops"></div>`;
      const stops = $('.stops', el);
      zoneStops.forEach((s, i) => stops.appendChild(stopButton(s, zigzag[i % 4])));
      wrap.appendChild(el);
    }
    const fin = all[all.length - 1];
    const finEl = document.createElement('div');
    finEl.className = 'panel zone';
    finEl.innerHTML = `<div class="zone-head"><h3>Expertprovet<small>Alla talen 1–20</small></h3><span class="medal ${fin.done ? 'on' : ''}">🎓</span></div><div class="stops"></div>`;
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
    if (s.kind === 'number') return openMode(s.n);
    showIntro(s);
  }

  function showIntro(s) {
    show('intro');
    const list = $('#introList');
    if (s.kind === 'challenge') {
      $('#introTitle').textContent = s.name;
      list.innerHTML = `<li>⏱️ ${s.secs} sekunder</li><li>🎯 Mål: ${s.goal} rätt</li><li>${s.lo === s.hi ? `Bara kamrater till ${s.lo}` : `Blandade tal ${s.lo}–${s.hi}`}</li>`;
      talk(save.records[s.id] ? `Ditt rekord är ${save.records[s.id]}. Kan du slå det?` : 'Svara så snabbt du kan. Fel gör inget, fortsätt bara!');
    } else {
      $('#introTitle').textContent = s.kind === 'final' ? 'Expertprovet' : s.name;
      list.innerHTML = `<li>📝 ${s.count} frågor med talen ${s.lo}–${s.hi}</li><li>🎯 ${s.pass} rätt behövs för att klara</li><li>🙈 Inga pärlor nu, du har dem i huvudet!</li>`;
      talk(s.kind === 'final' ? `Det här är det stora provet, ${save.name}. Klarar du det blir du Talkamratexpert!` : 'Ett svar per fråga. Ta det lugnt och tänk efter.');
    }
    $('#introGo').onclick = () => (s.kind === 'challenge' ? startChallenge(s) : startTest(s));
    $('#introBack').onclick = () => openRoad();
  }

  function openRoad() {
    stopGame();
    renderRoad();
    show('road');
    const cur = $('#zones .stop.open');
    if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }), 60);
  }

  /* ================= Startsidan ================= */
  function renderStart() {
    $('#hello').textContent = `Hej ${save.name}!`;
    $('#heroFace').innerHTML = net.player ? `<div class="avatar-big" aria-hidden="true">${net.player.avatar}</div>` : mascotHTML;
    $('#nameInput').value = save.name;
    $('#rankName').textContent = titleFor(save.total);
    $('#totalStars').textContent = save.total;
    $('#stickerCount').textContent = `${new Set(save.stickers.filter(e => STICKERS.some(s => s[0] === e))).size} av ${STICKERS.length}`;

    const all = stations(), done = all.filter(s => s.done).length;
    const next = all.find(s => !s.done);
    $('#roadCount').textContent = `Steg ${done} av ${all.length}`;
    $('#roadMeter').style.width = (100 * done / all.length) + '%';
    $('#roadNext').innerHTML = next ? `Nästa: <span>${esc(next.name)}</span>` : '<span>Du är Talkamratexpert!</span>';
    $('#openRoad').textContent = done === 0 ? 'Börja resan' : next ? 'Fortsätt resan' : 'Titta på vägen';

    const tricky = Object.values(save.tricky).filter(v => v > 0).length;
    $('#trickyPanel').hidden = tricky === 0;
    $('#trickyText').textContent = `${tricky} ${tricky === 1 ? 'talkamrat har' : 'talkamrater har'} varit kluriga. Öva på dem så blir de lätta!`;

    const g = $('#numgrid'); g.innerHTML = '';
    for (let n = 1; n <= 20; n++) {
      const b = document.createElement('button');
      b.className = 'num' + (n > 10 ? ' big' : '');
      b.innerHTML = `${n}<span class="s" aria-hidden="true">${starStr(bestOf(n))}</span>`;
      b.setAttribute('aria-label', `Talet ${n}, ${bestOf(n)} stjärnor`);
      b.addEventListener('click', () => { roadContext = false; openMode(n); });
      g.appendChild(b);
    }

    const acc = !!net.player;
    $('#classCard').hidden = !acc;
    $('#joinCard').hidden = acc || !net.online;
    if (acc) $('#classCardSmall').textContent = net.player.className || '';
    $('#nameField').hidden = acc;
    $('#resetBtn').hidden = acc;
    $('#logoutBtn').hidden = !acc;
    $('#whoLine').hidden = !acc;
    if (acc) $('#whoLine').textContent = `${net.player.avatar} ${net.player.name} i ${net.player.className || 'klassen'}`;

    $('#soundBtn').setAttribute('aria-pressed', String(prefs.sound));
    $('#soundBtn').textContent = prefs.sound ? '🔊' : '🔇';
    $('#voiceBtn').setAttribute('aria-pressed', String(prefs.voice));
  }

  /* ================= Välj spelsätt ================= */
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

  /* ================= Frågor ================= */
  function trickyKey(n, a) { return `${n}:${Math.min(a, n - a)}`; }
  function markTricky(n, a, wrong) {
    const k = trickyKey(n, a);
    if (wrong) save.tricky[k] = Math.min(9, (save.tricky[k] || 0) + 2);
    else if (save.tricky[k]) { save.tricky[k]--; if (!save.tricky[k]) delete save.tricky[k]; }
  }

  function questionsAll(n) {
    const qs = shuffle([...Array(n + 1).keys()]).map(a => ({ n, a }));
    return qs;
  }
  function questionsRandom(count, lo, hi) {
    const qs = [], seen = new Set();
    let guard = 0;
    while (qs.length < count && guard++ < 1000) {
      const n = rnd(Math.max(1, lo), hi);
      const a = n >= 2 && Math.random() < 0.85 ? rnd(1, n - 1) : rnd(0, n);
      const key = n + ':' + a;
      if (seen.has(key) && guard < 500) continue;
      if (qs.length && qs[qs.length - 1].n === n && lo !== hi && guard < 500) continue;
      seen.add(key); qs.push({ n, a });
    }
    return qs;
  }
  function questionsTricky() {
    const keys = Object.entries(save.tricky).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k]) => k.split(':').map(Number));
    const qs = [];
    keys.forEach(([n, a]) => qs.push(Math.random() < 0.5 ? { n, a } : { n, a: n - a }));
    let i = 0;
    while (qs.length < 6 && keys.length) { const [n, a] = keys[i++ % keys.length]; qs.push({ n, a: qs.length % 2 ? a : n - a }); }
    return shuffle(qs);
  }

  /* ================= Spel: Hitta kamraten / prov ================= */
  // cfg: { kind: 'train'|'mix'|'tricky'|'test'|'final', level, label, qs, beads, retry, station? }
  function startFindNumber(n) {
    startFind({ kind: 'train', level: String(n), mode: 'find', label: `Talet ${n}`, qs: questionsAll(n), beads: true, retry: true });
  }
  function startMix(max) {
    startFind({ kind: 'mix', level: 'mix' + max, mode: 'find', label: `Blandat 1–${max}`, qs: questionsRandom(12, 2, max), beads: true, retry: true });
  }
  function startTricky() {
    const qs = questionsTricky();
    if (!qs.length) return goHome();
    startFind({ kind: 'tricky', level: 'tricky', mode: 'find', label: 'Kluriga kamrater', qs, beads: true, retry: true });
  }
  function startTest(s) {
    startFind({ kind: s.kind, level: s.id, mode: 'test', label: s.name, qs: questionsRandom(s.count, s.lo, s.hi), beads: false, retry: false, station: s });
  }

  function startFind(cfg) {
    stopGame();
    G = { ...cfg, game: 'find', idx: 0, mistakes: 0, score: 0, streak: 0, bestStreak: 0, firstTry: 0, missed: [] };
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

  function renderBeads(n, a, order, filled, hint) {
    const known = Array(a).fill('ka');
    const miss = Array(n - a).fill(filled ? 'kb' : 'empty');
    const kinds = order === 'ab' ? [...known, ...miss] : [...miss, ...known];
    const wrap = $('#beads'); wrap.innerHTML = '';
    let missCount = 0;
    for (let r = 0; r < Math.ceil(n / 10); r++) {
      const row = document.createElement('div'); row.className = 'beadrow';
      for (let f = 0; f < 2; f++) {
        const five = document.createElement('div'); five.className = 'five';
        for (let k = 0; k < 5; k++) {
          const i = r * 10 + f * 5 + k; if (i >= n) break;
          const b = document.createElement('span');
          b.className = 'bead ' + kinds[i];
          if (kinds[i] === 'kb') b.style.animationDelay = (missCount * 0.06) + 's';
          if (kinds[i] !== 'ka') { missCount++; if (hint && !filled) { b.classList.add('hint'); b.textContent = missCount; } }
          five.appendChild(b);
        }
        if (five.childElementCount) row.appendChild(five);
      }
      wrap.appendChild(row);
    }
  }

  function equationHTML(q, filled) {
    const gap = `<span class="gap${filled ? ' filled' : ''}">${filled ? q.n - q.a : '?'}</span>`;
    const A = `<span class="a">${q.a}</span>`, N = `<span class="total">${q.n}</span>`;
    return [
      `${A}<span class="op">+</span>${gap}<span class="op">=</span>${N}`,
      `${gap}<span class="op">+</span>${A}<span class="op">=</span>${N}`,
      `${N}<span class="op">=</span>${A}<span class="op">+</span>${gap}`
    ][q.form];
  }

  function choicesFor(b, n) {
    const want = Math.min(4, n + 1);
    const set = new Set([b]);
    const near = shuffle([b - 1, b + 1, b - 2, b + 2, b + 3, b - 3]);
    for (const c of near) { if (set.size >= want) break; if (c >= 0 && c <= n) set.add(c); }
    while (set.size < want) set.add(rnd(0, n));
    return shuffle([...set]);
  }

  function renderAnswers(container, q, onPick) {
    container.innerHTML = '';
    const opts = choicesFor(q.n - q.a, q.n);
    container.classList.toggle('two', opts.length <= 2);
    opts.forEach(v => {
      const b = document.createElement('button');
      b.className = 'ans'; b.textContent = v; b.dataset.v = v;
      b.addEventListener('click', () => onPick(b, v));
      container.appendChild(b);
    });
  }

  function nextFind() {
    const q = G.qs[G.idx];
    q.form = rnd(0, 2);
    G.cur = q; G.tries = 0; G.locked = false;
    renderProgress($('#findProgress'), G.idx, G.qs.length, G.idx, G.marks);
    $('#equation').innerHTML = equationHTML(q, false);
    $('#beads').hidden = !G.beads;
    if (G.beads) renderBeads(q.n, q.a, q.form === 1 ? 'ba' : 'ab', false, false);
    $('#findExplain').textContent = G.beads ? '' : `Fråga ${G.idx + 1} av ${G.qs.length}`;
    renderAnswers($('#answers'), q, answerFind);
    if (G.idx === 0) {
      talk(G.retry ? `Vem är kompis med ${q.a} så att de blir ${q.n} tillsammans?` : 'Lycka till! Tänk efter, ett svar per fråga.');
    } else if (G.retry) {
      talk(pick([`Vilket tal fattas?`, `Hur många ringar är tomma?`, `${q.a} och vem blir ${q.n}?`, `Nästa! Hitta kompisen till ${q.a}.`]));
    }
  }

  function answerFind(btn, v) {
    if (G.locked || btn.disabled) return;
    const q = G.cur, b = q.n - q.a;
    const order = q.form === 1 ? 'ba' : 'ab';
    G.marks = G.marks || [];
    if (v === b) {
      G.locked = true;
      btn.classList.add('right');
      $$('#answers .ans').forEach(x => { x.disabled = true; });
      $('#equation').innerHTML = equationHTML(q, true);
      if (G.beads) renderBeads(q.n, q.a, order, true, false);
      if (G.tries === 0) { G.firstTry++; G.score++; G.marks[G.idx] = true; markTricky(q.n, q.a, false); }
      else G.marks[G.idx] = false;
      G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
      setStreak($('#findStreak'), G.streak);
      $('#findExplain').innerHTML = `<span class="a">${q.a}</span> och <span class="b">${b}</span> är talkamrater till ${q.n}!`;
      celebrate(btn, G.streak);
      G.idx++;
      renderProgress($('#findProgress'), G.idx, G.qs.length, -1, G.marks);
      timer = setTimeout(() => (G.idx >= G.qs.length ? finishFind() : nextFind()), STREAKS[G.streak] ? 1900 : 1400);
      return;
    }
    // Fel svar
    btn.classList.add('wrong'); btn.disabled = true;
    G.mistakes++; G.streak = 0;
    if (G.tries === 0) { markTricky(q.n, q.a, true); G.missed.push(q); }
    G.tries++;
    setStreak($('#findStreak'), 0);
    sfx.wrong();
    const sum = q.a + v;
    if (!G.retry) {
      // Prov: visa rätt svar och gå vidare
      G.locked = true;
      G.marks[G.idx] = false;
      $$('#answers .ans').forEach(x => { x.disabled = true; if (+x.dataset.v === b) x.classList.add('correct-was'); });
      $('#equation').innerHTML = equationHTML(q, true);
      $('#findExplain').innerHTML = `Rätt svar var ${b}: <span class="a">${q.a}</span> + <span class="b">${b}</span> = ${q.n}`;
      talk(pick(['Ingen fara, nästa!', 'Den tar vi nästa gång!', 'Kämpa på!']), 'oops');
      G.idx++;
      timer = setTimeout(() => (G.idx >= G.qs.length ? finishFind() : nextFind()), 2300);
      return;
    }
    $('#findExplain').textContent = `${q.a} + ${v} = ${sum}. Det ska bli ${q.n}, så ${sum < q.n ? 'det behövs fler' : 'det blev för många'}.`;
    if (G.tries >= 2 && G.beads) {
      renderBeads(q.n, q.a, order, false, true);
      talk('Räkna de tomma ringarna, jag har numrerat dem åt dig!', 'oops');
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
  const BUB_COLORS = ['var(--blue)', 'var(--coral)', 'var(--leaf)', 'var(--berry)', '#7A5CFF', '#14A3B8'];
  const WAVE = 6;
  function startBubbles(n) {
    stopGame();
    // Alla par som blir n, t.ex. 8: 0+8, 1+7, 2+6, 3+5, 4+4
    const pairs = shuffle([...Array(pairCount(n)).keys()].map(a => [a, n - a]));
    const waveCount = Math.ceil(pairs.length / WAVE);
    const per = Math.ceil(pairs.length / waveCount);
    const waves = [];
    for (let i = 0; i < pairs.length; i += per) waves.push(pairs.slice(i, i + per));
    G = { game: 'bubbles', kind: 'train', mode: 'bubbles', level: String(n), n, waves, wave: 0, pairs: pairs.length, found: 0, mistakes: 0, streak: 0, bestStreak: 0, firstTry: 0, missStreak: 0, sel: null, busy: false };
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
      markTricky(G.n, x, true);
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
    G = { game: 'challenge', kind: 'challenge', mode: 'challenge', level: s.id, station: s, score: 0, mistakes: 0, streak: 0, bestStreak: 0, locked: true, last: null };
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
      const record = Math.max(save.records[s.id] || 0, G.score);
      const newRecord = G.score > (save.records[s.id] || 0) && G.score > 0;
      save.records[s.id] = record;
      const stars = !passed ? 0 : G.score >= s.goal + 6 ? 3 : G.score >= s.goal + 3 ? 2 : 1;
      cheer('Tiden är slut!');
      timer = setTimeout(() => finish({ passed, stars, score: G.score, total: G.score + G.mistakes, newRecord,
        stats: `${G.score} rätt på ${s.secs} sekunder · mål ${s.goal}${newRecord ? ' · nytt rekord!' : ` · rekord ${record}`}` }), 1200);
    }
  }
  function nextChallenge() {
    const s = G.station;
    let q;
    do { q = questionsRandom(1, s.lo, s.hi)[0]; } while (G.last && q.n === G.last.n && q.a === G.last.a);
    q.form = rnd(0, 2);
    G.cur = q; G.last = q; G.locked = false;
    $('#chEquation').innerHTML = equationHTML(q, false);
    $('#chExplain').textContent = '';
    renderAnswers($('#chAnswers'), q, answerChallenge);
  }
  function answerChallenge(btn, v) {
    if (!G || G.locked) return;
    const q = G.cur, b = q.n - q.a;
    G.locked = true;
    if (v === b) {
      btn.classList.add('right');
      G.score++; G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
      markTricky(q.n, q.a, false);
      $('#chScore').textContent = G.score;
      setStreak($('#chStreak'), G.streak);
      $('#chEquation').innerHTML = equationHTML(q, true);
      celebrate(btn, G.streak, true);
      if (G.score === G.station.goal) { cheer('Målet klart!', true); say('Målet klart! Fortsätt!'); }
      timer = setTimeout(nextChallenge, 350);
    } else {
      btn.classList.add('wrong');
      G.mistakes++; G.streak = 0;
      markTricky(q.n, q.a, true);
      setStreak($('#chStreak'), 0);
      sfx.wrong();
      $$('#chAnswers .ans').forEach(x => { if (+x.dataset.v === b) x.classList.add('correct-was'); });
      $('#chEquation').innerHTML = equationHTML(q, true);
      $('#chExplain').textContent = `${q.a} + ${b} = ${q.n}`;
      timer = setTimeout(nextChallenge, 1100);
    }
  }

  /* ================= Rundan klar ================= */
  let lastStart = null;
  function finish(r) {
    clearInterval(ticker);
    const g = G;
    const beforeDone = doneCount();
    const oldTitle = titleFor(save.total);
    const scoreKey = g.kind === 'train' || g.kind === 'mix' ? `${g.level}:${g.mode}` : null;
    if (scoreKey) save.best[scoreKey] = Math.max(save.best[scoreKey] || 0, r.stars);
    let medal = null;
    if (g.station && r.passed) {
      const key = g.station.id;
      if (!save.path[key]) medal = MEDALS.find(m => m[0] === key) || null;
      save.path[key] = Math.max(save.path[key] || 0, r.score || 1);
    }
    // Klarade tal-steg sparas också i path, så att lärarsidan ser hela vägen
    stations().forEach(s => { if (s.kind === 'number' && s.done) save.path[s.id] = 1; });
    save.total += r.stars;
    save.rounds++;
    let prize = null, dup = false;
    if (r.passed) {
      const owned = new Set(save.stickers);
      const missing = STICKERS.filter(([e]) => !owned.has(e));
      prize = missing.length ? pick(missing) : pick(STICKERS);
      dup = !missing.length;
      save.stickers.push(prize[0]);
    }
    persist();
    logRound({ level: g.level, mode: g.mode, stars: r.stars, score: r.score, total: r.total, mistakes: g.mistakes });

    const afterDone = doneCount();
    const all = stations();
    const next = all.find(s => !s.done);

    if (g.kind === 'final' && r.passed) return showDiploma(true);

    show('done');
    const titles = r.passed
      ? { 3: ['Hurra!', 'Jippi!', 'Superstjärna!', 'Fantastiskt!'], 2: ['Snyggt jobbat!', 'Bra kämpat!', 'Toppen!'], 1: ['Du klarade det!', 'Heja dig!'], 0: ['Klarat!'] }[r.stars]
      : ['Nästan!', 'Bra försök!'];
    $('#doneTitle').textContent = medal ? 'Godkänt!' : pick(titles);
    $('#bigStars').hidden = !r.passed;
    $$('#bigStars span').forEach((s, i) => { s.className = i < r.stars ? 'on' : ''; s.style.animationDelay = (0.25 + i * 0.25) + 's'; });
    $('#doneStats').textContent = r.stats;

    const un = $('#unlock');
    const notes = [];
    const newTitle = titleFor(save.total);
    if (newTitle !== oldTitle) notes.push(`Ny titel! Nu är du <b>${newTitle}</b>`);
    if (medal) notes.push(`Du vann <b>${medal[2]}</b> ${medal[1]}`);
    if (afterDone > beforeDone && next) notes.push(`Ett steg till på vägen till expert! Nästa: <b>${esc(next.name)}</b>`);
    if (r.newRecord) notes.push('Nytt rekord!');
    if (!r.passed && g.missed && g.missed.length) {
      notes.push(`Öva lite extra på: <b>${g.missed.slice(0, 4).map(q => `${q.a} + ${q.n - q.a} = ${q.n}`).join(', ')}</b>`);
    }
    un.hidden = !notes.length;
    un.innerHTML = notes.join('<br>');

    const reward = $('#reward');
    reward.hidden = !prize && !medal;
    if (medal) { $('#rewardEm').textContent = medal[1]; $('#rewardText').textContent = `${medal[2]}! Och ett klistermärke: ${prize[0]} ${prize[1]}`; }
    else if (prize) { $('#rewardEm').textContent = prize[0]; $('#rewardText').textContent = dup ? `En till ${prize[1].toLowerCase()} till samlingen!` : `Nytt klistermärke: ${prize[1]}!`; }
    $('#totalStars').textContent = save.total;

    lastStart = g;
    $('#againBtn').textContent = r.passed ? 'Spela igen' : 'Försök igen';
    const fromRoad = roadContext || !!g.station;
    $('#otherBtn').textContent = fromRoad ? 'Vägen till expert' : 'Välj nytt tal';
    $('#otherBtn').onclick = () => (fromRoad ? openRoad() : goHome());

    if (r.passed) {
      sfx.fanfare(); rain(); setTimeout(() => rain(80), 700);
      if (medal) setTimeout(() => cheer(medal[2], true), 1200);
      else if (newTitle !== oldTitle) setTimeout(() => cheer(newTitle, true), 1200);
      say(medal ? `Hurra ${save.name}! Du klarade provet och vann ${medal[2]}!`
        : r.stars === 3 ? `Hurra! Tre stjärnor, ${save.name}! Du är grym!`
        : `Bra jobbat ${save.name}! Du fick ${r.stars} ${r.stars === 1 ? 'stjärna' : 'stjärnor'}.`);
    } else {
      sfx.sad();
      say(`Bra försök ${save.name}! Öva lite till, sen klarar du det.`);
    }
  }

  $('#againBtn').addEventListener('click', () => {
    const g = lastStart; if (!g) return goHome();
    if (g.game === 'bubbles') startBubbles(g.n);
    else if (g.game === 'challenge') startChallenge(stations().find(s => s.id === g.station.id));
    else if (g.mode === 'test') startTest(stations().find(s => s.id === g.station.id));
    else if (g.kind === 'train') startFindNumber(+g.level);
    else if (g.kind === 'mix') startMix(g.level === 'mix10' ? 10 : 20);
    else if (g.kind === 'tricky') startTricky();
  });
  $('#bookBtn').addEventListener('click', openBook);

  /* ================= Diplom ================= */
  function showDiploma(celebrateNow) {
    stopGame();
    show('diploma');
    $('#dipName').textContent = save.name;
    $('#dipDate').textContent = new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
    $('#dipPrint').hidden = !net.online;
    if (celebrateNow) {
      sfx.fanfare(); rain(220); setTimeout(() => rain(160), 900); setTimeout(() => sfx.fanfare(), 1200);
      setTimeout(() => cheer('Talkamratexpert!', true), 600);
      say(`Grattis ${save.name}! Nu är du Talkamratexpert!`);
    }
  }
  $('#dipRoad').addEventListener('click', openRoad);
  $('#dipPrint').addEventListener('click', () => { try { window.print(); } catch (e) {} });

  /* ================= Klistermärken ================= */
  function openBook() {
    stopGame();
    const counts = {};
    save.stickers.forEach(e => { counts[e] = (counts[e] || 0) + 1; });
    const got = STICKERS.filter(([e]) => counts[e]).length;
    $('#bookCount').textContent = `${got} av ${STICKERS.length}`;
    $('#medalRow').innerHTML = MEDALS.map(([k, e, name]) => save.path[k]
      ? `<div class="slot"><div><div class="em">${e}</div><small>${name}</small></div></div>`
      : `<div class="slot missing" title="${name}">?</div>`).join('');
    const g = $('#bookGrid'); g.innerHTML = '';
    STICKERS.forEach(([e, name]) => {
      g.insertAdjacentHTML('beforeend', counts[e]
        ? `<div class="slot"><div><div class="em">${e}</div><small>${name}</small>${counts[e] > 1 ? ` <span class="x">×${counts[e]}</span>` : ''}</div></div>`
        : `<div class="slot missing" aria-label="Inte hittad än">?</div>`);
    });
    show('book');
  }

  /* ================= Klassen ================= */
  async function openClass() {
    stopGame();
    show('class');
    $('#classTitle').textContent = net.player.className || 'Klassen';
    $('#mates').innerHTML = '<p class="stats">Hämtar klassen …</p>';
    renderAvatarPicker();
    if (net.inflight || ls.get(ACCOUNT_KEY)?.dirty) await sync();
    try {
      const c = await api('GET', 'me/class');
      $('#classTitle').textContent = c.name;
      const pct = Math.min(100, 100 * c.total / c.goal);
      $('#jarGoal').textContent = `Mål: ${c.goal} ★`;
      $('#jarBig').innerHTML = `${c.total} <span>★</span>`;
      $('#jarMeter').style.width = pct + '%';
      $('#jarText').textContent = c.total >= c.goal
        ? 'Ni har fyllt stjärnburken! Fråga er lärare om en klassbelöning.'
        : `Alla stjärnor i klassen hamnar i burken. ${c.goal - c.total} kvar till målet!`;
      $('#mates').innerHTML = c.players.map(p => `<div class="mate${p.me ? ' me' : ''}">
          <span class="em" aria-hidden="true">${esc(p.avatar)}</span><b>${esc(p.name)}${p.me ? ' (du)' : ''}</b>
          <small>★ ${p.stars} · ${p.stickers} klistermärken</small>
          <span class="medals" aria-label="${p.medals} medaljer${p.expert ? ', expert' : ''}">${'🏅'.repeat(p.medals)}${p.expert ? '🎓' : ''}</span>
        </div>`).join('');
      if (c.total >= c.goal) rain(80);
    } catch (e) {
      $('#mates').innerHTML = `<p class="error">${esc(e.message)}</p>`;
    }
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
    const last = ls.get(CLASS_KEY);
    joinCode(last || '');
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
      submit: first => new Promise((resolve, reject) => {
        // Bekräfta koden en gång till
        setTimeout(() => pinPad({
          title: 'Tryck samma bilder igen', lead: 'Så att vi vet att du kommer ihåg dem.', back: () => choosePin(name, submit, back),
          submit: again => (again.join() === first.join() ? submit(again) : Promise.reject(new Error('Det blev inte samma bilder. Försök igen!')))
        }), 300);
        resolve(null);
      })
    });
  }
  function pinPad({ title, lead, back, submit }) {
    $('#joinBack').onclick = back;
    let pin = [];
    body().innerHTML = `<h2>${esc(title)}</h2><p class="lead">${esc(lead)}</p>
      <div class="pinslots" id="slots"><span></span><span></span><span></span></div>
      <div class="pinpad" id="pad"></div>
      <div class="pinactions"><button class="chunky ghost" id="pinUndo">Sudda</button></div>
      <p class="error" id="joinErr" style="text-align:center"></p>`;
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
        const p = progressOf(save), gp = progressOf(guest);
        for (const [k, v] of Object.entries(gp.best)) p.best[k] = Math.max(p.best[k] || 0, v);
        for (const [k, v] of Object.entries(gp.path)) p.path[k] = Math.max(p.path[k] || 0, v);
        for (const [k, v] of Object.entries(gp.records)) p.records[k] = Math.max(p.records[k] || 0, v);
        p.total += gp.total; p.rounds += gp.rounds;
        p.stickers = [...p.stickers, ...gp.stickers];
        Object.assign(save, p);
        ls.set(GUEST_KEY, { name: guest.name, ...freshProgress() });
        persist();
      }
      goHome();
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
  $('#openRoad').addEventListener('click', openRoad);
  $('#pickFind').addEventListener('click', () => startFindNumber(chosenN));
  $('#pickBubbles').addEventListener('click', () => startBubbles(chosenN));
  $('#mix10').addEventListener('click', () => { roadContext = false; startMix(10); });
  $('#mix20').addEventListener('click', () => { roadContext = false; startMix(20); });
  $('#trickyBtn').addEventListener('click', () => { roadContext = false; startTricky(); });
  $('#openBook').addEventListener('click', openBook);
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
    save = Object.assign({ name: save.name }, freshProgress());
    persist();
    e.target.textContent = 'Nollställ allt';
    renderStart();
  });
  try { speechSynthesis && speechSynthesis.getVoices(); } catch (e) {}

  boot().then(() => { if (pendingTalk) { cheer(pendingTalk); pendingTalk = ''; } });
})();
