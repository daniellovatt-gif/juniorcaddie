// journey.js — shared soft community-gate logic for the Junior Journey hub + five stage pages
const JOURNEY_GATE_KEY = 'jc_community_member';
const JOURNEY_GATE_SESSION_KEY = 'jc_gate_shown_this_session';
const SIGNUP_ERROR_MSG = 'Something went wrong — please try again, or email hello@juniorcaddie.co.uk.';

// Each stage page carries one gate box, sitting at the ~66% scroll-depth point of
// that stage's content. Only ONE gate is allowed to appear per visit — the session
// cap below is shared across pages so someone reading straight through Stage 1 into
// Stage 2 never sees more than one prompt.
function initJourneyGates() {
  if (localStorage.getItem(JOURNEY_GATE_KEY) === '1') return;
  if (sessionStorage.getItem(JOURNEY_GATE_SESSION_KEY) === '1') return;

  // Note: we observe small always-in-layout marker divs, not the gate boxes
  // themselves — the gate boxes start as display:none, and elements with no
  // layout box are never reported as intersecting by IntersectionObserver.
  const markers = document.querySelectorAll('.gate-marker');
  let shown = false;
  const observers = [];

  markers.forEach((marker) => {
    const gateId = marker.getAttribute('data-gate');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !shown && sessionStorage.getItem(JOURNEY_GATE_SESSION_KEY) !== '1') {
          shown = true;
          sessionStorage.setItem(JOURNEY_GATE_SESSION_KEY, '1');
          setTimeout(() => {
            const gate = document.getElementById(gateId);
            if (gate) gate.style.display = 'block';
          }, 400);
          observers.forEach(o => o.disconnect());
        }
      });
    }, { threshold: 0 });
    observer.observe(marker);
    observers.push(observer);
  });
}

function dismissJourneyGate(gateId) {
  const gate = document.getElementById(gateId);
  if (gate) gate.style.display = 'none';
  // Session cap stays set — dismissing one gate means none of the others pop up this visit either.
  sessionStorage.setItem(JOURNEY_GATE_SESSION_KEY, '1');
}

// Shows (or clears, with text '') a small error line directly under the signup form row
function setSignupError(row, text) {
  let el = row.nextElementSibling;
  if (!el || !el.classList.contains('signup-error')) {
    if (!text) return;
    el = document.createElement('div');
    el.className = 'signup-error';
    el.style.cssText = 'font-size:13px; color:#E05A5A; margin-bottom:8px;';
    row.insertAdjacentElement('afterend', el);
  }
  el.textContent = text;
}

async function submitJourneyGate(gateId, emailId) {
  const emailEl = document.getElementById(emailId);
  const email = emailEl.value.trim();
  if (!email || !email.includes('@')) {
    emailEl.style.borderColor = '#E05A5A';
    emailEl.focus();
    return;
  }
  const btn = emailEl.nextElementSibling;
  setSignupError(emailEl.parentElement, '');
  btn.disabled = true; btn.textContent = 'Joining...';

  try {
    const res = await fetch('https://formspree.io/f/xbdewqvn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        email,
        source: 'journey-page-gate-' + gateId,
        _subject: 'New JuniorCaddie community signup — Journey page'
      })
    });
    if (!res.ok) throw new Error('Formspree ' + res.status);
    localStorage.setItem(JOURNEY_GATE_KEY, '1');
    document.getElementById(gateId).innerHTML = `
      <div style="padding:8px 0;">
        <div style="font-size:40px; margin-bottom:12px;">✅</div>
        <p style="font-family:Georgia,serif; font-size:19px; font-weight:700; color:white; margin-bottom:8px;">Welcome to the community.</p>
        <p style="font-size:14px; color:#7BBDE0; line-height:1.6;">Thank you for supporting JuniorCaddie. Keep reading — there's plenty more to explore.</p>
      </div>`;
    if (typeof gtag === 'function') gtag('event', 'community_signup', { source: 'journey' });
  } catch(e) {
    btn.disabled = false; btn.textContent = 'Join free';
    setSignupError(emailEl.parentElement, SIGNUP_ERROR_MSG);
  }
}
