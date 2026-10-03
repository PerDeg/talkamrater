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
  const widgetUrl = code => new URL(`widget.html?klass=${encodeURIComponent(code)}`, location.href).href;
  const embedCode = code => `<!-- Plutt säger en mening från Talkamrater. Syns bara när eleven finns i klassen. -->
<iframe src="${widgetUrl(code)}&namn=Edwin" title="Talkamrater" style="width:100%;max-width:420px;height:0;border:0;color-scheme:normal" loading="lazy"></iframe>
<script>
  addEventListener('message', e => {
    if (e.data && e.data.type === 'talkamrater-height')
      document.querySelectorAll('iframe[title="Talkamrater"]').forEach(f => { if (f.contentWindow === e.source) f.style.height = e.data.height + 'px'; });
  });
<\/script>`;

  // Två klick för att radera, så att inget försvinner av misstag
  function confirmClick(btn, label, action) {
    btn.addEventListener('click', async () => {
      if (btn.dataset.armed) { delete btn.dataset.armed; btn.disabled = true; await action(); return; }
      btn.dataset.armed = '1'; const old = btn.textContent; btn.textContent = label;
      setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = old; } }, 3500);
    });
  }

  async function load() {
    let classes;
    try { classes = await api('GET', 'admin/classes'); }
    catch (e) {
      $('#loginBox').hidden = false; $('#main').hidden = true;
      $('#loginErr').textContent = e.status === 401 ? 'Fel adminnyckel.' : e.message;
      return;
    }
    try { sessionStorage.setItem('tk-admin', key); } catch (e) {}
    $('#loginBox').hidden = true; $('#main').hidden = false;
    const wrap = $('#classes'); wrap.innerHTML = '';
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
        <div class="tablewrap"><table>
          <thead><tr><th>Elev</th><th>★</th><th>Klister&shy;märken</th><th>Vägen</th><th>Kluriga kamrater</th><th>Senast</th><th></th></tr></thead>
          <tbody></tbody>
        </table></div>
        <p class="actions" style="margin-top:12px"><button class="small-btn danger" data-del-class>Radera klassen</button></p>`;
      const tb = $('tbody', el);
      if (!c.players.length) tb.innerHTML = '<tr><td colspan="7" class="muted">Inga elever har gått med än.</td></tr>';
      for (const p of c.players) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="em">${esc(p.avatar)}</span> <b>${esc(p.name)}</b>${p.hasPin ? '' : ' <span class="muted">(väljer ny kod)</span>'}<div class="rounds" hidden></div></td>
          <td>${p.stars}</td>
          <td>${p.stickers}</td>
          <td>${p.pathDone} steg ${'🏅'.repeat(p.medals)}${(p.experts || []).map(w => ({ plus: '🎓', minus: '🧙', dubbel: '👯' })[w] || '').join('')}${p.dailyStreak > 1 ? ` 🔥${p.dailyStreak}` : ''}</td>
          <td class="tricky">${p.tricky.length ? esc(p.tricky.join(', ')) : '<span class="muted">–</span>'}</td>
          <td>${ago(p.lastSeen)}</td>
          <td><div class="actions">
            <button class="small-btn" data-rounds>Rundor</button>
            <button class="small-btn" data-reset>Ny bildkod</button>
            <button class="small-btn danger" data-del>Ta bort</button>
          </div></td>`;
        $('[data-rounds]', tr).addEventListener('click', async () => {
          const box = $('.rounds', tr);
          if (!box.hidden) { box.hidden = true; return; }
          const rows = await api('GET', `admin/players/${p.id}/rounds`);
          box.innerHTML = rows.length ? rows.slice(0, 12).map(r => `${new Date(r.at).toLocaleDateString('sv-SE')} · ${esc(r.level)} ${esc(r.mode)} · ${r.score}/${r.total} · ${'★'.repeat(r.stars)}`).join('<br>') : 'Inga rundor än.';
          box.hidden = false;
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
  }

  $('#loginForm').addEventListener('submit', e => { e.preventDefault(); key = $('#adminKey').value; load(); });
  $('#newClass').addEventListener('submit', async e => {
    e.preventDefault();
    $('#newErr').textContent = '';
    try {
      await api('POST', 'admin/classes', { name: $('#className').value, goal: Number($('#classGoal').value) });
      $('#className').value = '';
      load();
    } catch (err) { $('#newErr').textContent = err.message; }
  });
  $('#logout').addEventListener('click', () => { try { sessionStorage.removeItem('tk-admin'); } catch (e) {} key = ''; location.reload(); });
  if (key) load();
})();
