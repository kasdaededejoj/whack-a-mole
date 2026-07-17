// Gate — runs before welcome screen on every load.
// If player failed Round 1 within the last 24hrs, shows lockout screen.
// On expiry: unlocking animation → welcome screen appears.

const LOCKOUT_KEY = 'realm_lockout_until';
const LOCKOUT_DURATION = 24 * 60 * 60 * 1000; // 24hrs in ms

// Returns ms remaining on lockout, or 0 if clear.
function getLockoutRemaining() {
  try {
    const until = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
    return Math.max(0, until - Date.now());
  } catch (e) { return 0; }
}

export function setLockout() {
  try {
    localStorage.setItem(LOCKOUT_KEY, String(Date.now() + LOCKOUT_DURATION));
  } catch (e) { }
}

export function clearLockout() {
  try { localStorage.removeItem(LOCKOUT_KEY); } catch (e) { }
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatCountdown(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function buildLockoutScreen() {
  const el = document.createElement('div');
  el.id = 'gate-lockout';
  el.innerHTML = `
    <div id="gate-inner">
      <p id="gate-copy">this does not open for most.<br><span id="gate-sub">...unless the user seeks to challenge that theory.</span></p>
      <p id="gate-timer"></p>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

function unlockAnimation(lockoutEl, onDone) {
  // Glitch-out the lockout screen, then reveal welcome
  const inner = lockoutEl.querySelector('#gate-inner');
  inner.classList.add('gate-unlocking');
  let f = 0;
  const frames = [
    () => { inner.style.filter = 'invert(1) brightness(3)'; inner.style.transform = 'skewX(6deg) scale(1.02)'; },
    () => { inner.style.filter = 'none'; inner.style.transform = 'skewX(-4deg)'; },
    () => { inner.style.filter = 'invert(1)'; inner.style.transform = 'skewX(0) scale(0.98)'; inner.style.opacity = '0.6'; },
    () => { inner.style.filter = 'brightness(4)'; inner.style.transform = 'none'; inner.style.opacity = '0.3'; },
    () => { inner.style.filter = 'none'; inner.style.opacity = '0'; },
  ];
  function next() {
    if (f >= frames.length) {
      lockoutEl.style.transition = 'opacity .4s ease';
      lockoutEl.style.opacity = '0';
      setTimeout(() => { lockoutEl.remove(); onDone(); }, 420);
      return;
    }
    frames[f](); f++;
    setTimeout(next, 60 + Math.random() * 40);
  }
  next();
}

// Call from initGame() before anything else is shown.
// Returns true if gate is active (welcome screen should stay hidden),
// false if clear (proceed normally).
export function initGate(welcomeScreen) {
  const remaining = getLockoutRemaining();
  if (remaining <= 0) return false;

  // Hide welcome screen while gate is active
  welcomeScreen.classList.remove('active');

  const lockoutEl = buildLockoutScreen();
  const timerEl = lockoutEl.querySelector('#gate-timer');

  function tick() {
    const left = getLockoutRemaining();
    if (left <= 0) {
      clearInterval(interval);
      unlockAnimation(lockoutEl, () => {
        welcomeScreen.classList.add('active');
      });
      return;
    }
    timerEl.textContent = formatCountdown(left);
  }

  tick();
  const interval = setInterval(tick, 1000);
  return true;
}
