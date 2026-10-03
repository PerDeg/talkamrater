// Kompakt widget för t.ex. klassens schema. All text kommer färdig från API:t.
//
// Parametrar i länken (alla valfria):
//   klass=SOL-4821     klasskod (annars visas ett litet formulär)
//   namn=Edwin         visar elevens rad och husdjur
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

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const code = () => (q.get('klass') || saved.code || '').trim();
  const name = () => (q.get('namn') || saved.name || '').trim();

  // Låt sidan som bäddar in anpassa höjden
  const tell = () => { try { parent.postMessage({ type: 'talkamrater-height', height: Math.ceil(document.getElementById('tk').getBoundingClientRect().height) + 2 }, '*'); } catch (e) {} };
  new ResizeObserver(tell).observe(document.body);

  function showForm(msg) {
    $('view').hidden = true; $('form').hidden = false;
    $('code').value = code(); $('name').value = name();
    $('err').textContent = msg || '';
  }

  async function load() {
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
