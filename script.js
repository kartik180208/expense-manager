const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+n.toFixed(2);
const today=()=>{const t=new Date();t.setMinutes(t.getMinutes()-t.getTimezoneOffset());return t.toISOString().slice(0,10)};

/* ---------- Data structures (hand-written) ---------- */
class N{constructor(d){this.d=d;this.next=null}}
class LinkedList{constructor(){this.head=null}
  add(d){const n=new N(d);if(!this.head)this.head=n;else{let t=this.head;while(t.next)t=t.next;t.next=n}}
  remove(id){let c=this.head,p=null;while(c&&c.d.id!==id){p=c;c=c.next}if(!c)return null;if(p)p.next=c.next;else this.head=c.next;return c.d}
  toArray(){const a=[];for(let c=this.head;c;c=c.next)a.push(c.d);return a}}
class Stack{constructor(){this.top=null;this.n=0}
  push(d){const x=new N(d);x.next=this.top;this.top=x;this.n++}
  pop(){if(!this.top)return null;const x=this.top;this.top=x.next;this.n--;return x.d}}
class Queue{constructor(){this.f=null;this.r=null}
  enq(d){const x=new N(d);if(this.r)this.r.next=x;else this.f=x;this.r=x}
  deq(){if(!this.f)return null;const x=this.f;this.f=x.next;if(!this.f)this.r=null;return x.d}
  toArray(){const a=[];for(let c=this.f;c;c=c.next)a.push(c.d);return a}}
class HashTable{constructor(s=11){this.s=s;this.b=new Array(s).fill(null)}
  h(k){let x=0;for(const ch of k.toLowerCase())x=(x*31+ch.charCodeAt(0))%this.s;return x}
  add(k,v){const i=this.h(k);for(let c=this.b[i];c;c=c.next)if(c.d.k.toLowerCase()===k.toLowerCase()){c.d.v+=v;c.d.c++;return}
    const n=new N({k,v,c:1});n.next=this.b[i];this.b[i]=n}
  entries(){const a=[];this.b.forEach(c=>{for(;c;c=c.next)a.push(c.d)});return a}}

/* ---------- State ---------- */
const list=new LinkedList(),undo=new Stack(),bills=new Queue();
let budget=0,nid=1;const KEY='student_expense_manager_v1';
const COL=['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#84cc16','#f97316','#64748b'];
function save(){try{localStorage.setItem(KEY,JSON.stringify({e:list.toArray(),b:bills.toArray(),budget,nid}))}catch(e){}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){s.e.forEach(x=>list.add(x));s.b.forEach(x=>bills.enq(x));budget=s.budget||0;nid=s.nid||1}}catch(e){}}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2400)}
const monthSpent=ym=>list.toArray().filter(e=>e.date.startsWith(ym)).reduce((s,e)=>s+e.amount,0);

