// Links that change after launch live here, in one place.
// community: Figma Community page of Slideport (after the plugin is approved).
// email: support address; leave empty to hide it.
const SITE = {
  community: '',
  email: 'marinekollins@gmail.com',
  issues: 'https://github.com/primaverambrella/primaverambrella.github.io/issues/new',
  // legalName: seller's legal name for Terms, if Paddle asks for it; empty shows "Primavera Studio".
  legalName: '',
};

// Paddle checkout (pricing page). token: client-side token from Paddle → Developer tools → Authentication.
// env: 'sandbox' for tests, 'production' after Paddle approves the account.
// Сервер Slideport: выдаёт личный ключ Pro после оплаты. key — публичный ключ прокси (он же в плагине).
const SLIDEPORT_API = { base: 'https://html2figma-proxy.asr201.workers.dev', key: 'oHo-4b5243qoVZ3VNZs-soiahnYF0ECZ' };

const PADDLE = {
  env: 'sandbox',
  token: 'test_f10594bfda59ace8f650145b5dc',
  prices: { monthly: 'pri_01m5z32kkg4fvt07psh2seq423', yearly: 'pri_01m5z34ck51xa3jkr55xnh4179' },
};

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
