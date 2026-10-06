const CACHE="jk-study-v16-watch-friendly";
const ASSETS=["./","./index.html","./app.js","./notifications.js","./manifest.webmanifest","./icon.png","./logo.png","./photo_couple.jpg","./photo_heart.jpg","./photo_woman.jpg","./photo_man.jpg"];

self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener("activate",e=>e.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
  self.clients.claim()
])));

self.addEventListener("fetch",e=>{
  if(e.request.mode==="navigate"){
    e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put("./index.html",copy));
      return r;
    }).catch(()=>caches.match("./index.html")));
    return;
  }
  e.respondWith(fetch(e.request,{cache:"no-store"}).catch(()=>caches.match(e.request)));
});

function courseFromBody(body=""){
  const m=String(body).match(/^(ECO 2210|ENG 2211|MKT 2000|BIO)\b/i);
  return m?m[1].toUpperCase():"J.K Study";
}

function courseIcon(course=""){
  if(course.startsWith("ECO"))return "📈";
  if(course.startsWith("ENG"))return "📖";
  if(course.startsWith("MKT"))return "📣";
  if(course.startsWith("BIO"))return "🔬";
  return "🎓";
}

function watchFriendly(data){
  const originalTitle=String(data.title||"J.K Study Management");
  const originalBody=String(data.body||"You have a study reminder.");
  const course=courseFromBody(originalBody);
  const icon=courseIcon(course);
  let title=originalTitle;
  let body=originalBody;

  const afterColon=originalTitle.includes(":")?originalTitle.split(":").slice(1).join(":").trim():"";
  const dueTime=(originalBody.match(/at\s+(.+)$/i)||[])[1];

  if(/^Due today:/i.test(originalTitle)){
    title=`${icon} ${course} • Due today`;
    body=afterColon+(dueTime?` • ${dueTime}`:"");
  }else if(/^Due tomorrow:/i.test(originalTitle)){
    title=`${icon} ${course} • Due tomorrow`;
    body=afterColon+(dueTime?` • ${dueTime}`:"");
  }else if(/^Exam in 3 days:/i.test(originalTitle)){
    title=`🎓 ${course} • Exam in 3 days`;
    body=afterColon||originalBody;
  }else if(/^Exam tomorrow:/i.test(originalTitle)){
    title=`🎓 ${course} • Exam tomorrow`;
    body=afterColon||originalBody;
  }else if(/^Overdue:/i.test(originalTitle)){
    title=`⚠️ ${course} • Overdue`;
    body=afterColon||originalBody;
  }else if(/^Study session in 30 minutes/i.test(originalTitle)){
    title=`⏱️ ${course} • Study in 30 min`;
    body=originalBody.replace(/^.*?•\s*/,"")||"Your study session starts soon.";
  }else if(originalTitle==="J.K Study Management"&&/Notifications are working/i.test(originalBody)){
    title="⌚ J.K Study • Watch test";
    body="Notifications are ready on this iPhone and can mirror to Apple Watch.";
  }

  return {title,body};
}

self.addEventListener("push",e=>{
  let data={};
  try{data=e.data?e.data.json():{}}catch{data={body:e.data?e.data.text():""}}
  const view=watchFriendly(data);
  e.waitUntil(self.registration.showNotification(view.title,{
    body:view.body,
    icon:"./icon.png",
    badge:"./icon.png",
    tag:data.tag||"jk-study-reminder",
    renotify:true,
    silent:false,
    timestamp:Date.now(),
    data:{url:data.url||"./"}
  }));
});

self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const target=(e.notification.data&&e.notification.data.url)||"./";
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const client of list){
      if("focus" in client){
        if("navigate" in client)client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  }));
});
