// ══════════════════════════════════════════════════════════════════
// TRACKS.JS — All track definitions, centreline logic, and builder
// Add new tracks here. physics.js / ui.js reference TRACK_DEFS,
// CENTRE, N_PTS, TW, tangentAt, buildCentreline, initTrack only.
// ══════════════════════════════════════════════════════════════════

// ── Track width (metres) — shared constant ───────────────────────
const TW = 14;

// ── Catmull-Rom spline interpolation ────────────────────────────
// Converts sparse waypoints into a smooth dense centreline.
// nPerSeg = interpolated points per segment between waypoints.
function catmullRom(pts, nPerSeg){
  const out=[], n=pts.length;
  for(let i=0;i<n;i++){
    const p0=pts[(i-1+n)%n], p1=pts[i], p2=pts[(i+1)%n], p3=pts[(i+2)%n];
    for(let j=0;j<nPerSeg;j++){
      const t=j/nPerSeg, t2=t*t, t3=t2*t;
      const x=0.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
      const y=0.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3);
      out.push(new THREE.Vector2(x,y));
    }
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════
// TRACK DEFINITIONS
// ──────────────────────────────────────────────────────────────────
// Each entry needs:
//   name      — display name (string)
//   sub       — short subtitle shown on track card
//   barriers  — true = solid oval-style walls | false = kerbs only
//
// Shape defined by ONE of:
//   build()      — function that returns an array of THREE.Vector2
//   waypoints[]  — sparse [x,y] pairs; catmullRom() smooths them
//   nPerSeg      — (optional, waypoints mode) interpolation density
//
// Scale reference: TW=14m, car=1.8m wide, 1 unit = 1 metre.
// Target lap time: 30–60 s at normal race pace.
// ══════════════════════════════════════════════════════════════════

const TRACK_DEFS = {

  // ── OVAL ────────────────────────────────────────────────────────
  oval: {
    name: 'OVAL',
    sub: 'Short oval',
    barriers: true,
    build(){
      const pts=[], HW=60, SL=280, SS=18, HSEGS=36;
      for(let i=0;i<=SS;i++)
        pts.push(new THREE.Vector2(HW, -SL*(i/SS)));
      for(let i=1;i<=HSEGS;i++){
        const a=Math.PI*i/HSEGS;
        pts.push(new THREE.Vector2(Math.cos(a)*HW, -SL-Math.sin(a)*HW));
      }
      for(let i=1;i<=SS*2;i++)
        pts.push(new THREE.Vector2(-HW, -SL+2*SL*(i/(SS*2))));
      for(let i=1;i<=HSEGS;i++){
        const a=Math.PI*i/HSEGS;
        pts.push(new THREE.Vector2(-Math.cos(a)*HW, SL+Math.sin(a)*HW));
      }
      for(let i=1;i<=SS;i++)
        pts.push(new THREE.Vector2(HW, SL-SL*(i/SS)));
      return pts;
    }
  },

  // ── ARDENNES CIRCUIT (Spa-inspired) ─────────────────────────────
  spa: {
    name: 'ARDENNES CIRCUIT',
    sub: 'Inspired by Belgian forests',
    barriers: false,
    // Waypoints traced at 1.5 m/pixel — direction-reversal-free.
    // Corner names changed; Bus Stop simplified to single sweeper;
    // Blanchimont made double-apex; Bruxelles tightened.
    waypoints: [
      [-85.5,  32.2],  // SF line
      [-130.5,   2.2], // onto Blanchimont straight
      [-220.5,  -5.2], // Blanchimont double-apex 1
      [-265.5, -20.2], // Blanchimont double-apex 2
      [-295.5,  -5.2], // corner 2 kink
      [-310.5,  29.2], // sweeping approach
      [-288.0,  77.2], // La Carrière approach
      [-243.0, 152.2], // La Carrière apex — tight right hairpin
      [-175.5, 137.2], // La Carrière exit
      [-145.5,  92.2], // toward valley
      [-168.0,  32.2], // Roche Verte entry — fast left
      [-171.0, -12.8], // Roche Verte right — uphill
      [-153.0, -50.2], // crest
      [-123.0, -69.8], // Grand Ligne start
      [ -40.5, -98.2], // Grand Ligne mid
      [  79.5,-128.2], // Grand Ligne straight
      [ 162.0,-150.8], // Forêt chicane entry
      [ 222.0,-152.2], // Forêt chicane exit
      [ 289.5,-114.8], // Est hairpin approach
      [ 310.5, -75.8], // Est hairpin apex
      [ 292.5, -45.8], // Est exit
      [ 244.5, -30.8], // Grand Courbe entry
      [ 139.5, -23.2], // Grand Courbe — long left sweeper
      [  49.5,   5.2], // Grand Courbe exit
      [  34.5,  24.8], // Cascade entry
      [  72.0,  69.8], // Cascade right
      [ 102.0,  39.8], // Rivière sweeper
      [  64.5,  -5.2], // Rivière left
      [   4.5,   5.2], // returning to SF
      [ -43.5,  14.2], // SF approach
    ],
    nPerSeg: 14,
  },

  // ── ADD NEW TRACKS BELOW ─────────────────────────────────────────
  // Copy either the oval (build) or spa (waypoints) pattern above.
  // Then add a matching card in index.html inside #track-cards-scroll,
  // and register the canvas id in physics.js drawTrackOnCanvas() calls.
  // Example skeleton:
  //
  // mytrack: {
  //   name: 'MY TRACK',
  //   sub:  'Short description',
  //   barriers: false,
  //   waypoints: [
  //     [0, 0],   // SF line
  //     [100, 0],
  //     [100, 100],
  //     [0, 100],
  //   ],
  //   nPerSeg: 10,
  // },

};

// ══════════════════════════════════════════════════════════════════
// ACTIVE TRACK STATE — written by initTrack(), read everywhere
// ══════════════════════════════════════════════════════════════════

let currentTrack = 'oval'; // set before physics.js calls initTrack()
let CENTRE = [];
let N_PTS  = 0;

// Build the dense centreline array from a track definition
function buildCentreline(trackId){
  const def = TRACK_DEFS[trackId || 'oval'];
  if(def.build) return def.build();
  const wpts = def.waypoints.map(p => new THREE.Vector2(p[0], p[1]));
  return catmullRom(wpts, def.nPerSeg || 8);
}

// (Re)initialise CENTRE + N_PTS for the given track id
function initTrack(trackId){
  CENTRE = buildCentreline(trackId);
  N_PTS  = CENTRE.length;
}

// Unit tangent vector at centreline index i (forward direction)
function tangentAt(i){
  const prev=CENTRE[(i-1+N_PTS)%N_PTS], next=CENTRE[(i+1)%N_PTS];
  const dx=next.x-prev.x, dz=next.y-prev.y, len=Math.sqrt(dx*dx+dz*dz)||1;
  return { tx:dx/len, tz:dz/len };
}
