/* AGS analytics: set a real GA4 Measurement ID to activate collection. */
(() => {
  const measurementId = 'G-D8VQEGN9C3';
  const validId = /^G-[A-Z0-9]+$/i.test(measurementId);
  if (!validId) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  const send = (name, params = {}) => window.gtag('event', name, params);
  window.addEventListener('ags_product_view', (event) => {
    const product = event.detail || {};
    send('view_item', { currency: 'JOD', items: [{ item_id: String(product.id || ''), item_name: product.title || '', item_brand: product.brand || undefined, price: Number(product.price || 0) }] });
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.href || '';
    if (href.startsWith('https://wa.me/')) send('whatsapp_click', { link_url: href });
    else if (href.startsWith('tel:')) send('phone_click', { link_url: href });
    else if (href.startsWith('mailto:')) send('email_click', { link_url: href });
    else if (link.matches('a[href="rfq.html"], a[href="#booking"]')) send('quote_cta_click', { link_url: href });
  });
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form && (form.id === 'rfqForm' || form.id === 'bookingForm' || form.matches('form'))) {
      send('form_submit', { form_id: form.id || 'unknown' });
    }
  });
})();
