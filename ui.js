// ══════════════════════════════════════════
// BACK TO START MENU — prompt save if unsaved best lap
// ══════════════════════════════════════════
document.getElementById('btn-back-start').addEventListener('click',()=>{
  _closeOptionsPanel();
  const hasBest=ghostBest.length>10&&car.best<Infinity;
  const alreadySaved=false; // always prompt if unsaved best exists
  const goBack=()=>{
    document.getElementById('btn-start').style.display='';
    // Full car reset so no stale lap times carry over
    car.lap=0; car.lapT=0; car.best=Infinity; car.lastLapTime=0;
    car.lapPenalty=0; car.lapDirty=false; car.sectors=[false,false,false];
    showRespawnPrompt(false);
    car.sfCrossedWrong=false; car.lapProgress=0;
    car.speed=0; car.vz=0; car.vx=0; car.av=0; car.steer=0; car.ciPrev=0;
    // Reset ghost
    ghostRec=[]; ghostBest=[]; ghostPlay=[];
    ghostActive=false; ghostGroup.visible=false; _clearMultiGhosts(); multiSelectedIds.clear();
    selectedGhostId=null;
    lastTime=null;
    document.body.classList.add('pre-start');
  };
  if(hasBest&&!alreadySaved){
    openSaveGhostModal(goBack);
  } else {
    goBack();
  }
});

// ══════════════════════════════════════════
// PANEL TABS — Options / Leaderboard
// ══════════════════════════════════════════
const TAB_ORDER=['general','ghost','sensitivity','controls','leaderboard','sound','log'];
let currentTab='general';

function switchTab(tab){
  currentTab=tab;
  document.querySelectorAll('.opt-tab').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.opt-page').forEach(el=>el.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  document.getElementById('page-'+tab).classList.add('active');
  // Update label above tabs
  const lbl=document.getElementById('opt-tab-label');
  if(lbl) lbl.textContent=tab.toUpperCase();
  // Scroll active tab into view
  const activeEl=document.getElementById('tab-'+tab);
  if(activeEl) activeEl.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  if(tab==='leaderboard'){ switchLBTab(currentLBTab||'ghost'); }
}

document.getElementById('tab-general').addEventListener('click',()=>switchTab('general'));
document.getElementById('tab-ghost').addEventListener('click',()=>switchTab('ghost'));
document.getElementById('tab-sensitivity').addEventListener('click',()=>switchTab('sensitivity'));
document.getElementById('tab-controls').addEventListener('click',()=>switchTab('controls'));
document.getElementById('tab-leaderboard').addEventListener('click',()=>switchTab('leaderboard'));
document.getElementById('tab-sound').addEventListener('click',()=>switchTab('sound'));
document.getElementById('tab-log').addEventListener('click',()=>switchTab('log'));

// ── GOTO GHOST shortcut from General tab ──
document.getElementById('btn-goto-ghost').addEventListener('click',()=>switchTab('ghost'));

// ── GHOST VOLUME sliders — both Ghost tab and Sound tab control GHOST_SND MAX_VOL ──
let _ghostVolMul = 0.7; // default 7/10
function _setGhostVol(v){
  _ghostVolMul = v;
  // sync both sliders
  const s1 = document.getElementById('sl-snd-ghost');
  const s2 = document.getElementById('sl-snd-ghost-sound');
  const val = Math.round(v * 10);
  if(s1) { s1.value = val; document.getElementById('lbl-snd-ghost').textContent = val; }
  if(s2) { s2.value = val; document.getElementById('lbl-snd-ghost-sound').textContent = val; }
}
function _wireGhostSlider(slId, lblId){
  const sl = document.getElementById(slId);
  const lb = document.getElementById(lblId);
  if(!sl||!lb) return;
  sl.addEventListener('input', e => {
    e.stopPropagation();
    _ghostVolMul = +sl.value / 10;
    lb.textContent = sl.value;
    // keep the other slider in sync
    const other = slId === 'sl-snd-ghost' ? 'sl-snd-ghost-sound' : 'sl-snd-ghost';
    const otherLbl = slId === 'sl-snd-ghost' ? 'lbl-snd-ghost-sound' : 'lbl-snd-ghost';
    const otherEl = document.getElementById(other);
    const otherLblEl = document.getElementById(otherLbl);
    if(otherEl) otherEl.value = sl.value;
    if(otherLblEl) otherLblEl.textContent = sl.value;
  });
  sl.addEventListener('touchstart', e => e.stopPropagation(), {passive:true});
  sl.addEventListener('touchmove',  e => e.stopPropagation(), {passive:true});
  sl.addEventListener('touchend',   e => e.stopPropagation(), {passive:true});
}
_wireGhostSlider('sl-snd-ghost', 'lbl-snd-ghost');
_wireGhostSlider('sl-snd-ghost-sound', 'lbl-snd-ghost-sound');
(function(){
  const tabs=document.getElementById('opt-tabs');
  const hint=document.getElementById('opt-tabs-hint');
  const hintLeft=document.getElementById('opt-tabs-hint-left');
  if(!tabs||!hint) return;
  tabs.addEventListener('scroll',()=>{
    const scrolled=tabs.scrollLeft > 8;
    const atEnd=tabs.scrollLeft+tabs.clientWidth >= tabs.scrollWidth-8;
    hint.style.opacity = atEnd ? '0' : scrolled ? '0.5' : '1';
    if(hintLeft) hintLeft.style.opacity = scrolled ? '1' : '0';
  },{passive:true});
})();

