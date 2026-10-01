// Where enquiries are sent. Configure ONE of these.
//
// 1) Google Form (recommended): submits silently in the background, responses land in the
//    form's linked Google Sheet. `action` is the form URL ending in /formResponse, and each
//    field maps to that question's entry ID (from the form's "Get pre-filled link").
const GOOGLE_FORM = {
  action: 'https://docs.google.com/forms/d/e/1FAIpQLSd5UGSqX5JxBPt1nUrFkuaPqFqTaDSh7jwzLgG1VMLTf2ttPg/formResponse',
  fields: {
    name: 'entry.740436059',
    organisation: 'entry.833803208',
    email: 'entry.1614880336',
    phone: 'entry.1500124636',
    designation: 'entry.1033311060',
    city: 'entry.1676442038',
    interest: 'entry.2090715026',
    message: 'entry.145176405'
  }
};

// 2) Google Apps Script web app URL (alternative). Setup: google-apps-script/README.md
const SHEET_ENDPOINT = '';

// Spam protection: submissions made faster than a person could fill the form are dropped,
// and the same browser can only send one enquiry per cooldown window
const MIN_FILL_MS = 3000;
const SUBMIT_COOLDOWN_MS = 60000;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Preloader: lifts once the page and its images have finished loading (8s cap on very slow networks)
const PRELOADER_MAX_MS = 8000;
const preloader = document.getElementById('preloader');
if (preloader) {
  document.body.classList.add('is-loading');
  let hidden = false;
  const hidePreloader = () => {
    if (hidden) return;
    hidden = true;
    preloader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    setTimeout(() => preloader.remove(), 700);
  };
  if (document.readyState === 'complete') hidePreloader();
  else window.addEventListener('load', hidePreloader, { once: true });
  setTimeout(hidePreloader, PRELOADER_MAX_MS);
}

// Lazy images: the browser fetches them as they near the screen; fade each one in when it arrives.
// The class is only added here, so without JS images simply show as normal.
document.documentElement.classList.add('lazy-fade');
document.querySelectorAll('img[loading="lazy"]').forEach(img => {
  const done = () => img.classList.add('is-loaded');
  if (img.complete) done();
  else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
});

// Mobile menu: full-height panel under the header
const nav = document.getElementById('nav');
const toggle = document.getElementById('navToggle');
const header = document.querySelector('.site-header');
function setNav(open) {
  if (open) nav.style.setProperty('--nav-top', `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
  nav.classList.toggle('open', open);
  document.body.classList.toggle('nav-open', open);
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
const closeNav = () => setNav(false);
toggle.addEventListener('click', () => setNav(!nav.classList.contains('open')));
nav.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', closeNav));
// Close on Escape, or when the screen widens past the tablet layout
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { closeNav(); toggle.focus(); } });
window.matchMedia('(min-width: 881px)').addEventListener('change', e => { if (e.matches) closeNav(); });

// Scroll progress bar
const progress = document.getElementById('progress');
function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Scroll reveal, staggered within each group
document.querySelectorAll('.contact-cards').forEach(group => {
  group.querySelectorAll('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 110}ms`; });
});
const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: .12 }) : null;
document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

// Cursor spotlight on cards
document.querySelectorAll('.c-card').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

