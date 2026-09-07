const KEY='projectFinanceV2Local';
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const money=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number(n||0));
const today=()=>new Date().toISOString().slice(0,10);
const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
let state=JSON.parse(localStorage.getItem(KEY)||'null')||seed();
normalizeState();
let selected={type:'all'}, tab='overview';
function logout(){if(confirm('Выйти и очистить данные на этом устройстве?')){localStorage.removeItem(KEY);state=seed();selected={type:'all'};app()}}

function seed(){return {projects:[
{id:uid(),name:'Стройка',kind:'construction',children:[{id:uid(),name:'Женя',kind:'construction',estimate:[],income:[],expenses:[]}]},
{id:uid(),name:'Субаренда',kind:'sublease',children:[{id:uid(),name:'Олонецкая',kind:'sublease',
tenants:[{id:uid(),name:'Женя склад',dueDay:5,plannedRent:0,payments:[],utilities:[]},
{id:uid(),name:'Женя сендвичи',dueDay:5,plannedRent:0,payments:[],utilities:[]},
{id:uid(),name:'Даша бижутерия',dueDay:5,plannedRent:0,payments:[],utilities:[]},
{id:uid(),name:'Кирилл детская школа',dueDay:5,plannedRent:0,payments:[],utilities:[]}],
expenses:[],rentPayments:[]}]}]}}
function normalizeState(){
  state.projects.forEach(p=>{
    (p.children||[]).forEach(c=>{
      if(!c.kind) c.kind=p.kind||'construction';
      if(c.kind==='construction'){c.estimate=c.estimate||[];c.income=c.income||[];c.expenses=c.expenses||[]}
      if(c.kind==='sublease'){c.tenants=c.tenants||[];c.expenses=c.expenses||[];c.rentPayments=c.rentPayments||[]}
    });
  });
}
function constructionNet(c){return sum(c.income||[],'amount')-sum(c.expenses||[],'amount')}
function subleaseTotals(c){let rentIn=0,utilIn=0,utilExp=0;(c.tenants||[]).forEach(t=>{rentIn+=sum(t.payments||[],'amount');(t.utilities||[]).forEach(u=>{utilIn+=sum(u.income||[],'amount');utilExp+=sum(u.expense||[],'amount')})});let expenses=sum(c.expenses||[],'amount')+sum(c.rentPayments||[],'amount')+utilExp;let income=rentIn+utilIn;return {income,expenses,net:income-expenses}}
function childNet(c){return c.kind==='sublease'?subleaseTotals(c).net:constructionNet(c)}
function projectNet(p){return (p.children||[]).reduce((s,c)=>s+childNet(c),0)}
function signMoney(n){if(Number(n)===0)return money(0);return `${n>0?'+':'−'}${money(Math.abs(n))}`}
function resultClass(n){return Number(n)>0?'positive':Number(n)<0?'negative':'neutral'}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function project(id){return state.projects.find(x=>x.id===id)}
function child(id){for(const p of state.projects){let c=p.children.find(x=>x.id===id);if(c)return[p,c]}return[]}
function childCount(p){return p.children?.length||0}

