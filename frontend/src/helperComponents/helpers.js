// ── Value cleaning ─────────────────────────────────────────────────────────

export const clean = (v) => {
  if (v === null || v === undefined || v === "" || v === "NaN" || v === "n/a" || v === "N/A") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
};

export const str = (v) => (v !== null && v !== undefined ? String(v).trim() : "");

export const fmt = (v) => (v === null || v === undefined ? "—" : v);

// ── Math helpers ───────────────────────────────────────────────────────────

export const getNumbers = (arr) =>
  arr.filter((v) => v !== null && v !== undefined && isFinite(v) && !isNaN(v));

export const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

export const median = (arr) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Prevailing price = mode if it exists; if multiple modes, average of modes;
 * if no mode, median (or average for <3 values).
 */
export function calculatePrevailingPrice(values) {
  const nums = getNumbers(values).filter((v) => typeof v === "number" && isFinite(v) && !isNaN(v));
  if (!nums.length) return null;

  const freq = {};
  nums.forEach((n) => { freq[n] = (freq[n] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(freq));
  const modeValues = Object.keys(freq).filter((k) => freq[k] === maxFreq).map(Number);
  const kVal = modeValues.length;

  if (maxFreq > 1 && kVal > 1) return modeValues.reduce((a, b) => a + b, 0) / kVal;
  if (maxFreq > 1 && kVal === 1) return modeValues[0];

  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum === 0) return null;
  if (nums.length < 3) return average(nums);
  return median(nums);
}