'use strict';

/* ── Reduced motion check ── */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Boot sequence ── */
(function() {
  if (reduced) { document.body.classList.add('booted'); return; }
  const lines = ['b0','b1','b2','b3','b4','b5'];
  lines.forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.classList.add('show');
    }, 300 + i * 380);
  });
  const finish = () => {
    document.body.classList.add('booted');
    setTimeout(showMetrics, 200);
  };
  setTimeout(finish, 300 + lines.length * 380 + 600);
  document.getElementById('boot-skip').addEventListener('click', () => {
    finish();
  });
})();

/* ── Metric rows stagger ── */
function showMetrics() {
  ['m0','m1','m2','m3'].forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.classList.add('show');
    }, i * 120);
  });
}
if (reduced) showMetrics();

/* ── Agent Graph Canvas ── */
(function() {
  const canvas = document.getElementById('agent-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    canvas.width  = r.width;
    canvas.height = r.height - 38;
  }
  resize();

  /* Debounced resize — avoids firing on every pixel of drag */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  const NODES = [
    { id:'router',  label:'ROUTER',      color:'#9f7aea', r:10, role:'router' },
    { id:'micro',   label:'MICRO/NANO',  color:'#63b3ed', r:8,  role:'tier' },
    { id:'small',   label:'SMALL CAP',   color:'#63b3ed', r:8,  role:'tier' },
    { id:'mid',     label:'MID CAP',     color:'#63b3ed', r:8,  role:'tier' },
    { id:'large',   label:'LARGE CAP',   color:'#63b3ed', r:8,  role:'tier' },
    { id:'mega',    label:'MEGA CAP',    color:'#63b3ed', r:8,  role:'tier' },
    { id:'dcf',     label:'DCF',         color:'#68d391', r:6,  role:'sub' },
    { id:'rag',     label:'FILING RAG',  color:'#68d391', r:6,  role:'sub' },
    { id:'sent',    label:'SENTIMENT',   color:'#68d391', r:6,  role:'sub' },
    { id:'risk',    label:'RISK',        color:'#68d391', r:6,  role:'sub' },
    { id:'smart',   label:'SMART $',     color:'#68d391', r:6,  role:'sub' },
    { id:'ind',     label:'INDUSTRY',    color:'#68d391', r:6,  role:'sub' },
    { id:'out',     label:'OUTPUT',      color:'#fbbf24', r:9,  role:'output' },
  ];

  const EDGES = [
    ['router','micro'],['router','small'],['router','mid'],['router','large'],['router','mega'],
    ['micro','dcf'],['micro','rag'],['small','dcf'],['small','sent'],
    ['mid','dcf'],['mid','risk'],['large','dcf'],['large','smart'],
    ['mega','dcf'],['mega','ind'],
    ['dcf','out'],['rag','out'],['sent','out'],['risk','out'],['smart','out'],['ind','out'],
  ];

  function layout(W, H) {
    const pad = 40;
    const nodes = {};
    NODES.forEach(n => { nodes[n.id] = { ...n }; });

    nodes['router'].x = pad + 20;
    nodes['router'].y = H / 2;

    const tiers = ['micro','small','mid','large','mega'];
    tiers.forEach((id, i) => {
      nodes[id].x = W * 0.38;
      nodes[id].y = pad + i * ((H - pad*2) / (tiers.length - 1));
    });

    const subs = ['dcf','rag','sent','risk','smart','ind'];
    subs.forEach((id, i) => {
      nodes[id].x = W * 0.68;
      nodes[id].y = pad + i * ((H - pad*2) / (subs.length - 1));
    });

    nodes['out'].x = W - pad - 20;
    nodes['out'].y = H / 2;

    return nodes;
  }

  const signals = [];
  let lastSignal = 0;

  function spawnSignal(from, to, color) {
    signals.push({ from, to, t: 0, speed: 0.012 + Math.random() * 0.008, color });
  }

  function randomEdge() {
    return EDGES[Math.floor(Math.random() * EDGES.length)];
  }

  let nodes = {};
  let frameId;

  function draw(ts) {
    const W = canvas.width, H = canvas.height;
    if (W === 0 || H === 0) { frameId = requestAnimationFrame(draw); return; }

    nodes = layout(W, H);
    ctx.clearRect(0, 0, W, H);

    EDGES.forEach(([a, b]) => {
      const na = nodes[a], nb = nodes[b];
      if (!na || !nb) return;
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    if (ts - lastSignal > 300) {
      const [a, b] = randomEdge();
      const n = NODES.find(n => n.id === a);
      spawnSignal(a, b, n ? n.color : '#63b3ed');
      lastSignal = ts;
    }

    for (let i = signals.length - 1; i >= 0; i--) {
      const s = signals[i];
      s.t += s.speed;
      const na = nodes[s.from], nb = nodes[s.to];
      if (!na || !nb) { signals.splice(i, 1); continue; }
      const x = na.x + (nb.x - na.x) * s.t;
      const y = na.y + (nb.y - na.y) * s.t;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = s.color;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (s.t >= 1) signals.splice(i, 1);
    }

    NODES.forEach(n => {
      const nd = nodes[n.id];
      if (!nd) return;
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, n.r + 4, 0, Math.PI * 2);
      ctx.fillStyle = n.color + '18';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = n.color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `500 9px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(n.label, nd.x, nd.y + n.r + 13);
    });

    frameId = requestAnimationFrame(draw);
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { frameId = requestAnimationFrame(draw); }
      else { cancelAnimationFrame(frameId); }
    });
  }, { threshold: 0.1 });
  obs.observe(canvas.parentElement);
})();

/* ── Scroll reveal ── */
const revObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('on'); revObs.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));

/* ── Mobile nav ── */
const toggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');
toggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}));

/* ── Terminal form — Formspree ── */
/* TODO: Create account at formspree.io, get your endpoint ID, replace YOUR_FORMSPREE_ID below */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORMSPREE_ID';

const submitBtn = document.getElementById('t-submit');
const tOut = document.getElementById('t-out');

submitBtn.addEventListener('click', async () => {
  const name  = document.getElementById('c-name').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const msg   = document.getElementById('c-msg').value.trim();

  if (!name || !email || !msg) {
    tOut.classList.add('on');
    tOut.style.color = '#fc8181';
    tOut.textContent = '> Error: all fields required. Retry.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'TRANSMITTING…';
  tOut.style.color = 'var(--green)';
  tOut.classList.add('on');
  tOut.textContent = '';

  const introLines = [
    '> Validating payload…',
    '> Encrypting channel with AES-256…',
    '> Routing to inbox…',
  ];
  for (const line of introLines) {
    tOut.textContent += line + '\n';
    await new Promise(r => setTimeout(r, 400));
  }

  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name, email, message: msg }),
    });

    if (res.ok) {
      tOut.textContent += '> Message delivered. ETA response: <24h.\n> Session closed. ✓';
      submitBtn.textContent = 'TRANSMITTED ✓';
      submitBtn.style.borderColor = 'var(--green)';
      submitBtn.style.color = 'var(--green)';
    } else {
      throw new Error('non-ok');
    }
  } catch {
    tOut.style.color = '#fc8181';
    tOut.textContent += '> Error: transmission failed.\n> Email directly: manikanthnampally94@gmail.com';
    submitBtn.disabled = false;
    submitBtn.textContent = 'RETRY';
  }
});

/* ── Nav active section highlight ── */
(function(){
  const linkMap = {};
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
    linkMap[a.getAttribute('href').slice(1)] = a;
  });
  const secObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      Object.values(linkMap).forEach(a => a.classList.remove('nav-active'));
      const lnk = linkMap[e.target.id];
      if (lnk) lnk.classList.add('nav-active');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('[id]').forEach(el => {
    if (linkMap[el.id]) secObs.observe(el);
  });
})();

/* ── Nav border on scroll ── */
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
  nav.style.borderBottomColor = window.scrollY > 20 ? 'rgba(99,179,237,0.1)' : '';
}, { passive: true });
