'use strict';

const S = { ss:5, sp:6, ch:5, cd:9,
  traction:5, brake:5, throttle:5,
  assist:'medium',
  tcOn:true,   // traction control on for medium
  absOn:true,  // ABS on for medium
  scOn:false,  // no stability control
  saOn:false,  // no steering assist
};
const optPanel = document.getElementById('opt-panel');
const hbBtn    = document.getElementById('btn-hb');

function wire(sid,lid,key){
  const sl=document.getElementById(sid), lb=document.getElementById(lid);
  sl.addEventListener('input',e=>{ e.stopPropagation(); S[key]=+sl.value; lb.textContent=sl.value; });
  sl.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
  sl.addEventListener('touchmove', e=>e.stopPropagation(),{passive:true});
  sl.addEventListener('touchend',  e=>e.stopPropagation(),{passive:true});
}
wire('sl-ss','lbl-ss','ss'); wire('sl-sp','lbl-sp','sp');
wire('sl-ch','lbl-ch','ch'); wire('sl-cd','lbl-cd','cd');
wire('sl-traction','lbl-traction','traction');
wire('sl-brake','lbl-brake','brake');
wire('sl-throttle','lbl-throttle','throttle');

// ── ASSIST SYSTEM ──
const ASSIST_CONFIGS = {
  easy: {
    tcOn:true, absOn:true, scOn:true, saOn:true,
    traction:8, brake:5, throttle:4,
    slidersEnabled: true,
    desc:'Traction control · ABS · Steering assist — sliders tune the level'
  },
  medium: {
    tcOn:true, absOn:true, scOn:false, saOn:false,
    traction:4, brake:5, throttle:6,
    slidersEnabled: true,
    desc:'TC + ABS, no steering assist — sliders control how strong each is'
  },
  hard: {
    tcOn:false, absOn:false, scOn:false, saOn:false,
    traction:5, brake:5, throttle:7,
    slidersEnabled: false,
    desc:'No assists — raw physics, sliders have no effect'
  },
};

function setSlider(id, lblId, key, val, enabled){
  const sl = document.getElementById(id);
  const lb = document.getElementById(lblId);
  if(!sl||!lb) return;
  sl.value = val;
  lb.textContent = val;
  S[key] = val;
  sl.disabled = !enabled;
  sl.style.opacity = enabled ? '1' : '0.35';
  sl.style.pointerEvents = enabled ? '' : 'none';
}

function applyAssist(level){
  S.assist = level;
  const cfg = ASSIST_CONFIGS[level];
  S.tcOn=cfg.tcOn; S.absOn=cfg.absOn; S.scOn=cfg.scOn; S.saOn=cfg.saOn;
  const en = cfg.slidersEnabled;
  setSlider('sl-traction', 'lbl-traction', 'traction', cfg.traction,  en);
  setSlider('sl-brake',    'lbl-brake',    'brake',     cfg.brake,     true); // brake always on
  setSlider('sl-throttle', 'lbl-throttle', 'throttle',  cfg.throttle,  true); // throttle always on
  document.getElementById('assist-desc').textContent = cfg.desc;
  document.querySelectorAll('.assist-btn').forEach(b=>{
    const active = b.dataset.level === level;
    b.style.borderColor = active ? '#30e060' : 'rgba(255,255,255,.2)';
    b.style.background  = active ? 'rgba(48,224,96,.18)' : 'rgba(255,255,255,.06)';
    b.style.color       = active ? '#30e060' : '#777';
  });
}
document.querySelectorAll('.assist-btn').forEach(b=>{
  b.addEventListener('click', ()=>applyAssist(b.dataset.level));
});
applyAssist('medium');

// ── PLAYER NAME ──────────────────────────────
let playerName = localStorage.getItem('sc3d_name') || 'PLAYER';
function refreshNameDisplay(){
  document.getElementById('pname-lbl').textContent = playerName;
}
refreshNameDisplay();

function closeName(){ document.getElementById('name-edit-popup').classList.remove('open'); }
function saveName(){
  const v=document.getElementById('name-input').value.trim().toUpperCase();
  if(v){ playerName=v; localStorage.setItem('sc3d_name',v); }
  refreshNameDisplay(); closeName();
  if(typeof updatePlayerPlate==='function') updatePlayerPlate();
}
// Popup stops all clicks from bubbling — keyboard taps won't close it
document.getElementById('name-edit-popup').addEventListener('click',e=>e.stopPropagation());
document.getElementById('name-edit-popup').addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});

// Prevent iOS zoom on input focus by temporarily boosting viewport scale
const _nameInput = document.getElementById('name-input');
_nameInput.addEventListener('focus', ()=>{
  document.querySelector('meta[name=viewport]').content =
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
});
_nameInput.addEventListener('blur', ()=>{
  // Restore and snap back
  document.querySelector('meta[name=viewport]').content =
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  window.scrollTo(0,0);
});

document.getElementById('btn-edit-name').addEventListener('click',e=>{
  e.stopPropagation();
  const popup=document.getElementById('name-edit-popup');
  document.getElementById('name-input').value=playerName;
  popup.classList.toggle('open');
  if(popup.classList.contains('open')) setTimeout(()=>document.getElementById('name-input').focus(),80);
});
document.getElementById('btn-save-name').addEventListener('click',e=>{ e.stopPropagation(); saveName(); });
document.getElementById('btn-close-name').addEventListener('click',e=>{ e.stopPropagation(); closeName(); });
document.getElementById('name-input').addEventListener('keydown',e=>{
  if(e.key==='Enter') saveName();
  if(e.key==='Escape') closeName();
});

// ── TRACK CARD PREVIEW (minimap-style bird's eye) ─────────────────
// track card + picker wired after CENTRE is built — see below


// ── Pause-time compensation — lap timer doesn't run while options panel is open ──
let _pauseOpenTime = 0;
function _openOptionsPanel(){
  optPanel.classList.add('open');
  _pauseOpenTime = performance.now();
}
function _closeOptionsPanel(){
  optPanel.classList.remove('open');
  // Shift lapT forward by however long we were paused so the timer doesn't count it
  if(_pauseOpenTime > 0 && car.lap > 0){
    const pausedSecs = (performance.now() - _pauseOpenTime) / 1000;
    car.lapT += pausedSecs;
  }
  _pauseOpenTime = 0;
  lastTime = performance.now();
}

document.getElementById('btn-options').addEventListener('click',()=>{
  if(custActive){
    const island = document.getElementById('tools-island');
    island.classList.toggle('open', !island.classList.contains('open'));
  } else {
    _openOptionsPanel();
  }
});
document.getElementById('btn-close-panel-top').addEventListener('click', _closeOptionsPanel);
// btn-back-start handled in ghost JS below

// ── THREE.JS SETUP ─────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ac0e8);
scene.fog = new THREE.Fog(0x7ac0e8, 200, 680);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 500);
const _isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
} catch(e) {
  const fallbackCanvas = document.createElement('canvas');
  fallbackCanvas.width = innerWidth;
  fallbackCanvas.height = innerHeight;
  fallbackCanvas.style.width = '100%';
  fallbackCanvas.style.height = '100%';
  renderer = {
    domElement: fallbackCanvas,
    shadowMap: { enabled: false },
    setSize(w, h) {
      fallbackCanvas.width = w;
      fallbackCanvas.height = h;
    },
    setPixelRatio() {},
    render() {}
  };
  const warn = document.createElement('div');
  warn.id = 'webgl-warning';
  warn.textContent = '3D preview needs WebGL. Track selection is still available.';
  warn.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:80;padding:8px 12px;border:1px solid rgba(240,192,64,.35);border-radius:10px;background:rgba(20,16,6,.82);color:#f0c040;font-family:Courier New,monospace;font-size:.62rem;letter-spacing:.08em;text-align:center;pointer-events:none;';
  document.body.appendChild(warn);
}
document.getElementById('rc').appendChild(renderer.domElement);
window.addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
const sun = new THREE.DirectionalLight(0xfffce0, 1.3);
sun.position.set(50, 90, 40); sun.castShadow = true; scene.add(sun);
scene.add(new THREE.AmbientLight(0x88b8d8, 0.7));

// ── TRACK ─────────────────────────────────────
// TW, TRACK_DEFS, CENTRE, N_PTS, catmullRom,
// buildCentreline, initTrack, tangentAt  →  tracks.js

checkpoint('initTrack');
initTrack('oval');

// Must be declared before buildTrack() which uses addTrackMesh()
let _trackMeshes = [];

function buildTrack(){
  function addTrackMesh(obj){ scene.add(obj); _trackMeshes.push(obj); return obj; }

  const cfg = TRACK_DEFS[currentTrack] || TRACK_DEFS.oval;

  // ── Apply track sky / fog ─────────────────────────────────────────
  // Track files may define:
  //   sky: 0xRRGGBB                   (scene background colour)
  //   fog: [0xRRGGBB, near, far]      (THREE.Fog params)
  //   fog: false                      (disable fog entirely)
  if(cfg.sky != null){
    scene.background = new THREE.Color(cfg.sky);
  }
  if(cfg.fog === false){
    scene.fog = null;
  } else if(Array.isArray(cfg.fog)){
    scene.fog = new THREE.Fog(cfg.fog[0], cfg.fog[1], cfg.fog[2]);
  }

  // ── ASPHALT SURFACE ───────────────────────────────────────────────
  const pos=[],uvs=[],idx=[];
  for(let i=0;i<N_PTS;i++){
    const c=CENTRE[i],t=tangentAt(i),nx=t.tz,nz=-t.tx,h=TW/2;
    pos.push(c.x-nx*h,0.01,c.y-nz*h, c.x+nx*h,0.01,c.y+nz*h);
    uvs.push(0,i/N_PTS,1,i/N_PTS);
  }
  for(let i=0;i<N_PTS;i++){
    const a=i*2,b=((i+1)%N_PTS)*2;
    idx.push(a,a+1,b+1,a,b+1,b);
  }
  const rg=new THREE.BufferGeometry();
  rg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  rg.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  rg.setIndex(idx); rg.computeVertexNormals();
  addTrackMesh(new THREE.Mesh(rg,new THREE.MeshLambertMaterial({color:0x2d2d2d,side:THREE.DoubleSide})));

  // ── CENTRE LINE ───────────────────────────────────────────────────
  const dm=new THREE.LineBasicMaterial({color:0xf0c040,transparent:true,opacity:0.5});
  for(let i=0;i<N_PTS;i++){
    if(i%4===0) continue;
    const a=CENTRE[i],b=CENTRE[(i+1)%N_PTS];
    addTrackMesh(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      [new THREE.Vector3(a.x,0.04,a.y),new THREE.Vector3(b.x,0.04,b.y)]),dm));
  }

  // ── KERBS (flat red/white stripes, original style) ────────────────
  const cp=[],cc=[],ci2=[];let vi=0;
  for(let i=0;i<N_PTS;i++){
    const c=CENTRE[i],cn=CENTRE[(i+1)%N_PTS],t=tangentAt(i),tn=tangentAt((i+1)%N_PTS);
    const nx=t.tz,nz=-t.tx,nnx=tn.tz,nnz=-tn.tx,h=TW/2,cw=0.7;
    const r=(i%2<1)?1:0.93,g=(i%2<1)?0.13:0.93,b=(i%2<1)?0.13:0.93;
    for(const side of[-1,1]){
      const ix0=c.x+side*nx*h,    iz0=c.y+side*nz*h;
      const ix1=cn.x+side*nnx*h,  iz1=cn.y+side*nnz*h;
      const ox0=c.x+side*nx*(h+cw),oz0=c.y+side*nz*(h+cw);
      const ox1=cn.x+side*nnx*(h+cw),oz1=cn.y+side*nnz*(h+cw);
      cp.push(ix0,0.02,iz0, ix1,0.02,iz1, ox0,0.02,oz0, ox1,0.02,oz1);
      for(let k=0;k<4;k++) cc.push(r,g,b);
      ci2.push(vi,vi+1,vi+2, vi+1,vi+3,vi+2); vi+=4;
    }
  }
  const cg=new THREE.BufferGeometry();
  cg.setAttribute('position',new THREE.Float32BufferAttribute(cp,3));
  cg.setAttribute('color',new THREE.Float32BufferAttribute(cc,3));
  cg.setIndex(ci2); cg.computeVertexNormals();
  addTrackMesh(new THREE.Mesh(cg,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide})));

  // ── START/FINISH LINE ─────────────────────────────────────────────
  const sf=CENTRE[0],st=tangentAt(0);
  const sfp=new THREE.Mesh(new THREE.PlaneGeometry(TW+1.4,1.2),new THREE.MeshLambertMaterial({color:0xffffff}));
  sfp.rotation.x=-Math.PI/2; sfp.rotation.z=Math.atan2(st.tx,st.tz);
  sfp.position.set(sf.x,0.03,sf.y); addTrackMesh(sfp);

  // ── TRACK SCENE (ground, barriers, decorations) ───────────────────
  // If the track file defines buildScene(), call it — it fully owns the
  // environment: ground colour, barriers, grandstands, trees, anything.
  // Context object passed in:
  //   addObj(mesh)  — adds a mesh to the scene and to the track-mesh list
  //                   so it gets removed cleanly on track switch
  //   THREE         — the THREE namespace
  //   CENTRE        — centreline point array (THREE.Vector2[])
  //   N_PTS         — centreline length
  //   TW            — track half-width constant
  //   tangentAt(i)  — returns {tx,tz} unit tangent at index i
  //   scene         — the THREE.Scene (for lights, fog tweaks, etc.)
  //
  // If no buildScene is defined the engine falls back to the original
  // default green ground + concrete barriers so any track file that
  // only sets  barriers: true/false  keeps working with no changes.
  if(typeof cfg.buildScene === 'function'){
    cfg.buildScene({ addObj: addTrackMesh, THREE, CENTRE, N_PTS, TW, tangentAt, scene });
  } else {
    // ── FALLBACK: default green ground ───────────────────────────
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshLambertMaterial({color:0x4a7a4a}));
    ground.rotation.x=-Math.PI/2; ground.position.y=-0.02; addTrackMesh(ground);
    // ── FALLBACK: default concrete barriers ──────────────────────
    if(cfg.barriers !== false){
      const BOFF=TW/2+TW, BH=1.1, TR=0.38, BF=1.9;
      const bv=[],bi=[],bu=[],bc=[];let bvi=0;
      for(let i=0;i<N_PTS;i++){
        const i1=(i+1)%N_PTS,c0=CENTRE[i],c1=CENTRE[i1];
        const t0=tangentAt(i),t1=tangentAt(i1);
        const nx0=-t0.tz,nz0=t0.tx,nx1=-t1.tz,nz1=t1.tx;
        const sl2=Math.sqrt((c1.x-c0.x)**2+(c1.y-c0.y)**2);
        const ph0=i*0.55,ph1=ph0+sl2*BF;
        for(let s=0;s<2;s++){
          const c=s===0?c0:c1,nx=s===0?nx0:nx1,nz=s===0?nz0:nz1,ph=s===0?ph0:ph1;
          const bump=Math.abs(Math.sin(ph*Math.PI))*TR*0.35;
          const bx=c.x+nx*BOFF,bz=c.y+nz*BOFF;
          const tr2=Math.floor(ph/1.0)%2,rc=tr2===0?[0.08,0.08,0.08]:[0.14,0.12,0.10];
          bv.push(bx,0,bz); bu.push(s,0); bc.push(...rc);
          bv.push(bx+nx*bump*0.4,BH+bump,bz+nz*bump*0.4); bu.push(s,1); bc.push(...rc);
        }
        bi.push(bvi,bvi+2,bvi+1, bvi+1,bvi+2,bvi+3); bvi+=4;
      }
      const bg2=new THREE.BufferGeometry();
      bg2.setAttribute('position',new THREE.Float32BufferAttribute(bv,3));
      bg2.setAttribute('color',new THREE.Float32BufferAttribute(bc,3));
      bg2.setAttribute('uv',new THREE.Float32BufferAttribute(bu,2));
      bg2.setIndex(bi); bg2.computeVertexNormals();
      const bm=new THREE.Mesh(bg2,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
      bm.castShadow=true; bm.receiveShadow=true; addTrackMesh(bm);
    }
  }
}
checkpoint('buildTrack');
buildTrack();

