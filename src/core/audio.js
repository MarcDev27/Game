// WebAudio synth: procedural sound effects and a generative cyber/space soundtrack per biome.
// Music layers: detuned analog pads with slow filter sweeps, a pulsing synth bass, filtered
// arpeggios bouncing between the speakers, a "space" layer (star bells, telemetry blips, radio
// sweeps) and tight electronic drums, all into a long reverb and an echo.
export const THEMES = {
  title: { bpm: 84, root: 45, scale: [0, 3, 7, 10, 14], chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], arp: 0.5, lead: 0.2, wave: 'sawtooth', drums: 0 },
  day: { bpm: 104, root: 48, scale: [0, 2, 4, 7, 9, 12], chords: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]], arp: 0.7, lead: 0.35, wave: 'triangle', drums: 0.5 },
  night: { bpm: 88, root: 45, scale: [0, 3, 5, 7, 10, 12], chords: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-2, 2, 5]], arp: 0.55, lead: 0.2, wave: 'sawtooth', drums: 0.3 },
  underground: { bpm: 92, root: 43, scale: [0, 2, 3, 7, 8, 12], chords: [[0, 3, 7], [1, 5, 8], [-4, 0, 3], [-5, -1, 2]], arp: 0.6, lead: 0.15, wave: 'square', drums: 0.35 },
  cavern: { bpm: 80, root: 41, scale: [0, 1, 5, 7, 8, 12], chords: [[0, 3, 7], [1, 5, 8], [0, 3, 8], [-2, 1, 5]], arp: 0.4, lead: 0.1, wave: 'sawtooth', drums: 0.25 },
  core: { bpm: 126, root: 40, scale: [0, 1, 4, 5, 7, 8, 11], chords: [[0, 4, 7], [1, 5, 8], [0, 4, 7], [-1, 2, 5]], arp: 0.8, lead: 0.3, wave: 'sawtooth', drums: 0.9 },
  jungle: { bpm: 112, root: 47, scale: [0, 2, 5, 7, 9, 12], chords: [[0, 4, 7], [2, 5, 9], [-3, 0, 4], [-5, -1, 2]], arp: 0.75, lead: 0.3, wave: 'triangle', drums: 0.7 },
  snow: { bpm: 90, root: 50, scale: [0, 2, 4, 7, 11, 12], chords: [[0, 4, 7], [-1, 2, 7], [-3, 0, 4], [-5, -1, 4]], arp: 0.6, lead: 0.25, wave: 'sine', drums: 0.2 },
  desert: { bpm: 100, root: 46, scale: [0, 1, 4, 5, 7, 8, 10], chords: [[0, 4, 7], [1, 4, 8], [0, 4, 7], [-2, 1, 5]], arp: 0.65, lead: 0.35, wave: 'triangle', drums: 0.6 },
  blight: { bpm: 96, root: 42, scale: [0, 1, 3, 6, 7, 10], chords: [[0, 3, 6], [1, 4, 7], [-2, 1, 4], [-1, 3, 6]], arp: 0.5, lead: 0.2, wave: 'square', drums: 0.5 },
  space: { bpm: 72, root: 52, scale: [0, 2, 4, 7, 9, 14], chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [-5, -1, 2, 5], [-7, -3, 0, 4]], arp: 0.4, lead: 0.15, wave: 'sine', drums: 0 },
  ocean: { bpm: 96, root: 48, scale: [0, 2, 4, 7, 9, 12], chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [-5, -1, 2]], arp: 0.5, lead: 0.3, wave: 'triangle', drums: 0.3 },
  dungeon: { bpm: 100, root: 41, scale: [0, 2, 3, 6, 7, 8, 11], chords: [[0, 3, 7], [-1, 3, 6], [-4, 0, 3], [-5, -1, 2]], arp: 0.6, lead: 0.3, wave: 'square', drums: 0.6 },
  boss1: { bpm: 150, root: 40, scale: [0, 3, 5, 6, 7, 10], chords: [[0, 3, 7], [0, 3, 7], [-2, 2, 5], [-4, 0, 3]], arp: 0.95, lead: 0.5, wave: 'sawtooth', drums: 1 },
  boss2: { bpm: 160, root: 38, scale: [0, 1, 3, 5, 7, 8, 10], chords: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 1, 5]], arp: 1, lead: 0.55, wave: 'square', drums: 1 },
  boss3: { bpm: 168, root: 42, scale: [0, 2, 3, 7, 8, 10], chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], arp: 1, lead: 0.6, wave: 'sawtooth', drums: 1 },
  boss4: { bpm: 140, root: 36, scale: [0, 1, 4, 6, 7, 11], chords: [[0, 4, 7], [1, 4, 8], [-1, 2, 6], [0, 4, 7]], arp: 1, lead: 0.6, wave: 'sawtooth', drums: 1 },
  event: { bpm: 138, root: 43, scale: [0, 3, 5, 7, 10], chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]], arp: 0.9, lead: 0.45, wave: 'square', drums: 0.9 },
};

