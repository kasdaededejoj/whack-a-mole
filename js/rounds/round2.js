// ── VOID INVADERS ENGINE ──
import { state } from '../state.js';
import { field, msgEl, setComboValue, showFail } from '../ui.js';
import { playThud } from '../audio.js';
import { endRound } from '../game.js';

let invCanvas=null,invCtx=null,invRaf=null;
let invEntities=[],invBullets=[],invParticles=[];
let invShooterX=0,invDescentY=0,invMouseDown=false,invFireInterval=null;
const INV_BULLET_SPEED=28,INV_FIRE_RATE=120;

// Glyph sets — increasingly abstract per wave
const INV_GLYPHS_W1=['⌖','⊕','⊗','◈','⌬','⍟','⎔','⊞'];
const INV_GLYPHS_W2=['⌘','⍜','⌂','⍝','⌇','⍣','⌾','⍤'];
const INV_GLYPHS_W3=['⌁','⍯','⌀','⍬','⌃','⍮','⌤','⍭'];
const INV_GLYPHS_W4=['⎎','⍫','⎍','⍪','⎌','⍩','⎋','⍨'];
const INV_GLYPHS_W5=['⍧','⍦','⍥','⍤','⍣','⍢','⍡','⍠'];
const INV_GLYPH_SETS=[INV_GLYPHS_W1,INV_GLYPHS_W2,INV_GLYPHS_W3,INV_GLYPHS_W4,INV_GLYPHS_W5];

// Wave config: {cols, rows, descentSpeed, hp_top, hp_rest}
const INV_WAVE_CONFIG=[
  {cols:8,rows:4,descentSpeed:0.5,hpTop:2,hpRest:1},   // wave 1 — baseline
  {cols:8,rows:4,descentSpeed:0.75,hpTop:2,hpRest:1},  // wave 2 — faster
  {cols:9,rows:4,descentSpeed:1.08,hpTop:3,hpRest:1},  // wave 3 — more cols, faster
  {cols:9,rows:5,descentSpeed:1.46,hpTop:3,hpRest:2},  // wave 4 — more rows, faster, tougher
  {cols:10,rows:5,descentSpeed:1.7,hpTop:4,hpRest:2},  // wave 5 — bridge pressure
  null,                                                  // wave 6 — boss (special)
];
const INV_BOSS_HP=313;

let invWave=0;        // 0-indexed, 0-5
let invTransitioning=false;
let invUpgrade=null;
// null
// rapidfire
// aoe
// doublemissile
// rapidfire_homing
// nuka
// machina
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
  // Fade back to fully opaque when cooldown ends
  const wrap=document.getElementById('nuka-keycap');
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
  invAoeCooldown=0;
  invNukaCooldownUntil=0;
  invNukaSkillActive=false;
  invNukaPromptLetter='';
  hideNukaPrompt();
  setNukaCooldown(false);
  if(invNukaCooldownTimer){clearTimeout(invNukaCooldownTimer);invNukaCooldownTimer=null;}
  // Hide Round I scoring HUD + timer bar (display:none, not just
  // visibility:hidden, so they don't reserve layout space and push
  // Round II's field down the page), show wave progress bar
  document.querySelector('.hud').style.display='none';
  document.querySelector('.bar-wrap').style.display='none';
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
    invEntities.push({
      isBoss:true,
      baseX:cw/2, baseY:80,
      x:cw/2, y:80,
      alive:true,
      glyph:'???',
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
    dblBtn.style.display='none'; homingBtn.style.display='none'; nukaBtn.style.display='none'; machinaBtn.style.display='none';
    desc.textContent='choose your augment.';
  }else{
    rapidBtn.style.display='none'; aoeBtn.style.display='none';
    dblBtn.style.display='none'; homingBtn.style.display='none'; nukaBtn.style.display=''; machinaBtn.style.display='';
    desc.innerHTML='wave 4.<br>choose your upgrade.<br>nuka.<br>tactical missile skill check.<br>machina.<br>parallel twin rounds.';
  }

  function pickUpgrade(type){
    invUpgrade=type;
    try{playThud(1.15);}catch(e){}
    if(type==='aoe') invAoeCooldown=Date.now();
    modal.style.display='none';
    state.running=true;
    invTransitioning=false;
    if(type==='nuka'){
      startNukaSkill(true);
    } else {
      spawnInvaderWave(invWave);
      invLoop();
    }
  }

  document.getElementById('upgrade-rapidfire').onclick=()=>pickUpgrade('rapidfire');
  document.getElementById('upgrade-aoe').onclick=()=>pickUpgrade('aoe');
  document.getElementById('upgrade-doublemissile').onclick=()=>pickUpgrade('doublemissile');
  document.getElementById('upgrade-homing').onclick=()=>pickUpgrade('rapidfire_homing');
  document.getElementById('upgrade-nuka').onclick=()=>pickUpgrade('nuka');
  document.getElementById('upgrade-machina').onclick=()=>pickUpgrade('machina');
}