// Hero background: a connected-city network with data pulses travelling between nodes
const canvas = document.getElementById('network');
if (canvas && !reduceMotion) {
  const ctx = canvas.getContext('2d');
  const LINK = 150;
  let w, h, nodes = [], pulses = [], running = true;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth; h = canvas.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(90, (w * h) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
      r: Math.random() * 1.6 + .8
    }));
    pulses = [];
  }

  function spawnPulse() {
    const a = nodes[Math.floor(Math.random() * nodes.length)];
    const near = nodes.filter(b => b !== a && Math.hypot(a.x - b.x, a.y - b.y) < LINK);
    if (near.length) pulses.push({ a, b: near[Math.floor(Math.random() * near.length)], t: 0 });
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(86,200,240,${(1 - d / LINK) * .22})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    ctx.fillStyle = 'rgba(165,232,255,.75)';
    for (const n of nodes) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill(); }

    if (Math.random() < .08 && pulses.length < 14) spawnPulse();
    pulses = pulses.filter(p => p.t <= 1);
    for (const p of pulses) {
      p.t += .018;
      const x = p.a.x + (p.b.x - p.a.x) * p.t;
      const y = p.a.y + (p.b.y - p.a.y) * p.t;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(.4, 'rgba(86,200,240,.6)');
      g.addColorStop(1, 'rgba(86,200,240,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  // Pause when the hero is off screen
  new IntersectionObserver(([e]) => {
    const was = running;
    running = e.isIntersecting;
    if (running && !was) requestAnimationFrame(frame);
  }).observe(canvas);

  // Mobile browsers fire resize when the address bar shows/hides; only rebuild on a real width change
  let lastW = canvas.offsetWidth;
  window.addEventListener('resize', () => { if (canvas.offsetWidth !== lastW) { lastW = canvas.offsetWidth; resize(); } });
  resize();
  requestAnimationFrame(frame);
}

// Enquiry forms: the full form on the page and the short one in the "Book a Meeting" popup share one submit flow
const session = {
  get: k => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* storage unavailable */ } }
};

// Explicit rules per field; the browser's own pattern check is not relied on
const RULES = {
  name: v => v.length >= 2,
  organisation: v => v.length >= 2,
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
  phone: v => /^\+?[0-9 ()-]{7,20}$/.test(v) && (v.match(/\d/g) || []).length >= 7 && (v.match(/\d/g) || []).length <= 15
};
const isValid = input => (RULES[input.name] || (v => v !== ''))(input.value.trim());

function setupForm(form) {
  const statusEl = form.querySelector('.form-status');
  const submitBtn = form.querySelector('.submit');
  // Bot timing starts when a person first touches the form, not at page load
  let openedAt = Date.now();
  let touched = false;
  let submitting = false;
  form.addEventListener('focusin', () => { if (!touched) { touched = true; openedAt = Date.now(); } });

  // On success the form is cleared and the thank-you popup takes over
  function showSuccess() {
    form.reset();
    form.querySelectorAll('.field.invalid').forEach(el => el.classList.remove('invalid'));
    statusEl.textContent = '';
    touched = false;
    if (form.closest('.modal')) closeModal({ restoreFocus: false });
    showThanks();
  }

  function validate() {
    let ok = true;
    form.querySelectorAll('input[required]').forEach(input => {
      const valid = isValid(input);
      input.closest('.field').classList.toggle('invalid', !valid);
      if (!valid && ok) { input.focus(); ok = false; }
    });
    return ok;
  }
  form.querySelectorAll('input[required]').forEach(input => input.addEventListener('input', () => {
    if (isValid(input)) input.closest('.field').classList.remove('invalid');
  }));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submitting) return;
    statusEl.textContent = '';
    statusEl.classList.remove('error');
    if (!validate()) return;

    const f = new FormData(form);
    // Bots: honeypot filled or form completed impossibly fast. Show success so they don't retry.
    if (f.get('website') || Date.now() - openedAt < MIN_FILL_MS) { showSuccess(); return; }

    const lastSent = +session.get('leadSentAt') || 0;
    if (Date.now() - lastSent < SUBMIT_COOLDOWN_MS) {
      statusEl.textContent = 'Thanks, we already have your enquiry. Please wait a minute before sending another.';
      statusEl.classList.add('error');
      return;
    }

    submitting = true;
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    try {
      if (GOOGLE_FORM.action) {
        // Google Form: posted in the background; the response is opaque, so a resolved fetch counts as sent
        const body = new URLSearchParams();
        Object.entries(GOOGLE_FORM.fields).forEach(([key, entry]) => {
          if (entry && f.get(key)) body.append(entry, f.get(key));
        });
        await fetch(GOOGLE_FORM.action, { method: 'POST', mode: 'no-cors', body });
      } else if (SHEET_ENDPOINT) {
        const body = new URLSearchParams(f);
        body.append('source', form.dataset.source || 'India contact page');
        body.append('page', location.href);
        const res = await fetch(SHEET_ENDPOINT, { method: 'POST', body });
        const out = await res.json();
        if (!out.ok) throw new Error(out.error || 'Submission failed');
      } else {
        throw new Error('No form endpoint configured: set GOOGLE_FORM or SHEET_ENDPOINT in assets/js/main.js');
      }
      session.set('leadSentAt', String(Date.now()));
      showSuccess();
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Something went wrong. Please try again or email skashyap@appinfoinc.com.';
      statusEl.classList.add('error');
    } finally {
      submitting = false;
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });
}