// How much of the space layer each theme gets (stars, telemetry, sweeps) and how bright the filters open.
const SPACE = { title: 0.9, day: 0.35, night: 0.8, underground: 0.45, cavern: 0.7, core: 0.25, jungle: 0.3, snow: 0.6, desert: 0.35, blight: 0.55, space: 1, ocean: 0.55, dungeon: 0.45, boss1: 0.2, boss2: 0.25, boss3: 0.2, boss4: 0.5, event: 0.3 };
const BRIGHT = { title: 0.8, day: 1.2, night: 0.8, underground: 0.7, cavern: 0.6, core: 1.1, jungle: 1.1, snow: 1, desert: 1, blight: 0.7, space: 0.9, ocean: 0.9, dungeon: 0.7, boss1: 1.3, boss2: 1.3, boss3: 1.4, boss4: 1.2, event: 1.2 };

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null; this.sfxVol = 0.6; this.musicVol = 0.4; this.theme = null; this.nextTheme = null;
    this.step = 0; this.nextTime = 0; this.timer = null; this.lastPlay = {};
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = this.sfxVol; this.sfx.connect(this.master);
    this.music = this.ctx.createGain(); this.music.gain.value = this.musicVol * 0.5; this.music.connect(this.master);
    // simple echo for music
    const delay = this.ctx.createDelay(); delay.delayTime.value = 0.28;
    const fb = this.ctx.createGain(); fb.gain.value = 0.28;
    const wet = this.ctx.createGain(); wet.gain.value = 0.35;
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 1.3;
    this.musicBus.connect(this.music); this.musicBus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(this.music);
    // a long, dark reverb gives the music its sense of space
    try {
      const rev = this.ctx.createConvolver(); rev.buffer = this.impulse(3.2);
      const revWet = this.ctx.createGain(); revWet.gain.value = 0.42;
      this.musicBus.connect(rev); rev.connect(revWet); revWet.connect(this.music);
    } catch (e) { /* no convolver: echo only */ }
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.timer = setInterval(() => this.schedule(), 50);
  }

  impulse(sec) {
    const sr = this.ctx.sampleRate, len = Math.floor(sr * sec);
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return buf;
  }

  // A synth voice: one or two (detuned) oscillators through a resonant low-pass whose cutoff
  // glides from `cut` to `cutEnd`, with an attack/decay envelope and optional stereo position.
  voice(freq, dur, o) {
    const ctx = this.ctx, t = o.when || ctx.currentTime;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.cut || 2000, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, o.cutEnd || o.cut || 2000), t + dur);
    const g = ctx.createGain();
    const atk = o.attack || 0.005, vol = o.vol || 0.03;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    let out = g;
    if (o.pan && ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = o.pan; g.connect(pn); out = pn; }
    out.connect(o.dest || this.musicBus);
    f.connect(g);
    for (const det of o.detune ? [-o.detune, o.detune] : [0]) {
      const osc = ctx.createOscillator(); osc.type = o.type || 'sawtooth';
      osc.frequency.setValueAtTime(freq, t); osc.detune.value = det;
      if (o.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * o.glide), t + dur);
      osc.connect(f); osc.start(t); osc.stop(t + dur + 0.05);
    }
  }

  // Filtered noise whose band sweeps from f0 to f1: radio static, risers, wind.
  sweep(dur, vol, f0, f1, dest, when, q = 6) {
    const ctx = this.ctx, t = when || ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.musicBus);
    s.start(t); s.stop(t + dur + 0.05);
  }

  setVolumes(sfx, music) {
    this.sfxVol = sfx; this.musicVol = music;
    if (this.ctx) { this.sfx.gain.value = sfx; this.music.gain.value = music * 0.5; }
  }

  tone(freq, dur, type = 'square', vol = 0.2, slide = 0, dest = null, when = 0) {
    if (!this.ctx) return;
    const t = (when || this.ctx.currentTime);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || this.sfx);
    o.start(t); o.stop(t + dur + 0.02);
  }
  noiseBurst(dur, vol = 0.2, filterF = 2000, type = 'lowpass', dest = null, when = 0) {
    if (!this.ctx) return;
    const t = when || this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterF;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.lastPlay[name] && now - this.lastPlay[name] < 0.04) return;
    this.lastPlay[name] = now;
    const r = 0.95 + Math.random() * 0.1;
    switch (name) {
      case 'jump': this.tone(220 * r, 0.12, 'square', 0.06, 2); break;
      case 'jump2': this.tone(330 * r, 0.15, 'triangle', 0.08, 2.2); break;
      case 'dash': this.noiseBurst(0.2, 0.15, 3000, 'bandpass'); this.tone(500, 0.15, 'sawtooth', 0.04, 0.4); break;
      case 'hook': this.tone(800, 0.1, 'square', 0.05, 0.5); break;
      case 'place': this.noiseBurst(0.06, 0.12, 900); this.tone(160 * r, 0.06, 'square', 0.05); break;
      case 'dig': this.noiseBurst(0.07, 0.16, 1400 * r); this.tone(120 * r, 0.05, 'square', 0.04, 0.7); break;
      case 'break': this.noiseBurst(0.14, 0.2, 1000); this.tone(90, 0.12, 'square', 0.06, 0.5); break;
      case 'chop': this.noiseBurst(0.1, 0.18, 700); this.tone(140 * r, 0.08, 'triangle', 0.08, 0.6); break;
      case 'swing': this.noiseBurst(0.1, 0.08, 2500 * r, 'bandpass'); break;
      case 'thrust': this.noiseBurst(0.08, 0.1, 3500, 'bandpass'); break;
      case 'shoot': this.noiseBurst(0.08, 0.15, 3000); this.tone(300 * r, 0.06, 'square', 0.06, 0.3); break;
      case 'laser': this.tone(1200 * r, 0.12, 'sawtooth', 0.05, 0.25); break;
      case 'rocket': this.noiseBurst(0.3, 0.15, 800); this.tone(200, 0.3, 'sawtooth', 0.05, 0.5); break;
      case 'throw': this.noiseBurst(0.08, 0.08, 2000, 'bandpass'); break;
      case 'summon': this.tone(400, 0.3, 'triangle', 0.08, 2); this.tone(600, 0.3, 'sine', 0.05, 2); break;
      case 'hit': this.tone(180 * r, 0.08, 'square', 0.08, 0.5); this.noiseBurst(0.05, 0.08, 1500); break;
      case 'crit': this.tone(260 * r, 0.1, 'square', 0.1, 0.5); this.tone(780, 0.1, 'triangle', 0.06, 1.5); break;
      case 'hurt': this.tone(140, 0.2, 'sawtooth', 0.12, 0.5); this.noiseBurst(0.12, 0.12, 800); break;
      case 'kill': this.noiseBurst(0.25, 0.18, 1200); this.tone(300, 0.25, 'square', 0.07, 0.2); break;
      case 'pickup': this.tone(880 * r, 0.06, 'square', 0.04, 1.5); break;
      case 'coin': this.tone(1320, 0.05, 'square', 0.04); this.tone(1760, 0.08, 'square', 0.04, 1, null, now + 0.05); break;
      case 'craft': this.tone(523, 0.08, 'triangle', 0.08); this.tone(784, 0.12, 'triangle', 0.08, 1, null, now + 0.07); break;
      case 'ui': this.tone(660, 0.04, 'square', 0.03); break;
      case 'explode': this.noiseBurst(0.6, 0.35, 600); this.tone(80, 0.5, 'sawtooth', 0.12, 0.3); break;
      case 'heal': this.tone(440, 0.15, 'sine', 0.08, 2); this.tone(660, 0.2, 'sine', 0.06, 2, null, now + 0.08); break;
      case 'roar': this.noiseBurst(1.2, 0.3, 400); this.tone(70, 1.2, 'sawtooth', 0.15, 0.6); break;
      case 'splash': this.noiseBurst(0.3, 0.15, 1800); break;
      case 'door': this.tone(200, 0.08, 'square', 0.05, 0.7); this.noiseBurst(0.06, 0.08, 1000); break;
      case 'chest': this.tone(300, 0.1, 'triangle', 0.08, 1.5); break;
      case 'levelup': [0, 4, 7, 12].forEach((n, i) => this.tone(mtof(72 + n), 0.25, 'triangle', 0.08, 1, null, now + i * 0.08)); break;
      case 'event': [0, 3, 7, 10].forEach((n, i) => this.tone(mtof(60 + n), 0.3, 'sawtooth', 0.06, 1, null, now + i * 0.12)); break;
      case 'death': [12, 7, 3, 0].forEach((n, i) => this.tone(mtof(60 + n), 0.3, 'square', 0.07, 1, null, now + i * 0.15)); break;
      default: this.tone(440, 0.05, 'square', 0.03);
    }
  }

  setTheme(name) { if (THEMES[name] && this.theme !== name) { this.theme = name; this.step = 0; } }

  schedule() {
    if (!this.ctx || !this.theme || this.musicVol <= 0) return;
    const th = THEMES[this.theme];
    const spb = 60 / th.bpm / 4; // 16th note
    const now = this.ctx.currentTime;
    if (this.nextTime < now) this.nextTime = now + 0.05;
    while (this.nextTime < now + 0.25) {
      this.note16(th, this.step, this.nextTime, spb);
      this.step++;
      this.nextTime += spb;
    }
  }

  note16(th, step, t, spb) {
    const bars = th.chords.length;
    const bar = Math.floor(step / 16) % bars;
    const s = step % 16;
    const chord = th.chords[bar];
    const dest = this.musicBus;
    const rnd = ((step * 9301 + 49297) % 233280) / 233280;
    const rnd2 = ((step * 4271 + 11003) % 99991) / 99991;
    const name = this.theme, sp = SPACE[name] ?? 0.4, br = BRIGHT[name] ?? 1;
    const phrase = Math.floor(step / (16 * bars)) % 4; // sections: arp patterns change every pass
    // slow filter LFO over 8 bars
    const lfo = 0.5 + 0.5 * Math.sin(step / (16 * 8) * Math.PI * 2);
    // pad: detuned saws, long swell, filter opening across the bar
    if (s === 0) for (const n of chord) this.voice(mtof(th.root + 12 + n), spb * 17, { type: 'sawtooth', vol: 0.014, attack: spb * 5, cut: 300, cutEnd: (700 + 900 * lfo) * br, q: 3, detune: 11, when: t });
    // bass: pulsing synthwave 8ths with a plucky filter, ducked on the beat like a sidechain
    if (th.drums > 0 ? s % 2 === 0 : s % 4 === 0) {
      const oct = s % 4 === 2 && th.drums > 0.3 ? 12 : 0;
      this.voice(mtof(th.root - 12 + chord[0] + oct + (s === 12 && bar === bars - 1 ? 7 : 0)), spb * 1.8, { type: 'sawtooth', vol: s % 4 === 0 ? 0.05 : 0.075, cut: 900 * br, cutEnd: 120, q: 4, when: t });
    }
    // arpeggio: 16ths over two octaves, ping-ponging left/right, filter following the LFO
    if (rnd < th.arp + 0.15 && (th.arp > 0.6 || s % 2 === 0)) {
      const patt = [[0, 1, 2, 1], [0, 2, 1, 2], [0, 1, 2, 3], [2, 1, 0, 1]][phrase];
      const k = patt[s % 4], oct = (Math.floor(s / 4) % 2) * 12 + (phrase % 2 ? 12 : 0);
      const n = chord[k % chord.length] + oct;
      this.voice(mtof(th.root + 24 + n), spb * 1.5, { type: th.wave === 'sine' ? 'triangle' : th.wave, vol: 0.02, cut: (1200 + 3200 * lfo) * br, cutEnd: 400, q: 6, pan: s % 2 ? 0.55 : -0.55, when: t });
    }
    // lead: sparse, gliding notes high up, soaked in echo
    if (rnd > 1 - th.lead * 0.22 && s % 4 === 2) {
      const n = th.scale[Math.floor(rnd * 997) % th.scale.length];
      this.voice(mtof(th.root + 36 + n), spb * 6, { type: 'square', vol: 0.011, attack: 0.03, cut: 2600 * br, cutEnd: 900, q: 2, glide: rnd2 < 0.3 ? 1.06 : 0, pan: (rnd2 - 0.5) * 0.8, when: t });
    }
    // space layer: star bells, telemetry blips and radio sweeps
    if (rnd2 < sp * 0.09) {
      const n = th.scale[Math.floor(rnd2 * 7919) % th.scale.length];
      this.voice(mtof(th.root + 48 + n), spb * 10, { type: 'sine', vol: 0.016, attack: 0.01, cut: 9000, cutEnd: 4000, pan: (rnd - 0.5) * 1.6, when: t });
    }
    if (s === 13 && rnd < sp * 0.35) for (let k = 0; k < 3; k++) this.voice(1800 + Math.floor(rnd2 * 4) * 400, 0.05, { type: 'sine', vol: 0.008, cut: 8000, pan: 0.7 - k * 0.7, when: t + k * spb * 0.5 });
    if (s === 0 && bar === bars - 1 && rnd2 < sp * 0.6) this.sweep(spb * 16, 0.035 * sp, 250, 4200, dest, t);
    if (s === 0 && bar === 0 && sp > 0.5) this.sweep(spb * 32, 0.02, 600, 220, dest, t, 2); // distant hull hum
    // drums: punchy kick, clap, closed hats and an occasional glitch stutter
    if (th.drums > 0) {
      const four = th.drums > 0.55;
      if (four ? s % 4 === 0 : s % 8 === 0) this.tone(150, 0.22, 'sine', 0.2 * th.drums, 0.3, dest, t);
      if (s % 8 === 4 && th.drums > 0.35) { this.noiseBurst(0.14, 0.07 * th.drums, 1800, 'bandpass', dest, t); this.tone(220, 0.06, 'triangle', 0.03 * th.drums, 0.5, dest, t); }
      if (s % 2 === 1 && th.drums > 0.45) this.noiseBurst(0.025, (s % 4 === 3 ? 0.03 : 0.018) * th.drums, 9000, 'highpass', dest, t);
      if (s === 14 && th.drums > 0.6 && rnd < 0.3) for (let k = 0; k < 4; k++) this.noiseBurst(0.02, 0.025, 5000 + k * 900, 'bandpass', dest, t + k * spb / 4);
    }
  }
}
