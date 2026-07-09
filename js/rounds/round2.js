// ── VOID INVADERS ENGINE ──
import { state } from '../state.js';
import { field, msgEl, setComboValue, showFail } from '../ui.js';
import { playThud, playBulletFire, playMissileFire, playEnemyDeath, playWaveClear,
  playUpgradePick, playAoeTrigger, playMachinaBurst, playNukaActivate, playNukaSuccess,
  playPlayerDamage } from '../audio.js';
import { endRound } from '../game.js';

let invCanvas=null,invCtx=null,invRaf=null;
let invEntities=[],invBullets=[],invParticles=[];
let invShooterX=0,invDescentY=0,invMouseDown=false,invFireInterval=null;
const INV_BULLET_SPEED=28,INV_FIRE_RATE=120;
const INV_BULLET_SPEED_UPGRADED=INV_BULLET_SPEED*1.25;

// Glyph sets — increasingly abstract per wave
const INV_GLYPHS_W1=['⌖','⊕','⊗','◈','⌬','⍟','⎔','⊞'];
const INV_GLYPHS_W2=['⌘','⍜','⌂','⍝','⌇','⍣','⌾','⍤'];
const INV_GLYPHS_W3=['⌁','⍯','⌀','⍬','⌃','⍮','⌤','⍭'];
const INV_GLYPHS_W4=['⎎','⍫','⎍','⍪','⎌','⍩','⎋','⍨'];
const INV_GLYPHS_W5=['⍧','⍦','⍥','⍤','⍣','⍢','⍡','⍠'];
const INV_GLYPH_SETS=[INV_GLYPHS_W1,INV_GLYPHS_W2,INV_GLYPHS_W3,INV_GLYPHS_W4,INV_GLYPHS_W5];

// Wave config: {cols, rows, descentSpeed, hp_top, hp_rest}
const INV_WAVE_CONFIG=[
  {cols:8,rows:4,descentSpeed:0.2,hpTop:2,hpRest:1},   // wave 1
  {cols:8,rows:4,descentSpeed:0.4,hpTop:2,hpRest:1},   // wave 2
  {cols:9,rows:4,descentSpeed:0.6,hpTop:3,hpRest:1},   // wave 3
  {cols:9,rows:5,descentSpeed:0.8,hpTop:3,hpRest:2},   // wave 4
  {cols:10,rows:5,descentSpeed:1.0,hpTop:4,hpRest:2},  // wave 5
  null,                                                  // wave 6 — boss
];
const INV_BOSS_HP=313;

// Player HP
const PLAYER_MAX_HP=100;
let invPlayerHp=PLAYER_MAX_HP;

// Boss abilities
let bossShockwaves=[];
let bossPincers=[];
let bossShockwaveTimer=null;
let bossPincerTimer=null;
let bossPhase2=false;
let bossTeleportTimer=null;
let bossTeleportFlash=0; // frames remaining for landing flash
const BOSS_SHOCKWAVE_INTERVAL=3500;      // phase 1: not active; phase 2: 3500→3000ms
const BOSS_PINCER_CD=4000;               // phase 1: 4000ms; phase 2: 3500ms
const BOSS_SHOCKWAVE_R_MAX_P1=120;
const BOSS_SHOCKWAVE_DURATION=4000;
const BOSS_PINCER_SPEED=5.25;            // was 3.5 × 1.5 — pincer active from phase 1
const BOSS_WAVE_SPEED=4.8;               // was 3.2 × 1.5 — wave active from phase 2

// VFX sprite sheet — wave ability
const VFX_WAVE_FRAMES=26;
const VFX_WAVE_FRAME_W=480;
const VFX_WAVE_FRAME_H=270;
let vfxWaveImg=null;
let activeVfx=[]; // {img, frameW, frameH, totalFrames, frame, x, y, w, h, blendMode}

function loadVfxAssets(){
  vfxWaveImg=new Image();
  vfxWaveImg.src='assets/vfx_wave.png';
}

function spawnVfxWave(x, y){
  if(!vfxWaveImg||!vfxWaveImg.complete)return;
  // Scale to ~40% of canvas width, centred on impact point
  const w=invCanvas?invCanvas.width*0.42:200;
  const h=w*(VFX_WAVE_FRAME_H/VFX_WAVE_FRAME_W);
  activeVfx.push({
    img:vfxWaveImg,
    frameW:VFX_WAVE_FRAME_W, frameH:VFX_WAVE_FRAME_H,
    totalFrames:VFX_WAVE_FRAMES,
    frame:0,
    x:x-w/2, y:y-h/2,
    w, h,
    blendMode:'lighter'
  });
}

// Boss sprite pool — one chosen at random on spawn
const BOSS_SPRITES=['ꋫ','ꊰ','ꉣ','ꇓ','ꆼ'];

let bossGrowthScale=1;    // lerps to 1.38 at phase 2 transition
let bossGlitchBurst=0;    // frames remaining for phase 2 glitch burst

let invWave=0;        // 0-indexed, 0-5
let invTransitioning=false;
let invUpgrade=null;
let invBossUpgrade=null; // additional upgrade chosen at boss start

function updatePlayerHpBar(){
  // Player HP is drawn on-canvas each frame in invDraw — nothing to update in DOM
}

function damagePlayer(amount){
  const prevHp=invPlayerHp;
  invPlayerHp=Math.max(0,invPlayerHp-amount);
  try{playPlayerDamage();}catch(e){}
  triggerHpDrainAnimation(prevHp, invPlayerHp);
  updatePlayerHpBar();
  if(invPlayerHp<=0){
    state.running=false;clearInterval(state.bTimer);
    showFail(state.currentRound);
  }
}

let _hpScreenFlashRaf=null;
let _hpAberrationFrames=0; // frames remaining for chromatic aberration
let _hpGlitchFrames=0;     // frames remaining for glitch displacement

// Player HP bar is drawn on-canvas in invDraw (bottom strip).
// This function triggers the screen flash, aberration, and glitch VFX on damage.
function triggerHpDrainAnimation(fromHp, toHp){
  if(!invCanvas||!invCtx)return;
  // Start aberration + glitch
  _hpAberrationFrames=18;
  _hpGlitchFrames=10;

  // Primary vignette flash
  if(_hpScreenFlashRaf){cancelAnimationFrame(_hpScreenFlashRaf);_hpScreenFlashRaf=null;}
  let flashAlpha=0.32;
  const flashStep=()=>{
    if(!invCtx||!invCanvas){_hpScreenFlashRaf=null;return;}
    const cw=invCanvas.width,ch=invCanvas.height;
    invCtx.save();
    invCtx.globalAlpha=flashAlpha;
    const grad=invCtx.createRadialGradient(cw/2,ch/2,ch*0.08,cw/2,ch/2,ch*0.9);
    grad.addColorStop(0,'rgba(180,30,30,0)');
    grad.addColorStop(1,'rgba(200,30,30,0.95)');
    invCtx.fillStyle=grad;
    invCtx.fillRect(0,0,cw,ch);
    invCtx.restore();
    flashAlpha-=0.022;
    if(flashAlpha>0) _hpScreenFlashRaf=requestAnimationFrame(flashStep);
    else _hpScreenFlashRaf=null;
  };
  _hpScreenFlashRaf=requestAnimationFrame(flashStep);

  // Echo — second ghost flash at 120ms delay, dimmer
  setTimeout(()=>{
    if(!invCtx||!invCanvas)return;
    let echoAlpha=0.14;
    const echoStep=()=>{
      if(!invCtx||!invCanvas)return;
      const cw=invCanvas.width,ch=invCanvas.height;
      invCtx.save();
      invCtx.globalAlpha=echoAlpha;
      const grad=invCtx.createRadialGradient(cw/2,ch/2,ch*0.08,cw/2,ch/2,ch*0.9);
      grad.addColorStop(0,'rgba(180,30,30,0)');
      grad.addColorStop(1,'rgba(200,30,30,0.9)');
      invCtx.fillStyle=grad;
      invCtx.fillRect(0,0,cw,ch);
      invCtx.restore();
      echoAlpha-=0.018;
      if(echoAlpha>0) requestAnimationFrame(echoStep);
    };
    requestAnimationFrame(echoStep);
  }, 120);
}
let invAoeCooldown=0; // ms timestamp of last AOE fire
const INV_AOE_INTERVAL=2500, INV_AOE_RADIUS=40;
let invNukaCooldownUntil=0;
let invNukaSkillActive=false;
let invNukaPromptLetter='';
let invNukaCooldownTimer=null;
let invNukaCooldownRaf=null;
let invNukaKeycapRaf=null;
let invMessageTimer=null;

