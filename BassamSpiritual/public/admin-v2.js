const V2_API = '/api/v2';
const TOKEN_KEY = 'bassam_auth_token';

function token(){return localStorage.getItem(TOKEN_KEY)||''}
async function v2api(method,path,body){
  const opt={method,headers:{'Content-Type':'application/json'}};
  if(token()) opt.headers.Authorization='Bearer '+token();
  if(body!==undefined) opt.body=JSON.stringify(body);
  const r=await fetch(V2_API+path,opt);
  const d=await r.json().catch(()=>({}));
  if(r.status===401||r.status===403){alert(d.error||'انتهت صلاحياتك');location.href='/login.html';throw new Error('auth')}
  if(!r.ok) throw new Error(d.error||'حدث خطأ');
  return d;
}
const V2={
  state:{settings:{},sessions:[],services:[]},
  boot(){
    document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>this.show(b.dataset.section));
    document.getElementById('logoutBtn').onclick=()=>{localStorage.removeItem('bassam_auth_token');localStorage.removeItem('bassam_user');location.href='/login.html'}
    this.show('overview'); this.loadSummary(); this.loadAppearance();
  },
  show(name){
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.section===name));
    document.querySelectorAll('.panel-v2').forEach(p=>p.classList.toggle('active',p.id==='section-'+name));
    const loaders={requests:'loadRequests',services:'loadServices',sessions:'loadSessions',articles:'loadArticles',reviews:'loadReviews',audit:'loadAudit',overview:'loadSummary',appearance:'loadAppearance'};
    if(loaders[name])this[loaders[name]]();
  },
  toast(m){const t=document.createElement('div');t.className='toast-v2';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2800)},
  async loadSummary(){
    try{
      const [s,h]=await Promise.all([v2api('GET','/admin/summary'),v2api('GET','/health')]);
      const x=s.summary;
      document.getElementById('summaryGrid').innerHTML=[
        ['users','المستفيدون'],['requests','الطلبات'],['pendingRequests','طلبات تحتاج إجراء'],['sessions','الجلسات'],['services','الخدمات'],['reviews','الآراء المعتمدة']
      ].map(([k,l])=>`<div class="stat-v2"><strong>${x[k]}</strong><span>${l}</span></div>`).join('');
      document.getElementById('healthBox').innerHTML=`<div class="health-item"><b class="health-ok">● الخادم</b><div class="muted">يستجيب للطلب</div></div><div class="health-item"><b class="${h.database?'health-ok':'health-bad'}">● قاعدة البيانات</b><div class="muted">${h.database?'متصلة':'غير متصلة'}</div></div><div class="health-item"><b class="health-ok">● الوقت</b><div class="muted">${new Date(h.time).toLocaleString('ar')}</div></div>`;
    }catch(e){this.toast(e.message)}
  },
  async loadRequests(){
    const r=await v2api('GET','/../admin/requests').catch(async()=>{const rr=await fetch('/api/admin/requests',{headers:{Authorization:'Bearer '+token()}});return rr.json()});
    const list=Array.isArray(r)?r:(r.requests||[]);
    const statusName={pending:'قيد المراجعة',accepted_waiting_payment:'بانتظار الدفع',payment_submitted:'بانتظار التحقق',processing:'قيد المعالجة',diagnosed:'الخطة جاهزة',completed:'مكتمل',rejected:'مرفوض',payment_rejected:'دفع مرفوض'};
    document.getElementById('requestsBox').innerHTML=`<div class="card-v2"><div style="overflow:auto"><table class="table-v2"><thead><tr><th>المستفيد</th><th>الخدمة</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead><tbody>${list.map(x=>`<tr><td>${escapeHtml(x.fullName||'')}</td><td>${escapeHtml(x.serviceType||'')}</td><td><span class="pill">${statusName[x.status]||x.status}</span></td><td>${new Date(x.createdAt).toLocaleString('ar')}</td><td><button class="btn" onclick="V2.showRequest(${x.id})">عرض</button></td></tr>`).join('')}</tbody></table></div></div>`;
  },
  async showRequest(id){
    const r=await fetch('/api/dashboard/request/'+id,{headers:{Authorization:'Bearer '+token()}});
    const x=await r.json();
    const box=document.getElementById('requestDetail');box.classList.remove('hidden');
    box.innerHTML=`<div class="section-head"><h3>#${x.id} — ${escapeHtml(x.fullName||'')}</h3><button class="btn" onclick="document.getElementById('requestDetail').classList.add('hidden')">إغلاق</button></div>
      <p><b>الخدمة:</b> ${escapeHtml(x.serviceType||'')}</p><p><b>الوصف:</b><br>${escapeHtml(x.description||'')}</p>
      <div class="form-grid"><label>التشخيص<textarea id="diag">${escapeHtml(x.initial_diagnosis||'')}</textarea></label><label>الخطة العلاجية<textarea id="plan">${escapeHtml(x.treatment_plan||'')}</textarea></label></div>
      <button class="btn primary" onclick="V2.saveDiagnosis(${x.id})">حفظ وإرسال</button>`;
  },
  async saveDiagnosis(id){
    const body={initial_diagnosis:document.getElementById('diag').value,treatment_plan:document.getElementById('plan').value};
    await v2api('PUT','/../admin/requests/'+id+'/diagnose').catch(async()=>{await fetch('/api/admin/requests/'+id+'/diagnose',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify(body)})});
    this.toast('تم حفظ التحديث');this.loadRequests();
  },
  async loadServices(){
    const r=await v2api('GET','/admin/services');this.state.services=r.services||[];
    document.getElementById('servicesBox').innerHTML=this.state.services.map(s=>`<div class="card-v2"><div class="section-head"><div><h3>${escapeHtml(s.title)}</h3><div class="muted">${escapeHtml(s.description||'')}</div></div><div class="actions"><button class="btn" onclick='V2.showServiceForm(${JSON.stringify(s)})'>تعديل</button><button class="btn danger" onclick="V2.deleteService(${s.id})">حذف</button></div></div><div class="muted">${s.price??'مجاني'} ${s.currency||''} ${s.durationMinutes?`• ${s.durationMinutes} دقيقة`:''}</div></div>`).join('')||'<div class="card-v2">لا توجد خدمات بعد.</div>';
  },
  showServiceForm(item=null){
    const x=item||{title:'',description:'',icon:'bi-heart',price:'',currency:'YER',durationMinutes:'',active:true,featured:false,sortOrder:0};
    modal('الخدمة',`<div class="form-grid"><label>الاسم<input id="sf_title" value="${escAttr(x.title)}"></label><label>الأيقونة<input id="sf_icon" value="${escAttr(x.icon||'bi-heart')}"></label><label>السعر<input id="sf_price" type="number" value="${escAttr(x.price??'')}"></label><label>المدة بالدقائق<input id="sf_duration" type="number" value="${escAttr(x.durationMinutes??'')}"></label><label>العملة<input id="sf_currency" value="${escAttr(x.currency||'YER')}"></label><label>الترتيب<input id="sf_sort" type="number" value="${escAttr(x.sortOrder??0)}"></label><label style="grid-column:1/-1">الوصف<textarea id="sf_desc">${escapeHtml(x.description||'')}</textarea></label><label class="check"><input id="sf_active" type="checkbox" ${x.active!==false?'checked':''}> نشطة</label><label class="check"><input id="sf_featured" type="checkbox" ${x.featured?'checked':''}> مميزة</label></div>`,async()=>{
      const body={title:sf_title.value,description:sf_desc.value,icon:sf_icon.value,price:sf_price.value||null,currency:sf_currency.value,durationMinutes:sf_duration.value||null,sortOrder:Number(sf_sort.value||0),active:sf_active.checked,featured:sf_featured.checked,fields:[]};
      if(item) await v2api('PUT','/admin/services/'+item.id,body); else await v2api('POST','/admin/services',body);
      this.toast('تم الحفظ');this.loadServices();
    });
  },
  async deleteService(id){if(!confirm('حذف الخدمة؟'))return;await v2api('DELETE','/admin/services/'+id);this.loadServices()},
  async loadSessions(){
    const r=await v2api('GET','/admin/sessions');this.state.sessions=r.sessions||[];
    document.getElementById('sessionsBox').innerHTML=this.state.sessions.map(s=>`<div class="session-card"><div><h3>${escapeHtml(s.title)}</h3><div class="muted">${new Date(s.startsAt).toLocaleString('ar')} • ${s.mode==='live'?'مباشر':'مسجل'} • ${s.access}</div><div>${escapeHtml(s.description||'')}</div>${(s.topics||[]).map(t=>`<div class="topic"><span>${escapeHtml(t.title)} <small>(${t.voteCount})</small></span><span class="actions">${t.selected?'<b class="health-ok">مختار</b>':'<button class="btn" onclick="V2.selectTopic('+t.id+')">اختيار</button>'}<button class="btn danger" onclick="V2.deleteTopic(${t.id})">حذف</button></span></div>`).join('')}</div><div class="actions"><button class="btn" onclick='V2.showSessionForm(${JSON.stringify(s)})'>تعديل</button><button class="btn danger" onclick="V2.deleteSession(${s.id})">حذف</button></div></div>`).join('')||'<div class="card-v2">لا توجد جلسات.</div>';
  },
  showSessionForm(item=null){
    const x=item||{title:'',description:'',startsAt:new Date(Date.now()+86400000).toISOString().slice(0,16),durationMinutes:60,mode:'live',access:'public',price:'',currency:'YER',liveUrl:'',recordingUrl:'',coverUrl:'',status:'scheduled'};
    modal('الجلسة',`<div class="form-grid"><label>العنوان<input id="ss_title" value="${escAttr(x.title)}"></label><label>الموعد<input id="ss_start" type="datetime-local" value="${escAttr(x.startsAt?x.startsAt.slice(0,16):'')}"></label><label>المدة<input id="ss_duration" type="number" value="${escAttr(x.durationMinutes||60)}"></label><label>النمط<select id="ss_mode"><option value="live">مباشر</option><option value="recorded">مسجل</option><option value="live_recorded">مباشر ثم مسجل</option></select></label><label>الوصول<select id="ss_access"><option value="public">للجميع</option><option value="registered">للمسجلين</option><option value="subscribers">للمشتركين</option></select></label><label>السعر<input id="ss_price" type="number" value="${escAttr(x.price??'')}"></label><label style="grid-column:1/-1">الوصف<textarea id="ss_desc">${escapeHtml(x.description||'')}</textarea></label><label style="grid-column:1/-1">رابط البث/الغرفة<input id="ss_live" value="${escAttr(x.liveUrl||'')}"></label><label style="grid-column:1/-1">رابط التسجيل<input id="ss_record" value="${escAttr(x.recordingUrl||'')}"></label></div>`,async()=>{
      const body={title:ss_title.value,description:ss_desc.value,startsAt:ss_start.value,durationMinutes:Number(ss_duration.value||60),mode:ss_mode.value,access:ss_access.value,price:ss_price.value||null,currency:'YER',liveUrl:ss_live.value,recordingUrl:ss_record.value,status:'scheduled'};
      if(item) await v2api('PUT','/admin/sessions/'+item.id,body); else await v2api('POST','/admin/sessions',body);
      this.toast('تم حفظ الجلسة');this.loadSessions();
    });
  },
  async deleteSession(id){if(!confirm('حذف الجلسة؟'))return;await v2api('DELETE','/admin/sessions/'+id);this.loadSessions()},
  async selectTopic(id){await v2api('PUT','/admin/topics/'+id+'/select');this.loadSessions()},
  async deleteTopic(id){if(!confirm('حذف الموضوع؟'))return;await v2api('DELETE','/admin/topics/'+id);this.loadSessions()},
  async loadArticles(){
    const r=await fetch('/api/articles');const list=await r.json();
    document.getElementById('articlesBox').innerHTML=`<div class="card-v2"><table class="table-v2"><thead><tr><th>العنوان</th><th>التاريخ</th></tr></thead><tbody>${list.map(a=>`<tr><td>${escapeHtml(a.title)}</td><td>${new Date(a.createdAt).toLocaleDateString('ar')}</td></tr>`).join('')}</tbody></table></div>`;
  },
  async loadReviews(){
    const r=await fetch('/api/admin/reviews',{headers:{Authorization:'Bearer '+token()}});const d=await r.json();const list=d.reviews||[];
    document.getElementById('reviewsBox').innerHTML=`<div class="card-v2"><table class="table-v2"><thead><tr><th>الاسم</th><th>التقييم</th><th>النص</th><th>الحالة</th></tr></thead><tbody>${list.map(a=>`<tr><td>${escapeHtml(a.fullName)}</td><td>${a.rating}/5</td><td>${escapeHtml(a.comment)}</td><td>${a.isApproved?'معتمد':'معلق'}</td></tr>`).join('')}</tbody></table></div>`;
  },
  async loadAppearance(){
    const r=await v2api('GET','/settings');this.state.settings=r.settings||{};const s=this.state.settings;
    ['site_name','site_subtitle','hero_title','hero_description','primary_color','secondary_color','accent_color'].forEach(k=>{const el=document.getElementById('set_'+k);if(el)el.value=typeof s[k]==='object'?JSON.stringify(s[k]):(s[k]??'')});
    ['show_sessions','show_articles','show_reviews','show_stats'].forEach(k=>{const el=document.getElementById('set_'+k);if(el)el.checked=!!s[k]});
  },
  async saveAppearance(){
    for(const k of ['site_name','site_subtitle','hero_title','hero_description','primary_color','secondary_color','accent_color']){
      await v2api('PUT','/admin/settings/'+k,{value:document.getElementById('set_'+k).value});
    }
    for(const k of ['show_sessions','show_articles','show_reviews','show_stats']){
      await v2api('PUT','/admin/settings/'+k,{value:document.getElementById('set_'+k).checked});
    }
    this.toast('تم حفظ إعدادات المظهر');
  },
  async loadAudit(){
    const r=await v2api('GET','/admin/audit');
    document.getElementById('auditBox').innerHTML=`<div class="card-v2"><table class="table-v2"><thead><tr><th>الوقت</th><th>العملية</th><th>العنصر</th></tr></thead><tbody>${(r.logs||[]).map(x=>`<tr><td>${new Date(x.createdAt).toLocaleString('ar')}</td><td>${escapeHtml(x.action)}</td><td>${escapeHtml((x.entityType||'')+' '+(x.entityId||''))}</td></tr>`).join('')}</tbody></table></div>`;
  }
};

function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escAttr(s){return escapeHtml(s)}
function modal(title,html,onSave){
  const o=document.createElement('div');o.className='modal-v2';o.innerHTML=`<div class="modal-box"><div class="section-head"><h3>${escapeHtml(title)}</h3><button class="btn" data-close>إغلاق</button></div>${html}<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn primary" data-save>حفظ</button></div></div>`;document.body.appendChild(o);o.querySelector('[data-close]').onclick=()=>o.remove();o.querySelector('[data-save]').onclick=async()=>{try{await onSave();o.remove()}catch(e){V2.toast(e.message)}}}
V2.boot();
