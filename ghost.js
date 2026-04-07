const GHOST_COLORS = [0xaaddff, 0xffdd88, 0xff88cc, 0x88ffcc, 0xffaa55, 0xccaaff];
function _makeGhostGroup(colorIdx, plateText=''){
  const col = GHOST_COLORS[colorIdx % GHOST_COLORS.length];
  const g = new THREE.Group();
  const _gM2 = (op,c=col)=>new THREE.MeshLambertMaterial({color:c,transparent:true,opacity:op,depthWrite:false});
  const b=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.58,3.8),_gM2(0.30)); b.position.set(0,0.52,0); g.add(b);
  const c2=new THREE.Mesh(new THREE.BoxGeometry(1.38,0.43,1.75),_gM2(0.22)); c2.position.set(0,0.98,-0.18); g.add(c2);
  const w2=new THREE.Mesh(new THREE.BoxGeometry(1.28,0.34,0.05),_gM2(0.18)); w2.position.set(0,0.96,0.69); g.add(w2);
  const wG=new THREE.CylinderGeometry(0.36,0.36,0.26,14);
  for(const[x,z]of[[-1,-1.3],[1,-1.3],[-1,1.3],[1,1.3]]){
    const wm=new THREE.Mesh(wG,_gM2(0.20,0xaaaaaa)); wm.rotation.z=Math.PI/2; wm.position.set(x,0.36,z); g.add(wm);
  }
  if(plateText){
    const pm=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.26),new THREE.MeshLambertMaterial({map:makePlateTexture(plateText),transparent:false}));
    pm.position.set(0,0.44,-1.92); pm.rotation.y=Math.PI; g.add(pm);
  }
  g.visible=false; scene.add(g); return g;
}

// Single ghost group for realtime/single-load (index 0)
const ghostGroup = _makeGhostGroup(0, playerName);

// ── Ghost state ──
let ghostMode='realtime';   // 'realtime' | 'loaded' | 'multi' | 'off'
let selectedGhostId=null;
let ghostName='BEST LAP';
let ghostLapTime='';    // lap time string shown on floating label
let ghostRec=[];
let ghostBest=[];
let ghostPlay=[];
let ghostActive=false;
let ghostLapT=0;
let _ghostFrameLastTs=0;

// Multi-ghost state
let multiSelectedIds = new Set();   // ids of ghosts selected for multi mode
let _multiGhosts = [];              // [{id,name,frames,group,lapLabel,active,lapT}]

// localStorage helpers
function loadSavedGhosts(){ try{return JSON.parse(localStorage.getItem('sc_ghosts')||'{}');}catch(e){return{};} }
function saveSavedGhosts(o){ localStorage.setItem('sc_ghosts',JSON.stringify(o)); }

// ── Destroy/rebuild multi ghost groups ──
function _clearMultiGhosts(){
  _multiGhosts.forEach(mg=>{ scene.remove(mg.group); if(mg.lapLabel) mg.lapLabel.remove(); });
  _multiGhosts=[];
}
function _buildMultiGhosts(){
  _clearMultiGhosts();
  const ghosts=loadSavedGhosts();
  let ci=0;
  multiSelectedIds.forEach(id=>{
    if(!ghosts[id]) return;
    const g=ghosts[id];
    const group=_makeGhostGroup(ci+1, g.playerName||g.name||'');
    const lbl=document.createElement('div');
    lbl.style.cssText='display:none;position:fixed;pointer-events:none;z-index:10;font-family:\'Courier New\',monospace;font-size:.58rem;font-weight:bold;letter-spacing:.1em;transform:translateX(-50%);white-space:nowrap;text-shadow:0 0 8px rgba(0,0,0,.8);';
    lbl.style.color=`#${GHOST_COLORS[(ci+1)%GHOST_COLORS.length].toString(16).padStart(6,'0')}`;
    document.body.appendChild(lbl);
    _multiGhosts.push({id, name:g.name, lapTime:g.lapTime, frames:g.frames, group, lapLabel:lbl, active:false, lapT:0});
    ci++;
  });
}