function setInvaderMessage(text,color='rgba(255,255,255,0.92)', timeout=0){
  if(!msgEl)return;
  msgEl.textContent=text;
  msgEl.style.color=color;
  msgEl.style.opacity=text ? '1' : '0.72';
  if(invMessageTimer){clearTimeout(invMessageTimer); invMessageTimer=null;}
  if(timeout>0){
    invMessageTimer=setTimeout(()=>{
      msgEl.textContent='';
      msgEl.style.color='';
      msgEl.style.opacity='';
      invMessageTimer=null;
    },timeout);
  }
}

function positionNukaUI(){
  if(invBossUpgrade==='warh') return; // warh has no keycap
  const wrap=document.getElementById('nuka-keycap');
  const cd=document.getElementById('nuka-cooldown');
  if(!invCanvas||(!wrap&&!cd))return;
  const r=invCanvas.getBoundingClientRect();
  const shooterPageX=r.left+invShooterX;
  const shooterPageY=r.top+(invCanvas.height-54);
  const offsetX=52; // clear of the shooter sprite, to its right
  if(wrap){wrap.style.left=(shooterPageX+offsetX)+'px';wrap.style.top=shooterPageY+'px';}
  if(cd){cd.style.left=(shooterPageX+offsetX)+'px';cd.style.top=(shooterPageY+34)+'px';}
}

const NUKA_COOLDOWN_OPACITY=0.35; // how opaque the keycap goes during cooldown
const NUKA_LERP_DURATION=400;     // ms for the fade in/out transition

function lerpNukaKeycapOpacity(fromOpacity, toOpacity, duration, onDone){
  if(invNukaKeycapRaf){cancelAnimationFrame(invNukaKeycapRaf);invNukaKeycapRaf=null;}
  const wrap=document.getElementById('nuka-keycap');
  if(!wrap)return;
  const start=performance.now();
  const step=(now)=>{
    const t=Math.min(1,(now-start)/duration);
    // ease-in-out cubic
    const ease=t<0.5?4*t*t*t:(1-Math.pow(-2*t+2,3)/2);
    wrap.style.opacity=fromOpacity+(toOpacity-fromOpacity)*ease;
    if(t<1){invNukaKeycapRaf=requestAnimationFrame(step);}
    else{invNukaKeycapRaf=null;if(onDone)onDone();}
  };
  invNukaKeycapRaf=requestAnimationFrame(step);
}

function showNukaPrompt(letter, mode='prompt'){
  const wrap=document.getElementById('nuka-keycap');
  const box=document.getElementById('nuka-keycap-inner');
  if(!wrap||!box)return;
  wrap.classList.add('active');
  box.className='';
  box.textContent=letter||'';
  if(mode==='success'){box.classList.add('success');}
  else if(mode==='fail'){box.classList.add('fail');}
  else {box.classList.remove('success','fail');}
  // Fade in from whatever current opacity to fully opaque
  lerpNukaKeycapOpacity(parseFloat(wrap.style.opacity)||0, 1, NUKA_LERP_DURATION, null);
}

function showNukaKeycapCooldown(){
  // Fade to semi-opaque to signal cooldown
  lerpNukaKeycapOpacity(1, NUKA_COOLDOWN_OPACITY, NUKA_LERP_DURATION, null);
}

function restoreNukaKeycapOpacity(){
  // Re-show and fade back to fully opaque when cooldown ends
  const wrap=document.getElementById('nuka-keycap');
  if(wrap) wrap.classList.add('active');
  const currentOpacity=wrap?parseFloat(wrap.style.opacity)||NUKA_COOLDOWN_OPACITY:NUKA_COOLDOWN_OPACITY;
  lerpNukaKeycapOpacity(currentOpacity, 1, NUKA_LERP_DURATION, null);
}

function hideNukaPrompt(){
  if(invNukaKeycapRaf){cancelAnimationFrame(invNukaKeycapRaf);invNukaKeycapRaf=null;}
  const wrap=document.getElementById('nuka-keycap');
  if(wrap){wrap.classList.remove('active');wrap.style.opacity='';}
}

function setNukaCooldown(active, duration=2000, isFail=false){
  const wrap=document.getElementById('nuka-cooldown');
  const bar=document.getElementById('nuka-cooldown-bar');
  if(!wrap||!bar)return;
  if(invNukaCooldownRaf){cancelAnimationFrame(invNukaCooldownRaf);invNukaCooldownRaf=null;}
  if(!active){
    wrap.classList.remove('active','fail');
    bar.style.transform='scaleX(1)';
    return;
  }
  wrap.classList.toggle('fail',!!isFail);
  wrap.classList.add('active');
  const start=performance.now();
  const step=(now)=>{
    const t=Math.max(0,1-(now-start)/duration);
    bar.style.transform=`scaleX(${Math.max(0,t)})`;
    if(t>0) invNukaCooldownRaf=requestAnimationFrame(step);
    else {
      invNukaCooldownRaf=null;
      wrap.classList.remove('active','fail');
      bar.style.transform='scaleX(1)';
    }
  };
  invNukaCooldownRaf=requestAnimationFrame(step);
}

function startInvaders(){
  invWave=0;
  invTransitioning=false;
  invUpgrade=null;
  invBossUpgrade=null;
  invAoeCooldown=0;
  invNukaCooldownUntil=0;
  invNukaSkillActive=false;
  invNukaPromptLetter='';
  hideNukaPrompt();
  setNukaCooldown(false);
  if(invNukaCooldownTimer){clearTimeout(invNukaCooldownTimer);invNukaCooldownTimer=null;}
  // Player HP
  invPlayerHp=PLAYER_MAX_HP;
  updatePlayerHpBar();
  activeVfx=[];
  loadVfxAssets();
  // Boss abilities
  bossShockwaves=[];bossPincers=[];bossPhase2=false;
  if(bossShockwaveTimer){clearInterval(bossShockwaveTimer);bossShockwaveTimer=null;}
  if(bossPincerTimer){clearTimeout(bossPincerTimer);bossPincerTimer=null;}
  // Hide Round I scoring HUD + timer bar (display:none, not just
  // visibility:hidden, so they don't reserve layout space and push
  // Round II's field down the page), show wave progress bar
  document.querySelector('.hud').style.display='none';
  document.querySelector('.bar-wrap').style.display='none';
  document.getElementById('player-hp-wrap').style.display='none';
  const wp=document.getElementById('wave-progress');
  wp.style.display='flex';
  for(let i=0;i<6;i++) document.getElementById('wseg-'+i).className='wave-seg';
  invCanvas=document.createElement('canvas');
  invCanvas.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;cursor:crosshair;';
  field.appendChild(invCanvas);
  invCanvas.width=field.offsetWidth||window.innerWidth;
  invCanvas.height=field.offsetHeight||window.innerHeight-80;
  invCtx=invCanvas.getContext('2d');
  invShooterX=invCanvas.width/2;
  invBullets=[];invParticles=[];
  invMouseDown=false;
  invCanvas.addEventListener('mousemove',invHandleMove);
  invCanvas.addEventListener('mousedown',invHandleMouseDown);
  invCanvas.addEventListener('mouseup',invHandleMouseUp);
  invCanvas.addEventListener('mouseleave',invHandleMouseUp);
  invCanvas.addEventListener('click',invHandleSingleClick);
  spawnInvaderWave(0);
  invLoop();
}

