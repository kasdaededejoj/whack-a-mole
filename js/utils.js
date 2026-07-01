// Utility helpers

function randPos(){
  const pad=10;
  return{x:pad+Math.random()*(100-pad*2),y:pad+Math.random()*(100-pad*2)};
}

// ── TARGET TYPE ROLL: 60% normal / 30% noise / 10% purpality ──
function rollTargetType(){
  const r=Math.random();
  if(r<0.60) return 'normal';
  if(r<0.90) return 'noise';   // 0.60–0.90 = 30%
  return 'purpality';           // 0.90–1.00 = 10%
}

export { randPos, rollTargetType };
