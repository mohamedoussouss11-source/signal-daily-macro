/* Signal cardio estimates: MET × body weight (kg) × hours. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SignalCardioEstimator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MET = { 'Incline walk': 6, Running: 9.8, Cycling: 7.5, Rowing: 7, Stairmaster: 9, Sports: 7, Other: 5 };
  const FALLBACK_KG = 70;
  function weightKg(weight, unit) {
    const value = Number(weight);
    return Number.isFinite(value) && value > 0 ? value * (unit === 'lb' ? 0.45359237 : 1) : null;
  }
  function estimate({ type, duration, intensity = 'moderate', weight, weightUnit = 'kg' }) {
    const minutes = Number(duration);
    if (!(type in MET) || !Number.isFinite(minutes) || minutes <= 0) return null;
    const actualWeight = weightKg(weight, weightUnit);
    const met = type === 'Running' && intensity === 'fast' ? 13.5 : MET[type];
    return { calories: Math.round(met * (actualWeight || FALLBACK_KG) * minutes / 60), met, weightKg: actualWeight || FALLBACK_KG, usedFallback: actualWeight === null };
  }
  function parseDescription(value) {
    const text = String(value || '').toLowerCase();
    const time = text.match(/\b(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|min)\b/) || text.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr)\b/);
    const duration = time ? Math.round(Number(time[1]) * (/\bhour|\bhr/.test(time[0]) ? 60 : 1)) : null;
    let type = null;
    if (/\brunn?ing\b|\brun\b|\bjogg?ing\b/.test(text)) type = 'Running';
    else if (/\bcycl(?:ing|e)\b|\bbik(?:ing|e)\b/.test(text)) type = 'Cycling';
    else if (/\bincline\b|\bwalk(?:ing)?\b/.test(text)) type = 'Incline walk';
    else if (/\brow(?:ing)?\b/.test(text)) type = 'Rowing';
    else if (/\bstair(?:master|s)?\b/.test(text)) type = 'Stairmaster';
    else if (/\bsport|\bsoccer\b|\bbasketball\b|\btennis\b|\bfootball\b/.test(text)) type = 'Sports';
    const intensity = /\bfast\b|\b8\s*(?:mph|miles?\s*per\s*hour)\b/.test(text) ? 'fast' : 'moderate';
    return { type, duration, intensity };
  }
  return { MET, FALLBACK_KG, weightKg, estimate, parseDescription };
});