// ── TYRE MARKS (skid marks) ─────────────────────────────────────────
// Triangle strip approach — NO gaps ever possible.
// Each new step shares 2 vertices with the previous step.
// Two strips per side (left/right rear wheel), each is an independent strip.
// When sliding stops, the strip ends. Next slide starts a new strip.
// This is how Unity, Unreal, and every major racing game does it.

const MARK_STEP   = 0.18;   // add 2 verts every 0.18m traveled
const MARK_W      = 0.13;   // half-width of each tyre strip (total = 0.26m = tyre width)
const MARK_Y      = 0.015;
const STRIP_MAX   = 3000;   // max vertices per strip (left and right each)

// Two strips: index 0 = left wheel, index 1 = right wheel
const _strips = [
  { pos: new Float32Array(STRIP_MAX * 3), alpha: new Float32Array(STRIP_MAX), count: 0, active: false },
  { pos: new Float32Array(STRIP_MAX * 3), alpha: new Float32Array(STRIP_MAX), count: 0, active: false },
];

// Build TWO separate geometries + meshes, one per strip
const _mkMat = new THREE.RawShaderMaterial({
  vertexShader: `
    precision mediump float;
    attribute vec3 position;
    attribute float alpha;
    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;
    varying float vAlpha;
    void main(){
      vAlpha = alpha;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    precision mediump float;
    varying float vAlpha;
    void main(){
      gl_FragColor = vec4(0.04, 0.04, 0.04, vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const _mkMeshes = _strips.map(s => {
  const geo = new THREE.BufferGeometry();
  const posAttr   = new THREE.BufferAttribute(s.pos,   3); posAttr.setUsage(THREE.DynamicDrawUsage);
  const alphaAttr = new THREE.BufferAttribute(s.alpha, 1); alphaAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('alpha',    alphaAttr);
  // Pre-fill index buffer for triangle strip: (0,1,2),(1,2,3),(2,3,4)...
  // For N verts: N-2 triangles. Pre-allocate for STRIP_MAX verts.
  const idx = new Uint16Array((STRIP_MAX - 2) * 3);
  for(let i = 0; i < STRIP_MAX - 2; i++){
    idx[i*3]   = i;
    idx[i*3+1] = i+1;
    idx[i*3+2] = i+2;
  }
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.setDrawRange(0, 0);
  s.geo = geo; s.posAttr = posAttr; s.alphaAttr = alphaAttr;
  const mesh = new THREE.Mesh(geo, _mkMat);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
});

// Ring-buffer state per strip
let _mkDistAcc = 0;
let _mkPrevPx = null, _mkPrevPz = null;
let _mkPrevSliding = false;

function _addStripVerts(strip, wx, wz, rightX, rightZ, alpha){
  // Each step adds 2 verts: left-edge and right-edge of the strip at this point
  if(strip.count + 2 > STRIP_MAX) return; // full
  const i = strip.count;
  const b = i * 3;
  strip.pos[b]   = wx - rightX * MARK_W; strip.pos[b+1] = MARK_Y; strip.pos[b+2] = wz - rightZ * MARK_W;
  strip.pos[b+3] = wx + rightX * MARK_W; strip.pos[b+4] = MARK_Y; strip.pos[b+5] = wz + rightZ * MARK_W;
  strip.alpha[i]   = alpha;
  strip.alpha[i+1] = alpha;
  strip.count += 2;
  strip.posAttr.needsUpdate   = true;
  strip.alphaAttr.needsUpdate = true;
  // Index count = (verts - 2) * 3 for triangle strip
  strip.geo.setDrawRange(0, Math.max(0, (strip.count - 2) * 3));
}

function _endStrip(){
  // Cap ends by zeroing alpha on last 2 verts for clean termination
  for(const s of _strips){
    if(s.count >= 2 && s.active){
      s.alpha[s.count-1] = 0;
      s.alpha[s.count-2] = 0;
      s.alphaAttr.needsUpdate = true;
    }
    s.active = false;
  }
}

function _updateMarks(dt){
  const fadeRate = dt * 0.14;
  for(const s of _strips){
    if(s.count === 0) continue;
    for(let i = 0; i < s.count; i++){
      s.alpha[i] = Math.max(0, s.alpha[i] - fadeRate);
    }
    s.alphaAttr.needsUpdate = true;
    // Compact: drop fully-faded leading verts
    // (skip for perf — just let them fade to 0)
  }
}

function _clearMarks(){
  for(const s of _strips){
    s.pos.fill(0); s.alpha.fill(0);
    s.count = 0; s.active = false;
    s.posAttr.needsUpdate   = true;
    s.alphaAttr.needsUpdate = true;
    s.geo.setDrawRange(0, 0);
  }
  _mkDistAcc = 0; _mkPrevPx = null; _mkPrevPz = null;
  _mkPrevSliding = false;
}

function tickTyreMarks(dt){
  const realSlide = (car.slideFrac || 0) > 0.28 && Math.abs(car.speed) > 5;
  const hb  = hbOn;
  const dft = driftOn && Math.abs(car.vx) > 1.5 && Math.abs(car.speed) > 10;
  const active = realSlide || hb || dft;

  if(_mkPrevPx === null){ _mkPrevPx = car.px; _mkPrevPz = car.pz; }

  if(!active){
    if(_mkPrevSliding) _endStrip();
    _mkDistAcc = 0;
    _mkPrevPx  = car.px; _mkPrevPz = car.pz;
    _mkPrevSliding = false;
    return;
  }

  const ddx = car.px - _mkPrevPx;
  const ddz = car.pz - _mkPrevPz;
  const distThisFrame = Math.min(Math.sqrt(ddx*ddx + ddz*ddz), MARK_STEP * 10);
  _mkDistAcc += distThisFrame;

  // Travel direction for strip orientation
  const beta = Math.atan2(car.vx, Math.max(Math.abs(car.vz), 0.1)) * Math.sign(car.vz || 1);
  const th = car.heading + beta;
  const shC = Math.sin(car.heading), chC = Math.cos(car.heading);
  // Tyre lateral offset — along car body heading
  const rX = chC, rZ = -shC; // car right
  const fX = shC, fZ =  chC; // car forward
  // Travel-direction right (for strip width orientation)
  const shT = Math.sin(th), chT = Math.cos(th);
  const trX = chT, trZ = -shT;

  const alpha = (hb || dft) ? 0.92 : cl((car.slideFrac-0.28)/0.50, 0.35, 0.88);

  // Wheel centres (rear axle, ±1.0m, -1.3m in car space)
  const lwx = car.px - rX*1.0 - fX*1.3; // left wheel x
  const lwz = car.pz - rZ*1.0 - fZ*1.3;
  const rwx = car.px + rX*1.0 - fX*1.3; // right wheel x
  const rwz = car.pz + rZ*1.0 - fZ*1.3;

  const numSteps = Math.floor(_mkDistAcc / MARK_STEP);
  if(numSteps > 0 || !_mkPrevSliding){
    const steps = Math.max(numSteps, _mkPrevSliding ? 0 : 1);
    if(steps > 0 && distThisFrame > 0.001){
      const dx = ddx / Math.sqrt(ddx*ddx + ddz*ddz + 0.0001);
      const dz = ddz / Math.sqrt(ddx*ddx + ddz*ddz + 0.0001);
      for(let s = 0; s < steps; s++){
        const t = !_mkPrevSliding ? 0 : (steps - s) * MARK_STEP;
        const sx = car.px - dx * t, sz = car.pz - dz * t;
        const lx = sx - rX*1.0 - fX*1.3, lz = sz - rZ*1.0 - fZ*1.3;
        const rx = sx + rX*1.0 - fX*1.3, rz = sz + rZ*1.0 - fZ*1.3;
        _addStripVerts(_strips[0], lx, lz, trX, trZ, alpha);
        _addStripVerts(_strips[1], rx, rz, trX, trZ, alpha);
      }
    } else if(!_mkPrevSliding){
      _addStripVerts(_strips[0], lwx, lwz, trX, trZ, alpha);
      _addStripVerts(_strips[1], rwx, rwz, trX, trZ, alpha);
    }
    _strips[0].active = true; _strips[1].active = true;
    _mkDistAcc -= numSteps * MARK_STEP;
  }

  _mkPrevPx = car.px; _mkPrevPz = car.pz;
  _mkPrevSliding = true;
}

// ── CAR MESH ──────────────────────────────────
const carGroup=new THREE.Group();
const bodyMesh=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.58,3.8),new THREE.MeshLambertMaterial({color:0xe63946}));
bodyMesh.position.set(0,0.52,0); bodyMesh.castShadow=true; carGroup.add(bodyMesh);
const cabinMesh=new THREE.Mesh(new THREE.BoxGeometry(1.38,0.43,1.75),new THREE.MeshLambertMaterial({color:0xb02832}));
cabinMesh.position.set(0,0.98,-0.18); cabinMesh.castShadow=true; carGroup.add(cabinMesh);
const wsMesh=new THREE.Mesh(new THREE.BoxGeometry(1.28,0.34,0.05),new THREE.MeshLambertMaterial({color:0x7ad8f0,transparent:true,opacity:0.75}));
wsMesh.position.set(0,0.96,0.69); carGroup.add(wsMesh);
const wGeo=new THREE.CylinderGeometry(0.36,0.36,0.26,14),wMat=new THREE.MeshLambertMaterial({color:0x111111});
const rearWheels=[];
for(const [x,z] of[[-1,-1.3],[1,-1.3]]){
  const w=new THREE.Mesh(wGeo,wMat); w.rotation.z=Math.PI/2; w.position.set(x,0.36,z); w.castShadow=true; carGroup.add(w); rearWheels.push(w);
}
const frontPivots=[];
for(const [x,z] of[[-1,1.3],[1,1.3]]){
  const pivot=new THREE.Group(); pivot.position.set(x,0.36,z);
  const w=new THREE.Mesh(wGeo,wMat); w.rotation.z=Math.PI/2; w.castShadow=true; pivot.add(w);
  carGroup.add(pivot); frontPivots.push({pivot,wheel:w});
}
// Place car a few metres BEHIND the start line along the track tangent
const _sfTang = tangentAt(0);
const _sfBack = 8; // metres behind SF line
const START_X = CENTRE[0].x - _sfTang.tx * _sfBack;
const START_Z = CENTRE[0].y - _sfTang.tz * _sfBack;
const START_H = Math.atan2(_sfTang.tx, _sfTang.tz);
carGroup.position.set(START_X,0,START_Z); carGroup.rotation.y=START_H; scene.add(carGroup);

// ── Number plate on back of car ──
function makePlateTexture(text){
  const c=document.createElement('canvas'); c.width=128; c.height=48;
  const x=c.getContext('2d');
  x.fillStyle='#f5f0dc'; x.fillRect(0,0,128,48);
  x.strokeStyle='#222'; x.lineWidth=3; x.strokeRect(2,2,124,44);
  x.fillStyle='#111'; x.font='bold 28px monospace';
  x.textAlign='center'; x.textBaseline='middle';
  x.fillText(text.toUpperCase().slice(0,3),64,26);
  const t=new THREE.CanvasTexture(c); return t;
}
function makePlateMesh(text){
  const geo=new THREE.PlaneGeometry(0.7,0.26);
  const mat=new THREE.MeshLambertMaterial({map:makePlateTexture(text),transparent:false});
  const m=new THREE.Mesh(geo,mat);
  // bodyMesh local space: bodyMesh center is at carGroup y=0.52, z=0
  // plate world pos was y=0.44,z=-1.92 → local: y=0.44-0.52=-0.08, z=-1.92
  m.position.set(0,-0.13,-1.921); m.rotation.y=Math.PI; return m;
}
let playerPlateMesh = makePlateMesh(playerName);
bodyMesh.add(playerPlateMesh);

// ── BRAKE LIGHTS ──────────────────────────────────────────────────────
// Parented to bodyMesh — moves with suspension pitch/bounce exactly
// MeshStandardMaterial with emissive: self-illuminates like a real tail light lens
// bodyMesh local space: center y=0, z=0. Rear face = z=-1.9
// Plate is at y=-0.08 local → lights just above plate = y=+0.04
// Outer edges x=±0.72 (body half-width 0.9, inset slightly)

const _tlW = 0.24, _tlH = 0.10;

// Off state: dark red housing, no emission
const _tlMatOff = new THREE.MeshStandardMaterial({
  color: 0x3a0000,
  emissive: new THREE.Color(0x000000),
  emissiveIntensity: 0,
  roughness: 0.3,
  metalness: 0.1,
});
// On state: bright red, strong self-illumination
const _tlMatOn = new THREE.MeshStandardMaterial({
  color: 0xff0000,
  emissive: new THREE.Color(0xff0000),
  emissiveIntensity: 2.5,
  roughness: 0.2,
  metalness: 0.0,
});

// Housing box (cavity depth 0.04 recessed into rear face)
const _tlHousingGeo = new THREE.BoxGeometry(_tlW, _tlH, 0.04);
const _tlHousingMat = new THREE.MeshStandardMaterial({ color: 0x080000, roughness: 0.9 });

function _makeTailLight(xSide){
  // Dark recessed housing
  const housing = new THREE.Mesh(_tlHousingGeo, _tlHousingMat);
  housing.position.set(xSide * 0.72, 0.14, -1.88);
  bodyMesh.add(housing);

  // Lens face — sits flush on rear face, slightly proud of housing
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(_tlW, _tlH), _tlMatOff);
  lens.position.set(xSide * 0.72, 0.14, -1.901);
  lens.rotation.y = Math.PI;
  bodyMesh.add(lens);

  return lens;
}

const _tlLensL = _makeTailLight(-1);
const _tlLensR = _makeTailLight( 1);

// SpotLights aimed rearward — cone projects only behind/below, not onto car body
const _tlGlowL = new THREE.SpotLight(0xff1100, 0, 3.5, Math.PI * 0.18, 0.6, 1.5);
_tlGlowL.position.set(-0.72, 0.52+0.14, -1.95);
_tlGlowL.target.position.set(-0.72, 0.2, -5.0); // aim backward and slightly down
carGroup.add(_tlGlowL);
carGroup.add(_tlGlowL.target);

const _tlGlowR = new THREE.SpotLight(0xff1100, 0, 3.5, Math.PI * 0.18, 0.6, 1.5);
_tlGlowR.position.set( 0.72, 0.52+0.14, -1.95);
_tlGlowR.target.position.set( 0.72, 0.2, -5.0);
carGroup.add(_tlGlowR);
carGroup.add(_tlGlowR.target);

let _brakeLightSmooth = 0;

function updatePlayerPlate(){
  bodyMesh.remove(playerPlateMesh);
  playerPlateMesh = makePlateMesh(playerName);
  bodyMesh.add(playerPlateMesh);
}

// ── PHYSICS CONSTANTS ─────────────────────────
const GEAR_RATIOS=[0,3.65,2.25,1.58,1.18,0.90,0.72];
const FINAL_DRIVE=3.8,WHEEL_R=0.36,MASS=1200,GRAV=9.81,MU=1.05,WHEELBASE=3.8,IDLE_RPM=900,MAX_RPM=8000;
const cl=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const engTorque=rpm=>{ const n=rpm/7000; return 420*(1.3*n*Math.exp(1-n)); };

// _isMobile declared earlier near renderer

const car={
  px:START_X,pz:START_Z,heading:START_H,speed:0,av:0,rpm:2000,gear:1,steer:0,
  lap:0,lapT:0,best:Infinity,atSF:false,lapPenalty:0,
  offTrack:false,offTrackStart:0,showingPenalty:false,barrierHit:false,lastLapTime:0,barrierSide:-1,lapDirty:false,respawnIdx:0,
  sectors:[false,false,false],wrongWay:false,sfCrossedWrong:false,lapProgress:0,ciPrev:0,
  oversteer:false,understeer:false,spinning:false,
  _mWx:0,_mWz:0
};

const P={};let hbOn=false;
// GAP FIX 2: Tyre relaxation length — forces lag behind slip angle by ~0.08s.
// IRL: the tyre contact patch needs travel distance to build shear force.
// We model this as a first-order low-pass on FyF and FyR.
// Time constant τ ≈ 0.08s front (stiffer carcass), 0.12s rear (softer/larger).
let _FyF_filt = 0, _FyR_filt = 0;
const _tauF = 0.08, _tauR = 0.12;
function bindBtn(id,key){
  const el=document.getElementById(id);
  const on=e=>{e.preventDefault();P[key]=true;el.classList.add('pressed');};
  const off=e=>{e.preventDefault();P[key]=false;el.classList.remove('pressed');};
  el.addEventListener('touchstart',on,{passive:false});
  el.addEventListener('touchend',off,{passive:false});
  el.addEventListener('touchcancel',off,{passive:false});
  el.addEventListener('mousedown',on);
  el.addEventListener('mouseup',off);
  el.addEventListener('mouseleave',off);
}
bindBtn('btn-left','L'); bindBtn('btn-right','R'); bindBtn('btn-thr','T'); bindBtn('btn-brk','B');

function toggleHB(){
  hbOn=!hbOn;
  hbBtn.classList.toggle('on',hbOn);
  hbBtn.textContent=hbOn?'HB  ON':'HANDBRAKE';
}
hbBtn.addEventListener('touchstart',e=>{e.preventDefault();toggleHB();},{passive:false});
hbBtn.addEventListener('mousedown',()=>toggleHB());

// DRIFT — toggle on mobile (tap once=on, tap again=off), hold on desktop Shift
let driftOn = false;
const driftBtn = document.getElementById('btn-drift');
function setDrift(on){
  driftOn = on;
  driftBtn.classList.toggle('on', on);
  driftBtn.textContent = on ? 'DRIFT ON' : 'DRIFT';
}
driftBtn.addEventListener('touchstart',e=>{e.preventDefault();setDrift(!driftOn);},{passive:false});
driftBtn.addEventListener('mousedown', ()=>setDrift(!driftOn));

// Drift button only — no double-tap (too easy to accidentally trigger mid-corner)
let _lastTapTime = 0;

window.addEventListener('keydown',e=>{
  P[e.code]=true;
  if(e.code==='Space'){ e.preventDefault(); toggleHB(); }
  if(e.code==='ShiftLeft'||e.code==='ShiftRight'){ e.preventDefault(); setDrift(true); }
  if(e.code==='KeyR'){
    const btn=document.getElementById('respawn-btn');
    if(btn&&btn.classList.contains('active')) doRespawn();
  }
});
window.addEventListener('keyup',e=>{
  P[e.code]=false;
  if(e.code==='ShiftLeft'||e.code==='ShiftRight') setDrift(false);
});

// Cached neighbourhood search — O(window) not O(N) per frame.
// Falls back to full scan after respawn or large jumps.
let _closestCache = 0;
function closestTrackIdx(px,pz){
  const WIN = 12;
  let best=Infinity, bestI=_closestCache;
  for(let k=-WIN;k<=WIN;k++){
    const i=((_closestCache+k)+N_PTS*2)%N_PTS;
    const c=CENTRE[i],d=(c.x-px)**2+(c.y-pz)**2;
    if(d<best){best=d;bestI=i;}
  }
  if(best > 400){
    for(let i=0;i<N_PTS;i++){
      const c=CENTRE[i],d=(c.x-px)**2+(c.y-pz)**2;
      if(d<best){best=d;bestI=i;}
    }
  }
  _closestCache = bestI;
  return bestI;
}

// Pacejka — hoisted, not recreated per frame
// Front B=8.0 (stiffer — saturates at ~14° slip)
// Rear  B=5.5 (softer  — saturates at ~10° slip, reaches peak sooner under load)
const _pakC=1.4,_pakD=1.12,_pakE=-0.5;
// GAP FIX 3: Sub-linear load sensitivity — grip grows as Fz^0.82, not linearly.
// IRL: doubling load ~doubles grip, but not quite. This is the Pacejka "dFz" effect.
// Reference Fz is the static per-axle load (~0.50 * MASS * GRAV for front, 0.48 for rear).
const _FzRef = MASS*GRAV*0.5;
function _sublinFz(Fz){ return _FzRef * Math.pow(Fz / _FzRef, 0.82); }
function pakF(a,Fz){const Fze=_sublinFz(Fz);const x=8.0*a;return -Fze*_pakD*Math.sin(_pakC*Math.atan(x-_pakE*(x-Math.atan(x))));}
// Rear B=7.0 (was 5.5) — peaks at ~8° slip instead of ~10°. Easier to saturate.
// This means harder cornering naturally pushes rear past peak → rear steps out.
// The post-peak drop (×0.88) means once it goes, grip falls meaningfully.
function pakR(a,Fz){const Fze=_sublinFz(Fz);const x=7.0*a;return -Fze*_pakD*0.88*Math.sin(_pakC*Math.atan(x-_pakE*(x-Math.atan(x))));}
// Keep old pak alias used elsewhere (sounds etc)
const _pakB=8.0;
function pak(a,Fz){return pakF(a,Fz);}

// ─────────────────────────────────────────────────────────────────────────────
// PHYSICS — self-consistent force model. Every phenomenon (oversteer, understeer,
// drift, snap, inertia push) emerges from:
//   1. Weight transfer  → FzF / FzR
//   2. Pacejka curves   → FyF / FyR  (lateral forces)
//   3. Traction circle  → limits simultaneous Fx + Fy
//   4. Mz = FyF*a - FyR*b  → yaw torque → car rotates
//   5. vx/vz integration → body slip angle builds → more alpha → past Pacejka peak
//
// NO manual car.av += impulse hacks. NO fake latDrag fighting Pacejka.
// If something doesn't happen naturally → fix the INPUTS (FzR, Iz, MU), not the output.
// ─────────────────────────────────────────────────────────────────────────────

let lastTime=null;
function physics(dt){
  const thr = (P.T||P.KeyW||P.ArrowUp)   ? 1 : 0;
  const brk = (P.B||P.KeyS||P.ArrowDown) ? 1 : 0;
  const si  = ((P.L||P.KeyA||P.ArrowLeft)?1:0) - ((P.R||P.KeyD||P.ArrowRight)?1:0);

  if(car.vx!==car.vx) car.vx=0; // NaN guard
  if(car.vz!==car.vz) car.vz=0;

  const Fn  = MASS*GRAV;
  const gr  = GEAR_RATIOS[car.gear]*FINAL_DRIVE;
  const spd = Math.sqrt(car.vx*car.vx + car.vz*car.vz);

  // ── Steering ──────────────────────────────────────────────────────
  const sens = S.ss/10;
  const maxSteer = cl(0.52*sens - spd*0.004*sens, 0.06, 0.52*sens);

  // Self-aligning torque — front tyres resist being turned when loaded
  const vFL0 = car.vx + car.av*(WHEELBASE*0.52);
  const frontSlipRad = Math.abs(Math.atan2(vFL0, Math.max(Math.abs(car.vz),1.5)) - car.steer);
  const alignStr = S.saOn ? 0.04 : 0.22;
  const selfAlign = -Math.sign(car.steer) * frontSlipRad * alignStr * cl(spd/15,0,1);

  // Understeer: throttle loads rear → less front load → front saturates
  const frontLoadFactor = cl(1.0 - thr*0.18 - spd*0.004, 0.4, 1.0);
  const effectiveMaxSteer = maxSteer * frontLoadFactor;

  // Steering rate slows down proportional to lateral G — fast on straights,
  // deliberate in corners. Prevents the twitchy over-correction feel at high speed.
  // At 0 lateral G: full S.sp rate. At high cornering G: rate drops to ~55% of S.sp.
  const latG = Math.abs(car.av * car.vz) / GRAV; // lateral acceleration in G
  const steerRateMul = cl(1.0 - latG * 0.28, 0.55, 1.0);
  const effectiveSteerRate = S.sp * steerRateMul;

  const steerTarget = si * effectiveMaxSteer + selfAlign;
  car.steer += (steerTarget - car.steer) * (1 - Math.exp(-dt * effectiveSteerRate));
  car.steer  = cl(car.steer, -maxSteer, maxSteer);

  // SA assist counters oversteer yaw
  if(S.saOn && Math.abs(car.av) > 0.25){
    car.steer -= car.av * 0.15 * dt;
    car.steer  = cl(car.steer, -maxSteer, maxSteer);
  }

  // Front saturation — when front slip > peak, extra lock does nothing
  const frontSaturation = cl((frontSlipRad - 0.22) / 0.25, 0.0, 1.0);

  // ── Slip angles ────────────────────────────────────────────────────
  // IRL slip angle: angle between wheel heading and wheel velocity vector.
  // Use total speed magnitude as denominator for vLon — this prevents
  // artificially large alpha when the car is sliding sideways (vx >> vz).
  // Using only vz as denominator was causing alpha to be wildly overestimated
  // during slides, which then fed back into huge Pacejka forces and oscillation.
  const vFL = car.vx + car.av*(WHEELBASE*0.52);
  const vRL = car.vx - car.av*(WHEELBASE*0.48);
  // CRITICAL: use total speed as denominator, not just vz.
  // When car slides sideways, vz drops but vx grows. Using only vz massively
  // underestimates slip angle during a drift → rear never stays past Pacejka peak
  // → slide dies instantly instead of being a sustained drift you must catch.
  const vLon = Math.max(spd, 1.5);

  const alphaF = Math.atan2(vFL, vLon) - car.steer;
  let   alphaR = Math.atan2(vRL, vLon);

  // ── Handbrake ─────────────────────────────────────────────────────
  // rearGripMul ramps 1→0 over ~0.10s on press, 0→1 over ~0.12s on release.
  // This lets FyR fall gradually → Mz imbalance builds → av grows organically.
  // No impulse kick needed. Works correctly at all speeds.
  const hb = hbOn;
  if(!car._hbGrip) car._hbGrip = 1.0;
  car._hbGrip = hb
    ? Math.max(0.0, car._hbGrip - dt / 0.10)   // press: 0→full lock in 0.10s
    : Math.min(1.0, car._hbGrip + dt / 0.12);   // release: grip returns in 0.12s
  let rearGripMul = car._hbGrip;

  if(hb){
    const driftAngle = Math.min(Math.abs(car.vx) / Math.max(Math.abs(car.vz), 1.0), 1.5);
    const scrub = (Fn * MU * 0.45 / MASS) * dt * (1.0 + driftAngle * 1.2);
    car.vz = Math.sign(car.vz) * Math.max(0, Math.abs(car.vz) - scrub);
  }

  // ── DRIFT MODE (arcade — NFS/Forza Horizon style) ─────────────────
  // Core idea from FH5/NFS: the car has a TARGET lateral velocity based on
  // steer + throttle. vx is pushed toward that target each frame.
  // Throttle widens the angle, counter-steer closes it.
  // This gives the "locked into drift" feel — you can hold it as long as
  // you keep throttle on and steer into it.
  const dft = driftOn;
  if(dft){
    // On mobile: lock forward speed at entry speed so player only needs to steer.
    // Throttle input instead boosts drift angle width (more angle = more fun).
    // On desktop: normal throttle behaviour — player manages speed manually.
    if(_isMobile){
      if(!car._dftLockedVz) car._dftLockedVz = Math.abs(car.vz); // capture on entry
      // Hold locked speed with gentle natural decay (feels like coasting, not brick wall)
      const lockedVz = car._dftLockedVz;
      car.vz = Math.sign(car.vz) * (lockedVz * (1 - dt * 0.015)); // ~1.5% decay/s
      car._dftLockedVz = Math.abs(car.vz); // update so decay is continuous
      // Brake trims speed gently — 0.6/s decay feels like slowing down, not a wall
      if(brk > 0.1) car._dftLockedVz *= (1 - dt * 0.6);
    } else {
      car._dftLockedVz = 0;
    }

    const spdFac = cl(spd / 30, 0, 1);
    // Mobile: throttle adds to drift angle (not speed), so boost it more
    const thrBoost = _isMobile ? (1.0 + thr * 2.0) : (1.0 + thr * 1.2);
    // Wider comfortable angle on mobile — more satisfying, easier to feel
    const maxVx = Math.abs(car.vz) * (_isMobile ? 0.55 : 0.42);

    let targetVx;
    if(_isMobile){
      if(si !== 0){
        // Button pressed: ease toward full angle on that side
        // Slower convergence (1.4 vs 2.5) so taps feel like trim adjustments, not snaps
        const steerSign = -Math.sign(si);
        targetVx = cl(steerSign * spdFac * 4.5 * thrBoost, -maxVx, maxVx);
        car.vx += (targetVx - car.vx) * (1 - Math.exp(-dt * 1.4));
      } else {
        // No button: HOLD current angle — don't collapse back to center
        // Slow natural decay so long drifts gradually tighten, feels alive
        car.vx *= (1 - dt * 0.8);
      }
      // Auto-countersteer: if angle overshoots (near spin), gently push back
      // Player doesn't need to manually tap the other direction — game catches it
      if(Math.abs(car.vx) > maxVx * 0.82){
        const overshot = car.vx - Math.sign(car.vx) * maxVx * 0.82;
        car.vx -= overshot * (1 - Math.exp(-dt * 3.5));
      }
    } else {
      // Desktop: original behaviour
      const steerSign = -Math.sign(car.steer || si || 0);
      targetVx = cl(steerSign * spdFac * 4.5 * thrBoost, -maxVx, maxVx);
      car.vx += (targetVx - car.vx) * (1 - Math.exp(-dt * 2.5));
    }

    const maxAv = 1.2;
    car.av = cl(car.av, -maxAv, maxAv);

    rearGripMul = Math.min(rearGripMul, 0.08);

    if(!_isMobile){
      const dftAngle = Math.min(Math.abs(car.vx) / Math.max(Math.abs(car.vz), 1.0), 1.5);
      car.vz = Math.sign(car.vz) * Math.max(0, Math.abs(car.vz) - dftAngle * Math.abs(car.vz) * 0.05 * dt);
    }

    // ── DRIFT EXIT — NFS / Burnout / Ridge Racer style ─────────────────
    // Three exit conditions, in priority order:
    //
    // 1. COUNTER-STEER (NFS primary exit — EA handling blog):
    //    Drift is INTENTIONAL when si opposes vx (you steer into the slide).
    //    It ends when si MATCHES vx sign (you steer away = counter = "I want grip").
    //    Sign convention: si=1→LEFT, vx<0→sliding left, steerSign=-Math.sign(si).
    //    So drifting left: vx<0, steerSign=-1. Counter = press RIGHT = si=-1.
    //    Math.sign(si)=-1 === Math.sign(steerSign)=-1. Use steerSign not vx for
    //    detection — vx is being mutated by target tracking so it's unreliable.
    //    Hold 0.3s so brief direction taps mid-corner don't accidentally exit.
    //
    // 2. NO-STEER TIMER (fallback):
    //    No input at all for 1.5s mobile / 0.5s desktop → exit.
    //    Catches "forgot to tap again" and straight-line drift creep.
    //
    // 3. LOW SPEED (Burnout / Ridge Racer):
    //    Below 20 km/h a drift can't sustain physically. 0.3s buffer.

    if(!car._dftGripTimer)    car._dftGripTimer    = 0;
    if(!car._dftCounterTimer) car._dftCounterTimer = 0;
    if(!car._dftSlowTimer)    car._dftSlowTimer    = 0;

    // Current intended drift direction from steer input: -Math.sign(si)
    // This is the direction vx is being PUSHED toward — it's the "drift side".
    // Counter-steer = si flips so intended dir opposes current drift dir.
    // We track _dftDir at entry (or when si is held) to compare against.
    if(!car._dftDir) car._dftDir = 0;
    if(si !== 0){
      const intendedDir = -Math.sign(si); // what side vx is being pushed toward
      if(car._dftDir === 0) car._dftDir = intendedDir; // latch on first input
      // Counter-steer: player's intended direction flipped vs entry direction
      const isCountering = (intendedDir !== 0) && (intendedDir !== car._dftDir);
      if(isCountering){
        car._dftCounterTimer += dt;
        if(car._dftCounterTimer >= 0.3 && driftOn) setDrift(false);
      } else {
        car._dftCounterTimer = 0;
        car._dftDir = intendedDir; // update dir if they swung it back
      }
      car._dftGripTimer = 0; // steer is active, reset no-steer timer
    } else {
      car._dftCounterTimer = 0;
      car._dftGripTimer += dt;
      const cancelDelay = _isMobile ? 1.5 : 0.5;
      if(car._dftGripTimer >= cancelDelay && driftOn) setDrift(false);
    }

    // Low speed
    if(spd * 3.6 < 20){
      car._dftSlowTimer += dt;
      if(car._dftSlowTimer >= 0.3 && driftOn) setDrift(false);
    } else {
      car._dftSlowTimer = 0;
    }

  } else {
    car._dftLockedVz = 0;
    car._dftGripTimer = 0;
    car._dftCounterTimer = 0;
    car._dftSlowTimer = 0;
    car._dftDir = 0;
  }

  // ── Weight transfer ────────────────────────────────────────────────
  // Longitudinal: braking loads front / unloads rear. Throttle loads rear.
  // When HB is on: rear wheels are locked — drive torque can't reach them,
  // so throttle must NOT load the rear axle. Use thr=0 for dFz_long during HB.
  const h_L   = 0.18;  // reduced 0.22→0.18: less aggressive pitch under brake/throttle
  const thrForWT = (hb && !dft) ? 0 : (dft && _isMobile) ? 0 : thr;
  const a_long = (thrForWT - brk * 0.85) * 0.42 * GRAV;
  const dFz_long = MASS * a_long * h_L;

  // Lateral steady-state: cornering G unloads rear
  // Reduced multiplier 0.55→0.38 — less passive rear unloading so car doesn't
  // spontaneously oversteer just from sustained high-speed cornering
  const latAcc   = Math.abs(car.av * car.vz);
  const h_tw_R   = 0.55 / 1.52;
  const h_tw_F   = 0.55 / 1.60;
  const latGripLossR = MASS * latAcc * h_tw_R * 0.38;
  const latGripLossF = MASS * latAcc * h_tw_F * 0.22;

  // Transient steer-rate weight transfer: fast direction changes create a brief
  // lateral inertia pulse that UNLOADS the rear before the steady-state settles.
  // IRL: sprung mass has roll inertia — quick steer reversal leaves the body "behind",
  // momentarily unloading the rear contact patches.
  // steerRate = how fast the wheel is moving (rad/s). At 0.3 rad steer in 0.15s = 2 rad/s.
  // This adds a transient FzR drop proportional to |d(steer)/dt| × speed.
  if(!car._prevSteer) car._prevSteer = car.steer;
  const steerRate = (car.steer - car._prevSteer) / Math.max(dt, 0.001);
  car._prevSteer = car.steer;
  // Transient steer-rate weight transfer — reduced 0.022→0.012 and gated above 60km/h
  // so gear-shift steering inputs don't snap the rear at low speed
  const steerRateGate = cl((spd - 16) / 20, 0, 1); // zero below 60km/h, full above ~130km/h
  const transientFzRDrop = Math.abs(steerRate) * spd * MASS * 0.012 * steerRateGate;

  // Aerodynamic downforce: at high speed, aero presses car into ground → more grip.
  // Increased aero coefficient 0.42→0.52 so the car is more planted at 250+ km/h.
  // IRL: aero grip grows with v² so high-speed stability is a natural consequence.
  const aeroDownforce = 0.52 * car.vz * Math.abs(car.vz); // N, grows with v²
  // FzR floor raised 0.06→0.10: prevents rear going nearly weightless under combined load.
  const FzF = cl(Fn*0.52 - dFz_long - latGripLossF + aeroDownforce*0.40, Fn*0.12, Fn*0.95);
  const FzR = cl(Fn*0.48 + dFz_long - latGripLossR - transientFzRDrop + aeroDownforce*0.60, Fn*0.10, Fn*0.95);

  // ── Brake-induced rear lockup ─────────────────────────────────────
  let brakeLock = 0;
  if(!hb && brk && Math.abs(car.vz)>6){
    const absLimit = S.absOn ? cl(0.35-(S.traction-1)*0.025, 0.08, 0.35) : 0.82;
    brakeLock = cl((Math.abs(car.vz)-6)/20, 0, absLimit);
    alphaR = alphaR*(1-brakeLock) + Math.atan2(vRL,0.01)*brakeLock;
    rearGripMul = Math.max(rearGripMul - brakeLock*0.6, 0.1);
  }
  car.brakeLock = brakeLock;
  car.brkInput  = brk;

  // ── Tyre forces ────────────────────────────────────────────────────
  const tyreSpeedFade = cl((spd - 0.8) / 1.8, 0.0, 1.0);

  // Front lateral force — Pacejka, reduced when saturated (understeer)
  const FyF_raw = pakF(alphaF, FzF) * tyreSpeedFade * (1.0 - frontSaturation*0.55);

  // Rear lateral force — Pacejka with traction circle
  // IRL: combined slip — throttle uses friction budget longitudinally → less lateral available
  // thrFrac 0.92→1.0: full throttle in a corner fully exhausts the rear friction circle
  // when TC is off. On MEDIUM (TC on), tcCut below limits this — you feel it building
  // but TC catches it. On HARD (TC off) it steps out if you're not careful.
  // thrFrac: drift mode bypasses TC and boosts rear spin — throttle always steps out rear
  const thrFrac = (S.tcOn && !dft) ? 0 : thr * cl(spd/12, 0, 1) * (dft ? 1.4 : 1.0);
  const combinedMul = Math.sqrt(Math.max(0, 1 - thrFrac*thrFrac));

  // GAP FIX 1: Brake → lateral combined slip (Fx²+Fy²≤μFz²).
  // When braking hard, longitudinal force consumes friction budget → less lateral grip.
  // Front bias: front brakes harder (70% weight) so front loses more longitudinal, but
  // REAR is the critical one — rear losing lateral grip creates the Mz imbalance → oversteer.
  // Raised rear fraction from 0.40→0.72 so hard braking meaningfully unloads rear lateral.
  // This is the physically correct path for trail braking rotation — via Mz, not a direct av impulse.
  const brkForce   = brk * Fn * MU;
  const muBudget   = (FzF + FzR) * MU;
  const brkFracRaw = cl(brkForce / (muBudget + 1), 0, 1);
  const absRelax   = S.absOn ? 0.58 : 1.0;
  const brkFrac    = brkFracRaw * absRelax;
  const brkMulF    = Math.sqrt(Math.max(0, 1 - (brkFrac*0.55)*(brkFrac*0.55)));
  // Rear gets more combined-slip penalty than front — this is the trail-braking
  // oversteer mechanism. Reduced from 0.82→0.70 so the rear doesn't snap to
  // 100% slide in a single frame — instead rotation builds over ~0.2-0.3s.
  const brkMulR    = Math.sqrt(Math.max(0, 1 - (brkFrac*0.70)*(brkFrac*0.70)));

  const FyF_instant = FyF_raw * brkMulF;
  const FyR_pacejka = pakR(alphaR, FzR) * tyreSpeedFade * rearGripMul * combinedMul * brkMulR;
  // HB kinetic friction: opposes lateral velocity to prevent infinite spin.
  // Reduced 0.85→0.35 and excluded from Mz — if included in Mz it cancels FyF
  // and kills the yaw torque that builds the drift angle. It acts as lateral
  // damping on vx only, not as a yaw moment.
  const hbLatFrac = spd > 0.5 ? cl(car.vx / spd, -1, 1) : 0;
  const FyR_kinetic = hb ? -hbLatFrac * FzR * MU * 0.35 * tyreSpeedFade : 0;
  const FyR_instant = FyR_pacejka + FyR_kinetic;

  const FyF = FyF_instant;
  // For Mz: use only Pacejka rear — kinetic friction acts at contact patch centre,
  // not at the rear axle moment arm, so it doesn't contribute to yaw torque.
  const FyR = FyR_instant;
  const FyR_forMz = FyR_pacejka; // exclude kinetic from yaw moment

  // ── Slide state ────────────────────────────────────────────────────
  // Body sideslip β = angle between car heading and actual travel direction
  // IRL: β=0 on straight, β grows when sliding, β=90° = fully sideways
  // Use vx BEFORE this frame's integration — most accurate measure of current slip
  // slideFrac: hybrid of two signals — max wins
  // 1. alphaR saturation: rear past Pacejka peak (fires on HB/brakelock)
  // 2. Absolute lateral velocity: |vx| > ~1.5 m/s = starting to slide, 5 m/s = full slide
  //    This is speed-independent — 5m/s sideways is always a slide regardless of forward speed.
  //    This fires during power oversteer and any condition where vx genuinely grows.
  const rearPeakAlpha = 1.0 / 7.0;
  const rearSatRatio  = Math.abs(hb ? Math.PI/2 : alphaR) / rearPeakAlpha;
  const sf_alphaR = cl((rearSatRatio - 1.0) / 1.5, 0, 1);
  const sf_vx     = cl((Math.abs(car.vx) - 0.8) / 3.5, 0, 1);
  const sf_av     = cl((Math.abs(car.av) - 0.5) / 1.5, 0, 1);
  const sf_brk    = cl((brakeLock - 0.10) / 0.50, 0, 1);
  const sfRaw = Math.max(sf_alphaR, sf_vx, sf_av * 0.6, sf_brk * 0.8);
  // Asymmetric filter: rises instantly (feel the slide start), decays slowly (no rapid flicker).
  // Without this, brkMulR oscillation causes SLIDING/RECOVERED pairs every frame.
  if(!car._sfSmooth) car._sfSmooth = 0;
  car._sfSmooth = sfRaw > car._sfSmooth
    ? sfRaw                                          // rise: immediate
    : car._sfSmooth - Math.min(car._sfSmooth - sfRaw, 1.8 * dt); // decay: ~0.55s to zero
  const slideFrac = car._sfSmooth;
  car.sliding  = slideFrac > 0.08 && spd > 5;
  car.slideFrac = slideFrac;

  // Shared input flags used in both longitudinal and move sections
  const steerActive = Math.abs(car.steer) > 0.04;

  // ── Longitudinal force ─────────────────────────────────────────────
  let Flon = 0;
  if(!hb){
    // Traction circle: rear lateral force usage limits available drive force
    const muEff = MU * (0.75 + (S.traction-1)*0.028);
    const rearLatUsage = cl(Math.abs(FyR) / (FzR*muEff + 1), 0, 1);
    const tractionMul  = Math.sqrt(Math.max(0, 1 - rearLatUsage*rearLatUsage));

    const thrRate   = 0.72 + (S.throttle-1)*0.07;
    let Fdrive = (engTorque(car.rpm)*gr/WHEEL_R) * thr * tractionMul * thrRate;
    if(S.tcOn && thr>0){
      const tcCut = cl(1.0 - rearLatUsage*(0.9+(S.traction-1)*0.12), 0.12, 1.0);
      Fdrive *= tcCut;
    }

    car._prevThr = thr;

    // During drift: reduce brake force significantly so accidental brake tap
    // doesn't instantly kill the drift. Player has to really commit to brake.
    const brkMulDrift = dft ? 0.35 : 1.0;
    const Fbrk = brk * Fn * MU * (0.55+(S.brake-1)*0.07) * brkMulDrift;
    const drag  = 0.5*1.2*0.30*2.2*car.vz*Math.abs(car.vz);
    const roll  = 0.013*Fn*Math.sign(car.vz);
    // Engine braking: on lift-off, drivetrain resistance slows the car.
    // IRL: engine compression + friction through gearbox. Scales with gear ratio.
    // ~15% of max engine torque at idle, through the drivetrain.
    const engBrake = (!thr && !brk && car.vz > 2)
      ? Math.min(engTorque(Math.max(car.rpm, IDLE_RPM)) * gr / WHEEL_R * 0.12, 1800)
      : 0;

    // Trail braking oversteer emerges naturally from the physics:
    // brake → combined slip FyR reduction (gap fix 1) → FyF > FyR → Mz rotates car.
    // No direct av impulse needed — that caused instant oscillating spikes in the log.

    if(Math.abs(car.vz)<0.5 && brk>0.1 && !thr){
      Flon = -brk*Fn*MU*0.55 - drag - roll; car.reversing=true;
    } else if(car.vz < -0.15){
      const revBrake = thr>0.05 ? thr*Fn*MU*(0.55+(S.brake-1)*0.07) : 0;
      Flon = -brk*Fn*MU*0.55 + revBrake - drag - roll; car.reversing=true;
    } else {
      Flon = Fdrive - Math.sign(car.vz)*Fbrk - engBrake - drag - roll; car.reversing=false;
    }

    // Speed bleed from sliding: lateral kinetic friction steals from forward speed
    // IRL: a tyre sliding sideways generates heat & drag proportional to lateral velocity
    if(slideFrac > 0.05 && Math.abs(car.vz) > 3)
      car.vz -= Math.sign(car.vz) * slideFrac * Math.abs(car.vx) * 0.55 * dt;

  } else {
    Flon = -0.5*1.2*0.30*2.2*car.vz*Math.abs(car.vz);
  }

  // ── State flags ────────────────────────────────────────────────────
  // Hysteresis: once a flag goes true it stays true for at least N seconds.
  // Without this, flags oscillate every frame (on/off/on in the same 0.1s window).
  if(!car._overTimer)  car._overTimer  = 0;
  if(!car._underTimer) car._underTimer = 0;
  if(!car._spinTimer)  car._spinTimer  = 0;

  // Oversteer: rear sliding wide — lowered thresholds so trail-braking oversteer
  // and early throttle oversteer are caught, not just handbrake spins.
  // slideFrac>0.22, av>0.20, vx>0.8 fires on genuine rear step-out mid-corner.
  const overRaw  = slideFrac > 0.25 && Math.abs(car.av) > 0.25 && Math.abs(car.vx) > 2.0 && spd > 10;
  const spinRaw  = Math.abs(car.av) > 2.5 && Math.abs(car.vx) > 2.0 && spd > 3;

  if(overRaw)  car._overTimer  = 0.25; else car._overTimer  = Math.max(0, car._overTimer  - dt);
  if(spinRaw)  car._spinTimer  = 0.25; else car._spinTimer  = Math.max(0, car._spinTimer  - dt);

  const absAF = Math.abs(alphaF), absAR = Math.abs(alphaR);
  car.oversteer = car._overTimer > 0;

  // Understeer: front slip past Pacejka peak — needs hold timer because self-aligning
  // torque corrects alphaF within 1-2 frames, so the flag flickers on/off invisibly.
  // _underTimer gives it a 0.20s minimum window so the logger can actually catch it.
  const underRaw = absAF > 0.13 && spd > 4 && !car.oversteer;
  if(underRaw) car._underTimer = 0.20; else car._underTimer = Math.max(0, car._underTimer - dt);
  car.understeer = car._underTimer > 0;

  car.spinning   = car._spinTimer > 0;
  car.alphaF = alphaF; car.alphaR = alphaR;

  // ── Integrate velocities ───────────────────────────────────────────
  car.vz += (Flon/MASS)*dt;

  // During drift mode vx is driven by target tracking above — skip force integration.
  // Normal mode: FyF+FyR drives vx naturally.
  if(!dft){
    car.vx += ((FyF + FyR) / MASS) * dt;
    if(car._dftWasOn && Math.abs(car.vx) > 2.0){
      car.vx *= (1 - dt * 6.0);
    }
  }
  car._dftWasOn = dft;

  const speedGate = cl(1.0 - spd/20.0, 0.0, 1.0);
  const scrubDrag = S.scOn ? 5.0
    : hb    ? 0.02
    : dft   ? 0.0    // drift: target tracking handles vx, no drag fighting it
    : 0.4 * speedGate;
  car.vx -= car.vx * scrubDrag * dt;

  if(spd < 0.25){ car.vx=0; car.av=0; }
  if(!thr&&!brk&&!hb&&Math.abs(car.vz)<0.4) car.vz*=0.75;
  car.vz = cl(car.vz, -10, 88);

  // ── Yaw ────────────────────────────────────────────────────────────
  // Iz = 1600 kg·m² — lower than textbook (2000-4000) for game feel.
  // Physics: lower Iz = car rotates more readily into/out of slides.
  // This makes fast L-R-L inputs produce a visible heading snap (the "shift" feel).
  // Research docs: lower Iz = more nimble/twitchy, which is what we want here.
  const Iz = 1600.0;
  const Mz = (FyF*WHEELBASE*0.52 - FyR_forMz*WHEELBASE*0.48) * tyreSpeedFade;
  car.av += (Mz/Iz)*dt;

  // Yaw damping: drops when sliding so rotation persists (you must catch it).
  // SC: extra damping to kill spin fast.
  const scBonus   = S.scOn ? (car.spinning ? 3.5 : 1.5) : 0.0;
  const baseYDamp = S.scOn ? 0.28
    : hb    ? 0.008
    : dft   ? 0.06   // drift: moderate damping keeps rotation stable without killing the angle
    : cl(0.18 - slideFrac*0.16, 0.02, 0.18);
  car.av -= car.av*(baseYDamp + scBonus)*dt;
  car.heading += car.av*dt;

  // ── RPM / gear ─────────────────────────────────────────────────────
  if(!hb){
    const _prevGear=car.gear;
    if(!car._shiftCooldown) car._shiftCooldown=0;
    car._shiftCooldown=Math.max(0,(car._shiftCooldown||0)-dt);
    const _canShift=car._shiftCooldown<=0;
    if(_canShift&&car.rpm>7400&&car.gear<6){ car.gear++; car._shiftCooldown=0.55; }
    if(_canShift&&car.rpm<1500&&car.gear>1){ car.gear--; car._shiftCooldown=0.40; }
    car.gearJustShifted = car.gear!==_prevGear ? (car.gear>_prevGear?'up':'down') : null;
    const targetRPM = Math.abs(car.vz/WHEEL_R)*gr*(30/Math.PI);
    const blend = thr>0.05||brk>0.05?0.14:0.07;
    car.rpm = cl(car.rpm+(Math.max(targetRPM,car.rpm+380*(car.reversing?brk:thr))-car.rpm)*blend+(targetRPM-car.rpm)*0.05,IDLE_RPM,MAX_RPM);
  } else {
    car.rpm = cl(car.rpm-800*dt, IDLE_RPM, MAX_RPM);
  }

  // ── Move ───────────────────────────────────────────────────────────
  const cH = Math.cos(car.heading), sH = Math.sin(car.heading);
  car.px += (sH*car.vz + cH*car.vx)*dt;
  car.pz += (cH*car.vz - sH*car.vx)*dt;
  car.speed = car.vz;

  ghostTick();

  const ci=closestTrackIdx(car.px,car.pz),cp=CENTRE[ci];
  const dx=car.px-cp.x,dz=car.pz-cp.y;
  const{tx:ttx,tz:ttz}=tangentAt(ci);
  const rnx=-ttz,rnz=ttx;
  const signedDist=dx*rnx+dz*rnz,absDist=Math.abs(signedDist);
  const outerEdge=TW/2,barrierDist=TW/2+TW;

  if(absDist>barrierDist-0.6){
    const side=Math.sign(signedDist);
    car.px=cp.x+rnx*side*(barrierDist-0.6);
    car.pz=cp.y+rnz*side*(barrierDist-0.6);
    car.speed=0;car.vz=0;car.vx=0;car.av=0;
    if(!car.barrierHit){
      car.barrierHit=true; car.barrierSide=ci; car.lapDirty=true;
      addPenalty(5.0,'+5.0s BARRIER');
      // Store respawn point — track centre at impact index, facing track direction
      car.respawnIdx=ci;
      showRespawnPrompt(true);
      setDrift(false); // cancel drift on crash
    }
  } else {car.barrierHit=false;}

  const offTrack=absDist>outerEdge+0.9;
  if(!offTrack && !car.barrierHit) showRespawnPrompt(false);
  if(offTrack&&!car.offTrack){ car.offTrackStart=performance.now(); car.lapDirty=true; }
  if(!offTrack&&car.offTrack){
    const to=Math.min((performance.now()-car.offTrackStart)/1000, 1.0);
    addPenalty(to,'+'+to.toFixed(1)+'s OFF TRACK');
  }
  car.offTrack=offTrack;

  const cTang=tangentAt(ci);
  const dot=Math.sin(car.heading)*cTang.tx+Math.cos(car.heading)*cTang.tz;
  car.wrongWay=car.vz>2&&dot<-0.4;

  // ── INDEX-BASED SECTOR PROGRESS ──────────────
  // Track progress as a 0..N_PTS value that only moves forward (never jumps backward).
  // Sectors tick off automatically when progress passes their index threshold.
  // Wrong-way movement reduces progress, making sectors un-clearable going backwards.
  const SIDXS=[Math.floor(N_PTS*.25),Math.floor(N_PTS*.5),Math.floor(N_PTS*.75)];

  // Calculate signed step: how many indices did we move forward this frame?
  // ciPrev is stored each frame; delta wraps around correctly at the seam.
  const ciPrev = car.ciPrev !== undefined ? car.ciPrev : ci;
  let step = ci - ciPrev;
  // Handle wrap-around at seam (index jumps from ~N_PTS-1 back to 0)
  if (step >  N_PTS/2) step -= N_PTS;
  if (step < -N_PTS/2) step += N_PTS;
  car.ciPrev = ci;

  // Advance or retreat lapProgress
  if (!car.wrongWay) {
    car.lapProgress = (car.lapProgress || 0) + Math.max(0, step);
  } else {
    // Going wrong way — retreat progress so sectors can't be gamed
    car.lapProgress = Math.max(0, (car.lapProgress || 0) + Math.min(0, step));
  }

  // Clear sectors based on progress thresholds
  for(let s=0;s<3;s++){
    if(car.lapProgress >= SIDXS[s]) car.sectors[s]=true;
  }

  // SF zone: near index 0
  const nearSF = ci < 8;
  if(nearSF && car.wrongWay) car.sfCrossedWrong = true;

  // Lap complete when: car has accumulated enough forward progress (>90% of track)
  // AND is now near the SF line AND moving forward AND not wrong-way
  const allSectors = car.sectors[0] && car.sectors[1] && car.sectors[2];
  const enoughProgress = car.lapProgress >= N_PTS * 0.88;
  // lap=0: just start the timer on first SF crossing (no progress needed)
  // lap>0: must have done 88%+ of track to prevent shortcut counting
  const validCross = (car.lap === 0 || enoughProgress) && nearSF && !car.wrongWay && !car.sfCrossedWrong && car.speed > 0.5;

  if(validCross && !car.atSF){
    const now = performance.now() / 1000;
    let isNewBest = false;
    if(car.lap > 0){
      const raw = now - car.lapT, lapTime = raw + car.lapPenalty;
      car.lastLapTime = lapTime;
      if(car.lapPenalty === 0 && !car.lapDirty && lapTime < car.best){
        car.best = lapTime;
        isNewBest = true;
      }
    }
    car.lapPenalty = 0; car.lapDirty = false; car.lapT = now; car.lap++;
    // Ghost
    ghostOnLapCross(isNewBest);
    car.sectors = [false,false,false]; car.sfCrossedWrong = false;
    car.lapProgress = 0;
  }
  car.atSF = nearSF && car.speed > 0.5;
}

// ── CAMERA MODE ── 'chase' | 'hood' | 'bumper'
let camMode = 'chase';
const _camBtn = document.getElementById('btn-cam');
const _camLetter = document.getElementById('cam-mode-letter');
const _CAM_LETTERS = { chase: 'C', hood: 'H', bumper: 'B' };
const _CAM_NEXT    = { chase: 'hood', hood: 'bumper', bumper: 'chase' };

_camBtn.addEventListener('click', () => {
  camMode = _CAM_NEXT[camMode];
  _camLetter.textContent = _CAM_LETTERS[camMode];
  _camBtn.className = camMode === 'hood' ? 'cam-hood' : camMode === 'bumper' ? 'cam-bumper' : '';
  camera.fov = camMode === 'hood' ? 120 : camMode === 'bumper' ? 72 : 60;
  camera.updateProjectionMatrix();
  wsMesh.material.opacity = camMode === 'hood' ? 0 : 0.75;
  cabinMesh.material.opacity = camMode === 'hood' ? 0 : 1;
  cabinMesh.material.transparent = true;
  const svgEls = _camBtn.querySelectorAll('path, rect, circle');
  svgEls.forEach(el => { el.style.stroke = 'currentColor'; });
  SND.playUIClick();
});

function updateCamera(){
  const csh=Math.cos(car.heading),snh=Math.sin(car.heading);
  const fwdX = snh, fwdZ = csh; // forward direction vector

  if(camMode === 'hood'){
    // Height 1.41 — fixed per user spec. Strong suspension coupling for brake/accel feel.
    const hoodH = 1.41 + suspBounce * 0.55 + suspPitch * 0.70;
    camera.position.set(
      car.px + fwdX * 1.3,
      hoodH,
      car.pz + fwdZ * 1.3
    );
    // Look target pitches with suspension — nose dives on brake, lifts on accel
    camera.lookAt(
      car.px + fwdX * 9,
      hoodH - 0.45 + suspPitch * 1.4,
      car.pz + fwdZ * 9
    );
  } else if(camMode === 'bumper'){
    // Front bumper cam: higher so road ahead is well visible
    const bumpH = 0.98 + suspBounce * 0.2 + suspPitch * 0.2;
    camera.position.set(
      car.px + fwdX * 1.9,
      bumpH,
      car.pz + fwdZ * 1.9
    );
    camera.lookAt(
      car.px + fwdX * 28,
      bumpH - 0.38 + suspPitch * 0.5,
      car.pz + fwdZ * 28
    );
  } else {
    // Default chase cam
    const camH=S.ch-suspBounce*0.8+suspPitch*1.2;
    camera.position.set(car.px-snh*S.cd,camH,car.pz-csh*S.cd);
    camera.lookAt(car.px,0.65-suspPitch*1.5,car.pz);
  }
}

let prevSpeed=0,suspPitch=0,suspBounce=0,smoothAccel=0;
function updateMeshes(dt){
  // Visual slip angle: rotate the car body toward travel direction so it LOOKS
  // like it's drifting — body points where it's going, not where it's heading.
  // Beta = atan2(vx, vz) = body sideslip angle. Blend smoothly so it's not jittery.
  const betaGate = cl((Math.abs(car.vx) - 0.8) / 2.0, 0, 1) * cl((Math.abs(car.vz) - 5) / 10, 0, 1);
  const betaRaw = Math.abs(car.vz) > 0.5 ? Math.atan2(car.vx, car.vz) * betaGate : 0;
  if(!updateMeshes._beta) updateMeshes._beta = 0;
  updateMeshes._beta += (betaRaw - updateMeshes._beta) * (1 - Math.exp(-dt * 5));
  carGroup.position.set(car.px,0,car.pz);
  carGroup.rotation.y = car.heading - updateMeshes._beta * 0.65;

  const spd=Math.abs(car.speed);
  const spin=car.speed*0.09;
  rearWheels.forEach(w=>w.rotation.x+=spin*dt*60);
  frontPivots.forEach(fp=>fp.wheel.rotation.x+=spin*dt*60);
  frontPivots[0].pivot.rotation.y=car.steer; frontPivots[1].pivot.rotation.y=car.steer;
  const rawAccel = dt>0 ? cl((car.speed-prevSpeed)/dt, -50, 50) : 0; prevSpeed=car.speed;
  const accelInput = spd > 1.4 ? rawAccel : 0;
  smoothAccel += (accelInput - smoothAccel) * (1-Math.exp(-dt*3));
  const tp = cl(-smoothAccel*0.0015, -0.08, 0.08);
  const tb = cl(Math.abs(smoothAccel)*0.0002, 0, 0.04);
  const tSmooth = 1-Math.exp(-dt*5);
  suspPitch  += (tp - suspPitch)  * tSmooth;
  suspBounce += (tb - suspBounce) * tSmooth;
  carGroup.position.y = -suspBounce*0.35;
  const roll = cl(-car.steer*0.15, -0.09, 0.09);
  bodyMesh.rotation.z=roll;  bodyMesh.rotation.x=suspPitch;
  cabinMesh.rotation.z=roll; cabinMesh.rotation.x=suspPitch;
  wsMesh.rotation.z=roll;    wsMesh.rotation.x=suspPitch;
  rearWheels.forEach(w=>w.position.y=0.36+suspBounce*0.25);
  frontPivots.forEach(fp=>fp.pivot.position.y=0.36+suspBounce*0.25);

  // ── BRAKE LIGHTS ─────────────────────────────────────────────────
  const _isBraking = ((P.B || P.KeyS || P.ArrowDown) || hbOn || driftOn) ? 1.0 : 0.0;
  const _blRate = _isBraking > _brakeLightSmooth ? 16.0 : 5.0;
  _brakeLightSmooth += (_isBraking - _brakeLightSmooth) * (1 - Math.exp(-dt * _blRate));
  const _blOn = _brakeLightSmooth > 0.05;
  _tlLensL.material = _blOn ? _tlMatOn : _tlMatOff;
  _tlLensR.material = _blOn ? _tlMatOn : _tlMatOff;
  _tlGlowL.intensity = _brakeLightSmooth * 0.6;
  _tlGlowR.intensity = _brakeLightSmooth * 0.6;
}


// ── CACHED DOM REFS (avoid getElementById in hot loop) ──
const _domCustScreen    = document.getElementById('cust-screen');
const _domSessionScreen = document.getElementById('session-screen');
const _domSaveGhostModal= document.getElementById('save-ghost-modal');
const _domSpdBig    = document.getElementById('spd-big');
const _domGear      = document.getElementById('gear-display');
const _domRpmNum    = document.getElementById('rpm-number');
const _domHLap      = document.getElementById('h-lap');
const _domHTime     = document.getElementById('h-time');
const _domHBest     = document.getElementById('h-best');
const _domHDelta    = document.getElementById('h-delta');
const _domDriftWrap = document.getElementById('drift-wrap');
const _domDriftDist = document.getElementById('h-drift-dist');
const _domDriftTime = document.getElementById('h-drift-time');
const _driftWorldPos = new THREE.Vector3(); // pre-allocated, reused every frame

// Drift session tracking
let _driftStartTime = 0;
let _driftStartPx = 0, _driftStartPz = 0;
let _driftDist = 0;
let _driftActive = false;
let _driftElapsed = 0;
let _driftLastTs = 0;
// Session-best drift stats
let _sessionBestDriftDist = 0;
let _sessionBestDriftTime = 0;
const _domPenLbl    = document.getElementById('penalty-label');
const _domWrongWay  = document.getElementById('wrong-way');
const _domRpmFill   = document.getElementById('rpm-fill');

function updateHUD(ts){
  const spdEl=_domSpdBig;
  spdEl.className=(P.B||P.KeyS||P.ArrowDown)?'braking':'';
  spdEl.childNodes[0].textContent=Math.round(Math.abs(car.speed)*3.6)+' ';
  _domGear.textContent = car.reversing ? 'R' : car.gear;
  _domHLap.textContent=Math.max(0,car.lap-1);
  const lapSecs=car.lap>0?((ts/1000)-car.lapT):0;
  const timeEl=_domHTime;
  if(!timeEl.classList.contains('penalty-blink')) timeEl.textContent=lapSecs.toFixed(2)+'s';
  _domHBest.textContent=car.best<Infinity?car.best.toFixed(2)+'s':'--';
  const deltaEl=_domHDelta;
  if(car.best<Infinity&&car.lap>1){
    const d=lapSecs-car.best;
    deltaEl.textContent=(d<0?'':'+')+(d<0?d.toFixed(2):d.toFixed(2))+'s';
    deltaEl.className=d<0?'faster':'slower';
  } else {deltaEl.textContent='— vs BEST';deltaEl.className='';}
  // live off-track counter — only show while off track and no fixed penalty is displaying
  const lblEl=_domPenLbl;
  if(car.offTrack && !car.showingPenalty){
    lblEl.textContent='+'+(( performance.now()-car.offTrackStart)/1000).toFixed(1)+'s';
    lblEl.style.opacity='1';
  }
  _domWrongWay.style.display=car.wrongWay?'block':'none';

  // ── Drift stats — live distance and time during active drift ──
  // Time only counts when car is actually sliding sideways, not just button held
  const actuallySliding = Math.abs(car.vx) > 1.0 && Math.abs(car.speed) > 5;
  const driftNow = (driftOn || hbOn) && actuallySliding;

  if(driftNow && !_driftActive){
    _driftActive = true;
    _driftStartPx = car.px; _driftStartPz = car.pz;
    _driftDist = 0; _driftElapsed = 0;
    _driftLastTs = ts;
    _domDriftWrap.classList.add('active');
  } else if(!driftNow && _driftActive){
    _driftActive = false;
    // Update session bests
    if(_driftDist > _sessionBestDriftDist) _sessionBestDriftDist = _driftDist;
    if(_driftElapsed > _sessionBestDriftTime) _sessionBestDriftTime = _driftElapsed;
    setTimeout(()=>{ if(!(driftOn||hbOn)) _domDriftWrap.classList.remove('active'); }, 1000);
  }
  if(_driftActive){
    _driftElapsed += (ts - _driftLastTs) / 1000;
    _driftLastTs = ts;
    const dx = car.px - _driftStartPx, dz = car.pz - _driftStartPz;
    _driftDist = Math.sqrt(dx*dx + dz*dz);
    _domDriftDist.textContent = Math.round(_driftDist) + 'm';
    _domDriftTime.textContent = _driftElapsed.toFixed(1) + 's';
  }
  const pct=((car.rpm-IDLE_RPM)/(MAX_RPM-IDLE_RPM)*100).toFixed(1);
  const fill=_domRpmFill;
  fill.style.width=pct+'%';
  fill.style.background=car.rpm>MAX_RPM*0.86?'#ff3030':car.rpm>MAX_RPM*0.65?'#f0c040':'#30e060';
  // Live RPM number — color shifts red near redline
  const rpmVal = Math.round(car.rpm/100)*100; // round to nearest 100
  _domRpmNum.textContent = rpmVal.toLocaleString();
  _domRpmNum.style.color = car.rpm > MAX_RPM*0.86 ? '#ff3030' : car.rpm > MAX_RPM*0.65 ? '#f0c040' : '#888';
}

let penaltyFadeTimer=null;
function addPenalty(secs,label){
  sessionTotalPenalty=(sessionTotalPenalty||0)+secs;
  car.lapPenalty+=secs;
  const timeEl=_domHTime,lblEl=_domPenLbl;
  // cancel any pending fade so new penalty is never wiped early
  if(penaltyFadeTimer){ clearTimeout(penaltyFadeTimer); penaltyFadeTimer=null; }
  timeEl.classList.add('penalty-blink');
  lblEl.textContent=(secs>=0?'+':'')+secs.toFixed(1)+'s';
  lblEl.style.opacity='1';
  car.showingPenalty=true;
  setTimeout(()=>timeEl.classList.remove('penalty-blink'),1000);
  penaltyFadeTimer=setTimeout(()=>{
    lblEl.style.opacity='0';
    lblEl.textContent='';
    car.showingPenalty=false;
    penaltyFadeTimer=null;
  },2500);
}


// ── MINIMAP ────────────────────────────────────
const mmCanvas=document.getElementById('minimap'),mmCtx=mmCanvas.getContext('2d');
mmCanvas.width=210;mmCanvas.height=280;
const MMW=210,MMH=280;
const allX=CENTRE.map(p=>p.x),allZ=CENTRE.map(p=>p.y);
const mmMinX=Math.min(...allX),mmMaxX=Math.max(...allX),mmMinZ=Math.min(...allZ),mmMaxZ=Math.max(...allZ);
const mmPad=18,mmSX=(MMW-mmPad*2)/(mmMaxX-mmMinX),mmSZ=(MMH-mmPad*2)/(mmMaxZ-mmMinZ);
const mmScaleFixed=Math.min(mmSX,mmSZ);
const mmOX=(MMW-mmPad*2-(mmMaxX-mmMinX)*mmScaleFixed)/2,mmOZ=(MMH-mmPad*2-(mmMaxZ-mmMinZ)*mmScaleFixed)/2;

// Minimap mode: 'fixed' = whole track scaled to fit | 'moving' = track window follows car
let mmMode='fixed';
const MM_MOVING_RANGE=80; // world units visible around car in moving mode

// Fixed mode transform
function toMMFixed(x,z){
  return{mx:mmPad+mmOX+(x-mmMinX)*mmScaleFixed, mz:mmPad+mmOZ+(z-mmMinZ)*mmScaleFixed};
}
// Moving mode transform — car always at centre, fixed world-unit scale
const MM_MOVING_SCALE=1.2; // pixels per world unit
function toMMMoving(x,z){
  const cx=car.px, cz=car.pz;
  return{
    mx: MMW/2 + (x-cx)*MM_MOVING_SCALE,
    mz: MMH/2 + (z-cz)*MM_MOVING_SCALE
  };
}
function toMM(x,z){ return mmMode==='moving' ? toMMMoving(x,z) : toMMFixed(x,z); }

let barrierFlashAlpha=0;

// ── Pre-bake fixed-mode track onto an offscreen canvas ──────────────
// The track never moves in fixed mode — no reason to rebuild 73 path
// points every frame. Bake once, stamp the image each frame instead.
const _mmTrackCanvas = document.createElement('canvas');
_mmTrackCanvas.width = MMW; _mmTrackCanvas.height = MMH;
(function bakeFixedTrack(){
  const ctx = _mmTrackCanvas.getContext('2d');
  const outerPts=[],innerPts=[];
  for(let i=0;i<N_PTS;i++){
    const t=tangentAt(i),nx=-t.tz,nz=t.tx,c=CENTRE[i];
    outerPts.push(toMMFixed(c.x+nx*TW/2,c.y+nz*TW/2));
    innerPts.push(toMMFixed(c.x-nx*TW/2,c.y-nz*TW/2));
  }
  ctx.beginPath();
  outerPts.forEach((p,i)=>i===0?ctx.moveTo(p.mx,p.mz):ctx.lineTo(p.mx,p.mz));
  ctx.closePath();
  for(let i=innerPts.length-1;i>=0;i--){const p=innerPts[i];i===innerPts.length-1?ctx.moveTo(p.mx,p.mz):ctx.lineTo(p.mx,p.mz);}
  ctx.closePath();
  ctx.fillStyle='#000';ctx.fill('evenodd');
  ctx.beginPath();outerPts.forEach((p,i)=>i===0?ctx.moveTo(p.mx,p.mz):ctx.lineTo(p.mx,p.mz));ctx.closePath();
  ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=1.2;ctx.stroke();
  ctx.beginPath();innerPts.forEach((p,i)=>i===0?ctx.moveTo(p.mx,p.mz):ctx.lineTo(p.mx,p.mz));ctx.closePath();
  ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=1.2;ctx.stroke();
  const sf2=CENTRE[0],sft=tangentAt(0),sfnx=-sft.tz,sfnz=sft.tx;
  const{mx:sx1,mz:sz1}=toMMFixed(sf2.x-sfnx*TW/2,sf2.y-sfnz*TW/2);
  const{mx:sx2,mz:sz2}=toMMFixed(sf2.x+sfnx*TW/2,sf2.y+sfnz*TW/2);
  ctx.beginPath();ctx.moveTo(sx1,sz1);ctx.lineTo(sx2,sz2);
  ctx.strokeStyle='rgba(255,220,60,0.9)';ctx.lineWidth=1.5;ctx.stroke();
})();

function drawMinimap(){
  mmCtx.clearRect(0,0,MMW,MMH);
  if(car.barrierHit&&car.barrierSide>=0) barrierFlashAlpha=0.55;
  else{barrierFlashAlpha=Math.max(0,barrierFlashAlpha-0.012);if(barrierFlashAlpha===0)car.barrierSide=-1;}

  mmCtx.save();
  mmCtx.beginPath(); mmCtx.rect(0,0,MMW,MMH); mmCtx.clip();

  if(mmMode==='moving'){
    // Moving mode: rebuild track points every frame (map rotates with car)
    mmCtx.translate(MMW/2, MMH/2);
    mmCtx.rotate(Math.PI + car.heading);
    mmCtx.translate(-MMW/2, -MMH/2);
    const outerPts=[],innerPts=[];
    for(let i=0;i<N_PTS;i++){
      const t=tangentAt(i),nx=-t.tz,nz=t.tx,c=CENTRE[i];
      outerPts.push(toMM(c.x+nx*TW/2,c.y+nz*TW/2));
      innerPts.push(toMM(c.x-nx*TW/2,c.y-nz*TW/2));
    }
    mmCtx.beginPath();
    outerPts.forEach((p,i)=>i===0?mmCtx.moveTo(p.mx,p.mz):mmCtx.lineTo(p.mx,p.mz));
    mmCtx.closePath();
    for(let i=innerPts.length-1;i>=0;i--){const p=innerPts[i];i===innerPts.length-1?mmCtx.moveTo(p.mx,p.mz):mmCtx.lineTo(p.mx,p.mz);}
    mmCtx.closePath();
    mmCtx.fillStyle='#000';mmCtx.fill('evenodd');
    mmCtx.beginPath();outerPts.forEach((p,i)=>i===0?mmCtx.moveTo(p.mx,p.mz):mmCtx.lineTo(p.mx,p.mz));mmCtx.closePath();
    mmCtx.strokeStyle='rgba(255,255,255,0.85)';mmCtx.lineWidth=1.2;mmCtx.stroke();
    mmCtx.beginPath();innerPts.forEach((p,i)=>i===0?mmCtx.moveTo(p.mx,p.mz):mmCtx.lineTo(p.mx,p.mz));mmCtx.closePath();
    mmCtx.strokeStyle='rgba(255,255,255,0.85)';mmCtx.lineWidth=1.2;mmCtx.stroke();
    const sf2=CENTRE[0],sft=tangentAt(0),sfnx=-sft.tz,sfnz=sft.tx;
    const{mx:sx1,mz:sz1}=toMM(sf2.x-sfnx*TW/2,sf2.y-sfnz*TW/2);
    const{mx:sx2,mz:sz2}=toMM(sf2.x+sfnx*TW/2,sf2.y+sfnz*TW/2);
    mmCtx.beginPath();mmCtx.moveTo(sx1,sz1);mmCtx.lineTo(sx2,sz2);
    mmCtx.strokeStyle='rgba(255,220,60,0.9)';mmCtx.lineWidth=1.5;mmCtx.stroke();
  } else {
    // Fixed mode: stamp pre-baked track image — zero path rebuilding
    mmCtx.drawImage(_mmTrackCanvas, 0, 0);
  }

  // Barrier flash (dynamic — position depends on impact point)
  if(barrierFlashAlpha>0.01&&car.barrierSide>=0){
    const S2=18,s=car.barrierSide;
    mmCtx.beginPath();
    for(let k=-S2;k<=S2;k++){const idx=(s+k+N_PTS)%N_PTS,t=tangentAt(idx),nx=-t.tz,nz=t.tx,c=CENTRE[idx],po=toMM(c.x+nx*TW/2,c.y+nz*TW/2);k===-S2?mmCtx.moveTo(po.mx,po.mz):mmCtx.lineTo(po.mx,po.mz);}
    for(let k=S2;k>=-S2;k--){const idx=(s+k+N_PTS)%N_PTS,t=tangentAt(idx),nx=-t.tz,nz=t.tx,c=CENTRE[idx],pi2=toMM(c.x+nx*(TW/2-.5),c.y+nz*(TW/2-.5));mmCtx.lineTo(pi2.mx,pi2.mz);}
    mmCtx.closePath();mmCtx.fillStyle=`rgba(220,60,60,${barrierFlashAlpha})`;mmCtx.fill();
  }
  // Ghost dot — single (realtime/loaded)
  if(ghostActive && ghostGroup.visible && ghostPlay.length>1){
    const gx=ghostGroup.position.x, gz=ghostGroup.position.z;
    const{mx:gmx,mz:gmz}=toMM(gx,gz);
    mmCtx.beginPath();mmCtx.arc(gmx,gmz,3.0,0,Math.PI*2);
    mmCtx.fillStyle='rgba(180,200,255,0.7)';mmCtx.fill();
    mmCtx.beginPath();mmCtx.arc(gmx,gmz,3.0,0,Math.PI*2);
    mmCtx.strokeStyle='rgba(255,255,255,0.9)';mmCtx.lineWidth=0.8;mmCtx.stroke();
    mmCtx.font='bold 7px "Courier New"';mmCtx.textAlign='center';
    mmCtx.fillStyle='rgba(180,200,255,0.9)';
    mmCtx.fillText(ghostLapTime||ghostName,gmx,gmz-6);
  }
  // Ghost dots — multi
  if(ghostMode==='multi' && _multiGhosts.length){
    _multiGhosts.forEach((mg,ci)=>{
      if(!mg.active||!mg.group.visible) return;
      const gx=mg.group.position.x, gz=mg.group.position.z;
      const{mx:gmx,mz:gmz}=toMM(gx,gz);
      const col='#'+GHOST_COLORS[(ci+1)%GHOST_COLORS.length].toString(16).padStart(6,'0');
      mmCtx.beginPath();mmCtx.arc(gmx,gmz,3.0,0,Math.PI*2);
      mmCtx.fillStyle=col+'bb';mmCtx.fill();
      mmCtx.beginPath();mmCtx.arc(gmx,gmz,3.0,0,Math.PI*2);
      mmCtx.strokeStyle='rgba(255,255,255,0.7)';mmCtx.lineWidth=0.8;mmCtx.stroke();
      mmCtx.font='bold 7px "Courier New"';mmCtx.textAlign='center';
      mmCtx.fillStyle=col;
      mmCtx.fillText(mg.lapTime,gmx,gmz-6);
    });
  }
  // Player dot
  const{mx:cx2,mz:cz2}=toMM(car.px,car.pz);
  const dotX = mmMode==='moving' ? MMW/2 : cx2;
  const dotZ = mmMode==='moving' ? MMH/2 : cz2;
  mmCtx.beginPath();mmCtx.arc(dotX,dotZ,3.2,0,Math.PI*2);mmCtx.fillStyle='#fff';mmCtx.fill();
  if(mmMode==='moving'){
    mmCtx.beginPath();
    mmCtx.moveTo(dotX, dotZ-7);
    mmCtx.lineTo(dotX-3, dotZ+3);
    mmCtx.lineTo(dotX+3, dotZ+3);
    mmCtx.closePath();
    mmCtx.fillStyle='rgba(255,255,255,0.85)';mmCtx.fill();
  } else {
    mmCtx.beginPath();
    mmCtx.moveTo(dotX+Math.sin(car.heading)*6,dotZ+Math.cos(car.heading)*6);
    mmCtx.lineTo(dotX-Math.sin(car.heading)*3,dotZ-Math.cos(car.heading)*3);
    mmCtx.strokeStyle='rgba(255,255,255,0.7)';mmCtx.lineWidth=1.5;mmCtx.stroke();
  }

  mmCtx.restore();

  // Compass "▲" drawn AFTER restore so it never rotates with the world
  if(mmMode==='moving'){
    mmCtx.save();
    mmCtx.font='bold 9px "Courier New"';
    mmCtx.fillStyle='rgba(255,255,255,0.35)';
    mmCtx.textAlign='center';
    mmCtx.fillText('▲ FWD',MMW/2,11);
    mmCtx.restore();
  }
}

// ── MAIN LOOP ─────────────────────────────────
let _wasPaused = true;
  
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// SOUND ENGINE v16 — clean 4-oscillator design
// Simple always beats complex for procedural browser audio
// Architecture: 4 detuned sawtooths → LP filter → saturation → master
// + pink noise layer for texture + decel pops
function loop(ts){
  checkpoint('startLoop');
requestAnimationFrame(loop);
  if(!lastTime) lastTime=ts;
  const isPaused=optPanel.classList.contains('open')||_domCustScreen.classList.contains('active')||_domSessionScreen.classList.contains('open')||_domSaveGhostModal.classList.contains('open');
  const preStart=document.body.classList.contains('pre-start');
  // Camera always updates so car is visible on start/pause screens
  updateCamera();
  if(preStart) updateMeshes(0); // keep car mesh at correct position during countdown
  renderer.render(scene,camera);
  if(isPaused||preStart){
    SND.update(car.rpm,car.vz,car.vx,preStart?0.08:0,0,0,false,false,false,true,false,null,true,preStart);
    GHOST_SND.stopAll();
    lastTime=ts; _wasPaused=true; return;
  }
  // First frame after unpause: dt=0 so no jerk/shake
  const dt = _wasPaused ? 0 : Math.min((ts-lastTime)/1000, 0.033);
  _wasPaused = false;
  lastTime=ts;
  try {
  physics(dt); updateHUD(ts);
  updateMeshes(dt);
  tickTyreMarks(dt);
  _updateMarks(dt);
  // ── Sound update
  const _sndPaused=optPanel.classList.contains('open')||_domCustScreen.classList.contains('active')||_domSessionScreen.classList.contains('open');
  const _sndThr=(P.T||P.KeyW||P.ArrowUp)?1:0;
  // Handbrake doesn't use the brake pedal — pass 0 for brk when only HB is active so brake sounds don't fire
  const _sndBrk = hbOn && !(P.B||P.KeyS||P.ArrowDown) ? 0 : car.brkInput||0;
  SND.update(
    car.rpm, car.vz, car.vx, _sndThr,
    _sndBrk, car.brakeLock||0,
    car.oversteer, car.understeer, car.spinning,
    !car.offTrack, car.barrierHit,
    car.gearJustShifted,
    _sndPaused, document.body.classList.contains('pre-start'),
    car.reversing||false, hbOn, driftOn,
    car.alphaF||0, car.alphaR||0
  );
  ghostFrame();
  drawMinimap();
  } catch(e) {
    var el=document.getElementById('err-overlay');
    if(el.style.display==='none'){
      el.style.display='block';
      el.textContent='LOOP ERROR:\n'+e.message+'\n\n'+e.stack;
    }
  }
}
requestAnimationFrame(loop);

// ── Minimap mode buttons
const _btnMMFixed  = document.getElementById('btn-mm-fixed');
const _btnMMMoving = document.getElementById('btn-mm-moving');
const _mmDesc      = document.getElementById('mm-mode-desc');
function setMMMode(mode){
  mmMode=mode;
  const onBg='rgba(48,224,96,.15)', onBd='#30e060', onClr='#30e060';
  const offBg='rgba(255,255,255,.08)', offBd='rgba(255,255,255,.2)', offClr='#aaa';
  function styleBtn(btn, active){
    btn.style.background = active ? onBg : offBg;
    btn.style.borderColor = active ? onBd : offBd;
    btn.style.color = active ? onClr : offClr;
  }
  styleBtn(_btnMMFixed,  mode==='fixed');
  styleBtn(_btnMMMoving, mode==='moving');
  _mmDesc.textContent = mode==='fixed'
    ? 'Fixed: full track always visible'
    : 'Moving: viewport follows your car';
}
_btnMMFixed.addEventListener('click',()=>setMMMode('fixed'));
_btnMMMoving.addEventListener('click',()=>setMMMode('moving'));

// Unlock audio on first user interaction
['touchstart','mousedown','keydown'].forEach(ev=>
  document.addEventListener(ev,()=>{
    SND.init(); SND.resume();
    const _actx = SND.getCtx();
    if(_actx) GHOST_SND.init(_actx);
  },{passive:true})
);

// Resume audio when returning to tab — mobile kills AudioContext on background
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'visible') {
    SND.init();
    SND.resume();
  }
});

// ── UI CLICK SOUND — fires on any menu/options button ──
const _UI_CLICK_IDS = new Set([
  'btn-options','btn-cam','btn-close','btn-close-sens','btn-close-sens-top',
  'btn-close-ctrl','btn-close-sound','btn-close-sound-top','btn-close-lb','btn-close-log','btn-close-log-top','btn-copy-log','btn-clear-log',
  'btn-close-name','btn-close-track-picker',
  'btn-save-name','btn-start','btn-customize','btn-new-session','btn-session-back',
  'tab-general','tab-sensitivity','tab-controls','tab-leaderboard','tab-sound',
  'snd-master-btn','btn-ghost-realtime','btn-ghost-off','btn-ghost-load','btn-ghost-action',
  'tool-done','tool-exit','tool-reset',
  'btn-save-ghost','btn-cancel-ghost',
]);
// Driving/gameplay buttons — never play click on these
const _NO_CLICK_IDS = new Set([
  'btn-thr','btn-brk','btn-left','btn-right','btn-hb',
]);
document.addEventListener('click', e => {
  const el = e.target.closest('button, .opt-tab, .lb-subtab, .assist-btn, .cm-el, .track-slide-card');
  if(!el) return;
  const id = el.id || '';
  const cls = el.className || '';
  // Never fire on driving buttons
  if(_NO_CLICK_IDS.has(id)) return;
  if(
    _UI_CLICK_IDS.has(id) ||
    cls.includes('opt-tab') ||
    cls.includes('lb-subtab') ||
    cls.includes('assist-btn') ||
    cls.includes('btn-close-red') ||
    cls.includes('track-slide-card') ||
    cls.includes('lb-subtab') ||
    id.startsWith('btn-close') ||
    id.startsWith('tab-') ||
    id.startsWith('btn-abs') ||
    id.startsWith('btn-tc') ||
    id.startsWith('btn-sc') ||
    id.startsWith('btn-sa') ||
    id.startsWith('lbsub-')
  ){
    SND.playUIClick();
  }
}, true);


// ── Track rebuild — called when player selects a different track ──────
// _trackMeshes declared near initTrack() call above

function rebuildTrack(trackId){
  if(trackId === currentTrack && CENTRE.length > 0) return;
  currentTrack = trackId;
  // Remove old track meshes
  _trackMeshes.forEach(m => scene.remove(m));
  _trackMeshes = [];
  // Rebuild centreline + geometry
  initTrack(trackId);
  buildTrack();
  rebakeMinimapTrack();
  // Position car behind new start line
  const sf = CENTRE[0], st = tangentAt(0);
  const startH = Math.atan2(st.tx, st.tz);
  const _sfB2 = 8;
  car.px = sf.x - st.tx * _sfB2; car.pz = sf.y - st.tz * _sfB2;
  car.heading = startH;
  car.vx=0; car.vz=0; car.av=0; car.steer=0; car.speed=0;
  car.lap=0; car.lapT=0; car.best=Infinity; car.lapProgress=0;
  car.sectors=[false,false,false]; car.sfCrossedWrong=false;
  // Update 3D mesh position immediately so car appears on new track in pre-start view
  carGroup.position.set(car.px, 0, car.pz);
  carGroup.rotation.y = startH;
  _clearMarks();
  _closestCache = 0;
  drawTrackCard();
  // Redraw thumbnail for selected track
  const def = TRACK_DEFS[trackId];
  if(def) drawTrackOnCanvas('tsc-'+trackId, def.build ? def.build() : def.waypoints);
}

function rebakeMinimapTrack(){
  const ctx = _mmTrackCanvas.getContext('2d');
  ctx.clearRect(0,0,MMW,MMH);
  const outerPts=[],innerPts=[];
  for(let i=0;i<N_PTS;i++){
    const t=tangentAt(i),nx=-t.tz,nz=t.tx,c=CENTRE[i];
    outerPts.push(toMMFixed(c.x+nx*TW/2,c.y+nz*TW/2));
    innerPts.push(toMMFixed(c.x-nx*TW/2,c.y-nz*TW/2));
  }
  ctx.beginPath();
  outerPts.forEach((p,i)=>i===0?ctx.moveTo(p.mx,p.mz):ctx.lineTo(p.mx,p.mz));
  ctx.closePath();
  for(let i=innerPts.length-1;i>=0;i--){const p=innerPts[i];i===innerPts.length-1?ctx.moveTo(p.mx,p.mz):ctx.lineTo(p.mx,p.mz);}
  ctx.closePath();
  ctx.fillStyle='#000';ctx.fill('evenodd');
  ctx.beginPath();outerPts.forEach((p,i)=>i===0?ctx.moveTo(p.mx,p.mz):ctx.lineTo(p.mx,p.mz));ctx.closePath();
  ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=1.2;ctx.stroke();
  ctx.beginPath();innerPts.forEach((p,i)=>i===0?ctx.moveTo(p.mx,p.mz):ctx.lineTo(p.mx,p.mz));ctx.closePath();
  ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=1.2;ctx.stroke();
  const sf2=CENTRE[0],sft=tangentAt(0),sfnx=-sft.tz,sfnz=sft.tx;
  const{mx:sx1,mz:sz1}=toMMFixed(sf2.x-sfnx*TW/2,sf2.y-sfnz*TW/2);
  const{mx:sx2,mz:sz2}=toMMFixed(sf2.x+sfnx*TW/2,sf2.y+sfnz*TW/2);
  ctx.beginPath();ctx.moveTo(sx1,sz1);ctx.lineTo(sx2,sz2);
  ctx.strokeStyle='rgba(255,220,60,0.9)';ctx.lineWidth=1.5;ctx.stroke();
}

// ── TRACK CARD + PICKER ──────────────────────
function drawTrackCard(){
  const cv = document.getElementById('track-card-canvas');
  if(!cv) return;
  const W = cv.width = 220;
  const H = cv.height = 100;
  const ctx = cv.getContext('2d');
  ctx.fillStyle='#0b1a0b'; ctx.fillRect(0,0,W,H);
  const xs=CENTRE.map(p=>p.x), zs=CENTRE.map(p=>p.y);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const pad=12, sc=Math.min((W-pad*2)/(maxX-minX),(H-pad*2)/(maxZ-minZ));
  const offX=(W-(maxX-minX)*sc)/2-minX*sc;
  const offZ=(H-(maxZ-minZ)*sc)/2-minZ*sc;
  const tx=p=>p.x*sc+offX, tz=p=>p.y*sc+offZ;
  ctx.beginPath();
  CENTRE.forEach((p,i)=>i===0?ctx.moveTo(tx(p),tz(p)):ctx.lineTo(tx(p),tz(p)));
  ctx.closePath();
  ctx.strokeStyle='#2d2d2d'; ctx.lineWidth=11; ctx.stroke();
  ctx.strokeStyle='#3d3d3d'; ctx.lineWidth=8;  ctx.stroke();
  ctx.beginPath();
  CENTRE.forEach((p,i)=>i===0?ctx.moveTo(tx(p),tz(p)):ctx.lineTo(tx(p),tz(p)));
  ctx.closePath();
  ctx.strokeStyle='rgba(48,224,96,.6)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(tx(CENTRE[0]),tz(CENTRE[0]),3,0,Math.PI*2);
  ctx.fillStyle='#f0c040'; ctx.fill();
}
drawTrackCard();

// currentTrack, TRACK_DEFS, CENTRE, N_PTS — all in tracks.js

let _trackLocked = false; // true once countdown starts — no track changes allowed

function openTrackPicker(){
  if(_trackLocked) return; // can't change track during countdown or race
  document.getElementById('track-picker').classList.add('open');
  document.getElementById('track-picker-overlay').classList.add('open');
  document.getElementById('name-edit-popup').classList.remove('open');
}
function closeTrackPicker(){
  document.getElementById('track-picker').classList.remove('open');
  document.getElementById('track-picker-overlay').classList.remove('open');
}

document.getElementById('track-card').addEventListener('click',e=>{
  e.stopPropagation(); openTrackPicker();
});
document.getElementById('btn-close-track-picker').addEventListener('click',e=>{
  e.stopPropagation(); closeTrackPicker();
});
document.getElementById('track-picker-overlay').addEventListener('click',()=>closeTrackPicker());

// Generic track canvas draw — works for any track definition
function drawTrackOnCanvas(canvasId, pts){
  const cv=document.getElementById(canvasId);
  if(!cv||!pts||pts.length===0) return;
  const W=cv.width=160, H=cv.height=110;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#0b1a0b'; ctx.fillRect(0,0,W,H);

  // Interpolate to get smooth dense points (use catmullRom if waypoints, else use as-is)
  const isVec2 = pts[0] && pts[0].x !== undefined;
  let dense;
  if(isVec2){
    dense = pts; // already dense (oval)
  } else {
    // Sparse waypoints — interpolate for smooth thumbnail
    const v2 = pts.map(p=>new THREE.Vector2(p[0],p[1]));
    dense = catmullRom(v2, 6);
  }

  const xs=dense.map(p=>p.x||p[0]), zs=dense.map(p=>p.y||p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const pad=12, sc=Math.min((W-pad*2)/Math.max(maxX-minX,1),(H-pad*2)/Math.max(maxZ-minZ,1));
  const offX=(W-(maxX-minX)*sc)/2-minX*sc, offZ=(H-(maxZ-minZ)*sc)/2-minZ*sc;
  const tx=p=>(p.x||p[0])*sc+offX, tz=p=>(p.y||p[1])*sc+offZ;

  // Draw track width as a filled band
  const tw = TW * sc; // track width in canvas pixels
  // Outer edge
  ctx.beginPath();
  dense.forEach((p,i)=>i===0?ctx.moveTo(tx(p),tz(p)):ctx.lineTo(tx(p),tz(p)));
  ctx.closePath();
  ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=tw+4; ctx.stroke(); // dark background band
  ctx.strokeStyle='#333'; ctx.lineWidth=tw; ctx.stroke();       // track surface

  // Centreline
  ctx.beginPath();
  dense.forEach((p,i)=>i===0?ctx.moveTo(tx(p),tz(p)):ctx.lineTo(tx(p),tz(p)));
  ctx.closePath();
  ctx.strokeStyle='rgba(48,224,96,.55)'; ctx.lineWidth=1; ctx.stroke();

  // Start/finish dot
  ctx.beginPath(); ctx.arc(tx(dense[0]),tz(dense[0]),3,0,Math.PI*2);
  ctx.fillStyle='#f0c040'; ctx.fill();
}

if(TRACK_DEFS.oval) drawTrackOnCanvas('tsc-oval', TRACK_DEFS.oval.build());
if(TRACK_DEFS.my_circuit) drawTrackOnCanvas('tsc-my_circuit', TRACK_DEFS.my_circuit.waypoints);

const scroll=document.getElementById('track-cards-scroll');
const dots=document.querySelectorAll('.tp-dot');
const cards=document.querySelectorAll('.track-slide-card');
scroll.addEventListener('scroll',()=>{
  const idx=Math.round(scroll.scrollLeft/(scroll.scrollWidth/cards.length));
  dots.forEach((d,i)=>d.classList.toggle('active',i===idx));
},{passive:true});

cards.forEach(card=>{
  card.addEventListener('click',e=>{
    e.stopPropagation();
    if(card.classList.contains('disabled')) return;
    const track=card.dataset.track;
    if(track===currentTrack){ closeTrackPicker(); return; }
    cards.forEach(c=>{
      c.classList.remove('active');
      const badge=c.querySelector('.track-slide-badge');
      if(badge && !badge.classList.contains('locked')) badge.textContent='';
    });
    card.classList.add('active');
    const badge=card.querySelector('.track-slide-badge');
    if(badge) badge.textContent='SELECTED';
    document.getElementById('track-card-name').textContent=card.querySelector('.track-slide-name').textContent;
    const subEl=card.querySelector('.track-slide-sub');
    if(subEl) document.getElementById('track-card-sub').textContent=subEl.textContent;
    // currentTrack is updated inside rebuildTrack
    rebuildTrack(track);
    setTimeout(closeTrackPicker,220);
  });
});




// ── CUSTOMIZE HUD SYSTEM ──────────────────────
let custActive=false;

const CUST_DEFS=[
  {id:'minimap-wrap',label:'MINIMAP'},
  {id:'best-display',label:'BEST LAP'},
  {id:'top-bar',     label:'LAP'},
  {id:'spd-wrap',    label:'SPEED'},
  {id:'time-wrap',   label:'LAP TIME'},
  {id:'delta-wrap',  label:'DELTA'},
  {id:'rpm-wrap',    label:'RPM/GEAR'},
  {id:'btn-left',    label:'◀ LEFT'},
  {id:'btn-right',   label:'▶ RIGHT'},
  {id:'btn-thr',     label:'▲ GAS'},
  {id:'btn-brk',     label:'▼ BRAKE'},
  {id:'btn-hb',      label:'HBRAKE'},
  {id:'btn-drift',   label:'DRIFT'},
];

const custScreen=document.getElementById('cust-screen');
const mirrors=new Map();
let selMirror=null,dragMirror=null,dmOffX=0,dmOffY=0,dmMoved=false,dmStartX=0,dmStartY=0;

function rectsOverlap(a,b){const P=4;return!(a.x+a.w+P<b.x||b.x+b.w+P<a.x||a.y+a.h+P<b.y||b.y+b.h+P<a.y);}
function mRect(m){const r=m.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height};}
function wouldOverlap(mover,nx,ny){
  const w=mover.offsetWidth,h=mover.offsetHeight,nr={x:nx,y:ny,w,h};
  for(const[m] of mirrors){if(m===mover)continue;if(rectsOverlap(nr,mRect(m)))return true;}
  return false;
}

function moveMirrorTo(m,cx,cy){
  const mw=m.offsetWidth,mh=m.offsetHeight;
  cx=Math.max(0,Math.min(window.innerWidth-mw,cx));
  cy=Math.max(0,Math.min(window.innerHeight-mh,cy));
  if(!wouldOverlap(m,cx,cy)){
    m.style.left=cx+'px'; m.style.top=cy+'px';
    m.dataset.px=cx/window.innerWidth; m.dataset.py=cy/window.innerHeight;
  }
}

window.addEventListener('resize',()=>{
  for(const def of CUST_DEFS){
    const real=document.getElementById(def.id);
    if(!real) continue;
    if(real.dataset.px){
      // User has customized — reposition by percentage
      real.style.left=(parseFloat(real.dataset.px)*window.innerWidth)+'px';
      real.style.top=(parseFloat(real.dataset.py)*window.innerHeight)+'px';
    } else {
      // Not customized — clear any inline positioning so CSS media queries take over
      real.style.left=''; real.style.top=''; real.style.right=''; real.style.bottom='';
      real.style.transform='';
    }
  }
});

function buildMirrors(){
  for(const[m] of mirrors) m.remove();
  mirrors.clear(); selMirror=null;

  // Pre-start hides most HUD elements — temporarily force them visible so getBoundingClientRect works
  const isPreStart = document.body.classList.contains('pre-start');
  const tmpStyle = document.createElement('style');
  if(isPreStart){
    tmpStyle.textContent = `
      body.pre-start #btn-left, body.pre-start #btn-right,
      body.pre-start #btn-thr, body.pre-start #btn-brk,
      body.pre-start #btn-hb, body.pre-start #ctrl-grad,
      body.pre-start #top-bar, body.pre-start #minimap-wrap,
      body.pre-start #best-display, body.pre-start #spd-wrap,
      body.pre-start #time-wrap, body.pre-start #delta-wrap,
      body.pre-start #rpm-wrap, body.pre-start #respawn-btn
      { display:block !important; visibility:hidden !important; }
    `;
    document.head.appendChild(tmpStyle);
    // Force layout recalc
    document.body.offsetHeight;
  }

  for(const def of CUST_DEFS){
    const real=document.getElementById(def.id);
    if(!real) continue;
    const r=real.getBoundingClientRect();
    real.style.position='fixed';
    real.style.left=r.left+'px'; real.style.top=r.top+'px';
    real.style.right='auto'; real.style.bottom='auto';
    real.style.transform=real.style.transform.replace(/translateX\([^)]*\)/g,'').trim()||'none';
    const m=document.createElement('div');
    m.className='cm-el'; m.textContent=def.label;
    m.style.left=r.left+'px'; m.style.top=r.top+'px';
    m.dataset.px=r.left/window.innerWidth; m.dataset.py=r.top/window.innerHeight;
    m.style.width=Math.max(r.width,40)+'px'; m.style.height=Math.max(r.height,32)+'px';
    const sc=parseFloat(real.dataset.sc||'1'); m.dataset.sc=sc;
    if(sc!==1){m.style.transform='scale('+sc+')';m.style.transformOrigin='top left';}
    document.body.appendChild(m);
    mirrors.set(m,def.id);
    m.addEventListener('pointerdown',onMDown);
    m.addEventListener('pointermove',onMMove);
    m.addEventListener('pointerup',onMUp);
  }

  // Remove the temporary visibility override
  if(isPreStart) tmpStyle.remove();
}

function selectMirror(m){
  if(selMirror===m){m.classList.remove('cm-selected');selMirror=null;return;}
  if(selMirror) selMirror.classList.remove('cm-selected');
  selMirror=m; m.classList.add('cm-selected');
}

function resizeMirror(dir){
  if(!selMirror) return;
  const cur=parseFloat(selMirror.dataset.sc||'1');
  const next=Math.max(0.35,Math.min(3.0,cur+dir*0.12));
  selMirror.dataset.sc=next;
  selMirror.style.transform='scale('+next+')';
  selMirror.style.transformOrigin='top left';
}

function resetAll(){
  for(const[m,id] of mirrors){
    const real=document.getElementById(id);
    real.style.position='';real.style.left='';real.style.top='';
    real.style.right='';real.style.bottom='';real.style.transform='';
    real.dataset.sc='1'; delete real.dataset.px; delete real.dataset.py;
    requestAnimationFrame(()=>{
      const r=real.getBoundingClientRect();
      m.style.left=r.left+'px'; m.style.top=r.top+'px';
      m.style.transform=''; m.dataset.sc='1';
    });
  }
  if(selMirror){selMirror.classList.remove('cm-selected');selMirror=null;}
}

function syncRealEls(){
  for(const[m,id] of mirrors){
    const real=document.getElementById(id);
    const sc=parseFloat(m.dataset.sc||'1');
    real.style.position='fixed';
    real.style.left=m.style.left; real.style.top=m.style.top;
    real.style.right='auto'; real.style.bottom='auto';
    real.style.transform=sc!==1?'scale('+sc+')':'none';
    real.style.transformOrigin='top left';
    real.dataset.sc=sc;
    real.dataset.px=m.dataset.px||(parseFloat(m.style.left)/window.innerWidth);
    real.dataset.py=m.dataset.py||(parseFloat(m.style.top)/window.innerHeight);
  }
}

function onMDown(e){
  e.preventDefault();e.stopPropagation();
  dragMirror=e.currentTarget; dmMoved=false; dmStartX=e.clientX; dmStartY=e.clientY;
  const r=dragMirror.getBoundingClientRect();
  dmOffX=e.clientX-r.left; dmOffY=e.clientY-r.top;
  dragMirror.setPointerCapture(e.pointerId);
}
function onMMove(e){
  if(!dragMirror||dragMirror!==e.currentTarget) return;
  const dx=e.clientX-dmStartX,dy=e.clientY-dmStartY;
  if(Math.abs(dx)<6&&Math.abs(dy)<6) return;
  if(selMirror!==dragMirror) return;
  dmMoved=true;
  moveMirrorTo(dragMirror,e.clientX-dmOffX,e.clientY-dmOffY);
}
function onMUp(e){
  const m=dragMirror; dragMirror=null;
  if(!m) return;
  if(!dmMoved) selectMirror(m);
}

// Tap anywhere to teleport selected mirror
document.getElementById('cust-tap-bg').addEventListener('pointerdown',e=>{
  if(!selMirror) return;
  moveMirrorTo(selMirror,e.clientX-selMirror.offsetWidth/2,e.clientY-selMirror.offsetHeight/2);
});

function enterCustomize(){
  setTimeout(()=>{
    custActive=true;
    _closeOptionsPanel();
    checkpoint('buildMirrors');
buildMirrors();
    custScreen.classList.add('active');
    document.getElementById('cust-tap-bg').style.display='block';
    document.getElementById('btn-options').textContent='TOOLS';
    
  },60);
}

function exitCustomize(save){
  if(save){
    syncRealEls();
  } else {
    // Cancel — restore CSS positioning for elements not saved
    for(const[m,id] of mirrors){
      const real=document.getElementById(id);
      if(!real.dataset.px){
        real.style.position=''; real.style.left=''; real.style.top='';
        real.style.right=''; real.style.bottom=''; real.style.transform='';
      }
    }
  }
  custActive=false;
  custScreen.classList.remove('active');
  document.getElementById('cust-tap-bg').style.display='none';
  document.getElementById('btn-options').textContent='OPTIONS';
  document.getElementById('tools-island').classList.remove('open');
  document.getElementById('cust-popup').classList.remove('show');
  for(const[m] of mirrors) m.remove();
  mirrors.clear(); selMirror=null; dragMirror=null;
}

document.getElementById('btn-customize').addEventListener('click',enterCustomize);
document.getElementById('tool-plus').addEventListener('click', e=>{e.stopPropagation();resizeMirror(1);});
document.getElementById('tool-minus').addEventListener('click',e=>{e.stopPropagation();resizeMirror(-1);});
document.getElementById('tool-done').addEventListener('click', e=>{e.stopPropagation();exitCustomize(true);});
document.getElementById('tool-exit').addEventListener('click', e=>{e.stopPropagation();exitCustomize(false);});
document.getElementById('tool-reset').addEventListener('click',e=>{e.stopPropagation();resetAll();});
document.getElementById('cust-pop-close').addEventListener('click',()=>document.getElementById('cust-popup').classList.remove('show'));
document.getElementById('cust-pop-ok').addEventListener('click',   ()=>document.getElementById('cust-popup').classList.remove('show'));

// START button — countdown then go
document.getElementById('btn-start').addEventListener('click', ()=>{
  _trackLocked = true; // lock track selection — no changes during countdown/race
  // hide start button immediately
  document.getElementById('btn-start').style.display='none';
  SND.init(); SND.resume(); SND.countdownFadeIn(3.5); // ramp from 0→1 over countdown duration
  startCountdown(()=>{
    try {
      document.body.classList.remove('pre-start');
      document.getElementById('options-wrap').style.display = '';
      SND.init(); SND.resume(); SND.countdownFadeIn(0.8);
      // Position car behind start line (same offset as initial spawn)
      const _sf = CENTRE[0], _st = tangentAt(0);
      const _sfB = 8;
      car.px = _sf.x - _st.tx * _sfB; car.pz = _sf.y - _st.tz * _sfB;
      car.heading = Math.atan2(_st.tx, _st.tz);
      carGroup.position.set(car.px, 0, car.pz);
      carGroup.rotation.y = car.heading;
      // Zero ALL motion state before physics runs
      car.vx=0; car.vz=0; car.av=0; car.steer=0; car.speed=0;
      car.oversteer=false; car.understeer=false; car.spinning=false; car.gearJustShifted=null;
      car.lapT = performance.now()/1000;
      lastTime  = performance.now(); // set so first dt is ~0
      ghostRec=[]; ghostBest=[]; ghostPlay=[]; ghostActive=false; ghostGroup.visible=false; _clearMultiGhosts(); multiSelectedIds.clear();
      sessionTotalPenalty=0;
      _sessionBestDriftDist=0; _sessionBestDriftTime=0;
      _trackLocked = false; // allow track changes again on new session
      _clearMarks(); car._sfSmooth=0; car._hbGrip=1.0; hbOn=false; hbBtn.classList.remove('on'); hbBtn.textContent='HANDBRAKE'; setDrift(false);
    } catch(e) {
      var el=document.getElementById('err-overlay');
      el.style.display='block';
      el.textContent='START ERROR:\n'+e.message+'\n\n'+e.stack;
    }
  });
});
// Pre-start SETTINGS opens same opt-panel
document.getElementById('btn-pre-settings').addEventListener('click', ()=>{
  _openOptionsPanel();
});
// ══════════════════════════════════════════
// COUNTDOWN
// ══════════════════════════════════════════
function startCountdown(cb){
  const overlay = document.getElementById('countdown-overlay');
  const num     = document.getElementById('countdown-num');

  // Reset
  num.className = ''; num.textContent = '';
  overlay.classList.add('active');

  let count = 3;

  function tick(){
    // restart number animation
    num.style.animation = 'none'; num.offsetHeight; num.style.animation = '';

    if(count > 0){
      num.textContent = count; num.className = '';
      count--;
      setTimeout(tick, 900);
    } else {
      // GO
      num.textContent = 'GO!'; num.className = 'go';
      setTimeout(()=>{ overlay.classList.remove('active'); cb(); }, 700);
    }
  }

  tick();
}

// ══════════════════════════════════════════
// GHOST CAR SYSTEM — multi-ghost capable
// ══════════════════════════════════════════

// ── Ghost mesh factory ──
