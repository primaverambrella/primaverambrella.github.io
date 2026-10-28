// Pricing page: period switch and checkout through Lava.top via the Slideport server.
// The server creates the invoice and returns Lava.top's payment page; after payment Lava.top
// sends the buyer back here with ?paid=<contractId>, and we fetch the personal license key.
(() => {
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const api = typeof SLIDEPORT_API === 'object' ? SLIDEPORT_API : null;
  const proCard = $('[data-pro-card]');
  // The period switch itself lives in site.js (shared with the landing); here we only preselect it.
  const want = params.get('period');
  if (want === 'monthly' && proCard) proCard.querySelector('[data-pro-period="monthly"]')?.click();
  if (want === 'lifetime') setTimeout(() => document.getElementById('lifetime')?.scrollIntoView({ block: 'center' }), 50);

  // Buying from the cards lives in site.js (the landing has the same cards).
  const note = (proCard && proCard.querySelector('[data-buy-note]')) || $('[data-buy-note]');
  if (!api || !api.base) return;

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
