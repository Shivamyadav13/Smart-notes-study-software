const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let S={notes:[],tasks:[],cards:[],log:{}};
try{S=Object.assign(S,JSON.parse(localStorage.getItem('marginalia')||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem('marginalia',JSON.stringify(S))}catch(e){}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const dkey=d=>{const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const today=()=>dkey(new Date());

/* ---------- tabs ---------- */
$$('nav button').forEach(b=>b.onclick=()=>{
  $$('nav button').forEach(x=>x.classList.toggle('on',x===b));
  $$('section').forEach(s=>s.classList.toggle('on',s.id===b.dataset.t));
  render();
});

/* ---------- smart text helpers ---------- */
const STOP=new Set('the and for are was were been that this with from which can will not but then than also into its their they you has have had does such these those about when what your more most some any all each other very just like only over under between because while where there here would could should may might our out use used using one two'.split(' '));
const words=t=>t.toLowerCase().match(/[a-z]{3,}/g)||[];
const freq=t=>{const f={};words(t).forEach(w=>{if(!STOP.has(w))f[w]=(f[w]||0)+1});return f};
const keywords=(t,n=6)=>{const f=freq(t);return Object.keys(f).sort((a,b)=>f[b]-f[a]).slice(0,n)};
function summary(t,n=3){
  const ss=t.replace(/\n+/g,' ').match(/[^.!?]+[.!?]*/g)||[], f=freq(t);
  return ss.map((s,i)=>({s:s.trim(),i,v:words(s).reduce((a,w)=>a+(f[w]||0),0)/Math.sqrt(words(s).length||1)}))
    .filter(x=>x.s.length>25).sort((a,b)=>b.v-a.v).slice(0,n).sort((a,b)=>a.i-b.i).map(x=>x.s);
}
const DEF=/^[\s*\-\u2022\d.)]*([^:=\u2013\u2014]{2,60}?)\s*(?::|=|\u2013|\u2014| - )\s*(.{3,})$/;

/* ---------- notes ---------- */
let cur=null;
const getNote=()=>S.notes.find(n=>n.id===cur);
function renderNotes(){
  const q=$('#q').value.toLowerCase(), tf=$('#tagF').value, sf=$('#subF').value;
  const subs=[...new Set(S.notes.map(n=>n.sub).filter(Boolean))].sort();
  $('#subF').innerHTML='<option value="">All subjects</option>'+subs.map(t=>`<option ${t===sf?'selected':''}>${esc(t)}</option>`).join('');
  $('#subs').innerHTML=subs.map(t=>`<option value="${esc(t)}">`).join('');
  const tags=[...new Set(S.notes.flatMap(n=>n.tags))].sort();
  $('#tagF').innerHTML='<option value="">All tags</option>'+tags.map(t=>`<option ${t===tf?'selected':''}>${esc(t)}</option>`).join('');
  const list=S.notes.filter(n=>(!q||(n.title+n.body+n.tags.join(' ')).toLowerCase().includes(q))&&(!tf||n.tags.includes(tf))&&(!sf||n.sub===sf))
    .sort((a,b)=>b.upd-a.upd);
  $('#noteList').innerHTML=list.length?list.map(n=>`<div class="item ${n.id===cur?'on':''}" data-id="${n.id}"><b>${esc(n.title||'Untitled')}</b><small>${esc(n.sub||'General')} - ${new Date(n.upd).toLocaleDateString()}</small><div>${n.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></div>`).join(''):'<div class="empty">No notes yet. Select New note to start.</div>';
  $$('#noteList .item').forEach(i=>i.onclick=()=>{cur=i.dataset.id;fillEditor();renderNotes()});
}
function fillEditor(){
  const n=getNote(); $('#editor').style.opacity=n?1:.5;
  $('#nTitle').value=n?n.title:'';$('#nSub').value=n?(n.sub||''):'';$('#nTags').value=n?n.tags.join(', '):'';$('#nBody').value=n?n.body:'';$('#smart').innerHTML='';
}
$('#newNote').onclick=()=>{const n={id:uid(),title:'',sub:'',tags:[],body:'',upd:Date.now()};S.notes.push(n);cur=n.id;save();fillEditor();renderNotes();$('#nTitle').focus()};
['#nTitle','#nSub','#nTags','#nBody'].forEach(id=>$(id).oninput=()=>{
  const n=getNote(); if(!n)return;
  n.title=$('#nTitle').value;n.sub=$('#nSub').value.trim();n.body=$('#nBody').value;
  n.tags=$('#nTags').value.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);n.upd=Date.now();save();renderNotes();
});
$('#q').oninput=$('#tagF').onchange=$('#subF').onchange=renderNotes;
$('#delNote').onclick=()=>{if(getNote()&&confirm('Delete this note?')){S.notes=S.notes.filter(n=>n.id!==cur);cur=null;save();fillEditor();renderNotes()}};
$('#sumBtn').onclick=()=>{
  const n=getNote(); if(!n||n.body.trim().length<40){$('#smart').innerHTML='<div class="smart">Write at least a few sentences, then summarise.</div>';return}
  const k=keywords(n.body), s=summary(n.body);
  $('#smart').innerHTML=`<div class="smart"><b>Key terms</b><p>${k.map(w=>`<span class="tag">${esc(w)}</span>`).join('')}</p><b>Summary</b>${s.map(x=>`<p>${esc(x)}</p>`).join('')}<button class="b" id="addKw">Add key terms as tags</button></div>`;
  $('#addKw').onclick=()=>{n.tags=[...new Set([...n.tags,...k.slice(0,3)])];$('#nTags').value=n.tags.join(', ');save();renderNotes()};
};
$('#cardBtn').onclick=()=>{
  const n=getNote(); if(!n)return; let added=0;
  n.body.split('\n').forEach(l=>{const m=l.match(DEF);if(m){const q=m[1].trim(),a=m[2].trim();
    if(!S.cards.some(c=>c.q.toLowerCase()===q.toLowerCase())){S.cards.push({id:uid(),q,a,due:Date.now(),int:0,ease:2.5,src:n.id});added++}}});
  save();$('#smart').innerHTML=`<div class="smart">${added?`Created ${added} flashcard${added>1?'s':''}.`:'No new cards found. Write lines like <b>Term: definition</b>.'}</div>`;updateDue();
};

/* ---------- planner ---------- */
const daysLeft=t=>t.due?Math.round((new Date(t.due+'T00:00')-new Date(today()+'T00:00'))/864e5):999;
const score=t=>(t.pri||2)*(t.hrs+1)/Math.max(daysLeft(t),.25);
$('#addTask').onclick=()=>{
  const title=$('#tTitle').value.trim(); if(!title){$('#tTitle').focus();return}
  S.tasks.push({id:uid(),title,course:$('#tCourse').value.trim(),due:$('#tDue').value,hrs:+$('#tHrs').value||1,pri:+$('#tPri').value,done:false});
  $('#tTitle').value='';save();renderTasks();
};
function renderTasks(){
  const ts=[...S.tasks].sort((a,b)=>a.done-b.done||score(b)-score(a));
  $('#taskList').innerHTML=ts.length?ts.map(t=>{const d=daysLeft(t);
    const p=t.done?'':d<0?'<span class="pill hot">Overdue</span>':d===0?'<span class="pill hot">Due today</span>':d<=3?`<span class="pill soon">${d} day${d>1?'s':''} left</span>`:d<999?`<span class="pill">${d} days left</span>`:'';
    return `<div class="task ${t.done?'done':''}"><input type="checkbox" data-id="${t.id}" ${t.done?'checked':''} aria-label="Done"><div><b>${esc(t.title)}</b><br><small>${esc(t.course||'No course')} - ${['','Low','Medium','High'][t.pri||2]} priority - ${t.hrs}h${t.due?' - due '+t.due:''}</small></div>${p}<button class="b" data-del="${t.id}" aria-label="Delete task">Delete</button></div>`}).join(''):'<div class="empty">No tasks yet. Add your first deadline above.</div>';
  $$('#taskList input').forEach(c=>c.onchange=()=>{S.tasks.find(t=>t.id===c.dataset.id).done=c.checked;save();renderTasks()});
  $$('#taskList [data-del]').forEach(b=>b.onclick=()=>{S.tasks=S.tasks.filter(t=>t.id!==b.dataset.del);save();renderTasks()});
}

/* ---------- flashcards (spaced repetition) ---------- */
let shown=false;
const dueCards=()=>S.cards.filter(c=>c.due<=Date.now()).sort((a,b)=>a.due-b.due);
function updateDue(){const n=dueCards().length;$('#dueN').textContent=n?`(${n})`:'';$('#sDue').textContent=n;$('#sAll').textContent=S.cards.length}
function renderCards(){
  updateDue(); const c=dueCards()[0];
  if(!c){$('#review').innerHTML=`<div class="panel empty">${S.cards.length?'All caught up. Come back later for the next review.':'No cards yet. Use Make flashcards in a note, or add one below.'}</div>`;return}
  $('#review').innerHTML=`<div class="card"><small>${shown?'Answer':'Question'}</small>${esc(shown?c.a:c.q)}</div><div class="row" style="justify-content:center">${shown?'<button class="b" data-r="0">Again</button><button class="b p" data-r="1">Good</button><button class="b" data-r="2">Easy</button>':'<button class="b p" id="rev">Show answer</button>'}</div>`;
  if(!shown)$('#rev').onclick=()=>{shown=true;renderCards()};
  $$('[data-r]').forEach(b=>b.onclick=()=>{
    const r=+b.dataset.r;
    if(r===0){c.int=0;c.ease=Math.max(1.3,c.ease-.2);c.due=Date.now()+10*60000}
    else{c.int=c.int?Math.round(c.int*c.ease*(r===2?1.3:1)):(r===2?3:1);c.due=Date.now()+c.int*864e5}
    save();shown=false;renderCards();
  });
}
$('#addCard').onclick=()=>{const q=$('#cQ').value.trim(),a=$('#cA').value.trim();if(!q||!a)return;
  S.cards.push({id:uid(),q,a,due:Date.now(),int:0,ease:2.5});$('#cQ').value=$('#cA').value='';save();renderCards()};

/* ---------- focus timer ---------- */
let work=true,left=25*60,tick=null,endAt=0;
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
function paintClock(){$('#clock').textContent=fmt(left);$('#mode').textContent=work?'Focus session':'Break';document.title=(tick?fmt(left)+' - ':'')+'Marginalia'}
$('#go').onclick=()=>{
  if(tick){clearInterval(tick);tick=null;$('#go').textContent='Resume';return}
  endAt=Date.now()+left*1000;$('#go').textContent='Pause';
  tick=setInterval(()=>{
    left=Math.max(0,Math.round((endAt-Date.now())/1000));paintClock();
    if(left===0){clearInterval(tick);tick=null;
      if(work){S.log[today()]=(S.log[today()]||0)+25;save();renderStats()}
      work=!work;left=(work?25:5)*60;$('#go').textContent='Start';paintClock();alert(work?'Break over. Ready to focus?':'Session done. Take a 5 minute break.');}
  },500);
};
$('#reset').onclick=()=>{clearInterval(tick);tick=null;work=true;left=25*60;$('#go').textContent='Start';paintClock()};
function renderStats(){
  const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return{k:dkey(d),l:d.toLocaleDateString(undefined,{weekday:'short'})}});
  const max=Math.max(25,...days.map(d=>S.log[d.k]||0));
  $('#bars').innerHTML=days.map(d=>`<div><span>${S.log[d.k]||0}</span><i style="height:${(S.log[d.k]||0)/max*100}px"></i>${d.l}</div>`).join('');
  $('#sToday').textContent=S.log[today()]||0;$('#sWeek').textContent=days.reduce((a,d)=>a+(S.log[d.k]||0),0);
  let s=0;const d=new Date();if(!S.log[today()])d.setDate(d.getDate()-1);
  while(S.log[dkey(d)]){s++;d.setDate(d.getDate()-1)}$('#sStreak').textContent=s;
}

