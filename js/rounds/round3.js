// ── DUEL ENGINE (Round 3) ──
// ══════════════════════════════════════════
const DUEL_PLAYER_MAX = 8;
const DUEL_ENEMY_MAX  = 16;
const ACTIONS = ['strike','guard','void'];

// Outcome matrix [player][enemy] → [playerDmg, enemyDmg, msg]
// strike beats void (void user punished), guard beats strike, void breaks guard
const OUTCOME = {
  'strike-strike': [1, 1,  'clash.'],
  'strike-guard':  [0, 0,  'deflected.'],
  'strike-void':   [0, 2,  'exposed — void shatters through.'],
  'guard-strike':  [0, 1,  'absorbed.'],
  'guard-guard':   [0, 0,  'standoff.'],
  'guard-void':    [2, 0,  'guard broken.'],
  'void-strike':   [2, 0,  'void dissolves your strike.'],
  'void-guard':    [0, 2,  'void tears the guard open.'],
  'void-void':     [1, 1,  'mutual annihilation.'],
};


// ── DUEL SFX (Web Audio procedural) ──
function duelSFX(type){
  if(sfxMuted)return;
  try{
    const ctx=getAudio();
    const now=ctx.currentTime;
    if(type==='strike'){
      // Sharp metallic crack
      const buf=ctx.createBuffer(1,ctx.sampleRate*0.12,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.5);
      const src=ctx.createBufferSource(); src.buffer=buf;
      const g=ctx.createGain(); g.gain.setValueAtTime(0.6,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.1);
      const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1800; f.Q.value=0.8;
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
    } else if(type==='guard'){
      // Low thud + shimmer
      const osc=ctx.createOscillator(); osc.type='triangle'; osc.frequency.setValueAtTime(90,now); osc.frequency.exponentialRampToValueAtTime(40,now+0.18);
      const g=ctx.createGain(); g.gain.setValueAtTime(0.5,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.2);
      osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(now+0.2);
      // shimmer layer
      const buf=ctx.createBuffer(1,ctx.sampleRate*0.08,ctx.sampleRate);
      const dat=buf.getChannelData(0);
      for(let i=0;i<dat.length;i++) dat[i]=(Math.random()*2-1)*0.3*Math.pow(1-i/dat.length,1.5);
      const src2=ctx.createBufferSource(); src2.buffer=buf;
      const g2=ctx.createGain(); g2.gain.setValueAtTime(0.25,now);
      const f2=ctx.createBiquadFilter(); f2.type='highpass'; f2.frequency.value=3000;
      src2.connect(f2); f2.connect(g2); g2.connect(ctx.destination); src2.start(now+0.02);
    } else if(type==='void'){
      // Deep dissonant drone swell
      const freqs=[55,82,110];
      freqs.forEach((fr,i)=>{
        const osc=ctx.createOscillator(); osc.type='sawtooth'; osc.frequency.setValueAtTime(fr*(1+i*0.003),now);
        const g=ctx.createGain(); g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.18,now+0.06); g.gain.exponentialRampToValueAtTime(0.001,now+0.45);
        const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=400+i*60;
        osc.connect(f); f.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(now+0.45);
      });
    } else if(type==='hit_player'){
      // High distorted screech — you took damage
      const osc=ctx.createOscillator(); osc.type='sawtooth'; osc.frequency.setValueAtTime(520,now); osc.frequency.exponentialRampToValueAtTime(180,now+0.14);
      const g=ctx.createGain(); g.gain.setValueAtTime(0.55,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.16);
      const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=900; f.Q.value=2;
      osc.connect(f); f.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(now+0.16);
    } else if(type==='hit_enemy'){
      // Heavy crunch — void takes damage
      const buf=ctx.createBuffer(1,ctx.sampleRate*0.14,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=Math.tanh((Math.random()*2-1)*4)*Math.pow(1-i/d.length,1.8);
      const src=ctx.createBufferSource(); src.buffer=buf;
      const g=ctx.createGain(); g.gain.setValueAtTime(0.7,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.12);
      const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=600;
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
    } else if(type==='win'){
      // Slow ascending shimmer
      [220,330,440,550].forEach((fr,i)=>{
        const osc=ctx.createOscillator(); osc.type='sine'; osc.frequency.value=fr;
        const g=ctx.createGain(); g.gain.setValueAtTime(0,now+i*0.1); g.gain.linearRampToValueAtTime(0.22,now+i*0.1+0.08); g.gain.exponentialRampToValueAtTime(0.001,now+i*0.1+0.5);
        osc.connect(g); g.connect(ctx.destination); osc.start(now+i*0.1); osc.stop(now+i*0.1+0.5);
      });
    } else if(type==='death'){
      // Grinding descent
      const osc=ctx.createOscillator(); osc.type='sawtooth'; osc.frequency.setValueAtTime(300,now); osc.frequency.exponentialRampToValueAtTime(30,now+0.6);
      const g=ctx.createGain(); g.gain.setValueAtTime(0.6,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.65);
      const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(800,now); f.frequency.exponentialRampToValueAtTime(80,now+0.6);
      osc.connect(f); f.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(now+0.65);
    }
  }catch(e){}
}

