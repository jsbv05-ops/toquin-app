/* TOQUIN APP · Caja diaria: cuaderno del día, gastos e ingresos, etiquetas, proveedores, pagos fijos y reportes. */
(() => {
  'use strict';
  const L = () => window.TOQUIN_LEGACY;
  const st = () => {
    const S = L().getState();
    S.caja ||= {};
    const C = S.caja;
    C.days ||= {}; C.tx ||= []; C.tags ||= []; C.provs ||= []; C.fixed ||= [];
    if (!C.domiPrice) C.domiPrice = 1000;
    if (!Array.isArray(C.accounts) || !C.accounts.length) C.accounts = ['Nequi', 'Crediservir', 'Daviplata'];
    return C;
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = v => { const x = Number(String(v ?? '').replace(/[^0-9-]/g, '')); return Number.isFinite(x) ? x : 0; };
  const money = v => new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(v || 0);
  const pct = (a, b) => b ? (a / b * 100).toFixed(1).replace('.', ',') + '%' : '—';
  const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = new Date(s + 'T12:00'); d.setDate(d.getDate() + n); return iso(d); };
  const fmtD = s => new Date(s + 'T12:00').toLocaleDateString('es-CO', {weekday:'short', day:'numeric', month:'short'});
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const rr = () => window.go('caja');
  let saveTimer = null;
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => L().save(), 600); };
  const commit = () => { clearTimeout(saveTimer); L().save(); rr(); };

  let view = 'dia', date = today(), per = 'quincena', from = today(), to = today(), fTag = '', fProv = '', sort = 'fecha', txType = 'gasto', editId = null, provView = null, oneDay = today();

  const COLORS = ['#f47721','#39251c','#387b52','#c0392b','#2e86c1','#8e44ad','#d4ac0d','#16a085','#e67e22','#7f8c8d','#d35400','#1abc9c'];
  const SUGGESTED = [['Carnes','gasto'],['Pollo','gasto'],['Verduras y fruta','gasto'],['Pan','gasto'],['Gaseosas y bebidas','gasto'],['Desechables','gasto'],['Gas','gasto'],['Servicios','gasto'],['Arriendo','gasto'],['Adelantos de nómina','gasto'],['Mantenimiento','gasto'],['Otros gastos','gasto'],['Otros ingresos','ingreso']];

  function range(p) {
    const t = today(), d = new Date(t + 'T12:00'), y = d.getFullYear(), m = d.getMonth();
    const last = (yy, mm) => iso(new Date(yy, mm + 1, 0, 12));
    if (p === 'dia') return [oneDay, oneDay];
    if (p === 'hoy') return [t, t];
    if (p === 'semana') { const wd = (d.getDay() + 6) % 7; const a = addDays(t, -wd); return [a, addDays(a, 6)]; }
    if (p === 'quincena') return d.getDate() <= 15 ? [iso(new Date(y, m, 1, 12)), iso(new Date(y, m, 15, 12))] : [iso(new Date(y, m, 16, 12)), last(y, m)];
    if (p === 'mes') return [iso(new Date(y, m, 1, 12)), last(y, m)];
    if (p === 'mesant') return [iso(new Date(y, m - 1, 1, 12)), last(y, m - 1)];
    return from <= to ? [from, to] : [to, from];
  }
  const PERIODS = [['dia','Un día'],['hoy','Hoy'],['semana','Semana'],['quincena','Quincena'],['mes','Mes'],['mesant','Mes anterior'],['custom','Fechas']];
  function periodBar() {
    const [a, b] = range(per);
    return '<div class="cj-chips">' + PERIODS.map(([k, l]) => '<button class="cj-chip' + (per === k ? ' on' : '') + '" onclick="CJ.per(\'' + k + '\')">' + l + '</button>').join('') + '</div>' +
      (per === 'dia' ? '<div class="cj-date"><button class="btn secondary" onclick="CJ.oneShift(-1)">‹</button><input type="date" value="' + oneDay + '" onchange="CJ.oneDay(this.value)"><button class="btn secondary" onclick="CJ.oneShift(1)">›</button></div>' : '') +
      (per === 'custom' ? '<div class="cj-row"><input type="date" value="' + from + '" onchange="CJ.from(this.value)"><input type="date" value="' + to + '" onchange="CJ.to(this.value)"></div>' : '') +
      '<p class="hint">' + fmtD(a) + ' – ' + fmtD(b) + '</p>';
  }

  const day = (C, d) => C.days[d] || {};
  const trSum = x => Object.values(x.tr || {}).reduce((a, v) => a + num(v), 0);
  const isNomina = (C, t) => /n[oó]mina/i.test(tagOf(C, t.tag)?.name || '');
  const domisVal = (C, x) => num(x.domis) * (x.dp || C.domiPrice);
  const tagOf = (C, id) => C.tags.find(t => t.id === id);
  const provOf = (C, id) => C.provs.find(p => p.id === id);
  function totals(C, a, b) {
    const t = {venta:0, jugos:0, recibido:0, domis:0, ndomis:0, gastos:0, ingresos:0, dias:0, tr:0, acc:{}};
    Object.entries(C.days).forEach(([d, x]) => { if (d < a || d > b) return; t.tr += trSum(x); Object.entries(x.tr || {}).forEach(([k, v]) => { t.acc[k] = (t.acc[k] || 0) + num(v); }); t.venta += num(x.venta); t.jugos += num(x.jugos); t.recibido += num(x.recibido); t.ndomis += num(x.domis); t.domis += domisVal(C, x); if (num(x.venta)) t.dias++; });
    C.tx.forEach(x => { if (x.date < a || x.date > b) return; if (x.type === 'gasto') t.gastos += x.amount; else t.ingresos += x.amount; });
    t.balance = t.venta + t.domis + t.ingresos - t.gastos;
    return t;
  }
  const opt = (list, sel, empty) => (empty ? '<option value="">' + empty + '</option>' : '') + list.map(x => '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('');

  // ---------- Cuaderno del día ----------
  function calcDay(C) {
    const x = day(C, date), venta = num(x.venta), jugos = num(x.jugos), rec = num(x.recibido), dv = domisVal(C, x), tr = trSum(x);
    const g = C.tx.filter(t => t.date === date && t.type === 'gasto').reduce((a, t) => a + t.amount, 0);
    const ing = C.tx.filter(t => t.date === date && t.type === 'ingreso').reduce((a, t) => a + t.amount, 0);
    const bal = venta + dv + ing - g;
    return '<div class="cj-k">' +
      card('🧾 Venta total', money(venta), 'Incluye los jugos') +
      card('🍹 Jugos', money(jugos), pct(jugos, venta) + ' de la venta') +
      card('🍔 Venta sin jugos', money(venta - jugos), '') +
      card('🛵 Domis', money(dv), num(x.domis) + ' × ' + money(x.dp || C.domiPrice)) +
      card('💵 Recibido efectivo', money(rec), pct(rec, venta) + ' de la venta') +
      (tr ? card('📲 Transferencias', money(tr), pct(tr, venta) + ' de la venta') + cuadreCard(rec + tr, venta + dv) : card('📲 No efectivo', money(Math.max(venta - rec, 0)), 'Venta − recibido')) +
      card('💸 Gastos del día', money(g), '', 'neg') +
      (ing ? card('➕ Otros ingresos', money(ing), '') : '') +
      '</div><div class="cj-big ' + (bal < 0 ? 'neg' : '') + '"><small>BALANCE DEL DÍA</small><b>' + money(bal) + '</b><span>Venta + domis' + (ing ? ' + otros ingresos' : '') + ' − gastos</span></div>';
  }
  const cuadreCard = (cobrado, debe) => { const d = cobrado - debe; return card(Math.abs(d) < 1 ? '✅ Caja cuadra' : '⚠️ Caja no cuadra', Math.abs(d) < 1 ? money(cobrado) : (d < 0 ? 'Faltan ' : 'Sobran ') + money(Math.abs(d)), 'Efectivo + transferencias vs venta + domis', Math.abs(d) < 1 ? 'ok' : 'neg'); };
  const card = (l, v, s, cls) => '<div class="cj-card' + (cls ? ' ' + cls : '') + '"><small>' + l + '</small><b>' + v + '</b>' + (s ? '<span>' + s + '</span>' : '') + '</div>';
  function bookField(C, k, label, hint) {
    const v = day(C, date)[k];
    return '<label class="cj-field"><span>' + label + '</span><input type="number" inputmode="numeric" min="0" step="1" placeholder="0" value="' + (v ?? '') + '" oninput="CJ.setDay(\'' + k + '\',this.value)">' + (hint ? '<em>' + hint + '</em>' : '') + '</label>';
  }
  function txRow(C, t, showDate) {
    const tag = tagOf(C, t.tag), prov = provOf(C, t.prov);
    return '<div class="cj-tx"><i style="background:' + (tag?.color || '#bbb') + '"></i><div class="cj-txm"><b>' + esc(tag?.name || (t.type === 'gasto' ? 'Gasto' : 'Ingreso')) + '</b><span>' + [showDate ? fmtD(t.date) : '', t.inv ? 'Fact. ' + esc(t.inv) : '', prov ? esc(prov.name) : '', t.method ? esc(t.method) : '', t.note ? esc(t.note) : ''].filter(Boolean).join(' · ') + '</span></div><b class="' + (t.type === 'gasto' ? 'cj-neg' : 'cj-pos') + '">' + (t.type === 'gasto' ? '−' : '+') + money(t.amount) + '</b><button class="cj-ico" title="Editar" onclick="CJ.edit(\'' + t.id + '\')">✏️</button><button class="cj-ico" title="Borrar" onclick="CJ.delTx(\'' + t.id + '\')">🗑</button></div>';
  }
  function dueFixed(C) {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(date, i), dd = new Date(d + 'T12:00').getDate(), month = d.slice(0, 7);
      C.fixed.forEach(f => { if (num(f.day) === dd && !C.tx.some(t => t.fixed === f.id && t.date.slice(0, 7) === month)) out.push({f, d}); });
    }
    return out;
  }
  function vDia(C) {
    const gToday = C.tx.filter(t => t.date === date).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const due = dueFixed(C);
    const last = []; for (let i = 0; i < 7; i++) last.push(addDays(date, -i));
    return '<div class="cj-date"><button class="btn secondary" onclick="CJ.shift(-1)">‹</button><input type="date" value="' + date + '" onchange="CJ.date(this.value)"><button class="btn secondary" onclick="CJ.shift(1)">›</button>' + (date !== today() ? '<button class="btn secondary" onclick="CJ.date(\'' + today() + '\')">Hoy</button>' : '') + '</div>' +
      '<h2 class="cj-h">📒 Cuaderno · ' + fmtD(date) + '</h2>' +
      '<div class="cj-book">' + bookField(C, 'recibido', '💵 Recibido', 'Efectivo') + bookField(C, 'jugos', '🍹 Jugos', 'Ya va dentro de la venta') + bookField(C, 'venta', '🧾 Venta', 'Venta total del día') + bookField(C, 'domis', '🛵 Domis', 'Cantidad · ' + money(C.domiPrice) + ' c/u') + '</div>' +
      '<div class="panel cj-trp"><h3>📲 Transferencias del día</h3><div class="cj-trs">' + C.accounts.map(n => '<label class="cj-tri"><span>' + esc(n) + '</span><input type="number" inputmode="numeric" min="0" placeholder="0" value="' + (day(C, date).tr?.[n] ?? '') + '" oninput="CJ.setTr(\'' + esc(n).replace(/'/g, '') + '\',this.value)"></label>').join('') + '</div><p class="hint">Agrega o quita cuentas en 🏷️ Etiquetas y proveedores.</p></div>' +
      '<div id="cjCalc">' + calcDay(C) + '</div>' +
      (due.length ? '<div class="panel cj-due"><h3>⏰ Pagos fijos próximos</h3>' + due.map(({f, d}) => '<div class="cj-row"><span><b>' + esc(f.name) + '</b> · ' + fmtD(d) + '</span><span><b>' + money(f.amount) + '</b> <button class="btn" onclick="CJ.payFixed(\'' + f.id + '\',\'' + d + '\')">Registrar</button></span></div>').join('') + '</div>' : '') +
      '<div class="panel"><h3>💸 Gastos e ingresos del día</h3>' + quickForm(C) + (gToday.length ? gToday.map(t => txRow(C, t)).join('') : '<p class="hint">Sin movimientos este día.</p>') + '</div>' +
      '<div class="panel"><h3>Últimos 7 días</h3><div class="cj-scroll"><table class="cj-table"><tr><th>Día</th><th>Venta</th><th>Jugos</th><th>Domis</th><th>Gastos</th><th>Balance</th></tr>' +
      last.map(d => { const t = totals(C, d, d); return '<tr onclick="CJ.date(\'' + d + '\')"' + (d === date ? ' class="on"' : '') + '><td>' + fmtD(d) + '</td><td>' + money(t.venta) + '</td><td>' + money(t.jugos) + '</td><td>' + money(t.domis) + '</td><td class="cj-neg">' + money(t.gastos) + '</td><td><b>' + money(t.balance) + '</b></td></tr>'; }).join('') + '</table></div></div>';
  }
  function quickForm(C) {
    const tags = C.tags.filter(t => t.type === 'gasto');
    return '<div class="cj-quick"><input id="qAmt" type="number" inputmode="numeric" placeholder="Valor del gasto"><select id="qTag">' + opt(tags, '', 'Etiqueta') + '</select><select id="qProv">' + opt(C.provs, '', 'Proveedor') + '</select><select id="qMet"><option>Efectivo</option><option>Transferencia</option></select><input id="qInv" placeholder="N° factura (opcional)"><input id="qNote" placeholder="Nota (opcional)"><button class="btn" onclick="CJ.quick()">+ Agregar gasto</button></div>';
  }

  // ---------- Gastos e ingresos ----------
  function vMov(C) {
    const e = editId ? C.tx.find(t => t.id === editId) : null;
    const type = e ? e.type : txType, tags = C.tags.filter(t => t.type === type);
    const [a, b] = range(per);
    let list = C.tx.filter(t => t.date >= a && t.date <= b && (!fTag || t.tag === fTag) && (!fProv || t.prov === fProv));
    list.sort(sort === 'valor' ? (x, y) => y.amount - x.amount : (x, y) => (y.date.localeCompare(x.date)) || ((y.ts || 0) - (x.ts || 0)));
    const g = list.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0), i = list.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
    return '<div class="panel cj-form"><h3>' + (e ? '✏️ Editar movimiento' : 'Nuevo movimiento') + '</h3>' +
      '<div class="cj-seg"><button class="' + (type === 'gasto' ? 'on neg' : '') + '" onclick="CJ.type(\'gasto\')">− Gasto</button><button class="' + (type === 'ingreso' ? 'on pos' : '') + '" onclick="CJ.type(\'ingreso\')">+ Ingreso</button></div>' +
      '<div class="grid"><label class="field">Valor<input id="mAmt" type="number" inputmode="numeric" value="' + (e ? e.amount : '') + '"></label><label class="field">Fecha<input id="mDate" type="date" value="' + (e ? e.date : date) + '"></label>' +
      '<label class="field">Etiqueta<select id="mTag">' + opt(tags, e?.tag, 'Sin etiqueta') + '</select></label>' +
      (type === 'gasto' ? '<label class="field">Proveedor<select id="mProv" onchange="CJ.provPick(this.value)">' + opt(C.provs, e?.prov, 'Sin proveedor') + '</select></label><label class="field">N° factura<input id="mInv" value="' + esc(e?.inv || '') + '" placeholder="Opcional"></label>' : '') +
      '<label class="field">Método<select id="mMet">' + ['Efectivo', 'Transferencia'].map(m => '<option' + (e?.method === m ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></label><label class="field">Nota<input id="mNote" value="' + esc(e?.note || '') + '"></label></div>' +
      '<button class="btn" onclick="CJ.saveTx()">' + (e ? 'Guardar cambios' : 'Agregar') + '</button>' + (e ? ' <button class="btn secondary" onclick="CJ.cancel()">Cancelar</button>' : '') +
      (!tags.length ? '<p class="hint">Aún no hay etiquetas de ' + type + '. Créalas en 🏷️ Etiquetas y proveedores.</p>' : '') + '</div>' +
      periodBar() +
      '<div class="cj-row cj-filters"><select onchange="CJ.fTag(this.value)">' + opt(C.tags, fTag, 'Todas las etiquetas') + '</select><select onchange="CJ.fProv(this.value)">' + opt(C.provs, fProv, 'Todos los proveedores') + '</select><select onchange="CJ.sort(this.value)"><option value="fecha"' + (sort === 'fecha' ? ' selected' : '') + '>Por fecha</option><option value="valor"' + (sort === 'valor' ? ' selected' : '') + '>Por valor</option></select></div>' +
      '<div class="cj-k">' + card('💸 Gastos', money(g), list.filter(t => t.type === 'gasto').length + ' movimientos', 'neg') + card('➕ Ingresos extra', money(i), list.filter(t => t.type === 'ingreso').length + ' movimientos') + '</div>' +
      '<div class="panel">' + (list.length ? list.map(t => txRow(C, t, true)).join('') : '<p class="hint">No hay movimientos con estos filtros.</p>') + '</div>';
  }

  // ---------- Reportes ----------
  function bars(rows, total, click) {
    if (!rows.length) return '<p class="hint">Sin datos en este periodo.</p>';
    const max = Math.max(...rows.map(r => r.v), 1);
    return rows.map(r => '<div class="cj-bar' + (click ? ' cj-click' : '') + '"' + (click ? ' role="button" tabindex="0" onclick="CJ.prov(\'' + esc(r.k) + '\')"' : '') + '><div class="cj-bl"><span><i style="background:' + r.c + '"></i>' + esc(r.n) + '</span><b>' + money(r.v) + ' <em>' + pct(r.v, total) + '</em></b></div><div class="cj-bt"><div style="width:' + (r.v / max * 100) + '%;background:' + r.c + '"></div></div>' + (click ? '<span class="cj-go">Ver facturas ›</span>' : '') + '</div>').join('');
  }
  function chart(C, a, b) {
    const days = []; for (let d = a; d <= b && days.length < 62; d = addDays(d, 1)) days.push(d);
    const data = days.map(d => { const t = totals(C, d, d); return {d, v: t.venta + t.domis, g: t.gastos}; });
    const max = Math.max(...data.map(x => Math.max(x.v, x.g)), 1), w = Math.max(days.length * 22, 300), h = 150;
    const bw = (w - 10) / days.length;
    return '<div class="cj-scroll"><svg width="' + w + '" height="' + (h + 24) + '" role="img" aria-label="Ventas y gastos por día">' + data.map((x, i) => {
      const xv = 5 + i * bw, hv = x.v / max * h, hg = x.g / max * h;
      return '<rect x="' + (xv + 2) + '" y="' + (h - hv) + '" width="' + (bw / 2 - 2) + '" height="' + hv + '" rx="3" fill="#f47721"><title>' + fmtD(x.d) + ' venta ' + money(x.v) + '</title></rect><rect x="' + (xv + bw / 2) + '" y="' + (h - hg) + '" width="' + (bw / 2 - 2) + '" height="' + hg + '" rx="3" fill="#39251c"><title>' + fmtD(x.d) + ' gastos ' + money(x.g) + '</title></rect>' +
        ((days.length <= 16 || i % 3 === 0) ? '<text x="' + (xv + bw / 2) + '" y="' + (h + 16) + '" font-size="10" text-anchor="middle" fill="#907b6d">' + new Date(x.d + 'T12:00').getDate() + '</text>' : '');
    }).join('') + '</svg></div><p class="hint"><span class="cj-dot" style="background:#f47721"></span> Venta + domis &nbsp; <span class="cj-dot" style="background:#39251c"></span> Gastos</p>';
  }
  function vProv(C) {
    const [a, b] = range(per), id = provView, p = provOf(C, id);
    const all = C.tx.filter(x => x.type === 'gasto' && x.date >= a && x.date <= b);
    const list = all.filter(x => (x.prov || '') === id).sort((x, y) => y.date.localeCompare(x.date) || ((y.ts || 0) - (x.ts || 0)));
    const total = list.reduce((s, x) => s + x.amount, 0), allG = all.reduce((s, x) => s + x.amount, 0);
    const ef = list.filter(x => x.method === 'Efectivo').reduce((s, x) => s + x.amount, 0);
    const m = {}; list.forEach(x => { m[x.tag || ''] = (m[x.tag || ''] || 0) + x.amount; });
    const byTag = Object.entries(m).map(([k, v]) => { const o = tagOf(C, k); return {k, n: o?.name || 'Sin etiqueta', c: o?.color || '#b9a99b', v}; }).sort((x, y) => y.v - x.v);
    return '<button class="btn secondary" onclick="CJ.prov(null)">← Volver a reportes</button>' +
      '<h2 class="cj-h">🚚 ' + esc(p?.name || 'Sin proveedor') + '</h2>' + (p?.phone ? '<p class="hint">📞 <a href="tel:' + esc(p.phone) + '">' + esc(p.phone) + '</a></p>' : '') +
      periodBar() +
      '<div class="cj-k">' + card('🧾 Facturas', String(list.length), 'en este periodo') + card('💸 Total', money(total), pct(total, allG) + ' de todos los gastos', 'neg') + card('📊 Promedio', money(list.length ? total / list.length : 0), 'por factura') + card('💵 Efectivo', money(ef), '') + card('📲 Transferencia', money(total - ef), '') + '</div>' +
      (byTag.length > 1 ? '<div class="panel"><h3>Por etiqueta</h3>' + bars(byTag, total) + '</div>' : '') +
      '<div class="panel"><h3>Facturas</h3>' + (list.length ? list.map(t => txRow(C, t, true)).join('') : '<p class="hint">No hay facturas de este proveedor en el periodo.</p>') + '</div>';
  }
  function cierre(C, a, b, t) {
    const inR = C.tx.filter(x => x.date >= a && x.date <= b), gs = inR.filter(x => x.type === 'gasto');
    const nomG = gs.filter(x => isNomina(C, x)).reduce((s, x) => s + x.amount, 0);
    const gastos = gs.filter(x => !isNomina(C, x)), gTot = gastos.reduce((s, x) => s + x.amount, 0);
    const gEf = gastos.filter(x => x.method === 'Efectivo').reduce((s, x) => s + x.amount, 0);
    const iEf = inR.filter(x => x.type === 'ingreso' && x.method === 'Efectivo').reduce((s, x) => s + x.amount, 0);
    const cobrado = t.recibido + t.tr, debe = t.venta + t.domis, dif = cobrado - debe;
    const entradas = t.venta + t.domis + t.ingresos, bruta = entradas - gTot;
    const nomina = typeof window.TOQUIN_PAYRANGE === 'function' ? window.TOQUIN_PAYRANGE(a, b) : 0, neta = bruta - nomina;
    const pc = v => entradas ? ' <em>' + pct(v, entradas) + '</em>' : '';
    const L = (l, v, cls, extra) => '<div class="cj-cl' + (cls ? ' ' + cls : '') + '"><span>' + l + '</span><b>' + money(v) + (extra || '') + '</b></div>';
    const accs = [...new Set([...C.accounts, ...Object.keys(t.acc)])].filter(n => t.acc[n]);
    const SPLIT = [['Sueldo Toquijefes', 40], ['Abono a préstamo', 30], ['Colchón', 20], ['Reinversión', 10]];
    return '<div class="panel cj-cierre"><h2>🧮 Cierre ' + (a === b ? 'del día' : 'del periodo') + '</h2>' +
      '<h3>💰 Cómo entró la plata</h3>' + L('💵 Efectivo', t.recibido) + accs.map(n => L('↳ 📲 ' + esc(n), t.acc[n], 'sub')).join('') + L('📲 Total transferencias', t.tr) + L('Total cobrado', cobrado, 'tot') +
      L('🧾 Venta anotada (con jugos)', t.venta) + L('🛵 Domis (' + t.ndomis + ')', t.domis) +
      (t.venta || cobrado ? '<div class="cj-chk ' + (Math.abs(dif) < 1 ? 'ok' : 'bad') + '">' + (Math.abs(dif) < 1 ? '✅ La caja cuadra: lo cobrado es igual a venta + domis' : '⚠️ La caja no cuadra: ' + (dif < 0 ? 'faltan ' : 'sobran ') + money(Math.abs(dif)) + ' (cobrado ' + money(cobrado) + ' vs venta + domis ' + money(debe) + ')') + '</div>' : '') +
      '<h3>💸 Lo que salió</h3>' + L('Gastos en efectivo', gEf) + L('Gastos por transferencia', gTot - gEf) + L('Total gastos', gTot, 'tot neg') + (nomG ? '<p class="hint">Adelantos de nómina registrados: ' + money(nomG) + ' (no se restan aquí porque ya van en la nómina).</p>' : '') +
      '<div class="cj-chk info">💵 Efectivo que debe haber en caja: <b>' + money(t.recibido + iEf - gEf) + '</b><br><small>Efectivo recibido' + (iEf ? ' + otros ingresos en efectivo' : '') + ' − gastos pagados en efectivo</small></div>' +
      '<h3>📈 Resultado</h3>' + L('Total entradas', entradas, '', pc(entradas)) + L('− Gastos', -gTot, '', pc(gTot)) +
      '<div class="cj-big ' + (bruta < 0 ? 'neg' : '') + '" style="background:#f47721"><small>GANANCIA BRUTA</small><b>' + money(bruta) + '</b><span>' + pct(bruta, entradas) + ' de las entradas</span></div>' +
      L('− Nómina del periodo (según horario)', -nomina, '', pc(nomina)) +
      '<div class="cj-big ' + (neta < 0 ? 'neg' : '') + '"><small>GANANCIA NETA</small><b>' + money(neta) + '</b><span>' + pct(neta, entradas) + ' de las entradas</span></div>' +
      '<h3>Reparto de la ganancia neta</h3>' + SPLIT.map(([k, f]) => L(k + ' · ' + f + '%', neta > 0 ? Math.round(neta * f / 100) : 0)).join('') + (neta <= 0 ? '<p class="hint">No hay ganancia neta para repartir en este periodo.</p>' : '') +
      '</div>';
  }
  function vRep(C) {
    if (provView !== null) return vProv(C);
    const [a, b] = range(per), t = totals(C, a, b);
    const inR = C.tx.filter(x => x.date >= a && x.date <= b);
    const group = (type, key, lookup) => { const m = {}; inR.filter(x => x.type === type).forEach(x => { const k = x[key] || ''; m[k] = (m[k] || 0) + x.amount; }); return Object.entries(m).map(([k, v]) => { const o = lookup(k); return {k, n: o?.name || (key === 'tag' ? 'Sin etiqueta' : 'Sin proveedor'), c: o?.color || '#b9a99b', v}; }).sort((x, y) => y.v - x.v); };
    const byTag = group('gasto', 'tag', k => tagOf(C, k)), byProv = group('gasto', 'prov', k => { const p = provOf(C, k); return p ? {name: p.name, color: '#39251c'} : null; }), inTag = group('ingreso', 'tag', k => tagOf(C, k));
    return periodBar() +
      '<div class="cj-k">' + card('🧾 Ventas', money(t.venta), t.dias + ' días anotados') + card('🍹 Jugos', money(t.jugos), pct(t.jugos, t.venta) + ' de la venta') + card('🛵 Domis', money(t.domis), t.ndomis + ' domicilios') + card('💵 Recibido efectivo', money(t.recibido), pct(t.recibido, t.venta)) + card('➕ Otros ingresos', money(t.ingresos), '') + card('💸 Gastos', money(t.gastos), pct(t.gastos, t.venta + t.domis + t.ingresos) + ' de lo que entró', 'neg') + '</div>' +
      cierre(C, a, b, t) +
      '<div class="panel"><h3>Día a día</h3>' + chart(C, a, b) + '</div>' +
      '<div class="panel"><h3>Gastos por etiqueta</h3>' + bars(byTag, t.gastos) + '</div>' +
      '<div class="panel"><h3>Gastos por proveedor</h3><p class="hint">Toca un proveedor para ver sus facturas.</p>' + bars(byProv, t.gastos, true) + '</div>' +
      (inTag.length ? '<div class="panel"><h3>Otros ingresos por etiqueta</h3>' + bars(inTag, t.ingresos) + '</div>' : '');
  }

  // ---------- Etiquetas, proveedores y pagos fijos ----------
  function vConf(C) {
    const tagRow = t => '<div class="cj-row cj-edit"><input type="color" value="' + t.color + '" onchange="CJ.tagSet(\'' + t.id + '\',\'color\',this.value)"><input value="' + esc(t.name) + '" onchange="CJ.tagSet(\'' + t.id + '\',\'name\',this.value)"><span class="cj-badge ' + (t.type === 'gasto' ? 'neg' : 'pos') + '">' + t.type + '</span><button class="cj-ico" onclick="CJ.delTag(\'' + t.id + '\')">🗑</button></div>';
    return '<div class="panel"><h3>📲 Cuentas para transferencias</h3>' + C.accounts.map(n => '<div class="cj-row"><b>' + esc(n) + '</b><button class="cj-ico" onclick="CJ.delAcc(\'' + esc(n) + '\')">🗑</button></div>').join('') + '<div class="cj-row cj-add"><input id="aName" placeholder="Nueva cuenta (ej: Bancolombia)"><button class="btn" onclick="CJ.addAcc()">Agregar</button></div></div>' +
      '<div class="panel"><h3>🏷️ Etiquetas</h3>' + (C.tags.length ? C.tags.map(tagRow).join('') : '<p class="hint">Aún no hay etiquetas.</p><button class="btn secondary" onclick="CJ.suggest()">Agregar etiquetas sugeridas</button>') +
      '<div class="cj-row cj-add"><input id="tName" placeholder="Nueva etiqueta"><select id="tType"><option value="gasto">Gasto</option><option value="ingreso">Ingreso</option></select><input id="tColor" type="color" value="' + COLORS[C.tags.length % COLORS.length] + '"><button class="btn" onclick="CJ.addTag()">Agregar</button></div></div>' +
      '<div class="panel"><h3>🚚 Proveedores</h3>' + (C.provs.length ? C.provs.map(p => '<div class="cj-row cj-edit"><input value="' + esc(p.name) + '" onchange="CJ.provSet(\'' + p.id + '\',\'name\',this.value)"><input placeholder="Teléfono" inputmode="tel" value="' + esc(p.phone || '') + '" onchange="CJ.provSet(\'' + p.id + '\',\'phone\',this.value)"><select onchange="CJ.provSet(\'' + p.id + '\',\'tag\',this.value)">' + opt(C.tags.filter(t => t.type === 'gasto'), p.tag, 'Etiqueta por defecto') + '</select><button class="cj-ico" onclick="CJ.delProv(\'' + p.id + '\')">🗑</button></div>').join('') : '<p class="hint">Aún no hay proveedores.</p>') +
      '<div class="cj-row cj-add"><input id="pName" placeholder="Nuevo proveedor"><input id="pPhone" placeholder="Teléfono" inputmode="tel"><button class="btn" onclick="CJ.addProv()">Agregar</button></div></div>' +
      '<div class="panel"><h3>⏰ Pagos fijos (recordatorios)</h3><p class="hint">Arriendo, servicios, cuotas… Aparecen en el cuaderno 7 días antes para registrarlos con un toque.</p>' + C.fixed.map(f => '<div class="cj-row"><span><b>' + esc(f.name) + '</b> · día ' + f.day + ' de cada mes' + (tagOf(C, f.tag) ? ' · ' + esc(tagOf(C, f.tag).name) : '') + (provOf(C, f.prov) ? ' · ' + esc(provOf(C, f.prov).name) : '') + '</span><span><b>' + money(f.amount) + '</b> <button class="cj-ico" onclick="CJ.delFixed(\'' + f.id + '\')">🗑</button></span></div>').join('') +
      '<div class="grid"><label class="field">Nombre<input id="fName" placeholder="Ej: Arriendo"></label><label class="field">Valor<input id="fAmt" type="number" inputmode="numeric"></label><label class="field">Día del mes<input id="fDay" type="number" min="1" max="31"></label><label class="field">Etiqueta<select id="fTag">' + opt(C.tags.filter(t => t.type === 'gasto'), '', 'Sin etiqueta') + '</select></label><label class="field">Proveedor<select id="fProv">' + opt(C.provs, '', 'Sin proveedor') + '</select></label></div><button class="btn" onclick="CJ.addFixed()">Agregar pago fijo</button></div>' +
      '<div class="panel"><h3>🛵 Valor del domicilio</h3><div class="cj-row"><input type="number" inputmode="numeric" value="' + C.domiPrice + '" onchange="CJ.domiPrice(this.value)"><span class="hint">Se usa para calcular lo que entra por domis. Los días ya anotados conservan su valor.</span></div></div>';
  }

  const CSS = '.cj-tabs,.cj-chips{display:flex;gap:7px;overflow:auto;padding:4px 0 10px}.cj-tabs button,.cj-chip{border:1px solid var(--l);background:var(--p);border-radius:99px;padding:9px 14px;white-space:nowrap;font-weight:800;color:var(--b)}.cj-tabs button.on,.cj-chip.on{background:var(--b);color:#fff}.cj-chip{padding:7px 12px;font-size:13px}' +
    '.cj-date{display:flex;gap:6px;align-items:center}.cj-date input{flex:1}.cj-h{margin:14px 0 8px}.cj-book{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cj-field{display:flex;flex-direction:column;background:#fff;border:2px solid var(--l);border-radius:16px;padding:12px;gap:4px}.cj-field span{font-weight:900}.cj-field input{font-size:22px;font-weight:900;border:0;background:#fff3df;border-radius:10px;padding:10px;width:100%}.cj-field em{font-size:12px;color:var(--m);font-style:normal}' +
    '.cj-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:12px 0}.cj-card{background:#fff0dc;border-radius:14px;padding:11px}.cj-card small{display:block;color:var(--m);font-weight:700}.cj-card b{font-size:18px;display:block}.cj-card span{font-size:12px;color:var(--m)}.cj-card.neg{background:#fbe3df}.cj-card.neg b{color:#a12a1c}' +
    '.cj-big{background:var(--b);color:#fff;border-radius:18px;padding:16px;margin:10px 0}.cj-big small{display:block;letter-spacing:.08em;font-weight:900;color:#f5e5d3}.cj-big b{font-size:32px;display:block}.cj-big span{font-size:12px;color:#f5e5d3}.cj-big.neg{background:#a12a1c}' +
    '.cj-quick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px}.cj-quick button{grid-column:1/-1}.cj-tx{display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--l)}.cj-tx i{width:12px;height:12px;border-radius:99px;flex:none}.cj-txm{flex:1;min-width:0}.cj-txm b{display:block}.cj-txm span{font-size:12px;color:var(--m)}.cj-neg{color:#a12a1c}.cj-pos{color:#387b52}.cj-ico{border:0;background:none;font-size:16px;padding:4px;cursor:pointer}' +
    '.cj-row{display:flex;gap:8px;align-items:center;justify-content:space-between;margin:6px 0}.cj-row input,.cj-row select{flex:1;min-width:0}.cj-edit input[type=color],.cj-add input[type=color]{flex:none;width:42px;height:38px;padding:2px}.cj-badge{font-size:11px;font-weight:900;padding:3px 8px;border-radius:99px;background:#e6f2ea;color:#387b52}.cj-badge.neg{background:#fbe3df;color:#a12a1c}' +
    '.cj-seg{display:flex;gap:6px;margin-bottom:10px}.cj-seg button{flex:1;padding:11px;border-radius:12px;border:1px solid var(--l);background:#fff;font-weight:900}.cj-seg .on.neg{background:#a12a1c;color:#fff}.cj-seg .on.pos{background:#387b52;color:#fff}' +
    '.cj-scroll{overflow:auto}.cj-table{width:100%;border-collapse:collapse;font-size:13px;min-width:480px}.cj-table td,.cj-table th{padding:8px 6px;border-bottom:1px solid var(--l);text-align:right}.cj-table td:first-child,.cj-table th:first-child{text-align:left}.cj-table tr{cursor:pointer}.cj-table tr.on{background:#fff0dc}' +
    '.cj-bar{margin:8px 0}.cj-bl{display:flex;justify-content:space-between;gap:8px;font-size:14px}.cj-bl i,.cj-dot{display:inline-block;width:10px;height:10px;border-radius:99px;margin-right:6px}.cj-bl em{color:var(--m);font-style:normal;font-weight:600;font-size:12px}.cj-bt{background:#f3e6d6;border-radius:99px;height:10px;margin-top:4px;overflow:hidden}.cj-bt div{height:100%;border-radius:99px}.cj-due{border-color:#f47721;background:#fff6ea}.cj-click{cursor:pointer;padding:8px;margin:4px -8px;border-radius:12px}.cj-click:hover,.cj-click:active{background:#fff0dc}.cj-go{display:block;text-align:right;font-size:12px;font-weight:800;color:#f47721;margin-top:3px}' +
    '.cj-sum{border:2px dashed #f47721;background:#fff6ea}.cj-card.ok{background:#e6f2ea}.cj-card.ok b{color:#1f6b3a}.cj-trs{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}.cj-tri{display:flex;flex-direction:column;gap:4px;font-weight:800}.cj-tri input{font-size:18px;font-weight:800;padding:9px;border-radius:10px;border:1px solid var(--l);background:#fff3df}.cj-cierre h3{margin:16px 0 6px}.cj-cl{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed var(--l)}.cj-cl.sub{padding-left:14px;font-size:14px;color:var(--m)}.cj-cl.tot{font-weight:900;border-bottom:0}.cj-cl.neg b{color:#a12a1c}.cj-cl em{color:var(--m);font-style:normal;font-weight:600;font-size:12px;margin-left:6px}.cj-chk{border-radius:14px;padding:12px;margin:10px 0;font-weight:800}.cj-chk.ok{background:#e6f2ea;border:2px solid #387b52;color:#1f6b3a}.cj-chk.bad{background:#fbe3df;border:2px solid #a12a1c;color:#8c1d18}.cj-chk.info{background:#fff6ea;border:2px solid #f47721;color:#6b3410}.cj-chk small{font-weight:600}@media(max-width:600px){.cj-quick{grid-template-columns:1fr}.cj-field input{font-size:20px}}';

  function render() {
    const C = st();
    const tabs = [['dia', '📒 Cuaderno'], ['mov', '💸 Gastos e ingresos'], ['rep', '📊 Reportes'], ['conf', '🏷️ Etiquetas y proveedores']];
    return '<style>' + CSS + '</style><div class="cj"><h1>Caja diaria</h1><div class="cj-tabs">' + tabs.map(([k, l]) => '<button class="' + (view === k ? 'on' : '') + '" onclick="CJ.view(\'' + k + '\')">' + l + '</button>').join('') + '</div>' +
      (view === 'dia' ? vDia(C) : view === 'mov' ? vMov(C) : view === 'rep' ? vRep(C) : vConf(C)) + '</div>';
  }

  // Resumen para el cierre de quincena.
  function summary(a, b) {
    const C = st(), t = totals(C, a, b);
    if (!t.venta && !t.gastos && !t.ingresos) return '';
    return '<div class="panel cj-sum" style="border:2px dashed #f47721;background:#fff6ea"><h2>📒 Según la Caja diaria</h2>' +
      [['Venta total (con jugos)', t.venta], ['Recibido en efectivo', t.recibido], ['No efectivo (venta − recibido)', Math.max(t.venta - t.recibido, 0)], ['Domis (' + t.ndomis + ')', t.domis], ['Otros ingresos', t.ingresos], ['Gastos registrados', t.gastos]].map(([l, v]) => '<div class="row" style="margin:5px 0"><span>' + l + '</span><b>' + money(v) + '</b></div>').join('') +
      '<button class="btn secondary" onclick="CJ.toClose(\'' + a + '\',\'' + b + '\')">Pasar efectivo, domis y gastos al cierre</button><p class="hint">Revisa los valores y luego toca "Guardar y calcular". Las transferencias repártelas en las cuentas. Si en los gastos hay adelantos de nómina, no los pases a compras (ya se descuentan en la nómina).</p></div>';
  }

  const tx = (C, o) => { C.tx.push({id: uid(), ts: Date.now(), ...o}); };
  window.CJ = {
    view: v => { view = v; editId = null; provView = null; rr(); },
    prov: id => { provView = id; view = 'rep'; rr(); window.scrollTo(0, 0); },
    date: d => { if (d) { date = d; rr(); } },
    shift: n => { date = addDays(date, n); rr(); },
    per: p => { per = p; rr(); }, from: v => { from = v; rr(); }, to: v => { to = v; rr(); },
    fTag: v => { fTag = v; rr(); }, fProv: v => { fProv = v; rr(); }, sort: v => { sort = v; rr(); },
    type: t => { if (editId) { const e = st().tx.find(x => x.id === editId); if (e) e.type = t; } txType = t; rr(); },
    oneDay: d => { if (d) { oneDay = d; rr(); } },
    oneShift: n => { oneDay = addDays(oneDay, n); rr(); },
    setTr: (n, v) => {
      const C = st(), x = (C.days[date] ||= {});
      x.tr ||= {};
      if (v === '') delete x.tr[n]; else x.tr[n] = num(v);
      if (!Object.keys(x.tr).length) delete x.tr;
      if (!Object.keys(x).filter(z => z !== 'dp').length) delete C.days[date];
      const el = document.getElementById('cjCalc'); if (el) el.innerHTML = calcDay(C);
      saveSoon();
    },
    addAcc: () => { const C = st(), n = document.getElementById('aName').value.trim().replace(/'/g, ''); if (!n || C.accounts.includes(n)) return; C.accounts.push(n); commit(); },
    delAcc: n => { const C = st(); if (!confirm('¿Quitar la cuenta ' + n + '? Lo ya anotado se conserva en los reportes.')) return; C.accounts = C.accounts.filter(x => x !== n); commit(); },
    setDay: (k, v) => {
      const C = st(), x = (C.days[date] ||= {});
      if (v === '') delete x[k]; else x[k] = num(v);
      if (k === 'domis') x.dp = C.domiPrice;
      if (!Object.keys(x).filter(z => z !== 'dp').length) delete C.days[date];
      const el = document.getElementById('cjCalc'); if (el) el.innerHTML = calcDay(C);
      saveSoon();
    },
    quick: () => {
      const C = st(), amount = num(document.getElementById('qAmt').value);
      if (!amount) return alert('Escribe el valor del gasto.');
      const prov = document.getElementById('qProv').value;
      tx(C, {date, type: 'gasto', amount, tag: document.getElementById('qTag').value || provOf(C, prov)?.tag || '', prov, method: document.getElementById('qMet').value, inv: document.getElementById('qInv').value.trim(), note: document.getElementById('qNote').value.trim()});
      commit();
    },
    provPick: id => { const p = provOf(st(), id), sel = document.getElementById('mTag'); if (p?.tag && sel && !sel.value) sel.value = p.tag; },
    saveTx: () => {
      const C = st(), amount = num(document.getElementById('mAmt').value);
      if (!amount) return alert('Escribe el valor.');
      const e = editId ? C.tx.find(t => t.id === editId) : null, type = e ? e.type : txType;
      const o = {date: document.getElementById('mDate').value || date, type, amount, tag: document.getElementById('mTag').value, prov: type === 'gasto' ? (document.getElementById('mProv')?.value || '') : '', method: document.getElementById('mMet').value, inv: type === 'gasto' ? (document.getElementById('mInv')?.value.trim() || '') : '', note: document.getElementById('mNote').value.trim()};
      if (e) Object.assign(e, o); else tx(C, o);
      editId = null; commit();
    },
    edit: id => { editId = id; view = 'mov'; rr(); window.scrollTo(0, 0); },
    cancel: () => { editId = null; rr(); },
    delTx: id => { if (!confirm('¿Borrar este movimiento?')) return; const C = st(); C.tx = C.tx.filter(t => t.id !== id); commit(); },
    payFixed: (id, d) => { const C = st(), f = C.fixed.find(x => x.id === id); if (!f) return; tx(C, {date: d, type: 'gasto', amount: f.amount, tag: f.tag || '', prov: f.prov || '', method: 'Transferencia', note: f.name, fixed: f.id}); commit(); },
    suggest: () => { const C = st(); SUGGESTED.forEach(([n, t], i) => { if (!C.tags.some(x => x.name === n)) C.tags.push({id: uid(), name: n, type: t, color: COLORS[i % COLORS.length]}); }); commit(); },
    addTag: () => { const C = st(), n = document.getElementById('tName').value.trim(); if (!n) return; C.tags.push({id: uid(), name: n, type: document.getElementById('tType').value, color: document.getElementById('tColor').value}); commit(); },
    tagSet: (id, k, v) => { const t = tagOf(st(), id); if (t) { t[k] = k === 'name' ? (v.trim() || t.name) : v; commit(); } },
    delTag: id => { const C = st(), used = C.tx.filter(t => t.tag === id).length; if (!confirm(used ? 'Esta etiqueta tiene ' + used + ' movimientos. Quedarán "Sin etiqueta". ¿Borrarla?' : '¿Borrar esta etiqueta?')) return; C.tags = C.tags.filter(t => t.id !== id); commit(); },
    addProv: () => { const C = st(), n = document.getElementById('pName').value.trim(); if (!n) return; C.provs.push({id: uid(), name: n, phone: document.getElementById('pPhone').value.trim(), tag: ''}); commit(); },
    provSet: (id, k, v) => { const p = provOf(st(), id); if (p) { p[k] = k === 'name' ? (v.trim() || p.name) : v; commit(); } },
    delProv: id => { const C = st(), used = C.tx.filter(t => t.prov === id).length; if (!confirm(used ? 'Este proveedor tiene ' + used + ' movimientos. Quedarán "Sin proveedor". ¿Borrarlo?' : '¿Borrar este proveedor?')) return; C.provs = C.provs.filter(p => p.id !== id); commit(); },
    addFixed: () => { const C = st(), n = document.getElementById('fName').value.trim(), amount = num(document.getElementById('fAmt').value), d = num(document.getElementById('fDay').value); if (!n || !amount || d < 1 || d > 31) return alert('Completa nombre, valor y día (1 a 31).'); C.fixed.push({id: uid(), name: n, amount, day: d, tag: document.getElementById('fTag').value, prov: document.getElementById('fProv').value}); commit(); },
    delFixed: id => { if (!confirm('¿Borrar este pago fijo?')) return; const C = st(); C.fixed = C.fixed.filter(f => f.id !== id); commit(); },
    domiPrice: v => { const C = st(), n = num(v); if (n > 0) { C.domiPrice = n; commit(); } },
    toClose: (a, b) => { const t = totals(st(), a, b), set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; }; set('cCash', t.recibido); set('cDom', t.domis); set('cCogs', t.gastos); alert('Listo. Revisa los valores, reparte las transferencias en las cuentas y toca "Guardar y calcular".'); }
  };
  window.TOQUIN_CAJA = {render, summary};
})();
