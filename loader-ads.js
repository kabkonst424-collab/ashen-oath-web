/* VK AdMarket banners beside the Ashen Oath menu (game loading screen). */
(function () {
  'use strict';
  const menu = document.getElementById('actMenu');
  const menuCard = document.getElementById('menuCard');
  if (!menu || !menuCard) return;

  const SLOTS = ['2096994', '2108108', '2108110'];
  let active = false;
  let rail = null;

  function layout() {
    if (rail) menu.dataset.loaderAds = 'three';
    else delete menu.dataset.loaderAds;
  }

  function stop() {
    active = false;
    if (rail) rail.remove();
    rail = null;
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
    rail = document.createElement('div');
    rail.className = 'ashen-loader-ads';
    for (const id of SLOTS) rail.appendChild(placement(id));
    menu.appendChild(rail);
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
