// ══════════════════════════════════════════════════════════════════
// TRACK_OVAL.JS — Short high-speed oval track
//
// To use: upload this file to your GitHub repo.
// tracks.js will discover it automatically — nothing else to change.
//
// File must be named  track_*.js  for auto-discovery to work.
// ══════════════════════════════════════════════════════════════════

registerTrack('oval', {

  name: 'OVAL',
  sub:  'Short oval',

  // ── Sky colour and fog for the oval environment ───────────────────
  sky: 0x7ac0e8,
  fog: [0x7ac0e8, 200, 680],

  // ── build() returns an array of THREE.Vector2 points that form the
  // closed centreline of the track.
  build() {
    const pts = [];
    const HW    = 60;   // half-width of the oval (left/right spread)
    const SL    = 280;  // half-length of the straights
    const SS    = 18;   // straight segments (controls resolution)
    const HSEGS = 36;   // semicircle segments at each end

    // Right straight — top to bottom
    for (let i = 0; i <= SS; i++)
      pts.push(new THREE.Vector2(HW, -SL * (i / SS)));

    // Bottom hairpin — swings from right side to left side
    for (let i = 1; i <= HSEGS; i++) {
      const a = Math.PI * i / HSEGS;
      pts.push(new THREE.Vector2(Math.cos(a) * HW, -SL - Math.sin(a) * HW));
    }

    // Left straight — bottom to top
    for (let i = 1; i <= SS * 2; i++)
      pts.push(new THREE.Vector2(-HW, -SL + 2 * SL * (i / (SS * 2))));

    // Top hairpin — swings from left side back to right side
    for (let i = 1; i <= HSEGS; i++) {
      const a = Math.PI * i / HSEGS;
      pts.push(new THREE.Vector2(-Math.cos(a) * HW, SL + Math.sin(a) * HW));
    }

    // Right straight — top section back to start/finish
    for (let i = 1; i <= SS; i++)
      pts.push(new THREE.Vector2(HW, SL - SL * (i / SS)));

    return pts;
  },

  // ── buildScene() — all 3D environment elements for the oval ──────
  //
  // Called by physics.js buildTrack() after the core asphalt / kerbs /
  // start-finish line are placed.  Everything specific to THIS track
  // lives here: ground, barriers, grandstands, trees, lights, etc.
  //
  // Parameters injected by the engine:
  //   addObj(mesh)   add a mesh to the scene (also registers it for
  //                  clean removal when the track changes)
  //   THREE          the THREE namespace
  //   CENTRE         centreline point array (THREE.Vector2[])
  //   N_PTS          number of centreline points
  //   TW             track width constant
  //   tangentAt(i)   returns {tx,tz} unit tangent at centreline index i
  //   scene          the THREE.Scene (use for ambient tweaks if needed)
  //
  buildScene({ addObj, THREE, CENTRE, N_PTS, TW, tangentAt }) {

    // ── GROUND ──────────────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshLambertMaterial({ color: 0x4a7a4a })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    addObj(ground);

    // ── CONCRETE BARRIERS ───────────────────────────────────────────
    // Single wall on the outside of the oval only (BOFF outward from
    // the track edge).  Height and surface pattern match the classic
    // concrete-wall look: slight bump texture + alternating grey tones.
    const BOFF = TW / 2 + TW, BH = 1.1, TR = 0.38, BF = 1.9;
    const bv = [], bi = [], bu = [], bc = []; let bvi = 0;
    for (let i = 0; i < N_PTS; i++) {
      const i1 = (i + 1) % N_PTS, c0 = CENTRE[i], c1 = CENTRE[i1];
      const t0 = tangentAt(i), t1 = tangentAt(i1);
      const nx0 = -t0.tz, nz0 = t0.tx, nx1 = -t1.tz, nz1 = t1.tx;
      const sl2 = Math.sqrt((c1.x - c0.x) ** 2 + (c1.y - c0.y) ** 2);
      const ph0 = i * 0.55, ph1 = ph0 + sl2 * BF;
      for (let s = 0; s < 2; s++) {
        const c  = s === 0 ? c0  : c1;
        const nx = s === 0 ? nx0 : nx1;
        const nz = s === 0 ? nz0 : nz1;
        const ph = s === 0 ? ph0 : ph1;
        const bump = Math.abs(Math.sin(ph * Math.PI)) * TR * 0.35;
        const bx = c.x + nx * BOFF, bz = c.y + nz * BOFF;
        const tr2 = Math.floor(ph / 1.0) % 2;
        const rc  = tr2 === 0 ? [0.08, 0.08, 0.08] : [0.14, 0.12, 0.10];
        bv.push(bx, 0, bz);                           bu.push(s, 0); bc.push(...rc);
        bv.push(bx + nx * bump * 0.4, BH + bump, bz + nz * bump * 0.4);
                                                       bu.push(s, 1); bc.push(...rc);
      }
      bi.push(bvi, bvi + 2, bvi + 1, bvi + 1, bvi + 2, bvi + 3);
      bvi += 4;
    }
    const bg2 = new THREE.BufferGeometry();
    bg2.setAttribute('position', new THREE.Float32BufferAttribute(bv, 3));
    bg2.setAttribute('color',    new THREE.Float32BufferAttribute(bc, 3));
    bg2.setAttribute('uv',       new THREE.Float32BufferAttribute(bu, 2));
    bg2.setIndex(bi);
    bg2.computeVertexNormals();
    const bm = new THREE.Mesh(bg2, new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    }));
    bm.castShadow = true;
    bm.receiveShadow = true;
    addObj(bm);
  },

});
