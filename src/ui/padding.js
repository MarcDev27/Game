// Colors the strip the system keeps outside the page (the status-bar and camera strip along the
// side of iPhone Duo, or along the bottom of its inner display in portrait). Safari 27.1 doesn't
// extend web content there; it fills the strip with the page's background color. So the page's
// background color follows the game: it is set to the dominant color along the edge next to the
// strip, and eases toward it so the strip doesn't flicker. A side strip can only take one color,
// so it matches the upper part of the edge, beside the status icons: the sky in daylight, the dark
// of night or the underground otherwise.
const ROWS = 64;

function dominant(data) {
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] >> 5) << 6 | (data[i + 1] >> 5) << 3 | (data[i + 2] >> 5);
    const b = buckets.get(key) || [0, 0, 0, 0];
    b[0] += data[i]; b[1] += data[i + 1]; b[2] += data[i + 2]; b[3]++;
    buckets.set(key, b);
  }
  let best = null;
  for (const b of buckets.values()) if (!best || b[3] > best[3]) best = b;
  return best ? [best[0] / best[3], best[1] / best[3], best[2] / best[3]] : [5, 6, 15];
}

export function startPadding(canvas, getState) {
  const probe = document.createElement('canvas'); probe.width = 2; probe.height = ROWS;
  const pc = probe.getContext('2d', { willReadFrequently: true });
  const root = document.documentElement.style;
  const meta = document.querySelector('meta[name="theme-color"]');
  let cur = [5, 6, 15], last = '';
  const tick = () => {
    if (!canvas.width || !canvas.height) return;
    const st = getState();
    const W = window.innerWidth, H = window.innerHeight;
    let sw = screen.width, sh = screen.height;
    if ((W > H) !== (sw > sh)) [sw, sh] = [sh, sw];
    // Which edge has the strip: whichever dimension the page is short of, or a best guess.
    const bottom = sh - H > 2 ? true : sw - W > 2 ? false : H > W && W >= 600;
    const cw = canvas.width, ch = canvas.height;
    let target;
    if (bottom) {
      // Below the controls panel in laptop mode, otherwise below the game view.
      target = st.gameH < H - 2 ? [5, 6, 15] : (pc.drawImage(canvas, 0, ch - 1, cw, 1, 0, 0, 2, ROWS), dominant(pc.getImageData(0, 0, 2, ROWS).data));
    } else {
      const top = Math.max(1, Math.round(ch * 0.45 * Math.min(1, H / st.gameH)));
      pc.drawImage(canvas, 0, 0, 1, Math.min(ch, top), 0, 0, 1, ROWS);
      pc.drawImage(canvas, cw - 1, 0, 1, Math.min(ch, top), 1, 0, 1, ROWS);
      target = dominant(pc.getImageData(0, 0, 2, ROWS).data);
    }
    cur = cur.map((v, i) => v + (target[i] - v) * 0.35);
    const hex = '#' + cur.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    if (hex === last) return;
    last = hex;
    root.backgroundColor = hex;
    document.body.style.backgroundColor = hex;
    if (meta) meta.setAttribute('content', hex);
  };
  setInterval(tick, 250);
}