// ── Called every physics tick ──
function ghostTick(){
  const t = performance.now()/1000 - car.lapT;
  ghostRec.push({px:car.px, pz:car.pz, h:car.heading, t, rpm:car.rpm, spd:car.vz, vx:car.vx});
}

// ── Called when player crosses SF line ──
function ghostOnLapCross(isNewBest){
  if(isNewBest && ghostRec.length > 10){
    ghostBest = ghostRec.slice();
    ghostLapTime = car.best.toFixed(2)+'s';
    // Auto-save to localStorage immediately on every new best
    const now = new Date();
    const ds  = now.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
    const ts2 = now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    const lapStr = car.best.toFixed(2)+'s';
    const id = 'ghost_'+Date.now();
    const obj = loadSavedGhosts();
    obj[id] = {name:lapStr, lapTime:lapStr, date:ds, time:ts2, playerName:playerName, frames:ghostBest.slice()};
    saveSavedGhosts(obj);
  }
  ghostRec = [];
  // Apply any pending ghost config change queued while mid-lap
  _applyPendingGhost();
  if(ghostMode === 'off'){ ghostGroup.visible=false; return; }
  if(ghostMode === 'realtime'){
    ghostPlay = ghostBest.slice();
    if(ghostPlay.length > 10) _ghostBeginPlayback(ghostGroup, ghostPlay);
  } else if(ghostMode === 'loaded'){
    if(ghostPlay.length < 2) ghostPlay = ghostBest.slice();
    if(ghostPlay.length > 10) _ghostBeginPlayback(ghostGroup, ghostPlay);
  } else if(ghostMode === 'multi'){
    ghostGroup.visible=false; ghostActive=false;
    _multiGhosts.forEach(mg=>{
      mg.active=true; mg.lapT=car.lapT;
      mg.group.visible=true;
      if(mg.frames.length>0){ mg.group.position.set(mg.frames[0].px,0,mg.frames[0].pz); mg.group.rotation.y=mg.frames[0].h; }
    });
  }
}

// ── Begin single ghost playback ──
function _ghostBeginPlayback(group, frames){
  if(frames.length < 2){ group.visible=false; ghostActive=false; return; }
  ghostActive = true;
  ghostLapT   = car.lapT;
  group.visible = true;
  group.position.set(frames[0].px, 0, frames[0].pz);
  group.rotation.y = frames[0].h;
}

// ── Per-frame interpolation helper ──
function _interpGhostGroup(group, frames, elapsed){
  let lo=0, hi=frames.length-1;
  while(lo<hi-1){ const mid=Math.floor((lo+hi)/2); if(frames[mid].t<=elapsed) lo=mid; else hi=mid; }
  const f0=frames[lo], f1=frames[lo+1]||f0;
  if(elapsed > f1.t + 0.5){ group.visible=false; return false; }
  const span=(f1.t-f0.t)||0.001;
  const a=Math.min(1,Math.max(0,(elapsed-f0.t)/span));
  const px=f0.px+(f1.px-f0.px)*a, pz=f0.pz+(f1.pz-f0.pz)*a;
  let dh=f1.h-f0.h;
  if(dh>Math.PI) dh-=Math.PI*2; if(dh<-Math.PI) dh+=Math.PI*2;
  group.position.set(px,0,pz); group.rotation.y=f0.h+dh*a; group.visible=true;
  return {px,pz};
}

// Reusable frustum for ghost POV culling — updated once per frame in ghostFrame
const _ghostFrustum = new THREE.Frustum();
const _ghostProjMat = new THREE.Matrix4();
const _ghostSphere  = new THREE.Sphere();

