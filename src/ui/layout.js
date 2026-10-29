// Screen-adaptive layout for every iPhone, including the folding iPhone Duo.
// Follows Apple's iPhone Duo guidance: fill the screen in every pose, keep 44pt touch targets,
// keep controls out of the fold, and favor small adjustments over rearranging the interface.
//
// Fold detection uses the web-standard Viewport Segments API (window.viewport.segments) and
// Device Posture API (navigator.devicePosture) when the browser exposes them, with a manual
// "Fold layout" setting as a fallback.

export function detectFold(settings) {
  const W = window.innerWidth, H = window.innerHeight;
  const pref = settings.foldMode || 'auto';
  if (pref === 'off') return { mode: 'none' };
  if (pref === 'book') return { mode: 'book', x: W / 2, w: 0 };
  if (pref === 'laptop') return { mode: 'laptop', y: Math.round(H / 2), h: 0 };
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
  // Posture without segment geometry: assume the fold runs through the middle.
  try {
    if (navigator.devicePosture && navigator.devicePosture.type === 'folded') {
      return W >= H ? { mode: 'book', x: W / 2, w: 0 } : { mode: 'laptop', y: Math.round(H / 2), h: 0 };
    }
  } catch (e) { /* not supported */ }
  return { mode: 'none' };
}

// Applies body classes and CSS variables. Returns the rectangle the game canvas should fill.
export function applyLayout(settings) {
  const W = window.innerWidth, H = window.innerHeight;
  const fold = detectFold(settings);
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
  if (fold.mode === 'laptop') {
    // Game on the top half, controls on the bottom half — like a handheld console.
    gameH = fold.y;
    st.setProperty('--fold-y', fold.y + 'px');
    st.setProperty('--fold-h', fold.h + 'px');
    st.setProperty('--ctrl-h', Math.max(0, H - fold.y - fold.h) + 'px');
  }
  return { w: W, h: gameH, fold };
}

export function watchLayout(onChange) {
  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', () => setTimeout(onChange, 150));
  try { if (window.visualViewport) window.visualViewport.addEventListener('resize', onChange); } catch (e) { /* ignore */ }
  try { if (navigator.devicePosture) navigator.devicePosture.addEventListener('change', onChange); } catch (e) { /* ignore */ }
  try { if (window.viewport && window.viewport.addEventListener) window.viewport.addEventListener('segmentschange', onChange); } catch (e) { /* ignore */ }
}