function spawnInvaderWave(waveIdx){
  invDescentY=0;
  invEntities=[];
  const cw=invCanvas.width,ch=invCanvas.height;

  if(waveIdx===5){
    // ── BOSS WAVE ──
    const bossGlyph=BOSS_SPRITES[Math.floor(Math.random()*BOSS_SPRITES.length)];
    invEntities.push({
      isBoss:true,
      baseX:cw/2, baseY:80,
      x:cw/2, y:80,
      alive:true,
      glyph:bossGlyph,
      flicker:0,
      glitchTimer:0,glitchOffset:0,
      hp:INV_BOSS_HP,
      maxHp:INV_BOSS_HP,
      cellW:90,cellH:60,
      orbitAngle:0,
    });
  } else {
    const cfg=INV_WAVE_CONFIG[waveIdx];
    const glyphSet=INV_GLYPH_SETS[Math.min(waveIdx,INV_GLYPH_SETS.length-1)];
    const cellW=Math.min(56,Math.floor((cw-60)/cfg.cols));
    const cellH=44;
    const gLeft=(cw-cfg.cols*cellW)/2;
    const gTop=36;
    for(let r=0;r<cfg.rows;r++){
      for(let c=0;c<cfg.cols;c++){
        invEntities.push({
          col:c,row:r,
          baseX:gLeft+c*cellW+cellW/2,
          baseY:gTop+r*cellH,
          x:0,y:0,
          alive:true,
          glyph:glyphSet[Math.floor(Math.random()*glyphSet.length)],
          flicker:Math.random()*Math.PI*2,
          glitchTimer:0,glitchOffset:0,
          hp:r===0?cfg.hpTop:cfg.hpRest,
          cellW,cellH
        });
      }
    }
  }
}

function nextInvaderWave(){
  invTransitioning=true;
  invBullets=[];
  try{playWaveClear();}catch(e){}
  const completedWave=invWave;
  invWave++;

  // Fill wave progress segment
  const seg=document.getElementById('wseg-'+completedWave);
  if(seg) seg.className='wave-seg done-'+completedWave;

  // Upgrade modal after wave 2 (completedWave===1, i.e. wave 2 just cleared)
  if(completedWave===1 && !invUpgrade){
    showUpgradeModal('wave2');
    return;
  }
  
  // Upgrade modal after wave 4 (completedWave===3)
  if(completedWave===3){
    showUpgradeModal('wave4');
    return;
  }

  // Boss wave — show the additional boss upgrade modal
  if(completedWave===4){
    showBossUpgradeModal();
    return;
  }

  // No overlay — just spawn next wave directly
  setTimeout(()=>{
    invTransitioning=false;
    spawnInvaderWave(invWave);
  },400);
}

function showUpgradeModal(mode='wave2'){
  state.running=false;
  // Kill the rAF loop cleanly so it doesn't ghost-run
  if(invRaf){cancelAnimationFrame(invRaf);invRaf=null;}
  const modal=document.getElementById('upgrade-modal');
  const desc=document.getElementById('upgrade-desc');
  modal.style.display='flex';
  desc.textContent='choose your augment.';
  const rapidBtn=document.getElementById('upgrade-rapidfire');
  const aoeBtn=document.getElementById('upgrade-aoe');
  const dblBtn=document.getElementById('upgrade-doublemissile');
  const homingBtn=document.getElementById('upgrade-homing');
  const nukaBtn=document.getElementById('upgrade-nuka');
  const machinaBtn=document.getElementById('upgrade-machina');
  if(mode==='wave2'){
    rapidBtn.style.display=''; aoeBtn.style.display='';
    dblBtn.style.display='none'; homingBtn.style.display='none';
    nukaBtn.style.display='none'; machinaBtn.style.display='none';
    desc.textContent='choose your augment.';
  }else{
    // Wave 4 — all options EXCEPT nuka/machina (those are boss-only)
    rapidBtn.style.display='none'; aoeBtn.style.display='none';
    dblBtn.style.display=''; homingBtn.style.display='';
    nukaBtn.style.display='none'; machinaBtn.style.display='none';
    desc.innerHTML='wave 4.<br>choose your augment.<br>double missile.<br>rapid + homing.';
  }

  function pickUpgrade(type){
    invUpgrade=type;
    try{playUpgradePick();}catch(e){}
    if(type==='aoe') invAoeCooldown=Date.now();
    modal.style.display='none';
    state.running=true;
    invTransitioning=false;
    spawnInvaderWave(invWave);
    invLoop();
  }

  rapidBtn.onclick=()=>pickUpgrade('rapidfire');
  aoeBtn.onclick=()=>pickUpgrade('aoe');
  dblBtn.onclick=()=>pickUpgrade('doublemissile');
  homingBtn.onclick=()=>pickUpgrade('rapidfire_homing');
  nukaBtn.onclick=()=>pickUpgrade('nuka');
  machinaBtn.onclick=()=>pickUpgrade('machina');
}

function triggerBossTeleport(){
  if(!invCanvas)return;
  const boss=invEntities.find(e=>e.isBoss&&e.alive);
  if(!boss)return;
  const cw=invCanvas.width, ch=invCanvas.height;
  const padX=cw*0.10;
  const newX=padX+Math.random()*(cw-padX*2);
  const newY=20+Math.random()*(ch*0.5-20);
  boss.baseX=newX;
  boss.baseY=newY;
  boss.orbitAngle=0;
  bossTeleportFlash=12; // ~12 frames of flash at 60fps
}

function spawnWave(){
  const boss=invEntities.find(e=>e.isBoss&&e.alive);
  if(!boss||!state.running||!invCanvas)return;
  const ch=invCanvas.height;
  const tx=invShooterX, ty=ch-54;
  const dx=tx-boss.x, dy=ty-boss.y;
  const dist=Math.hypot(dx,dy)||1;
  bossShockwaves.push({
    x:boss.x, y:boss.y,
    vx:(dx/dist)*BOSS_WAVE_SPEED, vy:(dy/dist)*BOSS_WAVE_SPEED,
    r:20, targetDist:dist,
    travelledDist:0,
    hit:false, alive:true
  });
}

function startBossAbilities(){
  if(bossShockwaveTimer){clearInterval(bossShockwaveTimer);bossShockwaveTimer=null;}
  if(bossPincerTimer){clearTimeout(bossPincerTimer);bossPincerTimer=null;}
  if(bossTeleportTimer){clearInterval(bossTeleportTimer);bossTeleportTimer=null;}
  bossShockwaves=[];bossPincers=[];bossPhase2=false;
  bossTeleportFlash=0;
  bossGrowthScale=1;
  bossGlitchBurst=0;
  bossTeleportTimer=setInterval(triggerBossTeleport, 3000);
  // Phase 1: pincer only — starts immediately
  schedulePincer();
}

function spawnPincer(){
  const boss=invEntities.find(e=>e.isBoss&&e.alive);
  if(!boss||!state.running||!invCanvas)return;
  const tx=invShooterX;
  const ty=invCanvas.height-60;
  const dx=tx-boss.x, dy=ty-boss.y;
  const dist=Math.hypot(dx,dy)||1;
  bossPincers.push({
    x:boss.x, y:boss.y,
    vx:(dx/dist)*BOSS_PINCER_SPEED*(bossPhase2?1.3:1),
    vy:(dy/dist)*BOSS_PINCER_SPEED*(bossPhase2?1.3:1),
    tx, ty, // target snapshot for homing correction
    age:0,
    alive:true
  });
}

function schedulePincer(){
  const cd=bossPhase2 ? BOSS_PINCER_CD-500 : BOSS_PINCER_CD;
  bossPincerTimer=setTimeout(()=>{
    if(!state.running){return;}
    spawnPincer();
    schedulePincer();
  }, cd);
}

function stopBossAbilities(){
  if(bossShockwaveTimer){clearInterval(bossShockwaveTimer);bossShockwaveTimer=null;}
  if(bossPincerTimer){clearTimeout(bossPincerTimer);bossPincerTimer=null;}
  if(bossTeleportTimer){clearInterval(bossTeleportTimer);bossTeleportTimer=null;}
  bossShockwaves=[];bossPincers=[];bossTeleportFlash=0;
}

