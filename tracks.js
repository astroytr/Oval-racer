// ══════════════════════════════════════════════════════════════════
// TRACKS.JS — Track engine + track registry
//
// HOW TO ADD A NEW TRACK:
//   1. Name your file  track_something.js  (must start with "track_")
//   2. Add a <script src="track_something.js"></script> tag in
//      index.html BEFORE the  <script src="tracks.js">  line.
//   3. That's it — it appears in the picker automatically.
//
// NOTE: The old GitHub API auto-discovery method was removed because
// document.write() is unreliable in modern browsers and the GitHub
// API requires authentication. Script tags in index.html are the
// simplest, most reliable approach.
// ══════════════════════════════════════════════════════════════════

const TW = 14;

const TRACK_DEFS  = {};
const _trackOrder = [];

function registerTrack(id, def) {
  if (!id || !def) return;
  if (!_trackOrder.includes(id)) _trackOrder.push(id);
  TRACK_DEFS[id] = def;
}

// ══════════════════════════════════════════════════════════════════
// PHASE 2 — Engine: shared functions used by physics.js and ui.js
// ══════════════════════════════════════════════════════════════════

// Catmull-Rom spline — smooths waypoints into a dense centreline
function catmullRom(pts, nPerSeg) {
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i];
    const p2 = pts[(i + 1) % n],     p3 = pts[(i + 2) % n];
    for (let j = 0; j < nPerSeg; j++) {
      const t = j / nPerSeg, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
      const y = 0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3);
      out.push(new THREE.Vector2(x, y));
    }
  }
  return out;
}

let currentTrack = 'oval';
let CENTRE = [];
let N_PTS  = 0;

function buildCentreline(trackId) {
  const def = TRACK_DEFS[trackId || _trackOrder[0] || 'oval'];
  if (!def) return [];
  if (def.build) return def.build();
  const wpts = def.waypoints.map(p => new THREE.Vector2(p[0], p[1]));
  return catmullRom(wpts, def.nPerSeg || 8);
}

function initTrack(trackId) {
  currentTrack = trackId || _trackOrder[0] || 'oval';
  CENTRE = buildCentreline(currentTrack);
  N_PTS  = CENTRE.length;
}

function tangentAt(i) {
  const prev = CENTRE[(i - 1 + N_PTS) % N_PTS];
  const next = CENTRE[(i + 1) % N_PTS];
  const dx = next.x - prev.x, dz = next.y - prev.y;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  return { tx: dx / len, tz: dz / len };
}

// ══════════════════════════════════════════════════════════════════
// PHASE 3 — Build track picker UI *right now*, synchronously.
//
// Because tracks.js sits at the bottom of <body>, the full DOM
// already exists here.  Building cards now means ui.js (the very
// next script tag) will find them in the DOM, attach its click
// handlers, and draw the minimap previews — exactly as if the
// cards had been hardcoded in the HTML.
// ══════════════════════════════════════════════════════════════════
function buildTrackPickerUI() {
  const scroll = document.getElementById('track-cards-scroll');
  const dots   = document.getElementById('track-picker-dots');
  if (!scroll || !dots || !_trackOrder.length) return;

  scroll.innerHTML = '';
  dots.innerHTML   = '';

  _trackOrder.forEach(function(id, i) {
    const def     = TRACK_DEFS[id];
    const isFirst = (i === 0);

    // Card
    const card = document.createElement('div');
    card.className     = 'track-slide-card' + (isFirst ? ' active' : '');
    card.dataset.track = id;

    const canvas = document.createElement('canvas');
    canvas.className = 'track-slide-canvas';
    canvas.id        = 'tsc-' + id;

    const info = document.createElement('div');
    info.className = 'track-slide-info';
    info.innerHTML =
      '<div>' +
        '<div class="track-slide-name">' + def.name + '</div>' +
        '<div class="track-slide-sub">'  + (def.sub || '') + '</div>' +
      '</div>' +
      (isFirst ? '<div class="track-slide-badge">SELECTED</div>' : '');

    card.appendChild(canvas);
    card.appendChild(info);
    scroll.appendChild(card);

    // Dot
    const dot = document.createElement('div');
    dot.className = 'tp-dot' + (isFirst ? ' active' : '');
    dots.appendChild(dot);
  });

  // Update the main track card preview (right-side card on pre-start screen)
  const firstDef = TRACK_DEFS[_trackOrder[0]];
  if (firstDef) {
    const nameEl = document.getElementById('track-card-name');
    const subEl  = document.getElementById('track-card-sub');
    if (nameEl) nameEl.textContent = firstDef.name;
    if (subEl)  subEl.textContent  = firstDef.sub
      + ' · ' + _trackOrder.length
      + ' layout' + (_trackOrder.length > 1 ? 's' : '');
  }
}

buildTrackPickerUI();
