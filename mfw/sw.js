const CACHE='mfp-shell-2026-10-03-p1';
const CORE=[
  '/platform/index.html',
  '/platform/platform.css?v=20261003p1',
  '/platform/platform.js?v=20261003p1',
  '/platform/event-data.js',
  '/platform/bfs/index.html',
  '/platform/made-in-moscow/index.html',
  '/mfw/index.html',
  '/manifest.webmanifest',
  '/offline.html',
  '/icon.svg',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key.startsWith('mfp-shell-')).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

async function networkFirst(request){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request);
    if(response&&response.ok&&response.type==='basic')cache.put(request,response.clone());
    return response;
  }catch(_){
    return (await cache.match(request)) || (request.mode==='navigate' ? (await cache.match('/offline.html')) : Response.error());
  }
}

async function cacheFirst(request){
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response&&response.ok&&response.type==='basic')cache.put(request,response.clone());
  return response;
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate' || ['script','style'].includes(request.destination)){
    event.respondWith(networkFirst(request));
    return;
  }

  if(['image','font'].includes(request.destination)){
    event.respondWith(cacheFirst(request));
  }
});
