const SUPABASE_URL='https://cfiwsgqcoeddqqukgxho.supabase.co';
const SUPABASE_KEY='sb_publishable_xExXRjTfzng1z4sa_bsGFg_EQ-ai6RO';
const INVITE_KEY='jk.shared.invite.v1';
const CACHE_KEY='jk.shared.cache.v1';
const DEVICE_KEY='jk.shared.device.v1';
const ADMIN_SESSION_KEY='jk.admin.code.v1';
const ECO2210='ECO 2210 - Principles of Macroeconomics (SHO1C)';
const ENG2211='ENG 2211 - Business Communication (GT02C)';
const MKT2000='MKT 2000 - Marketing Management (EE01C)';
const BIO='BIO - Biology';
const SUBJECTS={
  eco:{course:ECO2210,code:'ECO 2210',name:'Principles of Macroeconomics',icon:'📈',gradient:'linear-gradient(150deg,#0ca56c,#08764d)'},
  eng:{course:ENG2211,code:'ENG 2211',name:'Business Communication',icon:'📖',gradient:'linear-gradient(150deg,#3d7eff,#1749cf)'},
  mkt:{course:MKT2000,code:'MKT 2000',name:'Marketing Management',icon:'📣',gradient:'linear-gradient(150deg,#ffad2f,#ef6c00)'},
  bio:{course:BIO,code:'BIO',name:'Biology',icon:'🔬',gradient:'linear-gradient(150deg,#a85df5,#6d28d9)'}
};
const $=id=>document.getElementById(id);
let inviteCode=localStorage.getItem(INVITE_KEY)||'';
let deviceId=localStorage.getItem(DEVICE_KEY)||'';
if(!deviceId){deviceId=crypto.randomUUID();localStorage.setItem(DEVICE_KEY,deviceId)}
const sessionId=crypto.randomUUID();
let A=[],T=[],G=[],joined=false,loading=false,activeSubjectKey=null,activeSubjectTab='upcoming';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=m=>m<60?m+'m':Math.floor(m/60)+'h '+(m%60)+'m';
const toInput=d=>{const x=new Date(d),p=n=>String(n).padStart(2,'0');return x.getFullYear()+'-'+p(x.getMonth()+1)+'-'+p(x.getDate())+'T'+p(x.getHours())+':'+p(x.getMinutes())};

