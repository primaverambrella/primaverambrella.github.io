// Pricing page: period switch and checkout through Lava.top via the Slideport server.
// The server creates the invoice and returns Lava.top's payment page; after payment Lava.top
// sends the buyer back here with ?paid=<contractId>, and we fetch the personal license key.
(() => {
  const PRICES = {
    yearly: { price: '$29 <small>/ year</small>', sub: 'About $2.40 a month, billed once a year' },
    monthly: { price: '$5 <small>/ month</small>', sub: 'Billed monthly' },
    lifetime: { price: '$79 <small>once</small>', sub: 'Pay once, Pro forever, every future update included', refund: '14-day money-back guarantee, no subscription' },
  };
  const REFUND = '14-day money-back guarantee, cancel any time';
  let period = 'yearly';
  const $ = (s) => document.querySelector(s);
  const buy = $('[data-buy]');
  const note = $('[data-buy-note]');
  const emailIn = $('[data-email-input]');
  const params = new URLSearchParams(location.search);
  const api = typeof SLIDEPORT_API === 'object' ? SLIDEPORT_API : null;

  // The plugin opens this page with ?uid=… so the purchase is tied to the installation.
  const uid = (params.get('uid') || '').slice(0, 64);
  // ?promo=CODE applies a Lava.top promo code to the checkout (also used for our own test orders).
  const promo = (params.get('promo') || '').slice(0, 36);
  if (params.get('period') === 'monthly' || params.get('period') === 'lifetime') period = params.get('period');

  function showPeriod() {
    document.querySelectorAll('[data-period]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.period === period)));
    $('[data-price]').innerHTML = PRICES[period].price;
    $('[data-price-sub]').textContent = PRICES[period].sub;
    $('[data-refund-note]').textContent = PRICES[period].refund || REFUND;
  }
  document.querySelectorAll('[data-period]').forEach((b) => b.addEventListener('click', () => { period = b.dataset.period; showPeriod(); }));
  showPeriod();

  if (!api || !api.base) {
    buy.disabled = true;
    buy.textContent = 'Checkout opens soon';
    note.textContent = 'Online checkout is being set up. Until then, the free plan has every feature.';
    return;
  }

  // Step 1: the buyer types their email here (Lava.top asks for it anyway; this way the
  // receipt, the subscription and the license key all use the same address).
  buy.addEventListener('click', async () => {
    const email = (emailIn.value || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { emailIn.focus(); emailIn.setCustomValidity('Enter the email for your receipt and license key'); emailIn.reportValidity(); return; }
    emailIn.setCustomValidity('');
    buy.disabled = true; buy.textContent = 'Opening checkout…';
    try {
      const r = await fetch(api.base + '/checkout?key=' + encodeURIComponent(api.key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan: period, uid, promo, lang: (navigator.language || '').slice(0, 2) }),
      });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || r.status);
      try { sessionStorage.setItem('slideportContract', j.contractId); } catch (e) {}
      location.href = j.url;
    } catch (e) {
      buy.disabled = false; buy.textContent = 'Get Pro';
      note.textContent = e.message === 'checkout is not configured' ? 'Online checkout is being set up. Until then, the free plan has every feature.'
        : e.message === 'lifetime is not configured' ? 'Lifetime opens very soon. Yearly and monthly plans are available now.'
        : 'Checkout could not open. Try again in a minute or write to us.';
    }
  });
  emailIn.addEventListener('input', () => emailIn.setCustomValidity(''));

  // Step 2: back from Lava.top. It appends ?invoiceId=…&status=success to the return URL;
  // sessionStorage is a fallback for the rare case the parameters are stripped.
  async function afterPayment(contract) {
    const box = $('[data-checkout-done]');
    const out = $('[data-license]');
    box.hidden = false;
    out.textContent = 'Getting your key…';
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    for (let i = 0; i < 15; i++) {
      try {
        const r = await fetch(api.base + '/license?contract=' + encodeURIComponent(contract) + '&key=' + encodeURIComponent(api.key));
        const j = await r.json();
        if (r.ok && j.license) {
          out.textContent = j.license;
          $('[data-license-email]').textContent = 'Email: ' + j.email + '.';
          try { sessionStorage.removeItem('slideportContract'); } catch (e) {}
          return;
        }
        if (r.status === 410) { out.textContent = 'Write to us from your purchase email and we\'ll send the key.'; return; }
      } catch (e) {}
      await new Promise((res) => setTimeout(res, 3000));
    }
    out.textContent = 'The payment is still being confirmed. Reload this page in a minute, or write to us.';
  }
  let contract = params.get('invoiceId') || '';
  if (!contract) { try { contract = sessionStorage.getItem('slideportContract') || ''; } catch (e) {} }
  const status = params.get('status');
  if ((params.get('paid') || status === 'success') && contract && status !== 'failed' && status !== 'cancelled') afterPayment(contract);
  else if (params.get('checkout') === 'failed' || status === 'failed') { note.textContent = 'The payment didn\'t go through. Nothing was charged; you can try again.'; }
  else if (status === 'cancelled') { note.textContent = 'Payment cancelled. Nothing was charged.'; }

  const copy = $('[data-copy]');
  copy && copy.addEventListener('click', async () => {
    const t = $('[data-license]').textContent;
    try { await navigator.clipboard.writeText(t); copy.textContent = 'Copied'; } catch (e) { copy.textContent = 'Select and copy'; }
  });
})();
