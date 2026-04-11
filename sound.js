const SND = (()=>{
  let ctx=null, master=null, finalLP=null;
  let _started=false, _muted=false;
  const VOL={engine:1,tyre:1,crash:1,cyl:1,harm:1,exhaust:1,blip:1,burble:1,hiss:1,growl:1,scream:1,rasp:1,bass:1,hb:1};

  // 4 detuned sawtooth oscillators — the core engine tone
  // Slight detune between them creates the beating/roughness of a real engine
  const DETUNE=[0, 7, -5, 12]; // cents detune per osc
  const oscs=[], oscGains=[];

  // Idle fill layer — triangle wave sitting in spectral troughs of main oscs
  let idleOsc=null, idleGain=null;

  // Noise layer for combustion texture
  let noiseNode=null, noiseBP=null, noiseGain=null;

  // High-pass for intake hiss at WOT
  let intakeHP=null, intakeGain=null;

  // Saturation
  let satNode=null;

  let _thrSmooth=0, _shiftDip=0, _lastShift=-99, _lastCrash=-99;
  // Brake sound state
  let _brakeHissBP=null, _brakeHissGain=null;
  // Second hiss layer: tonal resonance (the characteristic disc "singing")
  let _brakeResonOsc=null, _brakeResonGain=null, _brakeResonNoise=null, _brakeResonNoiseGain=null;
  let _brakeLockBP=null, _brakeLockGain=null;
  let _lastBrakeChirp=-99, _brkWasOff=true;
  // Engine braking burble — persistent node through saturation, activates under braking
  let _brkBurbleOsc=null, _brkBurbleGain=null, _brkBurbleNoise=null, _brkBurbleNoiseGain=null;
  // Throttle-after-brake transition state
  let _brkReleaseTime=-99, _postBrakeBlipped=false;
  // Handbrake tyre screech — persistent bandpass noise, pitch/vol tracks speed
  let _hbScrubBP=null, _hbScrubGain=null;
  let _hbWasOff=true;
  // Tyre squeal — persistent, driven by slip angle from physics
  let _tyreSquealBP=null, _tyreSquealGain=null;
  let _wheelspinBP=null, _wheelspinGain=null;
  let _driftSquealBP=null, _driftSquealGain=null;
  let _driftWasOff=true, _lastDriftChirp=-99;
  let _revLimitWas=false, _lastRevLimitTime=-99;
  // Idle wobble — slow irregular LFO for lumpy uneven idle character
  let idleWobbleLFO=null, idleWobbleGain=null, idleWobble2LFO=null, idleWobble2Gain=null;

  // Trough deepener — AM modulator that pulls troughs down under acceleration
  let troughMod=null, troughLFO=null, troughDepth=null;

  // Randomness — slow random walk values for organic engine feel
  let _rndFreq=1.0, _rndVol=1.0, _rndLP=1.0, _rndPhase=0;
  let _popThr=0, _nextPop=0, _spdSmooth=0, _lastClusterTime=-99, _lastRasp=1;

  const _bufs={};
  function mkBuf(dur){
    if(_bufs[dur]) return _bufs[dur];
    const n=Math.ceil(ctx.sampleRate*dur), buf=ctx.createBuffer(1,n,ctx.sampleRate), d=buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0;
    for(let i=0;i<n;i++){
      const w=Math.random()*2-1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522;
      d[i]=(b0+b1+b2+b3+b4)*0.18;
    }
    _bufs[dur]=buf; return buf;
  }
  function loopNoise(dur){ const s=ctx.createBufferSource(); s.buffer=mkBuf(dur); s.loop=true; return s; }
  function mkSat(amt){ const n=512,c=new Float32Array(n); for(let i=0;i<n;i++) c[i]=Math.tanh((i*2/(n-1)-1)*amt); return c; }

  function init(){
    if(ctx) return;
    ctx=new(window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain(); master.gain.value=0; master.connect(ctx.destination); // start silent

    // Chain: satNode → troughMod → finalLP → master
    finalLP=ctx.createBiquadFilter(); finalLP.type='lowpass'; finalLP.frequency.value=3200; finalLP.Q.value=0.8;
    finalLP.connect(master);
    troughMod=ctx.createGain(); troughMod.gain.value=1; troughMod.connect(finalLP);
    troughLFO=ctx.createOscillator(); troughLFO.type='sine'; troughLFO.frequency.value=30;
    troughDepth=ctx.createGain(); troughDepth.gain.value=0;
    troughLFO.connect(troughDepth); troughDepth.connect(troughMod.gain); troughLFO.start();
    satNode=ctx.createWaveShaper(); satNode.curve=mkSat(2.8); satNode.oversample='2x';
    satNode.connect(troughMod);

    // 4 detuned sawtooth oscillators all feeding sat
    DETUNE.forEach((detune,i)=>{
      const osc=ctx.createOscillator(); osc.type='sawtooth';
      osc.frequency.value=80; osc.detune.value=detune;
      const g=ctx.createGain(); g.gain.value=0;
      osc.connect(g); g.connect(satNode);
      osc.start(); oscs.push(osc); oscGains.push(g);
    });

    // Idle wobble — two slightly detuned slow LFOs beating against each other
    // Creates the lumpy irregular firing quality of a V8 at idle
    // LFO1 at ~7Hz, LFO2 at ~8.3Hz — their beat frequency ~1.3Hz = slow lumpiness
    idleWobbleLFO=ctx.createOscillator(); idleWobbleLFO.type='sine'; idleWobbleLFO.frequency.value=1.1;
    idleWobbleGain=ctx.createGain(); idleWobbleGain.gain.value=0;
    idleWobbleLFO.connect(idleWobbleGain); idleWobbleGain.connect(troughMod.gain);
    idleWobbleLFO.start();

    idleWobble2LFO=ctx.createOscillator(); idleWobble2LFO.type='sine'; idleWobble2LFO.frequency.value=1.7;
    idleWobble2Gain=ctx.createGain(); idleWobble2Gain.gain.value=0;
    idleWobble2LFO.connect(idleWobble2Gain); idleWobble2Gain.connect(troughMod.gain);
    idleWobble2LFO.start();

    // Idle fill — triangle wave at fireHz*0.75 = sits in trough between 1st and 2nd harmonic
    // Triangle is softer/rounder than sawtooth so it fills gaps without clashing
    idleOsc=ctx.createOscillator(); idleOsc.type='triangle'; idleOsc.frequency.value=45;
    idleGain=ctx.createGain(); idleGain.gain.value=0;
    idleOsc.connect(idleGain); idleGain.connect(satNode);
    idleOsc.start();

    // Pink noise → bandpass (tracks fireHz) → sat — combustion texture
    noiseNode=loopNoise(3);
    noiseBP=ctx.createBiquadFilter(); noiseBP.type='bandpass'; noiseBP.frequency.value=200; noiseBP.Q.value=2.5;
    noiseGain=ctx.createGain(); noiseGain.gain.value=0;
    noiseNode.connect(noiseBP); noiseBP.connect(noiseGain); noiseGain.connect(satNode);
    noiseNode.start();

    // Intake hiss — highpass noise, only at WOT high RPM
    const intakeNoise=loopNoise(2);
    intakeHP=ctx.createBiquadFilter(); intakeHP.type='highpass'; intakeHP.frequency.value=2400; intakeHP.Q.value=0.7;
    intakeGain=ctx.createGain(); intakeGain.gain.value=0;
    intakeNoise.connect(intakeHP); intakeHP.connect(intakeGain); intakeGain.connect(master);
    intakeNoise.start();

    // ── BRAKE SOUNDS — persistent nodes (zero GC pressure) ──
    // Layer A: Broadband scrape foundation (100–800Hz) — the pad/disc friction grunt
    // Wide Q, low-mid frequency — the "body" of braking you feel as much as hear
    const brakeHissNoise = loopNoise(2.5);
    _brakeHissBP = ctx.createBiquadFilter(); _brakeHissBP.type='bandpass';
    _brakeHissBP.frequency.value = 400; _brakeHissBP.Q.value = 1.2;
    _brakeHissGain = ctx.createGain(); _brakeHissGain.gain.value = 0;
    brakeHissNoise.connect(_brakeHissBP); _brakeHissBP.connect(_brakeHissGain);
    _brakeHissGain.connect(master);
    brakeHissNoise.start();

    // Layer B: Tonal disc resonance (2–4kHz, very high Q) — the characteristic pad "singing"
    // Real brake hiss is NOT just noise — it's a narrow tonal resonance of the disc/pad system
    // High Q = sounds like a sustained pitched tone with noise texture around it
    _brakeResonOsc = ctx.createOscillator(); _brakeResonOsc.type='sine';
    _brakeResonOsc.frequency.value = 3198;
    _brakeResonGain = ctx.createGain(); _brakeResonGain.gain.value = 0;
    _brakeResonOsc.connect(_brakeResonGain); _brakeResonGain.connect(master);
    _brakeResonOsc.start();
    // Narrow noise band layered on the resonance for texture (not just a pure tone)
    const brakeResonNoise = loopNoise(1.5);
    _brakeResonNoise = ctx.createBiquadFilter(); _brakeResonNoise.type='bandpass';
    _brakeResonNoise.frequency.value = 3198; _brakeResonNoise.Q.value = 9.0;
    _brakeResonNoiseGain = ctx.createGain(); _brakeResonNoiseGain.gain.value = 0;
    brakeResonNoise.connect(_brakeResonNoise); _brakeResonNoise.connect(_brakeResonNoiseGain);
    _brakeResonNoiseGain.connect(master);
    brakeResonNoise.start();

    // 2. Brake lock rumble — low-freq noise, scales with brakeLock physics value
    const brakeLockNoise = loopNoise(1.5);
    _brakeLockBP = ctx.createBiquadFilter(); _brakeLockBP.type='bandpass';
    _brakeLockBP.frequency.value = 120; _brakeLockBP.Q.value = 2.2;
    _brakeLockGain = ctx.createGain(); _brakeLockGain.gain.value = 0;
    brakeLockNoise.connect(_brakeLockBP); _brakeLockBP.connect(_brakeLockGain);
    _brakeLockGain.connect(master);
    brakeLockNoise.start();

    // 3. Engine braking burble — sawtooth + noise routed through satNode so it has
    // the exact same gritty character as the main engine. Activates under braking.
    // This is the "drivetrain pulling back" sound — what makes braking feel connected.
    _brkBurbleOsc = ctx.createOscillator(); _brkBurbleOsc.type='sawtooth';
    _brkBurbleOsc.frequency.value = 80;
    _brkBurbleGain = ctx.createGain(); _brkBurbleGain.gain.value = 0;
    _brkBurbleOsc.connect(_brkBurbleGain); _brkBurbleGain.connect(satNode);
    _brkBurbleOsc.start();
    // Noise layer for burble texture — also through sat for matched tone
    _brkBurbleNoise = loopNoise(2.0);
    _brkBurbleNoiseGain = ctx.createGain(); _brkBurbleNoiseGain.gain.value = 0;
    _brkBurbleNoise.connect(_brkBurbleNoiseGain); _brkBurbleNoiseGain.connect(satNode);
    _brkBurbleNoise.start();

    // Handbrake tyre scrub — rear tyres locking and scrubbing on asphalt
    // Character: mid-high pitch rubber squeal, continuous while HB held at speed
    _hbScrubBP = ctx.createBiquadFilter(); _hbScrubBP.type='bandpass';
    _hbScrubBP.frequency.value = 600; _hbScrubBP.Q.value = 2.5;
    _hbScrubGain = ctx.createGain(); _hbScrubGain.gain.value = 0;
    const hbNoise = loopNoise(2.0);
    hbNoise.connect(_hbScrubBP); _hbScrubBP.connect(_hbScrubGain); _hbScrubGain.connect(master);
    hbNoise.start();

    // Tyre squeal — persistent bandpass noise driven by slip angle
    // Higher pitch at higher slip (more deformation), volume peaks at grip limit then drops at full slide
    _tyreSquealBP = ctx.createBiquadFilter(); _tyreSquealBP.type='bandpass';
    _tyreSquealBP.frequency.value = 500; _tyreSquealBP.Q.value = 3.0;
    _tyreSquealGain = ctx.createGain(); _tyreSquealGain.gain.value = 0;
    const tyreSquealNoise = loopNoise(2.0);
    tyreSquealNoise.connect(_tyreSquealBP); _tyreSquealBP.connect(_tyreSquealGain); _tyreSquealGain.connect(master);
    tyreSquealNoise.start();

    // Wheelspin screech — high-pitched burnout squeal
    _wheelspinBP = ctx.createBiquadFilter(); _wheelspinBP.type='bandpass';
    _wheelspinBP.frequency.value = 900; _wheelspinBP.Q.value = 2.5;
    _wheelspinGain = ctx.createGain(); _wheelspinGain.gain.value = 0;
    const wheelspinNoise = loopNoise(1.5);
    wheelspinNoise.connect(_wheelspinBP); _wheelspinBP.connect(_wheelspinGain); _wheelspinGain.connect(master);
    wheelspinNoise.start();

    // Drift squeal — lower, more sustained than cornering squeal
    _driftSquealBP = ctx.createBiquadFilter(); _driftSquealBP.type='bandpass';
    _driftSquealBP.frequency.value = 350; _driftSquealBP.Q.value = 1.2;
    _driftSquealGain = ctx.createGain(); _driftSquealGain.gain.value = 0;
    const driftSquealNoise = loopNoise(2.5);
    driftSquealNoise.connect(_driftSquealBP); _driftSquealBP.connect(_driftSquealGain); _driftSquealGain.connect(master);
    driftSquealNoise.start();

    _started=true;
  }

  function playPop(){
    const now=ctx.currentTime;
    if(now<_nextPop) return;
    _nextPop=now+0.03+Math.random()*0.07;
    // Deep boom
    const dur1=0.07+Math.random()*0.08;
    const g1=ctx.createGain(); g1.gain.setValueAtTime(2.2+Math.random()*1.2,now);
    g1.gain.exponentialRampToValueAtTime(0.001,now+dur1); g1.connect(master);
    const bp1=ctx.createBiquadFilter(); bp1.type='bandpass'; bp1.frequency.value=80+Math.random()*60; bp1.Q.value=1.5;
    const ns1=ctx.createBufferSource(); ns1.buffer=mkBuf(0.2);
    ns1.connect(bp1); bp1.connect(g1); ns1.start(now); ns1.stop(now+dur1);
    // Mid crackle (70% chance)
    if(Math.random()>0.30){
      const dur2=0.025+Math.random()*0.03;
      const g2=ctx.createGain(); g2.gain.setValueAtTime(0.9+Math.random()*0.7,now+0.005);
      g2.gain.exponentialRampToValueAtTime(0.001,now+0.005+dur2); g2.connect(master);
      const bp2=ctx.createBiquadFilter(); bp2.type='bandpass'; bp2.frequency.value=350+Math.random()*350; bp2.Q.value=3;
      const ns2=ctx.createBufferSource(); ns2.buffer=mkBuf(0.1);
      ns2.connect(bp2); bp2.connect(g2); ns2.start(now+0.005); ns2.stop(now+0.005+dur2);
    }
    // Sharp crack (60% chance)
    if(Math.random()>0.40){
      const dur3=0.012+Math.random()*0.015;
      const g3=ctx.createGain(); g3.gain.setValueAtTime(0.7+Math.random()*0.5,now+0.009);
      g3.gain.exponentialRampToValueAtTime(0.001,now+0.009+dur3); g3.connect(master);
      const bp3=ctx.createBiquadFilter(); bp3.type='bandpass'; bp3.frequency.value=1800+Math.random()*600; bp3.Q.value=5;
      const ns3=ctx.createBufferSource(); ns3.buffer=mkBuf(0.1);
      ns3.connect(bp3); bp3.connect(g3); ns3.start(now+0.009); ns3.stop(now+0.009+dur3);
    }
  }

  function playShift(dir){
    const now=ctx.currentTime;
    if(now-_lastShift<0.18) return; _lastShift=now; _shiftDip=1.0;
    const dur=dir==='up'?0.10:0.16;
    const g=ctx.createGain(); g.gain.setValueAtTime(dir==='up'?0.7:0.55,now);
    g.gain.exponentialRampToValueAtTime(0.001,now+dur); g.connect(master);
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=dir==='up'?90:65; bp.Q.value=3;
    const ns=ctx.createBufferSource(); ns.buffer=mkBuf(0.2);
    ns.connect(bp); bp.connect(g); ns.start(now); ns.stop(now+dur);
  }

  // Brake pops — routed through satNode so they share engine tonal character
  // RPM-linked pitch: pops harmonically match the engine note currently playing
  let _lastBrakePop=0;
  function playBrakePop(intensity, fireHz){
    const now=ctx.currentTime;
    const minGap = 0.10 - intensity*0.06; // 40ms–100ms gap, faster at high intensity
    if(now < _lastBrakePop + minGap) return;
    _lastBrakePop = now;

    // Deep thump — pitch anchored to engine fireHz so it feels like part of the exhaust
    const dur1 = 0.06 + Math.random()*0.07;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime((2.2 + Math.random()*1.2)*intensity, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now+dur1);
    g1.connect(satNode); // through sat = engine-coloured
    const bp1 = ctx.createBiquadFilter(); bp1.type='bandpass';
    bp1.frequency.value = fireHz * (0.8 + Math.random()*0.4); // tracks engine pitch
    bp1.Q.value = 1.6;
    const ns1 = ctx.createBufferSource(); ns1.buffer=mkBuf(0.15);
    ns1.connect(bp1); bp1.connect(g1); ns1.start(now); ns1.stop(now+dur1);

    // Mid exhaust crack — 85% chance
    if(Math.random() > 0.15){
      const dur2 = 0.022 + Math.random()*0.025;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime((0.9 + Math.random()*0.6)*intensity, now+0.006);
      g2.gain.exponentialRampToValueAtTime(0.001, now+0.006+dur2);
      g2.connect(satNode);
      const bp2 = ctx.createBiquadFilter(); bp2.type='bandpass';
      bp2.frequency.value = fireHz * (2.0 + Math.random()*1.5); // upper harmonic
      bp2.Q.value = 3.0;
      const ns2 = ctx.createBufferSource(); ns2.buffer=mkBuf(0.08);
      ns2.connect(bp2); bp2.connect(g2); ns2.start(now+0.006); ns2.stop(now+0.006+dur2);
    }

    // High spit — 55% chance, sharp top-end crack
    if(Math.random() > 0.45){
      const dur3 = 0.010 + Math.random()*0.012;
      const g3 = ctx.createGain();
      g3.gain.setValueAtTime((0.5 + Math.random()*0.35)*intensity, now+0.012);
      g3.gain.exponentialRampToValueAtTime(0.001, now+0.012+dur3);
      g3.connect(master); // direct to master for the crispy top-end crack
      const bp3 = ctx.createBiquadFilter(); bp3.type='bandpass';
      bp3.frequency.value = 1200 + Math.random()*800; bp3.Q.value=5;
      const ns3 = ctx.createBufferSource(); ns3.buffer=mkBuf(0.05);
      ns3.connect(bp3); bp3.connect(g3); ns3.start(now+0.012); ns3.stop(now+0.012+dur3);
    }
  }

  // ── BMW / M-car overrun pop cluster — "pop-pop-prr" ──
  function playOverrunCluster(vol){
    if(!_started || !ctx || !master) return;
    if(ctx.state==='suspended') ctx.resume();
    // Haptic on Android — exhaust pops create real physical pressure IRL
    if(navigator.vibrate) navigator.vibrate(18);
    const now = ctx.currentTime;
    const popCount = 2 + Math.floor(Math.random() * 3);

    for(let i = 0; i < popCount; i++){
      const t = now + i * (0.08 + Math.random()*0.07); // 80–150ms apart — hear each pop distinctly

      const v = vol * (1.0 - i * 0.15);

      // Low body thump — longer decay so it resonates
      const dur1 = 0.12 + Math.random()*0.06;
      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(v * 6.0, t);
      g1.gain.exponentialRampToValueAtTime(0.001, t + dur1);
      g1.connect(master);
      const bp1 = ctx.createBiquadFilter(); bp1.type='lowpass'; bp1.frequency.value=180; bp1.Q.value=0.7;
      const ns1 = ctx.createBufferSource(); ns1.buffer=mkBuf(0.2);
      ns1.connect(bp1); bp1.connect(g1); ns1.start(t); ns1.stop(t+dur1);

      // Mid crack — longer so you hear the bang ring out
      const dur2 = 0.06 + Math.random()*0.04;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(v * 4.0, t + 0.002);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.002 + dur2);
      g2.connect(master);
      const bp2 = ctx.createBiquadFilter(); bp2.type='bandpass'; bp2.frequency.value=200+Math.random()*280; bp2.Q.value=1.2;
      const ns2 = ctx.createBufferSource(); ns2.buffer=mkBuf(0.12);
      ns2.connect(bp2); bp2.connect(g2); ns2.start(t+0.002); ns2.stop(t+0.002+dur2);

      // High crackle — 65% chance
      if(Math.random() > 0.35){
        const dur3 = 0.025 + Math.random()*0.020;
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(v * 2.2, t + 0.006);
        g3.gain.exponentialRampToValueAtTime(0.001, t + 0.006 + dur3);
        g3.connect(master);
        const bp3 = ctx.createBiquadFilter(); bp3.type='bandpass'; bp3.frequency.value=600+Math.random()*600; bp3.Q.value=2.5;
        const ns3 = ctx.createBufferSource(); ns3.buffer=mkBuf(0.06);
        ns3.connect(bp3); bp3.connect(g3); ns3.start(t+0.006); ns3.stop(t+0.006+dur3);
      }
    }

    // "prr" flutter tail — wider spacing so it trails off naturally
    const ft0 = now + popCount * 0.10 + 0.02;
    const fc = 4 + Math.floor(Math.random()*4);
    for(let j = 0; j < fc; j++){
      const ft = ft0 + j*(0.035+Math.random()*0.025);
      const fv = vol * 0.65 * (1.0 - j*0.10);
      const fd = 0.030 + Math.random()*0.020;
      const fg = ctx.createGain();
      fg.gain.setValueAtTime(fv, ft);
      fg.gain.exponentialRampToValueAtTime(0.001, ft+fd);
      fg.connect(master);
      const fbp = ctx.createBiquadFilter(); fbp.type='bandpass'; fbp.frequency.value=90+Math.random()*130; fbp.Q.value=2.0;
      const fns = ctx.createBufferSource(); fns.buffer=mkBuf(0.08);
      fns.connect(fbp); fbp.connect(fg); fns.start(ft); fns.stop(ft+fd);
    }
  }

  function update(rpm,spd,vx,thr,brk,brakeLock,oversteer,understeer,spinning,onTrack,barrierHit,gearShift,isPaused,preStart,reversing,hb,dft,alphaF,alphaR){
    if(!_started||_muted) return;
    if(ctx.state==='suspended') ctx.resume();
    const now=ctx.currentTime;
    _spdSmooth+=(Math.abs(spd)-_spdSmooth)*0.07;

    if(isPaused){
      // Instant cut — cancel any pending ramps then zero immediately
      const _cut = (g) => { if(g){ g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(0,now); } };
      _cut(master);
      _cut(_brakeHissGain); _cut(_brakeLockGain);
      _cut(_brkBurbleGain); _cut(_brkBurbleNoiseGain);
      _cut(_brakeResonGain); _cut(_brakeResonNoiseGain);
      _cut(_hbScrubGain); _cut(_tyreSquealGain);
      _cut(_wheelspinGain); _cut(_driftSquealGain);
      _thrSmooth=0; return;
    }
    if(!preStart){
      // Ramp back up from 0 cleanly after the instant cut
      if(master.gain.value < 0.01){ master.gain.setValueAtTime(0,now); }
      master.gain.setTargetAtTime(0.68,now,0.18);
    }
    // during preStart (countdown): scheduled linearRamp from countdownFadeIn() runs freely

    _shiftDip*=0.82;

    // ── Throttle smoothing — context-aware ──
    // In reverse: brk pedal IS the throttle, so smooth that instead
    const _activePedal = reversing ? brk : thr;
    const _postBrakeWindow = (now - _brkReleaseTime) < 0.35;
    const _thrAttack = (_postBrakeWindow && _activePedal > 0.05) ? 0.18 : 0.025;
    const _thrDecay  = 0.20;
    _thrSmooth += (_thrSmooth < _activePedal
      ? (_activePedal - _thrSmooth) * _thrAttack
      : (_activePedal - _thrSmooth) * _thrDecay);
    const thrG=_thrSmooth;
    const rpmN=Math.max(0.04,Math.min(1,(rpm-900)/7100));

    // Track brake release moment for transition timing
    if(_brkWasOff === false && brk < 0.5){
      // brake just released
      _brkReleaseTime = now;
      _postBrakeBlipped = false;
    }

    // Core frequency — fireHz is the V8 firing frequency (rpm/15)
    // Oscillators run at fireHz so pitch tracks RPM naturally
    _settleRandomness(now);
    // Slow random walk — each frame nudge values slightly, mean-reverting
    // Creates subtle organic instability — engine never sounds perfectly mechanical
    _rndFreq  += (Math.random()-0.5)*0.008; _rndFreq  = Math.max(0.97,Math.min(1.03,_rndFreq));
    _rndVol   += (Math.random()-0.5)*0.006; _rndVol   = Math.max(0.96,Math.min(1.04,_rndVol));
    _rndLP    += (Math.random()-0.5)*0.010; _rndLP    = Math.max(0.94,Math.min(1.06,_rndLP));
    _rndPhase += (Math.random()-0.5)*0.004; _rndPhase = Math.max(0.97,Math.min(1.03,_rndPhase));

    const fireHz=Math.max(40,rpm/15);
    // Engine strain during drift: rear wheels spin faster than car moves → engine pitch climbs.
    // dft mode + lateral velocity = wheels spinning freely = RPM sounds higher/strained.
    // Also fires on natural oversteer (oversteer flag) for non-button slides.
    const driftSliding = dft || oversteer;
    const driftStrain = driftSliding ? Math.min(Math.abs(vx) / 8.0, 1.0) * thr * 0.14 : 0;
    const fireHzEff = fireHz * (1 + driftStrain);

    // ── OSCILLATOR FREQUENCY + VOLUME ──
    // All 4 oscs track fireHz — volume scales with throttle + rpm
    // At idle: quiet, deep. At WOT high RPM: loud, bright (LP opens up)
    const oscVol=(0.35+thrG*0.55)*(0.4+rpmN*0.6)*VOL.engine*VOL.growl*(1-_shiftDip*0.5);
    oscs.forEach((osc,i)=>{
      osc.frequency.setTargetAtTime(fireHzEff*0.5*_rndFreq,now,0.025);
      oscGains[i].gain.setTargetAtTime(oscVol*_rndVol*VOL.cyl,now,0.025);
    });

    // ── THROTTLE BLIP on brake→throttle transition ──
    // Fires once within 0.35s of releasing brakes when throttle opens — RPM-scaled bark
    if(_postBrakeWindow && !_postBrakeBlipped && thr > 0.1 && rpm > 1800 && !isPaused){
      _postBrakeBlipped = true;
      const blipIntensity = Math.min((rpm - 1800) / 4000, 1.0);
      const blipVol = blipIntensity * 1.8 * VOL.engine * VOL.blip;
      const bd = 0.04 + Math.random()*0.03;
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(blipVol, now);
      bg.gain.exponentialRampToValueAtTime(0.001, now + bd);
      bg.connect(satNode);
      const bbp = ctx.createBiquadFilter(); bbp.type='bandpass';
      bbp.frequency.value = fireHzEff * 1.2; bbp.Q.value = 2.2;
      const bns = ctx.createBufferSource(); bns.buffer = mkBuf(0.1);
      bns.connect(bbp); bbp.connect(bg); bns.start(now); bns.stop(now + bd);
      if(master){
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0.94, now + 0.035);
        master.gain.linearRampToValueAtTime(0.68,  now + 0.12);
      }
    }

    // ── LP FILTER opens with RPM + throttle — VOL.scream controls how bright/screamy it gets ──
    const lpFreqBase = 160 + Math.pow(rpmN,1.3)*3000*(0.3+thrG*0.7)*_rndLP;
    // scream slider: 0=dark/capped at 800Hz, 1=full bright 4500Hz
    const lpFreqMax = 800 + VOL.scream * 3700;
    const lpFreq = Math.min(lpFreqBase, lpFreqMax);
    finalLP.frequency.setTargetAtTime(lpFreq,now,0.04);

    // Trough deepener — LFO tracks fireHz*0.5 exactly so it aligns with harmonic spacing
    if(troughLFO) troughLFO.frequency.setTargetAtTime(fireHzEff*0.5,now,0.025);
    if(troughDepth) troughDepth.gain.setTargetAtTime(-(thrG*0.38),now,0.04);

    // Idle wobble fades as RPM/throttle rises
    const wobbleFade=Math.max(0, 1.0-rpmN*3.5) * (1-thrG*2.5);
    if(idleWobbleGain)  idleWobbleGain.gain.setTargetAtTime(wobbleFade*0.12,now,0.08);
    if(idleWobble2Gain) idleWobble2Gain.gain.setTargetAtTime(wobbleFade*0.10,now,0.08);

    // Idle fill — VOL.bass controls the low challenger thump
    const idleFreq=fireHzEff*0.75*_rndFreq;
    const idleFade=Math.max(0, 1.0 - rpmN*4.0);
    if(idleOsc) idleOsc.frequency.setTargetAtTime(idleFreq,now,0.04);
    if(idleGain) idleGain.gain.setTargetAtTime(idleFade*0.38*VOL.engine*VOL.cyl*VOL.bass,now,0.06);

    // ── NOISE TEXTURE — VOL.harm controls combustion crackle/harmonics ──
    noiseBP.frequency.setTargetAtTime(fireHzEff*0.8,now,0.04);
    noiseGain.gain.setTargetAtTime(thrG*rpmN*0.55*_rndPhase*VOL.engine*VOL.harm,now,0.04);

    // ── INTAKE HISS — removed (was causing unwanted airy sound above 5800rpm) ──
    intakeGain.gain.setTargetAtTime(0, now, 0.05);

    // ── RASP — dynamically adjusts saturation curve based on VOL.rasp slider ──
    if(satNode && _lastRasp !== VOL.rasp){
      satNode.curve = mkSat(1.2 + VOL.rasp * 2.6); // 0=clean(1.2) → 1=full rasp(3.8)
      _lastRasp = VOL.rasp;
    }

    // ── EXHAUST POPS on decel ──
    if(_popThr>0.15&&thr<0.08&&rpm>3000&&!isPaused) playPop();
    if(thr<0.05&&rpm>3500&&_spdSmooth>20&&!isPaused) playPop();
    if(gearShift==='down'&&rpm>2000&&!isPaused){ playPop(); playPop(); }

    // ── BMW OVERRUN CLUSTERS ──
    // IRL: RPM is the gate, not speed. 3k+ RPM on lift. Was accelerating (heavy throttle).
    // 1 or 2 pops normally, very rarely 3. Never 4. Spread over ~1s window.
    // 70% chance at 3k, near-guaranteed at 5k+. Low RPM lifts = silence.
    const _justLiftedThrottle = _popThr >= 0.5 && thr < 0.05;
    if(_justLiftedThrottle && rpm > 3000 && !reversing && !isPaused && (now - _lastClusterTime) > 2.5){
      const vol = (1.8 + rpmN * 2.2) * VOL.tyre;
      const chance = 0.45 + rpmN * 0.50;
      if(Math.random() < chance){
        const roll = Math.random();
        const burstCount = roll < 0.50 ? 1 : roll < 0.90 ? 2 : 3;
        _lastClusterTime = now;
        for(let b = 0; b < burstCount; b++){
          const delay = b * (0.35 + Math.random()*0.25);
          setTimeout(() => { playOverrunCluster(vol); }, delay * 1000);
        }
      }
    }
    _popThr = thr;

    // ── GEAR SHIFT dip ──
    if(gearShift) playShift(gearShift);

    // ── TYRE SQUEAL — rough, organic, slip-angle driven ──
    if(_tyreSquealGain && _tyreSquealBP){
      const maxAlpha = Math.max(Math.abs(alphaF||0), Math.abs(alphaR||0));
      const spdFactor = Math.min(Math.abs(spd) * 3.6 / 40, 1.0);
      const slipNorm = Math.max(0, (maxAlpha - 0.05) / 0.18);
      const bellFade = spinning ? 0.10 : 1.0;
      // Roughness: vol and pitch wander each frame = organic scrubbing, not a clean tone
      const roughVol = 0.78 + Math.random() * 0.44;
      const squealVol = Math.min(slipNorm, 2.0 - slipNorm) * 0.5 * spdFactor * bellFade * 1.8 * VOL.tyre * roughVol;
      const pitchWander = 1.0 + (Math.random() - 0.5) * 0.14;
      const squealFreq = (320 + Math.min(maxAlpha / 0.25, 1.0) * 520) * pitchWander;
      // Q wanders too — alternates between narrow (pure tone) and wide (scrubby noise)
      _tyreSquealBP.Q.value = 1.2 + Math.random() * 3.5;
      _tyreSquealBP.frequency.setTargetAtTime(squealFreq, now, 0.02);
      _tyreSquealGain.gain.setTargetAtTime(Math.max(0, squealVol), now, 0.02);
    }

    // ── HANDBRAKE SCRUB ──
    // Rear tyres locking = rubber scrubbing on asphalt at speed
    // Pitch rises with speed (faster = higher-pitched scrub), loud initially then fades as car slows
    if(_hbScrubGain && _hbScrubBP){
      const spdKmh2 = Math.abs(spd) * 3.6;
      const hbActive = hb && spdKmh2 > 5;
      const hbSpdFactor = Math.min(spdKmh2 / 80, 1.0);
      // Tyre scrub: 400–900Hz pitch range, louder at higher speeds
      const hbFreq = 400 + hbSpdFactor * 500;
      const hbVol = hbActive ? hbSpdFactor * 0.55 * VOL.tyre * VOL.hb : 0;
      const hbTime = hbActive ? (_hbWasOff ? 0.06 : 0.04) : 0.12; // fast in, slow out
      _hbScrubBP.frequency.setTargetAtTime(hbFreq, now, 0.08);
      _hbScrubGain.gain.setTargetAtTime(hbVol, now, hbTime);
      // One-shot chirp on HB engage above 20 km/h — the initial lock bite
      if(hbActive && _hbWasOff && spdKmh2 > 20){
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0.35 * VOL.tyre, now);
        cg.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        cg.connect(master);
        const cbp = ctx.createBiquadFilter(); cbp.type='bandpass';
        cbp.frequency.value = 700 + Math.random()*400; cbp.Q.value = 3.0;
        const cns = ctx.createBufferSource(); cns.buffer=mkBuf(0.12);
        cns.connect(cbp); cbp.connect(cg); cns.start(now); cns.stop(now+0.08);
      }
      _hbWasOff = !hbActive;
    }

    // ── WHEELSPIN SCREECH — launch/burnout, low speed + high throttle ──
    if(_wheelspinGain && _wheelspinBP){
      const spdKmhW = Math.abs(spd) * 3.6;
      const spinActive = thr > 0.7 && spdKmhW < 60 && rpm > 3000 && !reversing;
      const spinIntensity = spinActive ? cl((thr - 0.7) / 0.3, 0, 1) * cl(1 - spdKmhW / 60, 0, 1) : 0;
      // High-pitched screech 800-1400Hz — classic tyre burnout sound
      _wheelspinBP.frequency.setTargetAtTime(800 + spinIntensity * 600, now, 0.04);
      _wheelspinGain.gain.setTargetAtTime(spinIntensity * 0.45 * VOL.tyre, now, spinActive ? 0.05 : 0.15);
    }

    // ── REV LIMITER BARK — sharp pop when hitting 7400rpm ──
    const atRevLimit = rpm > 7300 && thr > 0.5;
    if(atRevLimit && !_revLimitWas && (now - _lastRevLimitTime) > 0.12){
      _lastRevLimitTime = now;
      // Sharp bark: mid-high crack + brief volume spike
      const rlg = ctx.createGain();
      rlg.gain.setValueAtTime(0.55, now);
      rlg.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      rlg.connect(master);
      const rlbp = ctx.createBiquadFilter(); rlbp.type='bandpass';
      rlbp.frequency.value = 500 + Math.random()*300; rlbp.Q.value=2.0;
      const rlns = ctx.createBufferSource(); rlns.buffer=mkBuf(0.08);
      rlns.connect(rlbp); rlbp.connect(rlg); rlns.start(now); rlns.stop(now+0.055);
      // Brief master volume spike — the cut+bounce feel
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.62, now + 0.02);
      master.gain.linearRampToValueAtTime(0.68,  now + 0.07);
    }
    _revLimitWas = atRevLimit;

    // ── DRIFT SQUEAL — sustained mid-pitch squeal during drift mode ──
    // Classic NFS/FH drift sound: lower than cornering squeal, more sustained, smooth
    // Also fires on natural oversteer slides (not just drift button)
    if(_driftSquealGain && _driftSquealBP){
      const driftActive = dft || oversteer;
      const driftIntensity = driftActive
        ? cl((Math.abs(vx) - 1.0) / 3.0, 0, 1) * cl(Math.abs(spd)*3.6/60, 0, 1)
        : 0;
      // 280-480Hz — lower, more sustained than the cornering squeal at 320-840Hz
      const driftFreq = 280 + driftIntensity * 200 + Math.random() * 40;
      _driftSquealBP.Q.value = 0.8 + Math.random() * 1.2;
      _driftSquealBP.frequency.setTargetAtTime(driftFreq, now, 0.08);
      _driftSquealGain.gain.setTargetAtTime(driftIntensity * 0.5 * VOL.tyre, now, driftActive ? 0.12 : 0.25);

      // One-shot chirp on drift entry — rear breaking loose
      if(driftIntensity > 0.2 && _driftWasOff && Math.abs(spd)*3.6 > 30 && (now - _lastDriftChirp) > 0.5){
        _lastDriftChirp = now;
        const chirpDur = 0.06 + Math.random()*0.04;
        const gc = ctx.createGain();
        gc.gain.setValueAtTime(0.25 * VOL.tyre, now);
        gc.gain.exponentialRampToValueAtTime(0.001, now + chirpDur);
        gc.connect(master);
        const bpc = ctx.createBiquadFilter(); bpc.type='bandpass';
        bpc.frequency.value = 300 + Math.random()*150; bpc.Q.value = 3.0;
        const nsc = ctx.createBufferSource(); nsc.buffer = mkBuf(0.15);
        nsc.connect(bpc); bpc.connect(gc); nsc.start(now); nsc.stop(now + chirpDur);
      }
      _driftWasOff = !(driftIntensity > 0.2);
    }

    if(barrierHit&&ctx.currentTime-_lastCrash>0.3){
      _lastCrash=ctx.currentTime;
      const lp2=ctx.createBiquadFilter(); lp2.type='lowpass'; lp2.frequency.value=600;
      const g2=ctx.createGain(); g2.gain.setValueAtTime(VOL.crash*0.8,now);
      g2.gain.exponentialRampToValueAtTime(0.001,now+0.35); g2.connect(master);
      const ns2=ctx.createBufferSource(); ns2.buffer=mkBuf(0.5);
      ns2.connect(lp2); lp2.connect(g2); ns2.start(now); ns2.stop(now+0.35);
    }

    // ── BRAKE SOUNDS — only when going forward ──
    const spdKmh = spd * 3.6;
    const brkActive = brk > 0.5 && !reversing;

    // 1. Brake hiss — two layers: broadband scrape (dominant) + barely-there tonal resonance
    if(_brakeHissGain){
      const speedFactor = Math.max(0, (spdKmh - 15) / 80);
      const hissOn = brkActive && thr < 0.05;

      // Layer A: broadband scrape — the dominant pad/disc friction grunt a driver actually hears
      // Low-mid (300–650Hz), wide — this is what cuts through engine noise inside the cockpit
      const scrapeVol = hissOn ? Math.min(speedFactor * 0.13, 0.13) * VOL.tyre * VOL.hiss : 0;
      const hissTime = brkActive ? (_brkWasOff ? 0.18 : 0.04) : 0.07;
      _brakeHissGain.gain.setTargetAtTime(scrapeVol, now, hissTime);
      if(_brakeHissBP) _brakeHissBP.frequency.setTargetAtTime(300 + speedFactor*350, now, 0.15);

      // Layer B: disc resonance — barely audible, just adds a hint of character
      // IRL the driver wouldn't hear this prominently — engine+road noise masks it completely
      // Keeping it at ~8% of scrape volume so it's almost subliminal texture, not a feature
      const resonFreq = 2798 + speedFactor * 598;
      const resonVol  = hissOn ? Math.min(speedFactor * 0.010, 0.010) * VOL.tyre * VOL.hiss : 0;
      if(_brakeResonOsc)       _brakeResonOsc.frequency.setTargetAtTime(resonFreq, now, 0.20);
      if(_brakeResonGain)      _brakeResonGain.gain.setTargetAtTime(resonVol, now, hissTime);
      if(_brakeResonNoise)     _brakeResonNoise.frequency.setTargetAtTime(resonFreq, now, 0.20);
      if(_brakeResonNoiseGain) _brakeResonNoiseGain.gain.setTargetAtTime(resonVol * 0.5, now, hissTime);
    }

    // 2. Tyre chirp — one-shot burst on initial brake press above 40 km/h
    if(brkActive && _brkWasOff && spdKmh > 40 && now - _lastBrakeChirp > 0.5){
      _lastBrakeChirp = now;
      const chirpDur = 0.06 + Math.random()*0.05;
      const chirpVol = Math.min((spdKmh - 40) / 80, 1) * 0.22 * VOL.tyre;
      const gc = ctx.createGain();
      gc.gain.setValueAtTime(chirpVol, now);
      gc.gain.exponentialRampToValueAtTime(0.001, now + chirpDur);
      gc.connect(master);
      const bpc = ctx.createBiquadFilter(); bpc.type='bandpass';
      bpc.frequency.value = 500 + Math.random()*300; bpc.Q.value = 2.5;
      const nsc = ctx.createBufferSource(); nsc.buffer = mkBuf(0.2);
      nsc.connect(bpc); bpc.connect(gc); nsc.start(now); nsc.stop(now + chirpDur);
    }
    _brkWasOff = !brkActive;

    // 3. Engine braking burble — activates when braking above idle RPM
    // Oscillator tracks fireHz so it's harmonically locked to the engine note
    // Routes through satNode = same tonal character as main engine sound
    if(_brkBurbleGain && _brkBurbleOsc){
      const brkRpmFactor = Math.max(0, (rpm - 1200) / 5000);
      const brkSpdFactor = Math.max(0, (spdKmh - 20) / 60);
      const burbleActive = brkActive && thr < 0.05;
      const burbleVol = burbleActive ? brkRpmFactor * brkSpdFactor * 0.22 * VOL.engine * VOL.burble : 0;
      _brkBurbleOsc.frequency.setTargetAtTime(fireHz * 1.5, now, 0.06);
      // Fade-in: 0.15s on first engage so it builds naturally, not pops in
      // Fade-out: 0.22s when throttle opens so tail overlaps engine ramp-up
      const burbleFadeTime = burbleActive ? (_brkWasOff ? 0.15 : 0.05) : (thr > 0.05 ? 0.22 : 0.12);
      _brkBurbleGain.gain.setTargetAtTime(burbleVol, now, burbleFadeTime);
      const burbleNoiseVol = burbleActive ? brkRpmFactor * brkSpdFactor * 0.12 * VOL.engine * VOL.burble : 0;
      if(_brkBurbleNoiseGain) _brkBurbleNoiseGain.gain.setTargetAtTime(burbleNoiseVol, now, burbleFadeTime);
    }

    // 4. Brake pops/crackles — lower RPM gate, higher intensity, pitch-matched to engine
    if(brkActive && thr < 0.05 && rpm > 1800 && spdKmh > 25 && !isPaused){
      const rpmFactor  = Math.min((rpm - 1800) / 4500, 1.0);
      const spdFactor  = Math.min((spdKmh - 25) / 80, 1.0);
      const popIntensity = rpmFactor * spdFactor * 1.4 * VOL.tyre;
      if(popIntensity > 0.04) playBrakePop(popIntensity, fireHz);
    }

    // 5. Brake lock rumble — directly tracks brakeLock physics value
    if(_brakeLockGain){
      const lockVol = brakeLock * 0.28 * VOL.tyre;
      const lockFreq = 80 + brakeLock * 100;
      _brakeLockGain.gain.setTargetAtTime(lockVol, now, 0.04);
      if(_brakeLockBP) _brakeLockBP.frequency.setTargetAtTime(lockFreq, now, 0.06);
    }
  }

  function setVol(ch,v){ VOL[ch]=v; }
  function setMute(on){ _muted=on; if(master) master.gain.setTargetAtTime(on?0:0.68,ctx.currentTime,0.1); }
  function resume(){ if(ctx&&ctx.state==='suspended') ctx.resume(); }

  // Called on START click — engine runs silently with high randomness (warmup feel)
  function startWarmup(){
    if(!_started) return;
    // Slam randomness to max range — wild unsettled engine character
    _rndFreq=1.03; _rndVol=1.04; _rndLP=1.06; _rndPhase=1.03;
    if(master) master.gain.setTargetAtTime(0,ctx.currentTime,0.05);
  }

  // Called on GO — fade in and let randomness settle back to normal over 2s
  let _warmupSettleStart=-1;
  function startGo(){
    if(!_started) return;
    _warmupSettleStart=ctx.currentTime;
    if(master) master.gain.setTargetAtTime(0.68,ctx.currentTime,0.35); // 0.35s fade-in
  }

  // Called inside update — settles randomness back to normal range after GO
  function _settleRandomness(now){
    if(_warmupSettleStart<0) return;
    const elapsed=now-_warmupSettleStart;
    if(elapsed>2.0){ _warmupSettleStart=-1; return; } // done
    // Lerp random range back toward 1.0 over 2 seconds
    const t=elapsed/2.0; // 0→1
    const maxRange=0.04*(1-t); // starts at ±4%, shrinks to ±0 at t=1
    // Constrain current rnd values toward 1.0
    _rndFreq  =1+((_rndFreq-1)*(1-t*0.08));
    _rndVol   =1+((_rndVol-1)*(1-t*0.08));
    _rndLP    =1+((_rndLP-1)*(1-t*0.08));
    _rndPhase =1+((_rndPhase-1)*(1-t*0.08));
  }

  function countdownFadeIn(dur){
    if(!master) return;
    const now=ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    // Read current value to avoid discontinuity click — ramp FROM where we are
    master.gain.setValueAtTime(0.0001, now);      // tiny non-zero floor (exponential needs >0)
    master.gain.exponentialRampToValueAtTime(0.68, now+dur); // exponential = smoother perceptually
  }

  function playUIClick(){
    const actx = ctx || (() => {
      try { return new (window.AudioContext||window.webkitAudioContext)(); } catch(e){ return null; }
    })();
    if(!actx) return;
    const dest = actx.destination;
    const now = actx.currentTime;
    const cleanup = !ctx ? ()=>setTimeout(()=>{ try{actx.close();}catch(e){} }, 400) : ()=>{};

    const mkN = (dur) => {
      const b = actx.createBuffer(1, actx.sampleRate*dur, actx.sampleRate);
      const d = b.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
      return b;
    };

    // Layer 1: crisp attack transient
    const ns = actx.createBufferSource(); ns.buffer = mkN(0.025);
    const hp = actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2400; hp.Q.value=0.6;
    const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=8000;
    const g1 = actx.createGain();
    g1.gain.setValueAtTime(0.045, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now+0.018);
    ns.connect(hp); hp.connect(lp); lp.connect(g1); g1.connect(dest);
    ns.start(now); ns.stop(now+0.025);
    // Layer 2: warm triangle body — delayed so attack lands first
    const osc = actx.createOscillator(); osc.type='triangle'; osc.frequency.value=720;
    const g2 = actx.createGain();
    g2.gain.setValueAtTime(0.0, now);
    g2.gain.linearRampToValueAtTime(0.028, now+0.006);
    g2.gain.exponentialRampToValueAtTime(0.001, now+0.042);
    osc.connect(g2); g2.connect(dest);
    osc.start(now); osc.stop(now+0.045);
    // Layer 3: micro tail
    const ns2 = actx.createBufferSource(); ns2.buffer = mkN(0.05);
    const bp2 = actx.createBiquadFilter(); bp2.type='bandpass'; bp2.frequency.value=1200; bp2.Q.value=2;
    const g3 = actx.createGain();
    g3.gain.setValueAtTime(0.0, now+0.012);
    g3.gain.linearRampToValueAtTime(0.010, now+0.018);
    g3.gain.exponentialRampToValueAtTime(0.001, now+0.065);
    ns2.connect(bp2); bp2.connect(g3); g3.connect(dest);
    ns2.start(now+0.012); ns2.stop(now+0.07);

    cleanup();
  }

  return{init,update,setMute,setVol,resume,startWarmup,startGo,countdownFadeIn,playUIClick,VOL,getCtx:()=>ctx};
})();

