/* One VK AdMarket banner while the Ashen Oath menu is visible. */
(function () {
  'use strict';
  const menu = document.getElementById('actMenu');
  const menuCard = document.getElementById('menuCard');
  if (!menu || !menuCard) return;
  let active = false;
  let cards = [];

  function layout() {
    const count = cards.filter(card => !card.hidden).length;
    if (count) menu.dataset.loaderAds = 'one';
    else delete menu.dataset.loaderAds;
  }
  function stop() {
    active = false;
    for (const card of cards) card.remove();
    cards = [];
    layout();
  }
  function placement(id) {
    const card = document.createElement('aside');
    card.className = 'ashen-loading-ad';
    card.setAttribute('aria-label', 'Реклама');
    const label = document.createElement('span');
    label.className = 'ashen-loading-ad-label';
    label.textContent = 'Реклама';
    const slot = document.createElement('ins');
    slot.className = 'mrg-tag';
    slot.style.display = 'inline-block';
    slot.style.width = '240px';
    slot.style.height = '400px';
    slot.setAttribute('data-ad-client', 'ad-' + id);
    slot.setAttribute('data-ad-slot', id);
    card.appendChild(label);
    card.appendChild(slot);
    return card;
  }
  function start() {
    if (active || menu.hidden) return;
    active = true;
    const right = placement('2096994');
    menu.appendChild(right);
    cards = [right];
    layout();
    window.MRGtag = window.MRGtag || [];
    window.MRGtag.push({});
    if (!document.getElementById('ashen-vk-ad-sdk')) {
      const sdk = document.createElement('script');
      sdk.id = 'ashen-vk-ad-sdk';
      sdk.async = true;
      sdk.src = 'https://ad.mail.ru/static/ads-async.js';
      sdk.addEventListener('error', stop, { once: true });
      document.head.appendChild(sdk);
    }
  }
  // Model/animation readiness never controls advertising. Only menu visibility does.
  const observer = new MutationObserver(() => {
    if (menu.hidden) stop();
    else start();
  });
  observer.observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => { if (event.persisted) start(); });
  start();
})();
