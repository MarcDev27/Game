// Screen-adaptive layout for every iPhone, including the folding iPhone Duo.
// Follows Apple's iPhone Duo guidance: fill the screen in every pose, keep 44pt touch targets,
// keep controls out of the fold, and favor small adjustments over rearranging the interface.
//
// Fold detection, best source first:
//  1. the Viewport Segments API — JavaScript (window.viewport.segments) or the CSS
//     env(viewport-segment-*) variables and *-viewport-segments media queries that Safari 27.1
//     ships behind a feature flag;
//  2. the Device Posture API (navigator.devicePosture / the device-posture media query);
//  3. the manual "Fold layout" setting.
// Without segment geometry the hinge is assumed to be at the middle of the physical screen, which
// is not the middle of the page when the system keeps a bar (status bar, camera) outside it.

const mq = (q) => { try { return window.matchMedia(q); } catch (e) { return null; } };
const MQ = {
  hseg: mq('(horizontal-viewport-segments: 2)'),
  vseg: mq('(vertical-viewport-segments: 2)'),
  folded: mq('(device-posture: folded)'),
};

let probe = null;
function cssSegments() {
  const book = MQ.hseg && MQ.hseg.matches, laptop = MQ.vseg && MQ.vseg.matches;
  if (!book && !laptop) return null;
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;';
    document.body.appendChild(probe);
  }
  const read = (name) => {
    probe.style.left = `env(${name}, -1px)`;
    const v = parseFloat(getComputedStyle(probe).left);
    return Number.isFinite(v) && v >= 0 ? v : null;
  };
  if (book) {
    const end = read('viewport-segment-right 0 0'), start = read('viewport-segment-left 1 0');
    if (end !== null && start !== null) return { mode: 'book', x: end, w: Math.max(0, start - end) };
  } else {
    const end = read('viewport-segment-bottom 0 0'), start = read('viewport-segment-top 0 1');
    if (end !== null && start !== null) return { mode: 'laptop', y: end, h: Math.max(0, start - end) };
  }
  return null;
}

// Where the middle of the physical screen falls in page coordinates. On iPhone Duo the system
// keeps a strip outside the page — along the trailing side, or along the bottom of the inner
// display in portrait — so the page starts at the screen's top-left corner but is smaller than
// the screen, and the middle of the page is not where the hinge is.
function screenSize(W, H) {
  let sw = window.screen ? screen.width : W, sh = window.screen ? screen.height : H;
  if ((W > H) !== (sw > sh)) [sw, sh] = [sh, sw]; // iOS reports screen size in portrait
  return { sw, sh };
}
function screenMiddle(W, H) {
  const { sw, sh } = screenSize(W, H);
  // Only trust a difference that looks like a system strip, not a desktop browser window.
  const ok = (d, s) => d > 2 && d < s * 0.2;
  return { x: ok(sw - W, sw) ? sw / 2 : W / 2, y: ok(sh - H, sh) ? sh / 2 : H / 2 };
}

let lastFold = { mode: 'none' };
// Everything the browser reports about the screen, shown in Settings for troubleshooting.
window.__neonDisplay = () => {
  const W = window.innerWidth, H = window.innerHeight, { sw, sh } = screenSize(W, H);
  let ins = '?';
  try {
    const pr = document.createElement('div');
    pr.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0)';
    document.body.appendChild(pr);
    const c = getComputedStyle(pr);
    ins = [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map((v) => parseFloat(v)).join(' / ');
    pr.remove();
  } catch (e) { /* ignore */ }
  const dm = ['fullscreen', 'standalone', 'minimal-ui', 'browser'].find((m) => (mq(`(display-mode: ${m})`) || {}).matches) || '?';
  let posture = 'not available';
  try { if (navigator.devicePosture) posture = navigator.devicePosture.type; } catch (e) { /* ignore */ }
  if (posture === 'not available' && MQ.folded && MQ.folded.matches) posture = 'folded (CSS)';
  const segs = window.viewport && window.viewport.segments ? window.viewport.segments.length : (MQ.hseg && MQ.hseg.matches ? '2 side by side (CSS)' : MQ.vseg && MQ.vseg.matches ? '2 stacked (CSS)' : 'not available');
  const f = lastFold;
  return {
    Build: window.__neonBuild || '?',
    Page: `${W} × ${H}`, Screen: `${sw} × ${sh}`, 'Pixel ratio': window.devicePixelRatio,
    'Safe area (t/r/b/l)': ins, 'Display mode': dm + (navigator.standalone ? ' (Home Screen)' : ''),
    Posture: posture, Segments: segs,
    Fold: f.mode === 'book' ? `book at x=${Math.round(f.x)}` : f.mode === 'laptop' ? `laptop at y=${Math.round(f.y)}` : 'none',
  };
};

