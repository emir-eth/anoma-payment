
self.addEventListener('install', function(e){ self.skipWaiting(); e.waitUntil(caches.open('anoma-demo-v1').then(function(c){ return c.addAll(['./','index.html','styles.css','app.js','assets/anoma-logo.svg']); })); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  e.respondWith(caches.match(e.request).then(function(resp){ return resp || fetch(e.request); }));
});