function updateBossAbilities(){
  const boss=invEntities.find(e=>e.isBoss&&e.alive);
  if(!boss||!invCanvas)return;

  // Phase 2 transition at ≤50% HP
  if(!bossPhase2&&boss.hp<=INV_BOSS_HP*0.5){
    bossPhase2=true;
    bossGlitchBurst=55;   // ~55 frames of heavy glitch
    // Unlock travelling wave — fires immediately then every 3000ms
    spawnWave();
    bossShockwaveTimer=setInterval(spawnWave, BOSS_SHOCKWAVE_INTERVAL-500);
    // Pincer already running — schedulePincer will pick up new 3500ms CD on next cycle
  }

  const ch=invCanvas.height;

  // Update travelling waves
  for(let s of bossShockwaves){
    s.x+=s.vx; s.y+=s.vy;
    s.travelledDist+=Math.hypot(s.vx,s.vy);
    // Expand from r=20 to r=120 as it closes on targetDist
    const progress=Math.min(1, s.travelledDist/s.targetDist);
    s.r=20+(120-20)*progress;
    // Player hit — shooter at (invShooterX, ch-54)
    if(!s.hit && Math.hypot(s.x-invShooterX, s.y-(ch-54))<s.r*0.55){
      s.hit=true;
      const dmg=31+Math.floor(Math.random()*4); // 31-34
      damagePlayer(dmg);
    }
    // Despawn once past the bottom or well past target
    if(s.y>ch+40 || s.travelledDist>s.targetDist+200) s.alive=false;
  }
  bossShockwaves=bossShockwaves.filter(s=>s.alive);

  // Update pincers
  for(let p of bossPincers){
    // Soft homing — gradually steer toward shooter's live position
    p.age++;
    if(p.age%4===0){
      const tx=invShooterX, ty=ch-54;
      const dx=tx-p.x, dy=ty-p.y;
      const dist=Math.hypot(dx,dy)||1;
      const speed=Math.hypot(p.vx,p.vy);
      p.vx+=(dx/dist*speed-p.vx)*0.08;
      p.vy+=(dy/dist*speed-p.vy)*0.08;
    }
    p.x+=p.vx; p.y+=p.vy;
    // Player hit
    if(Math.hypot(p.x-invShooterX,p.y-(ch-54))<20&&!p.hit){
      p.hit=true;
      const dmg=12+Math.floor(Math.random()*4); // 12-15
      damagePlayer(dmg);
    }
    if(p.y>ch+20)p.alive=false;
  }
  bossPincers=bossPincers.filter(p=>p.alive&&!p.hit);
}

function drawBossAbilities(){
  if(!invCtx)return;
  const ch=invCanvas.height;

  // Pincer — active from phase 1; yellow glow in phase 2
  for(let p of bossPincers){
    invCtx.save();
    const angle=Math.atan2(p.vy,p.vx);
    invCtx.translate(p.x,p.y);
    invCtx.rotate(angle);
    if(bossPhase2){
      // Yellow outer glow pass
      invCtx.globalAlpha=0.35;
      invCtx.shadowColor='rgba(255,220,50,0.9)';
      invCtx.shadowBlur=18;
      invCtx.strokeStyle='rgba(255,220,50,0.6)';
      invCtx.lineWidth=7;
      invCtx.beginPath();invCtx.arc(0,0,20,Math.PI*0.75,Math.PI*1.25);invCtx.stroke();
      invCtx.shadowBlur=0;
    }
    invCtx.globalAlpha=0.85;
    invCtx.strokeStyle=bossPhase2?'rgba(255,230,80,0.95)':'rgba(200,160,255,0.9)';
    invCtx.lineWidth=3.5;
    invCtx.beginPath();
    invCtx.arc(0,0,20,Math.PI*0.75,Math.PI*1.25);
    invCtx.stroke();
    invCtx.strokeStyle=bossPhase2?'rgba(255,255,180,0.7)':'rgba(255,255,255,0.5)';
    invCtx.lineWidth=1.5;
    invCtx.beginPath();invCtx.moveTo(-20,0);invCtx.lineTo(20,0);invCtx.stroke();
    invCtx.restore();
  }

  // Travelling wave — draw as sprite sheet VFX tracked to projectile position
  for(let s of bossShockwaves){
    if(!vfxWaveImg||!vfxWaveImg.complete){
      // Fallback crescent if sprite not loaded yet
      const progress=Math.min(1, s.travelledDist/(s.targetDist||1));
      const alpha=0.25+progress*0.65;
      const angle=Math.atan2(s.vy,s.vx);
      invCtx.save();
      invCtx.translate(s.x,s.y);
      invCtx.rotate(angle-Math.PI/2);
      invCtx.globalAlpha=alpha;
      invCtx.strokeStyle='rgba(255,230,80,0.95)';
      invCtx.lineWidth=2;
      invCtx.beginPath();invCtx.arc(0,0,s.r,Math.PI*0.1,Math.PI*0.9);invCtx.stroke();
      invCtx.restore();
      continue;
    }
    // Map travel progress to sprite frame
    const progress=Math.min(1, s.travelledDist/(s.targetDist||1));
    const frame=Math.min(VFX_WAVE_FRAMES-1, Math.floor(progress*VFX_WAVE_FRAMES));
    const w=invCanvas.width*0.42;
    const h=w*(VFX_WAVE_FRAME_H/VFX_WAVE_FRAME_W);
    const angle=Math.atan2(s.vy,s.vx);
    invCtx.save();
    invCtx.translate(s.x,s.y);
    invCtx.rotate(angle-Math.PI/2);
    invCtx.globalCompositeOperation='lighter';
    invCtx.globalAlpha=0.9;
    invCtx.drawImage(
      vfxWaveImg,
      frame*VFX_WAVE_FRAME_W, 0, VFX_WAVE_FRAME_W, VFX_WAVE_FRAME_H,
      -w/2, -h/2, w, h
    );
    invCtx.restore();
  }
}

function showBossUpgradeModal(){
  // Player HP is now drawn on-canvas — DOM wrap stays hidden
  // document.getElementById('player-hp-wrap') intentionally not shown
  state.running=false;
  if(invRaf){cancelAnimationFrame(invRaf);invRaf=null;}
  const modal=document.getElementById('boss-upgrade-modal');
  modal.style.display='flex';

  function pickBossUpgrade(type){
    invBossUpgrade=type;
    try{playUpgradePick();}catch(e){}
    modal.style.display='none';
    state.running=true;
    invTransitioning=false;
    startBossAbilities();
    spawnInvaderWave(invWave);
    if(type==='warh'){
      hideNukaPrompt();
      setNukaCooldown(false);
      startWarhAutoFire(); invLoop();
    } else invLoop();
  }

  document.getElementById('boss-upgrade-nuka').onclick=()=>pickBossUpgrade('warh');
  document.getElementById('boss-upgrade-machina').onclick=()=>pickBossUpgrade('machina');
}

function stopInvaders(){
  if(invRaf){cancelAnimationFrame(invRaf);invRaf=null;}
  if(invNukaKeycapRaf){cancelAnimationFrame(invNukaKeycapRaf);invNukaKeycapRaf=null;}
  if(invFireInterval){clearInterval(invFireInterval);invFireInterval=null;}
  stopBossAbilities();
  stopWarhAutoFire();
  invMouseDown=false;
  invUpgrade=null;
  invBossUpgrade=null;
  document.querySelector('.hud').style.display='';
  document.querySelector('.bar-wrap').style.display='';
  document.getElementById('wave-progress').style.display='none';
  document.getElementById('player-hp-wrap').style.display='none';
  if(invCanvas){
    invCanvas.removeEventListener('mousemove',invHandleMove);
    invCanvas.removeEventListener('mousedown',invHandleMouseDown);
    invCanvas.removeEventListener('mouseup',invHandleMouseUp);
    invCanvas.removeEventListener('mouseleave',invHandleMouseUp);
    invCanvas.removeEventListener('click',invHandleSingleClick);
    invCanvas.remove();invCanvas=null;invCtx=null;
  }
}

