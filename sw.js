/* Keeps the board working with no internet.
   - The board's own files: answer from the saved copy at once, and refresh it in the background.
   - Pictures: the starter board's pictures are saved on the first visit. After that the page
     sends the list of pictures on the board, and exactly those are kept. Nothing else is saved,
     so search results never crowd out the board's own pictures.
   - Picture searches, and everything else: never saved.
   If you add a file to the project, add it to FILES below. */
'use strict';

importScripts('data.js');
var D = self.BoardData;

var HOME = new URL('./', self.location.href).pathname;   // only this folder: other sites may share the address
var PREFIX = 'communication-board:' + HOME + ':';
var SHELL = PREFIX + 'shell-v1';
var PICTURES = PREFIX + 'pictures';
var FILES = ['./', 'index.html', 'style.css', 'data.js', 'app.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png'];

/* Make the saved pictures match this list: fetch what is missing, drop what is no longer used. */
function keepPictures(ids) {
  var wanted = {};
  ids.forEach(function (id) { var url = D.pictureUrl(id); if (url) wanted[url] = true; });
  return caches.open(PICTURES).then(function (cache) {
    return cache.keys().then(function (saved) {
      var have = {};
      var drops = saved.map(function (request) {
        have[request.url] = true;
        return wanted[request.url] ? null : cache.delete(request);
      });
      var adds = Object.keys(wanted).filter(function (url) { return !have[url]; }).map(function (url) {
        return fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' })
          .then(function (reply) { return reply.ok ? cache.put(url, reply) : null; })
          .catch(function () { /* offline or missing: the tile falls back to words */ });
      });
      return Promise.all(drops.concat(adds));
    });
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) { return cache.addAll(FILES); })
      .then(function () { return keepPictures(D.picturesOnBoard(D.starterBoard())); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (names) {
    return Promise.all(names.map(function (name) {
      var ours = name.indexOf(PREFIX) === 0;
      return ours && name !== SHELL && name !== PICTURES ? caches.delete(name) : null;
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (event) {
  var data = event.data;
  if (!data || data.type !== 'pictures' || !Array.isArray(data.ids)) return;
  var ids = data.ids.filter(function (id) { return D.cleanPicture(id); }).slice(0, D.LIMITS.allTiles);
  event.waitUntil(keepPictures(ids));
});

function ownFile(event, url) {
  var key = url.origin + url.pathname;   // ignore ?anything, so links with tracking tags do not pile up copies
  return caches.open(SHELL).then(function (cache) {
    return cache.match(key).then(function (saved) {
      var fresh = fetch(event.request).then(function (reply) {
        if (!reply.ok) return reply;
        return cache.put(key, reply.clone()).then(function () { return reply; });
      });
      if (!saved) return fresh;
      event.waitUntil(fresh.catch(function () { /* offline: the saved copy is already on its way */ }));
      return saved;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.indexOf(HOME) === 0) event.respondWith(ownFile(event, url));
    return;
  }
  if (url.origin === 'https://static.arasaac.org' && url.pathname.indexOf('/pictograms/') === 0) {
    event.respondWith(caches.open(PICTURES).then(function (cache) {
      return cache.match(request.url).then(function (saved) { return saved || fetch(request); });
    }));
  }
});
