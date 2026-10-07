/* Pure statistics over Signal's locally stored daily records. */
(() => {
  'use strict';

  const modes = new Set(['bulk', 'cut', 'maintain']);
  const keys = ['protein', 'carbs', 'fat'];
  const isoDate = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const fromIso = value => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); };
  const safeNumber = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const calorieTarget = target => Math.round(safeNumber(target.protein) * 4 + safeNumber(target.carbs) * 4 + safeNumber(target.fat) * 9);

  function periodRange(period, today = new Date()) {
    if (!['month', 'threeMonths'].includes(period)) throw new Error('Unknown statistics period.');
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(end.getFullYear(), end.getMonth() - (period === 'threeMonths' ? 2 : 0), 1);
    return { start: isoDate(start), end: isoDate(end) };
  }

  function summarize(data, period, today = new Date()) {
    const { start, end } = periodRange(period, today);
    const records = data?.days || {};
    const targetSets = data?.targets || {};
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, cardioMinutes: 0, cardioCalories: 0 };
    const percentages = Object.fromEntries(keys.map(key => [key, { sum: 0, count: 0 }]));
    const rangeCounts = { within: 0, over: 0, under: 0 };
    const points = [];
    const modeEvents = [];
    let loggedDays = 0;

    for (let date = fromIso(start), last = fromIso(end); date <= last; date.setDate(date.getDate() + 1)) {
      const dateKey = isoDate(date);
      const record = records[dateKey];
      const mode = modes.has(record?.mode) ? record.mode : modes.has(data?.lastMode) ? data.lastMode : 'maintain';
      if (record && modes.has(record.mode)) modeEvents.push({ date: dateKey, mode });
      const food = Array.isArray(record?.food) ? record.food : [];
      const cardio = Array.isArray(record?.cardio) ? record.cardio : [];
      const logged = food.length > 0 || cardio.length > 0;
      if (!logged) { points.push({ date: dateKey, logged: false }); continue; }

      loggedDays += 1;
      const dayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      for (const item of food) {
        for (const key of keys) dayTotals[key] += safeNumber(item[key]);
        dayTotals.calories += item.calories == null ? calorieTarget(item) : safeNumber(item.calories);
      }
      const cardioMinutes = cardio.reduce((sum, item) => sum + safeNumber(item.duration), 0);
      const cardioCalories = cardio.reduce((sum, item) => sum + safeNumber(item.calories), 0);
      const targets = targetSets[mode] || { protein: 0, carbs: 0, fat: 0 };
      const budget = calorieTarget(targets) + cardioCalories;
      for (const key of ['calories', ...keys]) totals[key] += dayTotals[key];
      totals.cardioMinutes += cardioMinutes;
      totals.cardioCalories += cardioCalories;
      for (const key of keys) {
        const target = safeNumber(targets[key]);
        if (target > 0) { percentages[key].sum += dayTotals[key] / target * 100; percentages[key].count += 1; }
      }
      const deviation = budget * 0.05;
      if (dayTotals.calories > budget + deviation) rangeCounts.over += 1;
      else if (dayTotals.calories < budget - deviation) rangeCounts.under += 1;
      else rangeCounts.within += 1;
      points.push({ date: dateKey, logged, mode, calories: dayTotals.calories, targetCalories: budget, protein: dayTotals.protein, targetProtein: safeNumber(targets.protein) });
    }

    const modeSpans = [];
    for (const event of modeEvents) {
      const previous = modeSpans.at(-1);
      if (previous?.mode === event.mode) { previous.end = event.date; previous.recordedDays += 1; }
      else modeSpans.push({ mode: event.mode, start: event.date, end: event.date, recordedDays: 1 });
    }
    return {
      period, start, end, totalDays: points.length, loggedDays,
      consistency: points.length ? loggedDays / points.length * 100 : 0,
      average: Object.fromEntries(['calories', ...keys].map(key => [key, loggedDays ? totals[key] / loggedDays : null])),
      averageTargetPct: Object.fromEntries(keys.map(key => [key, percentages[key].count ? percentages[key].sum / percentages[key].count : null])),
      cardioMinutes: totals.cardioMinutes,
      cardioCalories: totals.cardioCalories,
      rangeCounts, modeSpans, points
    };
  }

  const api = { periodRange, summarize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SignalStats = api;
})();