function stopInvaders(){
  if(invRaf){cancelAnimationFrame(invRaf);invRaf=null;}
  if(invNukaKeycapRaf){cancelAnimationFrame(invNukaKeycapRaf);invNukaKeycapRaf=null;}
  if(invFireInterval){clearInterval(invFireInterval);invFireInterval=null;}
  invMouseDown=false;
  document.querySelector('.hud').style.display='';
  document.querySelector('.bar-wrap').style.display='';
  document.getElementById('wave-progress').style.display='none';
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
  invFire();
  const rate=invUpgrade==='machina'?INV_FIRE_RATE/3.2:invUpgrade==='rapidfire'?INV_FIRE_RATE/2:INV_FIRE_RATE;
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
  invFire();
}

function invFire(){
  if(!state.running||!invCanvas||invNukaSkillActive)return;
  const ch=invCanvas.height;
  const spawnBullet=(x)=>{
    const isMissile=invUpgrade==='aoe'||invUpgrade==='doublemissile'||invUpgrade==='rapidfire_homing';
    invBullets.push({x:x,y:ch-67,vy:-INV_BULLET_SPEED,trail:[],hit:false,kind:isMissile?'missile':'bullet'});
  };
  if(invUpgrade==='machina'){
    spawnBullet(invShooterX-10); spawnBullet(invShooterX+10);
  } else if(invUpgrade==='doublemissile'){
    spawnBullet(invShooterX-18); spawnBullet(invShooterX+18);
  }else{
    spawnBullet(invShooterX);
  }
}

function startNukaSkill(respawnWave=false){
  if(!state.running||!invCanvas||invNukaSkillActive||Date.now()<invNukaCooldownUntil){return;}
  invMouseDown=false;
  if(invFireInterval){clearInterval(invFireInterval);invFireInterval=null;}
  invNukaSkillActive=true;
  invNukaPromptLetter=String.fromCharCode(65+Math.floor(Math.random()*26));
  showNukaPrompt(invNukaPromptLetter);
  if(respawnWave) spawnInvaderWave(invWave);
  if(!invRaf) invLoop();
}

function startNukaCooldown(delay, isFail=false){
  invNukaCooldownUntil=Date.now()+delay;
  if(invNukaCooldownTimer){clearTimeout(invNukaCooldownTimer);}
  showNukaKeycapCooldown(); // lerp keycap to semi-opaque — signals cooldown visually
  setNukaCooldown(true, delay, isFail);
  invNukaCooldownTimer=setTimeout(()=>{
    invNukaCooldownTimer=null;
    if(!invNukaSkillActive){
      restoreNukaKeycapOpacity(); // lerp keycap back to full opacity — ready again
      hideNukaPrompt();
      setNukaCooldown(false);
    }
  },delay);
}