// ══════════════════════════════════════════════════════════════════
// GHOST AUDIO ENGINE — lightweight engine sound for ghost cars
// Shares the player's AudioContext. One instance handles all ghosts.
// Driven by interpolated rpm/spd/vx from recorded frames.
// Volume fades with distance from player.
// ══════════════════════════════════════════════════════════════════
const GHOST_SND = (()=>{
  const MAX_DIST = 55;
  const MIN_DIST = 3;
  const MAX_VOL  = 0.65;

  const SLOTS = 4;
  const slots = [];
  let _ctx = null;

  function _makeSlot(){
    // Chain: oscs+noise → sat → lp(RPM) → distLP(distance) → panner → master gain → out
    const master = _ctx.createGain(); master.gain.value = 0;
    master.connect(_ctx.destination);

    // Stereo panner — positions ghost left/right in headphones based on world angle
    const panner = _ctx.createStereoPanner ? _ctx.createStereoPanner() : null;
    if(panner){ panner.pan.value = 0; panner.connect(master); }

    // Distance LP: air absorption — bright close, muffled far
    const distLP = _ctx.createBiquadFilter(); distLP.type = 'lowpass';
    distLP.frequency.value = 3500; distLP.Q.value = 0.5;
    distLP.connect(panner || master);

    const lp = _ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800; lp.Q.value = 0.7;
    lp.connect(distLP);

    const sat = _ctx.createWaveShaper();
    const c = new Float32Array(256);
    for(let i=0;i<256;i++) c[i]=Math.tanh((i*2/255-1)*2.2);
    sat.curve = c; sat.oversample = '2x';
    sat.connect(lp);

    const oscs = [], gains = [];
    [0, 9, -6].forEach(detune=>{
      const o = _ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = 60; o.detune.value = detune;
      const g = _ctx.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(sat); o.start();
      oscs.push(o); gains.push(g);
    });

    const bufDur = 2, buf = _ctx.createBuffer(1, _ctx.sampleRate*bufDur, _ctx.sampleRate);
    const d = buf.getChannelData(0); let b0=0,b1=0,b2=0;
    for(let i=0;i<d.length;i++){
      const w=Math.random()*2-1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
      d[i]=(b0+b1+b2)*0.22;
    }
    const noise = _ctx.createBufferSource(); noise.buffer=buf; noise.loop=true;
    const nbp = _ctx.createBiquadFilter(); nbp.type='bandpass'; nbp.frequency.value=200; nbp.Q.value=2.5;
    const ng = _ctx.createGain(); ng.gain.value=0;
    noise.connect(nbp); nbp.connect(ng); ng.connect(sat); noise.start();

    return { master, panner, distLP, lp, oscs, gains, ng, nbp, active: false, ghostId: null };
  }

  function init(ctx){
    if(_ctx) return;
    _ctx = ctx;
    for(let i=0;i<SLOTS;i++) slots.push(_makeSlot());
  }

  function _spatial(gx, gz){
    const dx = gx - car.px, dz = gz - car.pz;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const volMul = (typeof _ghostVolMul !== 'undefined') ? _ghostVolMul : 1.0;
    const vol = Math.max(0, Math.min(1, 1-(dist-MIN_DIST)/(MAX_DIST-MIN_DIST))) * MAX_VOL * volMul;

    // Air absorption: 3500Hz close → 380Hz far (exponential)
    const df = Math.min(1, Math.max(0, (dist-6)/(MAX_DIST-6)));
    const lpFreq = 3500 * Math.pow(0.109, df);

    // Stereo pan: project ghost onto camera right vector (cos h, -sin h)
    const ch = Math.cos(car.heading), sh = Math.sin(car.heading);
    const dotRight = dx * ch - dz * sh;
    const pan = Math.max(-1, Math.min(1, dotRight / Math.max(dist, 1)))
              * 0.75
              * Math.min(1, dist / 10); // no pan when very close (alongside)

    return { vol, lpFreq, pan };
  }

  function updateSlot(slotIdx, rpm, spd, vx, gx, gz, active){
    if(!_ctx || slotIdx >= slots.length) return;
    const s = slots[slotIdx];
    const now = _ctx.currentTime;

    if(!active){
      s.master.gain.cancelScheduledValues(now);
      s.master.gain.setValueAtTime(0, now);
      return;
    }

    const { vol, lpFreq, pan } = _spatial(gx, gz);
    s.master.gain.setTargetAtTime(vol, now, 0.08);
    if(s.panner) s.panner.pan.setTargetAtTime(pan, now, 0.04);
    s.distLP.frequency.setTargetAtTime(lpFreq, now, 0.05);
    if(vol < 0.002) return;

    const rpmN = Math.max(0.04, Math.min(1, (rpm-900)/7100));
    const fireHz = Math.max(40, rpm/15);
    const oscVol = (0.3 + rpmN*0.55)*0.7;

    s.oscs.forEach((o,i)=>{
      o.frequency.setTargetAtTime(fireHz*0.5, now, 0.03);
      s.gains[i].gain.setTargetAtTime(oscVol, now, 0.03);
    });
    s.lp.frequency.setTargetAtTime(200 + rpmN*1800, now, 0.05);
    s.nbp.frequency.setTargetAtTime(fireHz*0.8, now, 0.04);
    s.ng.gain.setTargetAtTime(rpmN*0.35, now, 0.04);
  }

  function stopAll(){
    if(!_ctx) return;
    const now = _ctx.currentTime;
    slots.forEach(s=>{
      s.master.gain.cancelScheduledValues(now);
      s.master.gain.setValueAtTime(0, now);
    });
  }

  return { init, updateSlot, stopAll };
})();