export function detectFold(settings) {
  const W = window.innerWidth, H = window.innerHeight;
  const pref = settings.foldMode || 'auto';
  if (pref === 'off') return { mode: 'none' };
  const mid = screenMiddle(W, H);
  const shift = settings.foldShift || 0;
  mid.x += shift; mid.y += shift;
  const clampX = (x) => Math.round(Math.min(W * 0.7, Math.max(W * 0.3, x)));
  const clampY = (y) => Math.round(Math.min(H * 0.7, Math.max(H * 0.3, y)));
  if (pref === 'book') return { mode: 'book', x: clampX(mid.x), w: 0 };
  if (pref === 'laptop') return { mode: 'laptop', y: clampY(mid.y), h: 0 };
  let segs = null;
  try { segs = window.viewport && window.viewport.segments; } catch (e) { segs = null; }
  if (segs && segs.length > 1) {
    const a = segs[0], b = segs[1];
    if (Math.abs(a.top - b.top) < 4) {
      const x = a.left + a.width;
      return { mode: 'book', x, w: Math.max(0, b.left - x) };
    }
    const y = a.top + a.height;
    return { mode: 'laptop', y, h: Math.max(0, b.top - y) };
  }
  const css = cssSegments();
  if (css) return css;
  // Posture without segment geometry: assume the fold runs through the middle of the screen.
  let folded = MQ.folded && MQ.folded.matches;
  try { if (navigator.devicePosture) folded = navigator.devicePosture.type === 'folded'; } catch (e) { /* not supported */ }
  if (folded) return W >= H ? { mode: 'book', x: clampX(mid.x), w: 0 } : { mode: 'laptop', y: clampY(mid.y), h: 0 };
  return { mode: 'none' };
}

// Applies body classes and CSS variables. Returns the rectangle the game canvas should fill.
export function applyLayout(settings) {
  const W = window.innerWidth, H = window.innerHeight;
  const fold = detectFold(settings);
  lastFold = fold;
  const b = document.body, st = document.documentElement.style;
  const portrait = H > W;
  let gameH = H;
  b.classList.toggle('fold-book', fold.mode === 'book');
  b.classList.toggle('fold-laptop', fold.mode === 'laptop');
  b.classList.toggle('portrait', portrait);
  // A wide single-row hotbar only when there is room for 10 touch-size slots plus the side HUD.
  b.classList.toggle('wide', W >= 900 && !portrait);
  if (fold.mode === 'book') {
    st.setProperty('--fold-x', fold.x + 'px');
    st.setProperty('--fold-w', fold.w + 'px');
    st.setProperty('--center-x', Math.round(fold.x / 2) + 'px');
    st.setProperty('--center-w', Math.max(200, fold.x - 40) + 'px');
  } else {
    st.setProperty('--center-x', '50%');
    st.setProperty('--center-w', Math.min(520, W * 0.8) + 'px');
  }
  let actScale = 1;
  if (fold.mode === 'laptop') {
    // Game on the top half, controls on the bottom half — like a handheld console.
    gameH = fold.y;
    const ctrlH = Math.max(0, H - fold.y - fold.h);
    st.setProperty('--fold-y', fold.y + 'px');
    st.setProperty('--fold-h', fold.h + 'px');
    st.setProperty('--ctrl-h', ctrlH + 'px');
    // Menu buttons join the controls when they fit beside the hotbar; on a narrow screen they
    // stay next to the minimap. Hotbar in one row when it fits, otherwise two banks of five.
    const menuInPanel = W >= 410;
    b.classList.toggle('laptop-menu', menuInPanel);
    b.classList.toggle('laptop-row', W >= 660);
    // The action buttons sit under the menu row; shrink them on a short panel, grow them on a tall one.
    actScale = Math.max(0.72, Math.min(1.2, (ctrlH - (menuInPanel ? 80 : 24)) / 202));
  } else { b.classList.remove('laptop-row'); b.classList.remove('laptop-menu'); }
  st.setProperty('--act-scale', actScale.toFixed(3));
  return { w: W, h: gameH, fold };
}

export function watchLayout(onChange) {
  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', () => setTimeout(onChange, 150));
  try { if (window.visualViewport) window.visualViewport.addEventListener('resize', onChange); } catch (e) { /* ignore */ }
  try { if (navigator.devicePosture) navigator.devicePosture.addEventListener('change', onChange); } catch (e) { /* ignore */ }
  try { if (window.viewport && window.viewport.addEventListener) window.viewport.addEventListener('segmentschange', onChange); } catch (e) { /* ignore */ }
  for (const m of Object.values(MQ)) try { if (m) m.addEventListener('change', onChange); } catch (e) { /* ignore */ }
}