function resolveNukaInput(key){
  if(!invNukaSkillActive||!state.running)return;
  const pressed=String(key).toUpperCase();
  invNukaSkillActive=false;
  if(pressed===invNukaPromptLetter){
    const ch=invCanvas.height;
    const laneCenter=invShooterX;
    invBullets.push({x:laneCenter,y:ch-67,vy:-INV_BULLET_SPEED*0.25,trail:[],hit:false,kind:'nuka'});
    if(invWave===5){
      // Boss wave: no grid rows to target, and the bullet traveling
      // straight up rarely connects with the boss's side-to-side drift —
      // so a successful check deals a guaranteed direct hit instead.
      const boss=invEntities.find(e=>e.isBoss&&e.alive);
      if(boss){
        boss.hp-=25;
        invParticles.push({x:boss.x,y:boss.y,vx:0,vy:0,life:1,alpha:1,isNukaBomb:true});
        if(boss.hp<=0){
          boss.hp=0;
          boss.alive=false;
          invSpawnParticles(boss.x,boss.y,1);
          msgEl.textContent='';
        } else {
          boss.glitchTimer=10;
          const hpText=(boss.hp%1===0?boss.hp:boss.hp.toFixed(1))+' / '+INV_BOSS_HP;
          msgEl.textContent=hpText;
        }
        state.combo=Math.min(state.combo+1,8);
        setComboValue('×'+state.combo);
      }
    } else {
      // Clear the 3 rows (vertical "waves") closest to failing — highest row
      // index is the row furthest down / most advanced toward the fail line.
      const aliveRows=[...new Set(invEntities.filter(e=>e.alive&&!e.isBoss&&e.row!==undefined).map(e=>e.row))].sort((a,b)=>b-a);
      const targetRows=aliveRows.slice(0,3);
      if(targetRows.length){
        for(let laneEnemy of invEntities){
          if(!laneEnemy.alive||laneEnemy.isBoss||laneEnemy.row===undefined||!targetRows.includes(laneEnemy.row))continue;
          laneEnemy.alive=false;
          invSpawnParticles(laneEnemy.x,laneEnemy.y,1);
          // Purple haze burst on each cleared entity — small version of the boss bomb
          invParticles.push({x:laneEnemy.x,y:laneEnemy.y,vx:0,vy:0,life:0.7,alpha:1,isNukaBomb:true,nukaBombR:28});
          state.combo=Math.min(state.combo+1,8);
          setComboValue('×'+state.combo);
        }
      }
    }
    showNukaPrompt(invNukaPromptLetter, 'success');
    startNukaCooldown(3500, false);
  } else {
    showNukaPrompt(invNukaPromptLetter, 'fail');
    startNukaCooldown(7000, true);
  }
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
  const speed=cfg?cfg.descentSpeed:0.5;
  invDescentY+=speed;
  const drop=Math.floor(invDescentY/20)*20;

  const isBossWave=invWave===5;

  for(let e of invEntities){
    if(!e.alive)continue;
    if(isBossWave){
      // Boss drifts side to side
      e.orbitAngle+=0.009;
      e.x=e.baseX+Math.sin(e.orbitAngle)*72;
      e.y=e.baseY+Math.sin(e.orbitAngle*0.46)*16+drop*0.34;
      e.flicker+=0.012;
      if(e.glitchTimer>0){e.glitchTimer--;e.glitchOffset=(Math.random()-0.5)*8;}else{e.glitchOffset=0;}
      if(e.y>ch-100){
        state.running=false;clearInterval(state.bTimer);
        showFail(state.currentRound);return;
      }
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

      for(let e of invEntities){
        if(!e.alive)continue;

        const withinColumn=Math.abs(e.x-invShooterX)<=INV_AOE_RADIUS;
        const withinThreeRows=Math.abs(e.y-targetY)<=90;

        if(withinColumn && withinThreeRows){
          e.hp--;
          if(e.hp<=0){
            e.alive=false;
            invSpawnParticles(e.x,e.y,1);
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
    if(!b.hit){
      for(let e of invEntities){
        if(!e.alive)continue;
        if(Math.abs(b.x-e.x)<e.cellW*0.48&&Math.abs(b.y-e.y)<e.cellH*0.52){
          b.hit=true;
          if((b.kind==='missile' || b.kind==='nuka') && !e.isBoss && e.col!==undefined){
            const cols=b.kind==='nuka'?[e.col-1,e.col,e.col+1]:[e.col];
            for(let laneEnemy of invEntities){
              if(!laneEnemy.alive || laneEnemy.isBoss || laneEnemy.col===undefined || !cols.includes(laneEnemy.col))continue;
              laneEnemy.alive=false;
              invSpawnParticles(laneEnemy.x,laneEnemy.y,1);
              state.combo=Math.min(state.combo+1,8);
              setComboValue('×'+state.combo);
            }
          } else {
            const damage=e.isBoss?((b.kind==='missile'||b.kind==='nuka')?7:0.5):1;
            e.hp-=damage;
            if(e.hp<=0){
              e.alive=false;
              invSpawnParticles(e.x,e.y,1);
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
  if(kind==='nuka'){
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
  if(kind==='nuka') return 1.32;
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
  if(b.kind==='missile'||b.kind==='nuka'){
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
      invCtx.translate(e.x+e.glitchOffset,e.y);
      // Outer ring — fades with HP
      invCtx.globalAlpha=hpRatio*0.3;
      invCtx.strokeStyle='#fff';
      invCtx.lineWidth=1;
      invCtx.beginPath();invCtx.arc(0,0,50*pulse,0,Math.PI*2);invCtx.stroke();
      // Inner ring
      invCtx.globalAlpha=hpRatio*0.15;
      invCtx.beginPath();invCtx.arc(0,0,35*pulse,0,Math.PI*2);invCtx.stroke();
      // Glitch block on hit
      if(e.glitchTimer>0){
        invCtx.globalAlpha=0.25;
        invCtx.fillStyle='#fff';
        invCtx.fillRect(-44,-28,88,56);
      }
      // Boss glyph
      invCtx.globalAlpha=bossAlpha;
      invCtx.font="42px 'BlackChancery', serif";
      invCtx.fillStyle='#fff';
      invCtx.textAlign='center';invCtx.textBaseline='middle';
      invCtx.fillText('???',0,0);
      // HP bar under boss
      const barW=100;
      invCtx.globalAlpha=0.3;
      invCtx.fillStyle='#333';
      invCtx.fillRect(-barW/2,34,barW,2);
      invCtx.globalAlpha=0.8;
      invCtx.fillStyle='#fff';
      invCtx.fillRect(-barW/2,34,barW*hpRatio,2);
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

function handleInvaderKeydown(e){
  if(invNukaSkillActive && /^[a-zA-Z]$/.test(e.key)){
    e.preventDefault();
    resolveNukaInput(e.key);
  }
  if(e.code==='Space' && invUpgrade==='nuka' && state.running && state.currentRound===1 && !invNukaSkillActive && Date.now()>=invNukaCooldownUntil){
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