let duelPlayerHP, duelEnemyHP;
let duelPlayerChoice = null;
let duelPhase = 'choose'; // choose | reveal | locked
let duelRaf = null;
let duelParticles = [];
let duelPlayerTrails = [];
let duelShake = 0;
let duelEntityPhase = 0;
let duelAnimState = {player:{anim:null,frame:0,action:null}, enemy:{anim:null,frame:0,action:null}};
let duelVoidTrails = []; // Dawn Warrior afterimage trail for void strike

const duelScreen    = document.getElementById('duel-screen');
const duelCanvas    = document.getElementById('duel-canvas');
const duelCtx       = duelCanvas.getContext('2d');
const duelPlayerBar = document.getElementById('duel-player-bar');
const duelEnemyBar  = document.getElementById('duel-enemy-bar');
const duelPlayerHPEl= document.getElementById('duel-player-hp');
const duelEnemyHPEl = document.getElementById('duel-enemy-hp');
const duelPhaseEl   = document.getElementById('duel-phase');
const duelMsgEl     = document.getElementById('duel-msg');
const duelBtns      = {
  strike: document.getElementById('duel-btn-strike'),
  guard:  document.getElementById('duel-btn-guard'),
  void:   document.getElementById('duel-btn-void'),
};

// Enemy AI — weighted by HP ratio
function enemyChoose(){
  const ratio = duelEnemyHP / DUEL_ENEMY_MAX; // 1=full, 0=dying
  // At full HP: aggressive (strike-heavy)
  // At low HP: defensive + heal tendency
  // heal = guard used conservatively as "recover" — not a separate action,
  // just weighted toward guard + we grant +1 hp on guard-guard
  let w;
  if(ratio > 0.6)      w = {strike:0.55, guard:0.2, void:0.25};
  else if(ratio > 0.3) w = {strike:0.35, guard:0.35, void:0.3};
  else                 w = {strike:0.15, guard:0.55, void:0.3};
  const r = Math.random();
  let acc = 0;
  for(const [k,v] of Object.entries(w)){
    acc += v;
    if(r < acc) return k;
  }
  return 'guard';
}

function duelSetButtons(enabled){
  Object.values(duelBtns).forEach(b=>{ b.disabled = !enabled; });
}

function duelHighlight(choice){
  Object.entries(duelBtns).forEach(([k,b])=>{
    b.classList.toggle('selected', k===choice);
  });
}

function duelUpdateBars(){
  duelPlayerBar.style.width = Math.max(0,(duelPlayerHP/DUEL_PLAYER_MAX)*100)+'%';
  duelEnemyBar.style.width  = Math.max(0,(duelEnemyHP/DUEL_ENEMY_MAX)*100)+'%';
  duelPlayerHPEl.textContent = Math.max(0,duelPlayerHP);
  duelEnemyHPEl.textContent  = Math.max(0,duelEnemyHP);
}

function duelSpawnParticles(side, count, col){
  const cw = duelCanvas.width, ch = duelCanvas.height;
  const x = side==='player' ? cw*0.28 : cw*0.72;
  const y = ch * 0.5;
  for(let i=0;i<count;i++){
    const a = Math.random()*Math.PI*2;
    const s = 1.5+Math.random()*3;
    duelParticles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,col:col||'#fff'});
  }
}

