// Bridge to the native iOS app (the Xcode project in ios/). The app injects window.__b7105Native
// before the game loads; in a browser it is missing and everything here does nothing.
//
// What the app adds over the web version:
//  - the real iPhone Duo hinge (UIKit reserved regions), so the laptop/book layouts line up exactly;
//  - a safety copy of every save in the app's own storage, which iOS includes in device backups
//    and which the game restores from if the web storage is ever wiped;
//  - the native share sheet for backups, and haptics.
import { store } from './storage.js';

const N = typeof window !== 'undefined' ? window.__b7105Native || null : null;
export const isNative = !!N;
export const nativeInfo = N;

function send(type, data = {}) {
  try { return Promise.resolve(window.webkit.messageHandlers.b7105.postMessage({ type, ...data })); }
  catch (e) { return Promise.reject(e); }
}

// { mode: 'none' } | { mode: 'book', x, w } | { mode: 'laptop', y, h }, in CSS pixels.
export function nativeFold() { return N ? N.fold || { mode: 'none' } : null; }

export function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(b64) {
  const s = atob(b64), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// Shares a file through the native share sheet. Resolves 'shared' or 'cancelled'.
export async function nativeShare(file) {
  const data = toBase64(new Uint8Array(await file.arrayBuffer()));
  return send('share', { name: file.name, data });
}

// ---- haptics, driven by the game's sound effects
const HAPTIC = { hurt: 'medium', death: 'error', explode: 'heavy', roar: 'heavy', levelup: 'success' };
let lastHaptic = 0;
function haptic(kind) {
  const now = performance.now();
  if (now - lastHaptic < 90) return;
  lastHaptic = now;
  send('haptic', { kind }).catch(() => {});
}

// ---- save safety copy
// After the saves change, the whole save set is copied to the app. In a menu that happens almost
// at once (so a deleted character stays deleted); while playing, autosaves are copied at most
// every 10 minutes, and always when the app goes to the background.
let backupBase64 = null, playing = () => false;
let dirty = false, timer = 0, running = null, lastMirror = 0;
const PLAY_INTERVAL = 10 * 60 * 1000;

function changed() {
  dirty = true;
  clearTimeout(timer);
  if (document.hidden) { mirror(); return; }
  const wait = playing() ? Math.max(3000, PLAY_INTERVAL - (Date.now() - lastMirror)) : 400;
  timer = setTimeout(mirror, wait);
}
function mirror() {
  if (!backupBase64 || !dirty) return running;
  if (running) return running;
  dirty = false;
  running = backupBase64()
    .then((data) => send('mirrorSave', { data }))
    .then(() => { lastMirror = Date.now(); })
    .catch(() => { dirty = true; })
    .finally(() => { running = null; if (dirty && !document.hidden) changed(); });
  return running;
}

// Restores the safety copy when the web storage is empty but the app holds saves.
export async function restoreIfWiped(readBackup, restoreBackup) {
  if (!N || !N.hasMirror) return 0;
  const [p, w] = await Promise.all([store.all('players'), store.all('worlds')]);
  if (p.length || w.length) return 0;
  const data = await send('mirrorLoad');
  if (!data) return 0;
  const b = await readBackup(new File([fromBase64(data)], 'safety-copy.b7105'));
  await restoreBackup(b);
  return b.players.length + b.worlds.length;
}

export function initNative({ audio, settings, isPlaying, makeBackupBase64 }) {
  if (!N) return;
  send('ready', { size: `${window.innerWidth}x${window.innerHeight}`, fold: N.fold && N.fold.mode }).catch(() => {});
  document.documentElement.classList.add('native-app');
  backupBase64 = makeBackupBase64; playing = isPlaying;
  for (const k of ['put', 'del']) {
    const f = store[k];
    store[k] = async (...a) => { const r = await f(...a); if (a[0] === 'players' || a[0] === 'worlds') changed(); return r; };
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) { clearTimeout(timer); mirror(); } });
  const play = audio.play.bind(audio);
  audio.play = (name, ...rest) => {
    if (HAPTIC[name] && settings.haptics !== false) haptic(HAPTIC[name]);
    return play(name, ...rest);
  };
}