/* ---------- Render ---------- */
function render(){
  const arr=list.toArray(),total=arr.reduce((s,e)=>s+e.amount,0),q=$('#q').value.toLowerCase(),sb=$('#sort').value;
  const v=arr.filter(e=>(e.cat+' '+e.desc).toLowerCase().includes(q));
  if(sb==='amt')v.sort((a,b)=>b.amount-a.amount);else if(sb==='date')v.sort((a,b)=>a.date.localeCompare(b.date));
  $('#rows').innerHTML=v.length?v.map(e=>`<tr><td>${e.id}</td><td>${e.date}</td><td><span class="chip">${esc(e.cat)}</span></td><td>${esc(e.desc)}</td><td class="r">${money(e.amount)}</td><td><button class="x" onclick="del(${e.id})" aria-label="Delete expense ${e.id}">✕</button></td></tr>`).join(''):'<tr><td colspan="6" class="mut">No expenses to show.</td></tr>';
  $('#total').textContent=money(total);
  $('#undoBtn').disabled=!undo.top;$('#undoBtn').textContent='↶ Undo ('+undo.n+')';
  const h=new HashTable();arr.forEach(e=>h.add(e.cat,e.amount));
  const en=h.entries().sort((a,b)=>b.v-a.v);
  $('#sTotal').textContent=money(total);$('#sCount').textContent=arr.length;$('#sTop').textContent=en.length?en[0].k:'—';$('#sMonth').textContent=money(monthSpent(today().slice(0,7)));
  let acc=0;const stops=en.map((x,i)=>{const s=acc;acc+=x.v/total*100;return COL[i%10]+' '+s+'% '+acc+'%'});
  $('#pie').style.background=en.length?`conic-gradient(${stops.join(',')})`:'var(--bd)';
  $('#legend').innerHTML=en.map((x,i)=>`<li><i style="background:${COL[i%10]}"></i>${esc(x.k)}<span>${money(x.v)} · ${(x.v/total*100).toFixed(1)}%</span></li>`).join('')||'<li class="mut">Add expenses to see the chart.</li>';
  $('#bills').innerHTML=bills.toArray().map((b,i)=>`<li>${i?'':'<b>Next:</b>'} ${esc(b.title)}<span>${b.due} · ${money(b.amount)}</span></li>`).join('')||'<li class="mut">No pending bills.</li>';
  const ym=today().slice(0,7),m=monthSpent(ym);
  if(budget>0){const p=Math.min(100,m/budget*100);$('#barFill').style.width=p+'%';$('#barFill').style.background=m>budget?'var(--red)':'var(--ok)';
    $('#budTxt').textContent=m>budget?`Over budget by ${money(m-budget)} (spent ${money(m)} of ${money(budget)})`:`Spent ${money(m)} of ${money(budget)} · ${money(budget-m)} left`}
  else{$('#barFill').style.width='0';$('#budTxt').textContent='No budget set. This month’s spending: '+money(m)}
  save();
}

/* ---------- Actions ---------- */
function warn(ym){if(budget>0&&monthSpent(ym)>budget)toast('Warning: '+ym+' spending is over budget')}
function del(id){const d=list.remove(id);if(d){undo.push({t:'del',d});render();toast('Deleted #'+id+' (undo available)')}}
$('#f').onsubmit=e=>{e.preventDefault();
  const d={id:nid++,date:$('#date').value,cat:$('#cat').value.trim(),desc:$('#desc').value.trim(),amount:parseFloat($('#amt').value)};
  if(!d.cat||!d.desc||!(d.amount>0))return;
  list.add(d);undo.push({t:'add',d});e.target.reset();$('#date').value=today();render();toast('Expense #'+d.id+' added');warn(d.date.slice(0,7))};
$('#undoBtn').onclick=()=>{const a=undo.pop();if(!a)return;if(a.t==='add')list.remove(a.d.id);else list.add(a.d);render();toast('Last action undone')};
$('#setBud').onclick=()=>{const v=parseFloat($('#bud').value);if(v>0){budget=v;$('#bud').value='';render();toast('Budget set')}};
$('#addBill').onclick=()=>{const t=$('#bt').value.trim(),d=$('#bd').value,a=parseFloat($('#ba').value);
  if(!t||!d||!(a>0)){toast('Fill title, due date and amount');return}
  bills.enq({title:t,due:d,amount:a});['#bt','#bd','#ba'].forEach(s=>$(s).value='');render()};
$('#payBill').onclick=()=>{const b=bills.deq();if(!b){toast('No pending bills');return}
  const d={id:nid++,date:b.due,cat:'Bills',desc:b.title,amount:b.amount};list.add(d);undo.push({t:'add',d});render();toast('Paid “'+b.title+'”');warn(d.date.slice(0,7))};
$('#q').oninput=render;$('#sort').onchange=render;
$('#date').value=today();$('#bd').value=today();
$('#demo').onclick=()=>{[['Food','Canteen lunch',120,0],['Books','DS textbook',450,2],['Travel','Metro card recharge',300,3],['Food','Cafe with friends',260,4],['Stationery','Notebooks and pens',180,5],['Bills','Mobile recharge',239,6],['Entertainment','Movie ticket',250,8]].forEach(([c,d,a,ago])=>{const t=new Date();t.setDate(t.getDate()-ago);t.setMinutes(t.getMinutes()-t.getTimezoneOffset());list.add({id:nid++,date:t.toISOString().slice(0,10),cat:c,desc:d,amount:a})});render();toast('Sample data loaded')};
load();render();