function app(){
  const sidebarProjects=state.projects.map(p=>{
    const net=projectNet(p), count=childCount(p);
    return `<div class="sidebar-project ${selected.type==='project'&&selected.id===p.id?'selected-project':''}">
      <div class="project-row" onclick="selectProject('${p.id}')">
        <div class="project-main"><span class="project-icon">📁</span><span class="project-name">${esc(p.name)}</span></div>
        <div class="project-result ${resultClass(net)}">${signMoney(net)}</div>
        <button class="side-edit" title="Редактировать проект" onclick="event.stopPropagation();projectModal('${p.id}')">✎</button>
      </div>
      <div class="project-meta">${count} ${count===1?'подпроект':'подпроекта'}</div>
      <div class="sidebar-children">
        ${p.children.map(c=>{const n=childNet(c);return `<div class="child-row ${selected.type==='child'&&selected.id===c.id?'active':''}" onclick="selectChild('${c.id}')">
          <div class="child-main"><span>📂</span><span class="child-name">${esc(c.name)}</span></div>
          <div class="child-result ${resultClass(n)}">${signMoney(n)}</div>
          <button class="side-edit" title="Редактировать подпроект" onclick="event.stopPropagation();childModal('${p.id}','${c.id}')">✎</button>
        </div>`}).join('')}
      </div>
      <button class="side-btn mini-add" onclick="childModal('${p.id}')">＋ Добавить подпроект</button>
    </div>`;
  }).join('');
  document.getElementById('app').innerHTML=`<div class="layout"><aside class="sidebar">
    <div class="brand">Финансы проектов<small>простая структура</small></div>
    <button class="side-btn ${selected.type==='all'?'active':''}" onclick="allSelect()">📊 Главная</button>
    <div class="tree">${sidebarProjects}</div>
  </aside><main class="main">${view()}</main></div>`
}
function allSelect(){selected={type:'all'};tab='overview';app()}function selectProject(id){selected={type:'project',id};tab='overview';app()}function selectChild(id){selected={type:'child',id};let pair=child(id),c=pair[1];tab=c?.kind==='construction'?'estimate':'overview';app()}
function cards(items){return `<div class="cards">${items.map(([l,v,cl])=>`<div class="card"><div class="label">${l}</div><div class="value ${cl||''}">${money(v)}</div></div>`).join('')}</div>`}
function view(){if(selected.type==='all')return allView();if(selected.type==='project')return sectionView(project(selected.id));let[p,c]=child(selected.id);return c.kind==='construction'?construction(p,c):sublease(p,c)}
function allView(){
  let total=state.projects.reduce((s,p)=>s+projectNet(p),0);
  return `<div class="top"><div><h1>Мои проекты</h1><div class="sub">Общий результат по всем подпроектам</div></div></div>
  ${cards([['Итого по всем проектам',total,resultClass(total)]])}
  <div class="panel"><h2>Проекты</h2>
  <div class="projects-list">${state.projects.map(p=>{let n=projectNet(p),count=childCount(p);return `<div class="project-summary" onclick="selectProject('${p.id}')"><div><div class="project-summary-name">📁 ${esc(p.name)}</div><div class="project-summary-meta">${count} ${count===1?'подпроект':'подпроекта'}</div></div><div class="project-summary-result ${resultClass(n)}">${signMoney(n)}</div></div>`}).join('')||'<div class="empty">Проекты пока не добавлены</div>'}</div></div>`
}
function sectionView(p){let total=projectNet(p);return `<div class="top"><div><h1>${esc(p.name)}</h1><div class="sub">Общий финансовый результат всех подпроектов</div></div><button class="btn" onclick="childModal('${p.id}')">＋ Добавить подпроект</button></div>${cards([['Итого по проекту',total,total>=0?'positive':'negative']])}<div class="panel"><h2>Подпроекты</h2>${p.children.map(c=>{let n=childNet(c);return `<div class="tree-row" style="background:#f7f8fc;margin-bottom:8px" onclick="selectChild('${c.id}')">📂 <b>${esc(c.name)}</b><span class="tree-total ${n>=0?'positive':'negative'}">${signMoney(n)}</span><span class="tree-actions"><button class="iconbtn" title="Редактировать подпроект" onclick="event.stopPropagation();childModal('${p.id}','${c.id}')">✎</button></span></div>`}).join('')||'<div class="empty">Подпроектов пока нет</div>'}</div>`}
function tabs(a){return `<div class="tabs">${a.map(x=>`<button class="tab ${tab===x[0]?'active':''}" onclick="tab='${x[0]}';app()">${x[1]}</button>`).join('')}</div>`}
function sum(a,key){return a.reduce((s,x)=>s+Number(x[key]||0),0)}

