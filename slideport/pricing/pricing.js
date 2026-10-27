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

  // The plugin opens this page with ?uid=… so the purchase is tied to the installation.
  // Email is NOT taken from the URL: a crafted link could prefill someone else's address,
  // and the license key goes to whoever owns the checkout email.
  const uid = (params.get('uid') || '').slice(0, 64);

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
    Paddle.Initialize({
      token: cfg.token,
      eventCallback: (ev) => { if (ev && ev.name === 'checkout.completed') onPaid(ev.data || {}); },
    });
  };
  s.onerror = () => { note.textContent = 'Checkout could not load. Turn off blockers for this page or try another browser.'; };
  document.head.appendChild(s);

  buy.addEventListener('click', () => {
    if (!window.Paddle) return;
    const opts = {
      items: [{ priceId: cfg.prices[period], quantity: 1 }],
      settings: { displayMode: 'overlay', theme: 'light' },
      customData: uid ? { uid } : undefined,
    };
    Paddle.Checkout.open(opts);
  });

  // После оплаты: просим у сервера Slideport личный ключ. Подписка появляется в Paddle
  // через пару секунд после оплаты, поэтому несколько попыток.
  async function onPaid(data) {
    const box = $('[data-checkout-done]');
    const out = $('[data-license]');
    box.hidden = false;
    out.textContent = 'Getting your key…';
    setTimeout(() => { try { Paddle.Checkout.close(); } catch (e) {} box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 2500);
    const customer = data.customer && data.customer.id;
    // Если ключ не успел прийти, после перезагрузки страница попробует снова.
    try { customer && sessionStorage.setItem('slideportCustomer', customer); } catch (e) {}
    const api = typeof SLIDEPORT_API === 'object' ? SLIDEPORT_API : null;
    if (!customer || !api) { out.textContent = 'Write to us and we\'ll send your key.'; return; }
    for (let i = 0; i < 10; i++) {
      try {
        const r = await fetch(api.base + '/license?customer=' + encodeURIComponent(customer) + '&key=' + encodeURIComponent(api.key));
        const j = await r.json();
        if (r.ok && j.license) {
          out.textContent = j.license;
          $('[data-license-email]').textContent = 'Email: ' + j.email + '.';
          try { sessionStorage.removeItem('slideportCustomer'); } catch (e) {}
          return;
        }
      } catch (e) {}
      await new Promise((res) => setTimeout(res, 2000));
    }
    out.textContent = 'The key is taking longer than usual. Reload in a minute or write to us.';
  }
  try { const c = sessionStorage.getItem('slideportCustomer'); if (c) onPaid({ customer: { id: c } }); } catch (e) {}
  const copy = $('[data-copy]');
  copy && copy.addEventListener('click', async () => {
    const t = $('[data-license]').textContent;
    try { await navigator.clipboard.writeText(t); copy.textContent = 'Copied'; } catch (e) { copy.textContent = 'Select and copy'; }
  });
})();