// ── SOUND SETTINGS ──────────────────────────────
let _sndOn = true;
document.getElementById('snd-master-btn').addEventListener('click', () => {
  _sndOn = !_sndOn;
  SND.setMute(!_sndOn);
  const btn = document.getElementById('snd-master-btn');
  btn.textContent = _sndOn ? 'ON' : 'OFF';
  btn.classList.toggle('active', _sndOn);
  // grey out sliders when off
  document.querySelectorAll('.snd-slider').forEach(s => s.disabled = !_sndOn);
});

[
  ['sl-snd-engine',  'lbl-snd-engine',  'engine'],
  ['sl-snd-cyl',     'lbl-snd-cyl',     'cyl'],
  ['sl-snd-growl',   'lbl-snd-growl',   'growl'],
  ['sl-snd-harm',    'lbl-snd-harm',    'harm'],
  ['sl-snd-scream',  'lbl-snd-scream',  'scream'],
  ['sl-snd-exhaust', 'lbl-snd-exhaust', 'exhaust'],
  ['sl-snd-rasp',    'lbl-snd-rasp',    'rasp'],
  ['sl-snd-bass',    'lbl-snd-bass',    'bass'],
  ['sl-snd-blip',    'lbl-snd-blip',    'blip'],
  ['sl-snd-burble',  'lbl-snd-burble',  'burble'],
  ['sl-snd-crash',   'lbl-snd-crash',   'crash'],
  ['sl-snd-tyre',    'lbl-snd-tyre',    'tyre'],
  ['sl-snd-hb',      'lbl-snd-hb',      'hb'],
  ['sl-snd-hiss',    'lbl-snd-hiss',    'hiss'],
].filter(([slId])=>document.getElementById(slId)).forEach(([slId, lblId, channel]) => {
  const sl = document.getElementById(slId);
  const lb = document.getElementById(lblId);
  if(!sl||!lb) return;
  sl.addEventListener('input', e => {
    e.stopPropagation();
    const v = +sl.value / 10;
    lb.textContent = sl.value;
    SND.setVol(channel, v);
  });
  sl.addEventListener('touchstart', e => e.stopPropagation(), {passive:true});
  sl.addEventListener('touchmove',  e => e.stopPropagation(), {passive:true});
  sl.addEventListener('touchend',   e => e.stopPropagation(), {passive:true});
});


// Swipe left/right through tabs
(function(){
  let tx=0;
  const panel=document.getElementById('opt-panel');
  panel.addEventListener('touchstart',e=>{ tx=e.touches[0].clientX; },{passive:true});
  panel.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-tx;
    if(Math.abs(dx)>50){
      const i=TAB_ORDER.indexOf(currentTab);
      if(dx<0 && i<TAB_ORDER.length-1) switchTab(TAB_ORDER[i+1]);
      if(dx>0 && i>0)                  switchTab(TAB_ORDER[i-1]);
    }
  },{passive:true});
})();