const leadForm = document.getElementById('leadForm');
setupForm(leadForm);
setupForm(document.getElementById('quickForm'));

// "Request a meeting" buttons scroll to the full form and put the cursor in the first field
document.querySelectorAll('[data-open-form]').forEach(el => el.addEventListener('click', e => {
  e.preventDefault();
  const target = document.getElementById('enquiry');
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  target.classList.remove('flash'); target.offsetWidth; target.classList.add('flash');
  setTimeout(() => leadForm.querySelector('input[name=name]').focus({ preventScroll: true }), reduceMotion ? 0 : 600);
}));

// "Book a Meeting" popup (floating button)
const modal = document.getElementById('leadModal');
let lastFocus = null;

function openModal() {
  lastFocus = document.activeElement;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  setTimeout(() => modal.querySelector('input[name=name]').focus(), 50);
}
function closeModal({ restoreFocus = true } = {}) {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  if (restoreFocus && lastFocus) lastFocus.focus();
}

// Thank-you popup: shown after either form is sent, closes itself after THANKS_MS
const THANKS_MS = 8000;
const thanks = document.getElementById('thanksModal');
const thanksCount = thanks.querySelector('[data-countdown]');
let thanksTimer = null, thanksTick = null, thanksFocus = null;

function showThanks() {
  thanksFocus = lastFocus && !document.body.contains(document.activeElement) ? lastFocus : document.activeElement;
  thanks.hidden = false;
  document.body.classList.add('modal-open');
  // Restart the countdown bar animation
  thanks.classList.remove('counting'); thanks.offsetWidth; thanks.classList.add('counting');
  let left = THANKS_MS / 1000;
  thanksCount.textContent = left;
  clearInterval(thanksTick); clearTimeout(thanksTimer);
  thanksTick = setInterval(() => { left = Math.max(0, left - 1); thanksCount.textContent = left; }, 1000);
  thanksTimer = setTimeout(hideThanks, THANKS_MS);
  setTimeout(() => thanks.querySelector('[data-close-thanks].btn').focus(), 50);
}
function hideThanks() {
  if (thanks.hidden) return;
  clearInterval(thanksTick); clearTimeout(thanksTimer);
  thanks.hidden = true;
  if (modal.hidden) document.body.classList.remove('modal-open');
  if (thanksFocus && document.body.contains(thanksFocus)) thanksFocus.focus({ preventScroll: true });
}
thanks.querySelectorAll('[data-close-thanks]').forEach(el => el.addEventListener('click', hideThanks));

document.querySelectorAll('[data-open-modal]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); openModal(); }));
modal.querySelectorAll('[data-close-form]').forEach(el => el.addEventListener('click', closeModal));
document.addEventListener('keydown', e => {
  if (!thanks.hidden) {
    if (e.key === 'Escape') hideThanks();
    if (e.key === 'Tab') { e.preventDefault(); thanks.querySelector('[data-close-thanks].btn').focus(); }
    return;
  }
  if (modal.hidden) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Tab') {
    const focusables = [...modal.querySelectorAll('button, input:not([tabindex="-1"]), select, textarea')].filter(el => el.offsetParent);
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

document.getElementById('year').textContent = new Date().getFullYear();
