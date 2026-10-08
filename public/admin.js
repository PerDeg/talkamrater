(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
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
  // Fokusval: ett eller flera tal (högst sex) bland plus 1–20, minus 1–20 och dubblor 1–10
  const MAX_FOCUS = 6;
  const FOCUS_GROUPS = [['p', 'Talkamrater till', 20], ['m', 'Minus från', 20], ['d', 'Dubblor upp till', 10]];
  const focusList = f => String(f || '').split(',').map(x => x.trim()).filter(Boolean);
  const focusShort = f => `${{ p: '+', m: '−', d: '2×' }[f[0]]}${f.slice(1)}`;
  const focusName = f => `${{ p: 'Talkamrater till', m: 'Minus från', d: 'Dubblor upp till' }[f[0]]} ${f.slice(1)}`;
  // En knapp som visar valet, och en ruta med alla tal att bocka i
  function focusPicker(current, noneLabel, onSave) {
    const box = document.createElement('details');
    box.className = 'fpick';
    let sel = focusList(current);
    const summary = () => (sel.length ? sel.map(f => `<span class="fchip">${esc(focusShort(f))}</span>`).join('') : `<span class="muted">${esc(noneLabel)}</span>`);
    box.innerHTML = `<summary>${summary()} <span class="fedit">Ändra</span></summary>
      <div class="fpanel">
        ${FOCUS_GROUPS.map(([k, label, max]) => `<div class="fgroup"><b>${label}</b><div class="fnums">${Array.from({ length: max }, (_, i) => i + 1)
          .map(n => `<button type="button" class="fnum" data-f="${k}${n}" aria-pressed="${sel.includes(k + n)}">${n}</button>`).join('')}</div></div>`).join('')}
        <p class="muted small fhint">Välj upp till ${MAX_FOCUS}. Sparas direkt.</p>
        <button type="button" class="small-btn" data-clear>Inget fokus</button>
      </div>`;
    let timer = 0;
    const save = () => {
      $('summary', box).innerHTML = `${summary()} <span class="fedit">Ändra</span>`;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try { await onSave(sel.join(',')); box.classList.add('saved'); setTimeout(() => box.classList.remove('saved'), 1200); }
        catch (e) { alert(e.message); }
      }, 500);
    };
    box.querySelectorAll('.fnum').forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.f;
      if (sel.includes(f)) sel = sel.filter(x => x !== f);
      else if (sel.length >= MAX_FOCUS) { $('.fhint', box).textContent = `Högst ${MAX_FOCUS} åt gången. Ta bort något först.`; return; }
      else sel = [...sel, f];
      b.setAttribute('aria-pressed', String(sel.includes(f)));
      save();
    }));
    $('[data-clear]', box).addEventListener('click', () => { sel = []; box.querySelectorAll('.fnum').forEach(b => b.setAttribute('aria-pressed', 'false')); save(); });
    return box;
  }
  // Har eleven tränat på fokuset? En rad per tal.
  const focusDoneHTML = p => (p.focusDone || []).length
    ? p.focusDone.map(f => `<div class="fdone ${f.rounds ? 'yes' : 'no'}" title="${esc(focusName(f.focus))}">${f.rounds ? '✅' : '⏳'} <b>${esc(focusShort(f.focus))}</b> ${f.rounds ? `${f.rounds} ${f.rounds === 1 ? 'runda' : 'rundor'}, ${f.answers} rätt` : 'inte än'}</div>`).join('')
    : '<span class="muted">–</span>';
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
    // Egna konton (utan klass) visas för sig
    const solos = classes.filter(c => c.solo);
    classes = classes.filter(c => !c.solo);
    for (const c of classes) wrap.appendChild(classSection(c));
    if (solos.length) { const el = soloSection(solos); el.dataset.view = 'egna'; wrap.appendChild(el); }
    renderNav(classes, solos);
  }

  /* ---------- Meny: en klass i taget ---------- */
  let view = '';
  try { view = sessionStorage.getItem('tk-admin-view') || ''; } catch (e) {}
  function renderNav(classes, solos) {
    const items = [
      ...classes.map(c => [`c${c.id}`, `${esc(c.name)} <small>${c.players.length}</small>`]),
      ...(solos.length ? [['egna', `Egna konton <small>${solos.length}</small>`]] : []),
      ...(me.super || me.school ? [['skola', me.super ? 'Skolor och klasskamp' : 'Klasskamp']] : []),
      ['ny', '＋ Ny klass']
    ];
    if (!items.some(([v]) => v === view)) view = classes.length ? `c${classes[0].id}` : 'ny';
    $('#admNav').innerHTML = items.map(([v, label]) => `<button data-v="${v}" aria-pressed="${v === view}">${label}</button>`).join('');
    $$('#admNav button').forEach(b => b.addEventListener('click', () => { view = b.dataset.v; try { sessionStorage.setItem('tk-admin-view', view); } catch (e) {} renderNav(classes, solos); }));
    $$('[data-view]').forEach(el => { el.hidden = el.dataset.view !== view; });
    if (me.super) $('#schoolsBox').hidden = view !== 'skola';
  }

  /* ---------- Rutor (modal) ---------- */
  function openModal(html, wire) {
    $('#modalBody').innerHTML = html;
    if (wire) wire($('#modalBody'));
    $('#modal').showModal();
  }
  async function copyText(text, btn) {
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Kopierat!'; } catch (e) { btn.textContent = 'Markera och kopiera själv'; }
  }

  /* ---------- En klass ---------- */
  const daysAgo = ms => (ms ? Math.floor((Date.now() - ms) / 86400000) : 999);
  const activity = p => { const d = daysAgo(p.lastSeen); return d <= 1 ? 'today' : d <= 7 ? 'week' : 'away'; };
  function classSection(c) {
    const el = document.createElement('section');
    el.className = 'panel adm-class';
    el.dataset.view = `c${c.id}`;
    const n = c.players.length;
    const stars = c.players.reduce((sum, p) => sum + p.stars, 0);
    const own = c.players.filter(p => !p.focus);
    const focusTrained = own.filter(p => (p.focusDone || []).some(f => f.rounds)).length;
    // Att hålla koll på: inte spelat på länge, inte tränat på fokus, mycket att träna på
    const away = c.players.filter(p => daysAgo(p.lastSeen) > 7);
    const noFocus = c.players.filter(p => (p.focusDone || []).length && !p.focusDone.some(f => f.rounds));
    const needs = c.players.filter(p => p.practice.length >= 3);
    const names = list => list.map(p => `<b>${esc(p.avatar)} ${esc(p.name)}</b>`).join(', ');
    const watch = [
      away.length ? `<li><span>😴</span><span>Inte spelat på över en vecka: ${names(away)}</span></li>` : '',
      noFocus.length ? `<li><span>✏️</span><span>Inte tränat på sitt fokus än: ${names(noFocus)}</span></li>` : '',
      needs.length ? `<li><span>🧩</span><span>Har flera saker att träna på: ${names(needs)}</span></li>` : ''
    ].join('');
    el.innerHTML = `
      <div class="adm-head">
        <div><h2>${esc(c.name)}</h2><span class="muted">${n} ${n === 1 ? 'elev' : 'elever'} · klasskod <b class="adm-code-s">${esc(c.code)}</b></span></div>
        <span class="actions">
          <button class="small-btn" data-share>📣 Dela med eleverna</button>
          <button class="small-btn" data-widget>🌐 Klassens webbsida${c.public ? ' ✓' : ''}</button>
          <button class="small-btn" data-settings>⚙️ Inställningar</button>
        </span>
      </div>
      <div class="adm-stats">
        <div class="adm-stat"><small>Har spelat i veckan</small><b>${c.everyone.contributed} av ${c.everyone.players}${c.everyone.allIn ? ' 🌟' : ''}</b><span class="adm-bar"><i style="width:${c.everyone.players ? 100 * c.everyone.contributed / c.everyone.players : 0}%"></i></span></div>
        <div class="adm-stat"><small>Stjärnburken</small><b>${stars} av ${c.goal} ★</b><span class="adm-bar"><i style="width:${Math.min(100, 100 * stars / c.goal)}%"></i></span></div>
        <div class="adm-stat"><small>Veckans uppdrag</small><b class="adm-stat-t">${esc(c.mission.title)}</b></div>
        <div class="adm-stat"><small>Klassens husdjur</small><b class="adm-stat-t">${esc(c.pet.icon)} ${esc(c.pet.moodText)}</b></div>
      </div>
      <div class="adm-focus">
        <div class="adm-focus-head"><b>✏️ Fokus för hela klassen</b><div data-class-focus></div></div>
        <span class="muted">${c.focus ? `<b>${focusTrained} av ${own.length}</b> har tränat på det${c.focusAt ? ` sedan ${dateText(c.focusAt)}` : ' den senaste veckan'}. ` : ''}Står överst i elevernas lista Idag. En elev kan få ett eget fokus under Mer på elevkortet.</span>
      </div>
      ${watch ? `<div class="adm-watch"><b>Håll koll på</b><ul>${watch}</ul></div>` : ''}
      <div class="adm-students">${n ? '' : '<p class="muted">Inga elever har gått med än. Tryck på Dela med eleverna.</p>'}</div>
      <details class="adm-wallbox"><summary>📊 Kunskapsväggen: vad klassen kan</summary>${wallHTML(c)}</details>`;
    const list = $('.adm-students', el);
    for (const p of c.players) list.appendChild(studentCard(c, p));
    $('[data-class-focus]', el).replaceWith(focusPicker(c.focus, 'Inget fokus', async v => { await api('PATCH', `admin/classes/${c.id}`, { focus: v }); }));
    // Dela: instruktion och en länk som öppnar "Gå med i klassen" med koden ifylld
    $('[data-share]', el).addEventListener('click', () => {
      const link = `${gameUrl}?klass=${encodeURIComponent(c.code)}`;
      const text = `Gå till ${gameUrl}, tryck Gå med i klassen och skriv koden ${c.code}. Eller öppna länken: ${link}`;
      openModal(`<h3>Dela med eleverna</h3>
        <p>Klasskod:</p><p><span class="adm-code">${esc(c.code)}</span></p>
        <p class="muted">${esc(text)}</p>
        <p class="actions"><button class="small-btn" data-c1>Kopiera texten</button><button class="small-btn" data-c2>Kopiera bara länken</button></p>`,
        m => { $('[data-c1]', m).onclick = e => copyText(text, e.target); $('[data-c2]', m).onclick = e => copyText(link, e.target); });
    });
    // Klassens webbsida: widgeten och koden att klistra in, bara i en ruta
    $('[data-widget]', el).addEventListener('click', () => openModal(`<h3>Klassens webbsida</h3>
        <label class="check"><input type="checkbox" data-public ${c.public ? 'checked' : ''}> Visa klassens status på en annan webbsida (widget)</label>
        <div class="adm-embed" ${c.public ? '' : 'hidden'}>
          <p class="muted">Klistra in på klassens sida. Byt <b>namn=</b> mot elevens namn. Rutan syns bara när eleven finns i klassen. Sajten måste stå i <b>ALLOWED_ORIGINS</b> på servern. Mer i docs/API.md.</p>
          <pre class="adm-code-block">${esc(embedCode(c.code))}</pre>
          <p class="actions"><button class="small-btn" data-copy-embed>Kopiera koden</button><a class="small-btn" href="${esc(widgetUrl(c.code))}" target="_blank" rel="noopener">Förhandsgranska</a></p>
        </div>`, m => {
        $('[data-public]', m).addEventListener('change', async e => { await api('PATCH', `admin/classes/${c.id}`, { public: e.target.checked }); c.public = e.target.checked; $('.adm-embed', m).hidden = !c.public; load(); });
        $('[data-copy-embed]', m).onclick = e => copyText(embedCode(c.code), e.target);
      }));
    // Inställningar: mål, skola och radera
    $('[data-settings]', el).addEventListener('click', () => openModal(`<h3>Inställningar för ${esc(c.name)}</h3>
        <div class="adm-form">
          <label>Stjärnburkens mål <span class="goal-edit"><input type="number" min="10" value="${c.goal}"><button class="small-btn" data-goal>Spara</button></span></label>
          ${me.super && schools.length ? `<label>Skola <select class="adm-select" data-school><option value="">Ingen skola</option>${schools.map(x => `<option value="${x.id}" ${x.id === c.schoolId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>` : ''}
          <p class="actions"><button class="small-btn danger" data-del-class>Radera klassen</button></p>
        </div>`, m => {
        $('[data-goal]', m).onclick = async () => { await api('PATCH', `admin/classes/${c.id}`, { goal: Number($('.goal-edit input', m).value) }); $('#modal').close(); load(); };
        const sel = $('[data-school]', m);
        if (sel) sel.onchange = async e => { await api('PATCH', `admin/classes/${c.id}`, { schoolId: Number(e.target.value) || null }); load(); };
        confirmClick($('[data-del-class]', m), 'Radera klassen och alla elever? Klicka igen', async () => { await api('DELETE', `admin/classes/${c.id}`); $('#modal').close(); load(); });
      }));
    return el;
  }

  // Ett kort per elev: det viktigaste syns direkt, resten under "Mer"
  const ACT = { today: ['🟢', 'Spelat idag eller igår'], week: ['🟡', 'Spelat den här veckan'], away: ['⚪', 'Inte spelat på över en vecka'] };
  function studentCard(c, p) {
    const el = document.createElement('article');
    const a = activity(p);
    el.className = 'adm-student act-' + a;
    const chips = (list, cls, max = 3) => list.slice(0, max).map(x => `<span class="schip ${cls}">${esc(x)}</span>`).join('') + (list.length > max ? `<span class="schip more">+${list.length - max}</span>` : '');
    el.innerHTML = `
      <div class="st-top"><span class="st-av" aria-hidden="true">${esc(p.avatar)}</span>
        <div class="st-name"><b>${esc(p.name)}</b><small title="${ACT[a][1]}">${ACT[a][0]} senast ${ago(p.lastSeen)}${p.hasPin ? '' : ' · väljer ny bildkod'}</small></div></div>
      <div class="st-nums"><span><b>${p.training.weekRounds}</b> ${p.training.weekRounds === 1 ? 'runda' : 'rundor'} i veckan</span><span><b>${p.training.weekAnswers}</b> rätt</span><span>★ ${p.stars}</span>${p.medals ? `<span>🏅 ${p.medals}</span>` : ''}</div>
      ${(p.focusDone || []).length ? `<div class="st-focus">${focusDoneHTML(p)}</div>` : ''}
      <div class="st-row"><small>Kan bra</small>${p.strong.length ? chips(p.strong, 'good') : '<span class="muted small">Inget säkert än</span>'}</div>
      <div class="st-row"><small>Träna på</small>${p.practice.length ? chips(p.practice, 'tricky') : '<span class="muted small">–</span>'}</div>
      <details class="st-more"><summary>Mer</summary>
        <div class="st-row"><small>Kan bra</small>${p.strong.map(x => `<span class="schip good">${esc(x)}</span>`).join('') || '–'}</div>
        <div class="st-row"><small>Träna på</small>${p.practice.map(x => `<span class="schip tricky">${esc(x)}</span>`).join('') || '–'}</div>
        <p class="muted small">${p.training.rounds} rundor totalt · bidrag i veckan: ${p.contribution} ${esc(c.mission.unit)}${(p.experts || []).length ? ' · expert' : ''}</p>
        <div class="st-row"><small>Eget fokus</small><div data-focus></div></div>
        <p class="actions"><button class="small-btn" data-reset>Ny bildkod</button><button class="small-btn danger" data-del>Ta bort</button></p>
      </details>`;
    $('[data-focus]', el).replaceWith(focusPicker(p.focus, c.focus ? 'Klassens fokus' : 'Inget eget', async v => { await api('PATCH', `admin/players/${p.id}`, { focus: v }); }));
    confirmClick($('[data-reset]', el), 'Säker? Klicka igen', async () => { await api('POST', `admin/players/${p.id}/reset-pin`); load(); });
    confirmClick($('[data-del]', el), 'Radera allt?', async () => { await api('DELETE', `admin/players/${p.id}`); load(); });
    return el;
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