function construction(p,c){
 let cost=sum(c.estimate,'cost'),client=sum(c.estimate,'client'),margin=client-cost,expenses=sum(c.expenses,'amount'),income=sum(c.income,'amount');
 if(tab==='overview') tab='estimate';
 return `<div class="top"><div><h1>${esc(c.name)}</h1><div class="sub">Стройка</div></div><button class="btn secondary" onclick="childModal('${p.id}','${c.id}')">Редактировать</button></div>
 ${cards([['Себестоимость сметы',cost,'negative'],['Смета для клиента',client,''],['Маржа',margin,margin>=0?'positive':'negative'],['Приход',income,'positive'],['Расход',expenses,'negative'],['Чистая прибыль',income-expenses,income-expenses>=0?'positive':'negative']])}
 ${tabs([['estimate','Смета'],['income','Приход'],['expenses','Расход']])}
 ${tab==='estimate'?estimateView(c):tab==='income'?incomeView(c):expenseView(c.expenses,'construction',c.id)}`;
}
function estimateView(c){let tc=0,tp=0;return `<div class="panel"><div class="toolbar"><div><h2>Смета</h2><div class="section-note">Работы, электрика, материалы, монтаж и любые другие позиции.</div></div><button class="btn" onclick="estimateModal('${c.id}')">＋ Позиция</button></div><table><thead><tr><th>Позиция</th><th>Категория</th><th>Себестоимость</th><th>Для клиента</th><th>Маржа</th><th></th></tr></thead><tbody>${c.estimate.map(x=>{tc+=+x.cost||0;tp+=+x.client||0;return `<tr><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${money(x.cost)}</td><td>${money(x.client)}</td><td class="positive">${money(Number(x.client)-Number(x.cost))}</td><td><button class="btn secondary small" title="Редактировать" onclick="estimateModal('${c.id}','${x.id}')">✎</button></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">Смета пока пустая</td></tr>'}</tbody><tfoot><tr><th>Итого</th><th></th><th>${money(tc)}</th><th>${money(tp)}</th><th class="positive">${money(tp-tc)}</th><th></th></tr></tfoot></table></div>`}
function incomeView(c){return `<div class="panel"><div class="toolbar"><div><h2>Приход</h2><div class="section-note">Фактически полученные деньги от клиента.</div></div><button class="btn" onclick="incomeModal('${c.id}')">＋ Добавить</button></div><table><thead><tr><th>Дата</th><th>Сумма</th><th></th></tr></thead><tbody>${c.income.map(x=>`<tr><td>${x.date||'—'}</td><td class="positive money">${money(x.amount)}</td><td><button class="btn secondary small" title="Редактировать" onclick="incomeModal('${c.id}','${x.id}')">✎</button></td></tr>`).join('')||'<tr><td colspan="3" class="empty">Записей пока нет</td></tr>'}</tbody></table></div>`}
function expenseView(arr,type,id){return `<div class="panel"><div class="toolbar"><div><h2>Расходы</h2><div class="section-note">Материалы, работы, доставка, аренда, коммунальные и любые другие категории.</div></div><button class="btn" onclick="expenseModal('${type}','${id}')">＋ Добавить расход</button></div><table><thead><tr><th>Дата</th><th>Категория</th><th>Что куплено / услуга</th><th>Магазин / место</th><th>Сумма</th><th></th></tr></thead><tbody>${arr.map(x=>`<tr><td>${x.date||'—'}</td><td>${esc(x.category)}</td><td>${esc(x.name)}</td><td>${esc(x.place||'—')}</td><td class="money">${money(x.amount)}</td><td><button class="btn secondary small" title="Редактировать" onclick="expenseModal('${type}','${id}','${x.id}')">✎</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Расходов пока нет</td></tr>'}</tbody></table></div>`}
function simpleMoneyList(title,arr,fn,id,del,note){return `<div class="panel"><div class="toolbar"><div><h2>${title}</h2><div class="section-note">${note}</div></div><button class="btn" onclick="${fn}('${id}')">＋ Добавить</button></div><table><thead><tr><th>Дата</th><th>Описание</th><th>Сумма</th><th></th></tr></thead><tbody>${arr.map(x=>`<tr><td>${x.date||'—'}</td><td>${esc(x.name||'Приход')}</td><td class="positive money">${money(x.amount)}</td><td><button class="btn secondary small" onclick="${fn}('${id}','${x.id}')">✎</button> <button class="btn danger small" onclick="${del}('${id}','${x.id}')">×</button></td></tr>`).join('')||'<tr><td colspan="4" class="empty">Записей пока нет</td></tr>'}</tbody></table></div>`}

function sublease(p,c){let totals=subleaseTotals(c),otherExp=totals.expenses,totalIn=totals.income,profit=totals.net;return `<div class="top"><div><h1>${esc(c.name)}</h1><div class="sub">Субаренда</div></div><button class="btn secondary" onclick="childModal('${p.id}','${c.id}')">Редактировать</button></div>${cards([['Факт. приход',totalIn,'positive'],['Расход',otherExp,'negative'],['Чистая прибыль',profit,profit>=0?'positive':'negative']])}${tabs([['overview','Арендаторы'],['utilities','Коммунальные'],['expenses','Расходы']])}${tab==='overview'?tenantsView(c):tab==='utilities'?utilitiesView(c):subleaseExpenses(c)}`}
function tenantStatus(t){let paid=sum(t.payments,'amount'), planned=Number(t.plannedRent||0), overdue=planned>paid&&t.dueDay&&new Date(new Date().getFullYear(),new Date().getMonth(),Math.min(+t.dueDay,28))<new Date(new Date().setHours(0,0,0,0));return{paid,planned,overdue}}
function tenantsView(c){return `<div class="panel"><div class="toolbar"><div><h2>Арендаторы</h2><div class="section-note">Каждый приход можно добавлять отдельной записью — частичные оплаты тоже.</div></div><button class="btn" onclick="tenantModal('${c.id}')">＋ Арендатор</button></div><table><thead><tr><th>Арендатор</th><th>План аренды</th><th>Число оплаты</th><th>Фактически пришло</th><th>Осталось</th><th>Статус</th><th></th></tr></thead><tbody>${c.tenants.map(t=>{let s=tenantStatus(t);return `<tr class="${s.overdue?'row-overdue':''}"><td><b>${esc(t.name)}</b></td><td>${money(s.planned)}</td><td>${t.dueDay||'—'}</td><td class="positive">${money(s.paid)}</td><td>${money(Math.max(0,s.planned-s.paid))}</td><td>${s.overdue?'<span class="status late">ПРОСРОЧЕНО</span>':s.paid>=s.planned&&s.planned>0?'<span class="status paid">Оплачено</span>':'<span class="status unpaid">Ожидается</span>'}</td><td><button class="btn" onclick="tenantPaymentModal('${c.id}','${t.id}')">＋ Приход</button> <button class="btn secondary small" onclick="tenantModal('${c.id}','${t.id}')">✎</button></td></tr>`}).join('')}</tbody></table></div>`}
function utilitiesView(c){let rows=[];c.tenants.forEach(t=>t.utilities.forEach(u=>rows.push({t,u})));return `<div class="panel"><div class="toolbar"><div><h2>Коммунальные</h2><div class="section-note">Коммунальные от арендаторов идут в приход, ваши оплаты — в расход.</div></div><button class="btn" onclick="utilityModal('${c.id}')">＋ Добавить</button></div><table><thead><tr><th>Арендатор</th><th>Описание</th><th>Приход</th><th>Расход</th><th>Срок</th><th>Статус</th><th></th></tr></thead><tbody>${rows.map(({t,u})=>{let inc=sum(u.income,'amount'),ex=sum(u.expense,'amount'),over=u.dueDate&&u.dueDate<today()&&inc===0;return `<tr class="${over?'row-overdue':''}"><td>${esc(t.name)}</td><td>${esc(u.name)}</td><td class="positive">${money(inc)}</td><td class="negative">${money(ex)}</td><td>${u.dueDate||'—'}</td><td>${over?'<span class="status late">ПРОСРОЧЕНО</span>':'—'}</td><td><button class="btn secondary small" title="Редактировать" onclick="utilityModal('${c.id}','${t.id}','${u.id}')">✎</button></td></tr>`}).join('')||'<tr><td colspan="7" class="empty">Записей пока нет</td></tr>'}</tbody></table></div>`}
function subleaseExpenses(c){
 let arr=[...c.expenses.map(x=>({...x,type:'Обычный расход'})),...c.rentPayments.map(x=>({...x,type:'Аренда помещения'}))];
 let rows=arr.map(x=>{
   let buttons=x.type==='Аренда помещения'
    ? `<button class="btn secondary small" title="Редактировать" onclick="rentPaymentModal('${c.id}','${x.id}')">✎</button>`
    : `<button class="btn secondary small" title="Редактировать" onclick="expenseModal('sublease','${c.id}','${x.id}')">✎</button>`;
   let cat=x.type==='Аренда помещения'?'Аренда':x.category;
   return `<tr><td>${x.date||'—'}</td><td>${esc(cat)}</td><td>${esc(x.name||'Аренда помещения')}</td><td>${esc(x.place||'—')}</td><td class="negative">${money(x.amount)}</td><td>${buttons}</td></tr>`;
 }).join('');
 if(!rows) rows='<tr><td colspan="6" class="empty">Расходов пока нет</td></tr>';
 return `<div class="panel"><div class="toolbar"><div><h2>Расходы</h2><div class="section-note">Все расходы автоматически участвуют в расчёте чистой прибыли.</div></div><div><button class="btn secondary" onclick="rentPaymentModal('${c.id}')">＋ Аренда помещения</button> <button class="btn" onclick="expenseModal('sublease','${c.id}')">＋ Другой расход</button></div></div><table><thead><tr><th>Дата</th><th>Категория</th><th>Описание</th><th>Место</th><th>Сумма</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
// Modals
function modal(title,body,saveFn){document.getElementById('modalRoot').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><h3>${title}</h3><form id="modalForm">${body}<div class="modal-footer"><button type="button" class="btn secondary" onclick="closeModal()">Отмена</button><button class="btn">Сохранить</button></div></form></div></div>`;modalForm.onsubmit=e=>{e.preventDefault();saveFn(new FormData(e.target));closeModal();save();app()}}
function closeModal(){modalRoot.innerHTML=''}const fld=(n,l,v='',t='text')=>`<div class="field"><label>${l}</label><input name="${n}" type="${t}" value="${esc(v??'')}"></div>`;
function projectModal(id){let x=project(id);if(!x)return;modal('Редактировать проект',`<div class="form-grid">${fld('name','Название проекта',x.name)}</div><div class="modal-delete"><button type="button" class="btn danger" onclick="deleteProject('${x.id}')">Удалить проект</button></div>`,f=>{x.name=f.get('name')})}
function childModal(pid,id){let p=project(pid),x=id&&p.children.find(z=>z.id===id);modal(x?'Редактировать подпроект':'Новый подпроект',`<div class="form-grid">${fld('name','Название',x?.name||'')}${x?'':`<div class="field"><label>Тип подпроекта</label><select name="kind"><option value="construction">Стройка</option><option value="sublease">Субаренда</option></select></div>`}</div>${x?`<div class="modal-delete"><button type="button" class="btn danger" onclick="deleteChild('${p.id}','${x.id}')">Удалить подпроект</button></div>`:''}`,f=>{if(x)x.name=f.get('name');else {let kind=f.get('kind');p.children.push(kind==='construction'?{id:uid(),name:f.get('name'),kind:'construction',estimate:[],income:[],expenses:[]}:{id:uid(),name:f.get('name'),kind:'sublease',tenants:[],expenses:[],rentPayments:[]})}})}
function estimateModal(cid,id){let c=child(cid)[1],x=id&&c.estimate.find(z=>z.id===id);modal('Смета',`<div class="form-grid">${fld('name','Позиция',x?.name||'')}${fld('category','Категория',x?.category||'Работы')}${fld('cost','Себестоимость',x?.cost||0,'number')}${fld('client','Цена для клиента',x?.client||0,'number')}</div>${x?`<div class="modal-delete"><button type="button" class="btn danger" onclick="delEstimate('${cid}','${x.id}')">Удалить запись</button></div>`:''}`,f=>{let o=x||{id:uid()};Object.assign(o,{name:f.get('name'),category:f.get('category'),cost:+f.get('cost'),client:+f.get('client')});if(!x)c.estimate.push(o)})}
function incomeModal(cid,id){let c=child(cid)[1],x=id&&c.income.find(z=>z.id===id);modal('Приход',`<div class="form-grid">${fld('date','Дата',x?.date||today(),'date')}${fld('amount','Сумма',x?.amount||0,'number')}</div>${x?`<div class="modal-delete"><button type="button" class="btn danger" onclick="delIncome('${cid}','${x.id}')">Удалить запись</button></div>`:''}`,f=>{let o=x||{id:uid()};Object.assign(o,{date:f.get('date'),amount:+f.get('amount')});if(!x)c.income.push(o)})}
function expenseOwner(type,id){return type==='construction'?child(id)[1].expenses:child(id)[1].expenses}
function expenseModal(type,cid,id){let arr=expenseOwner(type,cid),x=id&&arr.find(z=>z.id===id);modal('Расход',`<div class="form-grid">${fld('date','Дата',x?.date||today(),'date')}<div class="field"><label>Категория</label><select name="category">${['Материалы','Работы','Доставка','Инструменты','Аренда','Коммунальные','Транспорт','Прочее'].map(v=>`<option ${x?.category===v?'selected':''}>${v}</option>`).join('')}</select></div>${fld('name','Что куплено / за что',x?.name||'')}${fld('place','Магазин / место',x?.place||'')}${fld('amount','Сумма',x?.amount||0,'number')}</div>${x?`<div class="modal-delete"><button type="button" class="btn danger" onclick="delExpense('${type}','${cid}','${x.id}')">Удалить запись</button></div>`:''}`,f=>{let o=x||{id:uid()};Object.assign(o,{date:f.get('date'),category:f.get('category'),name:f.get('name'),place:f.get('place'),amount:+f.get('amount')});if(!x)arr.push(o)})}
function tenantModal(cid,id){let c=child(cid)[1],x=id&&c.tenants.find(z=>z.id===id);modal('Арендатор',`<div class="form-grid">${fld('name','Название',x?.name||'')}${fld('plannedRent','Ежемесячная аренда',x?.plannedRent||0,'number')}${fld('dueDay','Число оплаты',x?.dueDay||5,'number')}</div>${x?`<div class="modal-delete"><button type="button" class="btn danger" onclick="deleteTenant('${cid}','${x.id}')">Удалить арендатора</button></div>`:''}`,f=>{let o=x||{id:uid(),payments:[],utilities:[]};Object.assign(o,{name:f.get('name'),plannedRent:+f.get('plannedRent'),dueDay:+f.get('dueDay')});if(!x)c.tenants.push(o)})}
function tenantPaymentModal(cid,tid){let t=child(cid)[1].tenants.find(x=>x.id===tid);modal('Приход от арендатора',`<div class="form-grid">${fld('date','Дата',today(),'date')}${fld('amount','Сумма',0,'number')}</div>`,f=>t.payments.push({id:uid(),date:f.get('date'),amount:+f.get('amount')}))}
function utilityModal(cid,tid,uid2){let c=child(cid)[1],t=tid?c.tenants.find(x=>x.id===tid):c.tenants[0];if(!t)return alert('Сначала добавьте арендатора');let x=uid2&&t.utilities.find(z=>z.id===uid2);modal('Коммунальные',`<div class="form-grid"><div class="field"><label>Арендатор</label><select name="tenant">${c.tenants.map(z=>`<option value="${z.id}" ${z.id===t.id?'selected':''}>${esc(z.name)}</option>`).join('')}</select></div>${fld('name','Описание',x?.name||'Коммунальные')}${fld('dueDate','Срок оплаты',x?.dueDate||'','date')}</div>${x?`<div class="modal-delete"><button type="button" class="btn danger" onclick="delUtility('${cid}','${t.id}','${x.id}')">Удалить запись</button></div>`:''}`,f=>{let target=c.tenants.find(z=>z.id===f.get('tenant')),o=x||{id:uid(),income:[],expense:[]};Object.assign(o,{name:f.get('name'),dueDate:f.get('dueDate')});if(!x)target.utilities.push(o)})}
function rentPaymentModal(cid,id){let c=child(cid)[1],x=id&&c.rentPayments.find(z=>z.id===id);modal('Расход: аренда помещения',`<div class="form-grid">${fld('date','Дата',x?.date||today(),'date')}${fld('amount','Сумма',x?.amount||0,'number')}</div>${x?`<div class="modal-delete"><button type="button" class="btn danger" onclick="delRentPayment('${cid}','${x.id}')">Удалить запись</button></div>`:''}`,f=>{let o=x||{id:uid()};Object.assign(o,{date:f.get('date'),amount:+f.get('amount')});if(!x)c.rentPayments.push(o)})}
function deleteProject(id){let p=project(id);if(!p)return;if(confirm(`Удалить проект «${p.name}» вместе со всеми подпроектами и записями? Это действие нельзя отменить.`)){state.projects=state.projects.filter(x=>x.id!==id);selected={type:'all'};tab='overview';closeModal();save();app()}}
function deleteChild(pid,id){let p=project(pid),c=p?.children.find(x=>x.id===id);if(!p||!c)return;if(confirm(`Удалить подпроект «${c.name}» вместе со всеми его записями? Это действие нельзя отменить.`)){p.children=p.children.filter(x=>x.id!==id);selected={type:'project',id:p.id};tab='overview';closeModal();save();app()}}
function deleteTenant(cid,id){let c=child(cid)[1],x=c.tenants.find(z=>z.id===id);if(!x)return;if(confirm(`Удалить арендатора «${x.name}» вместе со всеми его платежами и коммунальными? Это действие нельзя отменить.`)){c.tenants=c.tenants.filter(z=>z.id!==id);closeModal();save();app()}}
function delEstimate(c,i){if(confirm('Удалить эту запись?')){let x=child(c)[1];x.estimate=x.estimate.filter(z=>z.id!==i);closeModal();save();app()}}
function delIncome(c,i){if(confirm('Удалить эту запись?')){let x=child(c)[1];x.income=x.income.filter(z=>z.id!==i);closeModal();save();app()}}
function delExpense(t,c,i){if(confirm('Удалить эту запись?')){let x=expenseOwner(t,c);let n=x.findIndex(z=>z.id===i);if(n>=0)x.splice(n,1);closeModal();save();app()}}
function delUtility(c,t,i){if(confirm('Удалить эту запись?')){let x=child(c)[1].tenants.find(z=>z.id===t);x.utilities=x.utilities.filter(z=>z.id!==i);closeModal();save();app()}}
function delRentPayment(c,i){if(confirm('Удалить эту запись?')){let x=child(c)[1];x.rentPayments=x.rentPayments.filter(z=>z.id!==i);closeModal();save();app()}}

app();