// ── Called every render frame ──
function ghostFrame(){
  // Don't advance ghost time while paused — menu open means real time keeps
  // ticking but the ghost lap timer should freeze so ghosts don't run ahead
  const isPausedNow = optPanel.classList.contains('open') ||
    document.getElementById('cust-screen').classList.contains('active') ||
    document.getElementById('session-screen').classList.contains('open') ||
    document.getElementById('save-ghost-modal').classList.contains('open');
  const _gfNow = performance.now();
  const _gfDt = (_ghostFrameLastTs > 0) ? (_gfNow - _ghostFrameLastTs) / 1000 : 0;
  _ghostFrameLastTs = _gfNow;
  if(isPausedNow){
    // Advance lap reference times so elapsed stays frozen while menu is open
    ghostLapT += _gfDt;
    _multiGhosts.forEach(mg=>{ mg.lapT += _gfDt; });
  }

  const elapsed = performance.now()/1000 - ghostLapT;

  // Update frustum once per frame for POV culling
  _ghostProjMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _ghostFrustum.setFromProjectionMatrix(_ghostProjMat);

  // Single ghost (realtime / loaded)
  if(ghostMode==='realtime'||ghostMode==='loaded'){
    if(!ghostActive||ghostPlay.length<2){
      ghostGroup.visible=false; document.getElementById('ghost-label').style.display='none';
      GHOST_SND.updateSlot(0, 900, 0, 0, 0, 0, false); return;
    }
    const pos=_interpGhostGroup(ghostGroup, ghostPlay, elapsed);
    if(!pos){
      ghostActive=false; document.getElementById('ghost-label').style.display='none';
      GHOST_SND.updateSlot(0, 900, 0, 0, 0, 0, false); return;
    }
    // Only update label when ghost is in FOV
    _ghostSphere.set(ghostGroup.position, 5);
    if(_ghostFrustum.intersectsSphere(_ghostSphere)){
      _updateGhostLabel(pos.px, pos.pz, document.getElementById('ghost-label'), ghostLapTime||ghostName);
    } else {
      document.getElementById('ghost-label').style.display='none';
    }
    const _gf = _ghostInterpSound(ghostPlay, elapsed);
    GHOST_SND.updateSlot(0, _gf.rpm, _gf.spd, _gf.vx, pos.px, pos.pz, true);
  } else {
    ghostGroup.visible=false; document.getElementById('ghost-label').style.display='none';
    GHOST_SND.updateSlot(0, 900, 0, 0, 0, 0, false);
  }

  // Multi ghosts
  if(ghostMode==='multi'){
    _multiGhosts.forEach((mg,ci)=>{
      if(!mg.active||mg.frames.length<2){
        mg.group.visible=false; if(mg.lapLabel) mg.lapLabel.style.display='none';
        GHOST_SND.updateSlot(ci+1, 900, 0, 0, 0, 0, false); return;
      }
      const me=performance.now()/1000 - mg.lapT;
      const pos=_interpGhostGroup(mg.group, mg.frames, me);
      if(!pos){
        mg.active=false; if(mg.lapLabel) mg.lapLabel.style.display='none';
        GHOST_SND.updateSlot(ci+1, 900, 0, 0, 0, 0, false); return;
      }
      // Label only when in FOV
      if(mg.lapLabel){
        _ghostSphere.set(mg.group.position, 5);
        if(_ghostFrustum.intersectsSphere(_ghostSphere)){
          _updateGhostLabel(pos.px, pos.pz, mg.lapLabel, mg.lapTime);
        } else {
          mg.lapLabel.style.display='none';
        }
      }
      const _gf = _ghostInterpSound(mg.frames, me);
      GHOST_SND.updateSlot(ci+1, _gf.rpm, _gf.spd, _gf.vx, pos.px, pos.pz, true);
    });
  } else {
    _multiGhosts.forEach((mg,ci)=>{ mg.group.visible=false; if(mg.lapLabel) mg.lapLabel.style.display='none'; GHOST_SND.updateSlot(ci+1,900,0,0,0,0,false); });
  }
}

// Interpolate sound values from recorded frames at a given elapsed time
function _ghostInterpSound(frames, elapsed){
  if(!frames||frames.length<2) return {rpm:900,spd:0,vx:0};
  let lo=0, hi=frames.length-1;
  while(lo<hi-1){ const mid=Math.floor((lo+hi)/2); if(frames[mid].t<=elapsed) lo=mid; else hi=mid; }
  const f0=frames[lo], f1=frames[lo+1]||f0;
  const span=(f1.t-f0.t)||0.001;
  const a=Math.min(1,Math.max(0,(elapsed-f0.t)/span));
  return {
    rpm: (f0.rpm||900) + ((f1.rpm||900)-(f0.rpm||900))*a,
    spd: (f0.spd||0)  + ((f1.spd||0) -(f0.spd||0)) *a,
    vx:  (f0.vx||0)   + ((f1.vx||0)  -(f0.vx||0))  *a,
  };
}

