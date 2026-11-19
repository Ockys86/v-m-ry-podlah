'use strict';
const root = new URL(self.registration.scope);
const entry = new URL('index.html', root).href;
const prefix = 'vymery-podlah:' + root.pathname + ':';
const release = '14.1';
const cacheName = prefix + release;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(entry, {cache: 'reload'});
    if (!response.ok || !(await response.clone().text()).includes('<meta name="offline-release" content="' + release + '">')) {
      throw new Error('Offline verze aplikace zatím není dostupná.');
    }
    const cache = await caches.open(cacheName);
    await cache.put(entry, response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(prefix) && name !== cacheName).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== root.origin) return;
  if (![root.pathname, root.pathname.replace(/\/$/, ''), new URL(entry).pathname].includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(entry);
    if (cached) return cached;
    const response = await fetch(entry, {cache: 'reload'});
    if (response.ok && (await response.clone().text()).includes('<meta name="offline-release" content="' + release + '">')) {
      await cache.put(entry, response.clone());
    }
    return response;
  })());
});