function duelResolveTurn(playerAction){
  duelPhase = 'reveal';
  duelPhaseEl.textContent = '——';
  duelSetButtons(false);

  const enemyAction = enemyChoose();
  const key = playerAction+'-'+enemyAction;
  let [pDmg, eDmg, msg] = OUTCOME[key];

  // Fire action SFX
  duelSFX(playerAction);

  // Trigger animations
  duelAnimState.player.anim = playerAction;
  duelAnimState.player.frame = 0;
  duelAnimState.enemy.anim = enemyAction;
  duelAnimState.enemy.frame = 0;

  // Heal mechanic: guard-guard both recover 1 if below max
  if(playerAction==='guard' && enemyAction==='guard'){
    if(duelPlayerHP < DUEL_PLAYER_MAX){ duelPlayerHP++; msg = 'mutual guard — you recover.'; }
    if(duelEnemyHP < DUEL_ENEMY_MAX)  { duelEnemyHP++;  }
  }

  duelPlayerHP -= pDmg;
  duelEnemyHP  -= eDmg;
  duelPlayerHP = Math.max(0, duelPlayerHP);
  duelEnemyHP  = Math.max(0, duelEnemyHP);

  // Shake + particles + hit SFX
  if(pDmg > 0){ duelShake = 14; duelSpawnParticles('player', 14, '#fff'); duelSFX('hit_player'); }
  if(eDmg > 0){ duelShake = 10; duelSpawnParticles('enemy',  18, '#fff'); duelSFX('hit_enemy'); }

  if(duelPlayerHP === 1 && !gamblersGambitUsed) {
    gamblersGambitUsed = true;
    duelPhase = 'locked';
    duelPhaseEl.textContent = 'GAMBLER\'S GAMBIT';
    duelMsgEl.textContent = '...';
    
    // SVG glitch burst, CRT distortion, white flash
    duelScreen.style.filter = 'contrast(200%) invert(1) hue-rotate(90deg)';
    document.body.style.backgroundColor = '#fff';
    setTimeout(() => { document.body.style.backgroundColor = ''; duelScreen.style.filter = ''; }, 100);
    setTimeout(() => { document.body.style.backgroundColor = '#fff'; duelScreen.style.filter = 'contrast(150%) hue-rotate(180deg)'; }, 200);
    setTimeout(() => { document.body.style.backgroundColor = ''; duelScreen.style.filter = ''; }, 400);

    // Some glitch particles
    for(let i=0; i<30; i++) {
        duelParticles.push({
            x: 0, y: (Math.random()-0.5)*100,
            vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15,
            life: 1.0, col: Math.random()>0.5?'#fff':'#f0f'
        });
    }

    setTimeout(() => {
        if (Math.random() < 0.4) {
            duelEnemyHP = 0;
            duelMsgEl.textContent = 'GAMBIT WON.';
        } else {
            duelPlayerHP = 0;
            duelMsgEl.textContent = 'GAMBIT LOST.';
        }
        duelUpdateBars();
        setTimeout(()=>{
            duelPhase = 'locked';
            duelPhaseEl.textContent = '';
            duelMsgEl.textContent = '';
            setTimeout(()=> duelEnd(duelPlayerHP > 0), 700);
        }, 1500);
    }, 1000);
    return;
  }

  duelUpdateBars();
  duelMsgEl.textContent = msg;

  // Show enemy choice briefly
  duelPhaseEl.textContent = 'void chose: '+enemyAction;

  setTimeout(()=>{
    duelHighlight(null);
    duelPlayerChoice = null;

    if(duelPlayerHP <= 0){
      duelPhase = 'locked';
      duelPhaseEl.textContent = '';
      duelMsgEl.textContent = '';
      setTimeout(()=> duelEnd(false), 700);
      return;
    }
    if(duelEnemyHP <= 0){
      duelPhase = 'locked';
      duelPhaseEl.textContent = '';
      duelMsgEl.textContent = '';
      setTimeout(()=> duelEnd(true), 700);
      return;
    }

    duelPhase = 'choose';
    duelPhaseEl.textContent = 'choose';
    duelSetButtons(true);
    duelMsgEl.textContent = '';
  }, 1400);
}

