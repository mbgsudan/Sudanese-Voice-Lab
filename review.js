import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/+esm';

if (localStorage.getItem('sawtna:isAdmin') !== '1') location.href='admin.html';

const supabase = createClient(window.SAWTNA.SUPABASE_URL, window.SAWTNA.SUPABASE_ANON);

const els = {
  list: document.getElementById('list'),
  empty: document.getElementById('empty'),
  filter: document.getElementById('filterStatus'),
  search: document.getElementById('searchSpeaker'),
  reload: document.getElementById('btnReload'),
  export: document.getElementById('btnExport'),
  logout: document.getElementById('btnLogout')
};

els.logout.onclick = () => { localStorage.removeItem('sawtna:isAdmin'); location.href='admin.html'; };
els.reload.onclick = load;
els.filter.onchange = load;
els.search.oninput = () => { clearTimeout(window._t); window._t=setTimeout(load,300); };
els.export.onclick = exportCSV;

function safe(v){ return v==null?'':v; }
function arStatus(s){ return s==='approved'?'مقبولة':(s==='rejected'?'مرفوضة':'قيد المراجعة'); }

async function exportCSV(){
  const rows = await fetchRows(true);
  const csv = [
    ['id','speaker','text_code','status','duration_ms','file_url','created_at'].join(',')
  ].concat(rows.map(r=>[r.id,safe(r.speakers?.name),r.texts?.code,r.status,r.duration_ms,r.file_url,r.created_at]
    .map(x=>`"${(x??'').toString().replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='sawtna_records.csv'; a.click();
}

async function fetchRows(all=false){
  const status = els.filter.value;
  const q = supabase.from('recordings')
    .select('id,speaker_id,text_id,status,duration_ms,file_url,created_at,speakers(name),texts(code,content)')
    .order('created_at',{ascending:false}).limit(all?2000:120);
  if(status!=='all') q.eq('status',status);
  const { data, error } = await q;
  if(error){ console.error(error); return []; }
  const term = els.search.value.trim();
  if(!term) return data;
  return data.filter(r => (r.speakers?.name||'').includes(term));
}

function card(r){
  const el = document.createElement('article');
  el.className='card rec';
  el.innerHTML = `
    <div class="rec-meta">
      <div class="rec-title">${safe(r.speakers?.name)} • ${safe(r.texts?.code||'—')}</div>
      <div class="rec-status ${r.status}">الحالة: ${arStatus(r.status)}</div>
      <div class="rec-time">${new Date(r.created_at).toLocaleString('ar')}</div>
    </div>
    <audio controls src="${r.file_url}" preload="none"></audio>
    <details class="rec-text"><summary>النص</summary><p>${safe(r.texts?.content)}</p></details>
    <div class="row gap">
      <button class="btn success" data-act="approved">✔︎ قبول</button>
      <button class="btn danger" data-act="rejected">✖︎ رفض</button>
      <button class="btn ghost" data-act="pending">↺ إعادة للمراجعة</button>
    </div>`;
  el.addEventListener('click', async (ev)=>{
    const act = ev.target.dataset.act; if(!act) return;
    const { error } = await supabase.from('recordings').update({status:act}).eq('id', r.id);
    if(error){ alert('خطأ أثناء التحديث'); } else load();
  });
  return el;
}

async function load(){
  els.list.innerHTML=''; els.empty.classList.add('hide');
  const rows = await fetchRows(false);
  if(!rows.length){ els.empty.classList.remove('hide'); return; }
  rows.forEach(r=>els.list.appendChild(card(r)));
}
load();
