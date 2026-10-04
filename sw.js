const CACHE="jk-study-v15-notifications";
const ASSETS=["./","./index.html","./app.js","./notifications.js","./manifest.webmanifest","./icon.png","./logo.png","./photo_couple.jpg","./photo_heart.jpg","./photo_woman.jpg","./photo_man.jpg"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>e.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
  self.clients.claim()
])));
self.addEventListener("fetch",e=>{
  if(e.request.mode==="navigate"){
    e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put("./index.html",copy));return r}).catch(()=>caches.match("./index.html")));
    return;
  }
  e.respondWith(fetch(e.request,{cache:"no-store"}).catch(()=>caches.match(e.request)));
});
self.addEventListener("push",e=>{
  let data={};
  try{data=e.data?e.data.json():{}}catch{data={body:e.data?e.data.text():""}}
  e.waitUntil(self.registration.showNotification(data.title||"J.K Study Management",{
    body:data.body||"You have a study reminder.",
    icon:"./icon.png",
    badge:"./icon.png",
    tag:data.tag||"jk-study-reminder",
    data:{url:data.url||"./"}
  }));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  e.waitUntil(clients.openWindow((e.notification.data&&e.notification.data.url)||"./"));
});