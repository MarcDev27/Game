// Fills the space the system keeps outside the page (for example the status-bar and camera strip
// along the side of iPhone Duo) with artwork, per Apple's guidance for games that can't avoid
// pillarboxing. That strip shows the page's root background, so it is set to the game's own
// edge pixels stretched outward: the left and right edge columns for side bars, the top and
// bottom rows for bars above or below.
const N = 32;     // copies of each edge in the image, so smoothing never blends the two edges
const ROWS = 192; // resolution along the edge

export function startPadding(canvas, getState) {
  const side = document.createElement('canvas'); side.width = N * 2; side.height = ROWS;
  const ends = document.createElement('canvas'); ends.width = ROWS; ends.height = N * 2;
  const sc = side.getContext('2d'), ec = ends.getContext('2d');
  const root = document.documentElement.style;
  let on = false;
  const panel = (ctx, x, y, w, h, vertical) => {
    const g = vertical ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#0a1424'); g.addColorStop(1, '#05060f');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
  const tick = () => {
    const st = getState();
    if (!st.active || !canvas.width || !canvas.height) {
      if (on) { root.backgroundImage = root.backgroundSize = root.backgroundPosition = root.backgroundRepeat = ''; on = false; }
      return;
    }
    const W = window.innerWidth, H = window.innerHeight;
    const cw = canvas.width, ch = canvas.height;
    const gameRows = Math.max(1, Math.min(ROWS, Math.round(ROWS * st.gameH / H)));
    sc.imageSmoothingEnabled = ec.imageSmoothingEnabled = true;
    // Side image: [left edge × N | right edge × N]; below the game view sits the control panel.
    sc.drawImage(canvas, 0, 0, 1, ch, 0, 0, N, gameRows);
    sc.drawImage(canvas, cw - 1, 0, 1, ch, N, 0, N, gameRows);
    if (gameRows < ROWS) panel(sc, 0, gameRows, N * 2, ROWS - gameRows, true);
    // End image: [top edge × N ; bottom edge × N].
    ec.drawImage(canvas, 0, 0, cw, 1, 0, 0, ROWS, N);
    if (gameRows < ROWS) { ec.fillStyle = '#05060f'; ec.fillRect(0, N, ROWS, N); } else ec.drawImage(canvas, 0, ch - 1, cw, 1, 0, N, ROWS, N);
    root.backgroundImage = `url(${side.toDataURL()}), url(${ends.toDataURL()})`;
    root.backgroundSize = `${W}px ${H}px, ${W}px ${H}px`;
    // Offset by half a tile so the left half of the image lands left of the page, the right half right of it.
    root.backgroundPosition = `${-W / 2}px 0px, 0px ${-H / 2}px`;
    root.backgroundRepeat = 'repeat-x, repeat-y';
    on = true;
  };
  setInterval(tick, 250);
}
