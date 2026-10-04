const JK_VAPID_PUBLIC_KEY='BC8x0EZNM-hCp1afZd7bB8z5OWHXHUFMTFSqSsSrl6P26jZ7eD6lSGWESouU_CgpZyDbOtxUeBTBXYZLqY2edAk';
const JK_NOTIFICATION_FUNCTION='https://cfiwsgqcoeddqqukgxho.supabase.co/functions/v1/send-study-reminders';

function jkUrlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData=atob(base64);
  return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)));
}
function jkStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
function jkIsIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1)}
function jkNotifSupported(){return 'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window}
function jkSetNotifStatus(text,kind='normal'){
  const el=document.getElementById('jkNotifStatus');if(!el)return;
  el.textContent=text;el.dataset.kind=kind;
}
function jkPrefsFromUI(){
  return{
    p_due_today:document.getElementById('jkDueToday').checked,
    p_due_tomorrow:document.getElementById('jkDueTomorrow').checked,
    p_exam_3_days:document.getElementById('jkExam3').checked,
    p_exam_1_day:document.getElementById('jkExam1').checked,
    p_study_30_min:document.getElementById('jkStudy30').checked,
    p_overdue_next_morning:document.getElementById('jkOverdue').checked
  }
}
function jkApplyPrefs(s){
  document.getElementById('jkDueToday').checked=s.due_today!==false;
  document.getElementById('jkDueTomorrow').checked=s.due_tomorrow!==false;
  document.getElementById('jkExam3').checked=s.exam_3_days!==false;
  document.getElementById('jkExam1').checked=s.exam_1_day!==false;
  document.getElementById('jkStudy30').checked=s.study_30_min!==false;
  document.getElementById('jkOverdue').checked=s.overdue_next_morning!==false;
}
async function jkLoadNotificationSettings(){
  if(typeof inviteCode==='undefined'||!inviteCode)return;
  try{
    const s=await rpc('app_get_notification_settings',{p_code:inviteCode,p_device_id:deviceId});
    jkApplyPrefs(s||{});
    const prefs=document.getElementById('jkNotifPrefs');
    if(s&&s.subscribed){
      prefs.hidden=false;
      jkSetNotifStatus(Notification.permission==='granted'?'Notifications are on for this device.':'Subscription saved, but notification permission is not currently granted.','good');
      document.getElementById('jkEnableNotifications').textContent='Re-enable notifications';
    }else{
      prefs.hidden=true;
      if(jkIsIOS()&&!jkStandalone())jkSetNotifStatus('On iPhone, install J.K Study Management to the Home Screen and open the installed app before enabling notifications.','warn');
      else jkSetNotifStatus('Notifications are off on this device.');
    }
  }catch(e){jkSetNotifStatus('Could not load notification settings.','warn')}
}
async function jkEnableNotifications(){
  if(typeof inviteCode==='undefined'||!inviteCode){jkSetNotifStatus('Enter the shared invite code first.','warn');return}
  if(!jkNotifSupported()){jkSetNotifStatus('Push notifications are not supported in this browser.','warn');return}
  if(jkIsIOS()&&!jkStandalone()){
    jkSetNotifStatus('On iPhone: Safari → Share → Add to Home Screen. Open the installed app, then enable notifications here.','warn');return;
  }
  try{
    jkSetNotifStatus('Requesting permission…');
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){
      jkSetNotifStatus(permission==='denied'?'Notifications were blocked. You can allow them from your device settings.':'Notification permission was not granted.','warn');return;
    }
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:jkUrlBase64ToUint8Array(JK_VAPID_PUBLIC_KEY)});
    }
    const data=sub.toJSON();
    await rpc('app_save_push_subscription',{
      p_code:inviteCode,
      p_device_id:deviceId,
      p_subscription:data,
      p_timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York'
    });
    document.getElementById('jkNotifPrefs').hidden=false;
    document.getElementById('jkEnableNotifications').textContent='Notifications enabled';
    jkSetNotifStatus('Notifications are on for this device.','good');
    await jkSaveNotificationSettings(false);
  }catch(e){
    console.error(e);jkSetNotifStatus('Could not enable notifications. Close and reopen the app, then try again.','warn');
  }
}
async function jkSaveNotificationSettings(showMessage=true){
  if(typeof inviteCode==='undefined'||!inviteCode)return;
  try{
    await rpc('app_update_notification_settings',Object.assign({p_code:inviteCode,p_device_id:deviceId},jkPrefsFromUI()));
    if(showMessage)jkSetNotifStatus('Reminder preferences saved.','good');
  }catch(e){jkSetNotifStatus('Could not save reminder preferences.','warn')}
}
async function jkSendTestNotification(){
  if(Notification.permission!=='granted'){jkSetNotifStatus('Enable notifications first.','warn');return}
  try{
    jkSetNotifStatus('Sending a test notification…');
    const r=await fetch(JK_NOTIFICATION_FUNCTION,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'test',inviteCode,deviceId})});
    const d=await r.json();
    if(!r.ok||!d.ok)throw new Error('test failed');
    jkSetNotifStatus('Test sent. It should appear momentarily.','good');
  }catch(e){jkSetNotifStatus('The test notification could not be sent.','warn')}
}
async function jkDisableNotifications(){
  try{
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.getSubscription();
    if(sub)await sub.unsubscribe();
    if(typeof inviteCode!=='undefined'&&inviteCode)await rpc('app_disable_push_notifications',{p_code:inviteCode,p_device_id:deviceId});
    document.getElementById('jkNotifPrefs').hidden=true;
    document.getElementById('jkEnableNotifications').textContent='Enable notifications';
    jkSetNotifStatus('Notifications are off on this device.');
  }catch(e){jkSetNotifStatus('Could not turn notifications off.','warn')}
}
function jkInstallNotificationUI(){
  if(document.getElementById('jkNotificationCard'))return;
  const reports=document.getElementById('reports');if(!reports)return;
  const style=document.createElement('style');
  style.textContent=`#jkNotificationCard .notif-grid{display:grid;grid-template-columns:1fr;gap:8px;margin:12px 0}.notif-option{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:#fafbfe}.notif-option input{width:20px;height:20px;margin:0;flex:0 0 auto}.notif-option b{font-size:13px;display:block}.notif-option span{font-size:11px;color:var(--muted)}#jkNotifStatus{font-size:12px;color:var(--muted);margin:8px 0 2px}#jkNotifStatus[data-kind="good"]{color:#117a55}#jkNotifStatus[data-kind="warn"]{color:#9a6700}.notif-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.notif-actions button{margin-top:0}.notif-actions .full{grid-column:1/-1}`;
  document.head.appendChild(style);
  const card=document.createElement('div');card.className='card';card.id='jkNotificationCard';
  card.innerHTML=`<h3>🔔 Notifications</h3><p class="small">Get reminders even when the app is closed.</p><div id="jkNotifStatus">Checking notification status…</div><button class="primary" id="jkEnableNotifications" type="button">Enable notifications</button><div id="jkNotifPrefs" hidden><div class="notif-grid"><label class="notif-option"><input id="jkDueTomorrow" type="checkbox" checked><span><b>Due tomorrow</b><span>7:00 PM the evening before</span></span></label><label class="notif-option"><input id="jkDueToday" type="checkbox" checked><span><b>Due today</b><span>8:00 AM on the due date</span></span></label><label class="notif-option"><input id="jkExam3" type="checkbox" checked><span><b>Exam — 3 days before</b><span>8:00 AM reminder</span></span></label><label class="notif-option"><input id="jkExam1" type="checkbox" checked><span><b>Exam — 1 day before</b><span>8:00 AM reminder</span></span></label><label class="notif-option"><input id="jkStudy30" type="checkbox" checked><span><b>Study task</b><span>30 minutes before scheduled time</span></span></label><label class="notif-option"><input id="jkOverdue" type="checkbox" checked><span><b>Overdue item</b><span>One reminder the next morning</span></span></label></div><div class="notif-actions"><button class="secondary" id="jkSaveNotif" type="button">Save preferences</button><button class="secondary" id="jkTestNotif" type="button">Send test</button><button class="secondary full" id="jkDisableNotif" type="button">Turn off notifications</button></div></div>`;
  const admin=[...reports.querySelectorAll('.card')].find(c=>c.textContent.includes('Admin activity'));
  reports.insertBefore(card,admin||null);
  document.getElementById('jkEnableNotifications').addEventListener('click',jkEnableNotifications);
  document.getElementById('jkSaveNotif').addEventListener('click',()=>jkSaveNotificationSettings(true));
  document.getElementById('jkTestNotif').addEventListener('click',jkSendTestNotification);
  document.getElementById('jkDisableNotif').addEventListener('click',jkDisableNotifications);
  let tries=0;const timer=setInterval(()=>{tries++;if(typeof inviteCode!=='undefined'&&inviteCode){clearInterval(timer);jkLoadNotificationSettings()}else if(tries>20){clearInterval(timer);jkSetNotifStatus('Enter the shared invite code first.','warn')}},500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',jkInstallNotificationUI);else jkInstallNotificationUI();