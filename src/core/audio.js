// WebAudio synth: procedural sound effects and a generative synthwave soundtrack per biome.
const THEMES = {
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
    this.musicBus = this.ctx.createGain();
    this.musicBus.connect(this.music); this.musicBus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(this.music);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.timer = setInterval(() => this.schedule(), 50);
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
    const bar = Math.floor(step / 16) % th.chords.length;
    const s = step % 16;
    const chord = th.chords[bar];
    const dest = this.musicBus;
    const rnd = ((step * 9301 + 49297) % 233280) / 233280;
    // pad on bar start
    if (s === 0) for (const n of chord) this.tone(mtof(th.root + 12 + n), spb * 16, 'sawtooth', 0.025, 1, dest, t);
    // bass
    if (s % 4 === 0) this.tone(mtof(th.root - 12 + chord[0] + (s === 8 ? 7 : 0)), spb * 3, 'triangle', 0.09, 1, dest, t);
    // arp
    if (rnd < th.arp && s % 2 === 0) {
      const n = chord[(s / 2) % chord.length] + (s >= 8 ? 12 : 0);
      this.tone(mtof(th.root + 24 + n), spb * 1.6, th.wave, 0.03, 1, dest, t);
    }
    // lead
    if (rnd > 1 - th.lead * 0.25 && s % 2 === 0) {
      const n = th.scale[Math.floor(rnd * 997) % th.scale.length];
      this.tone(mtof(th.root + 36 + n), spb * 3, 'square', 0.018, 1, dest, t);
    }
    // drums
    if (th.drums > 0) {
      if (s % 8 === 0) this.tone(110, 0.15, 'sine', 0.18 * th.drums, 0.3, dest, t);
      if (s % 8 === 4 && th.drums > 0.4) this.noiseBurst(0.12, 0.08 * th.drums, 2500, 'bandpass', dest, t);
      if (s % 2 === 1 && th.drums > 0.6) this.noiseBurst(0.03, 0.025 * th.drums, 8000, 'highpass', dest, t);
    }
  }
}