function invHandleMove(e){
  if(!state.running)return;
  const r=invCanvas.getBoundingClientRect();
  invShooterX+=(e.clientX-r.left-invShooterX)*0.18;
}

function invHandleMouseDown(e){
  if(!state.running)return;
  invMouseDown=true;
  const activeUpgradeForRate=invBossUpgrade||invUpgrade;
  if(activeUpgradeForRate==='warh'){ fireWarh(); return; }
  invFire();
  const rateUpgrade=invBossUpgrade==='machina'?'machina':invUpgrade;
  const rate=rateUpgrade==='machina'?INV_FIRE_RATE/3.2
    :rateUpgrade==='rapidfire'||rateUpgrade==='rapidfire_homing'?INV_FIRE_RATE/4
    :rateUpgrade==='doublemissile'?400
    :INV_FIRE_RATE;
  invFireInterval=setInterval(()=>{
    if(!state.running||!invMouseDown){clearInterval(invFireInterval);invFireInterval=null;return;}
    invFire();
  },rate);
}

function invHandleMouseUp(){
  invMouseDown=false;
  if(invFireInterval){clearInterval(invFireInterval);invFireInterval=null;}
}

function invHandleSingleClick(e){
  if(!state.running)return;
  const r=invCanvas.getBoundingClientRect();
  invShooterX=e.clientX-r.left;
  const activeUpgrade=invBossUpgrade||invUpgrade;
  if(activeUpgrade==='warh'){ fireWarh(); return; }
  invFire();
}

function invFire(){
  if(!state.running||!invCanvas||invNukaSkillActive)return;
  // Machina boss upgrade overrides wave4 weapon on click-fire (it's a full replacement).
  // Warh is additive (separate autofire loop) — click-fire uses wave4 upgrade instead.
  const activeUpgrade=invBossUpgrade==='machina'?'machina':invUpgrade;
  const ch=invCanvas.height;
  const spawnBullet=(x)=>{
    const isMissile=activeUpgrade==='aoe'||activeUpgrade==='doublemissile'||activeUpgrade==='rapidfire_homing';
    const spd=isMissile?INV_BULLET_SPEED:INV_BULLET_SPEED_UPGRADED;
    invBullets.push({x:x,y:ch-67,vy:-spd,trail:[],hit:false,kind:isMissile?'missile':'bullet',pierceLeft:isMissile?0:2});
  };
  if(activeUpgrade==='machina'){
    const ch2=invCanvas.height;
    const convergeDist=ch2*0.55;
    const spread=60;
    const streams=[
      {ox:-spread, vx: spread/convergeDist*INV_BULLET_SPEED_UPGRADED},
      {ox:0,       vx: 0},
      {ox: spread, vx:-spread/convergeDist*INV_BULLET_SPEED_UPGRADED},
    ];
    for(let s of streams){
      invBullets.push({
        x:invShooterX+s.ox, y:ch2-67,
        vy:-INV_BULLET_SPEED_UPGRADED,
        vx:s.vx,
        trail:[], hit:false, kind:'machina', pierceLeft:0
      });
    }
    try{playMachinaBurst();}catch(e){}
  } else if(activeUpgrade==='doublemissile'){
    spawnBullet(invShooterX-18); spawnBullet(invShooterX+18);
    try{playMissileFire();}catch(e){}
  } else if(activeUpgrade==='rapidfire_homing'||activeUpgrade==='aoe'){
    spawnBullet(invShooterX);
    try{playMissileFire();}catch(e){}
  } else {
    spawnBullet(invShooterX);
    try{playBulletFire();}catch(e){}
  }
}

// ── WARH CLICK-FIRE ──
// Warh fires on click with a 1s cooldown between shots
let invWarhCooldownUntil=0;
const WARH_COOLDOWN=1000;
const WARH_DAMAGE=20;
const WARH_HOMING_CHANCE=0.15;
let invWarhInterval=null; // unused but kept for stopWarhAutoFire compat

function fireWarh(){
  if(!state.running||!invCanvas)return;
  const now=Date.now();
  if(now<invWarhCooldownUntil)return; // on cooldown
  invWarhCooldownUntil=now+WARH_COOLDOWN;
  const ch=invCanvas.height;
  const boss=invEntities.find(e=>e.isBoss&&e.alive);
  const homing=boss&&Math.random()<WARH_HOMING_CHANCE;
  let vx=0, vy=-INV_BULLET_SPEED*0.7;
  if(homing){
    const dx=boss.x-invShooterX, dy=boss.y-(ch-67);
    const dist=Math.hypot(dx,dy)||1;
    const spd=INV_BULLET_SPEED*0.7;
    vx=(dx/dist)*spd; vy=(dy/dist)*spd;
  }
  invBullets.push({
    x:invShooterX, y:ch-67,
    vx, vy,
    trail:[], hit:false, kind:'warh', pierceLeft:0,
    isWarh:true, warhHoming:homing
  });
  try{playMissileFire();}catch(e){}
}

function startWarhAutoFire(){
  // no-op — warh is now click-fire
  invWarhCooldownUntil=0;
}

function stopWarhAutoFire(){
  if(invWarhInterval){clearInterval(invWarhInterval);invWarhInterval=null;}
  invWarhCooldownUntil=0;
}

function invSpawnParticles(x,y,alpha){
  for(let i=0;i<10;i++){
    const a=Math.random()*Math.PI*2;
    const spd=1+Math.random()*2.5;
    invParticles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,alpha:alpha||1});
  }
}

function invLoop(){
  if(!state.running||!invCanvas){return;}
  invUpdate();
  // invUpdate() can itself stop the round mid-call (e.g. showUpgradeModal
  // on wave clear, or endRound on final wave) and null out invRaf. Re-check
  // here before drawing/rescheduling — otherwise this same invLoop() call
  // queues one more "ghost" frame that overwrites the null, leaving invRaf
  // non-null forever and preventing startNukaSkill()'s `if(!invRaf)` restart
  // check from ever firing again.
  if(!state.running||!invCanvas){return;}
  invDraw();
  invRaf=requestAnimationFrame(invLoop);
}