function _updateGhostLabel(px,pz,lbl,text){
  const v=new THREE.Vector3(px,2.4,pz);
  v.project(camera);
  const sx=(v.x*0.5+0.5)*window.innerWidth;
  const sy=(-v.y*0.5+0.5)*window.innerHeight;
  if(v.z<1){ lbl.style.display='block'; lbl.style.left=sx+'px'; lbl.style.top=sy+'px'; lbl.textContent=text; }
  else { lbl.style.display='none'; }
}

// ── Mode buttons ──
let _pendingGhostMode = null;
let _pendingGhostId   = null;
let _pendingMultiIds  = null;
function _applyPendingGhost(){ /* no-op — immediate mode, kept for SF hook compat */ }

document.getElementById('btn-ghost-realtime').addEventListener('click',()=>{
  ghostMode='realtime'; ghostPlay=ghostBest.slice(); selectedGhostId=null; ghostName='BEST LAP';
  ghostLapTime=car.best<Infinity?car.best.toFixed(2)+'s':'';
  _updateGhostPlate(ghostGroup, playerName);
  _clearMultiGhosts();
  document.getElementById('ghost-subpanel').classList.remove('open');
  updateGhostUI();
});
document.getElementById('btn-ghost-off').addEventListener('click',()=>{
  ghostMode='off'; ghostActive=false; ghostGroup.visible=false; _clearMultiGhosts();
  GHOST_SND.stopAll();
  document.getElementById('ghost-subpanel').classList.remove('open');
  updateGhostUI();
});
document.getElementById('btn-ghost-load').addEventListener('click',()=>{
  ghostMode='loaded'; _clearMultiGhosts();
  document.getElementById('ghost-subpanel').classList.add('open');
  renderGhostList(); updateGhostUI();
});
document.getElementById('btn-ghost-multi').addEventListener('click',()=>{
  ghostMode='multi'; ghostGroup.visible=false; ghostActive=false;
  document.getElementById('ghost-subpanel').classList.add('open');
  renderGhostListMulti(); updateGhostUI();
});

function updateGhostAction(){
  const btn = document.getElementById('btn-ghost-action');
  const multiRow = document.getElementById('btn-activate-multi-row');
  const activeMode = _pendingGhostMode || ghostMode;
  // Save button is always gold — always visible for saving
  btn.textContent='💾 SAVE BEST LAP GHOST';
  btn.style.background='rgba(240,192,64,.12)';
  btn.style.border='1px solid rgba(240,192,64,.35)';
  btn.style.color='#f0c040';
  // Show ACTIVATE MULTI button only when multi tab/list is open
  const listHasMulti = !!document.querySelector('.ghost-multi-entry');
  if(multiRow) multiRow.style.display = listHasMulti ? '' : 'none';
}

function updateGhostUI(){
  const isOff=ghostMode==='off';
  const offBtn=document.getElementById('btn-ghost-off');
  offBtn.textContent=isOff?'OFF':'ON';
  offBtn.style.background=isOff?'rgba(255,50,50,.18)':'rgba(48,224,96,.15)';
  offBtn.style.border=isOff?'1px solid rgba(255,50,50,.5)':'1px solid #30e060';
  offBtn.style.color=isOff?'#ff5555':'#30e060'; offBtn.style.opacity='1';
  document.getElementById('btn-ghost-realtime').style.opacity=ghostMode==='realtime'?'1':'0.45';
  document.getElementById('btn-ghost-load').style.opacity=ghostMode==='loaded'?'1':'0.45';
  document.getElementById('btn-ghost-multi').style.opacity=ghostMode==='multi'?'1':'0.45';
  const lbl=document.getElementById('ghost-status-lbl');
  lbl.textContent=ghostMode==='realtime'?'Real-time: shows your best lap ghost':
                  ghostMode==='off'?'Ghost car is off':
                  ghostMode==='multi'?'Multi: race against multiple saved ghosts':
                  'Loaded ghost from saved laps';
  updateGhostAction();
}

