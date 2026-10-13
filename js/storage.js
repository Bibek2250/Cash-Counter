/**
 * Safe wrappers around localStorage.
 *
 * Storage can be missing or throw (private windows, blocked site data, full quota), so every
 * call is guarded and the app keeps working without it. Values read back are untrusted and
 * must be validated by the caller (see sanitizeCounts and isCurrencyCode).
 */

export const STORAGE_KEYS = Object.freeze({
  calm: "aud-cash-counter-calm", // name kept from the first version so the setting carries over
  float: "aud-cash-counter-float",
});

export function readString(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the setting just won't be remembered.
  }
}

export function readJSON(key) {
  const text = readString(key);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function writeJSON(key, value) {
  writeString(key, JSON.stringify(value));
}
