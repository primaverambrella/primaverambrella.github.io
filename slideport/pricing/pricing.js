// Pricing page: period switch and Paddle checkout.
// Keys and price IDs live in PADDLE in site.js. Until token is set, the button stays disabled.
(() => {
  const PRICES = {
    yearly: { price: '$29 <small>/ year</small>', sub: 'About $2.40 a month, billed once a year' },
    monthly: { price: '$4 <small>/ month</small>', sub: 'Billed monthly' },
  };
  let period = 'yearly';
  const $ = (s) => document.querySelector(s);
  const buy = $('[data-buy]');
  const note = $('[data-buy-note]');
  const params = new URLSearchParams(location.search);

  // The plugin opens this page with ?uid=…&email=… so the purchase is tied to the installation.
  const uid = (params.get('uid') || '').slice(0, 64);
  const email = (params.get('email') || '').slice(0, 254);

  if (params.get('checkout') === 'done') $('[data-checkout-done]').hidden = false;
  if (params.get('period') === 'monthly') period = 'monthly';

  function showPeriod() {
    document.querySelectorAll('[data-period]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.period === period)));
    $('[data-price]').innerHTML = PRICES[period].price;
    $('[data-price-sub]').textContent = PRICES[period].sub;
  }
  document.querySelectorAll('[data-period]').forEach((b) => b.addEventListener('click', () => { period = b.dataset.period; showPeriod(); }));
  showPeriod();

  const cfg = typeof PADDLE === 'object' ? PADDLE : null;
  // Тестовая оплата на живом сайте выключена: иначе любой оформит Pro тестовой картой.
  // Для проверки — локально или с ?sandbox=1.
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const sandboxBlocked = cfg && cfg.env === 'sandbox' && !local && params.get('sandbox') !== '1';
  if (!cfg || !cfg.token || !cfg.prices.yearly || !cfg.prices.monthly || sandboxBlocked) {
    buy.disabled = true;
    buy.textContent = 'Checkout opens soon';
    note.textContent = 'Online checkout is being set up. Until then, the free plan has every feature.';
    return;
  }

  const s = document.createElement('script');
  s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
  s.onload = () => {
    if (cfg.env === 'sandbox') Paddle.Environment.set('sandbox');
    Paddle.Initialize({ token: cfg.token });
  };
  s.onerror = () => { note.textContent = 'Checkout could not load. Turn off blockers for this page or try another browser.'; };
  document.head.appendChild(s);

  buy.addEventListener('click', () => {
    if (!window.Paddle) return;
    const opts = {
      items: [{ priceId: cfg.prices[period], quantity: 1 }],
      settings: { displayMode: 'overlay', theme: 'light', successUrl: location.origin + location.pathname + '?checkout=done' },
      customData: uid ? { uid } : undefined,
    };
    if (email) opts.customer = { email };
    Paddle.Checkout.open(opts);
  });
})();
