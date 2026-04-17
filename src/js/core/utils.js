export const DEFAULT_CURRENCY = "INR";

export function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const seed = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${seed}`;
}

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function roundCurrency(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((toNumber(value, 0) + Number.EPSILON) * factor) / factor;
}

export function formatCurrencyInr(value, decimals = 2) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(toNumber(value, 0));
}

export function safeText(value) {
  return value == null ? "" : String(value);
}

export function escapeHtml(value) {
  return safeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function moveItem(list, fromIndex, toIndex) {
  const arr = [...list];
  if (
    fromIndex < 0 ||
    fromIndex >= arr.length ||
    toIndex < 0 ||
    toIndex >= arr.length ||
    fromIndex === toIndex
  ) {
    return arr;
  }
  const [item] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, item);
  return arr;
}

export function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}
