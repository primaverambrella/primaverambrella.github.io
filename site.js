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
  // clarity: Microsoft Clarity project ID (clarity.microsoft.com → Settings → Overview). Empty = no analytics, no banner.
  clarity: 'z4y0ph4ylt',
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
  yearly: { price: '$29 <s class="was">$60</s> <small>/ year</small>', sub: 'Just <b>$2.42 a month</b> — you save $31 a year' },
  monthly: { price: '$5 <small>/ month</small>', sub: 'Billed monthly. <b>Cancel any time.</b> Yearly saves $31.' },
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

// Lifetime launch price: one real deadline for everyone (LAUNCH_END on the server) and the places left.
// When either runs out the server itself switches checkout to the regular price, so the timer never lies.
(async () => {
  let st = null;
  try { st = await (await fetch(SLIDEPORT_API.base + '/launch?key=' + encodeURIComponent(SLIDEPORT_API.key))).json(); } catch (e) { return; }
  if (!st) return;
  const active = () => st.active && (!st.endsAt || Date.now() < st.endsAt);
  const regular = () => {
    document.querySelectorAll('[data-buy-card="lifetime"]').forEach((card) => {
      const price = card.querySelector('[data-life-price]'), sub = card.querySelector('[data-life-sub]');
      const badge = card.querySelector('[data-life-badge]'), btn = card.querySelector('[data-life-btn]');
      if (price) price.innerHTML = '$' + st.regular + ' <small>once</small>';
      if (sub) sub.innerHTML = 'Everything in Pro, <b>forever</b>';
      if (badge) badge.textContent = 'Best value';
      if (btn) btn.textContent = 'Buy once — $' + st.regular;
    });
    document.querySelectorAll('[data-launch-timer], .launch-bar, [data-launch-only]').forEach((el) => { el.hidden = true; });
  };
  if (!active()) return regular();
  document.querySelectorAll('[data-life-sub]').forEach((sub) => {
    sub.innerHTML = '<b>' + st.left + ' of ' + st.limit + ' left</b> at the launch price — then $' + st.regular;
  });
  // Bar above the menu on every page.
  const nav = document.querySelector('.nav');
  if (nav) {
    const href = document.getElementById('pricing') ? '#pricing' : '/#pricing';
    const bar = document.createElement('a');
    bar.className = 'launch-bar'; bar.href = href;
    bar.innerHTML = '<span><b>Launch price:</b> Lifetime <b>$' + st.price + '</b> <s>$' + st.regular + '</s></span>'
      + (st.endsAt ? '<span class="lb-time">ends in <b data-launch-left></b></span>' : '')
      + '<span class="lb-left">' + st.left + ' of ' + st.limit + ' left</span><span class="lb-go">Get it →</span>';
    nav.parentNode.insertBefore(bar, nav);
  }
  if (!st.endsAt) return;
  document.querySelectorAll('[data-launch-timer]').forEach((el) => { el.hidden = false; });
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const ms = st.endsAt - Date.now();
    if (ms <= 0) { clearInterval(timer); return regular(); }
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
    const text = (d ? d + 'd ' : '') + pad(Math.floor(s / 3600) % 24) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
    document.querySelectorAll('[data-launch-left]').forEach((el) => { el.textContent = text; });
  };
  const timer = setInterval(tick, 1000);
  tick();
})();

