// ── VOID INVADERS ENGINE ──
import { state } from '../state.js';
import { field, msgEl, setComboValue, showFail } from '../ui.js';
import { playThud, playBulletFire, playMissileFire, playEnemyDeath, playWaveClear,
  playUpgradePick, playAoeTrigger, playMachinaBurst, playNukaActivate, playNukaSuccess,
  playPlayerDamage, playBossWaveCast,
  playDuaBeamCharge, playDuaBeamFire, resetDuaBeamDegradation } from '../audio.js';
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
const INV_BOSS_HP=313; // base — scales ×1.5 per upgrade chosen

// Player HP
const PLAYER_MAX_HP=100;
let invPlayerHp=PLAYER_MAX_HP;

let invWave2Upgrade=null;  // tracks wave 2 pick independently
let invWave4Upgrade=null;  // tracks wave 4 pick independently

// beam + dua beam click-fire cooldowns
const BEAM_CD=450;
const DUA_BEAM_CD=450;
const SALVO_CD=1000;
const OVERCHARGE_CD=2000;
let invBeamCooldownUntil=0;
let invDuaBeamCooldownUntil=0;
let invSalvoCooldownUntil=0;
let invOverchargeCooldownUntil=0;
let invSemicCooldownUntil=0;
let invBeamHoldInterval=null;
let invDuaBeamHoldInterval=null;

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
const BOSS_PINCER_SPEED=5.25;            // was 3.5 × 1.5 — pincer active from phase 1
const BOSS_WAVE_SPEED=4.8;               // was 3.2 × 1.5 — wave active from phase 2

// VFX sprite sheet — wave ability
// Travelling wave VFX — WebM video element + 2 echo trails
let vfxWaveVideo=null;
let vfxWaveEcho1=null;
let vfxWaveEcho2=null;
let vfxWaveRaf=null;

function _makeWaveVideo(opacity){
  const v=document.createElement('video');
  v.src='assets/vfx_wave.webm';
  v.preload='auto';
  v.muted=true;
  v.playsInline=true;
  v.style.cssText=`position:fixed;pointer-events:none;mix-blend-mode:normal;display:none;z-index:50;transform-origin:center center;opacity:${opacity};`;
  document.body.appendChild(v);
  return v;
}

function loadVfxAssets(){
  if(vfxWaveVideo) return;
  vfxWaveVideo=_makeWaveVideo(1);
  vfxWaveEcho1=_makeWaveVideo(0.45);
  vfxWaveEcho2=_makeWaveVideo(0.2);
}

// Boss sprite pool — one chosen at random on spawn
const BOSS_SPRITES=['ꋫ','ꊰ','ꉣ','ꇓ','ꆼ'];

let bossGrowthScale=1;    // lerps to 1.38 at phase 2 transition
let bossGlitchBurst=0;    // frames remaining for phase 2 glitch burst

let invWave=0;        // 0-indexed, 0-5
let invTransitioning=false;
let invUpgrade=null;
let invBossUpgrade=null; // additional upgrade chosen at boss start
let invWave5ProtectUntil=0; // 300ms beam immunity for wave 5 only

// ── Fokus Lina state ──
let flChargeStart=0;
let flCharging=false;
let flFiring=false;
let flFireStart=0;
let flCurrentW=113;
let flLastWidthStep=0;
let flRaf=null;

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
// damage float texts — {amount, x, y, alpha, vy}
let _dmgFloats=[];

function triggerHpDrainAnimation(fromHp, toHp){
  if(!invCanvas||!invCtx)return;
  const amount=fromHp-toHp;
  _hpAberrationFrames=18;
  _hpGlitchFrames=10;

  // Floating -hp text on shooter sprite
  if(invCanvas){
    _dmgFloats.push({
      text:'-'+amount,
      x:invShooterX,
      y:invCanvas.height-70,
      alpha:1,
      vy:-0.9
    });
  }

  // Primary vignette flash — purple
  if(_hpScreenFlashRaf){cancelAnimationFrame(_hpScreenFlashRaf);_hpScreenFlashRaf=null;}
  let flashAlpha=0.32;
  const flashStep=()=>{
    if(!invCtx||!invCanvas){_hpScreenFlashRaf=null;return;}
    const cw=invCanvas.width,ch=invCanvas.height;
    invCtx.save();
    invCtx.globalAlpha=flashAlpha;
    const grad=invCtx.createRadialGradient(cw/2,ch/2,ch*0.08,cw/2,ch/2,ch*0.9);
    grad.addColorStop(0,'rgba(80,0,120,0)');
    grad.addColorStop(1,'rgba(130,30,200,0.95)');
    invCtx.fillStyle=grad;
    invCtx.fillRect(0,0,cw,ch);
    invCtx.restore();
    flashAlpha-=0.022;
    if(flashAlpha>0) _hpScreenFlashRaf=requestAnimationFrame(flashStep);
    else _hpScreenFlashRaf=null;
  };
  _hpScreenFlashRaf=requestAnimationFrame(flashStep);

  // Echo — dimmer purple flash at 120ms
  setTimeout(()=>{
    if(!invCtx||!invCanvas)return;
    let echoAlpha=0.14;
    const echoStep=()=>{
      if(!invCtx||!invCanvas)return;
      const cw=invCanvas.width,ch=invCanvas.height;
      invCtx.save();
      invCtx.globalAlpha=echoAlpha;
      const grad=invCtx.createRadialGradient(cw/2,ch/2,ch*0.08,cw/2,ch/2,ch*0.9);
      grad.addColorStop(0,'rgba(80,0,120,0)');
      grad.addColorStop(1,'rgba(130,30,200,0.9)');
      invCtx.fillStyle=grad;
      invCtx.fillRect(0,0,cw,ch);
      invCtx.restore();
      echoAlpha-=0.018;
      if(echoAlpha>0) requestAnimationFrame(echoStep);
    };
    requestAnimationFrame(echoStep);
  }, 120);
}
const INV_AOE_RADIUS=40;
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

// wave 0–5: black opacity 15/25/40/55/65/70%, orb opacity scales proportionally
const _BG_BLACK=[0.15,0.25,0.40,0.55,0.65,0.70];
const _BG_ORB  =[0.12,0.22,0.35,0.50,0.62,0.72];
function _updateInvBg(wave){
  const invBg=document.getElementById('inv-bg');
  if(!invBg) return;
  const w=Math.min(wave,5);
  const blackAlpha=_BG_BLACK[w];
  const orbAlpha=_BG_ORB[w];
  invBg.style.backgroundColor=`rgba(0,0,0,${blackAlpha})`;
  const orbs=invBg.querySelectorAll('.inv-orb');
  // Boss wave: orbs grow slightly
  const scale=w===5?1.35:1;
  orbs.forEach(orb=>{
    orb.style.opacity=orbAlpha;
    orb.style.transform=scale!==1?`scale(${scale})`:'';
  });
}

