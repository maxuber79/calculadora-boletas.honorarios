const DEBUG = false;

// ── Tasas históricas por año ──────────────────────────────────────────
// Fuente: SII — Ley 21.133, calendario de aumento gradual
// https://www.sii.cl/destacados/boletas_honorarios/aumento_gradual.html
// 2028 en adelante se mantiene en 17% (tasa definitiva)
const TASAS = {
  2024: 13.75,
  2025: 14.50,
  2026: 15.25,
  2027: 16.00,
  2028: 17.00,
  2029: 17.00,
  2030: 17.00,
};

const TASA_MAX = 17.00;

let anioActivo = 2026;

/**
 * Inicializa los pills de año.
 */
function initYearPills() {
  const container = document.getElementById('yearPills');
  container.innerHTML = '';
  Object.keys(TASAS).sort((a,b)=>b-a).forEach(y => {
    const pill = document.createElement('button');
    pill.className = 'year-pill' + (parseInt(y) === anioActivo ? ' active' : '');
    pill.textContent = y;
    pill.setAttribute('role', 'radio');
    pill.setAttribute('aria-checked', parseInt(y) === anioActivo);
    pill.setAttribute('aria-label', 'Año ' + y);
    pill.onclick = () => { setAnio(parseInt(y)); saveState(); };
    container.appendChild(pill);
  });
}

/**
 * Actualiza el año activo y la tasa mostrada.
 * @param {number} y
 */
function setAnio(y) {
  anioActivo = y;
  document.querySelectorAll('.year-pill').forEach(p => {
    const isActive = p.textContent == y;
    p.classList.toggle('active', isActive);
    p.setAttribute('aria-checked', isActive);
  });
  document.getElementById('yearLabel').textContent = y;
  const tasa = getTasa();
  document.getElementById('tasaDisplay').textContent = tasa.toFixed(2) + '%';
  document.getElementById('tasaCustom').value = '';
  if (DEBUG) console.log('[setAnio]', y, tasa);
}

/**
 * Retorna la tasa efectiva: personalizada si fue ingresada, o la del año activo.
 * @returns {number}
 */
function getTasa() {
  const custom = parseFloat(document.getElementById('tasaCustom').value);
  if (!isNaN(custom) && custom > 0) return custom;
  return TASAS[anioActivo] ?? TASA_MAX;
}

/**
 * Sincroniza pct2 al cambiar pct1.
 */
function syncPct() {
  const input = document.getElementById('pct1');
  let v = parseFloat(input.value);
  if (isNaN(v) || v < 1) v = 1;
  if (v > 99) v = 99;
  input.value = v;
  document.getElementById('pct2').value = 100 - v;
}

/**
 * Toggle campo tasa personalizada.
 */
function toggleTasaCustom() {
  const chk = document.getElementById('chkTasaCustom');
  chk.checked = !chk.checked;
  const row = chk.closest('.toggle-row');
  row.setAttribute('aria-checked', chk.checked);
  const block = document.getElementById('tasaCustomBlock');
  block.style.display = chk.checked ? 'block' : 'none';
  if (!chk.checked) {
    document.getElementById('tasaCustom').value = '';
    document.getElementById('tasaDisplay').textContent = getTasa().toFixed(2) + '%';
  }
  saveState();
  if (DEBUG) console.log('[toggleTasaCustom] checked:', chk.checked);
}

/**
 * Toggle bloque split boletas.
 */
function toggleSplit() {
  const chk = document.getElementById('chkSplit');
  chk.checked = !chk.checked;
  const row = chk.closest('.toggle-row');
  row.setAttribute('aria-checked', chk.checked);
  document.getElementById('splitBlock').style.display = chk.checked ? 'block' : 'none';
  saveState();
}

/**
 * Toggle bloque adicional.
 */
function toggleAdicional() {
  const chk = document.getElementById('chkAdicional');
  chk.checked = !chk.checked;
  const row = chk.closest('.toggle-row');
  row.setAttribute('aria-checked', chk.checked);
  document.getElementById('adicionalBlock').style.display = chk.checked ? 'block' : 'none';
  saveState();
}

/** Actualiza label del input principal según el modo. */
document.getElementById('modoCalc').addEventListener('change', () => {
  const modo = document.getElementById('modoCalc').value;
  document.getElementById('montoLabel').textContent =
    modo === 'liq2bruto'
      ? 'Total Líquido a recibir ($)'
      : 'Total Bruto de la boleta ($)';
  saveState();
});

