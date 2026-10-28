// Не даём встроить сайт в чужую страницу (кликджекинг: прозрачная кнопка «оплатить» поверх приманки).
// GitHub Pages не умеет слать заголовок frame-ancestors, поэтому так.
if (window.top !== window.self) {
  try { window.top.location = window.location.href; } catch (e) { document.documentElement.style.display = 'none'; }
}

// Links that change after launch live here, in one place.
// community: Figma Community page of Slideport (after the plugin is approved).
// email: support address; leave empty to hide it.
const SITE = {
  community: '',
  email: 'marinekollins@gmail.com',
  issues: 'https://github.com/primaverambrella/primaverambrella.github.io/issues/new',
  // legalName: seller's legal name for Terms, if a payment provider asks for it; empty shows "Primavera Studio".
  legalName: '',
};


// Сервер Slideport: создаёт оплату в Lava.top и выдаёт личный ключ Pro. key — публичный ключ прокси (он же в плагине).
const SLIDEPORT_API = { base: 'https://html2figma-proxy.asr201.workers.dev', key: 'oHo-4b5243qoVZ3VNZs-soiahnYF0ECZ' };

document.querySelectorAll('[data-community]').forEach((el) => {
  if (SITE.community) {
    el.href = SITE.community;
    el.querySelector('[data-label]') && (el.querySelector('[data-label]').textContent = el.dataset.community || 'Open in Figma Community');
  } else {
    el.removeAttribute('href');
    el.setAttribute('aria-disabled', 'true');
    el.style.cursor = 'default';
    const l = el.querySelector('[data-label]');
    if (l) l.textContent = 'Coming soon to Figma Community';
  }
});
document.querySelectorAll('[data-email]').forEach((el) => {
  if (SITE.email) { el.href = 'mailto:' + SITE.email; if (!el.dataset.keep) el.textContent = SITE.email; }
  else el.closest('[data-email-wrap]')?.remove();
});
document.querySelectorAll('[data-legal-name]').forEach((el) => { if (SITE.legalName) el.textContent = SITE.legalName; });
document.querySelectorAll('[data-issues]').forEach((el) => { el.href = SITE.issues; });
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

// Nav: border on scroll, mobile menu.
const nav = document.querySelector('.nav');
if (nav) {
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  const btn = nav.querySelector('.menu-btn');
  btn && btn.addEventListener('click', () => { const o = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });
  nav.querySelectorAll('ul a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
}

// Docs: highlight the current section in the table of contents.
const toc = document.querySelectorAll('.toc a');
if (toc.length && 'IntersectionObserver' in window) {
  const byId = new Map([...toc].map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { toc.forEach((a) => a.classList.remove('on')); byId.get(e.target.id)?.classList.add('on'); } });
  }, { rootMargin: '-30% 0px -60% 0px' });
  document.querySelectorAll('.prose section[id]').forEach((s) => io.observe(s));
}

