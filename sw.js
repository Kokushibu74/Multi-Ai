const CACHE_NAME='multi-ai-shell-v2';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.svg','./icons/icon-512.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 event.respondWith(fetch(request).then(response=>{
  if(response.ok && (request.mode==='navigate'||SHELL.some(path=>new URL(path,self.registration.scope).pathname===url.pathname))){
   const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
  }
  return response;
 }).catch(async()=> (await caches.match(request)) || (request.mode==='navigate' ? (await caches.match('./index.html')) : Response.error())));
});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});