function invUpdate(){
  if(invTransitioning)return;
  positionNukaUI();
  const now=Date.now();
  const ch=invCanvas.height;
  const cfg=INV_WAVE_CONFIG[invWave];
  const speed=cfg?cfg.descentSpeed:0.3;
  invDescentY+=speed;
  const drop=Math.floor(invDescentY/20)*20;

  const isBossWave=invWave===5;

  for(let e of invEntities){
    if(!e.alive)continue;
    if(isBossWave){
      // Boss drifts in sine loop around its current baseX/baseY anchor (set by teleport)
      e.orbitAngle+=0.009;
      e.x=e.baseX+Math.sin(e.orbitAngle)*72;
      e.y=e.baseY+Math.sin(e.orbitAngle*0.46)*16;
      e.flicker+=0.012;
      if(bossTeleportFlash>0)bossTeleportFlash--;
      // Phase 2 growth lerp
      if(bossPhase2) bossGrowthScale+=(1.38-bossGrowthScale)*0.06;
      // Phase 2 glitch burst
      if(bossGlitchBurst>0){
        bossGlitchBurst--;
        e.glitchTimer=4; // keep resetting so it stays glitchy
        e.glitchOffset=(Math.random()-0.5)*14;
      } else if(e.glitchTimer>0){e.glitchTimer--;e.glitchOffset=(Math.random()-0.5)*8;}else{e.glitchOffset=0;}
    } else {
      e.x=e.baseX;
      e.y=e.baseY+drop+Math.sin(e.flicker+now*0.001)*1.5;
      e.flicker+=0.008;
      if(e.glitchTimer>0){e.glitchTimer--;e.glitchOffset=(Math.random()-0.5)*5;}else{e.glitchOffset=0;}
      if(e.y>ch-80){
        state.running=false;clearInterval(state.bTimer);
        showFail(state.currentRound);return;
      }
    }
  }

  // Boss abilities (shockwave + pincer) — update every frame during boss wave
  if(isBossWave) updateBossAbilities();

  // AOE missile — fires every 2.5s, hits all entities within radius of shooter X
  if(invUpgrade==='aoe'){
    const now2=Date.now();
    if(now2-invAoeCooldown>=INV_AOE_INTERVAL){
      invAoeCooldown=now2;

      const aliveRows=[...new Set(invEntities.filter(e=>e.alive).map(e=>Math.round(e.y)))].sort((a,b)=>a-b);
      let targetY=invCanvas.height/2;
      if(aliveRows.length){
        targetY=aliveRows.reduce((best,row)=>
          Math.abs(row-invCanvas.height/2)<Math.abs(best-invCanvas.height/2)?row:best
        ,aliveRows[0]);
      }

      invParticles.push({x:invShooterX,y:targetY,vx:0,vy:0,life:0.7,alpha:1,isAoe:true,r:INV_AOE_RADIUS*1.5});
      try{playAoeTrigger();}catch(e){}

      for(let e of invEntities){
        if(!e.alive)continue;

        const withinColumn=Math.abs(e.x-invShooterX)<=INV_AOE_RADIUS;
        const withinThreeRows=Math.abs(e.y-targetY)<=90;

        if(withinColumn && withinThreeRows){
          e.hp--;
          if(e.hp<=0){
            e.alive=false;
            invSpawnParticles(e.x,e.y,1);
            try{playEnemyDeath(0.8+Math.random()*0.6);}catch(ex){}
            state.combo=Math.min(state.combo+1,8);
            setComboValue('×'+state.combo);
          } else {
            e.glitchTimer=10;
          }
        }
      }
    }
  }

  // Bullets
  for(let b of invBullets){
    b.trail.push({x:b.x,y:b.y});
    if(b.trail.length>8)b.trail.shift();
    if(invUpgrade==='rapidfire_homing'){
      const target=invEntities.find(e=>e.alive);
      if(target){
        const dx=target.x-b.x;
        b.x+=Math.sign(dx)*1.8;
      }
    }
    b.y+=b.vy;
    if(b.vx) b.x+=b.vx;
    if(!b.hit){
      for(let e of invEntities){
        if(!e.alive)continue;
        if(Math.abs(b.x-e.x)<e.cellW*0.48&&Math.abs(b.y-e.y)<e.cellH*0.52){
          if((b.kind==='missile' || b.kind==='warh') && !e.isBoss && e.col!==undefined){
            b.hit=true;
            const cols=b.kind==='warh'?[e.col-1,e.col,e.col+1]:[e.col];
            for(let laneEnemy of invEntities){
              if(!laneEnemy.alive || laneEnemy.isBoss || laneEnemy.col===undefined || !cols.includes(laneEnemy.col))continue;
              laneEnemy.alive=false;
              invSpawnParticles(laneEnemy.x,laneEnemy.y,1);
              try{playEnemyDeath(0.7+Math.random()*0.5);}catch(ex){}
              state.combo=Math.min(state.combo+1,8);
              setComboValue('×'+state.combo);
            }
          } else if(b.kind==='bullet' && b.pierceLeft>0 && !e.isBoss){
            b.pierceLeft--;
            if(b.pierceLeft<=0) b.hit=true;
            e.alive=false;
            invSpawnParticles(e.x,e.y,1);
            try{playEnemyDeath(0.7+Math.random()*0.5);}catch(ex){}
            state.combo=Math.min(state.combo+1,8);
            setComboValue('×'+state.combo);
            break;
          } else {
            b.hit=true;
            const damage=e.isBoss?((b.kind==='missile')?7:b.kind==='warh'?WARH_DAMAGE:b.kind==='machina'?0.3:0.5):1;
            e.hp-=damage;
            if(e.hp<=0){
              e.alive=false;
              invSpawnParticles(e.x,e.y,1);
              try{playEnemyDeath(e.isBoss?0.4:0.7+Math.random()*0.5);}catch(ex){}
              state.combo=Math.min(state.combo+1,8);
              setComboValue('×'+state.combo);
              // Boss death display
              if(isBossWave){
                msgEl.textContent='';
              }
            } else {
              e.glitchTimer=10;
              // Show boss HP
              if(isBossWave){
                const hpText=(e.hp%1===0?e.hp:e.hp.toFixed(1))+' / '+INV_BOSS_HP;
                msgEl.textContent=hpText;
              }
            }
          }
          break;
        }
      }
    }
  }
  invBullets=invBullets.filter(b=>!b.hit&&b.y>-10);
  for(let p of invParticles){p.x+=p.vx;p.y+=p.vy;p.vy+=0.05;p.life-=0.045;}
  invParticles=invParticles.filter(p=>p.life>0);

  const alive=invEntities.filter(e=>e.alive);
  if(alive.length===0){
    if(invWave<5){
      // More waves to go
      nextInvaderWave();
    } else {
      // All 6 waves cleared — pass R2
      state.running=false;clearInterval(state.bTimer);endRound();
    }
  }
}

function getProjectilePalette(kind){
  if(kind==='machina'){
    return{
      trail:'rgba(255,255,255,0.15)',
      accent:'rgba(255,255,255,0.9)',
      body:'#ffffff',
    };
  }
  if(kind==='warh'){
    return{
      trail:'rgba(120, 72, 92, 0.28)',
      glow:'rgba(150, 90, 110, 0.22)',
      body:'#5a3a48',
      bodyAlt:'#7a5564',
      nose:'#2a1820',
      fin:'#3a2430',
      exhaust:'#8a4050',
      accent:'#f0d8de',
      outline:'#180f14'
    };
  }
  if(kind==='missile'){
    return{
      trail:'rgba(62, 96, 151, 0.24)',
      glow:'rgba(84, 118, 179, 0.2)',
      body:'#48699f',
      bodyAlt:'#6b84b8',
      nose:'#213a66',
      fin:'#253b6a',
      exhaust:'#314d7d',
      accent:'#dfe7f8',
      outline:'#152238'
    };
  }
  return{
    trail:'rgba(255, 214, 96, 0.22)',
    glow:'rgba(255, 214, 96, 0.12)',
    body:'#ffe08a',
    bodyAlt:'#ffd060',
    nose:'#fff2c4',
    fin:'#c9a84a',
    exhaust:'#ffe08a',
    accent:'#fff6d8',
    outline:'#6a5520'
  };
}

function getMissileScale(kind){
  if(kind==='warh') return 1.65;
  return 1.08;
}

function drawMissileSilhouette(palette, scale){
  const s=scale;
  invCtx.shadowBlur=3 * s;
  invCtx.shadowColor=palette.glow;
  invCtx.fillStyle=palette.body;
  invCtx.strokeStyle=palette.outline;
  invCtx.lineWidth=1.35 * s;
  invCtx.beginPath();
  invCtx.moveTo(0,-10.2 * s);
  invCtx.lineTo(3.2 * s,-3.6 * s);
  invCtx.lineTo(3.0 * s,3.4 * s);
  invCtx.lineTo(2.0 * s,5.4 * s);
  invCtx.lineTo(2.0 * s,6.4 * s);
  invCtx.lineTo(-2.0 * s,6.4 * s);
  invCtx.lineTo(-2.0 * s,5.4 * s);
  invCtx.lineTo(-3.0 * s,3.4 * s);
  invCtx.lineTo(-3.2 * s,-3.6 * s);
  invCtx.closePath();
  invCtx.fill();
  invCtx.stroke();
  invCtx.fillStyle=palette.bodyAlt;
  invCtx.fillRect(-2.0 * s,-5.2 * s,4.0 * s,9.2 * s);
  invCtx.fillStyle=palette.fin;
  invCtx.beginPath();
  invCtx.moveTo(-3.0 * s,1.8 * s);
  invCtx.lineTo(-6.8 * s,0.4 * s);
  invCtx.lineTo(-2.4 * s,1.0 * s);
  invCtx.closePath();
  invCtx.fill();
  invCtx.stroke();
  invCtx.beginPath();
  invCtx.moveTo(3.0 * s,1.8 * s);
  invCtx.lineTo(7.2 * s,0.8 * s);
  invCtx.lineTo(2.4 * s,0.6 * s);
  invCtx.closePath();
  invCtx.fill();
  invCtx.stroke();
  invCtx.fillStyle=palette.exhaust;
  invCtx.beginPath();
  invCtx.moveTo(-1.4 * s,6.4 * s);
  invCtx.lineTo(-1.6 * s,9.8 * s);
  invCtx.lineTo(0,11.2 * s);
  invCtx.lineTo(1.6 * s,9.8 * s);
  invCtx.lineTo(1.4 * s,6.4 * s);
  invCtx.closePath();
  invCtx.fill();
  invCtx.stroke();
  invCtx.fillStyle=palette.accent;
  invCtx.beginPath();
  invCtx.arc(0,-7.2 * s,1.15 * s,0,Math.PI*2);
  invCtx.fill();
  if(scale>=1.28){
    invCtx.fillStyle=palette.exhaust;
    invCtx.fillRect(-0.55 * s,-8.8 * s,1.1 * s,2.2 * s);
  }
}