/**
 * Formatea número como pesos chilenos.
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  if (isNaN(n) || !isFinite(n)) return '$ 0';
  return '$ ' + Math.round(n).toLocaleString('es-CL');
}

/**
 * Lógica principal de cálculo.
 */
function calcular() {
  const tasa = getTasa();
  const factor = 1 - tasa / 100;
  const modo = document.getElementById('modoCalc').value;
  const monto = parseFloat(document.getElementById('montoInput').value);
  const resultsContent = document.getElementById('resultsContent');
  const badge = document.getElementById('impuestoBadge');

  document.getElementById('btnPrint').style.display = 'none';

  if (!monto || monto <= 0 || isNaN(monto)) {
    badge.style.display = 'none';
    resultsContent.innerHTML = `<div class="empty-state"><div class="big" aria-hidden="true">⚠️</div><span>Ingresa un monto válido mayor que cero</span></div>`;
    return;
  }

  if (tasa >= 100) {
    badge.style.display = 'none';
    resultsContent.innerHTML = `<div class="empty-state"><div class="big" aria-hidden="true">⚠️</div><span>La tasa de retención no puede ser 100% o superior</span></div>`;
    return;
  }

  const hasSplit     = document.getElementById('chkSplit').checked;
  const hasAdicional = document.getElementById('chkAdicional').checked;
  const montoAdicional = hasAdicional
    ? (parseFloat(document.getElementById('montoAdicional').value) || 0)
    : 0;

  // ── Cálculo base ──────────────────────────────────────────────────
  let liquidoBase, brutoBase;
  if (modo === 'liq2bruto') {
    liquidoBase = monto;
    brutoBase   = monto / factor;
  } else {
    brutoBase   = monto;
    liquidoBase = monto * factor;
  }
  const impuestoBase = brutoBase - liquidoBase;

  // Adicional (ya es líquido, sin retención)
  const brutoAdicional   = hasAdicional ? montoAdicional / factor : 0;
  const impuestoAdicional = brutoAdicional - montoAdicional;

  const liquidoTotal = liquidoBase + montoAdicional;
  const brutoTotal   = brutoBase + brutoAdicional;
  const impuestoTotal = brutoTotal - liquidoTotal;

  // ── Split ─────────────────────────────────────────────────────────
  let boletas = [];
  if (hasSplit) {
    const p1 = parseFloat(document.getElementById('pct1').value) / 100 || 0.5;
    const p2 = 1 - p1;
    boletas = [
      { label: 'Boleta 1', liq: liquidoBase * p1, bruto: brutoBase * p1, imp: impuestoBase * p1 },
      { label: 'Boleta 2', liq: liquidoBase * p2, bruto: brutoBase * p2, imp: impuestoBase * p2 },
    ];
    if (hasAdicional) {
      boletas[0].liq += montoAdicional;
      boletas[0].bruto += brutoAdicional;
      boletas[0].imp += impuestoAdicional;
    }
  }

  if (DEBUG) console.log('[calcular]', { tasa, factor, liquidoBase, brutoBase, boletas });

  // ── Render ────────────────────────────────────────────────────────
  badge.style.display = 'inline-flex';
  badge.textContent = `Retención ${tasa.toFixed(2)}% · ${anioActivo}`;

  let html = `<div class="results-grid">`;
  html += statBox('Bruto total a emitir', fmt(brutoTotal), true);
  html += statBox('Líquido total a recibir', fmt(liquidoTotal), false);
  html += statBox('Impuesto retenido', fmt(impuestoTotal), false);
  html += `</div>`;

  // Tabla detalle
  html += `<table class="detail-table"><thead><tr>
    <th>Concepto</th><th style="text-align:right">Líquido</th>
    <th style="text-align:right">Bruto</th><th style="text-align:right">Retención</th>
  </tr></thead><tbody>`;

  if (hasSplit) {
    boletas.forEach(b => {
      html += row(b.label, b.liq, b.bruto, b.imp);
    });
  } else {
    html += row('Honorarios', liquidoBase, brutoBase, impuestoBase);
    if (hasAdicional) html += row('Adicional', montoAdicional, brutoAdicional, impuestoAdicional);
  }

  html += `<tr class="total-row">
    <td>Total</td>
    <td class="num">${fmt(liquidoTotal)}</td>
    <td class="num">${fmt(brutoTotal)}</td>
    <td class="num">${fmt(impuestoTotal)}</td>
  </tr></tbody></table>`;

  resultsContent.innerHTML = html;
  document.getElementById('btnPrint').style.display = '';
  saveState();
}