// Pricing on the landing: Pro yearly / monthly switch.
const PRO_PERIODS = {
  yearly: { price: '$29 <small>/ year</small>', sub: 'Just <b>$2.42 a month</b> — 52% less than monthly' },
  monthly: { price: '$5 <small>/ month</small>', sub: 'Billed monthly. <b>Cancel any time.</b>' },
};
document.querySelectorAll('[data-pro-card]').forEach((card) => {
  const set = (p) => {
    card.querySelectorAll('[data-pro-period]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.proPeriod === p)));
    const price = card.querySelector('[data-pro-price]'), sub = card.querySelector('[data-pro-sub]'), cta = card.querySelector('[data-pro-cta]');
    if (price) price.innerHTML = PRO_PERIODS[p].price;
    if (sub) sub.innerHTML = PRO_PERIODS[p].sub;
    if (cta && cta.tagName === 'A') cta.href = cta.getAttribute('href').replace(/period=\w+/, 'period=' + p);
    card.dataset.period = p;
  };
  card.querySelectorAll('[data-pro-period]').forEach((b) => b.addEventListener('click', () => set(b.dataset.proPeriod)));
  set(card.dataset.period || 'yearly');
});

// ---------- leads and checkout (landing and pricing page) ----------
// The email typed once is remembered and prefilled everywhere: one field, one click to checkout.
const EMAIL_KEY = 'slideportEmail';
const remembered = (() => { try { return localStorage.getItem(EMAIL_KEY) || ''; } catch (e) { return ''; } })();
const remember = (email) => { try { localStorage.setItem(EMAIL_KEY, email); } catch (e) {} };
const validEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
document.querySelectorAll('[data-email-input], [data-lead-form] input[type=email]').forEach((el) => { if (!el.value && remembered) el.value = remembered; });

// «Get it at launch» forms: the email goes to the Slideport server, the form says thanks.
document.querySelectorAll('[data-lead-form]').forEach((form) => {
  const input = form.querySelector('input[type=email]');
  const btn = form.querySelector('button');
  const msg = form.parentElement.querySelector('[data-lead-msg]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (input.value || '').trim();
    if (!validEmail(email)) { input.focus(); input.setCustomValidity('Enter your email'); input.reportValidity(); return; }
    input.setCustomValidity('');
    btn.disabled = true;
    try {
      const r = await fetch(SLIDEPORT_API.base + '/subscribe?key=' + encodeURIComponent(SLIDEPORT_API.key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: form.dataset.leadForm || 'site', lang: (navigator.language || '').slice(0, 2) }),
      });
      if (!r.ok) throw new Error(r.status);
      remember(email);
      document.querySelectorAll('[data-email-input]').forEach((el) => { if (!el.value) el.value = email; });
      form.classList.add('done');
      if (msg) msg.innerHTML = SITE.community
        ? 'You\'re in! <a href="' + SITE.community + '">Open Slideport in Figma →</a>'
        : '✓ You\'re on the list. We\'ll email you the install link the day Slideport is live — with 7 days of Pro.';
    } catch (err) {
      btn.disabled = false;
      if (msg) msg.textContent = 'Something went wrong. Try again in a minute.';
    }
  });
  input.addEventListener('input', () => input.setCustomValidity(''));
});

// Buy from any plan card: email → Lava.top checkout. Pro takes the period chosen in the card.
document.querySelectorAll('[data-buy-card]').forEach((card) => {
  const buy = card.querySelector('[data-buy]');
  const emailIn = card.querySelector('[data-email-input]');
  const note = card.querySelector('[data-buy-note]');
  if (!buy || !emailIn) return;
  const label = buy.textContent;
  const params = new URLSearchParams(location.search);
  emailIn.addEventListener('input', () => emailIn.setCustomValidity(''));
  emailIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') buy.click(); });
  buy.addEventListener('click', async () => {
    const email = (emailIn.value || '').trim();
    if (!validEmail(email)) { emailIn.focus(); emailIn.setCustomValidity('Enter the email for your receipt and license key'); emailIn.reportValidity(); return; }
    emailIn.setCustomValidity('');
    remember(email);
    const plan = card.dataset.buyCard === 'lifetime' ? 'lifetime' : (card.dataset.period || 'yearly');
    buy.disabled = true; buy.textContent = 'Opening checkout…';
    try {
      const r = await fetch(SLIDEPORT_API.base + '/checkout?key=' + encodeURIComponent(SLIDEPORT_API.key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan, uid: (params.get('uid') || '').slice(0, 64), promo: (params.get('promo') || '').slice(0, 36), lang: (navigator.language || '').slice(0, 2) }),
      });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || r.status);
      try { sessionStorage.setItem('slideportContract', j.contractId); } catch (e) {}
      location.href = j.url;
    } catch (e) {
      buy.disabled = false; buy.textContent = label;
      if (note) note.textContent = e.message === 'lifetime is not configured' ? 'Lifetime opens very soon. Yearly and monthly plans are available now.' : 'Checkout could not open. Try again in a minute or write to us.';
    }
  });
});
