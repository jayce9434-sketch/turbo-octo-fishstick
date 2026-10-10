const CACHE='bugbreak-v5-2-shared-run-r1';
const ASSETS=[
  './','./index.html','./style.css','./data.js','./audio.js','./ui.js','./network.js','./game.js','./manifest.json',
  './icon-192.png','./icon-512.png','./apple-touch-icon.png',
  './normal-1.mp3','./normal-2.mp3','./normal-3.mp3','./normal-4.mp3','./normal-5.mp3',
  './boss-1.mp3','./boss-2.mp3','./boss-3.mp3','./boss-4.mp3','./boss-5.mp3','./boss-6.mp3'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match('./index.html'))));
});
