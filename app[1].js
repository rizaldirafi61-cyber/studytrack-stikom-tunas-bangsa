
const { createClient } = window.supabase;
const sb = supabaseClient;

const $ = (s)=>document.querySelector(s);
const $$ = (s)=>[...document.querySelectorAll(s)];
const state = { profile:null, courses:[], schedules:[], tasks:[], grades:[], logs:[], settings:null };

function toast(msg){ const el=$(".toast"); el.textContent=msg; el.classList.remove("hidden"); clearTimeout(window._toast); window._toast=setTimeout(()=>el.classList.add("hidden"),2800); }
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function page(name){
  $$(".page").forEach(x=>x.classList.toggle("active",x.dataset.page===name));
  $$(".nav button,.mobile-nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===name));
  const titles={dashboard:"Dashboard",schedule:"Jadwal Kuliah",tasks:"Tugas & Deadline",grades:"Nilai & IPK",motivation:"Motivasi",profile:"Profil & Pengaturan"};
  $("#pageTitle").textContent=titles[name]||"StudyTrack";
  if(name==="dashboard") renderDashboard();
  if(name==="schedule") renderSchedule();
  if(name==="tasks") renderTasks();
  if(name==="grades") renderGrades();
  if(name==="motivation") renderMotivation();
  if(name==="profile") renderProfile();
}
function goLogin(){location.href="login.html"}

async function load(){
  const {data:{user}}=await sb.auth.getUser();
  if(!user){goLogin();return}
  const {data:p}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
  state.profile=p || {id:user.id,full_name:user.user_metadata?.full_name||"Mahasiswa",email:user.email,prodi:"TI",semester:1,target_ipk:4,cumlaude_threshold:3.51};
  const [c,s,t,g,l,set] = await Promise.all([
    sb.from("courses").select("*").eq("user_id",user.id).order("semester").order("name"),
    sb.from("schedules").select("*,courses(name)").eq("user_id",user.id).order("day_order").order("start_time"),
    sb.from("assignments").select("*,courses(name)").eq("user_id",user.id).order("deadline"),
    sb.from("grades").select("*,courses(name)").eq("user_id",user.id).order("semester").order("created_at"),
    sb.from("study_logs").select("*").eq("user_id",user.id).order("study_date"),
    sb.from("academic_settings").select("*").eq("user_id",user.id).maybeSingle()
  ]);
  state.courses=c.data||[];state.schedules=s.data||[];state.tasks=t.data||[];state.grades=g.data||[];state.logs=l.data||[];state.settings=set.data||null;
  $("#userName").textContent=state.profile.full_name||"Mahasiswa";
  $("#userAvatar").textContent=(state.profile.full_name||"M").trim().charAt(0).toUpperCase();
  page("dashboard");
}
function calcGPA(rows=state.grades){
  let pts=0,sk=0;rows.forEach(r=>{if(r.grade_point!=null&&r.sks){pts+=Number(r.grade_point)*Number(r.sks);sk+=Number(r.sks)}});return sk?pts/sk:0;
}
function currentGrades(){return state.grades.filter(x=>Number(x.semester)===Number(state.profile.semester))}
function renderDashboard(){
  const cur=calcGPA(currentGrades()), cum=calcGPA(state.grades);
  $("#currentGpa").textContent=cur?cur.toFixed(2):"—";$("#cumGpa").textContent=cum?cum.toFixed(2):"—";
  $("#semesterLabel").textContent=`Semester ${state.profile.semester} • ${state.profile.prodi}`;
  const target=Number(state.profile.target_ipk||4), pct=Math.min(100,(cur/target)*100);
  $("#gpaProgress").style.width=(isFinite(pct)?pct:0)+"%";$("#gpaPercent").textContent=`${Math.round(isFinite(pct)?pct:0)}% menuju ${target.toFixed(2)}`;
  const c=Number(state.profile.cumlaude_threshold||3.51);$("#cumText").textContent=cum?`${cum.toFixed(2)} / ${c.toFixed(2)}`:`Target ${c.toFixed(2)}`;
  $("#cumProgress").style.width=Math.min(100,(cum/c)*100)+"%";
  const urgent=state.tasks.filter(t=>t.status!=="done").slice(0,4);
  $("#urgentTasks").innerHTML=urgent.length?urgent.map(t=>`<div class="kpi-row" style="padding:10px 0;border-bottom:1px solid var(--line)"><div><b>${esc(t.title)}</b><div class="muted">${esc(t.courses?.name||"Tanpa mata kuliah")}</div></div><span class="badge ${new Date(t.deadline)-Date.now()<172800000?'red':'green'}">${new Date(t.deadline).toLocaleDateString("id-ID",{day:"2-digit",month:"short"})}</span></div>`).join(""):`<div class="empty">Tidak ada tugas mendesak 🎉</div>`;
}
function renderSchedule(){
  const days=["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  $("#scheduleTable").innerHTML=state.schedules.length?state.schedules.map(s=>`<tr><td>${days[s.day_order-1]||s.day_order}</td><td><b>${esc(s.courses?.name||s.course_name||"—")}</b></td><td>${esc(s.lecturer||"—")}</td><td>${esc(s.room||"—")}</td><td>${s.start_time||""}–${s.end_time||""}</td><td>${s.sks||0}</td><td><button class="btn ghost" onclick="attendance('${s.id}')">Hadir</button></td></tr>`).join(""):`<tr><td colspan="7" class="empty">Belum ada jadwal. Tambahkan melalui form di bawah.</td></tr>`;
  $("#courseOptions").innerHTML=state.courses.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
}
async function attendance(id){toast("Kehadiran dicatat untuk sesi ini.");}
async function addSchedule(e){
  e.preventDefault();const f=new FormData(e.target);const uid=state.profile.id;
  const {error}=await sb.from("schedules").insert({user_id:uid,course_id:f.get("course_id"),day_order:Number(f.get("day_order")),lecturer:f.get("lecturer"),room:f.get("room"),start_time:f.get("start_time"),end_time:f.get("end_time"),sks:Number(f.get("sks")||0)});
  if(error)toast(error.message);else{e.target.reset();toast("Jadwal ditambahkan");await load()}
}
function renderTasks(){
  $("#taskTable").innerHTML=state.tasks.length?state.tasks.map(t=>`<tr><td><b>${esc(t.title)}</b></td><td>${esc(t.courses?.name||"—")}</td><td>${new Date(t.deadline).toLocaleDateString("id-ID")}</td><td><span class="badge ${t.priority==="high"?"red":t.priority==="medium"?"yellow":"green"}">${esc(t.priority)}</span></td><td><button class="btn ghost" onclick="toggleTask('${t.id}',${t.status==="done"})">${t.status==="done"?"Selesai":"Tandai selesai"}</button></td></tr>`).join(""):`<tr><td colspan="5" class="empty">Belum ada tugas.</td></tr>`;
  $("#taskCourseOptions").innerHTML=state.courses.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
}
async function toggleTask(id,done){const {error}=await sb.from("assignments").update({status:done?"todo":"done"}).eq("id",id);if(error)toast(error.message);else load()}
async function addTask(e){e.preventDefault();const f=new FormData(e.target);const {error}=await sb.from("assignments").insert({user_id:state.profile.id,course_id:f.get("course_id")||null,title:f.get("title"),deadline:f.get("deadline"),priority:f.get("priority"),status:"todo"});if(error)toast(error.message);else{e.target.reset();toast("Tugas ditambahkan");load()}}
function renderGrades(){
  const g=calcGPA(state.grades),cur=calcGPA(currentGrades());
  $("#gradeGpa").textContent=g?g.toFixed(2):"—";$("#gradeCurrent").textContent=cur?cur.toFixed(2):"—";
  $("#gradeTable").innerHTML=state.grades.length?state.grades.map(x=>`<tr><td>Sem ${x.semester}</td><td>${esc(x.courses?.name||"—")}</td><td>${x.sks}</td><td>${esc(x.letter||"—")}</td><td>${x.grade_point!=null?Number(x.grade_point).toFixed(2):"—"}</td></tr>`).join(""):`<tr><td colspan="5" class="empty">Belum ada nilai.</td></tr>`;
  $("#gradeCourseOptions").innerHTML=state.courses.map(c=>`<option value="${c.id}">${esc(c.name)} (${c.sks} SKS)</option>`).join("");
  const by=[];for(let s=1;s<=8;s++){const x=calcGPA(state.grades.filter(g=>Number(g.semester)===s));if(x)by.push({s,x})}
  $("#gpaChart").innerHTML=by.length?by.map(o=>`<div class="bar-col"><div class="bar" style="height:${Math.max(5,o.x/4*170)}px"></div><b>${o.x.toFixed(2)}</b><small>Sem ${o.s}</small></div>`).join(""):`<div class="empty" style="width:100%">Grafik akan muncul setelah nilai diinput.</div>`;
}
async function addGrade(e){e.preventDefault();const f=new FormData(e.target);const scale={A:4,"A-":3.7,"B+":3.3,B:3,"B-":2.7,C:2,D:1,E:0};const letter=f.get("letter");const {error}=await sb.from("grades").insert({user_id:state.profile.id,course_id:f.get("course_id"),semester:Number(f.get("semester")),sks:Number(f.get("sks")),letter,grade_point:scale[letter]??Number(f.get("grade_point")||0)});if(error)toast(error.message);else{e.target.reset();toast("Nilai disimpan");load()}}
function renderMotivation(){
  $("#reason").value=state.profile.reason||"";const days=Array.from({length:28},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(27-i));const key=d.toISOString().slice(0,10);return `<button class="daybox ${state.logs.some(x=>x.study_date===key)?"done":""} ${i===27?"today":""}" title="${key}" onclick="toggleStudy('${key}')"></button>`}).join("");$("#streakGrid").innerHTML=days;
  $("#streakCount").textContent=calcStreak();
}
function calcStreak(){let n=0,d=new Date();for(let i=0;i<365;i++){const k=d.toISOString().slice(0,10);if(state.logs.some(x=>x.study_date===k)){n++;d.setDate(d.getDate()-1)}else break}return n}
async function toggleStudy(date){const exists=state.logs.find(x=>x.study_date===date);if(exists)await sb.from("study_logs").delete().eq("id",exists.id);else await sb.from("study_logs").insert({user_id:state.profile.id,study_date:date,minutes:30});load()}
async function saveReason(){const reason=$("#reason").value;const {error}=await sb.from("profiles").update({reason}).eq("id",state.profile.id);if(error)toast(error.message);else{state.profile.reason=reason;toast("Alasan disimpan")}}
function renderProfile(){
  $("#profileName").value=state.profile.full_name||"";$("#profileEmail").value=state.profile.email||"";$("#profileProdi").value=state.profile.prodi||"TI";$("#profileSemester").value=state.profile.semester||1;$("#profileTarget").value=state.profile.target_ipk||4;$("#profileCum").value=state.profile.cumlaude_threshold||3.51;
}
async function saveProfile(e){e.preventDefault();const f=new FormData(e.target);const patch={full_name:f.get("full_name"),prodi:f.get("prodi"),semester:Number(f.get("semester")),target_ipk:Number(f.get("target_ipk")),cumlaude_threshold:Number(f.get("cumlaude_threshold"))};const {error}=await sb.from("profiles").update(patch).eq("id",state.profile.id);if(error)toast(error.message);else{toast("Profil diperbarui");load()}}
async function addCourse(e){e.preventDefault();const f=new FormData(e.target);const {error}=await sb.from("courses").insert({user_id:state.profile.id,name:f.get("name"),code:f.get("code"),sks:Number(f.get("sks")),semester:Number(f.get("semester"))});if(error)toast(error.message);else{e.target.reset();toast("Mata kuliah ditambahkan");load()}}
async function signout(){await sb.auth.signOut();goLogin()}
document.addEventListener("DOMContentLoaded",()=>{ $$(".nav button,.mobile-nav button").forEach(b=>b.onclick=()=>page(b.dataset.page)); $("#scheduleForm").onsubmit=addSchedule;$("#taskForm").onsubmit=addTask;$("#gradeForm").onsubmit=addGrade;$("#profileForm").onsubmit=saveProfile;$("#courseForm").onsubmit=addCourse;$("#saveReason").onclick=saveReason;$("#logout").onclick=signout;load();});
