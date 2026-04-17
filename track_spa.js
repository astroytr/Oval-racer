// ══════════════════════════════════════════════════════════════════
// TRACK_SPA.JS — Spa-Francorchamps (Belgium)
//
// To use: upload this file to your GitHub repo.
// tracks.js will discover it automatically — nothing else to change.
//
// File must be named  track_*.js  for auto-discovery to work.
// ══════════════════════════════════════════════════════════════════

registerTrack('spa', {

  name: 'SPA',
  sub:  'Spa-Francorchamps',

  // ── Sky colour and fog for a Belgian Ardennes environment ─────────
  sky: 0x8aafc0,
  fog: [0x8aafc0, 300, 900],

  // ── build() returns an array of THREE.Vector2 points forming the
  // closed centreline, traced from the Spa-Francorchamps layout.
  // Coordinate system: X = left/right, Y = forward/back (Z in world).
  // Scale: roughly 1 unit ≈ 1 metre, circuit ~7 km total.
  //
  // Traced clockwise starting at La Source hairpin (start/finish).
  // Key sectors:
  //   La Source hairpin → Eau Rouge/Raidillon → Kemmel straight
  //   → Les Combes → Malmedy → Rivage → Pouhon → Stavelot
  //   → Blanchimont → Bus Stop chicane → La Source
  // ──────────────────────────────────────────────────────────────────
  build() {
    // Raw normalised pixel coords from image (x: 0-720, y: 0-1560)
    // converted to world units.  Image bounds mapped to ~[-350, 350] x
    // ~[-700, 700] so the full circuit fits comfortably.
    const px = (x, y) => new THREE.Vector2(
      (x / 720) * 700 - 350,
      -((y / 1560) * 1400 - 700)   // flip Y so up is positive
    );

    // Helper: lerp N intermediate points between two px() calls
    function seg(points, steps = 6) {
      const out = [];
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        for (let t = 0; t < steps; t++) {
          const f = t / steps;
          out.push(new THREE.Vector2(
            a.x + (b.x - a.x) * f,
            a.y + (b.y - a.y) * f
          ));
        }
      }
      return out;
    }

    // ── Waypoints traced from the image (pixel space) ─────────────
    // Start at La Source (top-left of the circuit).
    // Numbers are (px_x, px_y) read from the red centreline.
    const waypoints = [
      // La Source hairpin — start/finish straight entry
      [232, 342],   // La Source apex — top-left
      [248, 358],
      [268, 365],   // hairpin exit, heading right
      [295, 358],
      [320, 340],

      // Eau Rouge descent & Raidillon climb — shoots up-right
      [355, 295],
      [390, 240],
      [420, 200],
      [455, 170],   // Raidillon crest
      [478, 195],
      [482, 230],

      // Kemmel straight — long right edge coming back down
      [490, 280],
      [492, 330],
      [488, 390],
      [480, 440],

      // Les Combes — left-right-left chicane at top of Kemmel
      [468, 480],
      [450, 500],
      [435, 490],
      [418, 475],
      [400, 480],
      [385, 500],

      // Malmedy — left flick
      [375, 530],
      [368, 560],
      [372, 590],
      [382, 610],

      // Rivage hairpin — tight left, heading back left
      [380, 640],
      [365, 658],
      [342, 665],
      [320, 655],
      [305, 635],
      [302, 610],
      [310, 588],

      // Double Gauche / Pouhon — long sweeping left
      [305, 560],
      [288, 540],
      [268, 525],
      [245, 520],
      [220, 525],
      [200, 545],
      [188, 570],
      [185, 600],

      // Stavelot — fast right kink into left loop
      [195, 635],
      [215, 660],
      [235, 675],

      // Stavelot loop — large left-hand bubble bottom-left
      [230, 700],
      [215, 730],
      [195, 755],
      [168, 768],
      [142, 768],
      [118, 755],
      [102, 730],
      [100, 700],
      [112, 672],
      [132, 650],
      [158, 638],
      [185, 635],

      // Out of Stavelot — heading right toward Blanchimont
      [215, 640],
      [248, 648],
      [280, 662],
      [312, 680],
      [340, 700],

      // Blanchimont — fast right arc
      [368, 718],
      [395, 730],
      [420, 738],
      [448, 740],

      // Bus Stop chicane — tight right-left at bottom-right
      [472, 748],
      [498, 755],
      [520, 768],
      [535, 790],
      [530, 815],
      [512, 830],
      [490, 838],

      // Bus Stop exit — left part
      [468, 832],
      [450, 820],
      [438, 802],
      [432, 782],

      // Blanchimont return straight — heading back up-left toward La Source
      [420, 760],
      [400, 740],
      [375, 720],
      [348, 700],
      [320, 678],
      [295, 655],
      [268, 628],
      [248, 598],
      [235, 565],
      [228, 530],
      [225, 495],
      [228, 460],
      [232, 425],
      [235, 390],
      [234, 355],
      [232, 342],  // close — back to La Source
    ];

    // Interpolate every segment to get smooth dense point cloud
    const pts = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const [x0, y0] = waypoints[i];
      const [x1, y1] = waypoints[i + 1];
      const steps = Math.max(4, Math.round(
        Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2) / 6
      ));
      for (let t = 0; t < steps; t++) {
        const f = t / steps;
        pts.push(px(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f));
      }
    }

    return pts;
  },

  // ── buildScene() — 3D environment for Spa ────────────────────────
  buildScene({ addObj, THREE, CENTRE, N_PTS, TW, tangentAt }) {

    // ── GROUND — green Ardennes hillside feel ──────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 3000),
      new THREE.MeshLambertMaterial({ color: 0x3d6b3d })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    addObj(ground);

    // ── ARMCO / CONCRETE BARRIERS (outside edge) ───────────────────
    const BOFF = TW / 2 + TW * 0.9;
    const BH = 1.0, TR = 0.3, BF = 2.0;
    const bv = [], bi = [], bu = [], bc = [];
    let bvi = 0;

    for (let i = 0; i < N_PTS; i++) {
      const i1  = (i + 1) % N_PTS;
      const c0  = CENTRE[i], c1 = CENTRE[i1];
      const t0  = tangentAt(i), t1 = tangentAt(i1);
      const nx0 = -t0.tz, nz0 = t0.tx;
      const nx1 = -t1.tz, nz1 = t1.tx;
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
        // Armco silver/grey alternating panels
        const rc = tr2 === 0 ? [0.72, 0.72, 0.74] : [0.60, 0.60, 0.62];
        bv.push(bx, 0, bz);
        bu.push(s, 0); bc.push(...rc);
        bv.push(bx + nx * bump * 0.4, BH + bump, bz + nz * bump * 0.4);
        bu.push(s, 1); bc.push(...rc);
      }
      bi.push(bvi, bvi + 2, bvi + 1, bvi + 1, bvi + 2, bvi + 3);
      bvi += 4;
    }

    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bv, 3));
    bg.setAttribute('color',    new THREE.Float32BufferAttribute(bc, 3));
    bg.setAttribute('uv',       new THREE.Float32BufferAttribute(bu, 2));
    bg.setIndex(bi);
    bg.computeVertexNormals();

    const bm = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    }));
    bm.castShadow    = true;
    bm.receiveShadow = true;
    addObj(bm);
  },

});
