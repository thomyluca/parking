(() => {
  'use strict';

  const STORAGE_KEY = 'estacionamiento-v1';
  const TIPOS = { mesa: 'Mesa VIP', cumple: 'Cumpleaños', cortesia: 'Cortesía', otro: 'Otro' };
  const KIND_LABEL = { cash: '💵 Efectivo', transfer: '📲 Transferencia', free: '🎟️ Gratis' };

  // ───────── estado persistente ─────────
  const defaultState = () => ({
    counts: { cash: 0, transfer: 0, free: 0 },
    prices: { cash: 10000, transfer: 15000 },
    custom: [],      // [{id, tipo, nombre, nota, patentes:[]}]
    entered: {},     // { plateKey: timestamp } patentes gratis que ya entraron
    log: [],         // [{t, k, d, plate?}]
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const s = JSON.parse(raw);
      const d = defaultState();
      return {
        counts: { ...d.counts, ...(s.counts || {}) },
        prices: { ...d.prices, ...(s.prices || {}) },
        custom: Array.isArray(s.custom) ? s.custom : [],
        entered: s.entered || {},
        log: Array.isArray(s.log) ? s.log : [],
      };
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      toast('⚠️ No se pudo guardar');
    }
  }

  // Pedimos al navegador que no borre los datos de este sitio.
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

  // ───────── normalización de patentes ─────────
  const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Clave "tolerante": O↔0 e I↔1 se consideran iguales (errores típicos al leer/tipear).
  const loose = (s) => norm(s).replace(/O/g, '0').replace(/I/g, '1');
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pretty = (p) => {
    const n = norm(p);
    let m = n.match(/^([A-Z]{2})(\d{3})([A-Z]{2})$/);
    if (m) return `${m[1]} ${m[2]} ${m[3]}`;
    m = n.match(/^([A-Z]{3})(\d{3,4})$/);
    if (m) return `${m[1]} ${m[2]}`;
    return n;
  };

  function levenshtein(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 2;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return dp[a.length][b.length];
  }

  // Detecta patentes argentinas dentro de un texto libre (mensajes de WhatsApp, etc).
  function extractPlates(text) {
    const up = String(text || '').toUpperCase();
    const re = /\b([A-Z]{2})[\s.-]?(\d{3})[\s.-]?([A-Z]{2})\b|\b([A-Z]{3})[\s.-]?(\d{3,4})\b|\b([A-Z])[\s.-]?(\d{3})[\s.-]?([A-Z]{3})\b/g;
    const out = [];
    let m;
    while ((m = re.exec(up))) out.push(norm(m[0]));
    if (!out.length) {
      // Sin formato reconocible: tomamos cada línea como patente.
      up.split(/[\n,;|·]+/).map(norm).filter((p) => p.length >= 5 && p.length <= 8).forEach((p) => out.push(p));
    }
    return [...new Set(out)];
  }

  // ───────── índice de patentes gratis ─────────
  function allGroups() {
    return [
      ...SEED_GROUPS.map((g, i) => ({ ...g, id: 'seed-' + i, seed: true })),
      ...state.custom.map((g) => ({ ...g, seed: false })),
    ];
  }

  let INDEX = [];
  function rebuildIndex() {
    INDEX = [];
    for (const g of allGroups()) {
      if (!g.patentes.length) {
        INDEX.push({ group: g, plate: null, key: null, nameKey: fold(g.nombre) });
      }
      for (const p of g.patentes) {
        INDEX.push({ group: g, plate: norm(p), key: loose(p), nameKey: fold(g.nombre) });
      }
    }
  }
  rebuildIndex();

  function search(query) {
    const q = loose(query);
    const qName = fold(query).trim();
    const res = [];
    for (const e of INDEX) {
      let score = null;
      if (e.key && q) {
        if (e.key === q) score = 0;
        else if (q.length >= 3 && e.key.includes(q)) score = 1;
        else if (e.key.length >= 5 && q.includes(e.key)) score = 1;
        else if (q.length >= 5 && levenshtein(e.key, q) <= 1) score = 2;
      }
      if (score === null && qName.length >= 3 && /[a-z]/.test(qName) && e.nameKey.includes(qName)) score = 3;
      if (score !== null) res.push({ ...e, score });
    }
    res.sort((a, b) => a.score - b.score);
    return res.slice(0, 12);
  }

  // ───────── acciones ─────────
  function add(k, d, plate) {
    if (d < 0 && state.counts[k] <= 0) { toast('Ya está en 0'); return; }
    state.counts[k] += d;
    state.log.push({ t: Date.now(), k, d, plate: plate || null });
    if (state.log.length > 2000) state.log.splice(0, state.log.length - 2000);
    if (plate && d > 0) state.entered[loose(plate)] = Date.now();
    save();
    render();
    buzz();
    const price = k === 'free' ? '' : ` (${money(state.prices[k])})`;
    toast(`${d > 0 ? '+1' : '−1'} ${KIND_LABEL[k]}${price}${plate ? ' · ' + pretty(plate) : ''}`);
  }

  function undo() {
    const last = state.log.pop();
    if (!last) { toast('No hay nada para deshacer'); return; }
    state.counts[last.k] = Math.max(0, state.counts[last.k] - last.d);
    if (last.plate && last.d > 0) {
      const key = loose(last.plate);
      const stillEntered = state.log.some((l) => l.plate && loose(l.plate) === key && l.d > 0);
      if (!stillEntered) delete state.entered[key];
    }
    save();
    render();
    buzz();
    toast(`Deshecho: ${last.d > 0 ? '+1' : '−1'} ${KIND_LABEL[last.k]}`);
  }

  // ───────── render ─────────
  const $ = (id) => document.getElementById(id);
  const fmt = new Intl.NumberFormat('es-AR');
  const money = (n) => '$ ' + fmt.format(n);
  const time = (t) => new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function totals() {
    const c = state.counts, p = state.prices;
    const cash = c.cash * p.cash, transfer = c.transfer * p.transfer;
    return { cash, transfer, total: cash + transfer, paid: c.cash + c.transfer, inside: c.cash + c.transfer + c.free };
  }

  function render() {
    const t = totals();
    $('total').textContent = money(t.total);
    $('cashMoney').textContent = money(t.cash);
    $('transferMoney').textContent = money(t.transfer);
    $('inside').textContent = t.inside;
    $('insideDetail').textContent = `${t.paid} pagos · ${state.counts.free} gratis`;
    $('nCash').textContent = state.counts.cash;
    $('nTransfer').textContent = state.counts.transfer;
    $('nFree').textContent = state.counts.free;
    $('pCash').textContent = `${money(state.prices.cash)} c/u · ${money(t.cash)}`;
    $('pTransfer').textContent = `${money(state.prices.transfer)} c/u · ${money(t.transfer)}`;
    const last = state.log[state.log.length - 1];
    $('last').textContent = last ? `Último: ${last.d > 0 ? '+1' : '−1'} ${KIND_LABEL[last.k]} a las ${time(last.t)}` : '';
    renderResults();
    if ($('panel').classList.contains('open')) renderPanel();
  }

  function renderResults() {
    const query = $('q').value;
    const box = $('results');
    $('clearQ').classList.toggle('show', !!query);
    const qn = norm(query);
    if (!qn) { box.innerHTML = ''; return; }

    const matches = search(query);
    const plateMatches = matches.filter((m) => m.plate);
    const exact = plateMatches.some((m) => m.score === 0);
    let html = '';

    if (exact) {
      html += `<div class="verdict ok">✅ ENTRA GRATIS</div>`;
    } else if (matches.length) {
      html += `<div class="verdict ok" style="color:var(--amber);background:var(--amber-bg);border-color:#6b4a0c">🔎 ¿Es alguna de estas?<small>Revisá la patente del auto antes de dejarlo pasar gratis</small></div>`;
    } else if (qn.length >= 5) {
      html += `<div class="verdict no">❌ NO ESTÁ EN LA LISTA<small>Cobrar estacionamiento</small></div>
        <div class="pay-now">
          <button class="bg-cash" data-pay="cash">💵 Efectivo<br>${money(state.prices.cash)}</button>
          <button class="bg-transfer" data-pay="transfer">📲 Transfer<br>${money(state.prices.transfer)}</button>
        </div>`;
    } else {
      html += `<div class="hint" style="padding:4px 2px">Seguí escribiendo…</div>`;
    }

    for (const m of matches) {
      const g = m.group;
      const entered = m.key ? state.entered[m.key] : null;
      const tag = m.score === 0 ? '' : m.score === 3 ? '<span class="badge similar">por nombre</span>' : '<span class="badge similar">parecida</span>';
      html += `<div class="match ${m.score === 0 ? 'exact' : ''}">
        <div class="row1">
          ${m.plate ? `<span class="plate">${esc(pretty(m.plate))}</span>` : '<span class="plate" style="background:#fbbf24">SIN PATENTE</span>'}
          <span class="badge ${esc(g.tipo)}">${esc(TIPOS[g.tipo] || g.tipo)}</span>
          ${tag}
        </div>
        <div class="who">${esc(g.nombre)}</div>
        ${g.nota ? `<div class="note">${esc(g.nota)}</div>` : ''}
        ${entered ? `<div class="warn">⚠️ Esta patente ya entró a las ${time(entered)}</div>` : ''}
        ${m.plate
          ? `<button class="go ${entered ? 'again' : ''}" data-free="${esc(m.plate)}">${entered ? 'Entró otra vez · +1 gratis' : 'Entró · +1 gratis'}</button>`
          : `<button class="go" data-assign="${esc(g.id)}" data-plate="${esc(qn)}">Asignarle la patente escrita y +1 gratis</button>`}
      </div>`;
    }
    box.innerHTML = html;
  }

  function renderPanel() {
    $('priceCash').value = state.prices.cash;
    $('priceTransfer').value = state.prices.transfer;

    const groups = allGroups();
    const count = (tipo) => groups.filter((g) => g.tipo === tipo).reduce((a, g) => a + g.patentes.length, 0);
    const total = groups.reduce((a, g) => a + g.patentes.length, 0);
    $('stats').innerHTML = `<span>🚗 ${total} patentes gratis</span><span>· Mesas ${count('mesa')}</span><span>· Cumples ${count('cumple')}</span><span>· Cortesías ${count('cortesia')}</span><span>· Ya entraron ${Object.keys(state.entered).length}</span>`;

    const f = fold($('listFilter').value).trim();
    const fp = loose($('listFilter').value);
    const order = ['mesa', 'cumple', 'cortesia', 'otro'];
    let html = '';
    for (const tipo of order) {
      const gs = groups.filter((g) => g.tipo === tipo).filter((g) =>
        !f || fold(g.nombre).includes(f) || fold(g.nota).includes(f) || (fp && g.patentes.some((p) => loose(p).includes(fp))));
      if (!gs.length) continue;
      html += `<div class="hint" style="margin:12px 2px 6px;font-weight:700;text-transform:uppercase;letter-spacing:.6px">${TIPOS[tipo]}</div>`;
      for (const g of gs) {
        html += `<div class="group">
          <div class="gname">${esc(g.nombre)} ${g.seed ? '' : '<span class="badge otro">agregada</span>'}</div>
          ${g.nota ? `<div class="gnote">${esc(g.nota)}</div>` : ''}
          <div class="chips">
            ${g.patentes.length ? g.patentes.map((p) => {
              const inn = state.entered[loose(p)];
              return `<span class="chip ${inn ? 'in' : ''}">${inn ? '✓ ' : ''}${esc(pretty(p))}${g.seed ? '' : ` <button data-del="${esc(g.id)}" data-p="${esc(p)}" aria-label="Borrar">✕</button>`}</span>`;
            }).join('') : '<span class="hint">Sin patente (pendiente)</span>'}
          </div>
        </div>`;
      }
    }
    $('groups').innerHTML = html || '<div class="hint">Nada coincide.</div>';

    const logs = state.log.slice(-40).reverse();
    $('log').innerHTML = logs.length
      ? logs.map((l) => `<div class="log-item"><span>${l.d > 0 ? '+1' : '−1'} ${KIND_LABEL[l.k]}${l.plate ? ' · ' + esc(pretty(l.plate)) : ''}</span><span class="hint">${time(l.t)}</span></div>`).join('')
      : '<div class="hint">Todavía no hay movimientos.</div>';
  }

  // ───────── utilidades UI ─────────
  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  function buzz() { try { navigator.vibrate && navigator.vibrate(25); } catch (e) {} }

  // Mantener la pantalla prendida mientras la app está abierta.
  let wakeLock = null;
  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (e) {}
  }

  function summaryText() {
    const t = totals();
    const c = state.counts;
    const now = new Date().toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    return `🚗 Estacionamiento (${now})\n` +
      `Autos adentro: ${t.inside}\n` +
      `💵 Efectivo: ${c.cash} autos = ${money(t.cash)}\n` +
      `📲 Transferencia: ${c.transfer} autos = ${money(t.transfer)}\n` +
      `🎟️ Gratis: ${c.free} autos\n` +
      `💰 TOTAL: ${money(t.total)}`;
  }

  // ───────── eventos ─────────
  document.addEventListener('click', (ev) => {
    keepAwake();
    const b = ev.target.closest('button');
    if (!b) return;

    if (b.dataset.k) { add(b.dataset.k, Number(b.dataset.d)); return; }

    if (b.dataset.pay) {
      add(b.dataset.pay, 1);
      $('q').value = '';
      renderResults();
      return;
    }

    if (b.dataset.free) {
      add('free', 1, b.dataset.free);
      $('q').value = '';
      renderResults();
      return;
    }

    if (b.dataset.assign) {
      const g = state.custom.find((x) => x.id === b.dataset.assign);
      const plate = b.dataset.plate;
      if (g) g.patentes.push(plate);
      else {
        const seed = allGroups().find((x) => x.id === b.dataset.assign);
        state.custom.push({ id: 'c' + Date.now(), tipo: seed.tipo, nombre: seed.nombre, nota: 'Patente cargada en la puerta', patentes: [plate] });
      }
      save();
      rebuildIndex();
      add('free', 1, plate);
      $('q').value = '';
      renderResults();
      return;
    }

    if (b.dataset.del) {
      const g = state.custom.find((x) => x.id === b.dataset.del);
      if (!g) return;
      if (!confirm(`¿Borrar ${pretty(b.dataset.p)} de "${g.nombre}"?`)) return;
      g.patentes = g.patentes.filter((p) => p !== b.dataset.p);
      if (!g.patentes.length) state.custom = state.custom.filter((x) => x !== g);
      save();
      rebuildIndex();
      render();
      return;
    }
  });

  $('q').addEventListener('input', renderResults);
  $('clearQ').addEventListener('click', () => { $('q').value = ''; renderResults(); $('q').focus(); });
  $('undo').addEventListener('click', undo);

  $('share').addEventListener('click', async () => {
    const text = summaryText();
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('Resumen copiado'); }
    catch (e) { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); }
  });

  $('openLists').addEventListener('click', () => { $('panel').classList.add('open'); renderPanel(); });
  $('closeLists').addEventListener('click', () => { $('panel').classList.remove('open'); });
  $('listFilter').addEventListener('input', renderPanel);

  $('addBtn').addEventListener('click', () => {
    const tipo = $('addTipo').value;
    const nombre = $('addNombre').value.trim() || TIPOS[tipo];
    const patentes = extractPlates($('addPatentes').value);
    if (!patentes.length) { toast('No encontré ninguna patente'); return; }
    state.custom.push({ id: 'c' + Date.now(), tipo, nombre, nota: '', patentes });
    save();
    rebuildIndex();
    $('addNombre').value = '';
    $('addPatentes').value = '';
    renderPanel();
    toast(`Agregadas ${patentes.length}: ${patentes.map(pretty).join(', ')}`);
  });

  const onPrice = (k, el) => el.addEventListener('change', () => {
    const v = Math.max(0, Math.round(Number(el.value) || 0));
    state.prices[k] = v;
    save();
    render();
    toast('Precio actualizado');
  });
  onPrice('cash', $('priceCash'));
  onPrice('transfer', $('priceTransfer'));

  $('resetBtn').addEventListener('click', () => {
    if (!confirm('¿Seguro? Se ponen en 0 todos los contadores y la plata.')) return;
    if (!confirm('Última confirmación: ¿reiniciar la noche?')) return;
    state.counts = { cash: 0, transfer: 0, free: 0 };
    state.entered = {};
    state.log = [];
    save();
    render();
    toast('Contadores en 0');
  });

  // Si la app se abre en otra pestaña, mantenemos todo sincronizado.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) { state = load(); rebuildIndex(); render(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { wakeLock = null; keepAwake(); } });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  render();
})();
