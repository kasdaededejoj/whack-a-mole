const { chromium } = require('playwright');
const fs = require('fs');
const src = fs.readFileSync('/home/claude/kasdaededejoj/whack-a-mole/js/rounds/boss3d.js','utf8').replace(/export\s*\{[\s\S]*\};?\s*$/, '');
const proto = `
// ---- PROTOTYPE: loft primitive (rings of n-gon sections, flat-fronted) ----
function makeLoft(cx,cy,cz,sections,n,dropFront){
  const verts=[];
  sections.forEach(s=>{for(let k=0;k<n;k++){const a=Math.PI/n+2*Math.PI*k/n;const sc=1/Math.cos(Math.PI/n);
    verts.push({x:Math.cos(a)*s.w/2*sc,y:s.y,z:Math.sin(a)*s.d/2*sc});}});
  const faces=[];
  for(let i=0;i<sections.length-1;i++)for(let k=0;k<n;k++){const k1=(k+1)%n;
    const idx=[i*n+k,i*n+k1,(i+1)*n+k1,(i+1)*n+k];
    const p=idx.map(j=>verts[j]);
    const e1={x:p[1].x-p[0].x,y:p[1].y-p[0].y,z:p[1].z-p[0].z},e2={x:p[3].x-p[0].x,y:p[3].y-p[0].y,z:p[3].z-p[0].z};
    let nx=e1.y*e2.z-e1.z*e2.y,ny=e1.z*e2.x-e1.x*e2.z,nz=e1.x*e2.y-e1.y*e2.x;
    const c={x:(p[0].x+p[2].x)/2,y:0,z:(p[0].z+p[2].z)/2};
    if(nx*c.x+nz*c.z<0){nx=-nx;ny=-ny;nz=-nz;}
    const l=Math.hypot(nx,ny,nz);nx/=l;ny/=l;nz/=l;
    if(dropFront&&nz>0.9)continue;
    faces.push({name:'f',idx,normal:{x:nx,y:ny,z:nz}});}
  return {cx,cy,cz,verts,faces};
}
function crobeParts(S){
  const G=3,C={cowl:[88,88,94],sh:[138,138,144],mid:[152,152,158],hem:[176,176,182],sl:[122,122,128],hand:[198,198,204],leg:[118,118,124],mask:[228,228,232],voidc:[16,16,20]};
  let y=-35.5*S; const P=[];
  const add=(key,box,color)=>P.push({key,box,color});
  // cowl (open front) + void + mask
  const cH=24*S;
  add('void',makeBox(0,y+cH*0.62,-4*S,26*S,16*S,10*S),C.voidc);
  add('cowl',makeLoft(0,0,0,[{y:y,w:6*S,d:6*S},{y:y+cH*0.35,w:34*S,d:26*S},{y:y+cH,w:46*S,d:34*S}],8,true),C.cowl);
  add('mask',makeBox(0,y+cH*0.62,2*S,15*S,12*S,5*S),C.mask);
  y+=cH+G;
  const shH=14*S; add('shoulders',makeLoft(0,0,0,[{y:y,w:46*S,d:30*S},{y:y+shH,w:36*S,d:24*S}],8),C.sh); const shY=y; y+=shH+G;
  const mdH=12*S; add('mid',makeLoft(0,0,0,[{y:y,w:34*S,d:24*S},{y:y+mdH,w:38*S,d:26*S}],8),C.mid); y+=mdH+G;
  const hmH=10*S; add('hem',makeLoft(0,0,0,[{y:y,w:40*S,d:27*S},{y:y+hmH,w:56*S,d:34*S}],8),C.hem); y+=hmH;
  add('legL',makeBox(-8*S,y+1*S,0,9*S,4*S,10*S),C.leg); add('legR',makeBox(8*S,y+1*S,0,9*S,4*S,10*S),C.leg);
  // sleeves + hands
  for(const sx of [-1,1]){
    add('sleeve'+sx,makeLoft(sx*25*S,0,0,[{y:shY+2*S,w:12*S,d:14*S},{y:shY+26*S,w:16*S,d:16*S}],4),C.sl);
    add('hand'+sx,makeBox(sx*25*S,shY+31*S,0,10*S,8*S,8*S),C.hand);
  }
  return P;
}
`;
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:1440,height:520}});
  await p.setContent('<body style="margin:0"><canvas id=c width=1440 height=520></canvas></body>');
  await p.evaluate(src+proto+`
  const ctx=document.getElementById('c').getContext('2d');
  ctx.fillStyle='#08080c';ctx.fillRect(0,0,1440,520);
  const D=Math.PI/180;
  const poses=[['Rest',0,0,0,0],['Turn 25°',25,0,0,0],['Turn 55°',55,0,0,0],['Turn -40° + nod',-40,15,0,0],['Hit tilt',15,0,8,0],['Death split',20,0,0,1]];
  poses.forEach((q,i)=>{
    const S=2.1, parts=crobeParts(S);
    if(q[4]){const off={cowl:[0,-34],void:[0,-34],mask:[0,-34],shoulders:[-26,-8],mid:[22,6],hem:[0,30],legL:[-24,40],legR:[24,40],'sleeve-1':[-46,0],'sleeve1':[46,0],'hand-1':[-60,14],'hand1':[60,14]};
      parts.forEach(pt=>{const o=off[pt.key]||[0,0];pt.box.cx+=o[0];pt.box.cy+=o[1];});}
    const ox=120+i*240, oy=250;
    const faces=projectScene(parts,q[1]*D,q[2]*D,q[3]*D,ox,oy);
    drawFaces(ctx,faces);
    ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=1;
    faces.forEach(f=>{ctx.beginPath();f.points.forEach((pt,k)=>k?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));ctx.closePath();ctx.stroke();});
    ctx.fillStyle='#8a8a92';ctx.font='14px monospace';ctx.textAlign='center';ctx.fillText(q[0],ox,470);
  });`);
  await p.screenshot({path:process.argv[2]});
  await b.close();
})();
