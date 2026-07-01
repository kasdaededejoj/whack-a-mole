// Visual Effects and Animations

function sonidoAppear(el) {
  el.style.transition = 'none';
  el.style.transform = 'translate(-50%,-50%) scale(0)';
  el.style.opacity = '0';
  let f = 0;
  const flickers = [
    () => { el.style.transform = 'translate(-50%,-50%) scale(1.2)'; el.style.opacity = '1'; el.style.filter = 'saturate(0) brightness(4) invert(1)'; },
    () => { el.style.transform = 'translate(-50%,-50%) scale(0.3)'; el.style.opacity = '0'; el.style.filter = 'none'; },
    () => { el.style.transform = 'translate(-54%,-48%) scale(1.1)'; el.style.opacity = '1'; el.style.filter = 'saturate(0) brightness(3)'; },
    () => { el.style.transform = 'translate(-46%,-52%) scale(0.2)'; el.style.opacity = '0'; el.style.filter = 'none'; },
    () => { el.style.transform = 'translate(-50%,-50%) scale(1.05)'; el.style.opacity = '1'; el.style.filter = 'saturate(0) contrast(4) brightness(2)'; },
    () => { el.style.transform = 'translate(-50%,-50%) scale(0.9)'; el.style.opacity = '0.5'; el.style.filter = 'saturate(0) brightness(2)'; },
    () => { el.style.transform = 'translate(-50%,-50%) scale(1)'; el.style.opacity = '1'; el.style.filter = 'none'; },
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
  // Reverse of cssGlitch — expands out rather than contracting
  el.style.transition = 'none';
  let f = 0;
  const frames = [
    () => { el.style.transform = 'translate(-50%,-50%) scale(1) skewX(-10deg)'; el.style.opacity = '0.9'; el.style.filter = 'saturate(3) brightness(3) hue-rotate(180deg)'; },
    () => { el.style.transform = 'translate(-56%,-50%) scale(1.15) skewX(8deg)'; el.style.opacity = '0.7'; el.style.filter = 'saturate(0) brightness(4) invert(1)'; },
    () => { el.style.transform = 'translate(-44%,-52%) scale(1.3) skewX(-6deg)'; el.style.opacity = '0.5'; el.style.filter = 'saturate(2) brightness(5) hue-rotate(270deg)'; },
    () => { el.style.transform = 'translate(-50%,-50%) scale(1.5) skewY(-4deg)'; el.style.opacity = '0.25'; el.style.filter = 'saturate(0) brightness(3)'; },
    () => { el.style.transform = 'translate(-50%,-50%) scale(1.8)'; el.style.opacity = '0.1'; el.style.filter = 'invert(1)'; },
    () => { el.style.transform = 'translate(-50%,-50%) scale(2.2)'; el.style.opacity = '0'; },
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
