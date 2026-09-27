// Seguimiento desde las 2:20. Guarda en su propia clave de localStorage,
// así no toca nada de lo registrado antes (app.js).
(() => {
  'use strict';

  const STORAGE_KEY = 'puerta-desde-0220-v1';
  const TAB_KEY = 'puerta-tab';

  const ITEMS = [
    { k: 'qr', box: 'counters2Ent', title: '📱 Entrada con QR', sub: 'ya pagada', price: 0, kind: 'person', method: null, cls: 'c-qr' },
    { k: 'entCash', box: 'counters2Ent', title: '🎟️ Entrada', sub: '💵 Efectivo', price: 30000, kind: 'person', method: 'cash', cls: 'c-cash' },
    { k: 'entMp', box: 'counters2Ent', title: '🎟️ Entrada', sub: '📲 Mercado Pago', price: 30000, kind: 'person', method: 'mp', cls: 'c-mp' },
    { k: 'estCash', box: 'counters2Est', title: '🚗 Estacionamiento', sub: '💵 Efectivo', price: 15000, kind: 'car', method: 'cash', cls: 'c-cash' },
    { k: 'estMp', box: 'counters2Est', title: '🚗 Estacionamiento', sub: '📲 Mercado Pago', price: 15000, kind: 'car', method: 'mp', cls: 'c-mp' },
  ];
  const BY_KEY = Object.fromEntries(ITEMS.map((i) => [i.k, i]));

  const emptyCounts = () => Object.fromEntries(ITEMS.map((i) => [i.k, 0]));

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (s) return { counts: { ...emptyCounts(), ...(s.counts || {}) }, log: Array.isArray(s.log) ? s.log : [] };
    } catch (e) {}
    return { counts: emptyCounts(), log: [] };
  }
  let state = load();

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { toast('⚠️ No se pudo guardar'); }
  }

  const $ = (id) => document.getElementById(id);
  const fmt = new Intl.NumberFormat('es-AR');
  const money = (n) => '$ ' + fmt.format(n);
  const time = (t) => new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const label = (i) => `${i.title} · ${i.sub}`;

  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  function buzz() { try { navigator.vibrate && navigator.vibrate(25); } catch (e) {} }

  function totals() {
    const t = { cash: 0, mp: 0, qr: state.counts.qr, paidPeople: 0, cars: 0 };
    for (const i of ITEMS) {
      const n = state.counts[i.k];
      if (i.method) t[i.method] += n * i.price;
      if (i.kind === 'person' && i.method) t.paidPeople += n;
      if (i.kind === 'car') t.cars += n;
    }
    t.total = t.cash + t.mp;
    t.people = t.qr + t.paidPeople;
    return t;
  }

  function buildCounters() {
    for (const i of ITEMS) {
      const row = document.createElement('div');
      row.className = 'counter';
      row.innerHTML = `
        <button class="minus" data-k2="${i.k}" data-d="-1" aria-label="Restar">−</button>
        <div class="info"><div class="name">${i.title}</div><div class="sub" style="font-size:14px;color:var(--text)">${i.sub}</div><div class="n" id="n2-${i.k}">0</div><div class="sub" id="p2-${i.k}"></div></div>
        <button class="plus ${i.cls}" data-k2="${i.k}" data-d="1" aria-label="Sumar">+</button>`;
      $(i.box).appendChild(row);
    }
  }

  function render() {
    const t = totals();
    $('total2').textContent = money(t.total);
    $('cash2').textContent = money(t.cash);
    $('mp2').textContent = money(t.mp);
    $('people2').textContent = t.people;
    $('people2Detail').textContent = `${t.qr} QR · ${t.paidPeople} cobradas`;
    $('cars2').textContent = t.cars;
    for (const i of ITEMS) {
      const n = state.counts[i.k];
      $('n2-' + i.k).textContent = n;
      $('p2-' + i.k).textContent = i.price ? `${money(i.price)} c/u · ${money(n * i.price)}` : 'sin cobro';
    }
    const last = state.log[state.log.length - 1];
    $('last2').textContent = last ? `Último: ${last.d > 0 ? '+1' : '−1'} ${label(BY_KEY[last.k])} a las ${time(last.t)}` : '';
  }

  function add(k, d) {
    const i = BY_KEY[k];
    if (d < 0 && state.counts[k] <= 0) { toast('Ya está en 0'); return; }
    state.counts[k] += d;
    state.log.push({ t: Date.now(), k, d });
    if (state.log.length > 5000) state.log.splice(0, state.log.length - 5000);
    save();
    render();
    buzz();
    toast(`${d > 0 ? '+1' : '−1'} ${label(i)}${i.price ? ` (${money(i.price)})` : ''}`);
  }

  function undo() {
    const last = state.log.pop();
    if (!last) { toast('No hay nada para deshacer'); return; }
    state.counts[last.k] = Math.max(0, state.counts[last.k] - last.d);
    save();
    render();
    buzz();
    toast(`Deshecho: ${last.d > 0 ? '+1' : '−1'} ${label(BY_KEY[last.k])}`);
  }

  function summaryText() {
    const t = totals();
    const c = state.counts;
    const now = new Date().toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    return `🎟️ Puerta desde las 2:20 (${now})\n` +
      `📱 Entradas con QR: ${c.qr}\n` +
      `🎟️ Entradas cobradas: ${t.paidPeople} (💵 ${c.entCash} · 📲 ${c.entMp})\n` +
      `🚗 Estacionamientos: ${t.cars} (💵 ${c.estCash} · 📲 ${c.estMp})\n` +
      `💵 Efectivo: ${money(t.cash)}\n` +
      `📲 Mercado Pago: ${money(t.mp)}\n` +
      `💰 TOTAL: ${money(t.total)}`;
  }

  // ───────── pestañas ─────────
  function showTab(n) {
    $('tab1').hidden = n !== '1';
    $('tab2').hidden = n !== '2';
    $('tabBtn1').classList.toggle('on', n === '1');
    $('tabBtn2').classList.toggle('on', n === '2');
    try { localStorage.setItem(TAB_KEY, n); } catch (e) {}
  }

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.k2) add(b.dataset.k2, Number(b.dataset.d));
    else if (b.dataset.tab) showTab(b.dataset.tab);
  });

  $('undo2').addEventListener('click', undo);
  $('share2').addEventListener('click', async () => {
    const text = summaryText();
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('Resumen copiado'); }
    catch (e) { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) { state = load(); render(); }
  });

  buildCounters();
  render();
  let tab = '2';
  try { tab = localStorage.getItem(TAB_KEY) || '2'; } catch (e) {}
  showTab(tab);
})();
