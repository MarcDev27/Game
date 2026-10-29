// Unified input: keyboard + mouse on desktop, virtual joystick/buttons + world touches on mobile.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();   // keys pressed this frame
    this.mouse = { x: 0, y: 0, left: false, right: false, inside: false };
    this.wheel = 0;
    this.touch = { active: false, x: 0, y: 0, id: null, startT: 0, startX: 0, startY: 0, moved: false };
    this.joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.useStick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.buttons = {};          // virtual button states: { jump: bool, ... }
    this.buttonPressed = new Set();
    this.taps = [];             // queued world taps {x, y}
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.usedTouch = false;
    this.listeners();
  }

  listeners() {
    const c = this.canvas;
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; this.keys.delete(k); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.left = this.mouse.right = false; this.releaseAll(); });
    c.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.inside = true; });
    c.addEventListener('mouseleave', () => { this.mouse.inside = false; });
    c.addEventListener('mousedown', (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      if (e.button === 0) { this.mouse.left = true; this.taps.push({ x: e.clientX, y: e.clientY, mouse: true }); }
      if (e.button === 2) { this.mouse.right = true; this.pressed.add('MouseRight'); }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

    // World touches on the canvas (the joystick lives in its own DOM zone).
    c.addEventListener('touchstart', (e) => {
      this.usedTouch = true;
      for (const t of e.changedTouches) {
        if (this.touch.id === null) {
          Object.assign(this.touch, { active: true, id: t.identifier, x: t.clientX, y: t.clientY, startT: performance.now(), startX: t.clientX, startY: t.clientY, moved: false });
          this.taps.push({ x: t.clientX, y: t.clientY, touch: true });
        }
      }
      e.preventDefault();
    }, { passive: false });
    c.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.touch.id) {
        this.touch.x = t.clientX; this.touch.y = t.clientY;
        if (Math.hypot(t.clientX - this.touch.startX, t.clientY - this.touch.startY) > 10) this.touch.moved = true;
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.touch.id) { this.touch.active = false; this.touch.id = null; }
      e.preventDefault();
    };
    c.addEventListener('touchend', end, { passive: false });
    c.addEventListener('touchcancel', end, { passive: false });
  }

  bindJoystick(zone, knob, base) {
    const update = (t) => {
      const dx = t.clientX - this.joy.ox, dy = t.clientY - this.joy.oy;
      const max = 46;
      const d = Math.hypot(dx, dy);
      const k = d > max ? max / d : 1;
      this.joy.x = (dx * k) / max; this.joy.y = (dy * k) / max;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    };
    zone.addEventListener('touchstart', (e) => {
      this.usedTouch = true;
      const t = e.changedTouches[0];
      if (this.joy.id !== null) return;
      this.joy.id = t.identifier; this.joy.active = true; this.joy.ox = t.clientX; this.joy.oy = t.clientY;
      const r = zone.getBoundingClientRect();
      base.style.left = (t.clientX - r.left) + 'px'; base.style.top = (t.clientY - r.top) + 'px';
      base.classList.add('active');
      update(t);
      e.preventDefault();
    }, { passive: false });
    zone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.joy.id) update(t);
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.joy.id) {
        this.joy.id = null; this.joy.active = false; this.joy.x = 0; this.joy.y = 0;
        knob.style.transform = ''; base.classList.remove('active');
      }
      e.preventDefault();
    };
    zone.addEventListener('touchend', end, { passive: false });
    zone.addEventListener('touchcancel', end, { passive: false });
  }

  // The USE button doubles as an aim stick: hold it to use the selected item (with smart aim),
  // or hold and drag to aim in that direction.
  bindUseStick(el, knob) {
    const u = this.useStick;
    const update = (cx, cy) => {
      const dx = cx - u.ox, dy = cy - u.oy, max = 38;
      const d = Math.hypot(dx, dy), k = d > max ? max / d : 1;
      u.x = (dx * k) / max; u.y = (dy * k) / max;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    };
    const start = (id, cx, cy) => {
      if (u.id !== null) return;
      this.usedTouch = true;
      const r = el.getBoundingClientRect();
      Object.assign(u, { active: true, id, ox: r.left + r.width / 2, oy: r.top + r.height / 2, x: 0, y: 0 });
      el.classList.add('down');
      // A press near the edge of the button already counts as aiming that way.
      if (Math.hypot(cx - u.ox, cy - u.oy) > r.width * 0.3) update(cx, cy);
    };
    const end = () => { Object.assign(u, { active: false, id: null, x: 0, y: 0 }); knob.style.transform = ''; el.classList.remove('down'); };
    el.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; start(t.identifier, t.clientX, t.clientY); e.preventDefault(); e.stopPropagation(); }, { passive: false });
    el.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === u.id) update(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
    const tend = (e) => { for (const t of e.changedTouches) if (t.identifier === u.id) end(); e.preventDefault(); };
    el.addEventListener('touchend', tend, { passive: false });
    el.addEventListener('touchcancel', tend, { passive: false });
    el.addEventListener('mousedown', (e) => { start('mouse', e.clientX, e.clientY); e.preventDefault(); e.stopPropagation(); });
    window.addEventListener('mousemove', (e) => { if (u.id === 'mouse') update(e.clientX, e.clientY); });
    window.addEventListener('mouseup', () => { if (u.id === 'mouse') end(); });
  }

  bindButton(el, name) {
    const down = (e) => { this.usedTouch = true; if (!this.buttons[name]) this.buttonPressed.add(name); this.buttons[name] = true; el.classList.add('down'); e.preventDefault(); e.stopPropagation(); };
    const up = (e) => { this.buttons[name] = false; el.classList.remove('down'); e.preventDefault(); };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    el.addEventListener('mousedown', down);
    el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);
  }

  releaseAll() {
    for (const k in this.buttons) this.buttons[k] = false;
    Object.assign(this.useStick, { active: false, id: null, x: 0, y: 0 });
    this.joy.x = this.joy.y = 0; this.joy.active = false; this.joy.id = null;
    this.touch.active = false; this.touch.id = null;
  }

  // Aggregated intents for the player this tick.
  intents() {
    const k = this.keys;
    let mx = 0, my = 0;
    if (k.has('a') || k.has('ArrowLeft')) mx -= 1;
    if (k.has('d') || k.has('ArrowRight')) mx += 1;
    if (k.has('w') || k.has('ArrowUp')) my -= 1;
    if (k.has('s') || k.has('ArrowDown')) my += 1;
    if (this.joy.active) {
      if (Math.abs(this.joy.x) > 0.25) mx = this.joy.x;
      if (Math.abs(this.joy.y) > 0.45) my = this.joy.y;
    }
    const jump = k.has(' ') || this.buttons.jump || (this.joy.active && this.joy.y < -0.75);
    const jumpPressed = this.pressed.has(' ') || this.buttonPressed.has('jump');
    return {
      mx: Math.max(-1, Math.min(1, mx)), my, jump, jumpPressed,
      down: my > 0.5,
      up: my < -0.5,
      hook: this.pressed.has('f') || this.buttonPressed.has('hook'),
      heal: this.pressed.has('h') || this.buttonPressed.has('heal'),
      energy: this.pressed.has('j') || this.buttonPressed.has('energy'),
      dash: this.pressed.has('Shift') || this.buttonPressed.has('dash'),
      inventory: this.pressed.has('e') || this.pressed.has('Escape') || this.pressed.has('i') || this.buttonPressed.has('inventory'),
      map: this.pressed.has('m') || this.buttonPressed.has('map'),
      throwItem: this.pressed.has('t'),
      ride: this.pressed.has('r') || this.buttonPressed.has('ride'),
      aug: this.pressed.has('q') || this.buttonPressed.has('aug'),
    };
  }

  endFrame() {
    this.pressed.clear();
    this.buttonPressed.clear();
    this.wheel = 0;
  }
}
