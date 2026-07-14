// Visual Effects and Animations

function sonidoAppear(el) {
  // Outer el: positioning only — always translate(-50%,-50%), never scaled.
  // Inner glyph: all scale/filter/opacity changes.
  // This keeps the outer's click hit-area at full 80px from frame 0.
  const g = el.firstElementChild;
  el.style.transition = 'none';
  el.style.transform = 'translate(-50%,-50%)';
  el.style.opacity = '1';
  if (g) { g.style.transition = 'none'; g.style.transform = 'scale(0)'; g.style.opacity = '0'; g.style.filter = 'none'; }
  let f = 0;
  const flickers = [
    () => { if(g){g.style.transform='scale(1.2)';g.style.opacity='1';g.style.filter='saturate(0) brightness(4) invert(1)';} },
    () => { if(g){g.style.transform='scale(0.3)';g.style.opacity='0';g.style.filter='none';} },
    () => { if(g){g.style.transform='scale(1.1)';g.style.opacity='1';g.style.filter='saturate(0) brightness(3)';} },
    () => { if(g){g.style.transform='scale(0.2)';g.style.opacity='0';g.style.filter='none';} },
    () => { if(g){g.style.transform='scale(1.05)';g.style.opacity='1';g.style.filter='saturate(0) contrast(4) brightness(2)';} },
    () => { if(g){g.style.transform='scale(0.9)';g.style.opacity='0.5';g.style.filter='saturate(0) brightness(2)';} },
    () => { if(g){g.style.transform='scale(1)';g.style.opacity='1';g.style.filter='none';} },
  ];
  function next() {
    if (f >= flickers.length) return;
    flickers[f]();
    f++;
    if (f < flickers.length) setTimeout(next, f < 5 ? 18 : 0);
  }
  requestAnimationFrame(() => requestAnimationFrame(next));
}

function cssGlitch(el) {
  // Runs post-click — outer el is fine to animate since hit-area no longer matters.
  el.style.transition = 'none';
  let f = 0;
  const frames = [
    () => { el.style.transform = 'translate(-50%,-50%) scale(1) skewX(10deg)'; el.style.opacity = '0.9'; el.style.filter = 'saturate(0) brightness(4) invert(1)'; },
    () => { el.style.transform = 'translate(-44%,-50%) scale(1.08) skewX(-14deg)'; el.style.opacity = '0.8'; el.style.filter = 'saturate(0) brightness(3)'; },
    () => { el.style.transform = 'translate(-56%,-50%) scale(0.92) skewX(8deg)'; el.style.opacity = '0.6'; el.style.filter = 'invert(1) brightness(2)'; },
    () => { el.style.transform = 'translate(-48%,-54%) scale(1.1) skewY(5deg)'; el.style.opacity = '0.45'; el.style.filter = 'saturate(0) brightness(5)'; },
    () => { el.style.transform = 'translate(-52%,-46%) scale(0.85) skewX(12deg)'; el.style.opacity = '0.25'; el.style.filter = 'invert(1) brightness(3)'; },
    () => { el.style.transform = 'translate(-50%,-50%) scale(0.5)'; el.style.opacity = '0.1'; el.style.filter = 'saturate(0)'; },
    () => { el.style.transform = 'translate(-50%,-50%) scale(0)'; el.style.opacity = '0'; },
  ];
  function next() {
    if (f >= frames.length) { el.remove(); return; }
    frames[f]();
    f++;
    setTimeout(next, 20 + Math.random() * 15);
  }
  next();
}

function noiseGlitchDisappear(el) {
  // Outer el: positioning only. Inner glyph: all visual changes.
  const g = el.firstElementChild;
  el.style.transition = 'none';
  el.style.transform = 'translate(-50%,-50%)';
  let f = 0;
  const frames = [
    () => { if(g){g.style.transform='scale(1) skewX(-10deg)';g.style.opacity='0.9';g.style.filter='saturate(3) brightness(3) hue-rotate(180deg)';} },
    () => { if(g){g.style.transform='scale(1.15) skewX(8deg)';g.style.opacity='0.7';g.style.filter='saturate(0) brightness(4) invert(1)';} },
    () => { if(g){g.style.transform='scale(1.3) skewX(-6deg)';g.style.opacity='0.5';g.style.filter='saturate(2) brightness(5) hue-rotate(270deg)';} },
    () => { if(g){g.style.transform='scale(1.5) skewY(-4deg)';g.style.opacity='0.25';g.style.filter='saturate(0) brightness(3)';} },
    () => { if(g){g.style.transform='scale(1.8)';g.style.opacity='0.1';g.style.filter='invert(1)';} },
    () => { if(g){g.style.transform='scale(2.2)';g.style.opacity='0';} },
  ];
  function next() {
    if (f >= frames.length) { el.remove(); return; }
    frames[f]();
    f++;
    setTimeout(next, 18 + Math.random() * 12);
  }
  next();
}

export { sonidoAppear, cssGlitch, noiseGlitchDisappear };
