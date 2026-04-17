// ══════════════════════════════════════════════════════════════════
// TRACKS.JS — Track engine + automatic track discovery
//
// ── ONE-TIME SETUP ────────────────────────────────────────────────
// Set your GitHub username and repository name below.
// After that you never touch this file again.
//
// HOW TO ADD A NEW TRACK:
//   1. Name your file  track_something.js  (must start with "track_")
//   2. Upload it to your GitHub repo
//   Done — it appears in the track selector automatically.
//
// ── HOW IT WORKS ─────────────────────────────────────────────────
// On load, this file queries the GitHub API for all files in your
// repo that match track_*.js and loads them as <script> tags
// synchronously, before physics.js runs.
// ══════════════════════════════════════════════════════════════════

// ▼▼▼ SET YOUR GITHUB REPO HERE (only thing you ever change) ▼▼▼
var GITHUB_REPO = 'your-username/your-repo-name';
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// ── Auto-discover and load all track_*.js files ───────────────────
// Uses synchronous XHR so tracks are guaranteed to be loaded before
// physics.js runs (which needs TRACK_DEFS populated at parse time).
(function _autoLoadTracks() {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://api.github.com/repos/' + GITHUB_REPO + '/contents/', false);
    xhr.send();

    if (xhr.status === 200) {
      var files = JSON.parse(xhr.responseText);
      files
        .filter(function(f) { return /^track_.*\.js$/i.test(f.name); })
        .sort(function(a, b) { return a.name.localeCompare(b.name); })
        .forEach(function(f) {
          // document.write during synchronous script execution inserts
          // the tag right here in the HTML stream — the browser loads
          // it synchronously before moving on to the next <script> tag.
          document.write('<script src="' + f.name + '"><\/script>');
        });
    } else {
      _fallback();
    }
  } catch(e) {
    _fallback();
  }

  // Fallback: used when running locally (file://) or if GitHub API
  // is unreachable. Lists your known tracks so the game still works.
  function _fallback() {
    var known = ['track_oval.js', 'track_my_circuit.js'];
    known.forEach(function(name) {
      document.write('<script src="' + name + '"><\/script>');
    });
  }
})();

// ══════════════════════════════════════════════════════════════════
// Everything below is the track engine — do not edit
// ══════════════════════════════════════════════════════════════════

const TW = 14;

const TRACK_DEFS = {};
const _trackOrder = [];

// Called by each track_*.js file to register itself
function registerTrack(id, def) {
  TRACK_DEFS[id] = def;
  _trackOrder.push(id);
}

// ── Catmull-Rom spline interpolation ─────────────────────────────
function catmullRom(pts, nPerSeg) {
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i];
    const p2 = pts[(i + 1) % n],     p3 = pts[(i + 2) % n];
    for (let j = 0; j < nPerSeg; j++) {
      const t = j / nPerSeg, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t
        + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2
        + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t
        + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
        + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      out.push(new THREE.Vector2(x, y));
    }
  }
  return out;
}

// ── Active track state ────────────────────────────────────────────
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

// ── Build track picker UI after page finishes loading ─────────────
document.addEventListener('DOMContentLoaded', function() {
  const scroll = document.getElementById('track-cards-scroll');
  const dots   = document.getElementById('track-picker-dots');
  if (!scroll || !dots) return;

  scroll.innerHTML = '';
  dots.innerHTML   = '';

  _trackOrder.forEach(function(id, i) {
    const def     = TRACK_DEFS[id];
    const isFirst = (i === 0);

    const card = document.createElement('div');
    card.className     = 'track-slide-card' + (isFirst ? ' active' : '');
    card.dataset.track = id;
    card.innerHTML =
      '<canvas class="track-slide-canvas" id="tsc-' + id + '"></canvas>' +
      '<div class="track-slide-info">' +
        '<div>' +
          '<div class="track-slide-name">' + def.name + '</div>' +
          '<div class="track-slide-sub">'  + (def.sub || '') + '</div>' +
        '</div>' +
        '<div class="track-slide-badge">' + (isFirst ? 'SELECTED' : '') + '</div>' +
      '</div>';
    scroll.appendChild(card);

    const dot = document.createElement('div');
    dot.className = 'tp-dot' + (isFirst ? ' active' : '');
    dots.appendChild(dot);
  });

  const firstDef = TRACK_DEFS[_trackOrder[0]];
  if (firstDef) {
    const nameEl = document.getElementById('track-card-name');
    const subEl  = document.getElementById('track-card-sub');
    if (nameEl) nameEl.textContent = firstDef.name;
    if (subEl)  subEl.textContent  = firstDef.sub
      + ' · ' + _trackOrder.length
      + ' layout' + (_trackOrder.length > 1 ? 's' : '');
  }
});
