// Widget för t.ex. klassens schema. All text kommer färdig från API:t.
//
// Två stilar:
//   stil=bubbla (standard)  Plutt säger en mening i en liten pratbubbla.
//                           Visar ingenting alls om eleven inte hittas.
//   stil=kort               Ett kompakt kort med uppdrag, elev och husdjur.
//
// Parametrar i länken (alla valfria):
//   klass=SOL-4821     klasskod (kortet visar annars ett litet formulär)
//   namn=Edwin         eleven (krävs för bubblan)
//   sida=hoger         bubbla: Plutt till höger om texten
//   tema=ljus|mork|auto   färgläge (standard auto)
//   accent=2f6bff      accentfärg (hex utan #)
//   bakgrund=ffffff    bakgrund (hex) eller "transparent"
//   text=1d2433        textfärg (hex)
//   rund=12            hörnradie i px
//   kant=0             utan ram
//   flode=3            visa de senaste händelserna (0–5)
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const KEY = 'talkamrater-widget';
  const root = document.documentElement;
  const hex = v => (/^[0-9a-f]{3,8}$/i.test(v || '') ? '#' + v : null);

  root.dataset.tema = ['ljus', 'mork', 'auto'].includes(q.get('tema')) ? q.get('tema') : 'auto';
  if (q.get('kant') === '0') root.dataset.kant = '0';
  if (hex(q.get('accent'))) root.style.setProperty('--accent', hex(q.get('accent')));
  if (hex(q.get('text'))) root.style.setProperty('--fg', hex(q.get('text')));
  if (q.get('bakgrund') === 'transparent') root.style.setProperty('--bg', 'transparent');
  else if (hex(q.get('bakgrund'))) root.style.setProperty('--bg', hex(q.get('bakgrund')));
  if (/^\d{1,2}$/.test(q.get('rund') || '')) root.style.setProperty('--radius', q.get('rund') + 'px');
  const feedCount = Math.min(5, Math.max(0, Number(q.get('flode')) || 0));
  const bubble = q.get('stil') !== 'kort';
  if (q.get('sida') === 'hoger') root.dataset.sida = 'hoger';
  if (hex(q.get('husdjur'))) root.style.setProperty('--pet', hex(q.get('husdjur')));

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const code = () => (q.get('klass') || saved.code || '').trim();
  const name = () => (q.get('namn') || saved.name || '').trim();

  // Låt sidan som bäddar in anpassa höjden
  const tell = () => {
    const el = bubble ? $('tb') : $('tk');
    const h = el.hidden ? 0 : Math.ceil(el.getBoundingClientRect().height) + 4;
    try { parent.postMessage({ type: 'talkamrater-height', height: h }, '*'); } catch (e) {}
  };

  // Plutt som liten SVG: ägg, eller en lila figur som blir större och får krona
  function petSvg(p) {
    if (!p || p.stage === 0) {
      return '<svg viewBox="0 0 34 34"><ellipse cx="17" cy="19" rx="11" ry="13.5" fill="#FFF6E0" stroke="#E8DCC0"/><circle cx="13" cy="15" r="2.4" fill="var(--pet)" opacity=".7"/><circle cx="21" cy="21" r="2" fill="var(--pet)" opacity=".7"/><circle cx="14" cy="26" r="1.6" fill="var(--pet)" opacity=".7"/></svg>';
    }
    const hungry = p.mood === 'hungrig';
    const mouth = hungry ? '<rect x="14" y="22" width="6" height="1.8" rx=".9" fill="#1d2433"/>' : '<path d="M13.5 21.5q3.5 3.5 7 0" stroke="#1d2433" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    const horns = p.stage >= 3 ? '<path d="M10 9l2-5 2.5 4.5M20.5 8.5L22 4l2 5" fill="#FFC83D"/>' : '';
    const crown = p.stage >= 5 ? '<path d="M11 6l2.5 3 3.5-4 3.5 4 2.5-3-1 6h-10z" fill="#FFC83D" stroke="#D99A00" stroke-width=".6"/>' : '';
    return `<svg viewBox="0 0 34 34">${horns}${crown}<path d="M4 21c0-8 5.8-13 13-13s13 5 13 13c0 6-5.8 10-13 10S4 27 4 21z" fill="var(--pet)"/>
      <ellipse cx="17" cy="25" rx="7" ry="4.5" fill="#fff" opacity=".35"/>
      <circle cx="12.5" cy="17" r="2.6" fill="#fff"/><circle cx="21.5" cy="17" r="2.6" fill="#fff"/>
      <circle cx="13" cy="${hungry ? 18 : 17.5}" r="1.3" fill="#1d2433"/><circle cx="22" cy="${hungry ? 18 : 17.5}" r="1.3" fill="#1d2433"/>${mouth}
      ${p.stage >= 2 ? '<circle cx="9" cy="21" r="1.6" fill="#ff9ec0" opacity=".8"/><circle cx="25" cy="21" r="1.6" fill="#ff9ec0" opacity=".8"/>' : ''}</svg>`;
  }

  function renderBubble(d) {
    const me = d && d.me;
    if (!me || !me.nudge) { $('tb').hidden = true; tell(); return; }
    $('tb').hidden = false;
    $('tb').href = d.playUrl;
    $('tbPet').innerHTML = petSvg(me.pet);
    $('tbText').textContent = me.nudge.text;
    $('tb').title = `${me.pet.name} i Talkamrater: ${me.nudge.text}`;
    $('tb').setAttribute('aria-label', `${me.pet.name} säger: ${me.nudge.text}. Öppnar Talkamrater.`);
    tell();
  }
  new ResizeObserver(tell).observe(document.body);

  function showForm(msg) {
    $('view').hidden = true; $('form').hidden = false;
    $('code').value = code(); $('name').value = name();
    $('err').textContent = msg || '';
  }

  async function load() {
    if (bubble) {
      // Bubblan stör aldrig: saknas klass, namn eller svar visas ingenting
      if (!code() || !name()) return renderBubble(null);
      try {
        const r = await fetch(`api/public/classes/${encodeURIComponent(code())}?events=0&name=${encodeURIComponent(name())}`, { cache: 'no-store' });
        renderBubble(r.ok ? await r.json() : null);
      } catch (e) { renderBubble(null); }
      return;
    }
    $('tk').hidden = false;
    if (!code()) return showForm();
    const url = `api/public/classes/${encodeURIComponent(code())}?events=${feedCount}${name() ? `&name=${encodeURIComponent(name())}` : ''}`;
    try {
      const r = await fetch(url, { cache: 'no-store' });
      const d = await r.json().catch(() => null);
      if (!r.ok) return showForm((d && d.error) || 'Kunde inte hämta klassen.');
      render(d);
    } catch (e) { showForm('Spelet svarar inte just nu.'); }
  }

  function render(d) {
    $('form').hidden = true; $('view').hidden = false;
    $('cls').textContent = d.class.name;
    $('play').href = d.playUrl;
    const m = d.mission;
    $('mTitle').textContent = m.done ? `✓ ${m.title}` : m.title;
    $('mNum').textContent = `${m.progress}/${m.goal}`;
    $('mBar').style.width = m.percent + '%';

    const me = d.me;
    $('me').hidden = !me; $('pet').hidden = !me;
    $('miss').hidden = !d.nameNotFound;
    if (d.nameNotFound) $('miss').textContent = `Hittar ingen som heter ${name()} i klassen.`;
    if (me) {
      const bits = [`${me.avatar} <b>${esc(me.name)}</b>`, `★ ${me.stars}`];
      if (me.dailyStreak > 1) bits.push(`🔥 ${me.dailyStreak}`);
      if (me.contribution > 0) bits.push(`🤝 ${me.contribution} ${esc(m.unit)}`);
      if (me.medalIcons) bits.push(me.medalIcons);
      $('me').innerHTML = bits.map(b => `<span>${b}</span>`).join('');
      const p = me.pet;
      $('pet').innerHTML = p.wish
        ? `<span>${p.icon} ${esc(p.name)} önskar ${p.wish.icon} om du ${esc(p.wish.text)}${p.wish.need > 1 ? ` (${p.wish.have}/${p.wish.need})` : ''}</span>`
        : `<span>${p.icon} ${esc(p.moodText)}</span>`;
    }
    $('feed').hidden = !d.events.length;
    $('feed').innerHTML = d.events.map(e => `<li>${esc(e.text)}</li>`).join('');
    tell();
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  $('form').addEventListener('submit', e => {
    e.preventDefault();
    saved = { code: $('code').value.trim(), name: $('name').value.trim() };
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (err) {}
    load();
  });
  load();
  setInterval(load, 5 * 60 * 1000);
})();
