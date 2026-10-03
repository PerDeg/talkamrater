// Widget för klassens webbsida: visar veckans uppdrag, elevens status och husdjuret.
// Bäddas in med <iframe src="https://<spelets-adress>/widget.html?klass=SOL-4821&namn=Edwin">.
// Konstanterna nedan speglar game.js – håll dem i synk om de ändras där.
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const genitive = n => (/[sxz]$/i.test(n) ? n : n + 's');
  const KEY = 'talkamrater-widget';

  const PET_STAGES = [[0, 'Ägg'], [10, 'Bebis'], [40, 'Liten'], [100, 'Stor'], [200, 'Jätte'], [400, 'Kung']];
  const PET_ICONS = ['🥚', '🐣', '🐾', '💜', '✨', '👑'];
  const petStage = xp => PET_STAGES.reduce((s, [min], i) => (xp >= min ? i : s), 0);
  const TREATS = { glass: ['🍦', 'en glass'], pizza: ['🍕', 'en pizzabit'], banan: ['🍌', 'en banan'], tarta: ['🎂', 'en tårtbit'], kaka: ['🍪', 'en kaka'], popcorn: ['🍿', 'popcorn'], boll: ['⚽', 'en ny boll'], ballong: ['🎈', 'en ballong'], jordgubb: ['🍓', 'jordgubbar'] };
  const WISH_TEXT = {
    answers: w => `svara rätt på ${w.need} frågor`, minus: w => `svara rätt på ${w.need} minusfrågor`, dubbel: w => `svara rätt på ${w.need} dubbelfrågor`,
    bubbles: w => `poppa alla bubbelpar som blir ${w.n}`, number: w => `klara talet ${w.n} med minst två stjärnor`,
    streak: () => 'få 5 rätt i rad', stars3: () => 'få tre stjärnor på en runda', daily: () => 'klara dagens utmaning'
  };
  const MEDALS = { 't-z1': ['🏅', 'Kompisbyns medalj'], 't-z2': ['🌳', 'Skogsmedaljen'], 't-z3': ['🐠', 'Sjömedaljen'], 't-z4': ['⛰️', 'Toppmedaljen'], expert: ['🎓', 'Expertmössan'],
    't-mz1': ['🍄', 'Svampmedaljen'], 't-mz2': ['🦔', 'Igelkottsmedaljen'], 't-mz3': ['🦇', 'Grottmedaljen'], 't-mz4': ['🧊', 'Ismedaljen'], mexpert: ['🧙', 'Minustrollkarlen'],
    't-dz1': ['🧦', 'Strumpmedaljen'], 't-dz2': ['🏰', 'Slottsmedaljen'], dexpert: ['👯', 'Dubbelmästaren'] };
  const EXPERT = { plus: ['🎓', 'Talkamratexpert'], minus: ['🧙', 'Minusexpert'], dubbel: ['👯', 'Dubbelexpert'] };
  const today = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };

  function petHTML(stage, cls) {
    if (stage === 0) return `<div class="pet egg ${cls}" aria-hidden="true"><i class="spot s1"></i><i class="spot s2"></i><i class="spot s3"></i></div>`;
    return `<div class="pet stage-${stage} ${cls}" aria-hidden="true">
      ${stage >= 3 ? '<i class="horn h1"></i><i class="horn h2"></i>' : ''}${stage >= 4 ? '<i class="wing w1"></i><i class="wing w2"></i>' : ''}
      <i class="belly"></i><i class="eye e1"></i><i class="eye e2"></i><i class="mouth"></i>
      ${stage >= 2 ? '<i class="cheek c1"></i><i class="cheek c2"></i>' : ''}${stage >= 5 ? '<span class="crown">👑</span>' : ''}</div>`;
  }
  function eventText(e) {
    const n = `<b>${esc(e.name)}</b>`;
    switch (e.type) {
      case 'medal': { const m = MEDALS[e.detail]; return m ? `${n} vann ${m[1]} ${m[0]}` : `${n} vann en medalj 🏅`; }
      case 'expert': { const x = EXPERT[e.detail]; return `${n} blev ${x ? x[1] : 'expert'}! ${x ? x[0] : '🎓'}`; }
      case 'daily': return `${n} har gjort dagens utmaning ${esc(e.detail)} dagar i rad! 🔥`;
      case 'book': return `${n} har samlat alla klistermärken! 📒`;
      case 'pet': return `<b>${esc(genitive(e.name))}</b> husdjur blev kung! 👑`;
      case 'mission': return '🎉 <b>Klassen klarade veckans uppdrag!</b>';
      default: return `${n} gjorde något bra!`;
    }
  }

  // Berätta för sidan som bäddar in widgeten hur hög den är
  const sendHeight = () => { try { parent.postMessage({ type: 'talkamrater-height', height: document.documentElement.scrollHeight }, '*'); } catch (e) {} };
  new ResizeObserver(sendHeight).observe(document.body);

  function settings() {
    const q = new URLSearchParams(location.search);
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    return {
      code: (q.get('klass') || q.get('code') || saved.code || '').trim(),
      name: (q.get('namn') || q.get('name') || saved.name || '').trim(),
      fromUrl: q.has('klass') || q.has('code')
    };
  }

  function showForm(err) {
    $('#wLoading').hidden = true; $('#wContent').hidden = true; $('#wForm').hidden = false;
    const s = settings();
    $('#wCode').value = s.code; $('#wName').value = s.name;
    $('#wErr').textContent = err || '';
  }

  async function load() {
    const s = settings();
    if (!s.code) return showForm();
    try {
      const r = await fetch(`api/public/classes/${encodeURIComponent(s.code)}${s.name ? `?name=${encodeURIComponent(s.name)}` : ''}`, { cache: 'no-store' });
      const data = await r.json().catch(() => null);
      if (!r.ok) return showForm((data && data.error) || 'Kunde inte hämta klassen.');
      render(data, s);
    } catch (e) {
      showForm('Kommer inte åt spelet just nu. Försök igen om en stund.');
    }
  }

  function render(d, s) {
    $('#wLoading').hidden = true; $('#wForm').hidden = true; $('#wContent').hidden = false;
    $('#wChange').hidden = s.fromUrl;
    $('#wClass').textContent = d.class.name;
    $('#wPlayers').textContent = `${d.class.players} elever spelar`;

    const m = d.mission;
    const done = m.progress >= m.goal;
    $('#wMission').classList.toggle('is-done', done);
    $('#wMissionTitle').textContent = m.title;
    $('#wMissionMeter').style.width = Math.min(100, 100 * m.progress / m.goal) + '%';
    $('#wMissionProgress').textContent = done ? `Klart! ${m.progress} ${m.unit} 🎉` : `${m.progress} av ${m.goal} ${m.unit}`;
    const days = Math.max(0, Math.ceil((m.endsAt - Date.now()) / 86400000));
    $('#wMissionDays').textContent = done ? 'Grymt jobbat!' : days <= 1 ? 'Sista dagen!' : `${days} dagar kvar`;

    const me = d.me;
    $('#wMe').hidden = !me;
    $('#wNotFound').hidden = !d.nameNotFound;
    if (d.nameNotFound) $('#wNotFound').textContent = `Hittar ingen som heter "${s.name}" i klassen. Skriv namnet precis som i spelet.`;
    if (me) {
      $('#wAvatar').textContent = me.avatar;
      $('#wName2').textContent = me.name;
      const medals = Object.keys(me.path || {}).filter(k => MEDALS[k] && me.path[k] > 0).map(k => MEDALS[k][0]).join('');
      $('#wStats').textContent = `★ ${me.stars} · ${me.stickers} klistermärken · ${me.pathDone} steg på vägen${me.dailyStreak > 1 ? ` · 🔥 ${me.dailyStreak}` : ''} ${medals}`;
      $('#wHelp').textContent = m.mine > 0 ? `Du har hjälpt klassen med ${m.mine} ${m.unit} den här veckan. 🤝` : 'Spela en runda så hjälper du klassen med uppdraget!';
      const pet = me.pet || {};
      const st = petStage(pet.xp || 0);
      const daysAway = pet.last ? today() - pet.last : 99;
      const name = pet.name || 'Plutt';
      $('#wPet').innerHTML = petHTML(st, daysAway >= 2 && st > 0 ? 'mood-hungry' : 'mood-happy');
      $('#wPetName').textContent = `${name} · ${PET_STAGES[st][1]}`;
      $('#wPetMood').textContent = st === 0 ? 'Ägget väntar på att kläckas!'
        : daysAway >= 2 ? `${name} är hungrig och längtar efter dig!`
        : (pet.wishDay === today() && pet.wishCount >= 3) ? `${name} är överlycklig idag! 💜` : `${name} mår bra.`;
      const w = pet.wish;
      const wishOk = w && w.day === today() && WISH_TEXT[w.type] && st > 0;
      $('#wWish').hidden = !wishOk;
      if (wishOk) {
        const t = TREATS[w.treat] || TREATS.glass;
        $('#wWish').textContent = `${t[0]} "Kan du ${WISH_TEXT[w.type](w)}? Då får jag ${t[1]}!"${w.need > 1 ? ` (${w.have} av ${w.need})` : ''}`;
      }
    }

    $('#wFeedBox').hidden = !d.events.length;
    $('#wFeed').innerHTML = d.events.map(e => `<li><span aria-hidden="true">${esc(e.avatar)}</span> <span>${eventText(e)}</span></li>`).join('');
    $('#wJar').innerHTML = `Klassens stjärnburk: <b>${d.jar.total}</b> av ${d.jar.goal} ★`;
    $('#wPlay').href = `./?klass=${encodeURIComponent(d.class.code)}`;
    sendHeight();
  }

  $('#wForm').addEventListener('submit', e => {
    e.preventDefault();
    try { localStorage.setItem(KEY, JSON.stringify({ code: $('#wCode').value.trim(), name: $('#wName').value.trim() })); } catch (err) {}
    load();
  });
  $('#wChange').addEventListener('click', () => showForm());
  load();
  setInterval(load, 5 * 60 * 1000);
})();