function duelEnd(won){
  cancelAnimationFrame(duelRaf);
  duelRaf = null;
  duelScreen.classList.remove('active');
  gameScreen.classList.remove('active');

  if(won){
    duelSFX('win');
    setTimeout(()=>glitchToPortal(), 400);
  } else {
    duelSFX('death');
    showFail(2);
  }
}

// ── VOID ENTITY RENDERER (canvas) ──
function duelResizeCanvas(){
  const wrap = duelCanvas.parentElement;
  duelCanvas.width  = wrap.offsetWidth  || window.innerWidth;
  duelCanvas.height = wrap.offsetHeight || window.innerHeight * 0.55;
}

function duelDrawFrame(){
  const cw = duelCanvas.width, ch = duelCanvas.height;
  duelCtx.clearRect(0,0,cw,ch);

  // Screen shake offset
  let ox=0, oy=0;
  if(duelShake>0){
    ox=(Math.random()-0.5)*duelShake;
    oy=(Math.random()-0.5)*duelShake*0.4;
    duelShake = Math.max(0, duelShake-1.4);
  }

  duelCtx.save();
  duelCtx.translate(ox,oy);

  const t = Date.now()*0.001;
  duelEntityPhase = t;

  // ── Player phantom trails ──
  duelPlayerTrails = duelPlayerTrails.filter(tr=>tr.life>0);
  for(const tr of duelPlayerTrails){
    duelCtx.save();
    duelCtx.translate(tr.x, tr.y);
    duelCtx.scale(tr.scale, tr.scale);
    duelCtx.transform(1, tr.skew, 0, 1, 0, 0);
    const trSz=28;
    duelCtx.globalAlpha=tr.alpha*tr.life*0.45;
    duelCtx.strokeStyle='#fff';
    duelCtx.lineWidth=1.5;
    duelCtx.beginPath();
    duelCtx.moveTo(0,-trSz);
    duelCtx.lineTo(trSz*0.87,trSz*0.5);
    duelCtx.lineTo(-trSz*0.87,trSz*0.5);
    duelCtx.closePath();
    duelCtx.stroke();
    // Slash arc on trail
    duelCtx.globalAlpha=tr.alpha*tr.life*0.3;
    duelCtx.lineWidth=1;
    duelCtx.beginPath();
    duelCtx.arc(trSz*0.6, 0, trSz*0.7, -Math.PI*0.6, Math.PI*0.3);
    duelCtx.stroke();
    duelCtx.restore();
    tr.life -= 0.14;
  }

  // ── Player sigil (left) ──
  const px = cw*0.25, py = ch*0.5;
  const pAlive = duelPlayerHP > 0;
  duelCtx.save();
  duelCtx.translate(px, py);
  if(pAlive){
    const pa = duelAnimState.player;
    pa.frame = (pa.frame||0) + 1;
    let extraX=0, extraY=0, scaleMod=1, alphaMod=1, skewMod=0;
    if(pa.anim==='strike'){
      // Lunge right — jab forward
      const f=Math.min(pa.frame/8,1);
      const retract=pa.frame>8?Math.min((pa.frame-8)/8,1):0;
      extraX = Math.sin(f*Math.PI)*38*(1-retract);
      extraY = -Math.sin(f*Math.PI)*6*(1-retract);
      scaleMod = 1+f*0.18*(1-retract);
      if(pa.frame>18) pa.anim=null;
    } else if(pa.anim==='guard'){
      // Shrink inward, brighten
      const f=Math.min(pa.frame/6,1);
      const relax=pa.frame>10?Math.min((pa.frame-10)/10,1):0;
      scaleMod = 1-f*0.22*(1-relax);
      alphaMod = 1+f*0.4*(1-relax);
      if(pa.frame>22) pa.anim=null;
    } else if(pa.anim==='void'){
      // Dawn Warrior phantom slash — burst right, afterimage trail, snap back
      const BURST=10, HOLD=4, RETRACT=8;
      const total=BURST+HOLD+RETRACT;
      if(pa.frame<=BURST){
        const f=pa.frame/BURST;
        const ease=1-Math.pow(1-f,3); // ease out — instant burst
        extraX = ease*80;
        extraY = -ease*10;
        scaleMod = 1+ease*0.4;
        skewMod = ease*0.5;
        alphaMod = 1+ease*0.5;
        // Seed player afterimage trail every 2 frames
        if(pa.frame%2===0){
          duelPlayerTrails.push({x:px+extraX, y:py+extraY, scale:scaleMod, skew:skewMod, alpha:0.5, life:1});
        }
      } else if(pa.frame<=BURST+HOLD){
        extraX=80; extraY=-10; scaleMod=1.4; skewMod=0.5; alphaMod=1.5;
      } else {
        // Elastic snap back
        const f=(pa.frame-BURST-HOLD)/RETRACT;
        const snap=Math.pow(f,0.35);
        extraX = 80*(1-snap);
        extraY = -10*(1-snap);
        scaleMod = 1+0.4*(1-snap);
        skewMod = 0.5*(1-snap);
        alphaMod = 1+0.5*(1-snap);
      }
      if(pa.frame>total) pa.anim=null;
    }
    duelCtx.save();
    duelCtx.translate(extraX, extraY);
    duelCtx.scale(scaleMod, scaleMod);
    duelCtx.transform(1, skewMod, 0, 1, 0, 0);
    const sz = 28 + Math.sin(t*1.1)*2;
    duelCtx.strokeStyle = 'rgba(255,255,255,'+Math.min(1,0.9*alphaMod)+')';
    duelCtx.lineWidth = 1.2 + (pa.anim?0.8:0);
    duelCtx.beginPath();
    duelCtx.moveTo(0,-sz);
    duelCtx.lineTo(sz*0.87, sz*0.5);
    duelCtx.lineTo(-sz*0.87, sz*0.5);
    duelCtx.closePath();
    duelCtx.stroke();
    // Strike: draw a lance line
    if(pa.anim==='strike'){
      const lf=Math.min(pa.frame/6,1);
      duelCtx.strokeStyle='rgba(255,255,255,'+(lf*0.7)+')';
      duelCtx.lineWidth=1;
      duelCtx.beginPath();duelCtx.moveTo(0,0);duelCtx.lineTo(sz*lf*1.4,0);duelCtx.stroke();
    }
    // Guard: draw a shield arc
    if(pa.anim==='guard'){
      const gf=Math.min(pa.frame/6,1);
      duelCtx.strokeStyle='rgba(255,255,255,'+(gf*0.5)+')';
      duelCtx.lineWidth=1.5;
      duelCtx.beginPath();duelCtx.arc(sz*0.5,0,sz*0.55,-Math.PI*0.7,Math.PI*0.7);duelCtx.stroke();
    }
    // Void: phantom slash arc — sweeps from top-right diagonal
    if(pa.anim==='void'){
      const BURST=10,HOLD=4;
      let slashProgress=0;
      if(pa.frame<=BURST) slashProgress=pa.frame/BURST;
      else if(pa.frame<=BURST+HOLD) slashProgress=1;
      else slashProgress=1-Math.pow((pa.frame-BURST-HOLD)/8,0.4);
      slashProgress=Math.max(0,Math.min(1,slashProgress));
      // Primary slash arc
      const arcR=sz*1.6;
      const arcStart=-Math.PI*0.75;
      const arcEnd=Math.PI*0.1;
      const arcSweep=arcEnd-arcStart;
      duelCtx.save();
      duelCtx.strokeStyle='rgba(255,255,255,'+(slashProgress*0.9)+')';
      duelCtx.lineWidth=1.8;
      duelCtx.beginPath();
      duelCtx.arc(sz*0.3, sz*0.2, arcR, arcStart, arcStart+arcSweep*slashProgress);
      duelCtx.stroke();
      // Secondary thinner echo arc (offset)
      duelCtx.strokeStyle='rgba(255,255,255,'+(slashProgress*0.3)+')';
      duelCtx.lineWidth=0.8;
      duelCtx.beginPath();
      duelCtx.arc(sz*0.3+4, sz*0.2+2, arcR*0.85, arcStart, arcStart+arcSweep*slashProgress);
      duelCtx.stroke();
      // Tip flash at end of arc
      if(slashProgress>0.7){
        const tipAngle=arcStart+arcSweep*slashProgress;
        const tipX=sz*0.3+Math.cos(tipAngle)*arcR;
        const tipY=sz*0.2+Math.sin(tipAngle)*arcR;
        duelCtx.fillStyle='rgba(255,255,255,'+(slashProgress*0.8)+')';
        duelCtx.beginPath();duelCtx.arc(tipX,tipY,2.5,0,Math.PI*2);duelCtx.fill();
      }
      duelCtx.restore();
    }
    duelCtx.fillStyle='rgba(255,255,255,0.6)';
    duelCtx.beginPath();duelCtx.arc(0,0,2.5,0,Math.PI*2);duelCtx.fill();
    duelCtx.restore();
  }
  duelCtx.restore();

  // ── Void Entity (right) ──
  const ex = cw*0.72, ey = ch*0.5;
  const eAlive = duelEnemyHP > 0;
  const eRatio = duelEnemyHP / DUEL_ENEMY_MAX;
  // Enemy animation
  const ea = duelAnimState.enemy;
  ea.frame = (ea.frame||0) + 1;
  let eExtraX=0, eScaleMod=1, eAlphaMod=1, eSkewMod=0;
  if(ea.anim==='strike'){
    // Dawn Warrior: rapid burst left → snap back, seeding afterimage trail
    const BURST_FRAMES=10, HOLD_FRAMES=4, RETRACT_FRAMES=8;
    const total=BURST_FRAMES+HOLD_FRAMES+RETRACT_FRAMES;
    if(ea.frame<=BURST_FRAMES){
      const f=ea.frame/BURST_FRAMES;
      const ease=1-Math.pow(1-f,3);
      eExtraX = -ease*80;
      eScaleMod = 1+ease*0.4;
      eAlphaMod = 1+ease*0.5;
      eSkewMod = -ease*0.5;
      if(ea.frame%2===0){
        duelPlayerTrails.push({x:ex+eExtraX, y:ey, scale:eScaleMod, skew:eSkewMod, alpha:0.3, life:1});
      }
    } else if(ea.frame<=BURST_FRAMES+HOLD_FRAMES){
      eExtraX=-80; eScaleMod=1.4; eAlphaMod=1.5; eSkewMod=-0.5;
    } else {
      const f=(ea.frame-BURST_FRAMES-HOLD_FRAMES)/RETRACT_FRAMES;
      const snap=Math.pow(f,0.35);
      eExtraX = -80*(1-snap);
      eScaleMod = 1+0.4*(1-snap);
      eAlphaMod = 1+0.5*(1-snap);
      eSkewMod = -0.5*(1-snap);
    }
    if(ea.frame>total) ea.anim=null;
  } else if(ea.anim==='guard'){
    const f=Math.min(ea.frame/6,1);
    const relax=ea.frame>10?Math.min((ea.frame-10)/10,1):0;
    eScaleMod = 1-f*0.22*(1-relax);
    eAlphaMod = 1+f*0.4*(1-relax);
    if(ea.frame>22) ea.anim=null;
  } else if(ea.anim==='void'){
    // Void halo charge — inward pulse + spiral dimness
    const CHARGE=12, HOLD=6, RETRACT=10;
    const total=CHARGE+HOLD+RETRACT;
    if(ea.frame<=CHARGE){
      const f=ea.frame/CHARGE;
      const ease=Math.pow(f,1.5);
      eScaleMod = 1.2+ease*0.5;
      eAlphaMod = 0.7+ease*0.8;
    } else if(ea.frame<=CHARGE+HOLD){
      eScaleMod = 1.7; eAlphaMod = 1.5;
    } else {
      const f=(ea.frame-CHARGE-HOLD)/RETRACT;
      const ease=Math.pow(f,0.4);
      eScaleMod = 1.7*(1-ease)+1*ease;
      eAlphaMod = 1.5*(1-ease)+0.6*ease;
    }
    if(ea.frame>total) ea.anim=null;
  }

  if(eAlive){
    duelCtx.save();
    duelCtx.translate(ex+eExtraX, ey);
    duelCtx.scale(eScaleMod, eScaleMod);
    duelCtx.transform(1, eSkewMod, 0, 1, 0, 0);
    const eSz = 28 + Math.sin(t*1.1)*2;
    duelCtx.strokeStyle = 'rgba(255,255,255,'+Math.min(1,0.9*eAlphaMod)+')';
    duelCtx.lineWidth = 1.2 + (ea.anim?0.8:0);
    duelCtx.beginPath();
    duelCtx.moveTo(0,-eSz);
    duelCtx.lineTo(eSz*0.87, eSz*0.5);
    duelCtx.lineTo(-eSz*0.87, eSz*0.5);
    duelCtx.closePath();
    duelCtx.stroke();

    // Enemy action visuals
    if(ea.anim==='strike'){
      const lf=Math.min(ea.frame/6,1);
      duelCtx.strokeStyle='rgba(255,255,255,'+(lf*0.7)+')';
      duelCtx.lineWidth=1;
      duelCtx.beginPath();duelCtx.moveTo(0,0);duelCtx.lineTo(-eSz*lf*1.4,0);duelCtx.stroke();
    }
    if(ea.anim==='guard'){
      const gf=Math.min(ea.frame/6,1);
      duelCtx.strokeStyle='rgba(255,255,255,'+(gf*0.5)+')';
      duelCtx.lineWidth=1.5;
      duelCtx.beginPath();duelCtx.arc(-eSz*0.5,0,eSz*0.55,-Math.PI*0.3,Math.PI*0.3);duelCtx.stroke();
    }
    if(ea.anim==='void'){
      // Void halo — pulsing aura
      const hf=Math.min(ea.frame/8,1);
      duelCtx.strokeStyle='rgba(200,100,255,'+Math.max(0.1,hf*0.6)+')';
      duelCtx.lineWidth=1.5;
      duelCtx.beginPath();duelCtx.arc(0,0,eSz*(1.3+hf*0.5),0,Math.PI*2);duelCtx.stroke();
      // Inner void circle
      duelCtx.strokeStyle='rgba(200,100,255,'+Math.max(0.1,hf*0.3)+')';
      duelCtx.lineWidth=1;
      duelCtx.beginPath();duelCtx.arc(0,0,eSz*1.8,0,Math.PI*2);duelCtx.stroke();
    }

    duelCtx.fillStyle='rgba(255,255,255,0.6)';
    duelCtx.beginPath();duelCtx.arc(0,0,2.5,0,Math.PI*2);duelCtx.fill();
    duelCtx.restore();
  }

  // ── Particles ──
  duelParticles = duelParticles.filter(p=>p.life>0);
  for(const p of duelParticles){
    duelCtx.save();
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.02;
    duelCtx.globalAlpha = p.life * 0.8;
    duelCtx.fillStyle = p.col;
    duelCtx.beginPath();
    duelCtx.arc(p.x, p.y, 1+Math.random()*1.5, 0, Math.PI*2);
    duelCtx.fill();
    duelCtx.restore();
  }

  duelCtx.restore();
}

