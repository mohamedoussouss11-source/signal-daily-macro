(() => {
  'use strict';

  const STORAGE_KEY = 'signal-gym-coach-v1';
  const modeNames = { bulk: 'BULK', cut: 'CUT', maintain: 'MAINTAIN' };
  const modeNotes = { bulk: '+ SURPLUS TARGET', cut: '− DEFICIT TARGET', maintain: '= MAINTENANCE TARGET' };
  const macroNames = { protein: 'PROTEIN', carbs: 'CARBS', fat: 'FAT' };
  const themes = {
    teal: { dark: '#56d8c9', light: '#00786e' },
    pink: { dark: '#f48abb', light: '#ad2b6a' },
    blue: { dark: '#78baff', light: '#245da8' },
    purple: { dark: '#b9a0fa', light: '#6d3eb6' },
    orange: { dark: '#ffac73', light: '#a64c0c' },
    lime: { dark: '#c8e67a', light: '#5c7400' },
    red: { dark: '#ff8585', light: '#ad3542' },
    gold: { dark: '#f1d468', light: '#7f6200' }
  };
  const surfaces = ['dark', 'white', 'navy', 'plum', 'forest'];
  const defaults = {
    version: 1,
    theme: 'teal',
    surface: 'dark',
    lastMode: 'maintain',
    configuredModes: { bulk: false, cut: false, maintain: false },
    targets: {
      bulk: { protein: 170, carbs: 335, fat: 80 },
      cut: { protein: 180, carbs: 195, fat: 65 },
      maintain: { protein: 170, carbs: 260, fat: 75 }
    },
    profile: null,
    days: {}
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const fmt = (number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(number);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const isoDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const fromIso = (value) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); };
  const caloriesFrom = ({ protein, carbs, fat }) => Math.round(protein * 4 + carbs * 4 + fat * 9);
  const number = value => Number(value);
  const validAmount = value => Number.isFinite(value) && value >= 0;
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!stored || stored.version !== 1 || typeof stored.days !== 'object') return structuredClone(defaults);
      return {
        ...structuredClone(defaults), ...stored,
        targets: { ...structuredClone(defaults.targets), ...stored.targets },
        configuredModes: { ...defaults.configuredModes, ...stored.configuredModes },
        days: stored.days || {}
      };
    } catch {
      return structuredClone(defaults);
    }
  }

  let data = load();
  let selectedDate = isoDate(new Date());
  let settingsMode = data.lastMode in modeNames ? data.lastMode : 'maintain';
  let statsPeriod = 'month';
  let quickRequest = null;

  function themeColor() { return (themes[data.theme] || themes.teal)[data.surface === 'white' ? 'light' : 'dark']; }
  function macroColor(key) { return getComputedStyle(document.documentElement).getPropertyValue(`--${key}`).trim(); }

  function contrastInk(hex) {
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    const dark = .006;
    return (luminance + .05) / (dark + .05) >= 1.05 / (luminance + .05) ? '#0b1418' : '#ffffff';
  }

  function applyTheme() {
    if (!(data.theme in themes)) data.theme = 'teal';
    if (!surfaces.includes(data.surface)) data.surface = 'dark';
    document.documentElement.dataset.surface = data.surface;
    const color = themeColor();
    document.documentElement.style.setProperty('--acid', color);
    document.documentElement.style.setProperty('--accent-ink', contrastInk(color));
    $$('[data-theme]').forEach(button => {
      const selected = button.dataset.theme === data.theme;
      button.setAttribute('aria-pressed', String(selected));
    });
    $$('[data-surface]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.surface === data.surface)));
  }

  function setTheme(theme) {
    if (!(theme in themes)) return;
    data.theme = theme;
    applyTheme();
    save();
    render();
  }

  function setSurface(surface) {
    if (!surfaces.includes(surface)) return;
    data.surface = surface;
    applyTheme();
    save();
    render();
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch { /* The current session remains usable if storage is unavailable. */ }
  }

  function day(create = false) {
    if (!data.days[selectedDate] && create) data.days[selectedDate] = { mode: data.lastMode, food: [], cardio: [] };
    const record = data.days[selectedDate];
    return record && Array.isArray(record.food) && Array.isArray(record.cardio) ? record : { mode: data.lastMode, food: [], cardio: [] };
  }

  function currentMode() {
    const mode = day().mode;
    return mode in modeNames ? mode : 'maintain';
  }

  function summary() {
    const record = day();
    const mode = currentMode();
    const targets = data.targets[mode] || defaults.targets[mode];
    const eaten = { protein: 0, carbs: 0, fat: 0, calories: 0 };
    for (const entry of record.food) {
      for (const key of ['protein', 'carbs', 'fat']) eaten[key] += Number(entry[key]) || 0;
      eaten.calories += Number(entry.calories) || 0;
    }
    const base = caloriesFrom(targets);
    const burned = record.cardio.reduce((total, entry) => total + (Number(entry.calories) || 0), 0);
    const budget = base + burned;
    return { record, mode, targets, eaten, base, burned, budget, remaining: budget - eaten.calories };
  }

  function render() {
    const s = summary();
    const viewingToday = selectedDate === isoDate(new Date());
    const date = fromIso(selectedDate);
    $('#date-title').textContent = viewingToday ? `Today · ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    $('#today-button').hidden = viewingToday;
    $$('[data-mode]').forEach(button => {
      const active = button.dataset.mode === s.mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#mode-note').textContent = `${modeNotes[s.mode]}${data.configuredModes[s.mode] ? '' : ' · STARTER TARGETS'}`;
    $('#target-status').textContent = data.configuredModes[s.mode] ? 'GRAMS / DAY' : 'STARTER TARGETS · EDIT IN SETTINGS';
    $('#calories-eaten').textContent = fmt(s.eaten.calories);
    $('#calorie-budget').innerHTML = `${fmt(s.budget)} <span>KCAL</span>`;
    $('#budget-breakdown').innerHTML = `Base ${fmt(s.base)} <span>+</span> Cardio ${fmt(s.burned)}`;
    const over = s.remaining < 0;
    $('#remaining-label').textContent = over ? 'OVER BUDGET' : 'REMAINING';
    $('#remaining-label').classList.toggle('over', over);
    $('#calories-remaining').innerHTML = `${fmt(Math.abs(s.remaining))} <span>KCAL</span>`;
    $('#calories-remaining').classList.toggle('over', over);
    const pct = s.budget > 0 ? Math.round(s.eaten.calories / s.budget * 100) : 0;
    $('#calorie-percent').textContent = `${pct}% OF BUDGET USED`;
    $('#calorie-ring').style.background = `conic-gradient(${over ? macroColor('danger') : themeColor()} ${Math.min(100, pct)}%, ${macroColor('ring-track')} ${Math.min(100, pct)}%)`;

    $('#macro-list').innerHTML = ['protein', 'carbs', 'fat'].map(key => {
      const value = Math.round(s.eaten[key] * 10) / 10;
      const target = Number(s.targets[key]) || 0;
      const left = Math.round((target - value) * 10) / 10;
      const excess = left < 0;
      const width = target > 0 ? Math.min(100, value / target * 100) : value > 0 ? 100 : 0;
      return `<div class="macro-item"><div class="macro-top"><span class="macro-name" style="color:${macroColor(key)}">${macroNames[key]}</span><span class="macro-value">${fmt(value)} <small>/ ${fmt(target)} G</small></span></div><div class="bar-track" role="progressbar" aria-label="${macroNames[key]}" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="${target}"><div class="bar-fill" style="width:${width}%;background:${excess ? macroColor('danger') : macroColor(key)}"></div></div><div class="macro-bottom"><span>${target > 0 ? Math.round(value / target * 100) : 0}% OF TARGET</span><span class="${excess ? 'over' : ''}">${fmt(Math.abs(left))} G ${excess ? 'OVER' : 'LEFT'}</span></div></div>`;
    }).join('');

    $('#food-list').innerHTML = s.record.food.length ? s.record.food.map(entry => `<div class="entry-row"><div class="entry-icon" aria-hidden="true">＋</div><div class="entry-main"><div class="entry-name" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</div><div class="entry-meta">P ${fmt(entry.protein)} · C ${fmt(entry.carbs)} · F ${fmt(entry.fat)}${entry.source === 'quick' ? ' · QUICK LOG' : entry.overridden ? ' · MANUAL KCAL' : ''}</div></div><div class="entry-calories">${fmt(entry.calories)} <small>KCAL</small></div><button class="remove-button" type="button" data-remove-food="${escapeHtml(entry.id)}" aria-label="Remove ${escapeHtml(entry.name)}">×</button></div>`).join('') : '<div class="empty-state">NO FOOD LOGGED FOR THIS DAY.</div>';
    $('#cardio-list').innerHTML = s.record.cardio.length ? s.record.cardio.map(entry => `<div class="entry-row"><div class="entry-icon" aria-hidden="true">↗</div><div class="entry-main"><div class="entry-name">${escapeHtml(entry.type)}</div><div class="entry-meta">${fmt(entry.duration)} MINUTES</div></div><div class="entry-calories">+${fmt(entry.calories)} <small>KCAL</small></div><button class="remove-button" type="button" data-remove-cardio="${escapeHtml(entry.id)}" aria-label="Remove ${escapeHtml(entry.type)}">×</button></div>`).join('') : '<div class="empty-state">NO CARDIO LOGGED FOR THIS DAY.</div>';
    renderStatistics();
  }

  function statsDate(value) {
    return fromIso(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function trendChart(stats, key, title, unit, color) {
    const mobile = window.innerWidth <= 520;
    const width = mobile ? 360 : 820, height = 160, left = mobile ? 34 : 42, right = 8, top = 14, bottom = 137;
    const plotWidth = width - left - right;
    const values = stats.points.filter(point => point.logged).flatMap(point => [point[key], point[key === 'calories' ? 'targetCalories' : 'targetProtein']]);
    const maxValue = Math.max(1, ...values) * 1.12;
    const x = index => left + (index + .5) * plotWidth / stats.points.length;
    const y = value => bottom - value / maxValue * (bottom - top);
    const barWidth = Math.max(2, Math.min(18, plotWidth / stats.points.length * .64));
    const targetKey = key === 'calories' ? 'targetCalories' : 'targetProtein';
    const grid = [0, .5, 1].map(ratio => `<line class="grid" x1="${left}" y1="${y(maxValue * ratio)}" x2="${width - right}" y2="${y(maxValue * ratio)}"/><text x="${left - 7}" y="${y(maxValue * ratio) + 3}" text-anchor="end">${fmt(Math.round(maxValue * ratio))}</text>`).join('');
    const bars = stats.points.map((point, index) => {
      if (!point.logged) return '';
      const value = point[key];
      const target = point[targetKey];
      const fill = key === 'calories' ? value > target * 1.05 ? macroColor('danger') : value < target * .95 ? macroColor('muted') : color : color;
      const barY = y(value);
      return `<rect x="${x(index) - barWidth / 2}" y="${barY}" width="${barWidth}" height="${Math.max(1, bottom - barY)}" fill="${fill}"><title>${point.date}: ${fmt(value)} ${unit} / ${fmt(target)} target</title></rect>`;
    }).join('');
    const targetLines = stats.points.map((point, index) => {
      if (!point.logged) return '';
      const currentX = x(index), currentY = y(point[targetKey]);
      const previous = stats.points[index - 1];
      const connector = previous?.logged ? `<line class="target" x1="${x(index - 1)}" y1="${y(previous[targetKey])}" x2="${currentX}" y2="${currentY}"/>` : '';
      return `${connector}<line class="target" x1="${currentX - barWidth / 2}" y1="${currentY}" x2="${currentX + barWidth / 2}" y2="${currentY}"/>`;
    }).join('');
    return `<div class="stats-chart"><div class="stats-chart-head"><span class="stats-chart-title">${title}</span><span class="stats-chart-unit">${unit} / LOGGED DAY</span></div><div class="stats-chart-legend"><span><i style="background:${color}"></i> EATEN</span><span><i class="line"></i> TARGET</span>${key === 'calories' ? `<span><i style="background:${macroColor('danger')}"></i> OVER</span>` : ''}</div><svg class="stats-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title} daily trend and target from ${statsDate(stats.start)} to ${statsDate(stats.end)}">${grid}${bars}${targetLines}</svg><div class="stats-chart-dates"><span>${statsDate(stats.start)}</span><span>${statsDate(stats.end)}</span></div></div>`;
  }

  function renderStatistics() {
    const stats = window.SignalStats.summarize(data, statsPeriod, new Date());
    $$('[data-stats-period]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.statsPeriod === statsPeriod)));
    $('#stats-period-note').textContent = `${statsDate(stats.start)} — ${statsDate(stats.end)} · THROUGH TODAY`;
    const average = value => value === null ? '—' : fmt(Math.round(value));
    const cell = (label, value, unit, caption) => `<div class="stat-cell"><div class="stat-label">${label}</div><div class="stat-value">${value} <small>${unit}</small></div><div class="stat-caption">${caption}</div></div>`;
    $('#stats-summary').innerHTML = [
      cell('AVG DAILY CALORIES', average(stats.average.calories), 'KCAL', 'PER LOGGED DAY'),
      cell('DAYS LOGGED', `${stats.loggedDays}/${stats.totalDays}`, 'DAYS', `${Math.round(stats.consistency)}% CONSISTENCY`),
      cell('TOTAL CARDIO TIME', fmt(stats.cardioMinutes), 'MIN', 'IN THIS PERIOD'),
      cell('CARDIO CALORIES', fmt(stats.cardioCalories), 'KCAL', 'IN THIS PERIOD')
    ].join('');
    $('#stats-macros').innerHTML = ['protein', 'carbs', 'fat'].map(key => `<div class="stats-macro"><div class="stats-macro-name" style="color:${macroColor(key)}">AVG ${macroNames[key]}</div><div class="stats-macro-line"><strong>${average(stats.average[key])}</strong><span>G / LOGGED DAY</span></div><div class="stats-macro-pct">${stats.averageTargetPct[key] === null ? '—' : `${Math.round(stats.averageTargetPct[key])}%`} OF ${macroNames[key]} TARGET ON AVERAGE</div></div>`).join('');
    const counts = stats.rangeCounts;
    const countShare = count => stats.loggedDays ? count / stats.loggedDays * 100 : 0;
    $('#stats-range').innerHTML = `<div class="stats-detail-title">CALORIE TARGET RANGE <span>· ±5%</span></div><div class="stats-range-row"><div class="stats-range-count within"><strong>${counts.within}</strong><span>WITHIN</span></div><div class="stats-range-count over"><strong>${counts.over}</strong><span>OVER</span></div><div class="stats-range-count under"><strong>${counts.under}</strong><span>UNDER</span></div></div><div class="stats-range-bar" aria-label="${counts.within} within, ${counts.over} over, ${counts.under} under"><i class="within" style="width:${countShare(counts.within)}%"></i><i class="over" style="width:${countShare(counts.over)}%"></i><i class="under" style="width:${countShare(counts.under)}%"></i></div>`;
    const spans = stats.modeSpans;
    const mixed = new Set(spans.map(span => span.mode)).size > 1;
    const modeMessage = !spans.length ? '<div class="stats-mode-single">NO MODE HISTORY IN THIS PERIOD.</div>' : mixed ? '<div class="stats-mode-warning">MODES CHANGED · AVERAGES COMBINE DIFFERENT TARGETS.</div>' : '<div class="stats-mode-single">ONE RECORDED MODE IN THIS PERIOD.</div>';
    const chips = spans.map(span => `<span class="stats-mode-chip"><b>${modeNames[span.mode]}</b> · ${statsDate(span.start)}${span.end === span.start ? '' : ` — ${statsDate(span.end)}`}</span>`).join('');
    $('#stats-modes').innerHTML = `<div class="stats-detail-title">RECORDED MODE RANGES</div>${modeMessage}<div class="stats-mode-list">${chips}</div>`;
    $('#stats-charts').innerHTML = stats.loggedDays < 5 ? `<div class="stats-chart-empty">LOG A FEW MORE DAYS TO SEE TRENDS · ${stats.loggedDays}/5 LOGGED DAYS</div>` : trendChart(stats, 'calories', 'DAILY CALORIES', 'KCAL', themeColor()) + trendChart(stats, 'protein', 'DAILY PROTEIN', 'G', macroColor('protein'));
  }

  function setMode(mode) {
    if (!(mode in modeNames)) return;
    day(true).mode = mode;
    data.lastMode = mode;
    save();
    render();
  }

  function addFood(input) {
    const name = String(input.name || '').trim();
    const protein = number(input.protein), carbs = number(input.carbs), fat = number(input.fat);
    if (!name || name.length > 80 || ![protein, carbs, fat].every(validAmount)) throw new Error('Enter a name and valid, nonnegative macros.');
    const source = input.source === 'quick' ? 'quick' : 'manual';
    const overridden = source === 'manual' && input.calories !== '' && input.calories !== null && input.calories !== undefined;
    const calories = (source === 'quick' || overridden) ? number(input.calories) : caloriesFrom({ protein, carbs, fat });
    if (!validAmount(calories)) throw new Error('Enter valid, nonnegative calories.');
    const entry = { id: uid(), name, protein, carbs, fat, calories, overridden, source };
    day(true).food.push(entry);
    save(); render();
    return entry;
  }

  function addCardio(input) {
    const types = ['Incline walk', 'Running', 'Cycling', 'Rowing', 'Stairmaster', 'Sports', 'Other'];
    const type = String(input.type || '');
    const duration = number(input.duration), calories = number(input.calories);
    if (!types.includes(type) || !Number.isInteger(duration) || duration < 1 || !Number.isInteger(calories) || calories < 0) throw new Error('Enter a valid activity, duration, and calories burned.');
    const entry = { id: uid(), type, duration, calories };
    day(true).cardio.push(entry);
    save(); render();
    return entry;
  }

  function removeEntry(kind, id) {
    const record = day(true);
    const index = record[kind].findIndex(entry => entry.id === id);
    if (index < 0) return false;
    record[kind].splice(index, 1);
    save(); render();
    return true;
  }

  function setTargets(mode, values) {
    if (!(mode in modeNames)) throw new Error('Choose a valid mode.');
    const targets = Object.fromEntries(['protein', 'carbs', 'fat'].map(key => [key, number(values[key])]));
    if (!Object.values(targets).every(validAmount) || caloriesFrom(targets) <= 0) throw new Error('Enter valid targets above zero total calories.');
    data.targets[mode] = targets;
    data.configuredModes[mode] = true;
    save(); render();
    return targets;
  }

  function showDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog?.showModal) dialog.showModal();
  }

  function updateCalculatedFood() {
    const f = $('#food-form');
    const values = Object.fromEntries(['protein', 'carbs', 'fat'].map(key => [key, Math.max(0, number(f.elements[key].value) || 0)]));
    $('#food-calculated').textContent = `${fmt(caloriesFrom(values))} KCAL`;
  }

  function setFoodMode(mode) {
    const quick = mode === 'quick';
    $('#quick-tab').setAttribute('aria-selected', String(quick));
    $('#manual-tab').setAttribute('aria-selected', String(!quick));
    $('#quick-panel').hidden = !quick;
    $('#manual-panel').hidden = quick;
    if (!quick && !$('#food-form').elements.name.value.trim()) $('#food-form').elements.name.value = $('#quick-description').value.trim().slice(0, 80);
  }

  function resetQuickLog() {
    quickRequest?.abort();
    quickRequest = null;
    $('#quick-form').reset();
    $('#food-form').reset();
    $('#quick-review').hidden = true;
    $('#quick-items').innerHTML = '';
    $('#quick-error').textContent = '';
    $('#quick-status').textContent = '';
    $('#quick-fallback').hidden = true;
    $('#food-error').textContent = '';
    $('#quick-estimate').disabled = false;
    $('#quick-estimate').classList.remove('estimating');
    $('.quick-estimate-label').textContent = 'ESTIMATE MACROS';
    updateCalculatedFood();
    setFoodMode('quick');
  }

  function quickItemsAndTotal() {
    const items = $$('.quick-item').map(row => {
      const item = { name: row.dataset.name };
      for (const key of ['protein_g', 'carbs_g', 'fat_g', 'calories']) {
        const field = row.querySelector(`[data-quick-field="${key}"]`);
        if (field.value.trim() === '') throw new Error('Fill in every estimated number before saving.');
        const value = Number(field.value);
        if (!Number.isFinite(value) || value < 0 || value > 10000) throw new Error('Use nonnegative numbers for every item.');
        item[key] = value;
      }
      return item;
    });
    if (!items.length) throw new Error('Estimate a meal before saving.');
    const total = Object.fromEntries(['protein_g', 'carbs_g', 'fat_g', 'calories'].map(key => [key, Math.round(items.reduce((sum, item) => sum + item[key], 0) * 10) / 10]));
    return { items, total };
  }

  function updateQuickTotal(event) {
    const row = event?.target.closest('.quick-item');
    if (row && event.target.dataset.quickField === 'calories') row.dataset.caloriesEdited = 'true';
    if (row && event.target.dataset.quickField !== 'calories' && row.dataset.caloriesEdited !== 'true') {
      const grams = key => Number(row.querySelector(`[data-quick-field="${key}"]`).value) || 0;
      row.querySelector('[data-quick-field="calories"]').value = Math.round(grams('protein_g') * 4 + grams('carbs_g') * 4 + grams('fat_g') * 9);
    }
    try {
      const { total } = quickItemsAndTotal();
      $('#quick-total-values').textContent = `P ${fmt(total.protein_g)} G · C ${fmt(total.carbs_g)} G · F ${fmt(total.fat_g)} G · ${fmt(total.calories)} KCAL`;
      $('#quick-error').textContent = '';
      $('#quick-save').disabled = false;
    } catch (error) {
      $('#quick-total-values').textContent = 'CHECK ITEM VALUES';
      $('#quick-error').textContent = error.message;
      $('#quick-save').disabled = true;
    }
  }

  function renderQuickEstimate(estimate) {
    if (!estimate || !Array.isArray(estimate.items) || estimate.items.length < 1 || estimate.items.length > 20) throw new Error('The estimate was incomplete. Use Manual to log this meal.');
    for (const item of estimate.items) {
      if (typeof item.name !== 'string' || !item.name.trim() || !['protein_g', 'carbs_g', 'fat_g', 'calories'].every(key => validAmount(item[key]) && typeof item[key] === 'number')) throw new Error('The estimate contained invalid values. Use Manual to log this meal.');
    }
    $('#quick-items').innerHTML = estimate.items.map(item => `<div class="quick-item" data-name="${escapeHtml(item.name)}"><div class="quick-item-name">${escapeHtml(item.name)}</div><div class="quick-item-fields"><label>PROTEIN G<input data-quick-field="protein_g" aria-label="Protein grams for ${escapeHtml(item.name)}" type="number" min="0" step="0.1" inputmode="decimal" value="${item.protein_g}"></label><label>CARBS G<input data-quick-field="carbs_g" aria-label="Carbs grams for ${escapeHtml(item.name)}" type="number" min="0" step="0.1" inputmode="decimal" value="${item.carbs_g}"></label><label>FAT G<input data-quick-field="fat_g" aria-label="Fat grams for ${escapeHtml(item.name)}" type="number" min="0" step="0.1" inputmode="decimal" value="${item.fat_g}"></label><label>KCAL<input data-quick-field="calories" aria-label="Calories for ${escapeHtml(item.name)}" type="number" min="0" step="0.1" inputmode="decimal" value="${item.calories}"></label></div></div>`).join('');
    $('#quick-review').hidden = false;
    updateQuickTotal();
  }

  async function estimateQuickMeal(event) {
    event.preventDefault();
    const description = $('#quick-description').value.trim();
    if (description.length < 3) { $('#quick-error').textContent = 'Describe your meal before estimating.'; return; }
    quickRequest?.abort();
    const controller = new AbortController();
    quickRequest = controller;
    $('#quick-error').textContent = '';
    $('#quick-fallback').hidden = true;
    $('#quick-review').hidden = true;
    $('#quick-estimate').disabled = true;
    $('#quick-estimate').classList.add('estimating');
    $('.quick-estimate-label').textContent = 'ESTIMATING…';
    $('#quick-status').textContent = 'ESTIMATING…';
    $('#quick-panel').setAttribute('aria-busy', 'true');
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      let estimate;
      try {
        const response = await fetch('/api/estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }), signal: controller.signal });
        if (!response.ok) throw new Error('Estimate service unavailable.');
        estimate = await response.json();
      } catch {
        estimate = window.SignalMealEstimator.estimate(description);
      }
      if (quickRequest !== controller || !$('#food-dialog').open) return;
      renderQuickEstimate(estimate);
      $('#quick-status').textContent = 'REVIEW AND EDIT BEFORE SAVING';
    } catch (error) {
      if (quickRequest !== controller || !$('#food-dialog').open) return;
      $('#quick-error').textContent = 'Could not estimate that — try rewording, or switch to Manual.';
      $('#quick-status').textContent = '';
      $('#quick-fallback').hidden = false;
    } finally {
      clearTimeout(timeout);
      if (quickRequest === controller) {
        quickRequest = null;
        $('#quick-estimate').disabled = false;
        $('#quick-estimate').classList.remove('estimating');
        $('.quick-estimate-label').textContent = 'ESTIMATE MACROS';
        $('#quick-panel').removeAttribute('aria-busy');
      }
    }
  }

  function loadSettingsMode(mode) {
    settingsMode = mode;
    $$('[data-settings-mode]').forEach(button => {
      const active = button.dataset.settingsMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#target-mode-label').textContent = `/ ${modeNames[mode]}`;
    const form = $('#targets-form');
    for (const key of ['protein', 'carbs', 'fat']) form.elements[key].value = data.targets[mode][key];
    $('#targets-error').textContent = '';
    updateCalculatedTarget();
  }

  function updateCalculatedTarget() {
    const f = $('#targets-form');
    const values = Object.fromEntries(['protein', 'carbs', 'fat'].map(key => [key, Math.max(0, number(f.elements[key].value) || 0)]));
    $('#target-calculated').textContent = `${fmt(caloriesFrom(values))} KCAL`;
  }

  function calculateTargets(input) {
    const weight = number(input.weight), height = number(input.height), age = number(input.age), activity = number(input.activity);
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(height) || height <= 0 || !Number.isInteger(age) || age < 18 || age > 120 || ![1.2, 1.375, 1.55, 1.725, 1.9].includes(activity)) throw new Error('Enter valid body data and activity level.');
    if (!['kg', 'lb'].includes(input.weightUnit) || !['cm', 'in'].includes(input.heightUnit) || !['male', 'female'].includes(input.sex)) throw new Error('Choose valid units and formula sex.');
    const kg = input.weightUnit === 'lb' ? weight * 0.45359237 : weight;
    const cm = input.heightUnit === 'in' ? height * 2.54 : height;
    const bmr = 10 * kg + 6.25 * cm - 5 * age + (input.sex === 'male' ? 5 : -161);
    const maintenance = Math.round(bmr * activity);
    const result = {};
    for (const mode of Object.keys(modeNames)) {
      const calorieGoal = maintenance + (mode === 'bulk' ? 300 : mode === 'cut' ? -400 : 0);
      const protein = Math.round(kg * (mode === 'cut' ? 2.2 : 1.8));
      const fat = Math.round(kg * 0.8);
      const carbs = Math.round((calorieGoal - protein * 4 - fat * 9) / 4);
      if (carbs < 0 || calorieGoal <= 0) throw new Error('Calculated calories are too low for these macro rules. Check your inputs or set targets manually.');
      result[mode] = { protein, carbs, fat };
    }
    data.targets = result;
    data.configuredModes = { bulk: true, cut: true, maintain: true };
    data.profile = { ...input, maintenance };
    save(); render(); loadSettingsMode(settingsMode);
    return result;
  }

  $('#prev-day').addEventListener('click', () => { const d = fromIso(selectedDate); d.setDate(d.getDate() - 1); selectedDate = isoDate(d); render(); });
  $('#next-day').addEventListener('click', () => { const d = fromIso(selectedDate); d.setDate(d.getDate() + 1); selectedDate = isoDate(d); render(); });
  $('#today-button').addEventListener('click', () => { selectedDate = isoDate(new Date()); render(); });
  $$('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $$('[data-theme]').forEach(button => button.addEventListener('click', () => setTheme(button.dataset.theme)));
  $$('[data-surface]').forEach(button => button.addEventListener('click', () => setSurface(button.dataset.surface)));
  $('#settings-open').addEventListener('click', () => { loadSettingsMode(currentMode()); showDialog('settings-dialog'); });
  $('#add-food').addEventListener('click', () => { resetQuickLog(); showDialog('food-dialog'); });
  $('#add-cardio').addEventListener('click', () => { $('#cardio-form').reset(); $('#cardio-error').textContent = ''; showDialog('cardio-dialog'); });
  $$('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
  $$('.panel-dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  $('#food-form').addEventListener('input', updateCalculatedFood);
  $('#quick-tab').addEventListener('click', () => setFoodMode('quick'));
  $('#manual-tab').addEventListener('click', () => setFoodMode('manual'));
  $('#quick-fallback').addEventListener('click', () => setFoodMode('manual'));
  $('#quick-form').addEventListener('submit', estimateQuickMeal);
  $('#quick-description').addEventListener('input', () => {
    quickRequest?.abort();
    quickRequest = null;
    $('#quick-review').hidden = true;
    $('#quick-items').innerHTML = '';
    $('#quick-status').textContent = '';
    $('#quick-error').textContent = '';
    $('#quick-fallback').hidden = true;
    $('#quick-estimate').disabled = false;
    $('#quick-estimate').classList.remove('estimating');
    $('.quick-estimate-label').textContent = 'ESTIMATE MACROS';
    $('#quick-panel').removeAttribute('aria-busy');
  });
  $('#quick-items').addEventListener('input', updateQuickTotal);
  $('#quick-save').addEventListener('click', () => {
    try {
      const { items } = quickItemsAndTotal();
      for (const item of items) addFood({ name: item.name.slice(0, 80), protein: item.protein_g, carbs: item.carbs_g, fat: item.fat_g, calories: item.calories, source: 'quick' });
      $('#food-dialog').close();
    } catch (error) { $('#quick-error').textContent = error.message; }
  });
  $('#food-dialog').addEventListener('close', () => quickRequest?.abort());
  $('#targets-form').addEventListener('input', updateCalculatedTarget);
  $$('[data-settings-mode]').forEach(button => button.addEventListener('click', () => loadSettingsMode(button.dataset.settingsMode)));
  $('#food-form').addEventListener('submit', event => {
    event.preventDefault();
    try { addFood(Object.fromEntries(new FormData(event.currentTarget))); $('#food-dialog').close(); }
    catch (error) { $('#food-error').textContent = error.message; }
  });
  $('#cardio-form').addEventListener('submit', event => {
    event.preventDefault();
    try { addCardio(Object.fromEntries(new FormData(event.currentTarget))); $('#cardio-dialog').close(); }
    catch (error) { $('#cardio-error').textContent = error.message; }
  });
  $('#targets-form').addEventListener('submit', event => {
    event.preventDefault();
    try { setTargets(settingsMode, Object.fromEntries(new FormData(event.currentTarget))); $('#settings-dialog').close(); }
    catch (error) { $('#targets-error').textContent = error.message; }
  });
  $('#calculator-form').addEventListener('submit', event => {
    event.preventDefault();
    try { calculateTargets(Object.fromEntries(new FormData(event.currentTarget))); $('#settings-dialog').close(); }
    catch (error) { $('#calculator-error').textContent = error.message; }
  });
  $('#food-list').addEventListener('click', event => { const button = event.target.closest('[data-remove-food]'); if (button) removeEntry('food', button.dataset.removeFood); });
  $('#cardio-list').addEventListener('click', event => { const button = event.target.closest('[data-remove-cardio]'); if (button) removeEntry('cardio', button.dataset.removeCardio); });
  $$('[data-stats-period]').forEach(button => button.addEventListener('click', () => { statsPeriod = button.dataset.statsPeriod; renderStatistics(); }));
  window.addEventListener('resize', renderStatistics);

  const profile = data.profile;
  if (profile) for (const [key, value] of Object.entries(profile)) {
    const control = $('#calculator-form').elements[key];
    if (control) control.value = value;
  }

  if (document.modelContext?.registerTool) {
    const tool = (name, title, description, properties, required, execute, readOnlyHint = false) => {
      try { Promise.resolve(document.modelContext.registerTool({ name, title, description, inputSchema: { type: 'object', properties, required, additionalProperties: false }, annotations: { readOnlyHint, untrustedContentHint: false }, execute })).catch(() => {}); } catch { /* Optional browser capability. */ }
    };
    tool('signal_get_day', 'Read Signal day', 'Read the currently displayed date, mode, calorie budget, macros, and entries.', {}, [], () => ({ date: selectedDate, ...summary() }), true);
    tool('signal_get_statistics', 'Read Signal statistics', 'Read monthly or three-month trends from locally saved daily logs.', { period: { type: 'string', enum: ['month', 'threeMonths'] } }, ['period'], input => window.SignalStats.summarize(data, input.period, new Date()), true);
    tool('signal_add_food', 'Add food to Signal', 'Log food on the currently displayed date and update the visible daily totals.', { name: { type: 'string' }, protein: { type: 'number', minimum: 0 }, carbs: { type: 'number', minimum: 0 }, fat: { type: 'number', minimum: 0 }, calories: { type: 'number', minimum: 0 } }, ['name', 'protein', 'carbs', 'fat'], input => ({ date: selectedDate, entry: addFood(input), totals: summary().eaten }));
    tool('signal_add_cardio', 'Add cardio to Signal', 'Log cardio on the currently displayed date and increase its calorie budget.', { type: { type: 'string', enum: ['Incline walk', 'Running', 'Cycling', 'Rowing', 'Stairmaster', 'Sports', 'Other'] }, duration: { type: 'integer', minimum: 1 }, calories: { type: 'integer', minimum: 0 } }, ['type', 'duration', 'calories'], input => ({ date: selectedDate, entry: addCardio(input), budget: summary().budget }));
  }

  applyTheme();
  render();
})();
