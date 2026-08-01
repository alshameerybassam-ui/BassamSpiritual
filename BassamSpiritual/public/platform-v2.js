/*
  تحسين خفيف للواجهة الحالية دون استبدال index.html.
  يضيف قسم الجلسات، ويملأ بعض الإعدادات العامة من لوحة المدير.
*/
(async function(){
  try{
    const r=await fetch('/api/v2/settings');const d=await r.json();const s=d.settings||{};
    if(s.site_name){document.title=s.site_name}
    const h=document.querySelector('.hero-section h1');if(h&&s.hero_title)h.textContent=s.hero_title;
    const desc=document.querySelector('.hero-section .sub-title');if(desc&&s.site_subtitle)desc.textContent='﴿ '+s.site_subtitle+' ﴾';
    const root=document.documentElement;
    if(s.primary_color)root.style.setProperty('--v2-primary',s.primary_color);
    if(s.secondary_color)root.style.setProperty('--v2-secondary',s.secondary_color);
    if(s.accent_color)root.style.setProperty('--v2-accent',s.accent_color);
    if(s.show_sessions!==false) await injectSessions();
  }catch(_){}
})();

async function injectSessions(){
  const r=await fetch('/api/v2/sessions');const d=await r.json();
  if(!(d.sessions||[]).length) return;
  if(document.getElementById('nourSessionsV2')) return;
  const first=d.sessions[0];
  const section=document.createElement('section');section.id='nourSessionsV2';section.className='section';
  section.innerHTML=`<div class="section-header"><h2>🌿 جلسة هذا الأسبوع</h2><a href="/sessions.html">كل الجلسات</a></div>
    <div class="card-v2" style="margin:0"><h3>${safe(first.title)}</h3><p class="muted">${new Date(first.startsAt).toLocaleString('ar')}</p>
    <p>${safe(first.description||'')}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${first.liveUrl?`<a class="btn primary" href="/session-room.html?id=${first.id}">الجلسة</a>`:''}<a class="btn" href="/sessions.html">التصويت على الموضوع</a></div></div>`;
  const container=document.querySelector('.container');const articles=document.querySelector('#articlesContainer')?.closest('.section');
  if(container && articles) container.insertBefore(section,articles);
}
function safe(s){return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
