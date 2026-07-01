// Homepage/Welcome Screen Logic

export function initHomepage() {
  const btn = document.getElementById('ok-btn');
  const original = 'begin.';
  const redacted = '██████';
  let glitchInterval = null;

  const DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
  const RECT = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
  const HEX = 'polygon(12% 0%, 88% 0%, 100% 50%, 88% 100%, 12% 100%, 0% 50%)';
  const SHAPES = [RECT, DIAMOND, HEX];
  let shapeIdx = 0;

  // Setup SVG filters
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('style', 'position:absolute;width:0;height:0');
  svg.innerHTML = `<defs>
    <filter id="redact-glitch" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="turbulence" baseFrequency="0.08 0.12" numOctaves="3" seed="2" result="turb">
        <animate attributeName="seed" values="2;7;3;9;1" dur="0.2s" repeatCount="indefinite"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="turb" scale="4" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
      <feColorMatrix in="displaced" type="matrix"
        values="0.5 0 0 0 0.04
                0 0 0 0 0
                0 0 0.9 0 0.14
                0 0 0 1 0" result="tinted"/>
      <feOffset in="tinted" dx="-2" dy="0" result="rShift"/>
      <feOffset in="tinted" dx="2" dy="0" result="bShift"/>
      <feMerge>
        <feMergeNode in="rShift"/>
        <feMergeNode in="tinted"/>
        <feMergeNode in="bShift"/>
      </feMerge>
    </filter>
    <filter id="backdrop-glitch" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04 0.0" numOctaves="1" seed="5" result="turb2">
        <animate attributeName="seed" values="5;12;3;8;1" dur="0.2s" repeatCount="indefinite"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="turb2" scale="8" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>`;
  document.body.appendChild(svg);

  // Setup Venetian blind animation canvas
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;pointer-events:none;border-radius:2px;';
  btn.style.position = 'relative';
  btn.appendChild(canvas);

  let venetianRaf = null;
  let venetianOffset = 0;

  function drawVenetianFrame(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    const bandH = Math.max(2, Math.floor(h / 6));
    for (let y = -bandH * 2; y < h + bandH * 2; y += bandH * 2) {
      const yPos = (y + venetianOffset) % (h + bandH * 2);
      ctx.fillStyle = 'rgba(10,0,18,0.78)';
      ctx.fillRect(0, yPos, w, bandH);
      ctx.fillStyle = 'rgba(80,0,120,0.18)';
      ctx.fillRect(0, yPos + bandH, w, 1);
    }
  }

  function startVenetianAnim(w, h) {
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.style.display = 'block';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 40ms ease';
    requestAnimationFrame(() => { canvas.style.opacity = '1'; });
    const ctx = canvas.getContext('2d');
    let last = 0;
    function tick(ts) {
      if (ts - last > 16) {
        venetianOffset = (venetianOffset + 1.2) % (canvas.height + Math.max(2, Math.floor(h / 6)) * 2);
        drawVenetianFrame(ctx, w, h);
        last = ts;
      }
      venetianRaf = requestAnimationFrame(tick);
    }
    venetianRaf = requestAnimationFrame(tick);
  }

  function stopVenetianAnim() {
    canvas.style.transition = 'opacity 60ms ease';
    canvas.style.opacity = '0';
    setTimeout(() => {
      if (venetianRaf) { cancelAnimationFrame(venetianRaf); venetianRaf = null; }
      canvas.style.display = 'none';
    }, 60);
  }

  // Backdrop glitch effect
  const backdropGlitch = document.createElement('div');
  backdropGlitch.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;z-index:1;';
  document.body.appendChild(backdropGlitch);

  function fireBackdropGlitch() {
    backdropGlitch.innerHTML = '';
    const numBands = Math.floor(3 + Math.random() * 4);
    const screenH = window.innerHeight;
    for (let i = 0; i < numBands; i++) {
      const band = document.createElement('div');
      const top = Math.random() * screenH;
      const height = Math.floor(2 + Math.random() * 8);
      const offset = Math.floor(-12 + Math.random() * 24);
      band.style.cssText = `position:absolute;left:0;right:0;top:${top}px;height:${height}px;
        background:rgba(60,0,90,0.07);transform:translateX(${offset}px);mix-blend-mode:screen;`;
      backdropGlitch.appendChild(band);
    }
    backdropGlitch.style.filter = 'url(#backdrop-glitch)';
    backdropGlitch.style.opacity = '1';
    setTimeout(() => { backdropGlitch.style.opacity = '0'; backdropGlitch.innerHTML = ''; }, 180);
  }

  function startGlitch() {
    glitchInterval = setInterval(() => {
      shapeIdx = (shapeIdx + 1) % SHAPES.length;
      const rect = btn.getBoundingClientRect();
      const w = Math.round(rect.width), h = Math.round(rect.height);
      btn.style.clipPath = SHAPES[shapeIdx];
      if (shapeIdx === 0) {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
      } else if (shapeIdx === 1) {
        btn.style.background = '#0a0010';
        btn.style.color = 'rgba(180,140,220,0.85)';
        btn.style.borderColor = 'rgba(80,0,120,0.6)';
      } else {
        btn.style.background = 'rgba(60,0,90,0.85)';
        btn.style.color = '#ddd';
        btn.style.borderColor = 'rgba(120,0,180,0.6)';
      }

      startVenetianAnim(w, h);
      btn.textContent = redacted;
      btn.style.filter = 'url(#redact-glitch) invert(1) brightness(0.18) hue-rotate(255deg) saturate(1.4)';
      btn.style.transform = 'skewX(-3deg) translateX(1px)';
      btn.style.textShadow = '1px 0 #1a0030, -1px 0 #0d001e, 0 0 6px rgba(60,0,100,0.5)';

      setTimeout(() => {
        btn.style.transform = 'skewX(2deg) translateX(-2px)';
        btn.style.textShadow = '-2px 0 #1a0030, 2px 0 #0d001e, 0 0 6px rgba(60,0,100,0.35)';
      }, 80);

      setTimeout(() => {
        btn.textContent = original;
        btn.style.transition = 'filter 80ms ease, transform 80ms ease, text-shadow 80ms ease';
        btn.style.filter = '';
        btn.style.transform = '';
        btn.style.textShadow = '';
        stopVenetianAnim();
        setTimeout(() => { btn.style.transition = 'clip-path 80ms cubic-bezier(.4,0,.2,1),background 80ms ease,color 80ms ease,border-color 80ms ease'; }, 80);
      }, 200);

      fireBackdropGlitch();
    }, 4000);
  }

  canvas.style.display = 'none';
  setTimeout(startGlitch, 1400);
  btn.addEventListener('click', () => {
    clearInterval(glitchInterval);
    glitchInterval = null;
    stopVenetianAnim();
    shapeIdx = 0;
    btn.style.clipPath = '';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
    btn.style.textShadow = '';
    btn.style.filter = '';
    backdropGlitch.style.opacity = '0';
    backdropGlitch.innerHTML = '';
  }, { once: true });
}
