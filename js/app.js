(() => {
  const NAMES = { 1: 'niedostateczny', 2: 'dopuszczający', 3: 'dostateczny', 4: 'dobry', 5: 'bardzo dobry', 6: 'celujący' };
  const PRESETS = [
    { key: 'standard', name: 'Standardowy', t: [0, 30, 50, 70, 90, 98] },
    { key: 'lagodny', name: 'Łagodny', t: [0, 25, 40, 60, 80, 95] },
    { key: 'wymagajacy', name: 'Wymagający', t: [0, 40, 55, 75, 90, 100] },
  ];
  const STORE_KEY = 'kalkulator-nauczyciela-v1';

  const baseOf = id => +id[0];
  const modOf = id => id[1] || '';
  const disp = id => id.replace('-', '−');
  const fullName = id => NAMES[baseOf(id)] + (modOf(id) === '+' ? ' plus' : modOf(id) === '-' ? ' minus' : '');
  const color = id => `var(--g${baseOf(id)})`;
  const fmt = (n, d = 2) => n.toLocaleString('pl-PL', { maximumFractionDigits: d });
  const parseNum = s => {
    const v = String(s).trim().replace(',', '.');
    return v === '' || !/^-?\d*\.?\d+$/.test(v) ? NaN : parseFloat(v);
  };

  // Progi z +/- wyliczane z progów podstawowych: „−” od dolnej granicy, ocena czysta ~20% przedziału wyżej, „+” ~70%.
  function genPreset(t) {
    const base = t.map((m, i) => ({ id: String(i + 1), min: m }));
    const full = [{ id: '1', min: 0, on: true }, { id: '1+', min: Math.round(t[1] * 0.7), on: false }];
    for (let b = 2; b <= 5; b++) {
      const a = t[b - 1], n = t[b];
      full.push({ id: b + '-', min: a, on: true });
      full.push({ id: String(b), min: a + Math.round((n - a) * 0.2), on: true });
      full.push({ id: b + '+', min: a + Math.round((n - a) * 0.7), on: true });
    }
    full.push({ id: '6-', min: t[5] - 1, on: false });
    full.push({ id: '6', min: t[5], on: true });
    return { base, full };
  }

  const state = Object.assign(
    { max: '40', got: '31', mods: true, rounding: 'exact', step: '1' },
    genPreset(PRESETS[0].t)
  );
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && Array.isArray(saved.base) && Array.isArray(saved.full)) Object.assign(state, saved);
  } catch (e) {}
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} };

  // Kod ustawień: "KN1|plusy|zaokrąglanie|krok|6 progów podstawowych|16 progów z +/- (x = nieużywana)" w base64url.
  const FULL_IDS = ['1', '1+', '2-', '2', '2+', '3-', '3', '3+', '4-', '4', '4+', '5-', '5', '5+', '6-', '6'];
  const ROUND_CODES = { exact: 'e', round: 'r', down: 'd', up: 'u' };
  const STEPS = ['1', '0.5', '0.25'];
  function encodeSettings() {
    const full = FULL_IDS.map(id => {
      const r = state.full.find(x => x.id === id);
      return r ? r.min + (r.on ? '' : 'x') : '0x';
    });
    const s = ['KN1', state.mods ? 1 : 0, ROUND_CODES[state.rounding], state.step,
      state.base.map(r => r.min).join(','), full.join(',')].join('|');
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeSettings(code) {
    try {
      let b = String(code).trim().replace(/^.*#/, '').replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      const p = atob(b).split('|');
      if (p.length !== 6 || p[0] !== 'KN1') return null;
      const rounding = Object.keys(ROUND_CODES).find(k => ROUND_CODES[k] === p[2]);
      if (!rounding || !STEPS.includes(p[3])) return null;
      const base = p[4].split(',').map(v => v.trim() === '' ? NaN : Number(v));
      const fp = p[5].split(',');
      if (base.length !== 6 || base.some(isNaN) || fp.length !== FULL_IDS.length) return null;
      const full = fp.map((v, i) => ({ id: FULL_IDS[i], min: parseFloat(v), on: !v.endsWith('x') }));
      if (full.some(r => isNaN(r.min))) return null;
      return { mods: p[1] === '1', rounding, step: p[3], base: base.map((m, i) => ({ id: String(i + 1), min: m })), full };
    } catch (e) { return null; }
  }

  const $ = id => document.getElementById(id);
  const els = {
    max: $('max'), got: $('got'), pct: $('pct'), pctSub: $('pct-sub'), mark: $('mark'), markName: $('mark-name'),
    notes: $('notes'), msg: $('msg'), bar: $('bar'), ticks: $('ticks'), mods: $('mods'), rounding: $('rounding'),
    step: $('step'), thead: $('thead'), tbody: $('tbody'), tableNote: $('table-note'), presets: $('presets'), toast: $('toast'),
    code: $('code'), paste: $('paste'), pasteErr: $('paste-err'),
  };

  const rowsForMode = () => state.mods ? state.full : state.base;
  const activeRows = () => state.mods ? state.full.filter(r => r.on) : state.base;

  function applyRounding(raw) {
    const r = Math.round(raw * 1e6) / 1e6;
    switch (state.rounding) {
      case 'round': return Math.round(r);
      case 'down': return Math.floor(r);
      case 'up': return Math.ceil(r);
      default: return r;
    }
  }
  const pctOf = (pts, max) => applyRounding(pts / max * 100);
  // Górna granica przedziału: przy pełnych procentach „do 49%”, bez zaokrąglania „do 49,99%”.
  const rangeUnit = () => state.rounding === 'exact' ? 0.01 : 1;
  const upperPct = (act, ai) => ai + 1 < act.length ? Math.round((act[ai + 1].min - rangeUnit()) * 100) / 100 : 100;
  function gradeIndex(pct, act) {
    let idx = -1;
    act.forEach((r, i) => { if (pct >= r.min) idx = i; });
    return idx;
  }
  // Najmniejsza liczba punktów (w krokach oceniania), od której obowiązuje każdy próg.
  function pointsFrom(act, max) {
    const step = parseFloat(state.step);
    const cands = [];
    for (let k = 0; k * step <= max + 1e-9; k++) cands.push(Math.round(k * step * 1000) / 1000);
    if (cands[cands.length - 1] < max) cands.push(max);
    return act.map(r => {
      const hit = cands.find(p => pctOf(p, max) >= r.min);
      return hit === undefined ? null : hit;
    });
  }
  function badIds(act) {
    const bad = new Set();
    act.forEach((r, i) => {
      if (!(r.min >= 0 && r.min <= 100)) bad.add(r.id);
      if (i > 0 && r.min <= act[i - 1].min) bad.add(r.id);
    });
    return bad;
  }

  /* --- Tabela progów --- */
  function buildTable() {
    els.thead.innerHTML = `<tr><th>Ocena</th><th>Nazwa</th>${state.mods ? '<th>Użyj</th>' : ''}<th>Procent od – do</th><th>Punkty od – do</th></tr>`;
    els.tbody.innerHTML = rowsForMode().map((r, i) => `
      <tr data-id="${r.id}">
        <td class="c-g"><span class="g"><span class="dot" style="background:${color(r.id)}"></span>${disp(r.id)}</span></td>
        <td class="c-name">${fullName(r.id)}</td>
        ${state.mods ? `<td class="c-on"><input type="checkbox" id="on-${i}" data-i="${i}" ${r.on ? 'checked' : ''} aria-label="Używaj oceny ${disp(r.id)}"></td>` : ''}
        <td class="c-min"><span class="range">
          <input type="text" inputmode="decimal" id="min-${state.mods ? 'f' : 'b'}-${i}" data-i="${i}" data-kind="od" value="${fmt(r.min)}" aria-label="Ocena ${disp(r.id)} od procent">
          <span class="dash">–</span>
          <input type="text" inputmode="decimal" id="max-${state.mods ? 'f' : 'b'}-${i}" data-i="${i}" data-kind="do" aria-label="Ocena ${disp(r.id)} do procent">
          <span class="pc">%</span></span></td>
        <td class="c-pts" id="pts-${i}"></td>
      </tr>`).join('');
  }

  els.tbody.addEventListener('input', e => {
    const t = e.target, i = +t.dataset.i, rows = rowsForMode();
    if (t.type === 'checkbox') { rows[i].on = t.checked; }
    else {
      const v = parseNum(t.value);
      t.setAttribute('aria-invalid', isNaN(v) ? 'true' : 'false');
      if (isNaN(v)) return;
      if (t.dataset.kind === 'do') {
        // „Do” jednej oceny wyznacza „od” następnej oceny w użyciu.
        const act = activeRows(), next = act[act.indexOf(rows[i]) + 1];
        if (!next) return;
        next.min = Math.round((v + rangeUnit()) * 100) / 100;
      } else rows[i].min = v;
    }
    save(); update();
  });

  /* --- Obliczenia i wynik --- */
  let lastMark = '';
  function update() {
    const max = parseNum(els.max.value), got = parseNum(els.got.value);
    state.max = els.max.value; state.got = els.got.value;
    const act = activeRows();
    const bad = badIds(act);
    const msgs = [];

    const maxOk = max > 0;
    const gotOk = !isNaN(got) && got >= 0;
    els.max.setAttribute('aria-invalid', String(!maxOk));
    els.got.setAttribute('aria-invalid', String(!gotOk));
    if (!maxOk) msgs.push('Podaj maksymalną liczbę punktów większą od zera.');
    if (maxOk && !gotOk) msgs.push('Podaj liczbę punktów ucznia (0 lub więcej).');
    if (maxOk && gotOk && got > max) msgs.push(`Uczeń ma więcej punktów niż maksimum (${fmt(got)} z ${fmt(max)}). Wynik liczony jest powyżej 100%.`);
    if (bad.size) msgs.push(`Progi muszą rosnąć od najniższej do najwyższej oceny. Popraw zaznaczone na czerwono: ${[...bad].map(disp).join(', ')}.`);
    if (!act.length) msgs.push('Żadna ocena nie jest w użyciu. Zaznacz co najmniej jedną w tabeli.');

    const from = maxOk ? pointsFrom(act, max) : act.map(() => null);
    let idx = -1, pct = NaN;
    if (maxOk && gotOk) {
      const raw = got / max * 100;
      pct = applyRounding(raw);
      idx = gradeIndex(pct, act);
      els.pct.innerHTML = `${fmt(pct)}<small>%</small>`;
      els.pctSub.textContent = `${fmt(got)} / ${fmt(max)} pkt` + (state.rounding !== 'exact' && pct !== Math.round(raw * 100) / 100 ? ` · dokładnie ${fmt(raw)}%` : '');
    } else {
      els.pct.innerHTML = '–';
      els.pctSub.textContent = '';
    }

    const cur = idx >= 0 ? act[idx] : null;
    const markText = cur ? disp(cur.id) : '–';
    els.mark.textContent = markText;
    els.markName.textContent = cur ? fullName(cur.id) : (maxOk && gotOk && act.length ? 'poniżej najniższego progu' : '');
    if (markText !== lastMark) { els.mark.classList.remove('pop'); void els.mark.offsetWidth; els.mark.classList.add('pop'); lastMark = markText; }

    // Notatki pod wynikiem
    const notes = [];
    if (cur && from[idx] !== null) {
      const to = idx + 1 < act.length && from[idx + 1] !== null ? from[idx + 1] - parseFloat(state.step) : max;
      notes.push(`Ocena <b>${disp(cur.id)}</b>: <b>${fmt(cur.min)}–${fmt(upperPct(act, idx))}%</b>, czyli <b>${fmt(from[idx])}–${fmt(Math.max(to, from[idx]))} pkt</b>.`);
    }
    if (maxOk && gotOk && act.length) {
      const nIdx = idx + 1;
      if (nIdx < act.length) {
        const next = act[nIdx];
        if (from[nIdx] === null) notes.push(`Ocena <b>${disp(next.id)}</b> jest nieosiągalna przy ${fmt(max)} pkt maksimum.`);
        else notes.push(`Do oceny <b>${disp(next.id)}</b> brakuje <b>${fmt(Math.max(from[nIdx] - got, 0))} pkt</b> (od ${fmt(from[nIdx])} pkt).`);
      } else if (cur) notes.push('To najwyższa ocena w skali.');
    }
    els.notes.innerHTML = notes.map(n => `<div>${n}</div>`).join('');
    els.msg.hidden = !msgs.length;
    els.msg.innerHTML = msgs.map(m => `<div>${m}</div>`).join('');

    // Tabela: zakresy punktowe i stany wierszy
    const rows = rowsForMode();
    rows.forEach((r, i) => {
      const tr = els.tbody.children[i]; if (!tr) return;
      const ai = act.indexOf(r);
      tr.classList.toggle('off', ai < 0);
      tr.classList.toggle('bad', bad.has(r.id));
      tr.classList.toggle('current', cur === r);
      const odIn = tr.querySelector('[data-kind="od"]'), doIn = tr.querySelector('[data-kind="do"]');
      if (odIn !== document.activeElement && odIn.getAttribute('aria-invalid') !== 'true') odIn.value = fmt(r.min);
      const isLast = ai === act.length - 1;
      doIn.disabled = ai < 0 || isLast;
      doIn.title = isLast ? 'Najwyższa ocena sięga do 100%' : ai < 0 ? 'Ocena nie jest w użyciu' : 'Zmiana przesuwa początek następnej oceny';
      if (doIn !== document.activeElement) {
        doIn.value = ai < 0 ? '' : fmt(upperPct(act, ai));
        doIn.removeAttribute('aria-invalid');
      }
      const cell = $('pts-' + i);
      let text = '—', na = true;
      if (ai >= 0 && maxOk && from[ai] !== null) {
        let nextFrom = null;
        for (let j = ai + 1; j < act.length; j++) { if (from[j] !== null) { nextFrom = from[j]; break; } }
        const to = nextFrom === null ? max : nextFrom - parseFloat(state.step);
        if (to >= from[ai]) { text = to === from[ai] ? `${fmt(to)}` : `${fmt(from[ai])}–${fmt(to)}`; na = false; }
        else text = 'brak';
      } else if (ai >= 0 && maxOk) text = 'nieosiągalna';
      cell.textContent = text;
      cell.classList.toggle('na', na);
    });
    els.tableNote.textContent = maxOk
      ? `Kolumna „Punkty” pokazuje przedziały dla sprawdzianu za ${fmt(max)} pkt, z uwzględnieniem zaokrąglania.`
      : '';

    drawBar(act, pct, idx, bad.size === 0);
    els.code.value = encodeSettings();
    save();
  }

  function drawBar(act, pct, idx, ok) {
    if (!act.length || !ok) { els.bar.innerHTML = ''; els.ticks.innerHTML = ''; return; }
    const segs = [];
    if (act[0].min > 0) segs.push({ id: null, a: 0, b: Math.min(act[0].min, 100) });
    act.forEach((r, i) => {
      const a = Math.min(Math.max(r.min, 0), 100), b = i + 1 < act.length ? Math.min(act[i + 1].min, 100) : 100;
      if (b > a || (i === act.length - 1 && a === 100)) segs.push({ id: r.id, a, b: Math.max(b, a) });
    });
    // Etykieta tylko w segmencie, który ma co najmniej ~24 px (na telefonie wąskie progi zostają bez napisu).
    const barPx = els.bar.clientWidth || 600;
    els.bar.innerHTML = segs.map(s => {
      const w = Math.max(s.b - s.a, s.b === s.a ? 1.2 : 0);
      return s.id
        ? `<div class="seg" style="width:${w}%;background:${color(s.id)}" title="${disp(s.id)}: od ${fmt(s.a)}%">${w / 100 * barPx >= 24 ? disp(s.id) : ''}</div>`
        : `<div class="seg none" style="width:${w}%" title="Brak oceny poniżej ${fmt(s.b)}%"></div>`;
    }).join('') + (isNaN(pct) ? '' : `<div class="marker" style="left:${Math.min(Math.max(pct, 0), 100)}%" aria-hidden="true"></div>`);
    els.ticks.innerHTML = [0, 25, 50, 75, 100].map(t => `<span style="left:${t}%">${t}%</span>`).join('');
  }

  /* --- Sterowanie --- */
  PRESETS.forEach(p => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip';
    b.innerHTML = `${p.name}<small>${p.t.slice(1).join('/')}</small>`;
    b.title = `Progi: 2 od ${p.t[1]}%, 3 od ${p.t[2]}%, 4 od ${p.t[3]}%, 5 od ${p.t[4]}%, 6 od ${p.t[5]}%`;
    b.addEventListener('click', () => {
      Object.assign(state, genPreset(p.t));
      buildTable(); update();
      toast(`Wczytano progi: ${p.name}`);
    });
    els.presets.appendChild(b);
  });

  let toastTimer;
  function toast(text) {
    els.toast.textContent = text; els.toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2200);
  }

  function nudge(dir) {
    const step = parseFloat(state.step);
    const max = parseNum(els.max.value);
    let v = parseNum(els.got.value); if (isNaN(v)) v = 0;
    v = Math.round((v + dir * step) * 1000) / 1000;
    v = Math.max(0, max > 0 ? Math.min(v, max) : v);
    els.got.value = fmt(v, 3); update();
  }

  els.max.addEventListener('input', update);
  els.got.addEventListener('input', update);
  els.got.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); els.got.select(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); nudge(1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-1); }
  });
  els.max.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); els.got.focus(); els.got.select(); } });
  $('inc').addEventListener('click', () => nudge(1));
  $('dec').addEventListener('click', () => nudge(-1));
  els.mods.addEventListener('change', () => { state.mods = els.mods.checked; buildTable(); update(); });
  els.rounding.addEventListener('change', () => { state.rounding = els.rounding.value; update(); });
  els.step.addEventListener('change', () => {
    state.step = els.step.value;
    const lbl = state.step === '1' ? 'punkt' : fmt(+state.step) + ' pkt';
    $('inc').setAttribute('aria-label', 'Dodaj ' + lbl); $('dec').setAttribute('aria-label', 'Odejmij ' + lbl);
    update();
  });

  /* --- Tryb jasny / ciemny --- */
  const THEME_KEY = 'kalkulator-nauczyciela-theme';
  const themeBtn = $('theme');
  const darkMq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : !!(darkMq && darkMq.matches);
  };
  function renderThemeBtn() {
    const dark = isDark();
    themeBtn.querySelector('.ti').textContent = dark ? '☀' : '☾';
    themeBtn.querySelector('.tl').textContent = dark ? 'Tryb jasny' : 'Tryb ciemny';
    themeBtn.setAttribute('aria-label', dark ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny');
  }
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
  } catch (e) {}
  themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    renderThemeBtn();
  });
  if (darkMq && darkMq.addEventListener) darkMq.addEventListener('change', renderThemeBtn);
  renderThemeBtn();

  function applySettings(s) {
    Object.assign(state, s);
    els.mods.checked = state.mods; els.rounding.value = state.rounding; els.step.value = state.step;
    buildTable(); update();
  }
  $('copy').addEventListener('click', () => {
    const code = els.code.value;
    const fallback = () => { els.code.focus(); els.code.select(); toast('Kod zaznaczony. Skopiuj go skrótem Ctrl+C.'); };
    try {
      navigator.clipboard.writeText(code).then(() => toast('Skopiowano kod ustawień'), fallback);
    } catch (e) { fallback(); }
  });
  function loadPasted() {
    const s = decodeSettings(els.paste.value);
    if (!s) {
      els.pasteErr.textContent = 'Ten kod jest niepoprawny. Skopiuj go jeszcze raz w całości i wklej ponownie.';
      els.pasteErr.hidden = false;
      return;
    }
    els.pasteErr.hidden = true;
    els.paste.value = '';
    applySettings(s);
    toast('Wczytano ustawienia z kodu');
  }
  $('load').addEventListener('click', loadPasted);
  els.paste.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); loadPasted(); } });
  els.paste.addEventListener('input', () => { els.pasteErr.hidden = true; });
  let resizeRaf = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(update); });

  els.max.value = state.max; els.got.value = state.got;
  const fromHash = location.hash.length > 1 ? decodeSettings(location.hash) : null;
  if (fromHash) { applySettings(fromHash); toast('Wczytano ustawienia z linku'); }
  else applySettings({});
})();
