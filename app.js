const API = 'https://kajubhdujjswveuqxoyl.supabase.co/rest/v1/';
const KEY = 'sb_publishable_6goYtNwhdGjI3ilyRisvCw_Hb4oQu5_';
const phases = ['Arranque','Fábrica de fábrica','Vermelha + verde','Azul e petróleo','Corrida do silo','Primeiro foguete','Space Age ativo'];
// Official item icons from the Factorio wiki (© Wube Software)
const icons = {"L01":"Radar","L02":"Steam_engine","L03":"Electric_mining_drill","L04":"Stone_furnace","L05":"Coal","L06":"Steel_plate","L07":"Assembling_machine_1","L08":"Iron_chest","L09":"Iron_chest","L10":"Splitter","L11":"Assembling_machine_2","L12":"Electric_mining_drill","L13":"Solar_panel","L14":"Gun_turret","L15":"Rocket_silo","L16":"Space_platform_foundation","P00":"Iron_chest","P01":"Automation_science_pack","P02":"Transport_belt","P03":"Electronic_circuit","P04":"Logistic_science_pack","P05":"Iron_chest","P06":"Lab","P07":"Advanced_circuit","P08":"Chemical_science_pack","P09":"Lab","P10":"Processing_unit","P11":"Lab","P12":"Rocket_silo","P13":"Lab","P14":"Space_platform_starter_pack","P15":"Space_science_pack","P16":"Nauvis","G01":"Boiler","G02":"Engine_unit","G03":"Pumpjack","G04":"Petroleum_gas","G05":"Plastic_bar","G06":"Sulfur","G07":"Sulfuric_acid","G08":"Electric_engine_unit","G09":"Concrete","G10":"Low_density_structure","G11":"Rocket_fuel","G12":"Rocket_silo","G13":"Rocket_part","G14":"Space_platform_starter_pack","G15":"Space_platform_hub","G16":"Asteroid_collector","G17":"Space_science_pack","G18":"Thruster","M01":"Transport_belt","M02":"Underground_belt","M03":"Splitter","M04":"Inserter","M05":"Long-handed_inserter","M06":"Fast_inserter","M07":"Assembling_machine_1","M08":"Small_electric_pole","M09":"Medium_electric_pole","M10":"Electric_mining_drill","M11":"Pipe","M12":"Pipe_to_ground"};
const icon = id => icons[id] ? `<img class="icon" src="https://wiki.factorio.com/images/${icons[id]}.png" alt="" loading="lazy" width="32" height="32">` : "";
// Reassignments over the Supabase rows (DB only stores done state via RPC).
const owner = {P01:"Paulo",L03:"Paulo",P02:"Lucas",P00:"Lucas",L07:"Lucas",L08:"Lucas",L09:"Lucas",P03:"Paulo",P04:"Paulo",P06:"Paulo",L11:"Lucas",P05:"Lucas",P08:"Paulo",P09:"Paulo",P11:"Paulo",P12:"Paulo",L15:"Lucas",P13:"Paulo",L16:"Lucas",P15:"Paulo"};
const details = {L04:"Organize fornalhas e insertores. Receba minério e carvão das minas de Paulo.",P02:"Primeira célula do mall: esteiras amarelas, insertores e postes em baús limitados, longe das linhas de ciência.",P00:"Baús lado a lado com poucos slots: esteiras, insertores, postes, mineradoras. Todo mundo pega aqui."};
const fix = t => Object.assign(t, {player: owner[t.id] || t.player, detail: (details[t.id] || t.detail).replace(/^(Lucas|Paulo|Gabriel)( coordena)?: /, "")});
const people = [
  {name:'Lucas',nick:'Lucaslbc',color:'var(--green)',role:'Fábrica de fábrica, aço e circuitos azuis'},
  {name:'Paulo',nick:'Ragnax',color:'var(--red)',role:'Mineração, ciência e pesquisa'},
  {name:'Gabriel',nick:'gabrielabc',color:'var(--yellow)',role:'Petróleo, foguete e espaço'}
];
let tasks = [], phase = 1, busy = false, loading = false, loaded = false, generation = 0;
const dirty = new Map();
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isMall = task => task.id.startsWith('M');
function status(message, error = false) { $('save-status').textContent = message; $('save-status').classList.toggle('error',error); }
function controls() {
  $('save').disabled = busy || !loaded || dirty.size === 0;
  $('save').textContent = busy ? 'Salvando…' : dirty.size ? `Salvar alterações (${dirty.size})` : 'Tudo salvo';
  $('refresh').disabled = busy || loading;
  document.querySelectorAll('input[type=checkbox]').forEach(el => el.disabled = busy);
}
function taskHTML(task, mall = false) {
  const done = dirty.has(task.id) ? dirty.get(task.id) : task.done;
  return `<label class="task ${done?'done':''} ${dirty.has(task.id)?'dirty':''}" for="task-${escapeHTML(task.id)}"><input id="task-${escapeHTML(task.id)}" data-id="${escapeHTML(task.id)}" type="checkbox" ${done?'checked':''}>${icon(task.id)}<span class="task-text"><span class="task-title">${escapeHTML(task.title)}</span><span class="task-detail">${escapeHTML(task.detail)}</span>${mall?'':`<span class="priority ${escapeHTML(task.priority)}">${task.priority === 'critica'?'CRÍTICA':task.priority === 'alta'?'ALTA':'NORMAL'}</span>`}</span></label>`;
}
function progress() {
  const done = tasks.filter(t => dirty.has(t.id)?dirty.get(t.id):t.done).length;
  $('total').textContent = `${tasks.length?Math.round(done/tasks.length*100):0}%`;
  $('count').textContent = `${done} de ${tasks.length} tarefas concluídas`;
  $('progress').value = tasks.length ? done/tasks.length*100 : 0;
  document.querySelectorAll('.player').forEach((el,i)=>{
    const list=tasks.filter(t=>t.player===people[i].name&&t.phase===phase&&!isMall(t));
    el.querySelector('.player-count').textContent=`${list.filter(t=>dirty.has(t.id)?dirty.get(t.id):t.done).length} / ${list.length}`;
  });
}
function render() {
  $('phases').innerHTML = phases.map((p,i) => `<button type="button" data-phase="${i+1}" aria-pressed="${phase===i+1}"><span>FASE 0${i+1}</span>${p}</button>`).join('');
  $('phase-number').textContent = `FASE 0${phase} / 07`;
  $('phase-title').textContent = phases[phase-1];
  $('players').innerHTML = people.map(p => {
    const list = tasks.filter(t => t.player===p.name && t.phase===phase && !isMall(t));
    const completed = list.filter(t => dirty.has(t.id)?dirty.get(t.id):t.done).length;
    return `<article class="player" style="--player:${p.color}"><div class="player-head"><span class="avatar">${p.name[0]}</span><div><h3>${p.nick}</h3><small>${p.name}</small></div><span class="player-count">${completed} / ${list.length}</span></div><p class="role">${p.role}</p>${list.length?list.map(t=>taskHTML(t)).join(''):'<p class="empty">Apoie o gargalo da equipe nesta fase.</p>'}</article>`;
  }).join('');
  $('mall-items').innerHTML = tasks.filter(isMall).map(t=>taskHTML(t,true)).join('');
  progress(); controls();
}
async function request(path, options = {}) {
  const response = await fetch(API+path,{...options,cache:'no-store',headers:{apikey:KEY,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error(`Falha de conexão (${response.status})`);
  return response.json();
}
async function refresh() {
  if (busy || loading) return;
  loading = true; const currentGeneration = generation; controls();
  try {
    const rows = await request('factorio_tasks?select=*&order=sort_order.asc');
    if (!Array.isArray(rows) || !rows.length) throw new Error('Nenhuma tarefa disponível');
    if (currentGeneration !== generation) return;
    tasks = rows.map(fix); loaded = true;
    if (!document.querySelector('[data-phase]')) phase = tasks.find(t=>!isMall(t)&&!t.done)?.phase || 1;
    render();
    status(dirty.size ? `${dirty.size} alteração(ões) aguardando salvar` : 'Progresso atualizado na nuvem');
    $('save-hint').textContent = 'Atualiza a cada 12 s · qualquer pessoa com o link pode editar.';
  } catch(e) {
    status(loaded?'Sem conexão. Suas alterações continuam aqui; tente salvar novamente.':'Não foi possível carregar. Clique em Atualizar para tentar novamente.',true);
  } finally { loading=false; controls(); }
}
async function save() {
  if (busy || !dirty.size || !loaded) return;
  busy=true; generation++; controls(); status('Salvando na nuvem…');
  const changes=Array.from(dirty,([id,done])=>({id,done}));
  try {
    const saved=await request('rpc/save_factorio_tasks',{method:'POST',body:JSON.stringify({changes})});
    if (!Array.isArray(saved) || saved.length!==changes.length) throw new Error('Gravação incompleta');
    for (const row of saved) { const task=tasks.find(t=>t.id===row.id); if(task) fix(Object.assign(task,row)); dirty.delete(row.id); }
    render(); status('Salvo! A equipe já pode ver as marcações.');
  } catch(e) { status('Não foi possível salvar. As marcações estão aqui; tente novamente.',true); }
  finally { busy=false; controls(); }
}
document.addEventListener('change',e=>{
  if(!e.target.matches('input[data-id]') || busy) return;
  const id=e.target.dataset.id;
  dirty.set(id,e.target.checked);
  const label=e.target.closest('label'); label.classList.toggle('done',e.target.checked); label.classList.add('dirty');
  progress(); controls();
  status(`${dirty.size} alteração(ões) aguardando salvar`);
});
$('phases').addEventListener('click',e=>{const b=e.target.closest('button[data-phase]');if(b){phase=Number(b.dataset.phase);render();$('phases').querySelector(`[data-phase="${phase}"]`).focus({preventScroll:true});}});
$('save').addEventListener('click',save);
$('refresh').addEventListener('click',refresh);
window.addEventListener('beforeunload',e=>{if(dirty.size){e.preventDefault();e.returnValue='';}});
// ponytail: polling every 12 seconds is enough for 3 players; use Realtime if the team needs instant updates.
setInterval(()=>{if(!document.hidden)refresh();},12000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
refresh();

document.querySelector(".tabs").addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(!b)return;document.querySelectorAll(".tabs [data-tab]").forEach(x=>{const on=x===b;x.setAttribute("aria-selected",on);document.getElementById("tab-"+x.dataset.tab).hidden=!on;});});