function drawProjectileVisual(b){
  const palette=getProjectilePalette(b.kind);
  invCtx.save();
  if(b.kind==='machina'){
    // Thin converging streak — draw trail line + small dot
    if(b.trail.length>1){
      invCtx.strokeStyle=palette.trail;
      invCtx.lineWidth=1.5;
      invCtx.beginPath();
      invCtx.moveTo(b.trail[0].x,b.trail[0].y);
      for(let t of b.trail) invCtx.lineTo(t.x,t.y);
      invCtx.stroke();
    }
    invCtx.fillStyle=palette.body;
    invCtx.globalAlpha=0.92;
    invCtx.beginPath();invCtx.arc(b.x,b.y,1.8,0,Math.PI*2);invCtx.fill();
    invCtx.restore();
    return;
  }
  if(b.kind==='missile'||b.kind==='warh'){
    const missileScale=getMissileScale(b.kind);
    if(b.trail.length>1){
      const trail=b.trail.slice(-8);
      invCtx.strokeStyle=palette.trail;
      invCtx.lineWidth=4.2 * missileScale;
      invCtx.beginPath();
      invCtx.moveTo(trail[0].x,trail[0].y);
      for(let t of trail) invCtx.lineTo(t.x,t.y);
      invCtx.stroke();
      invCtx.strokeStyle=palette.glow;
      invCtx.lineWidth=1.2 * missileScale;
      invCtx.beginPath();
      invCtx.moveTo(trail[0].x,trail[0].y);
      for(let t of trail) invCtx.lineTo(t.x,t.y);
      invCtx.stroke();
    }
    invCtx.translate(b.x,b.y);
    drawMissileSilhouette(palette, missileScale);
    invCtx.restore();
    return;
  }
  if(b.trail.length>1){
    invCtx.strokeStyle=palette.trail;
    invCtx.lineWidth=1;
    invCtx.beginPath();
    invCtx.moveTo(b.trail[0].x,b.trail[0].y);
    for(let t of b.trail) invCtx.lineTo(t.x,t.y);
    invCtx.stroke();
  }
  invCtx.strokeStyle=palette.accent;
  invCtx.lineWidth=1.2;
  invCtx.beginPath();invCtx.moveTo(b.x,b.y);invCtx.lineTo(b.x,b.y+9);invCtx.stroke();
  invCtx.fillStyle=palette.body;
  invCtx.beginPath();invCtx.arc(b.x,b.y,1.35,0,Math.PI*2);invCtx.fill();
  invCtx.restore();
}