/* ---------- import / export ---------- */
$('#exportBtn').onclick=()=>{
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(S.notes,null,2)],{type:'application/json'}));
  a.download='marginalia-notes.json';a.click();URL.revokeObjectURL(a.href);
};
$('#importBtn').onclick=()=>$('#importFile').click();
$('#importFile').onchange=e=>{
  const f=e.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{
    const arr=JSON.parse(r.result); if(!Array.isArray(arr))throw 0;
    let n=0;
    arr.forEach(x=>{if(x&&typeof x.body==='string'&&!S.notes.some(o=>o.id===x.id)){
      S.notes.push({id:x.id||uid(),title:String(x.title||''),sub:String(x.sub||''),tags:Array.isArray(x.tags)?x.tags.map(String):[],body:x.body,upd:+x.upd||Date.now()});n++}});
    save();renderNotes();alert('Imported '+n+' note'+(n===1?'':'s')+'.');
  }catch(err){alert('Could not import. Choose a JSON file exported from Marginalia.')}};
  r.readAsText(f);e.target.value='';
};

/* ---------- theme + demo login ---------- */
if(!S.theme)S.theme=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
const applyTheme=()=>{document.documentElement.dataset.theme=S.theme;$('#theme').textContent=S.theme==='dark'?'Light mode':'Dark mode'};
$('#theme').onclick=()=>{S.theme=S.theme==='dark'?'light':'dark';save();applyTheme()};
const showLogin=()=>$('#login').classList.toggle('show',!S.user);
$('#loginBtn').onclick=()=>{S.user=$('#uName').value.trim()||'Student';save();showLogin();render()};
$('#uName').onkeydown=e=>{if(e.key==='Enter')$('#loginBtn').click()};
$('#logout').onclick=()=>{delete S.user;save();showLogin()};