function startDuel() {
  duelPlayerHP = DUEL_PLAYER_MAX;
  duelEnemyHP = DUEL_ENEMY_MAX;
  duelPlayerChoice = null;
  duelPhase = 'choose';
  duelParticles = [];
  duelPlayerTrails = [];
  duelVoidTrails = [];
  duelShake = 0;
  duelEntityPhase = 0;
  duelAnimState = {player:{anim:null,frame:0,action:null}, enemy:{anim:null,frame:0,action:null}};
  
  duelUpdateBars();
  duelPhaseEl.textContent = 'choose';
  duelMsgEl.textContent = '';
  duelSetButtons(true);
  
  duelScreen.classList.add('active');
  duelResizeCanvas();
  window.addEventListener('resize', duelResizeCanvas);
  if (!duelRaf) duelDrawFrame();
}

function stopDuel() {
  if (duelRaf) {
    cancelAnimationFrame(duelRaf);
    duelRaf = null;
  }
  duelScreen.classList.remove('active');
  window.removeEventListener('resize', duelResizeCanvas);
}

export { startDuel, stopDuel, duelSFX, enemyChoose, duelSetButtons, duelHighlight, duelUpdateBars, duelSpawnParticles, duelResolveTurn, duelEnd, duelResizeCanvas, duelDrawFrame };
