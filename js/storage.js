/**
 * Safe wrappers around localStorage.
 *
 * localStorage keeps settings after the app is closed. sessionStorage keeps the cash counts
 * only until the tab or app is closed (a refresh keeps them), so every count starts fresh.
 *
 * Storage can be missing or throw (private windows, blocked site data, full quota), so every
 * call is guarded and the app keeps working without it. Values read back are untrusted and
 * must be validated by the caller (see sanitizeCounts and isCurrencyCode).
 */

export const STORAGE_KEYS = Object.freeze({
  calm: "aud-cash-counter-calm", // name kept from the first version so the setting carries over
  float: "aud-cash-counter-float",
  safeExpected: "aud-cash-counter-safe-expected",
});

/** Keys for sessionStorage: cleared when the tab or app is closed. */
export const SESSION_KEYS = Object.freeze({
  till: "aud-cash-counter-till",
  safe: "aud-cash-counter-safe",
  mode: "aud-cash-counter-mode",
});

/** Where older versions kept the counts in localStorage. Deleted on start (see app.js). */
export const LEGACY_COUNTS_KEY = "aud-cash-counter-v3";

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

export function removeString(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable: nothing was saved there anyway.
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

export function readSessionJSON(key) {
  try {
    const text = sessionStorage.getItem(key);
    return text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

export function writeSessionJSON(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the count just won't survive a refresh.
  }
}