function statBox(label, val, highlight) {
  return `<div class="stat-box${highlight ? ' highlight' : ''}">
    <div class="sb-label">${label}</div>
    <div class="sb-val">${val}</div>
  </div>`;
}

function row(label, liq, bruto, imp) {
  return `<tr>
    <td>${label}</td>
    <td class="num">${fmt(liq)}</td>
    <td class="num">${fmt(bruto)}</td>
    <td class="num">${fmt(imp)}</td>
  </tr>`;
}

// ── Persistencia ──────────────────────────────────────────────────────
function saveState() {
  try {
    const s = {
      anioActivo,
      modoCalc: document.getElementById('modoCalc').value,
      montoInput: document.getElementById('montoInput').value,
      chkSplit: document.getElementById('chkSplit').checked,
      pct1: document.getElementById('pct1').value,
      chkAdicional: document.getElementById('chkAdicional').checked,
      montoAdicional: document.getElementById('montoAdicional').value,
      chkTasaCustom: document.getElementById('chkTasaCustom').checked,
      tasaCustom: document.getElementById('tasaCustom').value,
    };
    localStorage.setItem('calcBoletaState', JSON.stringify(s));
  } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('calcBoletaState');
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.anioActivo) setAnio(s.anioActivo);
    if (s.modoCalc) document.getElementById('modoCalc').value = s.modoCalc;
    if (s.montoInput) document.getElementById('montoInput').value = s.montoInput;
    if (s.chkSplit) {
      document.getElementById('chkSplit').checked = true;
      document.getElementById('chkSplit').closest('.toggle-row').setAttribute('aria-checked', 'true');
      document.getElementById('splitBlock').style.display = 'block';
    }
    if (s.pct1) document.getElementById('pct1').value = s.pct1;
    syncPct();
    if (s.chkAdicional) {
      document.getElementById('chkAdicional').checked = true;
      document.getElementById('chkAdicional').closest('.toggle-row').setAttribute('aria-checked', 'true');
      document.getElementById('adicionalBlock').style.display = 'block';
    }
    if (s.montoAdicional) document.getElementById('montoAdicional').value = s.montoAdicional;
    if (s.chkTasaCustom) {
      document.getElementById('chkTasaCustom').checked = true;
      document.getElementById('chkTasaCustom').closest('.toggle-row').setAttribute('aria-checked', 'true');
      document.getElementById('tasaCustomBlock').style.display = 'block';
    }
    if (s.tasaCustom) {
      document.getElementById('tasaCustom').value = s.tasaCustom;
      const v = parseFloat(s.tasaCustom);
      if (!isNaN(v) && v > 0) document.getElementById('tasaDisplay').textContent = v.toFixed(2) + '%';
    }
    document.getElementById('montoLabel').textContent =
      s.modoCalc === 'liq2bruto' ? 'Total Líquido a recibir ($)' : 'Total Bruto de la boleta ($)';
  } catch(e) {}
}

// ── Tema oscuro/claro ─────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.querySelector('.btn-theme');
  if (!btn) return;
  btn.textContent = theme === 'dark' ? '🌙' : '☀️';
  btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('calcBoletaTheme', next); } catch(e) {}
}

function initTheme() {
  try {
    const saved = localStorage.getItem('calcBoletaTheme');
    if (saved === 'light' || saved === 'dark') applyTheme(saved);
  } catch(e) {}
}

/** Abre el diálogo de impresión */
function imprimir() {
  window.print();
}

// ── Init ──────────────────────────────────────────────────────────────
initTheme();
initYearPills();
setAnio(2026);
loadState();

// Actualiza tasa al editar manualmente
document.getElementById('tasaCustom').addEventListener('input', () => {
  const v = parseFloat(document.getElementById('tasaCustom').value);
  if (!isNaN(v) && v > 0) {
    document.getElementById('tasaDisplay').textContent = v.toFixed(2) + '%';
  } else {
    document.getElementById('tasaDisplay').textContent = getTasa().toFixed(2) + '%';
  }
});