function invDraw(){
  const cw=invCanvas.width,ch=invCanvas.height;
  invCtx.clearRect(0,0,cw,ch);

  // ── DAMAGE VFX: chromatic aberration + glitch displacement ──
  if(_hpAberrationFrames>0||_hpGlitchFrames>0){
    const aberAlpha=Math.min(1,_hpAberrationFrames/18)*0.55;
    const glitchActive=_hpGlitchFrames>0;
    if(_hpAberrationFrames>0) _hpAberrationFrames--;
    if(_hpGlitchFrames>0) _hpGlitchFrames--;

    // Chromatic aberration: capture current frame state via getImageData isn't available yet
    // (canvas is clear at this point), so we paint coloured edge strips instead —
    // a red fringe left, cyan fringe right, at canvas edges, simulating lens split
    const aberShift=Math.round(4*aberAlpha);
    if(aberShift>0){
      // Red channel fringe — left edge bleed
      invCtx.save();
      invCtx.globalAlpha=aberAlpha*0.45;
      invCtx.fillStyle='rgba(255,30,30,1)';
      invCtx.fillRect(0,0,aberShift*3,ch);
      // Cyan fringe — right edge bleed
      invCtx.fillStyle='rgba(30,255,220,1)';
      invCtx.fillRect(cw-aberShift*3,0,aberShift*3,ch);
      // Horizontal scan displacement — thin red bar drifts down
      const scanY=((Date.now()*0.12)%ch);
      invCtx.globalAlpha=aberAlpha*0.3;
      invCtx.fillStyle='rgba(255,40,40,1)';
      invCtx.fillRect(0,scanY,cw,1);
      invCtx.restore();
    }

    // Glitch block displacement — random white rect strips
    if(glitchActive){
      invCtx.save();
      invCtx.globalAlpha=0.12;
      invCtx.fillStyle='#fff';
      for(let i=0;i<3;i++){
        const gy=Math.random()*ch;
        const gh=2+Math.random()*6;
        const gox=(Math.random()-0.5)*20;
        invCtx.fillRect(gox,gy,cw,gh);
      }
      invCtx.restore();
    }
  }

  // Boss ability visuals drawn below everything else
  if(invWave===5) drawBossAbilities();

  for(let p of invParticles){
    invCtx.save();
    if(p.isNukaBomb){
      // Purple haze bomb — soft expanding radial glow + shockwave ring
      // nukaBombR controls max radius: large for boss hit, small for row-clear entities
      const maxR = p.nukaBombR || 80;
      const bx=Math.round(p.x), by=Math.round(p.y);
      const glowR=maxR*(1.6-p.life*0.6);
      const grad=invCtx.createRadialGradient(bx,by,0,bx,by,glowR);
      grad.addColorStop(0,'rgba(168,85,247,'+(p.life*0.55)+')');
      grad.addColorStop(1,'rgba(168,85,247,0)');
      invCtx.globalAlpha=1;
      invCtx.fillStyle=grad;
      invCtx.beginPath();invCtx.arc(bx,by,glowR,0,Math.PI*2);invCtx.fill();
      invCtx.globalAlpha=p.life*0.8;
      invCtx.strokeStyle='#c084fc';
      invCtx.lineWidth=2.5;
      invCtx.beginPath();invCtx.arc(bx,by,maxR*0.75*(2-p.life*1.3),0,Math.PI*2);invCtx.stroke();
    } else if(p.isAoe){
      // AOE — full-height column flash + expanding ring
      const bx=Math.round(p.x);
      // Column fill
      invCtx.globalAlpha=p.life*0.18;
      invCtx.fillStyle='#fff';
      invCtx.fillRect(bx-INV_AOE_RADIUS,0,INV_AOE_RADIUS*2,ch);
      // Bright centre line
      invCtx.globalAlpha=p.life*0.9;
      invCtx.strokeStyle='#fff';
      invCtx.lineWidth=2.5;
      invCtx.beginPath();invCtx.moveTo(bx,0);invCtx.lineTo(bx,ch);invCtx.stroke();
      // Expanding ring at mid-canvas
      invCtx.globalAlpha=p.life*0.6;
      invCtx.lineWidth=1.5;
      invCtx.beginPath();invCtx.arc(bx,ch/2,INV_AOE_RADIUS*(2-p.life*1.4),0,Math.PI*2);invCtx.stroke();
    } else {
      invCtx.globalAlpha=p.life*p.alpha;
      invCtx.fillStyle='#fff';
      invCtx.fillRect(p.x-1,p.y-1,2,2);
    }
    invCtx.restore();
  }

  for(let b of invBullets){
    drawProjectileVisual(b);
  }

  for(let e of invEntities){
    if(!e.alive)continue;
    invCtx.save();
    if(e.isBoss){
      // Boss render — large, pulsing, HP-reactive
      const hpRatio=e.hp/e.maxHp;
      const pulse=0.7+0.3*Math.sin(e.flicker*2);
      const bossAlpha=0.6+0.4*pulse;
      const gs=bossGrowthScale;
      invCtx.translate(e.x+e.glitchOffset,e.y);
      // Outer ring — fades with HP, grows with phase 2
      invCtx.globalAlpha=hpRatio*0.3;
      invCtx.strokeStyle='#fff';
      invCtx.lineWidth=1;
      invCtx.beginPath();invCtx.arc(0,0,50*pulse*gs,0,Math.PI*2);invCtx.stroke();
      // Inner ring
      invCtx.globalAlpha=hpRatio*0.15;
      invCtx.beginPath();invCtx.arc(0,0,35*pulse*gs,0,Math.PI*2);invCtx.stroke();
      // Phase 2 yellow outer aura
      if(bossPhase2){
        invCtx.globalAlpha=0.12*gs;
        invCtx.strokeStyle='rgba(255,220,50,0.6)';
        invCtx.lineWidth=3;
        invCtx.shadowColor='rgba(255,220,50,0.7)';
        invCtx.shadowBlur=22*gs;
        invCtx.beginPath();invCtx.arc(0,0,58*pulse*gs,0,Math.PI*2);invCtx.stroke();
        invCtx.shadowBlur=0;
      }
      // Glitch block on hit
      if(e.glitchTimer>0){
        invCtx.globalAlpha=0.25;
        invCtx.fillStyle='#fff';
        invCtx.fillRect(-44*gs,-28*gs,88*gs,56*gs);
      }
      // Teleport landing flash
      if(bossTeleportFlash>0){
        invCtx.globalAlpha=(bossTeleportFlash/12)*0.7;
        invCtx.fillStyle='#fff';
        invCtx.fillRect(-60*gs,-40*gs,120*gs,80*gs);
      }
      // Boss glyph — grows with scale
      invCtx.globalAlpha=bossAlpha;
      const fontSize=Math.round(42*gs);
      invCtx.font=`${fontSize}px 'BlackChancery', serif`;
      invCtx.fillStyle='#fff';
      invCtx.textAlign='center';invCtx.textBaseline='middle';
      invCtx.fillText(e.glyph,0,0);
      // Update hitbox to match growth
      e.cellW=90*gs; e.cellH=60*gs;
      // Boss HP — drawn as full-width canvas bar at top (see invDraw)
    } else {
      const alpha=0.5+0.4*(Math.sin(e.flicker*1.3)*0.5+0.5);
      invCtx.translate(e.x+e.glitchOffset,e.y);
      if(e.glitchTimer>0){
        invCtx.globalAlpha=0.4;
        invCtx.fillStyle='#fff';
        invCtx.fillRect(-e.cellW*0.35,-e.cellH*0.35,e.cellW*0.7,e.cellH*0.7);
      }
      invCtx.globalAlpha=alpha;
      invCtx.font="18px 'BlackChancery', serif";
      invCtx.fillStyle=e.row===0?'#fff':'rgba(255,255,255,0.72)';
      invCtx.textAlign='center';invCtx.textBaseline='middle';
      invCtx.fillText(e.glyph,0,0);
    }
    invCtx.restore();
  }

  // ── ACTIVE VFX SPRITES ──
  for(let v of activeVfx){
    if(v.frame>=v.totalFrames) continue;
    invCtx.save();
    invCtx.globalCompositeOperation=v.blendMode;
    invCtx.drawImage(
      v.img,
      v.frame*v.frameW, 0, v.frameW, v.frameH, // source slice
      v.x, v.y, v.w, v.h                        // dest on canvas
    );
    invCtx.restore();
    v.frame++;
  }
  activeVfx=activeVfx.filter(v=>v.frame<v.totalFrames);

  // ── BOSS HP BAR — top of canvas, full width ──
  if(invWave===5){
    const boss=invEntities.find(e=>e.isBoss&&e.alive);
    if(boss){
      const hpRatio=boss.hp/boss.maxHp;
      const barH=3, padX=24, barY=10;
      const barW=cw-padX*2;
      invCtx.save();
      invCtx.globalAlpha=0.18;
      invCtx.fillStyle='#fff';
      invCtx.fillRect(padX,barY,barW,barH);
      invCtx.globalAlpha=0.75;
      invCtx.fillStyle=hpRatio>0.5?'#fff':'rgba(255,220,50,0.9)'; // yellow in p2
      invCtx.fillRect(padX,barY,barW*hpRatio,barH);
      // Label
      invCtx.globalAlpha=0.28;
      invCtx.font="8px 'BlackChancery', serif";
      invCtx.fillStyle='#fff';
      invCtx.textAlign='right';
      invCtx.textBaseline='middle';
      invCtx.fillText('VOID',padX-6,barY+barH/2);
      invCtx.restore();
    }
  }

  // ── PLAYER HP BAR — bottom of canvas, above shooter ──
  {
    const padX=24, barH=2, barY=ch-20;
    const barW=cw-padX*2;
    const pct=Math.max(0,invPlayerHp/PLAYER_MAX_HP);
    invCtx.save();
    invCtx.globalAlpha=0.09;
    invCtx.fillStyle='#fff';
    invCtx.fillRect(padX,barY,barW,barH);
    invCtx.globalAlpha=0.58;
    invCtx.fillStyle=invPlayerHp<=30?'rgba(220,60,60,0.9)':'#fff';
    invCtx.fillRect(padX,barY,barW*pct,barH);
    invCtx.globalAlpha=0.22;
    invCtx.font="8px 'BlackChancery', serif";
    invCtx.fillStyle='#fff';
    invCtx.textAlign='right';
    invCtx.textBaseline='middle';
    invCtx.fillText(`${Math.max(0,invPlayerHp)}`,padX-6,barY+barH/2);
    invCtx.restore();
  }

  // ── SHOOTER ──
  invCtx.save();
  invCtx.translate(invShooterX,ch-54);
  invCtx.strokeStyle='rgba(255,255,255,0.85)';
  invCtx.lineWidth=1.5;
  invCtx.beginPath();invCtx.moveTo(0,-13);invCtx.lineTo(-11,9);invCtx.lineTo(0,4);invCtx.lineTo(11,9);invCtx.closePath();invCtx.stroke();
  invCtx.restore();

  const invNow=Date.now();
  const scanY=(invNow*0.035)%ch;
  invCtx.save();invCtx.globalAlpha=0.02;invCtx.fillStyle='#fff';invCtx.fillRect(0,scanY,cw,2);invCtx.restore();
}

// Nuka skill removed — warh replaced it. Stubs preserve export contract.
function resolveNukaInput(key){ /* no-op */ }
function startNukaSkill(auto){ /* no-op */ }

function handleInvaderKeydown(e){
  if(invNukaSkillActive && /^[a-zA-Z]$/.test(e.key)){
    e.preventDefault();
    resolveNukaInput(e.key);
  }
  if(e.code==='Space' && (invUpgrade==='nuka'||invBossUpgrade==='nuka') && state.running && state.currentRound===1 && !invNukaSkillActive && Date.now()>=invNukaCooldownUntil){
    e.preventDefault();
    startNukaSkill(false);
  }
}

function getRound2DebugInfo() {
  const cfg = INV_WAVE_CONFIG[invWave];
  return {
    wave: invWave + 1,
    isBossWave: invWave === 5,
    descentSpeed: cfg ? cfg.descentSpeed : null,
    baseBulletSpeed: INV_BULLET_SPEED,
    nukaBulletSpeed: INV_BULLET_SPEED * 0.5,
    upgrade: invUpgrade,
    running: state.running,
    invRafAlive: invRaf !== null
  };
}

export { startInvaders, stopInvaders, resolveNukaInput, handleInvaderKeydown, getRound2DebugInfo };
