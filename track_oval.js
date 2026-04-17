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

  // ── barriers: true → the engine builds concrete wall barriers around
  // the outside of the track (handled in buildTrack() in physics.js)
  barriers: true,

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

});