async function rpc(name,args){
  const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify(args||{})
  });
  const text=await r.text();
  if(!r.ok){let msg='Request failed';try{msg=JSON.parse(text).message||msg}catch{}throw new Error(msg)}
  return text?JSON.parse(text):null;
}
function setSync(text,ok=true){const el=$('syncStatus');if(el)el.textContent=text;const dot=document.querySelector('.sync-dot');if(dot)dot.style.background=ok?'#22a06b':'#f59e0b'}
function applyState(state){A=Array.isArray(state.assignments)?state.assignments:[];T=Array.isArray(state.tasks)?state.tasks:[];G=Array.isArray(state.goals)?state.goals.map(g=>Object.assign({},g,{target:g.target_minutes,done:g.done_minutes})):[];localStorage.setItem(CACHE_KEY,JSON.stringify(state));render()}
function loadCached(){try{const c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(c)applyState(c)}catch{}}
async function verifyInvite(code){return await rpc('app_verify_invite',{p_code:code})}
async function logVisit(event='heartbeat'){
  if(!joined||!inviteCode)return;
  try{await rpc('app_log_visit',{p_code:inviteCode,p_device_id:deviceId,p_session_id:sessionId,p_event:event})}catch{}
}
async function logAction(action,entityType,entityId,summary){
  if(!joined||!inviteCode)return;
  try{
    await rpc('app_log_action',{
      p_code:inviteCode,
      p_device_id:deviceId,
      p_session_id:sessionId,
      p_action_type:action,
      p_entity_type:entityType||null,
      p_entity_id:entityId||null,
      p_summary:summary||null
    })
  }catch{}
}
function deviceLabel(id){return id?'Device '+String(id).slice(-8).toUpperCase():'Unknown device'}
function fmtDuration(sec){
  sec=Math.max(0,Number(sec)||0);
  if(sec<60)return Math.round(sec)+' sec';
  if(sec<3600)return Math.floor(sec/60)+'m '+Math.round(sec%60)+'s';
  return Math.floor(sec/3600)+'h '+Math.floor((sec%3600)/60)+'m'
}
function browserLabel(ua){
  ua=String(ua||'');
  const device=/iPhone/i.test(ua)?'iPhone':/iPad/i.test(ua)?'iPad':/Android/i.test(ua)?'Android':/Macintosh/i.test(ua)?'Mac':/Windows/i.test(ua)?'Windows':'Device';
  const browser=/CriOS|Chrome/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':/Firefox/i.test(ua)?'Firefox':'Browser';
  return device+' • '+browser
}
async function joinWithCode(code){
  const clean=String(code||'').trim().toUpperCase(); if(!clean)return false;
  $('inviteError').textContent='Checking code…';
  try{
    const ok=await verifyInvite(clean);
    if(!ok){$('inviteError').textContent='That invite code is not valid.';return false}
    inviteCode=clean;localStorage.setItem(INVITE_KEY,clean);joined=true;$('inviteGate').hidden=true;$('inviteError').textContent='';setSync('Shared • Live');await loadSharedState(false);logVisit('start');return true
  }catch(e){$('inviteError').textContent='Could not connect. Check your internet and try again.';return false}
}
async function loadSharedState(silent=true){
  if(!joined||loading||!inviteCode)return;loading=true;if(!silent)setSync('Syncing…');
  try{const state=await rpc('app_get_state',{p_code:inviteCode});applyState(state||{});setSync('Shared • Live')}catch(e){setSync('Offline • showing last sync',false)}finally{loading=false}
}
async function mutate(name,args,logMeta){
  if(!joined){$('inviteGate').hidden=false;return null}
  setSync('Saving…');
  try{
    const result=await rpc(name,Object.assign({p_code:inviteCode},args||{}));
    if(logMeta){
      const entityId=logMeta.entityId||((typeof result==='string'&&/^[0-9a-f-]{36}$/i.test(result))?result:null);
      await logAction(logMeta.action,logMeta.entityType,entityId,logMeta.summary)
    }
    await loadSharedState(false);
    return result
  }
  catch(e){alert(e.message||'Could not save the change.');setSync('Sync problem',false);return null}
}
function priorityContext(){
  const now=new Date(),future=A.filter(x=>!x.done&&new Date(x.due)>=now).sort((a,b)=>new Date(a.due)-new Date(b.due)),isExam=x=>/\bexam\b/i.test(x.title),nonExam=future.filter(x=>!isExam(x)),exams=future.filter(isExam);
  return{now,nearestAssignmentDue:nonExam.length?new Date(nonExam[0].due).getTime():null,nearestExamDue:exams.length?new Date(exams[0].due).getTime():null,isExam}
}
function priorityInfo(x,ctx){
  const due=new Date(x.due).getTime();
  if((!ctx.isExam(x)&&ctx.nearestAssignmentDue!==null&&due===ctx.nearestAssignmentDue)||(ctx.isExam(x)&&ctx.nearestExamDue!==null&&due===ctx.nearestExamDue))return{label:'Highest priority',cls:'priority-highest',rank:0};
  const days=(due-ctx.now.getTime())/86400000;if(days<=7)return{label:'High priority',cls:'priority-high',rank:1};if(days<=14)return{label:'Medium priority',cls:'priority-medium',rank:2};return{label:'Low priority',cls:'priority-low',rank:3}
}
function assignmentRow(x,mode,ctx){
  const p=mode==='upcoming'?priorityInfo(x,ctx):null,status=x.done?'<span class="status-pill status-completed">Completed</span>':mode==='past'?'<span class="status-pill status-past">Past due</span>':'<span class="status-pill status-pending">Pending</span>',priority=p?'<span class="priority-pill '+p.cls+'">'+p.label+'</span>':'';
  return '<div class="item row '+(p&&p.rank===0?'priority-card':'')+'"><button class="check '+(x.done?'on':'')+'" onclick="toggleA(\''+x.id+'\')">'+(x.done?'✓':'')+'</button><div style="flex:1"><h3 style="'+(x.done?'text-decoration:line-through;opacity:.65':'')+'">'+esc(x.title)+'</h3><div class="small">'+esc(x.course)+' • Due '+new Date(x.due).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})+'</div>'+(x.note?'<div class="small" style="margin-top:4px">'+esc(x.note)+'</div>':'')+'<div class="assignment-meta">'+status+priority+'</div></div><button class="icon edit" onclick="editA(\''+x.id+'\')">✎</button><button class="icon danger" onclick="delA(\''+x.id+'\')">⌫</button></div>'
}
function renderSubject(containerId,course,label,sets,ctx){
  const el=$(containerId);if(!el)return;const upcoming=sets.future.filter(x=>x.course===course),past=sets.past.filter(x=>x.course===course),completed=sets.completed.filter(x=>x.course===course);
  el.innerHTML='<div class="course-assignments"><div class="assignment-section-title">Upcoming</div>'+(upcoming.length?upcoming.map(x=>assignmentRow(x,'upcoming',ctx)).join(''):'<span class="small">No upcoming '+label+' assignments.</span>')+'<details class="folder"><summary>Completed ('+completed.length+')</summary><div class="folder-body">'+(completed.length?completed.map(x=>assignmentRow(x,'completed',ctx)).join(''):'<span class="small">No completed '+label+' assignments.</span>')+'</div></details><details class="folder"><summary>Past Assignments ('+past.length+')</summary><div class="folder-body">'+(past.length?past.map(x=>assignmentRow(x,'past',ctx)).join(''):'<span class="small">No past-due '+label+' assignments.</span>')+'</div></details></div>'
}
function taskRow(x){
  const when=x.scheduled_at?new Date(x.scheduled_at):null;
  const whenText=when&&!isNaN(when)?when.toLocaleString([],{dateStyle:'medium',timeStyle:'short'}):'Not scheduled';
  return '<div class="item row"><button class="check '+(x.done?'on':'')+'" onclick="toggleT(\''+x.id+'\')">'+(x.done?'✓':'')+'</button><div style="flex:1"><h3 style="'+(x.done?'text-decoration:line-through;opacity:.55':'')+'">'+esc(x.title)+'</h3><div class="small">'+esc(x.course)+' • '+x.minutes+' min • '+esc(whenText)+'</div></div><button class="icon edit" onclick="editT(\''+x.id+'\')">✎</button><button class="icon danger" onclick="delT(\''+x.id+'\')">⌫</button></div>'
}


