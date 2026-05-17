(function initAdSense() {
  const cfg = window.BYCV_ADSENSE || {};
  const client = (cfg.client || '').trim();

  if (!client) return;

  document.body.classList.add('ads-live');

  const units = document.querySelectorAll('ins.adsbygoogle');

  units.forEach((el) => {
    const rail = el.closest('.ad-rail-left, .ad-rail-right');
    const side = rail?.classList.contains('ad-rail-left') ? 'left' : 'right';

    el.setAttribute('data-ad-client', client);
    if (cfg.slots?.[side]) {
      el.setAttribute('data-ad-slot', cfg.slots[side]);
    }
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead2/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  script.crossOrigin = 'anonymous';
  script.onload = () => {
    units.forEach(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.warn('AdSense:', err);
      }
    });
  };
  document.head.appendChild(script);
})();