function renderGhostList(){
  const list=document.getElementById('ghost-saved-list');
  const ghosts=loadSavedGhosts();
  list.innerHTML=''; const keys=Object.keys(ghosts);
  if(!keys.length){ list.innerHTML='<div style="color:#444;font-size:.6rem;padding:8px 0;letter-spacing:.08em;">No saved ghosts yet</div>'; updateGhostAction(); return; }

  const table=document.createElement('table');
  table.className='ghost-table';
  table.innerHTML='<thead><tr><th>NAME</th><th>TIME</th><th>DATE</th><th></th></tr></thead>';
  const tbody=document.createElement('tbody');

  // Sort by lapTime ascending
  const sorted=keys.map(id=>({id,...ghosts[id]})).sort((a,b)=>(parseFloat(a.lapTime)||999)-(parseFloat(b.lapTime)||999));

  sorted.forEach(g=>{
    const tr=document.createElement('tr');
    tr.className='ghost-table-row'+(g.id===selectedGhostId?' ghost-table-selected':'');
    const dateStr = g.date||'—';
    const timeStr = g.time||'—';
    tr.innerHTML=`<td class="gt-name">${g.name||g.lapTime}</td><td class="gt-time">${g.lapTime}</td><td class="gt-date">${dateStr}</td>`;
    const delTd=document.createElement('td');
    const del=document.createElement('button'); del.className='ghost-entry-del'; del.textContent='✕';
    del.addEventListener('click',e=>{
      e.stopPropagation();
      const o=loadSavedGhosts(); delete o[g.id]; saveSavedGhosts(o);
      if(selectedGhostId===g.id) selectedGhostId=null;
      renderGhostList();
    });
    delTd.appendChild(del); tr.appendChild(delTd);
    tr.addEventListener('click',()=>{
      selectedGhostId=g.id; ghostName=g.name||g.lapTime; ghostLapTime=g.lapTime; ghostPlay=g.frames.slice();
      updateGhostAction();
      tbody.querySelectorAll('.ghost-table-row').forEach(r=>r.classList.remove('ghost-table-selected'));
      tr.classList.add('ghost-table-selected');
      document.getElementById('ghost-status-lbl').textContent='Tap ▶ LOAD GHOST to race with this ghost';
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  list.appendChild(table);
  updateGhostAction();
}

function renderGhostListMulti(){
  const list=document.getElementById('ghost-saved-list');
  const ghosts=loadSavedGhosts(); list.innerHTML='';
  const keys=Object.keys(ghosts);
  if(!keys.length){ list.innerHTML='<div style="color:#444;font-size:.6rem;padding:4px;">No saved ghosts yet</div>'; return; }
  // ALL button row
  const allRow=document.createElement('div');
  allRow.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';
  const allSel=keys.every(id=>multiSelectedIds.has(id));
  allRow.innerHTML=`<span style="font-family:'Courier New',monospace;font-size:.58rem;letter-spacing:.08em;color:#aaa;">SELECT ALL</span>`;
  const allBtn=document.createElement('button');
  allBtn.textContent=allSel?'DESELECT ALL':'ALL';
  allBtn.style.cssText='font-family:\'Courier New\',monospace;font-size:.55rem;letter-spacing:.08em;padding:4px 10px;border-radius:5px;cursor:pointer;background:rgba(48,224,96,.15);border:1px solid #30e060;color:#30e060;';
  allBtn.addEventListener('click',()=>{
    if(keys.every(id=>multiSelectedIds.has(id))){ multiSelectedIds.clear(); } else { keys.forEach(id=>multiSelectedIds.add(id)); }
    renderGhostListMulti();
  });
  allRow.appendChild(allBtn); list.appendChild(allRow);

  keys.forEach((id,idx)=>{
    const g=ghosts[id]; const sel=multiSelectedIds.has(id);
    const row=document.createElement('div'); row.className='ghost-multi-entry'+(sel?' selected':'');
    const col=GHOST_COLORS[(idx+1)%GHOST_COLORS.length];
    const colHex='#'+col.toString(16).padStart(6,'0');
    row.innerHTML=`<div class="ghost-multi-check">${sel?'✓':''}</div><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><span style="color:${colHex};margin-right:4px;">●</span>${g.name}</span><span style="color:#555;font-size:.55rem;margin-left:4px;">${g.lapTime}</span>`;
    const del=document.createElement('button'); del.className='ghost-multi-entry-del'; del.textContent='✕';
    del.addEventListener('click',e=>{ e.stopPropagation(); const o=loadSavedGhosts(); delete o[id]; saveSavedGhosts(o); multiSelectedIds.delete(id); renderGhostListMulti(); });
    row.appendChild(del);
    row.addEventListener('click',()=>{
      if(multiSelectedIds.has(id)) multiSelectedIds.delete(id); else multiSelectedIds.add(id);
      renderGhostListMulti();
    });
    list.appendChild(row);
  });
  document.getElementById('ghost-status-lbl').textContent=multiSelectedIds.size+' ghost'+(multiSelectedIds.size===1?'':'s')+' selected';
  updateGhostAction();
}

function _updateLoadBtn(hasSelection){ updateGhostAction(); }

// Ghost action button
function _updateGhostPlate(group, text){
  // Remove old plate mesh if present
  const old = group.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry');
  if(old){ group.remove(old); old.geometry.dispose(); old.material.dispose(); }
  if(text){
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.26), new THREE.MeshLambertMaterial({map:makePlateTexture(text),transparent:false}));
    pm.position.set(0,0.44,-1.92); pm.rotation.y=Math.PI; group.add(pm);
  }
}

document.getElementById('btn-ghost-action').addEventListener('click',()=>{
  if(ghostBest.length<10){ document.getElementById('ghost-status-lbl').textContent='No best lap recorded yet!'; return; }
  openSaveGhostModal(null);
});

function openSaveGhostModal(onDiscard, fromEndSession){
  const lapStr=car.best<Infinity?car.best.toFixed(2)+'s':'--';
  document.getElementById('save-ghost-time').textContent='Best lap: '+lapStr;
  document.getElementById('save-ghost-input').value='';
  document.getElementById('save-ghost-modal').classList.add('open');
  document.getElementById('btn-sg-save')._onDiscard=onDiscard;
  document.getElementById('btn-sg-discard')._onDiscard=onDiscard;
  document.getElementById('btn-sg-discard')._fromEnd=!!fromEndSession;
  document.getElementById('btn-sg-save')._fromEnd=!!fromEndSession;
}

document.getElementById('btn-sg-save').addEventListener('click',()=>{
  const now = new Date();
  const ds  = now.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
  const ts2 = now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const lapStr=car.best<Infinity?car.best.toFixed(2)+'s':'--';
  const raw=document.getElementById('save-ghost-input').value.trim().toUpperCase();
  const name = raw || lapStr;
  const id='ghost_'+Date.now();
  const obj=loadSavedGhosts();
  obj[id]={name, lapTime:lapStr, date:ds, time:ts2, playerName:playerName, frames:ghostBest.slice()};
  saveSavedGhosts(obj);
  document.getElementById('save-ghost-modal').classList.remove('open');
  document.getElementById('btn-start').style.display='';
  const cb=document.getElementById('btn-sg-save')._onDiscard;
  if(cb) cb();
});
document.getElementById('btn-sg-discard').addEventListener('click',()=>{
  const fromEnd = document.getElementById('btn-sg-discard')._fromEnd;
  document.getElementById('save-ghost-modal').classList.remove('open');
  document.getElementById('btn-start').style.display='';
  const cb=document.getElementById('btn-sg-discard')._onDiscard;
  if(fromEnd){
    // cancelled end-session → resume with countdown
    lastTime=null;
    startCountdown(()=>{ lastTime=null; });
  } else {
    if(cb) cb();
  }
});