function openSubject(key){
  if(!SUBJECTS[key])return;
  activeSubjectKey=key;
  activeSubjectTab='upcoming';
  $('subjectHome').hidden=true;
  $('subjectDetail').hidden=false;
  renderSubjectDetail();
  window.scrollTo({top:0,behavior:'smooth'});
}
function closeSubject(){
  activeSubjectKey=null;
  $('subjectDetail').hidden=true;
  $('subjectHome').hidden=false;
}
function setSubjectTab(tab){
  if(!['upcoming','completed','past'].includes(tab))return;
  activeSubjectTab=tab;
  renderSubjectDetail();
}
function renderSubjectDetail(){
  if(!activeSubjectKey||!SUBJECTS[activeSubjectKey])return;
  const s=SUBJECTS[activeSubjectKey],now=new Date(),ctx=priorityContext();
  const upcoming=A.filter(x=>x.course===s.course&&!x.done&&new Date(x.due)>=now)
    .sort((a,b)=>priorityInfo(a,ctx).rank-priorityInfo(b,ctx).rank||new Date(a.due)-new Date(b.due));
  const completed=A.filter(x=>x.course===s.course&&x.done)
    .sort((a,b)=>new Date(b.due)-new Date(a.due));
  const past=A.filter(x=>x.course===s.course&&!x.done&&new Date(x.due)<now)
    .sort((a,b)=>new Date(b.due)-new Date(a.due));
  $('subjectDetailHero').style.background=s.gradient;
  $('subjectDetailArt').textContent=s.icon;
  $('subjectDetailCode').textContent=s.code;
  $('subjectDetailName').textContent=s.name;
  $('subjectUpcomingCount').textContent=upcoming.length;
  $('subjectCompletedCount').textContent=completed.length;
  $('subjectPastCount').textContent=past.length;
  document.querySelectorAll('.detail-tab').forEach(b=>b.classList.toggle('active',b.dataset.subtab===activeSubjectTab));
  const list=activeSubjectTab==='completed'?completed:activeSubjectTab==='past'?past:upcoming;
  const mode=activeSubjectTab==='completed'?'completed':activeSubjectTab==='past'?'past':'upcoming';
  const empty=activeSubjectTab==='completed'?'No completed assignments yet.':activeSubjectTab==='past'?'No past-due assignments.':'No upcoming assignments.';
  $('subjectDetailList').innerHTML=list.length?list.map(x=>assignmentRow(x,mode,ctx)).join(''):'<div class="empty-state">'+empty+'</div>';
}
function render(){
  const now=new Date();
  $('date').textContent=now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const ctx=priorityContext();

  const todaysAssignments=A
    .filter(x=>!x.done&&sameDay(new Date(x.due),now))
    .sort((a,b)=>new Date(a.due)-new Date(b.due));
  const todaysTasks=T.filter(x=>!x.done&&x.scheduled_at&&sameDay(new Date(x.scheduled_at),now)).sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at));
  $('todayCount').textContent=(todaysAssignments.length+todaysTasks.length)+' to do';
  $('todayAssignments').innerHTML=todaysAssignments.length
    ?todaysAssignments.map(x=>assignmentRow(x,'upcoming',ctx)).join('')
    :'<div class="empty-state">No assignments are due today.</div>';
  $('tasks').innerHTML=todaysTasks.length
    ?todaysTasks.map(taskRow).join('')
    :'<div class="empty-state">No study tasks scheduled for today.</div>';

  const future=A.filter(x=>!x.done&&new Date(x.due)>=now);
  const past=A.filter(x=>!x.done&&new Date(x.due)<now).sort((a,b)=>new Date(b.due)-new Date(a.due));
  const completed=A.filter(x=>x.done).sort((a,b)=>new Date(b.due)-new Date(a.due));
  future.sort((a,b)=>priorityInfo(a,ctx).rank-priorityInfo(b,ctx).rank||new Date(a.due)-new Date(b.due));

  $('acount').textContent=future.length+' upcoming';
  Object.entries(SUBJECTS).forEach(([key,s])=>{
    const all=A.filter(x=>x.course===s.course);
    const upcoming=all.filter(x=>!x.done&&new Date(x.due)>=now).length;
    const completedCount=all.filter(x=>x.done).length;
    const pastCount=all.filter(x=>!x.done&&new Date(x.due)<now).length;
    const el=$(key+'Counts');
    if(el)el.textContent=upcoming+' upcoming • '+completedCount+' completed'+(pastCount?' • '+pastCount+' past':'');
  });
  if(activeSubjectKey)renderSubjectDetail();

  const courseDefs=[
    {course:ECO2210,name:'ECO 2210',detail:'Principles of Macroeconomics'},
    {course:ENG2211,name:'ENG 2211',detail:'Business Communication'},
    {course:MKT2000,name:'MKT 2000',detail:'Marketing Management'},
    {course:BIO,name:'BIO',detail:'Biology'}
  ];

  const attention=courseDefs.map(c=>{
    const all=A.filter(x=>x.course===c.course);
    const pending=all.filter(x=>!x.done);
    const overdue=pending.filter(x=>new Date(x.due)<now);
    const upcoming=pending.filter(x=>new Date(x.due)>=now).sort((a,b)=>new Date(a.due)-new Date(b.due));
    const within=(days)=>upcoming.filter(x=>(new Date(x.due)-now)/86400000<=days).length;
    const d3=within(3),d7=within(7),d14=within(14);
    const score=overdue.length*5+d3*3+Math.max(0,d7-d3)*2+Math.max(0,d14-d7);
    const next=pending.slice().sort((a,b)=>new Date(a.due)-new Date(b.due))[0]||null;
    let label='On track',cls='attention-good';
    if(score>=10){label='Immediate attention';cls='attention-critical'}
    else if(score>=5){label='High attention';cls='attention-high'}
    else if(score>=2){label='Watch closely';cls='attention-watch'}
    else if(!pending.length&&all.length){label='All caught up';cls='attention-good'}
    else if(!all.length){label='No assignments yet';cls='attention-good'}
    return {...c,all,pending,overdue,score,next,label,cls};
  }).sort((a,b)=>b.score-a.score||b.overdue.length-a.overdue.length||a.name.localeCompare(b.name));

  $('attentionList').innerHTML=attention.map(c=>{
    const nextText=c.next
      ?((new Date(c.next.due)<now?'Oldest pending: ':'Next due: ')+new Date(c.next.due).toLocaleDateString(undefined,{month:'short',day:'numeric'}))
      :'No pending assignments';
    return '<div class="attention-card"><div class="attention-top"><div><h3>'+esc(c.name)+'</h3><div class="small">'+esc(c.detail)+'</div></div><span class="attention-pill '+c.cls+'">'+c.label+'</span></div>'+
      '<div class="report-meta"><span>'+c.overdue.length+' overdue</span><span>'+c.pending.length+' pending</span><span>'+esc(nextText)+'</span></div></div>';
  }).join('');

  $('glist').innerHTML=G.length?G.map(x=>{
    const q=Math.min(100,Math.round(Number(x.done||0)/Number(x.target||1)*100));
    return '<div class="item"><div class="between"><h3>'+esc(x.title)+'</h3><b>'+q+'%</b></div><div class="progress"><span style="width:'+q+'%"></span></div><div class="between" style="margin-top:9px"><span class="small">'+fmt(Number(x.done||0))+' / '+fmt(Number(x.target||0))+'</span><span><button onclick="gm(\''+x.id+'\',-30)">−30m</button> <button onclick="gm(\''+x.id+'\',30)">+30m</button> <button class="icon edit" onclick="editG(\''+x.id+'\')">✎</button> <button class="icon danger" onclick="delG(\''+x.id+'\')">⌫</button></span></div></div>'
  }).join(''):'<div class="empty-state">No study goals yet.</div>';
  const upcomingStudyTasks=T
    .filter(x=>!x.done&&x.scheduled_at&&!sameDay(new Date(x.scheduled_at),now)&&new Date(x.scheduled_at)>now)
    .sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at));
  $('upcomingTasks').innerHTML=upcomingStudyTasks.length
    ?upcomingStudyTasks.map(taskRow).join('')
    :'<div class="empty-state">No future study sessions scheduled.</div>';

  const doneTasks=T.filter(x=>x.done).length;
  const assignmentPct=A.length?Math.round(completed.length/A.length*100):0;
  $('rtasks').textContent=doneTasks+' / '+T.length;
  $('rassign').textContent=completed.length+' / '+A.length;
  $('rcompletion').textContent=assignmentPct+'%';
  $('roverdue').textContent=past.length;
  $('rbar').style.width=assignmentPct+'%';
  $('rtext').textContent=completed.length+' of '+A.length+' assignments completed • '+past.length+' overdue.';

  $('reportSubjects').innerHTML=courseDefs.map(c=>{
    const items=A.filter(x=>x.course===c.course);
    const done=items.filter(x=>x.done).length;
    const overdue=items.filter(x=>!x.done&&new Date(x.due)<now).length;
    const pending=items.filter(x=>!x.done).length;
    const pct=items.length?Math.round(done/items.length*100):0;
    return '<div class="report-course"><div class="between"><div><h3>'+esc(c.name)+'</h3><div class="small">'+esc(c.detail)+'</div></div><b>'+pct+'%</b></div>'+
      '<div class="progress" style="margin-top:9px"><span style="width:'+pct+'%"></span></div>'+
      '<div class="report-meta"><span>'+done+' completed</span><span>'+pending+' pending</span><span>'+overdue+' overdue</span></div></div>';
  }).join('');
}
async function toggleA(id){const x=A.find(v=>v.id===id);if(x)await mutate('app_set_assignment_done',{p_id:id,p_done:!x.done},{action:!x.done?'assignment_completed':'assignment_reopened',entityType:'assignment',entityId:id,summary:x.title})}
async function delA(id){const x=A.find(v=>v.id===id);if(confirm('Delete this assignment for everyone?'))await mutate('app_delete_assignment',{p_id:id},{action:'assignment_deleted',entityType:'assignment',entityId:id,summary:x?x.title:'Assignment'})}
async function editA(id){const x=A.find(v=>v.id===id);if(!x)return;const title=prompt('Assignment title',x.title);if(title===null||!title.trim())return;const course=prompt('Course',x.course);if(course===null||!course.trim())return;const due=prompt('Due date and time',toInput(x.due));if(due===null||!due.trim())return;const note=prompt('Optional note',x.note||'');if(note===null)return;const parsed=new Date(due);if(isNaN(parsed)){alert('Please enter a valid date/time.');return}await mutate('app_update_assignment',{p_id:id,p_title:title.trim(),p_course:course.trim(),p_due:parsed.toISOString(),p_note:note},{action:'assignment_updated',entityType:'assignment',entityId:id,summary:title.trim()})}
async function toggleT(id){const x=T.find(v=>v.id===id);if(x)await mutate('app_set_task_done',{p_id:id,p_done:!x.done},{action:!x.done?'task_completed':'task_reopened',entityType:'task',entityId:id,summary:x.title})}
async function delT(id){const x=T.find(v=>v.id===id);if(confirm('Delete this study task for everyone?'))await mutate('app_delete_task',{p_id:id},{action:'task_deleted',entityType:'task',entityId:id,summary:x?x.title:'Study task'})}
async function editT(id){
  const x=T.find(v=>v.id===id);if(!x)return;
  const title=prompt('Study task',x.title);if(title===null||!title.trim())return;
  const course=prompt('Course',x.course);if(course===null||!course.trim())return;
  const minutes=Number(prompt('Minutes',x.minutes));if(!minutes||minutes<1)return;
  const scheduled=prompt('Study date and time',x.scheduled_at?toInput(x.scheduled_at):toInput(new Date()));
  if(scheduled===null||!scheduled.trim())return;
  const parsed=new Date(scheduled);if(isNaN(parsed)){alert('Please enter a valid date/time.');return}
  await mutate('app_update_task_v2',{p_id:id,p_title:title.trim(),p_course:course.trim(),p_minutes:minutes,p_scheduled_at:parsed.toISOString()},{action:'task_updated',entityType:'task',entityId:id,summary:title.trim()})
}
async function gm(id,n){const x=G.find(v=>v.id===id);await mutate('app_adjust_goal',{p_id:id,p_delta_minutes:n},{action:'goal_progress_changed',entityType:'goal',entityId:id,summary:(x?x.title:'Goal')+' ('+(n>=0?'+':'')+n+' min)'})}
async function delG(id){const x=G.find(v=>v.id===id);if(confirm('Delete this goal for everyone?'))await mutate('app_delete_goal',{p_id:id},{action:'goal_deleted',entityType:'goal',entityId:id,summary:x?x.title:'Goal'})}
async function editG(id){const x=G.find(v=>v.id===id);if(!x)return;const title=prompt('Goal name',x.title);if(title===null||!title.trim())return;const hours=Number(prompt('Target hours',Math.max(1,Math.round(Number(x.target||60)/60))));if(!hours||hours<1)return;await mutate('app_update_goal',{p_id:id,p_title:title.trim(),p_target_minutes:hours*60},{action:'goal_updated',entityType:'goal',entityId:id,summary:title.trim()})}
function openForm(k){
  $('dtitle').textContent=k==='assignment'?'Add assignment':k==='task'?'Add study task':'Add goal';
  $('fa').hidden=k!=='assignment';$('ft').hidden=k!=='task';$('fg').hidden=k!=='goal';
  if(k==='task'&&!$('ts').value){
    const d=new Date();d.setSeconds(0,0);d.setMinutes(0);d.setHours(d.getHours()+1);
    $('ts').value=toInput(d)
  }
  $('dlg').showModal()
}
async function saveA(){if(!$('at').value.trim()||!$('ad').value)return;await mutate('app_add_assignment',{p_title:$('at').value.trim(),p_course:$('ac').value,p_due:new Date($('ad').value).toISOString(),p_note:$('anote').value.trim()},{action:'assignment_added',entityType:'assignment',summary:$('at').value.trim()});$('at').value='';$('ad').value='';$('anote').value='';$('dlg').close()}
async function saveT(){
  if(!$('tt').value.trim()||!$('ts').value)return;
  const scheduled=new Date($('ts').value);if(isNaN(scheduled))return;
  await mutate('app_add_task_v2',{p_title:$('tt').value.trim(),p_course:$('tc').value,p_minutes:Number($('tm').value)||30,p_scheduled_at:scheduled.toISOString()},{action:'task_added',entityType:'task',summary:$('tt').value.trim()});
  $('tt').value='';$('ts').value='';$('dlg').close()
}
async function saveG(){if(!$('gt').value.trim())return;await mutate('app_add_goal',{p_title:$('gt').value.trim(),p_target_minutes:(Number($('gh').value)||5)*60},{action:'goal_added',entityType:'goal',summary:$('gt').value.trim()});$('gt').value='';$('dlg').close()}
function changeInvite(){localStorage.removeItem(INVITE_KEY);inviteCode='';joined=false;$('inviteInput').value='';$('inviteGate').hidden=false;$('inviteError').textContent='';setSync('Invite code required',false)}
function openAdmin(){
  const dlg=$('adminDlg');
  const saved=sessionStorage.getItem(ADMIN_SESSION_KEY)||'';
  $('adminCode').value=saved;
  $('adminError').textContent='';
  dlg.showModal();
  if(saved)loadAdmin()
}
async function loadAdmin(){
  const code=$('adminCode').value.trim().toUpperCase();
  if(!code){$('adminError').textContent='Enter the admin code.';return}
  $('adminError').textContent='Loading activity…';
  try{
    const data=await rpc('app_admin_dashboard',{p_admin_code:code,p_limit:120});
    sessionStorage.setItem(ADMIN_SESSION_KEY,code);
    $('adminError').textContent='';
    $('adminContent').hidden=false;
    const s=data.summary||{};
    $('adminStats').innerHTML=
      '<div class="stat"><span class="small">Unique devices</span><b>'+Number(s.unique_devices||0)+'</b></div>'+
      '<div class="stat"><span class="small">Visit sessions</span><b>'+Number(s.total_sessions||0)+'</b></div>'+
      '<div class="stat"><span class="small">Active now</span><b>'+Number(s.active_devices||0)+'</b></div>'+
      '<div class="stat"><span class="small">Tracked changes</span><b>'+Number(s.total_actions||0)+'</b></div>';
    $('adminSessions').innerHTML=(data.sessions||[]).length?(data.sessions||[]).map(v=>
      '<div class="admin-row"><div><b>'+esc(deviceLabel(v.device_id))+'</b><div class="small">'+esc(browserLabel(v.user_agent))+' • '+esc(v.masked_ip||'IP unavailable')+'</div></div>'+
      '<div class="admin-right"><b>'+esc(fmtDuration(v.duration_seconds))+'</b><div class="small">Last '+new Date(v.last_seen).toLocaleString([],{dateStyle:'short',timeStyle:'short'})+'</div></div></div>'
    ).join(''):'<div class="small">No visitor sessions have been logged yet.</div>';
    $('adminActivity').innerHTML=(data.activity||[]).length?(data.activity||[]).map(v=>
      '<div class="admin-row"><div><b>'+esc(String(v.action_type||'').replaceAll('_',' '))+'</b><div class="small">'+esc(v.summary||v.entity_type||'Activity')+'</div><div class="small">'+esc(deviceLabel(v.device_id))+' • '+esc(v.masked_ip||'IP unavailable')+'</div></div>'+
      '<div class="admin-right"><div class="small">'+new Date(v.occurred_at).toLocaleString([],{dateStyle:'short',timeStyle:'short'})+'</div></div></div>'
    ).join(''):'<div class="small">No changes have been logged yet.</div>';
  }catch(e){
    $('adminContent').hidden=true;
    $('adminError').textContent=e.message&&/admin code/i.test(e.message)?'Incorrect admin code.':'Could not load admin activity.'
  }
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.remove('activeTab'));
  b.classList.add('activeTab');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  $(b.dataset.v).classList.add('active');
  if(b.dataset.v!=='assignments'&&activeSubjectKey)closeSubject();
  $('fab').hidden=b.dataset.v==='reports';
});
$('fab').onclick=()=>{
  if($('assignments').classList.contains('active'))openForm('assignment');
  else if($('goals').classList.contains('active'))openForm('goal');
  else openForm('task');
};
$('inviteButton').onclick=()=>joinWithCode($('inviteInput').value);
$('inviteInput').addEventListener('keydown',e=>{if(e.key==='Enter')joinWithCode($('inviteInput').value)});
loadCached();render();localStorage.removeItem('jk.shared.profile.name.v1');if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
(async()=>{if(inviteCode){$('inviteInput').value=inviteCode;const ok=await joinWithCode(inviteCode);if(!ok)$('inviteGate').hidden=false}else{$('inviteGate').hidden=false;setSync('Invite code required',false)}})();
setInterval(()=>{if(joined&&!document.hidden)loadSharedState(true)},3000);
setInterval(()=>{if(joined&&!document.hidden)logVisit('heartbeat')},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&joined){loadSharedState(false);logVisit('heartbeat')}});