function startInvaders(){
  invWave=0;
  invTransitioning=false;
  invUpgrade=null;
  invBossUpgrade=null;
  invWave2Upgrade=null;
  invWave4Upgrade=null;
  invBeamCooldownUntil=0;
  invDuaBeamCooldownUntil=0;
  invSalvoCooldownUntil=0;
  invOverchargeCooldownUntil=0;
  invSemicCooldownUntil=0;
  invNukaCooldownUntil=0;
  invNukaSkillActive=false;
  invNukaPromptLetter='';
  hideNukaPrompt();
  setNukaCooldown(false);
  if(invNukaCooldownTimer){clearTimeout(invNukaCooldownTimer);invNukaCooldownTimer=null;}
  // Player HP
  invPlayerHp=PLAYER_MAX_HP;
  updatePlayerHpBar();
  loadVfxAssets();
  flChargeStart=0; flCharging=false; flFiring=false; flFireStart=0;
  flCurrentW=113; flLastWidthStep=0;
  if(flRaf){cancelAnimationFrame(flRaf);flRaf=null;}
  invWave5ProtectUntil=0;
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
  // ── BACKGROUND — black+purple orbs, intensity scales with wave ──
  if(!field.style.position||field.style.position==='') field.style.position='relative';
  let invBg=document.getElementById('inv-bg');
  if(!invBg){
    invBg=document.createElement('div');
    invBg.id='inv-bg';
    invBg.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:0;';
    // Inject orb CSS once
    if(!document.getElementById('inv-bg-style')){
      const st=document.createElement('style');
      st.id='inv-bg-style';
      st.textContent=`
        #inv-bg { background: transparent; }
        #inv-bg .inv-orb {
          position:absolute; border-radius:50%;
          filter:blur(60px); opacity:0;
          animation: invOrbFloat 0s ease-in-out infinite alternate;
          will-change: transform;
        }
        @keyframes invOrbFloat0 { from{transform:translate(0,0)} to{transform:translate(30px,22px)} }
        @keyframes invOrbFloat1 { from{transform:translate(0,0)} to{transform:translate(-24px,35px)} }
        @keyframes invOrbFloat2 { from{transform:translate(0,0)} to{transform:translate(18px,-28px)} }
        @keyframes invOrbFloat3 { from{transform:translate(0,0)} to{transform:translate(-32px,16px)} }
        @keyframes invOrbFloat4 { from{transform:translate(0,0)} to{transform:translate(22px,-18px)} }
      `;
      document.head.appendChild(st);
    }
    // Create 5 orbs with fixed positions/sizes — updated opacity/scale per wave
    const orbDefs=[
      {left:'10%',top:'15%',w:220,h:200,anim:'invOrbFloat0',dur:11},
      {left:'65%',top:'8%', w:260,h:240,anim:'invOrbFloat1',dur:13},
      {left:'40%',top:'50%',w:180,h:200,anim:'invOrbFloat2',dur:9},
      {left:'75%',top:'55%',w:240,h:220,anim:'invOrbFloat3',dur:14},
      {left:'20%',top:'65%',w:200,h:180,anim:'invOrbFloat4',dur:10},
    ];
    orbDefs.forEach((o,i)=>{
      const orb=document.createElement('div');
      orb.className='inv-orb';
      orb.dataset.idx=i;
      orb.style.cssText=`left:${o.left};top:${o.top};width:${o.w}px;height:${o.h}px;background:rgba(120,0,200,0.55);animation:${o.anim} ${o.dur}s ease-in-out infinite alternate;`;
      invBg.appendChild(orb);
    });
    field.insertBefore(invBg,field.firstChild);
  }
  _updateInvBg(0);

  invCanvas=document.createElement('canvas');
  invCanvas.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;cursor:crosshair;z-index:1;';
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
  if(waveIdx===4) invWave5ProtectUntil=Date.now()+300;
  invDescentY=0;
  invEntities=[];
  const cw=invCanvas.width,ch=invCanvas.height;

  if(waveIdx===5){
    // Boss HP scales ×1.5 per upgrade chosen so far
    const upgradeCount=[invWave2Upgrade,invWave4Upgrade,invBossUpgrade].filter(Boolean).length;
    const scaledHp=Math.round(INV_BOSS_HP*Math.pow(1.5,upgradeCount));
    const bossGlyph=BOSS_SPRITES[Math.floor(Math.random()*BOSS_SPRITES.length)];
    invEntities.push({
      isBoss:true,
      baseX:cw/2, baseY:80,
      x:cw/2, y:80,
      alive:true,
      glyph:bossGlyph,
      flicker:0,
      glitchTimer:0,glitchOffset:0,
      hp:scaledHp,
      maxHp:scaledHp,
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
  try{_updateInvBg(invWave);}catch(ex){}

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
    desc.innerHTML='wave 4.<br>choose your augment.<br>dua beam.<br>rapid\'aa.';
  }

  function pickUpgrade(type){
    invUpgrade=type;
    if(mode==='wave2') invWave2Upgrade=type;
    else { invWave4Upgrade=type; }
    try{playUpgradePick();}catch(e){}
    modal.style.display='none';
    state.running=true;
    invTransitioning=false;
    spawnInvaderWave(invWave);
    invLoop();
  }

  rapidBtn.onclick=null; aoeBtn.onclick=null; dblBtn.onclick=null;
  homingBtn.onclick=null; nukaBtn.onclick=null; machinaBtn.onclick=null;
  rapidBtn.onclick=()=>pickUpgrade('rapida');
  aoeBtn.onclick=()=>pickUpgrade('beam');
  dblBtn.onclick=()=>pickUpgrade('dua beam');
  homingBtn.onclick=()=>pickUpgrade('rapidaaa');
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

  // Physics projectile — hit detection unchanged
  bossShockwaves.push({
    x:boss.x, y:boss.y,
    vx:(dx/dist)*BOSS_WAVE_SPEED, vy:(dy/dist)*BOSS_WAVE_SPEED,
    r:20, targetDist:dist,
    travelledDist:0,
    tx, ty, // store target at spawn time — hit detection uses this, not live shooter pos
    hit:false, alive:true
  });
  try{playBossWaveCast();}catch(e){}

  // ── CHARGE ANIMATION — contracting rings on boss over 400ms ──
  const CHARGE_MS=400;
  const chargeStart=performance.now();
  let chargeRaf=null;
  function drawCharge(now){
    if(!invCtx||!invCanvas||!state.running){chargeRaf=null;return;}
    const t=Math.min(1,(now-chargeStart)/CHARGE_MS);
    // Three rings contracting inward: start at r=80, collapse to r=8
    const rings=3;
    for(let i=0;i<rings;i++){
      const phase=(i/rings);
      const rt=Math.max(0,(t+phase)%1); // stagger each ring
      const r=80*(1-rt)+8*rt;
      const alpha=(1-rt)*0.7;
      invCtx.save();
      invCtx.translate(boss.x,boss.y);
      invCtx.globalAlpha=alpha;
      invCtx.strokeStyle=`rgba(160,80,255,${0.9-rt*0.5})`;
      invCtx.lineWidth=1.5*(1-rt*0.5);
      invCtx.shadowColor='rgba(160,80,255,0.8)';
      invCtx.shadowBlur=12*(1-rt);
      invCtx.beginPath();invCtx.arc(0,0,r,0,Math.PI*2);invCtx.stroke();
      invCtx.restore();
    }
    if(t<1) chargeRaf=requestAnimationFrame(drawCharge);
    else { chargeRaf=null; launchWaveVfx(); }
  }
  chargeRaf=requestAnimationFrame(drawCharge);

  // ── WAVE VFX — fires after charge completes ──
  function launchWaveVfx(){
    if(!vfxWaveVideo||!state.running)return;
    if(vfxWaveRaf){cancelAnimationFrame(vfxWaveRaf);vfxWaveRaf=null;}

    const rect=invCanvas.getBoundingClientRect();
    const bossPageX=rect.left+boss.x;
    const bossPageY=rect.top+boss.y;
    const shooterPageX=rect.left+tx;
    const shooterPageY=rect.top+ty;
    const vidW=rect.width*0.25;
    const vidH=vidW*(9/16);
    const angle=Math.atan2(ty-boss.y, tx-boss.x)-Math.PI/2;
    const travelMs=(dist/BOSS_WAVE_SPEED)*(1000/60);

    function styleVid(v){
      v.style.width=vidW+'px';
      v.style.height=vidH+'px';
      v.style.transform=`rotate(${angle}rad)`;
    }

    function animateVid(v, delayMs){
      setTimeout(()=>{
        if(!state.running){v.style.display='none';return;}
        v.currentTime=0;
        v.style.display='block';
        styleVid(v);
        v.play().catch(()=>{});
        v.onended=()=>{ v.style.display='none'; };
        const start=performance.now();
        function step(now){
          const t=Math.min(1,(now-start)/travelMs);
          const cx=bossPageX+(shooterPageX-bossPageX)*t;
          const cy=bossPageY+(shooterPageY-bossPageY)*t;
          v.style.left=(cx-vidW/2)+'px';
          v.style.top=(cy-vidH/2)+'px';
          if(t<1&&state.running) requestAnimationFrame(step);
          else v.style.display='none';
        }
        requestAnimationFrame(step);
      }, delayMs);
    }

    animateVid(vfxWaveVideo, 0);
    animateVid(vfxWaveEcho1, 120);
    animateVid(vfxWaveEcho2, 220);
  }
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
  if(vfxWaveRaf){cancelAnimationFrame(vfxWaveRaf);vfxWaveRaf=null;}
  if(vfxWaveVideo){vfxWaveVideo.pause();vfxWaveVideo.style.display='none';}
  if(vfxWaveEcho1){vfxWaveEcho1.pause();vfxWaveEcho1.style.display='none';}
  if(vfxWaveEcho2){vfxWaveEcho2.pause();vfxWaveEcho2.style.display='none';}
  bossShockwaves=[];bossPincers=[];bossTeleportFlash=0;
}

function updateBossAbilities(){
  const boss=invEntities.find(e=>e.isBoss&&e.alive);
  if(!boss||!invCanvas)return;

  // Phase 2 transition at ≤50% HP
  if(!bossPhase2&&boss.hp<=boss.maxHp*0.5){
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
    // Player hit — use stored target position, tightened hitbox
    if(!s.hit && Math.hypot(s.x-s.tx, s.y-s.ty)<s.r*0.35){
      s.hit=true;
      s.alive=false; // kill wave immediately on hit
      const dmg=31+Math.floor(Math.random()*4); // 31-34
      damagePlayer(dmg);
    }
    // Despawn once past the bottom or past target
    if(s.y>ch+40 || s.travelledDist>s.targetDist+60) s.alive=false;
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

  // Travelling wave — canvas fallback crescent (visible if video not loaded)
  for(let s of bossShockwaves){
    const progress=Math.min(1, s.travelledDist/(s.targetDist||1));
    const angle=Math.atan2(s.vy,s.vx);
    invCtx.save();
    invCtx.translate(s.x,s.y);
    invCtx.rotate(angle-Math.PI/2);
    invCtx.globalAlpha=0.18;
    invCtx.strokeStyle='rgba(255,230,80,0.7)';
    invCtx.lineWidth=2;
    invCtx.beginPath();invCtx.arc(0,0,s.r,Math.PI*0.1,Math.PI*0.9);invCtx.stroke();
    invCtx.restore();
  }
}

function showBossUpgradeModal(){
  state.running=false;
  if(invRaf){cancelAnimationFrame(invRaf);invRaf=null;}
  const modal=document.getElementById('boss-upgrade-modal');
  const desc=document.getElementById('boss-upgrade-desc');
  const btn1=document.getElementById('boss-upgrade-nuka');
  const btn2=document.getElementById('boss-upgrade-machina');
  modal.style.display='flex';
  btn1.onclick=null; btn2.onclick=null;

  const isMissileDoublets=invWave2Upgrade==='beam'&&invWave4Upgrade==='dua beam';
  const isRapidaMachina=(invWave2Upgrade==='rapida'&&invWave4Upgrade==='rapidaaa')||(invWave2Upgrade==='rapidaaa'&&invWave4Upgrade==='rapida');
  const isSemic=(invWave2Upgrade==='rapida'&&invWave4Upgrade==='dua beam')||(invWave2Upgrade==='dua beam'&&invWave4Upgrade==='rapida');

  // Reset button styles
  btn1.style.cssText=''; btn2.style.display=''; btn2.style.cssText='';

  if(isMissileDoublets){
    if(desc) desc.innerHTML='the void.<br>beam + dua beam.<br>fokus lina.';
    btn1.textContent='fokus lina.';
    btn1.style.cssText='display:block;margin:0 auto;';
    btn2.style.display='none';
    btn1.onclick=()=>pickBossUpgrade('fokus_lina');
    btn2.onclick=null;
  } else if(isSemic){
    if(desc) desc.innerHTML='the void.<br>rapida + dua beam.<br>burst.';
    btn1.textContent='semic.';
    btn1.style.cssText='display:block;margin:0 auto;';
    btn2.style.display='none';
    btn1.onclick=()=>pickBossUpgrade('semic');
    btn2.onclick=null;
  } else if(isRapidaMachina){
    if(desc) desc.innerHTML='the void.<br>rapida + rapid\'aa.<br>convergence.';
    btn1.textContent='machina.';
    btn1.style.cssText='display:block;margin:0 auto;';
    btn2.style.display='none';
    btn1.onclick=()=>pickBossUpgrade('machina');
    btn2.onclick=null;
  } else {
    if(desc) desc.innerHTML='the void.<br>choose your final augment.';
    btn1.textContent='???';
    btn2.textContent='???';
    btn1.onclick=()=>pickBossUpgrade(null);
    btn2.onclick=()=>pickBossUpgrade(null);
  }

  function pickBossUpgrade(type){
    invBossUpgrade=type;
    try{playUpgradePick();}catch(e){}
    modal.style.display='none';
    state.running=true;
    invTransitioning=false;
    startBossAbilities();
    spawnInvaderWave(invWave);
    invSalvoCooldownUntil=0;
    invOverchargeCooldownUntil=0;
    invSemicCooldownUntil=0;
    invLoop();
  }
}

function stopInvaders(){
  if(invRaf){cancelAnimationFrame(invRaf);invRaf=null;}
  if(invNukaKeycapRaf){cancelAnimationFrame(invNukaKeycapRaf);invNukaKeycapRaf=null;}
  if(invFireInterval){clearInterval(invFireInterval);invFireInterval=null;}
  stopBossAbilities();
  stopWarhAutoFire();
  if(invBeamHoldInterval){clearInterval(invBeamHoldInterval);invBeamHoldInterval=null;}
  if(invDuaBeamHoldInterval){clearInterval(invDuaBeamHoldInterval);invDuaBeamHoldInterval=null;}
  invBeamCooldownUntil=0;
  invDuaBeamCooldownUntil=0;
  invMouseDown=false;
  invUpgrade=null;
  invBossUpgrade=null;
  invWave2Upgrade=null;
  invWave4Upgrade=null;
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
  const _bg=document.getElementById('inv-bg');
  if(_bg) _bg.remove();
  try{resetDuaBeamDegradation();}catch(ex){}
}

function invHandleMove(e){
  if(!state.running)return;
  const r=invCanvas.getBoundingClientRect();
  let lerp=0.18;
  if(flFiring) lerp=0.18*0.30;
  else if(flCharging) lerp=0.18*0.50;
  invShooterX+=(e.clientX-r.left-invShooterX)*lerp;
}

function invHandleMouseDown(e){
  if(!state.running)return;
  invMouseDown=true;
  const _r=invCanvas.getBoundingClientRect();
  invShooterX=e.clientX-_r.left;
  if(invFireInterval){clearInterval(invFireInterval);invFireInterval=null;}
  if(invBeamHoldInterval){clearInterval(invBeamHoldInterval);invBeamHoldInterval=null;}
  if(invDuaBeamHoldInterval){clearInterval(invDuaBeamHoldInterval);invDuaBeamHoldInterval=null;}

  const activeUpgradeForRate=invBossUpgrade||invWave4Upgrade||invUpgrade;

  // Fokus Lina — intercepts beam/dua beam on boss wave
  if(flCanActivate()&&!flFiring&&!flCharging){ flStartCharge(); return; }
  // warh — single shot per click, no hold
  if(activeUpgradeForRate==='warh'){ fireWarh(); return; }

  // boss combos — hold-to-fire
  if(invBossUpgrade==='salvo'){
    fireSalvo();
    invBeamHoldInterval=setInterval(()=>{if(!state.running||!invMouseDown){clearInterval(invBeamHoldInterval);invBeamHoldInterval=null;return;}fireSalvo();},SALVO_CD);
    return;
  }
  if(invBossUpgrade==='overcharge'){
    fireOvercharge();
    invBeamHoldInterval=setInterval(()=>{if(!state.running||!invMouseDown){clearInterval(invBeamHoldInterval);invBeamHoldInterval=null;return;}fireOvercharge();},OVERCHARGE_CD);
    return;
  }
  if(invBossUpgrade==='semic'){
    fireSemic();
    invBeamHoldInterval=setInterval(()=>{if(!state.running||!invMouseDown){clearInterval(invBeamHoldInterval);invBeamHoldInterval=null;return;}fireSemic();},SEMIC_BURST_MS);
    return;
  }

  // doublets (wave4) — hold-to-fire, suppresses base bullet
  if(activeUpgradeForRate==='dua beam'){
    try{playDuaBeamCharge();}catch(ex){}
    fireDuaBeam(); try{playDuaBeamFire();}catch(ex){}
    invDuaBeamHoldInterval=setInterval(()=>{if(!state.running||!invMouseDown){clearInterval(invDuaBeamHoldInterval);invDuaBeamHoldInterval=null;return;}fireDuaBeam();try{playDuaBeamFire();}catch(ex){}},DUA_BEAM_CD);
    // beam (wave2) subsumed by dua beam — no separate interval when stacked
    if(false && invWave2Upgrade==='beam'){
      fireMissile();
      invMissileHoldInterval=setInterval(()=>{if(!state.running||!invMouseDown){clearInterval(invMissileHoldInterval);invMissileHoldInterval=null;return;}fireMissile();},MISSILE_CD);
    }
    return;
  }

  // missile (wave2) alone — hold-to-fire, suppress base bullet
  if(invWave2Upgrade==='beam'){
    fireBeam();
    invBeamHoldInterval=setInterval(()=>{if(!state.running||!invMouseDown){clearInterval(invBeamHoldInterval);invBeamHoldInterval=null;return;}fireBeam();},BEAM_CD);
    // only skip base bullet if no wave4/boss upgrade that uses bullet fire
    const needsBullet=activeUpgradeForRate==='rapida'||activeUpgradeForRate==='rapidaaa'||activeUpgradeForRate==='machina';
    if(!needsBullet) return;
  }

  // base bullet / rapida / rapidaaa / machina — hold-to-fire
  invFire();
  const rateUpgrade=invBossUpgrade==='machina'?'machina':(invWave4Upgrade||invUpgrade);
  const rate=rateUpgrade==='machina'?INV_FIRE_RATE/3.2
    :rateUpgrade==='rapidaaa'?INV_FIRE_RATE/2.8
    :rateUpgrade==='rapida'?INV_FIRE_RATE/2
    :INV_FIRE_RATE;
  invFireInterval=setInterval(()=>{
    if(!state.running||!invMouseDown){clearInterval(invFireInterval);invFireInterval=null;return;}
    invFire();
  },rate);
}

function invHandleMouseUp(){
  invMouseDown=false;
  if(invFireInterval){clearInterval(invFireInterval);invFireInterval=null;}
  if(invBeamHoldInterval){clearInterval(invBeamHoldInterval);invBeamHoldInterval=null;}
  if(invDuaBeamHoldInterval){clearInterval(invDuaBeamHoldInterval);invDuaBeamHoldInterval=null;}
  try{resetDuaBeamDegradation();}catch(ex){}
}

function invHandleSingleClick(e){
  if(!state.running)return;
  const r=invCanvas.getBoundingClientRect();
  invShooterX=e.clientX-r.left;
  // Firing handled by mousedown — click only repositions shooter
  // Cooldown-gated weapons: safe to double-call since each checks its own cooldown
  if((invBossUpgrade||invUpgrade)==='warh') fireWarh();
  if(invBossUpgrade==='salvo') fireSalvo();
  if(invBossUpgrade==='overcharge') fireOvercharge();
  // beam/dua beam fire handled by mousedown only
}

function invFire(){
  if(!state.running||!invCanvas)return;
  // During boss wave: machina overrides click weapon; else use wave4 upgrade.
  // Wave2 upgrade (rapidfire/aoe) stacks separately — handled via interval/AOE system.
  const activeUpgrade=invBossUpgrade==='machina'?'machina':invWave4Upgrade||invUpgrade;
  const ch=invCanvas.height;
  const spawnBullet=(x)=>{
    const isMissile=activeUpgrade==='beam'||activeUpgrade==='rapidaaa';
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
  } else if(activeUpgrade==='rapidaaa'||activeUpgrade==='beam'||activeUpgrade==='dua beam'){
    spawnBullet(invShooterX);
    try{playMissileFire();}catch(e){}
  } else {
    spawnBullet(invShooterX);
    try{playBulletFire();}catch(e){}
  }
}

// ── BEAM — click-fire, 450ms interval, 113px wide, instant vertical clear + cast VFX ──
const BEAM_WIDTH=113;
function fireBeam(widthOverride){
  if(!state.running||!invCanvas)return;
  _castAndFireBeam(invShooterX, widthOverride||BEAM_WIDTH, 1);
}

function _castAndFireBeam(cx, bw, dmg){
  const ch=invCanvas.height;
  if(Date.now()<invWave5ProtectUntil) return;
  const hitR=bw/2;
  for(let e of invEntities){
    if(!e.alive)continue;
    if(Math.abs(e.x-cx)<=hitR){
      if(e.isBoss){
        e.hp-=dmg;
        if(e.hp<=0){
          e.alive=false;
          invSpawnParticles(e.x,e.y,2);
          try{playEnemyDeath(0.4);}catch(ex){}
        }
      } else {
        e.alive=false;
        invSpawnParticles(e.x,e.y,1);
        try{playEnemyDeath(0.8+Math.random()*0.6);}catch(ex){}
        state.combo=Math.min(state.combo+1,8);
        setComboValue('×'+state.combo);
      }
    }
  }
  try{playAoeTrigger();}catch(e){}
  const _cfg=INV_WAVE_CONFIG[Math.min(invWave,INV_WAVE_CONFIG.length-2)];
  const _rows=_cfg?_cfg.rows:5;
  const _beamTopOverride=(bw>=200)?36+Math.max(0,_rows-4)*44:0;
  invParticles.push({
    isBeam:true, x:cx, bw,
    startTime:Date.now(),
    castDur:150, flashDur:120, fadeDur:180,
    life:1, alpha:1, vx:0, vy:0,
    beamTopOverride:_beamTopOverride
  });
}

// ── DUA BEAM — click-fire, 450ms interval, 280px wide ──
const DUA_BEAM_WIDTH=280;
function fireDuaBeam(){
  if(!state.running||!invCanvas)return;
  _castAndFireBeam(invShooterX, DUA_BEAM_WIDTH, 1);
}


// ── SEMIC — boss-wave only (rapida + dua beam), 500ms burst interval ──
// Width: 2cm→4cm over 0–300ms, 4cm→0 over 300–500ms. Damage scales with overlap.
const SEMIC_BURST_MS = 500;
const SEMIC_W_START  = 76;   // ~2cm at 96dpi
const SEMIC_W_PEAK   = 152;  // ~4cm at 96dpi
const SEMIC_TOTAL_DMG = 30;

function fireSemic(){
  if(!state.running||!invCanvas) return;
  if(Date.now()<invSemicCooldownUntil) return;
  if(Date.now()<invWave5ProtectUntil) return;
  invSemicCooldownUntil = Date.now() + SEMIC_BURST_MS;
  const cx = invShooterX;
  const startTime = Date.now();
  invParticles.push({
    isSemic:true, x:cx,
    startTime,
    totalMs: SEMIC_BURST_MS,
    dmgDealt: 0,               // accumulated so we cap at SEMIC_TOTAL_DMG
    lastDmgT: startTime,       // for per-frame delta
    life:1, alpha:1, vx:0, vy:0
  });
}

// ── FOKUS LINA — boss-wave only, 3s charge + 4s ramping beam ──
const FL_CHARGE_DUR=3000;
const FL_FIRE_DUR=4000;
const FL_DMG_START=4;
const FL_DMG_CAP=27;
const FL_WIDTH_BASE=113;
const FL_TICK_MS=50;

function flCanActivate(){
  return invBossUpgrade==='fokus_lina' && invWave===5;
}

function flCancel(){
  flCharging=false; flFiring=false;
  flChargeStart=0; flFireStart=0;
  flCurrentW=FL_WIDTH_BASE; flLastWidthStep=0;
  if(flRaf){cancelAnimationFrame(flRaf);flRaf=null;}
}

function flStartCharge(){
  if(flFiring) return;
  flCharging=true; flFiring=false;
  flChargeStart=Date.now();
  flCurrentW=FL_WIDTH_BASE; flLastWidthStep=0;
  flRaf=requestAnimationFrame(flChargeLoop);
}

function flChargeLoop(){
  if(!flCharging||!state.running||!invMouseDown){ flCancel(); return; }
  if(Date.now()-flChargeStart>=FL_CHARGE_DUR){
    flCharging=false; flFiring=true;
    flFireStart=Date.now();
    flRaf=requestAnimationFrame(flFireLoop);
    return;
  }
  flRaf=requestAnimationFrame(flChargeLoop);
}

function flFireLoop(){
  if(!flFiring||!invMouseDown){ flCancel(); return; } // only mouseup cancels fire phase
  const t=(Date.now()-flFireStart)/1000;
  const tClamped=Math.min(t, FL_FIRE_DUR/1000);
  const dmg=Math.min(FL_DMG_START+(FL_DMG_CAP-FL_DMG_START)*(tClamped/(FL_FIRE_DUR/1000)), FL_DMG_CAP);
  const stepIdx=Math.floor(tClamped);
  if(stepIdx>flLastWidthStep && stepIdx<=4){
    flCurrentW=Math.round(flCurrentW*1.25);
    flLastWidthStep=stepIdx;
  }
  const hitR=flCurrentW/2;
  for(let e of invEntities){
    if(!e.alive||!e.isBoss)continue;
    if(Math.abs(e.x-invShooterX)<=hitR){
      e.hp-=dmg*(FL_TICK_MS/1000);
      if(e.hp<=0){
        e.alive=false;
        invSpawnParticles(e.x,e.y,3);
        try{playEnemyDeath(0.3);}catch(ex){}
        flCancel(); return;
      }
    }
  }
  invParticles.push({
    isBeam:true, x:invShooterX, bw:flCurrentW,
    startTime:Date.now(),
    castDur:0, flashDur:FL_TICK_MS, fadeDur:80,
    life:1, alpha:1, vx:0, vy:0, isFokusLina:true
  });
  // Continue firing at max damage/width until mouseup — no hard stop at duration cap
  setTimeout(()=>{flRaf=requestAnimationFrame(flFireLoop);}, FL_TICK_MS);
}


// ── SALVO — boss combo: fires missile AOE + doublet pair simultaneously, 1s cooldown ──
function fireSalvo(){
  if(!state.running||!invCanvas)return;
  const now=Date.now();
  if(now<invSalvoCooldownUntil)return;
  invSalvoCooldownUntil=now+SALVO_CD;
  const ch=invCanvas.height;
  // Missile AOE — same logic as fireMissile but bypasses its own cooldown gate
  const aliveRows=[...new Set(invEntities.filter(e=>e.alive).map(e=>Math.round(e.y)))].sort((a,b)=>a-b);
  let targetY=ch/2;
  if(aliveRows.length){
    targetY=aliveRows.reduce((best,row)=>
      Math.abs(row-ch/2)<Math.abs(best-ch/2)?row:best
    ,aliveRows[0]);
  }
  _castAndFireBeam(invShooterX, BEAM_WIDTH, 1);
  // Doublet pair — straight + diagonal homing
  invBullets.push({x:invShooterX-18,y:ch-67,vx:0,vy:-INV_BULLET_SPEED,trail:[],hit:false,kind:'missile',pierceLeft:0});
  const alive=invEntities.filter(e=>e.alive&&!e.isBoss&&e.col!==undefined);
  let vx=12,vy=-INV_BULLET_SPEED;
  if(alive.length){
    const tgt=alive.reduce((best,e)=>{
      const score=alive.filter(o=>Math.abs(o.col-e.col)<=2).length;
      const bScore=alive.filter(o=>Math.abs(o.col-best.col)<=2).length;
      return score>bScore?e:best;
    },alive[0]);
    const dx=tgt.x-(invShooterX+18),dy=tgt.y-(ch-67);
    const dist=Math.hypot(dx,dy)||1;
    vx=(dx/dist)*INV_BULLET_SPEED; vy=(dy/dist)*INV_BULLET_SPEED;
  }
  invBullets.push({x:invShooterX+18,y:ch-67,vx,vy,trail:[],hit:false,kind:'missile',pierceLeft:0,isDiagonalHoming:true});
  try{playAoeTrigger();}catch(e){}
  try{playMissileFire();}catch(e){}
}

// ── OVERCHARGE — boss combo: massive column-clear (AOE radius ×2.5) + aimed diagonal at boss, 2s cooldown ──
function fireOvercharge(){
  if(!state.running||!invCanvas)return;
  const now=Date.now();
  if(now<invOverchargeCooldownUntil)return;
  invOverchargeCooldownUntil=now+OVERCHARGE_CD;
  const ch=invCanvas.height;
  const wideR=INV_AOE_RADIUS*2.5;
  // Wide column-clear — all enemies in 2.5× radius column, all rows
  invParticles.push({x:invShooterX,y:ch/2,vx:0,vy:0,life:0.9,alpha:1,isAoe:true,r:wideR});
  for(let e of invEntities){
    if(!e.alive||e.isBoss)continue;
    if(Math.abs(e.x-invShooterX)<=wideR){
      e.hp=0; e.alive=false;
      invSpawnParticles(e.x,e.y,1);
      try{playEnemyDeath(0.8+Math.random()*0.6);}catch(ex){}
      state.combo=Math.min(state.combo+1,8);
      setComboValue('×'+state.combo);
    }
  }
  // Diagonal missile aimed directly at boss
  const boss=invEntities.find(e=>e.isBoss&&e.alive);
  let vx=0,vy=-INV_BULLET_SPEED;
  if(boss){
    const dx=boss.x-invShooterX,dy=boss.y-(ch-67);
    const dist=Math.hypot(dx,dy)||1;
    vx=(dx/dist)*INV_BULLET_SPEED; vy=(dy/dist)*INV_BULLET_SPEED;
  }
  invBullets.push({x:invShooterX,y:ch-67,vx,vy,trail:[],hit:false,kind:'warh',pierceLeft:0,isWarh:true,warhHoming:false});
  try{playAoeTrigger();}catch(e){}
  try{playMissileFire();}catch(e){}
}
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

  // Bullets
  for(let b of invBullets){
    b.trail.push({x:b.x,y:b.y});
    if(b.trail.length>8)b.trail.shift();
    if(invWave4Upgrade==='rapidaaa'||invUpgrade==='rapidaaa'){
      const alive=invEntities.filter(e=>e.alive&&!e.isBoss);
      if(alive.length){
        const target=alive.reduce((best,e)=>e.y>best.y?e:best, alive[0]);
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
            const colRange=b.kind==='warh'?1:b.isDiagonalHoming?2:0; // warh ±1, diag ±2, normal col only
            const cols=[];
            for(let c=e.col-colRange;c<=e.col+colRange;c++) cols.push(c);
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
            const damage=e.isBoss?((b.kind==='missile')?7:b.kind==='warh'?WARH_DAMAGE:b.kind==='machina'?0.7:0.5):1;
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
  invBullets=invBullets.filter(b=>{
    if(b.hit) return false;
    if(b.y<-20||b.y>invCanvas.height+20) return false;
    if(b.vx&&(b.x<-60||b.x>invCanvas.width+60)) return false;
    return true;
  });
  for(let p of invParticles){
    if(p.isBeam){
      const elapsed=Date.now()-p.startTime;
      const total=p.castDur+p.flashDur+p.fadeDur;
      if(elapsed>=total){ p.life=0; }
    } else if(p.isSemic){
      const now=Date.now();
      const elapsed=now-p.startTime;
      if(elapsed>=p.totalMs){ p.life=0; }
      else {
        // Width at this moment — ramp up 0→300ms, ramp down 300→500ms
        const halfBw = elapsed<300
          ? (SEMIC_W_START+(SEMIC_W_PEAK-SEMIC_W_START)*(elapsed/300))/2
          : (SEMIC_W_PEAK*(1-(elapsed-300)/200))/2;
        // Per-frame damage: proportional to overlap fraction with boss
        const boss=invEntities.find(e=>e.alive&&e.isBoss);
        if(boss && p.dmgDealt<SEMIC_TOTAL_DMG){
          const dt=now-p.lastDmgT;
          p.lastDmgT=now;
          const bossR=50*bossGrowthScale;
          const overlapL=Math.max(p.x-halfBw, boss.x-bossR);
          const overlapR=Math.min(p.x+halfBw, boss.x+bossR);
          const overlap=Math.max(0,overlapR-overlapL);
          const overlapFrac=overlap/(bossR*2);
          const rawDmg=(SEMIC_TOTAL_DMG/p.totalMs)*dt*overlapFrac;
          const dmg=Math.min(rawDmg, SEMIC_TOTAL_DMG-p.dmgDealt);
          if(dmg>0){
            p.dmgDealt+=dmg;
            boss.hp-=dmg;
            if(boss.hp<=0){
              boss.hp=0; boss.alive=false;
              invSpawnParticles(boss.x,boss.y,2);
              try{playEnemyDeath(0.4);}catch(ex){}
            } else {
              boss.glitchTimer=6;
            }
          }
        }
      }
    } else { p.x+=p.vx;p.y+=p.vy;p.vy+=0.05;p.life-=0.045; }
  }
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
      // Purple fringe left, green-cyan fringe right
      invCtx.save();
      invCtx.globalAlpha=aberAlpha*0.45;
      invCtx.fillStyle='rgba(160,30,255,1)';
      invCtx.fillRect(0,0,aberShift*3,ch);
      invCtx.fillStyle='rgba(30,255,160,1)';
      invCtx.fillRect(cw-aberShift*3,0,aberShift*3,ch);
      // Horizontal scan displacement — purple bar drifts down
      const scanY=((Date.now()*0.12)%ch);
      invCtx.globalAlpha=aberAlpha*0.3;
      invCtx.fillStyle='rgba(160,40,255,1)';
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

  // ── DAMAGE FLOATS — purple -hp text rising from shooter ──
  if(_dmgFloats.length){
    invCtx.save();
    for(let f of _dmgFloats){
      invCtx.globalAlpha=f.alpha;
      invCtx.font=`bold 13px 'BlackChancery', serif`;
      invCtx.fillStyle='rgba(180,80,255,1)';
      invCtx.shadowColor='rgba(140,0,255,0.9)';
      invCtx.shadowBlur=8;
      invCtx.textAlign='center';
      invCtx.textBaseline='middle';
      // Glitch offset — random horizontal jitter while glitch active
      const jx=_hpGlitchFrames>0?(Math.random()-0.5)*6:0;
      invCtx.fillText(f.text, f.x+jx, f.y);
      f.y+=f.vy;
      f.alpha-=0.018;
    }
    invCtx.shadowBlur=0;
    invCtx.restore();
    _dmgFloats=_dmgFloats.filter(f=>f.alpha>0);
  }

  // Boss ability visuals drawn below everything else
  if(invWave===5) drawBossAbilities();

  // ── Fokus Lina charge VFX ──
  if(flCharging && flChargeStart>0){
    const ch2=invCanvas.height;
    const progress=(Date.now()-flChargeStart)/FL_CHARGE_DUR;
    const sx=invShooterX, sy=ch2-105;
    const pulse=0.5+0.5*Math.sin(Date.now()*0.012);
    const glowR=(40+progress*80)*(0.85+pulse*0.15);
    const glowAlpha=0.18+progress*0.35;
    const glowGrad=invCtx.createRadialGradient(sx,sy,0,sx,sy,glowR);
    glowGrad.addColorStop(0,'rgba(200,235,255,'+glowAlpha+')');
    glowGrad.addColorStop(0.5,'rgba(160,210,255,'+(glowAlpha*0.5)+')');
    glowGrad.addColorStop(1,'rgba(0,0,0,0)');
    invCtx.save();
    invCtx.globalAlpha=1;
    invCtx.fillStyle=glowGrad;
    invCtx.beginPath();invCtx.arc(sx,sy,glowR,0,Math.PI*2);invCtx.fill();
    const origins=[{ox:sx-190,oy:sy+60},{ox:sx,oy:sy+190},{ox:sx+190,oy:sy+60}];
    invCtx.lineWidth=1.5+progress*1.5;
    invCtx.strokeStyle='rgba(200,235,255,'+(0.3+progress*0.6)+')';
    invCtx.shadowColor='rgba(160,210,255,0.8)';
    invCtx.shadowBlur=6+progress*8;
    for(let o of origins){
      const cpx=o.ox+(sx-o.ox)*progress*0.7;
      const cpy=o.oy+(sy-o.oy)*progress*0.7;
      const steps=20;
      invCtx.beginPath();
      for(let i=0;i<=steps;i++){
        const t=(i/steps)*progress;
        const x=(1-t)*(1-t)*o.ox+2*(1-t)*t*cpx+t*t*sx;
        const y=(1-t)*(1-t)*o.oy+2*(1-t)*t*cpy+t*t*sy;
        if(i===0) invCtx.moveTo(x,y); else invCtx.lineTo(x,y);
      }
      invCtx.stroke();
    }
    invCtx.shadowBlur=0;
    invCtx.restore();
  }

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
    } else if(p.isBeam){
      const elapsed=Date.now()-p.startTime;
      const {castDur,flashDur,fadeDur,bw,x:cx}=p;
      const ch2=invCanvas.height;
      let currentW, alpha;
      if(elapsed<castDur){
        const t=elapsed/castDur;
        currentW=60+(bw-60)*t; alpha=0.55+0.45*t;
      } else if(elapsed<castDur+flashDur){
        currentW=bw; alpha=1;
      } else {
        const t=(elapsed-(castDur+flashDur))/fadeDur;
        currentW=bw*(1-t*0.2); alpha=1-t;
      }
      const bx=Math.round(cx);
      const beamTop=p.beamTopOverride||0, beamBot=ch2-105, beamH=beamBot-beamTop;
      const isDua=p.bw>=200;
      const glowCol=isDua?'rgba(180,100,255,':'rgba(180,220,255,';
      const coreCol0=isDua?'rgba(140,60,220,0)':'rgba(160,210,255,0)';
      const coreCol1=isDua?'rgba(210,160,255,1)':'rgba(230,245,255,1)';
      const edgeCol=isDua?'rgba(200,130,255,0.9)':'rgba(180,230,255,0.9)';
      invCtx.globalAlpha=alpha*0.18;
      const grad=invCtx.createLinearGradient(bx-currentW/2,0,bx+currentW/2,0);
      grad.addColorStop(0,glowCol+'0)'); grad.addColorStop(0.5,glowCol+'1)'); grad.addColorStop(1,glowCol+'0)');
      invCtx.fillStyle=grad; invCtx.fillRect(bx-currentW/2,beamTop,currentW,beamH);
      invCtx.globalAlpha=alpha*0.72;
      const coreW=currentW*0.28;
      const coreGrad=invCtx.createLinearGradient(bx-coreW/2,0,bx+coreW/2,0);
      coreGrad.addColorStop(0,coreCol0); coreGrad.addColorStop(0.5,coreCol1); coreGrad.addColorStop(1,coreCol0);
      invCtx.fillStyle=coreGrad; invCtx.fillRect(bx-coreW/2,beamTop,coreW,beamH);
      invCtx.globalAlpha=alpha*0.18;
      invCtx.fillStyle='rgba(255,80,80,0.7)'; invCtx.fillRect(bx-currentW/2-4,beamTop,6,beamH);
      invCtx.fillStyle='rgba(80,160,255,0.7)'; invCtx.fillRect(bx+currentW/2-2,beamTop,6,beamH);
      invCtx.save();
      invCtx.filter='blur(1.8px)';
      invCtx.globalAlpha=alpha*0.55;
      invCtx.strokeStyle=edgeCol; invCtx.lineWidth=1.5;
      invCtx.beginPath();invCtx.moveTo(bx-currentW/2,beamTop);invCtx.lineTo(bx-currentW/2,beamBot);invCtx.stroke();
      invCtx.beginPath();invCtx.moveTo(bx+currentW/2,beamTop);invCtx.lineTo(bx+currentW/2,beamBot);invCtx.stroke();
      invCtx.filter='none';
      invCtx.globalAlpha=alpha*0.40; invCtx.lineWidth=1;
      const _segH=8, _segs=Math.ceil((beamBot-beamTop)/_segH);
      for(let _i=0;_i<_segs;_i++){
        const _sy=beamTop+_i*_segH, _ey=Math.min(_sy+_segH*(0.4+Math.random()*0.6),beamBot);
        const _lx=bx-currentW/2+(Math.random()-0.5)*3.5;
        invCtx.strokeStyle=edgeCol;
        invCtx.beginPath();invCtx.moveTo(_lx,_sy);invCtx.lineTo(_lx+(Math.random()-0.5)*2,_ey);invCtx.stroke();
        const _rx=bx+currentW/2+(Math.random()-0.5)*3.5;
        invCtx.beginPath();invCtx.moveTo(_rx,_sy);invCtx.lineTo(_rx+(Math.random()-0.5)*2,_ey);invCtx.stroke();
      }
      invCtx.restore();
      const muzzleR=currentW*0.85;
      const muzzleY=beamBot+muzzleR*0.18;
      const muzzleGrad=invCtx.createRadialGradient(bx,muzzleY,0,bx,muzzleY,muzzleR);
      muzzleGrad.addColorStop(0,isDua?'rgba(210,160,255,'+(alpha*0.7)+')':'rgba(230,245,255,'+(alpha*0.7)+')');
      muzzleGrad.addColorStop(0.4,isDua?'rgba(180,100,255,'+(alpha*0.35)+')':'rgba(180,220,255,'+(alpha*0.35)+')');
      muzzleGrad.addColorStop(0.75,isDua?'rgba(120,60,200,'+(alpha*0.1)+')':'rgba(140,190,255,'+(alpha*0.1)+')');
      muzzleGrad.addColorStop(1,'rgba(0,0,0,0)');
      invCtx.globalAlpha=1; invCtx.fillStyle=muzzleGrad;
      invCtx.beginPath(); invCtx.ellipse(bx,muzzleY,muzzleR,muzzleR*0.42,0,0,Math.PI*2); invCtx.fill();
    } else if(p.isSemic){
      // SEMIC — amber/gold burst beam, width ramps 2cm→4cm→0 over 500ms
      const elapsed=Date.now()-p.startTime;
      const semT=Math.min(elapsed,p.totalMs)/p.totalMs; // 0→1 lifetime alpha
      const currentW=elapsed<300
        ? SEMIC_W_START+(SEMIC_W_PEAK-SEMIC_W_START)*(elapsed/300)
        : SEMIC_W_PEAK*(1-(elapsed-300)/200);
      if(currentW<=0){ /* collapsed — skip draw */ } else {
        const alpha=semT<0.1?semT/0.1:semT>0.85?(1-(semT-0.85)/0.15):1;
        const bx=Math.round(p.x);
        const beamTop=36, beamBot=ch2-105, beamH=beamBot-beamTop;
        invCtx.save();
        // Outer glow — amber
        invCtx.globalAlpha=alpha*0.20;
        const sg=invCtx.createLinearGradient(bx-currentW/2,0,bx+currentW/2,0);
        sg.addColorStop(0,'rgba(255,160,30,0)');
        sg.addColorStop(0.5,'rgba(255,200,80,1)');
        sg.addColorStop(1,'rgba(255,160,30,0)');
        invCtx.fillStyle=sg; invCtx.fillRect(bx-currentW/2,beamTop,currentW,beamH);
        // Core — bright gold
        invCtx.globalAlpha=alpha*0.80;
        const coreW=currentW*0.30;
        const cg=invCtx.createLinearGradient(bx-coreW/2,0,bx+coreW/2,0);
        cg.addColorStop(0,'rgba(255,220,100,0)');
        cg.addColorStop(0.5,'rgba(255,245,180,1)');
        cg.addColorStop(1,'rgba(255,220,100,0)');
        invCtx.fillStyle=cg; invCtx.fillRect(bx-coreW/2,beamTop,coreW,beamH);
        // Chromatic fringe — red left, yellow-orange right
        invCtx.globalAlpha=alpha*0.18;
        invCtx.fillStyle='rgba(255,60,0,0.8)';  invCtx.fillRect(bx-currentW/2-4,beamTop,6,beamH);
        invCtx.fillStyle='rgba(255,200,0,0.8)'; invCtx.fillRect(bx+currentW/2-2,beamTop,6,beamH);
        // Blurred edge lines
        invCtx.filter='blur(1.8px)';
        invCtx.globalAlpha=alpha*0.55;
        invCtx.strokeStyle='rgba(255,180,40,0.9)'; invCtx.lineWidth=1.5;
        invCtx.beginPath();invCtx.moveTo(bx-currentW/2,beamTop);invCtx.lineTo(bx-currentW/2,beamBot);invCtx.stroke();
        invCtx.beginPath();invCtx.moveTo(bx+currentW/2,beamTop);invCtx.lineTo(bx+currentW/2,beamBot);invCtx.stroke();
        invCtx.filter='none';
        // Muzzle ellipse
        const muzzleR=currentW*0.85;
        const muzzleY=beamBot+muzzleR*0.18;
        const mg=invCtx.createRadialGradient(bx,muzzleY,0,bx,muzzleY,muzzleR);
        mg.addColorStop(0,'rgba(255,245,180,'+(alpha*0.75)+')');
        mg.addColorStop(0.4,'rgba(255,200,80,'+(alpha*0.35)+')');
        mg.addColorStop(0.75,'rgba(200,120,20,'+(alpha*0.1)+')');
        mg.addColorStop(1,'rgba(0,0,0,0)');
        invCtx.globalAlpha=1; invCtx.fillStyle=mg;
        invCtx.beginPath();invCtx.ellipse(bx,muzzleY,muzzleR,muzzleR*0.42,0,0,Math.PI*2);invCtx.fill();
        invCtx.restore();
      }
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
  const sx=invShooterX, sy=ch-54;
  const hitIntensity=Math.max(_hpAberrationFrames/18, _hpGlitchFrames/10);

  invCtx.save();
  invCtx.translate(sx, sy);

  // Localised purple radial glow on hit
  if(hitIntensity>0){
    const glowR=38*hitIntensity;
    const glow=invCtx.createRadialGradient(0,0,4,0,0,glowR);
    glow.addColorStop(0,`rgba(160,40,255,${0.55*hitIntensity})`);
    glow.addColorStop(1,'rgba(100,0,180,0)');
    invCtx.globalAlpha=1;
    invCtx.fillStyle=glow;
    invCtx.beginPath();invCtx.arc(0,0,glowR,0,Math.PI*2);invCtx.fill();

    // Clipped aberration fringe — purple left, green-cyan right, clipped to shooter radius
    invCtx.save();
    invCtx.beginPath();invCtx.arc(0,0,28,0,Math.PI*2);invCtx.clip();
    const aberShift=Math.round(3*hitIntensity);
    if(aberShift>0){
      invCtx.globalAlpha=0.4*hitIntensity;
      invCtx.fillStyle='rgba(160,30,255,1)';
      invCtx.fillRect(-28-aberShift,-28,aberShift*2,56);
      invCtx.fillStyle='rgba(30,255,160,1)';
      invCtx.fillRect(28-aberShift,-28,aberShift*2,56);
    }
    invCtx.restore();

    // Glitch block strips clipped to shooter area
    if(_hpGlitchFrames>0){
      invCtx.save();
      invCtx.beginPath();invCtx.arc(0,0,32,0,Math.PI*2);invCtx.clip();
      invCtx.globalAlpha=0.18;
      invCtx.fillStyle='rgba(180,60,255,1)';
      for(let i=0;i<2;i++){
        const gy=(Math.random()-0.5)*32;
        const gh=1.5+Math.random()*4;
        const gox=(Math.random()-0.5)*10;
        invCtx.fillRect(-32+gox,gy,64,gh);
      }
      invCtx.restore();
    }
  }

  // Shooter sprite — jitter on hit
  const jx=_hpGlitchFrames>0?(Math.random()-0.5)*4:0;
  const jy=_hpGlitchFrames>0?(Math.random()-0.5)*2:0;
  invCtx.translate(jx,jy);
  invCtx.strokeStyle=hitIntensity>0
    ?`rgba(${Math.round(180+75*hitIntensity)},${Math.round(255*(1-hitIntensity*0.7))},255,0.95)`
    :'rgba(255,255,255,0.85)';
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

function resumeInvaders(){
  if(state.running) return;
  state.running=true;
  if(!invRaf && invCanvas) invLoop();
}

export { startInvaders, stopInvaders, resumeInvaders, resolveNukaInput, handleInvaderKeydown, getRound2DebugInfo };
