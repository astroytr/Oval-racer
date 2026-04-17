
// ══════════════════════════════════════════════════════════════════
// TRACK_SPA.JS — Spa-Francorchamps Circuit
//
// To use: upload this file to your GitHub repo.
// tracks.js will discover it automatically — nothing else to change.
//
// File must be named track_*.js for auto-discovery to work.
// ══════════════════════════════════════════════════════════════════

registerTrack('spa', {

  name: 'SPA-FRANCORCHAMPS',
  sub: 'Belgian Grand Prix Circuit',

  // ── Sky colour and fog for the Spa environment ───────────────────
  sky: 0x8ab8d4,
  fog: [0x8ab8d4, 300, 900],

  // ── build() returns an array of THREE.Vector2 points that form the
  // closed centreline of the track.
  build() {
    const pts = [];
    
    // Starting from the start/finish line, going around the circuit
    // All coordinates are approximate based on the circuit image
    
    // Start/Finish straight leading to La Source
    pts.push(new THREE.Vector2(-180, 320));
    pts.push(new THREE.Vector2(-160, 340));
    pts.push(new THREE.Vector2(-140, 360));
    pts.push(new THREE.Vector2(-120, 380));
    
    // La Source hairpin (tight right-hander at the top)
    pts.push(new THREE.Vector2(-100, 395));
    pts.push(new THREE.Vector2(-75, 405));
    pts.push(new THREE.Vector2(-45, 410));
    pts.push(new THREE.Vector2(-15, 408));
    pts.push(new THREE.Vector2(10, 400));
    pts.push(new THREE.Vector2(30, 388));
    pts.push(new THREE.Vector2(45, 372));
    
    // Exit La Source, heading downhill towards Eau Rouge
    pts.push(new THREE.Vector2(55, 350));
    pts.push(new THREE.Vector2(62, 320));
    pts.push(new THREE.Vector2(65, 290));
    pts.push(new THREE.Vector2(65, 260));
    pts.push(new THREE.Vector2(63, 230));
    pts.push(new THREE.Vector2(58, 200));
    
    // Eau Rouge - left turn at bottom
    pts.push(new THREE.Vector2(50, 175));
    pts.push(new THREE.Vector2(38, 155));
    pts.push(new THREE.Vector2(20, 140));
    pts.push(new THREE.Vector2(-2, 130));
    pts.push(new THREE.Vector2(-25, 125));
    
    // Raidillon - climbing right-hander
    pts.push(new THREE.Vector2(-48, 128));
    pts.push(new THREE.Vector2(-70, 138));
    pts.push(new THREE.Vector2(-88, 152));
    pts.push(new THREE.Vector2(-102, 170));
    pts.push(new THREE.Vector2(-112, 190));
    
    // Kemmel Straight (long fast straight)
    pts.push(new THREE.Vector2(-118, 215));
    pts.push(new THREE.Vector2(-122, 245));
    pts.push(new THREE.Vector2(-124, 275));
    pts.push(new THREE.Vector2(-125, 305));
    pts.push(new THREE.Vector2(-125, 335));
    pts.push(new THREE.Vector2(-124, 365));
    pts.push(new THREE.Vector2(-122, 395));
    pts.push(new THREE.Vector2(-119, 425));
    
    // Les Combes - right-left chicane
    pts.push(new THREE.Vector2(-113, 450));
    pts.push(new THREE.Vector2(-102, 470));
    pts.push(new THREE.Vector2(-88, 485));
    pts.push(new THREE.Vector2(-70, 495));
    pts.push(new THREE.Vector2(-52, 490));
    pts.push(new THREE.Vector2(-38, 478));
    pts.push(new THREE.Vector2(-28, 462));
    
    // Malmedy/Bruxelles corner
    pts.push(new THREE.Vector2(-22, 440));
    pts.push(new THREE.Vector2(-18, 415));
    pts.push(new THREE.Vector2(-16, 390));
    
    // Approaching Pouhon
    pts.push(new THREE.Vector2(-15, 365));
    pts.push(new THREE.Vector2(-16, 340));
    
    // Pouhon - long sweeping left-hander
    pts.push(new THREE.Vector2(-20, 318));
    pts.push(new THREE.Vector2(-28, 298));
    pts.push(new THREE.Vector2(-40, 282));
    pts.push(new THREE.Vector2(-55, 270));
    pts.push(new THREE.Vector2(-72, 262));
    pts.push(new THREE.Vector2(-90, 258));
    pts.push(new THREE.Vector2(-108, 257));
    pts.push(new THREE.Vector2(-125, 259));
    pts.push(new THREE.Vector2(-140, 264));
    
    // Campus complex - series of corners
    pts.push(new THREE.Vector2(-155, 272));
    pts.push(new THREE.Vector2(-168, 283));
    pts.push(new THREE.Vector2(-178, 297));
    pts.push(new THREE.Vector2(-184, 313));
    pts.push(new THREE.Vector2(-186, 330));
    
    // Paul Frère/Blanchimont approach
    pts.push(new THREE.Vector2(-185, 348));
    pts.push(new THREE.Vector2(-182, 366));
    pts.push(new THREE.Vector2(-177, 383));
    
    // Stavelot - left-right sequence
    pts.push(new THREE.Vector2(-168, 398));
    pts.push(new THREE.Vector2(-155, 410));
    pts.push(new THREE.Vector2(-140, 418));
    pts.push(new THREE.Vector2(-123, 422));
    pts.push(new THREE.Vector2(-108, 418));
    pts.push(new THREE.Vector2(-96, 408));
    
    // Blanchimont - fast left-hander
    pts.push(new THREE.Vector2(-88, 395));
    pts.push(new THREE.Vector2(-82, 378));
    pts.push(new THREE.Vector2(-80, 360));
    pts.push(new THREE.Vector2(-82, 342));
    pts.push(new THREE.Vector2(-88, 326));
    
    // Approach to Bus Stop chicane
    pts.push(new THREE.Vector2(-98, 312));
    pts.push(new THREE.Vector2(-110, 300));
    pts.push(new THREE.Vector2(-124, 291));
    
    // Bus Stop chicane - left-right chicane before start/finish
    pts.push(new THREE.Vector2(-140, 285));
    pts.push(new THREE.Vector2(-155, 283));
    pts.push(new THREE.Vector2(-168, 286));
    pts.push(new THREE.Vector2(-178, 293));
    pts.push(new THREE.Vector2(-184, 303));
    
    // Final corner and back to start/finish straight
    pts.push(new THREE.Vector2(-186, 315));
    pts.push(new THREE.Vector2(-185, 328));
    pts.push(new THREE.Vector2(-183, 340));
    
    return pts;
  },

  // ── buildScene() — all 3D environment elements for Spa ──────────
  //
  // Called by physics.js buildTrack() after the core asphalt / kerbs /
  // start-finish line are placed. Everything specific to THIS track
  // lives here: ground, barriers, grandstands, trees, etc.
  //
  // Parameters injected by the engine:
  // addObj(mesh) add a mesh to the scene (also registers it for
  //              clean removal when the track changes)
  // THREE        the THREE namespace
  // CENTRE       centreline point array (THREE.Vector2[])
  // N_PTS        number of centreline points
  // TW           track width constant
  // tangentAt(i) returns {tx,tz} unit tangent at centreline index i
  // scene        the THREE.Scene (use for ambient tweaks if needed)
  //
  buildScene({ addObj, THREE, CENTRE, N_PTS, TW, tangentAt }) {

    // ── GROUND ──────────────────────────────────────────────────────
    // Green grass ground representing the Ardennes forest setting
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 3000),
      new THREE.MeshLambertMaterial({ color: 0x3d6b3d })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    addObj(ground);

    // ── CONCRETE BARRIERS ───────────────────────────────────────────
    // Safety barriers on the outside of the track
    const BOFF = TW / 2 + TW * 1.2; // Barrier offset from track edge
    const BH = 1.2; // Barrier height
    const TR = 0.4; // Texture roughness
    const BF = 2.0; // Texture frequency
    
    const bv = [], bi = [], bu = [], bc = [];
    let bvi = 0;
    
    for (let i = 0; i < N_PTS; i++) {
      const i1 = (i + 1) % N_PTS;
      const c0 = CENTRE[i], c1 = CENTRE[i1];
      const t0 = tangentAt(i), t1 = tangentAt(i1);
      const nx0 = -t0.tz, nz0 = t0.tx;
      const nx1 = -t1.tz, nz1 = t1.tx;
      const sl2 = Math.sqrt((c1.x - c0.x) ** 2 + (c1.y - c0.y) ** 2);
      const ph0 = i * 0.6, ph1 = ph0 + sl2 * BF;
      
      for (let s = 0; s < 2; s++) {
        const c = s === 0 ? c0 : c1;
        const nx = s === 0 ? nx0 : nx1;
        const nz = s === 0 ? nz0 : nz1;
        const ph = s === 0 ? ph0 : ph1;
        const bump = Math.abs(Math.sin(ph * Math.PI)) * TR * 0.3;
        const bx = c.x + nx * BOFF;
        const bz = c.y + nz * BOFF;
        
        // Alternating grey tones for barrier panels
        const tr2 = Math.floor(ph / 1.2) % 2;
        const rc = tr2 === 0 ? [0.09, 0.09, 0.09] : [0.15, 0.13, 0.11];
        
        bv.push(bx, 0, bz);
        bu.push(s, 0);
        bc.push(...rc);
        
        bv.push(bx + nx * bump * 0.35, BH + bump, bz + nz * bump * 0.35);
        bu.push(s, 1);
        bc.push(...rc);
      }
      
      bi.push(bvi, bvi + 2, bvi + 1, bvi + 1, bvi + 2, bvi + 3);
      bvi += 4;
    }
    
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bv, 3));
    bg.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
    bg.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2));
    bg.setIndex(bi);
    bg.computeVertexNormals();
    
    const barrier = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    }));
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    addObj(barrier);

    // ── TREES ───────────────────────────────────────────────────────
    // Scattered trees around the circuit to represent Ardennes forest
    const treeGeom = new THREE.ConeGeometry(3, 12, 6);
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x2d5a2d });
    const trunkGeom = new THREE.CylinderGeometry(0.8, 1, 4);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3520 });
    
    // Place trees at various positions around the track
    const treePositions = [
      [-250, 200], [-280, 350], [-220, 500], [-50, 520], [100, 450],
      [120, 300], [150, 150], [80, 50], [-50, 80], [-180, 150],
      [-300, 300], [-250, 450], [50, 500], [100, 200], [-200, 100]
    ];
    
    treePositions.forEach(([x, z]) => {
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.set(x, 2, z);
      addObj(trunk);
      
      const tree = new THREE.Mesh(treeGeom, treeMat);
      tree.position.set(x, 8, z);
      addObj(tree);
    });

  },

});
```

