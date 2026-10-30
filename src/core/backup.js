// Backups of every character and world as a single file. On iPhone the file goes through the
// share sheet, where "Save to Files" puts it in iCloud Drive; restoring picks it back up from Files.
import { store } from './storage.js';

const FORMAT = 'neon-strata-backup';
const TYPED = { Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray };

function toB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64) {
  const s = atob(b64), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// IndexedDB keeps typed arrays, Maps and Sets; JSON doesn't, so tag them.
function encode(v) {
  if (ArrayBuffer.isView(v)) return { $t: v.constructor.name, b: toB64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
  if (v instanceof Map) return { $m: [...v.entries()].map(([k, x]) => [encode(k), encode(x)]) };
  if (v instanceof Set) return { $s: [...v].map(encode) };
  if (Array.isArray(v)) return v.map(encode);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = encode(v[k]); return o; }
  return v;
}
function decode(v) {
  if (Array.isArray(v)) return v.map(decode);
  if (v && typeof v === 'object') {
    if (v.$t && TYPED[v.$t]) { const bytes = fromB64(v.b); return new TYPED[v.$t](bytes.buffer, 0, bytes.byteLength / TYPED[v.$t].BYTES_PER_ELEMENT); }
    if (v.$m) return new Map(v.$m.map(([k, x]) => [decode(k), decode(x)]));
    if (v.$s) return new Set(v.$s.map(decode));
    const o = {}; for (const k in v) o[k] = decode(v[k]); return o;
  }
  return v;
}

async function gzip(text) {
  if (typeof CompressionStream === 'undefined') return null;
  const s = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function gunzip(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(s).text();
}

export async function makeBackup() {
  const [players, worlds] = await Promise.all([store.all('players'), store.all('worlds')]);
  const text = JSON.stringify({ format: FORMAT, version: 1, created: new Date().toISOString(), build: window.__neonBuild || null, players: encode(players), worlds: encode(worlds) });
  const date = new Date().toISOString().slice(0, 10);
  const gz = await gzip(text);
  const file = gz
    ? new File([gz], `neon-strata-${date}.neonsave`, { type: 'application/gzip' })
    : new File([text], `neon-strata-${date}.json`, { type: 'application/json' });
  return { file, players: players.length, worlds: worlds.length };
}

// Share sheet when available (iPhone: Save to Files → iCloud Drive), otherwise a download.
export async function deliver(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Neon Strata saves' }); return 'shared'; } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'downloaded';
}

export async function readBackup(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = bytes[0] === 0x1f && bytes[1] === 0x8b ? await gunzip(bytes) : new TextDecoder().decode(bytes);
  const o = JSON.parse(text);
  if (o.format !== FORMAT) throw new Error('This file is not a Neon Strata backup.');
  return { players: decode(o.players) || [], worlds: decode(o.worlds) || [], created: o.created };
}

// Restores every character and world in the backup; copies with the same id are replaced.
export async function restoreBackup(b) {
  for (const p of b.players) await store.put('players', p);
  for (const w of b.worlds) await store.put('worlds', w);
}