/* ---------- dashboard ---------- */
$$('[data-go]').forEach(b=>b.onclick=()=>$('nav button[data-t='+b.dataset.go+']').click());
function renderHome(){
  const pend=S.tasks.filter(x=>!x.done).sort((a,b)=>score(b)-score(a));
  $('#hello').textContent=S.user?'Hello, '+S.user:'Dashboard';
  $('#hMin').textContent=S.log[today()]||0;$('#hStreak').textContent=$('#sStreak').textContent;
  $('#hDue').textContent=dueCards().length;$('#hTasks').textContent=pend.length;
  $('#hList').innerHTML=pend.length?pend.slice(0,5).map(x=>{const d=daysLeft(x);
    return `<div class="task"><div><b>${esc(x.title)}</b><br><small>${esc(x.course||'No course')} - ${d<0?'overdue':d===999?'no deadline':d===0?'due today':d+' days left'}</small></div></div>`}).join(''):'<div class="empty">Nothing pending. Add a task in the Planner.</div>';
  const done=S.tasks.filter(x=>x.done).length, tp=S.tasks.length?Math.round(done/S.tasks.length*100):0;
  const mast=S.cards.filter(c=>c.int>=7).length, cp=S.cards.length?Math.round(mast/S.cards.length*100):0;
  const wk=+$('#sWeek').textContent, wp=Math.min(100,Math.round(wk/150*100));
  const m=(l,p,t)=>`<div>${l} <small>${t}</small></div><div class="meter"><i style="width:${p}%"></i></div>`;
  $('#hProg').innerHTML=m('Tasks completed',tp,`${done} of ${S.tasks.length}`)+m('Cards mastered (7+ day interval)',cp,`${mast} of ${S.cards.length}`)+m('Weekly goal (150 min)',wp,`${wk} min`)+`<small>${S.notes.length} notes across ${new Set(S.notes.map(n=>n.sub).filter(Boolean)).size} subjects</small>`;
}

function render(){renderNotes();renderTasks();renderCards();renderStats();renderHome();paintClock()}
applyTheme();showLogin();
if(S.notes.length)cur=S.notes[0].id;
fillEditor();render();