// Render leaderboard from saved ghosts sorted by lapTime
function renderLeaderboard(){
  const ghosts=loadSavedGhosts();
  const tbody=document.getElementById('lb-body');
  const empty=document.getElementById('lb-empty');
  tbody.innerHTML='';
  const entries=Object.values(ghosts)
    .map(g=>({name:g.name, timeStr:g.lapTime, secs:parseFloat(g.lapTime)||Infinity}))
    .sort((a,b)=>a.secs-b.secs);
  if(!entries.length){
    empty.style.display='block';
    document.getElementById('lb-table').style.display='none';
    return;
  }
  empty.style.display='none';
  document.getElementById('lb-table').style.display='';
  const medals=['🥇','🥈','🥉'];
  entries.forEach((e,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="lb-rank">${medals[i]||'#'+(i+1)}</td>`+
                 `<td>${e.name}</td>`+
                 `<td style="text-align:right;color:${i===0?'#f0c040':i===1?'#aaa':i===2?'#c87020':'#ccc'}">${e.timeStr}</td>`;
    tbody.appendChild(tr);
  });
}

// Wire leaderboard page close/back buttons

// Reset tab to options when panel opens
const _origOptOpen = document.getElementById('btn-options');
_origOptOpen.addEventListener('click',()=>{ switchTab('general'); }, true);
document.getElementById('btn-pre-settings').addEventListener('click',()=>{ switchTab('general'); }, true);

// ══════════════════════════════════════════
// RESPAWN SYSTEM
// ══════════════════════════════════════════
function showRespawnPrompt(show){
  document.getElementById('respawn-btn').classList.toggle('active', show);
}

function doRespawn(){
  const idx=car.respawnIdx;
  const cp=CENTRE[idx];
  const t=tangentAt(idx);
  // Place car at track centre at impact point, facing track direction
  car.px=cp.x; car.pz=cp.y;
  car.heading=Math.atan2(t.tx,t.tz);
  car.speed=0; car.vz=0; car.vx=0; car.av=0; car.steer=0;
  car.oversteer=false; car.understeer=false; car.spinning=false; car.gearJustShifted=null;
  car.barrierHit=false; car._sfSmooth=0; car._hbGrip=1.0; car._dftWasOn=false; car._dftLockedVz=0; car._dftGripTimer=0; setDrift(false);
  showRespawnPrompt(false);
  _clearMarks();
}

// Back to start/finish line — keeps lap count and timer running, just teleports position
function doBackToStartLine(){
  const sf = CENTRE[0];
  const t  = tangentAt(0);
  const _sfB = 8; // metres behind SF line
  car.px = sf.x - t.tx * _sfB;
  car.pz = sf.y - t.tz * _sfB;
  car.heading = Math.atan2(t.tx, t.tz);
  car.speed=0; car.vz=0; car.vx=0; car.av=0; car.steer=0;
  car.oversteer=false; car.understeer=false; car.spinning=false; car.gearJustShifted=null;
  car.barrierHit=false; car._sfSmooth=0; car._hbGrip=1.0; car._dftWasOn=false; car._dftLockedVz=0; car._dftGripTimer=0; setDrift(false);
  showRespawnPrompt(false);
  _clearMarks();
  // Mark lap dirty so this lap doesn't count as a clean time
  car.lapDirty=true;
  addPenalty(0, 'BACK TO START');
}

document.getElementById('respawn-btn').addEventListener('click', doRespawn);
document.getElementById('respawn-btn').addEventListener('touchstart', e=>{
  e.preventDefault(); doRespawn();
},{passive:false});

// Extra close/back buttons on sensitivity, controls pages
['btn-close-sens','btn-close-sens-top','btn-close-ctrl'].forEach(id=>{
  const el=document.getElementById(id); if(el) el.addEventListener('click', _closeOptionsPanel);
});

// ══════════════════════════════════════════
// PLAYER LEADERBOARD (localStorage)
// ══════════════════════════════════════════
function loadPlayerLB(){ try{return JSON.parse(localStorage.getItem('sc_player_lb')||'[]');}catch(e){return[];} }
function savePlayerLB(arr){ localStorage.setItem('sc_player_lb',JSON.stringify(arr)); }

function addPlayerLBEntry(bestSecs, totalLaps, totalPenalty){
  const arr = loadPlayerLB();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const timeStr = now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  arr.push({ bestSecs, bestStr: bestSecs.toFixed(2)+'s', laps: totalLaps,
             penalty: totalPenalty.toFixed(1)+'s', date: dateStr, time: timeStr });
  arr.sort((a,b)=>a.bestSecs-b.bestSecs);
  savePlayerLB(arr);
}

function renderPlayerLB(){
  const arr=loadPlayerLB();
  const tbody=document.getElementById('lb-player-body');
  const empty=document.getElementById('lb-player-empty');
  const table=document.getElementById('lb-player-table');
  tbody.innerHTML='';
  if(!arr.length){ empty.style.display='block'; table.style.display='none'; return; }
  empty.style.display='none'; table.style.display='';
  const medals=['🥇','🥈','🥉'];
  arr.forEach((e,i)=>{
    const tr=document.createElement('tr');
    const col=i===0?'#f0c040':i===1?'#aaa':i===2?'#c87020':'#ccc';
    tr.innerHTML=`<td class="lb-rank">${medals[i]||'#'+(i+1)}</td>`+
      `<td style="font-size:.6rem;color:#aaa;padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);">${e.date} ${e.time}<br><span style="color:#555;font-size:.56rem;">${e.laps} laps · ${e.penalty} penalty</span></td>`+
      `<td style="text-align:right;color:${col};font-size:.68rem;padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);font-family:'Courier New',monospace;">${e.bestStr}</td>`;
    tbody.appendChild(tr);
  });
}

// ── LB sub-tab switching ──
let currentLBTab='ghost';
function switchLBTab(tab){
  currentLBTab=tab;
  document.querySelectorAll('.lb-subtab').forEach(el=>el.classList.remove('active'));
  document.getElementById('lbsub-'+tab).classList.add('active');
  document.getElementById('lb-ghost-panel').style.display  = tab==='ghost'?'':'none';
  document.getElementById('lb-player-panel').style.display = tab==='player'?'':'none';
  if(tab==='ghost')  renderLeaderboard();
  if(tab==='player') renderPlayerLB();
}
document.getElementById('lbsub-ghost').addEventListener('click',()=>switchLBTab('ghost'));
document.getElementById('lbsub-player').addEventListener('click',()=>switchLBTab('player'));

// Override renderLeaderboard hook to also handle sub-tab
const _origRenderLB = renderLeaderboard;
// (renderLeaderboard already defined — calling switchLBTab will trigger it)

// ══════════════════════════════════════════
// BACK TO START LINE BUTTON (in General tab)
// ══════════════════════════════════════════
document.getElementById('btn-respawn-manual').addEventListener('click',()=>{
  _closeOptionsPanel();
  doBackToStartLine();
});

// ══════════════════════════════════════════
// SESSION TRACKING
// ══════════════════════════════════════════
let sessionTotalPenalty = 0;  // accumulates all penalties this session

// ══════════════════════════════════════════
// END SESSION
// ══════════════════════════════════════════
function openSessionScreen(){
  const laps = Math.max(0, car.lap - 1);
  const best = car.best < Infinity ? car.best.toFixed(2)+'s' : '--';
  const now  = new Date();
  document.getElementById('sess-laps').textContent = laps;
  document.getElementById('sess-best').textContent = best;
  document.getElementById('sess-pen').textContent  = sessionTotalPenalty.toFixed(1)+'s';
  document.getElementById('sess-drift-dist').textContent = _sessionBestDriftDist > 0 ? Math.round(_sessionBestDriftDist)+'m' : '—';
  document.getElementById('sess-drift-time').textContent = _sessionBestDriftTime > 0 ? _sessionBestDriftTime.toFixed(1)+'s' : '—';
  document.getElementById('sess-date').textContent = now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  document.getElementById('sess-time').textContent = now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  // Save to player leaderboard if we have a best
  if(car.best < Infinity) addPlayerLBEntry(car.best, laps, sessionTotalPenalty);
  document.getElementById('session-screen').classList.add('open');
}

function doEndSession(){
  _closeOptionsPanel();
  lastTime = null; // pause by letting isPaused (session-screen/modal) block physics
  const hasBest = ghostBest.length > 10 && car.best < Infinity;
  const autoOn  = autoSaveEnabled;

  if(hasBest && autoOn){
    // Auto-save: no prompt, save immediately with date+time+laptime name
    const now = new Date();
    const ds  = now.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
    const ts2 = now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    const lapStr = car.best.toFixed(2)+'s';
    const id     = 'ghost_'+Date.now();
    const obj    = loadSavedGhosts();
    obj[id]      = {name:lapStr, lapTime:lapStr, date:ds, time:ts2, playerName:playerName, frames:ghostBest.slice()};
    saveSavedGhosts(obj);
    openSessionScreen();
  } else if(hasBest && !autoOn){
    // Manual: show save prompt, then session screen
    openSaveGhostModal(()=>{ openSessionScreen(); }, true);
  } else {
    openSessionScreen();
  }
}

document.getElementById('btn-end-session').addEventListener('click', doEndSession);

// Session screen buttons
document.getElementById('btn-new-session').addEventListener('click',()=>{
  document.getElementById('session-screen').classList.remove('open');
  // Reset handbrake
  hbOn=false; hbBtn.classList.remove('on'); hbBtn.textContent='HANDBRAKE';
  // Full reset — position back to start line
  { const _rs=CENTRE[0],_rt=tangentAt(0); const _sfB3=8; car.px=_rs.x-_rt.tx*_sfB3; car.pz=_rs.y-_rt.tz*_sfB3; car.heading=Math.atan2(_rt.tx,_rt.tz); carGroup.position.set(car.px,0,car.pz); carGroup.rotation.y=car.heading; }
  car.lap=0; car.lapT=0; car.best=Infinity; car.lastLapTime=0;
  car.lapPenalty=0; car.lapDirty=false; car.sectors=[false,false,false];
  car.sfCrossedWrong=false; car.lapProgress=0; car.speed=0; car.vz=0; car.vx=0; car.av=0; car.steer=0; car.ciPrev=0;
  sessionTotalPenalty=0;
  ghostRec=[]; ghostBest=[]; ghostPlay=[];
  ghostActive=false; ghostGroup.visible=false; _clearMultiGhosts(); multiSelectedIds.clear(); selectedGhostId=null; _clearMultiGhosts(); multiSelectedIds.clear();
  document.getElementById('ghost-label').style.display='none';
  showRespawnPrompt(false);
  document.getElementById('btn-start').style.display='';
  lastTime=null;
  document.body.classList.add('pre-start');
});

document.getElementById('btn-session-back').addEventListener('click',()=>{
  document.getElementById('session-screen').classList.remove('open');
  hbOn=false; hbBtn.classList.remove('on'); hbBtn.textContent='HANDBRAKE';
  { const _rs=CENTRE[0],_rt=tangentAt(0); const _sfB3=8; car.px=_rs.x-_rt.tx*_sfB3; car.pz=_rs.y-_rt.tz*_sfB3; car.heading=Math.atan2(_rt.tx,_rt.tz); carGroup.position.set(car.px,0,car.pz); carGroup.rotation.y=car.heading; }
  car.lap=0; car.lapT=0; car.best=Infinity; car.lastLapTime=0;
  car.lapPenalty=0; car.lapDirty=false; car.sectors=[false,false,false];
  car.sfCrossedWrong=false; car.lapProgress=0; car.speed=0; car.vz=0; car.vx=0; car.av=0; car.steer=0; car.ciPrev=0;
  sessionTotalPenalty=0;
  ghostRec=[]; ghostBest=[]; ghostPlay=[];
  ghostActive=false; ghostGroup.visible=false; _clearMultiGhosts(); multiSelectedIds.clear(); selectedGhostId=null; _clearMultiGhosts(); multiSelectedIds.clear();
  document.getElementById('ghost-label').style.display='none';
  showRespawnPrompt(false);
  document.getElementById('btn-start').style.display='';
  lastTime=null;
  document.body.classList.add('pre-start');
});


// ── AUTO-SAVE GHOST ──
let autoSaveEnabled = true;
document.getElementById('btn-autosave-toggle').addEventListener('click',()=>{
  autoSaveEnabled = !autoSaveEnabled;
  const btn = document.getElementById('btn-autosave-toggle');
  if(autoSaveEnabled){
    btn.textContent='ON';
    btn.style.background='rgba(48,224,96,.15)';
    btn.style.border='1px solid #30e060';
    btn.style.color='#30e060';
  } else {
    btn.textContent='OFF';
    btn.style.background='rgba(255,80,80,.12)';
    btn.style.border='1px solid rgba(255,80,80,.4)';
    btn.style.color='#ff6666';
  }
});


// ── ACTIVATE MULTI button ──
document.getElementById('btn-activate-multi').addEventListener('click',()=>{
  if(multiSelectedIds.size===0){ document.getElementById('ghost-status-lbl').textContent='Select at least one ghost first'; return; }
  _buildMultiGhosts();
  document.getElementById('ghost-subpanel').classList.remove('open'); _closeOptionsPanel();
  updateGhostUI();
});

// ══════════════════════════════════════════
// GAME LOGGER SYSTEM
// ══════════════════════════════════════════
const LOGGER = (()=>{
  let _entries = [];
  let _startTime = null;
  let _active = false;
  let _lastLap = 0;
  let _lastPenaltyTotal = 0;
  let _wrongWayLogged = false;
  let _hbLogged = false;
  let _dftLogged = false;
  let _dftOnTime = 0;

  // State trackers — log on change, not every frame
  let _brkWas = false;
  let _steerDir = 0;          // -1 left, 0 neutral, 1 right
  let _slideWas = false;
  let _oversteerWas = false;
  let _understeerWas = false;
  let _spinWas = false;
  let _lastGearLogged = 0;
  let _lastSpeedBracket = -1; // brackets of 30 km/h
  let _lastRpmBracket = -1;   // brackets of 1000 RPM
  let _lastBrakeLog = 0;
  let _lastSteerLog = 0;

  function _ts(){
    if(_startTime === null) return '00:00.0';
    const e = (performance.now() - _startTime) / 1000;
    const m = Math.floor(e / 60);
    const s = (e % 60).toFixed(1);
    return String(m).padStart(2,'0') + ':' + s.padStart(4,'0');
  }

  function _push(type, msg){
    const ts = _ts();
    _entries.push({ts, type, msg});
    _render(ts, type, msg);
  }

  function _render(ts, type, msg){
    const box = document.getElementById('log-entries');
    if(!box) return;
    const empty = document.getElementById('log-empty');
    if(empty) empty.style.display = 'none';
    const row = document.createElement('div');
    row.className = 'log-entry log-' + type;
    row.innerHTML = '<span class="log-time">' + ts + '</span><span class="log-msg">' + msg + '</span>';
    box.appendChild(row);
    const scrollBox = document.getElementById('log-box');
    if(scrollBox) scrollBox.scrollTop = scrollBox.scrollHeight;
  }

  function start(){
    _entries = [];
    _startTime = performance.now();
    _active = true;
    _lastLap = 0;
    _lastPenaltyTotal = 0;
    _wrongWayLogged = false;
    _hbLogged = false;
    _dftLogged = false;
    _brkWas = false;
    _steerDir = 0;
    _slideWas = false;
    _oversteerWas = false;
    _understeerWas = false;
    _spinWas = false;
    _lastGearLogged = 0;
    _lastSpeedBracket = -1;
    _lastRpmBracket = -1;
    _lastBrakeLog = 0;
    _lastSteerLog = 0;
    const box = document.getElementById('log-entries');
    if(box) box.innerHTML = '';
    const empty = document.getElementById('log-empty');
    if(empty) empty.style.display = 'none';
    _push('start', '▶ SESSION STARTED');
  }

  function stop(){
    if(!_active) return;
    _push('info', '⏹ SESSION ENDED — ' + _entries.filter(e=>e.type==='lap'||e.type==='best').length + ' laps completed');
    _active = false;
  }

  function _spdKmh(){ return Math.abs(car.speed * 3.6); }
  function _stateStr(){
    // Compact live state: speed / gear / RPM
    return Math.round(_spdKmh()) + 'km/h · G' + (car.reversing?'R':car.gear) + ' · ' + Math.round(car.rpm/100)*100 + 'rpm';
  }

  function tick(){
    if(!_active) return;
    const now = performance.now();

    // ── Lap completion ──
    if(car.lap > _lastLap){
      if(car.lap > 1){
        const lapNum = car.lap - 1;
        const lapTime = car.lastLapTime;
        const isBest = car.best < Infinity && Math.abs(lapTime - car.best) < 0.005;
        const penStr = car.lapPenalty > 0 ? ' (incl. +' + car.lapPenalty.toFixed(2) + 's penalty)' : '';
        if(isBest){
          _push('best', '★ LAP ' + lapNum + ' — NEW BEST: ' + lapTime.toFixed(2) + 's' + penStr);
        } else {
          _push('lap', '◉ LAP ' + lapNum + ' — ' + lapTime.toFixed(2) + 's' + penStr);
        }
      } else {
        _push('start', '◉ LAP 1 STARTED');
      }
      _lastLap = car.lap;
      _lastPenaltyTotal = 0;
      // Reset speed/RPM brackets so they re-log fresh each lap
      _lastSpeedBracket = -1;
      _lastRpmBracket = -1;
    }

    // ── Gear shift ──
    if(car.gearJustShifted){
      const arrow = car.gearJustShifted === 'up' ? '↑' : '↓';
      _push('gear', arrow + ' GEAR ' + car.gear + ' @ ' + Math.round(car.rpm) + 'rpm  · ' + Math.round(_spdKmh()) + 'km/h');
    }

    // ── Braking: log on press and release ──
    const brkNow = (P.B || P.KeyS || P.ArrowDown) ? true : false;
    if(brkNow && !_brkWas){
      _push('info', '⬛ BRAKE ON  — ' + _stateStr());
      _lastBrakeLog = now;
    }
    if(!brkNow && _brkWas){
      _push('info', '⬜ BRAKE OFF — ' + _stateStr());
    }
    _brkWas = brkNow;

    // ── Steering: suppress during oversteer/drift (redundant noise) ──
    const rawSteer = (P.L||P.KeyA||P.ArrowLeft) ? -1 : (P.R||P.KeyD||P.ArrowRight) ? 1 : 0;
    if(rawSteer !== _steerDir && (now - _lastSteerLog) > 120 && !car.oversteer && !driftOn){
      if(rawSteer === -1)      _push('info', '◀ STEER LEFT  — ' + _stateStr());
      else if(rawSteer === 1)  _push('info', '▶ STEER RIGHT — ' + _stateStr());
      else                     _push('info', '— STEER CENTER — ' + _stateStr());
      _steerDir = rawSteer;
      _lastSteerLog = now;
    }

    // ── Speed bracket (every 60 km/h) ──
    const spdBracket = Math.floor(_spdKmh() / 60);
    if(spdBracket !== _lastSpeedBracket && _spdKmh() > 5){
      _push('info', '⚡ ' + (spdBracket * 60) + '+ km/h · G' + (car.reversing?'R':car.gear) + ' · ' + Math.round(car.rpm/100)*100 + 'rpm');
      _lastSpeedBracket = spdBracket;
    }

    // ── RPM bracket (every 2000 rpm — less noise) ──
    const rpmBracket = Math.floor(car.rpm / 2000);
    if(rpmBracket !== _lastRpmBracket && car.rpm > 2000){
      _push('info', '🔴 ' + (rpmBracket * 2000) + '+rpm · G' + (car.reversing?'R':car.gear) + ' · ' + Math.round(_spdKmh()) + 'km/h');
      _lastRpmBracket = rpmBracket;
    }

    // ── Oversteer (weight shifts to front, rear slides out) ──
    if(car.oversteer && !_oversteerWas){
      _push('penalty', '↗ OVERSTEER — rear stepping out  · ' + _stateStr());
    }
    if(!car.oversteer && _oversteerWas){
      _push('info', '✓ OVERSTEER CORRECTED');
    }
    _oversteerWas = car.oversteer;

    // ── Understeer (front washes wide, weight on front) ──
    if(car.understeer && !_understeerWas){
      _push('penalty', '↙ UNDERSTEER — front pushing wide · ' + _stateStr());
    }
    if(!car.understeer && _understeerWas){
      _push('info', '✓ UNDERSTEER CORRECTED');
    }
    _understeerWas = car.understeer;

    // ── Full slide (slideFrac high = both axles sliding) ──
    // Hysteresis: enter at 0.40, only exit when below 0.25.
    // Prevents rapid SLIDING/RECOVERED pairs when slideFrac oscillates near the threshold.
    // Also suppress when oversteer is already logged — oversteer IS a slide, no double-log.
    const sf = car.slideFrac || 0;
    const slideActive = car.sliding && !car.oversteer &&
      (_slideWas ? sf > 0.25 : sf > 0.40);
    if(slideActive && !_slideWas){
      const pct = Math.round(sf * 100);
      _push('penalty', '💥 SLIDING ' + pct + '% — ' + _stateStr());
    }
    if(!slideActive && _slideWas){
      _push('info', '✓ SLIDE RECOVERED — ' + _stateStr());
    }
    _slideWas = slideActive;

    // ── Spinning (very high yaw rate) ──
    if(car.spinning && !_spinWas){
      _push('barrier', '🌀 SPINNING — ' + _stateStr());
    }
    if(!car.spinning && _spinWas){
      _push('info', '✓ SPIN CORRECTED');
    }
    _spinWas = car.spinning;

    // ── Barrier hit ──
    if(car.barrierHit && !LOGGER._barrierLogged){
      _push('barrier', '✖ BARRIER HIT — +5.0s · ' + _stateStr());
      LOGGER._barrierLogged = true;
    }
    if(!car.barrierHit) LOGGER._barrierLogged = false;

    // ── Off-track penalty ──
    const curPen = car.lapPenalty || 0;
    if(curPen > _lastPenaltyTotal + 0.49 && !car.barrierHit){
      const delta = curPen - _lastPenaltyTotal;
      _push('penalty', '⚠ OFF-TRACK — +' + delta.toFixed(1) + 's · ' + _stateStr());
    }
    _lastPenaltyTotal = curPen;

    // ── Wrong way ──
    if(car.wrongWay && !_wrongWayLogged){
      _push('penalty', '↩ WRONG WAY — ' + _stateStr());
      _wrongWayLogged = true;
    }
    if(!car.wrongWay) _wrongWayLogged = false;

    // ── Handbrake ──
    if(hbOn && !_hbLogged){
      _push('info', '✋ HANDBRAKE ON — ' + _stateStr());
      _hbLogged = true;
    }
    if(!hbOn && _hbLogged){
      _push('info', '✋ HANDBRAKE OFF — ' + _stateStr());
    }
    if(!hbOn) _hbLogged = false;

    // ── Drift mode — only log if held >0.3s to suppress rapid-tap spam ──
    if(driftOn && !_dftLogged){
      _dftOnTime = now;
      _push('info', '🌀 DRIFT ON — ' + _stateStr());
      _dftLogged = true;
    }
    if(!driftOn && _dftLogged){
      if((now - _dftOnTime) > 300) _push('info', '🌀 DRIFT OFF — ' + _stateStr());
    }
    if(!driftOn) _dftLogged = false;
  }

  function respawn(){
    if(!_active) return;
    _push('info', '↺ RESPAWN');
  }

  function getFullLog(){
    const lines = _entries.map(e => '[' + e.ts + ']  ' + e.msg);
    lines.push('');
    lines.push('--- END ---');
    return lines.join('\n');
  }

  return { start, stop, tick, respawn, getFullLog, _barrierLogged: false };
})();

// ── Wire LOG tab buttons ──

document.getElementById('btn-copy-log').addEventListener('click', ()=>{
  const text = LOGGER.getFullLog();
  const fb = document.getElementById('log-copy-feedback');
  const doFeedback = () => {
    fb.textContent = '✓ LOG COPIED TO CLIPBOARD';
    fb.style.opacity = '1';
    setTimeout(()=>{ fb.style.opacity = '0'; }, 2500);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(doFeedback).catch(()=>{
      _clipboardFallback(text); doFeedback();
    });
  } else {
    _clipboardFallback(text); doFeedback();
  }
  SND.playUIClick();
});

function _clipboardFallback(text){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); } catch(e){}
  document.body.removeChild(ta);
}

document.getElementById('btn-clear-log').addEventListener('click', ()=>{
  const box = document.getElementById('log-entries');
  if(box) box.innerHTML = '';
  const empty = document.getElementById('log-empty');
  if(empty){ empty.style.display = ''; empty.textContent = 'Log cleared.'; }
  SND.playUIClick();
});

// ── Hook logger START into the start button ──
document.getElementById('btn-start').addEventListener('click', ()=>{ LOGGER.start(); }, true);

// ── Hook logger tick into the main game loop ──
// We patch the existing `loop` function by hooking into updateHUD (called every frame)
const _origUpdateHUD_logger = updateHUD;
updateHUD = function(ts){
  _origUpdateHUD_logger(ts);
  LOGGER.tick();
};

// ── Hook respawn ──
document.getElementById('respawn-btn').addEventListener('click', ()=>{ LOGGER.respawn(); }, true);
document.getElementById('btn-respawn-manual').addEventListener('click', ()=>{ LOGGER.respawn(); }, true);

// ── Hook end session / back to menu ──
document.getElementById('btn-end-session').addEventListener('click', ()=>{ LOGGER.stop(); }, true);
document.getElementById('btn-new-session').addEventListener('click', ()=>{ LOGGER.stop(); }, true);
document.getElementById('btn-session-back').addEventListener('click', ()=>{ LOGGER.stop(); }, true);


// ══════════════════════════════════════════
// TRACK PICKER — open / close / select / draw previews
// ══════════════════════════════════════════
(function _initTrackPicker() {

  const overlay  = document.getElementById('track-picker-overlay');
  const picker   = document.getElementById('track-picker');
  const closeBtn = document.getElementById('btn-close-track-picker');
  const cardBtn  = document.getElementById('track-card');
  const scroll   = document.getElementById('track-cards-scroll');
  const dots     = document.getElementById('track-picker-dots');

  if (!overlay || !picker || !scroll) return;

  // ── Draw a minimap-style preview onto a canvas ────────────────
  function drawPreview(canvas, trackId) {
    const pts = buildCentreline(trackId);
    if (!pts || pts.length < 2) return;
    const ctx = canvas.getContext('2d');
    const W   = canvas.width  = canvas.offsetWidth  || 160;
    const H   = canvas.height = canvas.offsetHeight || 110;
    ctx.clearRect(0, 0, W, H);

    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    pts.forEach(p=>{ minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x); minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y); });
    const pad=14, rx=maxX-minX||1, ry=maxY-minY||1;
    const scale=Math.min((W-pad*2)/rx,(H-pad*2)/ry);
    const ox=(W-rx*scale)/2-minX*scale;
    const oy=(H-ry*scale)/2-minY*scale;
    const sx=p=>p.x*scale+ox, sy=p=>p.y*scale+oy;

    // Track body glow
    ctx.strokeStyle='rgba(48,224,96,0.18)';
    ctx.lineWidth=TW*scale*1.8;
    ctx.lineJoin=ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(sx(pts[0]),sy(pts[0]));
    pts.forEach(p=>ctx.lineTo(sx(p),sy(p))); ctx.closePath(); ctx.stroke();

    // Track surface
    ctx.strokeStyle='#1e2e1e'; ctx.lineWidth=TW*scale*1.4;
    ctx.beginPath(); ctx.moveTo(sx(pts[0]),sy(pts[0]));
    pts.forEach(p=>ctx.lineTo(sx(p),sy(p))); ctx.closePath(); ctx.stroke();

    // Centre line (dashed)
    ctx.strokeStyle='rgba(48,224,96,0.7)';
    ctx.lineWidth=Math.max(1.5,TW*scale*0.18);
    ctx.setLineDash([6,5]);
    ctx.beginPath(); ctx.moveTo(sx(pts[0]),sy(pts[0]));
    pts.forEach(p=>ctx.lineTo(sx(p),sy(p))); ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);

    // Start/finish dot
    ctx.fillStyle='#f0c040';
    ctx.beginPath(); ctx.arc(sx(pts[0]),sy(pts[0]),Math.max(3,TW*scale*0.45),0,Math.PI*2); ctx.fill();
  }

  function drawAllPreviews() {
    _trackOrder.forEach(id => {
      const c = document.getElementById('tsc-'+id);
      if (c) drawPreview(c, id);
    });
  }

  function updateTrackCard(trackId) {
    const def = TRACK_DEFS[trackId]; if (!def) return;
    const nameEl = document.getElementById('track-card-name');
    const subEl  = document.getElementById('track-card-sub');
    if (nameEl) nameEl.textContent = def.name;
    if (subEl)  subEl.textContent  = def.sub+' · '+_trackOrder.length+' layout'+(_trackOrder.length>1?'s':'');
    const mc = document.getElementById('track-card-canvas');
    if (mc) drawPreview(mc, trackId);
  }

  // ── Open ──────────────────────────────────────────────────────
  function openPicker() {
    if (typeof buildTrackPickerUI === 'function' && scroll.children.length !== _trackOrder.length) {
      buildTrackPickerUI();
    }
    overlay.classList.add('open');
    picker.classList.add('open');
    requestAnimationFrame(()=>requestAnimationFrame(drawAllPreviews));
  }

  // ── Close ─────────────────────────────────────────────────────
  function closePicker() {
    picker.classList.remove('open');
    overlay.classList.remove('open');
  }

  // ── Select a track ────────────────────────────────────────────
  function selectCard(id) {
    document.querySelectorAll('.track-slide-card').forEach(c => {
      const isActive = c.dataset.track === id;
      c.classList.toggle('active', isActive);
      let badge = c.querySelector('.track-slide-badge');
      if (isActive) {
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'track-slide-badge';
          c.querySelector('.track-slide-info').appendChild(badge);
        }
        badge.textContent = 'SELECTED';
      } else {
        if (badge) badge.remove();
      }
    });

    const dotEls = dots ? dots.querySelectorAll('.tp-dot') : [];
    _trackOrder.forEach((tid,i) => { if (dotEls[i]) dotEls[i].classList.toggle('active', tid===id); });

    initTrack(id);
    updateTrackCard(id);
    closePicker();
  }

  // ── Wire events ───────────────────────────────────────────────
  scroll.addEventListener('click', e => {
    const card = e.target.closest('.track-slide-card');
    if (card && card.dataset.track) selectCard(card.dataset.track);
  });

  // Sync dots on swipe
  if (dots) {
    scroll.addEventListener('scroll', () => {
      const idx = Math.round(scroll.scrollLeft / (160+12));
      dots.querySelectorAll('.tp-dot').forEach((d,i)=>d.classList.toggle('active',i===idx));
    }, {passive:true});
  }

  if (cardBtn)  cardBtn.addEventListener('click', openPicker);
  if (closeBtn) closeBtn.addEventListener('click', closePicker);
  overlay.addEventListener('click', e => { if (e.target===overlay) closePicker(); });

  // Draw main card canvas on pre-start load
  requestAnimationFrame(()=>requestAnimationFrame(()=>updateTrackCard(_trackOrder[0]||'oval')));

})();
