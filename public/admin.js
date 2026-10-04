(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let key = '';
  try { key = sessionStorage.getItem('tk-admin') || ''; } catch (e) {}

  async function api(method, path, body) {
    const r = await fetch('api/' + path, {
      method, cache: 'no-store',
      headers: { 'content-type': 'application/json', 'x-admin-key': key },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok) { const e = new Error((data && data.error) || `Fel ${r.status}`); e.status = r.status; throw e; }
    return data;
  }

  const ago = ms => {
    if (!ms) return 'aldrig';
    const d = Math.floor((Date.now() - ms) / 86400000);
    return d <= 0 ? 'idag' : d === 1 ? 'igår' : `${d} dagar sedan`;
  };
  const gameUrl = new URL('./', location.href).href;
  // Fokusval: inget, plus 1–20, minus 1–20, dubblor 1–10
  const focusOptions = (sel, noneLabel) => `<option value="">${noneLabel}</option>`
    + [['p', 'Talkamrater till', 20], ['m', 'Minus från', 20], ['d', 'Dubblor upp till', 10]].map(([k, label, max]) =>
      `<optgroup label="${label.split(' ')[0]}">${Array.from({ length: max }, (_, i) => i + 1)
        .map(n => `<option value="${k}${n}" ${sel === k + n ? 'selected' : ''}>${label} ${n}</option>`).join('')}</optgroup>`).join('');
  const widgetUrl = code => new URL(`widget.html?klass=${encodeURIComponent(code)}`, location.href).href;
  const embedCode = code => `<!-- Plutt säger en mening från Talkamrater. Syns bara när eleven finns i klassen. -->
<iframe src="${widgetUrl(code)}&namn=Edwin" title="Talkamrater" style="width:100%;max-width:420px;height:0;border:0;color-scheme:normal" loading="lazy"></iframe>
<script>
  addEventListener('message', e => {
    if (e.data && e.data.type === 'talkamrater-height')
      document.querySelectorAll('iframe[title="Talkamrater"]').forEach(f => { if (f.contentWindow === e.source) f.style.height = e.data.height + 'px'; });
  });
<\/script>`;

  // Kunskapsväggen: hur många elever som kan varje tal (pärlorna har försvunnit)
  const WALL = [['p', 'Plus', 20], ['m', 'Minus', 20], ['d', 'Dubblor', 10]];
  const wallHTML = c => {
    const n = c.players.length || 1;
    const rows = WALL.filter(([k]) => Object.keys(c.wall).some(x => x[0] === k)).map(([k, label, max]) =>
      `<div class="adm-wall-row"><b>${label}</b>${Array.from({ length: max }, (_, i) => i + 1).map(t => {
        const v = c.wall[k + t] || 0;
        return `<span style="--share:${(v / n).toFixed(2)}" title="${label} ${t}: ${v} av ${c.players.length} kan">${t}<sup>${v}</sup></span>`;
      }).join('')}</div>`).join('');
    return `<div class="adm-wall"><p class="muted"><b>Kunskapsväggen</b> – hur många som kan talet (siffran upptill). Ljusa rutor = mest att träna på tillsammans.</p>${rows || '<p class="muted">Ingen kan något tal helt säkert än.</p>'}</div>`;
  };

  // Två klick för att radera, så att inget försvinner av misstag
  function confirmClick(btn, label, action) {
    btn.addEventListener('click', async () => {
      if (btn.dataset.armed) { delete btn.dataset.armed; btn.disabled = true; await action(); return; }
      btn.dataset.armed = '1'; const old = btn.textContent; btn.textContent = label;
      setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = old; } }, 3500);
    });
  }

  let me = { super: true }, schools = [];
  async function load() {
    let classes, contests;
    try {
      me = await api('GET', 'admin/me');
      [classes, schools, contests] = await Promise.all([api('GET', 'admin/classes'), api('GET', 'admin/schools'), api('GET', 'admin/contests')]);
    }
    catch (e) {
      $('#loginBox').hidden = false; $('#main').hidden = true;
      $('#loginErr').textContent = e.status === 401 ? 'Fel adminnyckel.' : e.message;
      return;
    }
    try { sessionStorage.setItem('tk-admin', key); } catch (e) {}
    $('#loginBox').hidden = true; $('#main').hidden = false;
    $('#whoami').textContent = me.super ? 'Huvudadmin' : `Lärare · ${me.school.name}`;
    renderSchools();
    renderContests(contests, classes);
    $('#classSchoolWrap').hidden = !me.super || !schools.length;
    $('#classSchool').innerHTML = '<option value="">Ingen skola</option>' + schools.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
    const wrap = $('#classes'); wrap.innerHTML = '';
    // Egna konton (utan klass) visas för sig, längst ner
    const solos = classes.filter(c => c.solo);
    classes = classes.filter(c => !c.solo);
    if (!classes.length) wrap.innerHTML = '<p class="panel adm-class muted">Inga klasser än. Skapa en ovanför.</p>';
    for (const c of classes) {
      const el = document.createElement('section');
      el.className = 'panel adm-class';
      const stars = c.players.reduce((s, p) => s + p.stars, 0);
      el.innerHTML = `
        <div class="adm-head">
          <h2>${esc(c.name)}</h2>
          <span class="adm-code" title="Klasskod">${esc(c.code)}</span>
        </div>
        <div class="adm-share">
          <span>Till eleverna: Gå till <b>${esc(gameUrl)}</b>, tryck <b>Gå med i klassen</b> och skriv koden <b>${esc(c.code)}</b>.</span>
          <button class="small-btn" data-copy>Kopiera</button>
        </div>
        ${me.super && schools.length ? `<p class="muted"><label>Skola: <select class="adm-select" data-school><option value="">Ingen skola</option>${schools.map(x => `<option value="${x.id}" ${x.id === c.schoolId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label></p>` : ''}
        <p class="muted">${c.players.length} ${c.players.length === 1 ? 'elev' : 'elever'} · stjärnburken ${stars} av
          <span class="goal-edit"><input type="number" min="10" value="${c.goal}" aria-label="Mål för stjärnburken"><button class="small-btn" data-goal>Spara</button></span></p>
        <div class="adm-public">
          <label class="check"><input type="checkbox" data-public ${c.public ? 'checked' : ''}> Visa klassens status på en annan webbsida (widget)</label>
          <div class="adm-embed" ${c.public ? '' : 'hidden'}>
            <p class="muted">Klistra in på klassens sida. Byt <b>namn=</b> mot elevens namn. Rutan syns bara när eleven finns i klassen. Mer om färger och stilar i docs/API.md.</p>
            <pre class="adm-code-block">${esc(embedCode(c.code))}</pre>
            <button class="small-btn" data-copy-embed>Kopiera kod</button>
            <a class="small-btn" href="${esc(widgetUrl(c.code))}" target="_blank" rel="noopener">Förhandsgranska</a>
            <p class="muted">Sajten som bäddar in måste stå i <b>ALLOWED_ORIGINS</b> på servern.</p>
          </div>
        </div>
        <div class="adm-focus">
          <label for="cf-${c.id}"><b>Veckans fokus för hela klassen</b></label>
          <select id="cf-${c.id}" data-class-focus>${focusOptions(c.focus, 'Inget fokus')}</select>
          <span class="muted">Visas överst i spelet och kommer oftare i blandade rundor. En elev kan få ett eget fokus nedan.</span>
        </div>
        <p class="muted">Veckans uppdrag: <b>${esc(c.mission.title)}</b>
          · Alla med: <b>${c.everyone.contributed} av ${c.everyone.players}</b> har spelat den här veckan${c.everyone.allIn ? ' 🌟' : ''}
          · ${esc(c.pet.icon)} ${esc(c.pet.moodText)}</p>
        ${wallHTML(c)}
        <div class="tablewrap"><table>
          <thead><tr><th>Elev</th><th>Kan bra</th><th>Behöver träna</th><th>Tränat</th><th>Bidrag i veckan</th><th>Eget fokus</th><th></th></tr></thead>
          <tbody></tbody>
        </table></div>
        <p class="actions" style="margin-top:12px"><button class="small-btn danger" data-del-class>Radera klassen</button></p>`;
      const tb = $('tbody', el);
      if (!c.players.length) tb.innerHTML = '<tr><td colspan="7" class="muted">Inga elever har gått med än.</td></tr>';
      for (const p of c.players) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="em">${esc(p.avatar)}</span> <b>${esc(p.name)}</b>${p.hasPin ? '' : ' <span class="muted">(väljer ny kod)</span>'}
            <div class="muted small">★ ${p.stars} · ${p.medals} medaljer${(p.experts || []).length ? ' · expert' : ''} · senast ${ago(p.lastSeen)}</div></td>
          <td class="good">${p.strong.length ? p.strong.map(esc).join('<br>') : '<span class="muted">Inget säkert än</span>'}</td>
          <td class="tricky">${p.practice.length ? p.practice.map(esc).join('<br>') : '<span class="muted">–</span>'}</td>
          <td>${p.training.weekRounds} rundor, ${p.training.weekAnswers} rätt i veckan<div class="muted small">${p.training.rounds} rundor totalt</div></td>
          <td>${p.contribution} ${esc(c.mission.unit)}</td>
          <td><select data-focus aria-label="Eget fokus för ${esc(p.name)}">${focusOptions(p.focus, c.focus ? 'Klassens fokus' : 'Inget')}</select></td>
          <td><div class="actions">
            <button class="small-btn" data-reset>Ny bildkod</button>
            <button class="small-btn danger" data-del>Ta bort</button>
          </div></td>`;
        $('[data-focus]', tr).addEventListener('change', async e => {
          await api('PATCH', `admin/players/${p.id}`, { focus: e.target.value });
          e.target.classList.add('saved'); setTimeout(() => e.target.classList.remove('saved'), 1200);
        });
        confirmClick($('[data-reset]', tr), 'Säker? Klicka igen', async () => { await api('POST', `admin/players/${p.id}/reset-pin`); load(); });
        confirmClick($('[data-del]', tr), 'Radera allt?', async () => { await api('DELETE', `admin/players/${p.id}`); load(); });
        tb.appendChild(tr);
      }
      $('[data-copy]', el).addEventListener('click', async e => {
        const text = $('.adm-share span', el).textContent.trim();
        try { await navigator.clipboard.writeText(text); e.target.textContent = 'Kopierat!'; }
        catch (err) { const r = document.createRange(); r.selectNodeContents($('.adm-share span', el)); getSelection().removeAllRanges(); getSelection().addRange(r); }
      });
      $('[data-goal]', el).addEventListener('click', async () => {
        await api('PATCH', `admin/classes/${c.id}`, { goal: Number($('.goal-edit input', el).value) });
        load();
      });
      const schoolSel = $('[data-school]', el);
      if (schoolSel) schoolSel.addEventListener('change', async e => { await api('PATCH', `admin/classes/${c.id}`, { schoolId: Number(e.target.value) || null }); load(); });
      $('[data-class-focus]', el).addEventListener('change', async e => {
        await api('PATCH', `admin/classes/${c.id}`, { focus: e.target.value });
        load();
      });
      $('[data-public]', el).addEventListener('change', async e => {
        await api('PATCH', `admin/classes/${c.id}`, { public: e.target.checked });
        load();
      });
      const copyEmbed = $('[data-copy-embed]', el);
      if (copyEmbed) copyEmbed.addEventListener('click', async e => {
        try { await navigator.clipboard.writeText(embedCode(c.code)); e.target.textContent = 'Kopierat!'; }
        catch (err) { const r = document.createRange(); r.selectNodeContents($('.adm-code-block', el)); getSelection().removeAllRanges(); getSelection().addRange(r); }
      });
      confirmClick($('[data-del-class]', el), 'Radera klassen och alla elever? Klicka igen', async () => { await api('DELETE', `admin/classes/${c.id}`); load(); });
      wrap.appendChild(el);
    }
    if (solos.length) wrap.appendChild(soloSection(solos));
  }

  /* ---------- Skolor (huvudadmin) ---------- */
  function showKey(name, key) {
    const box = $('#keyBox'); box.hidden = false;
    box.innerHTML = `<p><b>Lärarnyckel för ${esc(name)}</b>. Ge den till skolans lärare. Den visas bara nu, men du kan alltid skapa en ny.</p>
      <code class="adm-key">${esc(key)}</code> <button class="small-btn" data-copy-key>Kopiera</button>`;
    $('[data-copy-key]', box).addEventListener('click', async e => { try { await navigator.clipboard.writeText(key); e.target.textContent = 'Kopierat!'; } catch (err) {} });
  }
  function renderSchools() {
    $('#schoolsBox').hidden = !me.super;
    if (!me.super) return;
    const list = $('#schools');
    list.innerHTML = schools.length ? '' : '<p class="muted">Inga skolor än. Klasser kan finnas utan skola, men klasskamp kräver en skola.</p>';
    for (const x of schools) {
      const row = document.createElement('div'); row.className = 'adm-school';
      row.innerHTML = `<b>${esc(x.name)}</b><span class="muted">${x.classes} ${x.classes === 1 ? 'klass' : 'klasser'}</span>
        <span class="actions"><button class="small-btn" data-key>Ny lärarnyckel</button><button class="small-btn danger" data-del>Ta bort</button></span>`;
      confirmClick($('[data-key]', row), 'Gamla nyckeln slutar gälla. Klicka igen', async () => { const r = await api('POST', `admin/schools/${x.id}/key`); await load(); showKey(x.name, r.key); });
      confirmClick($('[data-del]', row), 'Klasserna blir kvar. Klicka igen', async () => { await api('DELETE', `admin/schools/${x.id}`); load(); });
      list.appendChild(row);
    }
  }
  $('#newSchool').addEventListener('submit', async e => {
    e.preventDefault(); $('#schoolErr').textContent = '';
    try {
      const r = await api('POST', 'admin/schools', { name: $('#schoolName').value });
      $('#schoolName').value = '';
      await load(); showKey(r.name, r.key);
    } catch (err) { $('#schoolErr').textContent = err.message; }
  });

  /* ---------- Klasskamp ---------- */
  const METRIC_LABEL = { pairs: 'Bubbelpar (bubbelberg)', answers: 'Rätta svar', rounds: 'Rundor', stars: 'Stjärnor' };
  const dateText = ms => new Date(ms).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' });
  function renderContests(contests, classes) {
    const wrap = $('#contests'); wrap.innerHTML = '';
    const scope = me.super ? schools : [me.school];
    for (const school of scope) {
      const mine = classes.filter(c => c.schoolId === school.id && !c.solo);
      const el = document.createElement('section');
      el.className = 'panel adm-contests';
      el.innerHTML = `<div class="label">Klasskamp · ${esc(school.name)} <small>Klasserna bygger var sitt berg och hejar på varandra</small></div>
        <p class="muted">Varje klass bygger mot ett eget mål efter hur många elever den har, så att stora och små klasser har samma chans. Klasserna visas i bokstavsordning, aldrig som en placering.</p>
        <div class="adm-contest-list"></div>
        <details class="adm-newcontest"><summary>Starta en ny klasskamp</summary>
          ${mine.length < 2 ? '<p class="muted">Skolan behöver minst två klasser.</p>' : `
          <form class="adm-form">
            <label>Namn <input class="textfield" name="title" maxlength="64" placeholder="Skolans bubbelberg"></label>
            <label>Vad bygger klasserna av? <select class="adm-select" name="metric">${Object.entries(METRIC_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
            <fieldset class="adm-checks"><legend>Klasser som är med</legend>${mine.map(c => `<label class="check"><input type="checkbox" name="cls" value="${c.id}" checked> ${esc(c.name)}</label>`).join('')}</fieldset>
            <label>Sista dag (valfritt) <input class="textfield" type="date" name="ends"></label>
            <button class="chunky coral" type="submit">Starta klasskampen</button>
            <p class="error"></p>
          </form>`}
        </details>`;
      const list = $('.adm-contest-list', el);
      const here = contests.filter(k => k.schoolId === school.id);
      if (!here.length) list.innerHTML = '<p class="muted">Ingen klasskamp än.</p>';
      for (const k of here) list.appendChild(contestCard(k, mine));
      const form = $('form', el);
      if (form) form.addEventListener('submit', async e => {
        e.preventDefault();
        const f = new FormData(form);
        try {
          await api('POST', 'admin/contests', {
            schoolId: school.id, title: f.get('title'), metric: f.get('metric'),
            classIds: f.getAll('cls').map(Number), endsAt: f.get('ends') ? new Date(f.get('ends') + 'T23:59:59').getTime() : null
          });
          load();
        } catch (err) { $('.error', form).textContent = err.message; }
      });
      wrap.appendChild(el);
    }
  }
  function contestCard(k) {
    const el = document.createElement('div');
    el.className = 'adm-contest' + (k.active && !k.ended ? '' : ' off');
    const status = k.ended ? `Slut ${dateText(k.endsAt)}` : !k.active ? 'Pausad' : k.endsAt ? `Pågår till ${dateText(k.endsAt)}` : 'Pågår';
    el.innerHTML = `<div class="adm-head"><h3>${esc(k.title)}</h3><span class="badge">${status}</span></div>
      <p class="muted">Startade ${dateText(k.startsAt)} · hela skolan har byggt <b>${k.total} ${esc(k.unit)}</b></p>
      <div class="adm-mountains">${k.classes.map(c => `<div class="adm-mt"><b>${esc(c.name)}</b>
        <span class="adm-bar"><i style="width:${c.percent}%"></i></span><span>${c.progress} av ${c.goal} · ${c.percent} %</span></div>`).join('')}</div>
      <p class="actions"><button class="small-btn" data-toggle>${k.active ? 'Pausa' : 'Starta igen'}</button>
        ${k.ended ? '' : '<button class="small-btn" data-end>Avsluta nu</button>'}
        <button class="small-btn danger" data-del>Ta bort</button></p>`;
    $('[data-toggle]', el).addEventListener('click', async () => { await api('PATCH', `admin/contests/${k.id}`, { active: !k.active }); load(); });
    const end = $('[data-end]', el);
    if (end) confirmClick(end, 'Avsluta kampen? Klicka igen', async () => { await api('PATCH', `admin/contests/${k.id}`, { endsAt: Date.now() }); load(); });
    confirmClick($('[data-del]', el), 'Radera kampen? Klicka igen', async () => { await api('DELETE', `admin/contests/${k.id}`); load(); });
    return el;
  }

  function soloSection(solos) {
    const el = document.createElement('section');
    el.className = 'panel adm-class';
    el.innerHTML = `<div class="adm-head"><h2>Egna konton</h2><span class="muted">${solos.length} st, utan klass</span></div>
      <p class="muted">Elever som har skapat ett eget konto. De loggar in med sin egen kod och bildkod, och kan gå med i en klass senare.</p>
      <div class="tablewrap"><table>
        <thead><tr><th>Elev</th><th>Egen kod</th><th>Kan bra</th><th>Tränat</th><th></th></tr></thead><tbody></tbody>
      </table></div>`;
    const tb = $('tbody', el);
    for (const c of solos) {
      const p = c.players[0];
      if (!p) continue;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="em">${esc(p.avatar)}</span> <b>${esc(p.name)}</b>
          <div class="muted small">★ ${p.stars} · ${p.medals} medaljer · senast ${ago(p.lastSeen)}</div></td>
        <td><b>${esc(c.code)}</b></td>
        <td class="good">${p.strong.length ? p.strong.map(esc).join('<br>') : '<span class="muted">Inget säkert än</span>'}</td>
        <td>${p.training.rounds} rundor totalt<div class="muted small">${p.training.weekRounds} i veckan</div></td>
        <td><div class="actions"><button class="small-btn" data-reset>Ny bildkod</button><button class="small-btn danger" data-del>Ta bort</button></div></td>`;
      confirmClick($('[data-reset]', tr), 'Säker? Klicka igen', async () => { await api('POST', `admin/players/${p.id}/reset-pin`); load(); });
      confirmClick($('[data-del]', tr), 'Radera allt?', async () => { await api('DELETE', `admin/classes/${c.id}`); load(); });
      tb.appendChild(tr);
    }
    return el;
  }

  $('#loginForm').addEventListener('submit', e => { e.preventDefault(); key = $('#adminKey').value; load(); });
  $('#newClass').addEventListener('submit', async e => {
    e.preventDefault();
    $('#newErr').textContent = '';
    try {
      await api('POST', 'admin/classes', { name: $('#className').value, goal: Number($('#classGoal').value), schoolId: Number($('#classSchool').value) || undefined });
      $('#className').value = '';
      load();
    } catch (err) { $('#newErr').textContent = err.message; }
  });
  $('#logout').addEventListener('click', () => { try { sessionStorage.removeItem('tk-admin'); } catch (e) {} key = ''; location.reload(); });
  if (key) load();
})();