// Screenshot carousel: tabs, arrows, swipe; plays by itself until the visitor touches it.
document.querySelectorAll('[data-carousel]').forEach((car) => {
  const track = car.querySelector('.car-track'), tabs = [...car.querySelectorAll('.car-tabs button')];
  const n = track.children.length, MS = 5000;
  let cur = 0, timer = null;
  const go = (i, smooth = true) => { cur = (i + n) % n; track.scrollTo({ left: cur * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' }); mark(); };
  const mark = () => tabs.forEach((t, k) => {
    t.setAttribute('aria-selected', String(k === cur));
    if (k !== cur) return;
    const i = t.querySelector('i'); i.style.animation = 'none'; void i.offsetWidth; i.style.animation = '';
    // On phones the tabs are a scrolling strip: bring the active one into view without moving the page.
    const strip = t.parentElement;
    if (strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: t.offsetLeft - 16, behavior: 'smooth' });
  });
  const stop = () => { clearInterval(timer); timer = null; car.classList.remove('playing'); };
  const play = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    car.style.setProperty('--car-ms', MS + 'ms'); car.classList.add('playing');
    timer = setInterval(() => go(cur + 1), MS);
  };
  tabs.forEach((t, k) => t.addEventListener('click', () => { stop(); go(k); }));
  car.querySelector('.prev').addEventListener('click', () => { stop(); go(cur - 1); });
  car.querySelector('.next').addEventListener('click', () => { stop(); go(cur + 1); });
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(cur + (e.key === 'ArrowRight' ? 1 : -1)); } });
  track.addEventListener('pointerdown', stop);
  track.addEventListener('touchstart', stop, { passive: true });
  let raf = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== cur && Math.abs(track.scrollLeft - i * track.clientWidth) < 4) { cur = i; mark(); }
    });
  });
  addEventListener('resize', () => go(cur, false));
  // Start playing only when the carousel is on screen.
  new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && !timer && !car.dataset.touched) play(); else if (!e.isIntersecting) stop(); }), { threshold: .5 }).observe(car);
  [car.querySelector('.car-tabs'), car.querySelector('.car-view')].forEach((el) => el.addEventListener('pointerdown', () => { car.dataset.touched = '1'; }));
});

// ---------- site analytics: Microsoft Clarity, only after the visitor allows it ----------
// Like Yandex Metrica: visits, sources, heatmaps of clicks and scrolls, session recordings.
// Until the visitor clicks Allow nothing loads; the choice is remembered on this device.
(() => {
  if (!SITE.clarity) return;
  const KEY = 'slideportAnalytics';
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const set = (v) => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  let loaded = false;
  const load = () => {
    if (loaded) return; loaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', SITE.clarity);
    window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    // Every button and link click becomes a named event, so the dashboard shows which CTA people press.
    document.addEventListener('click', (e) => {
      const el = e.target.closest('a, button');
      if (!el || !window.clarity) return;
      const name = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (name) window.clarity('event', 'click: ' + name);
      if (el.matches('[data-buy]')) window.clarity('event', 'checkout: ' + (el.closest('[data-buy-card]')?.dataset.buyCard || ''));
    }, true);
    document.addEventListener('submit', (e) => { const f = e.target.closest('[data-lead-form]'); if (f && window.clarity) window.clarity('event', 'lead: ' + f.dataset.leadForm); }, true);
  };
  const banner = () => {
    if (document.querySelector('.consent')) return;
    const box = document.createElement('div');
    box.className = 'consent'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Analytics');
    box.innerHTML = '<p>We\'d like to see how people use this site — clicks and scrolls, with Microsoft Clarity — to make it better. No ads, no selling data. <a href="/slideport/privacy/#analytics">Details</a></p>'
      + '<div><button type="button" class="btn outline" data-c="no">No thanks</button><button type="button" class="btn primary" data-c="yes">Allow</button></div>';
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      const yes = b.dataset.c === 'yes';
      set(yes ? 'yes' : 'no');
      if (yes) load(); else if (loaded && window.clarity) window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
      box.remove();
    });
    document.body.appendChild(box);
  };
  const choice = get();
  if (choice === 'yes') load(); else if (choice !== 'no') banner();
  // «Analytics settings» in the footer reopens the choice.
  document.querySelectorAll('.footer .bottom > span:first-child').forEach((span) => {
    const a = document.createElement('a'); a.href = '#'; a.textContent = 'Analytics settings';
    a.addEventListener('click', (e) => { e.preventDefault(); banner(); });
    span.append(' · ', a);
  });
})();
