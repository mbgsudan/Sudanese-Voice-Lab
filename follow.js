import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/+esm';

const supabase = createClient(window.SAWTNA.SUPABASE_URL, window.SAWTNA.SUPABASE_ANON);

const els = {
  speakers: document.getElementById('speakerSelect'),
  tbody: document.getElementById('tbody'),
  cntApproved: document.getElementById('cntApproved'),
  cntRejected: document.getElementById('cntRejected'),
  cntPending: document.getElementById('cntPending'),
  btnExport: document.getElementById('btnExport')
};

els.speakers.onchange = load;
els.btnExport.onclick = exportCSV;

init();

async function init(){
  await fillSpeakers();
  await load();
}

async function fillSpeakers(){
  const { data, error } = await supabase.from('speakers').select('id,name').order('name');
  if(error){ console.error(error); return; }
  els.speakers.innerHTML = '<option value="">كل المتحدثين</option>' + data.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
}

function arStatus(s){ return s==='approved'?'مقبولة':(s==='rejected'?'مرفوضة':'قيد المراجعة'); }

async function load(){
  const sp = els.speakers.value;
  let q = supabase.from('recordings')
    .select('id,created_at,status,duration_ms,file_url,speakers(name),texts(code)')
    .order('created_at',{ascending:false}).limit(400);
  if(sp) q.eq('speaker_id', sp);
  const { data, error } = await q;
  if(error){ console.error(error); return; }

  const a = data.filter(r=>r.status==='approved').length;
  const r = data.filter(r=>r.status==='rejected').length;
  const p = data.filter(r=>r.status!=='approved' && r.status!=='rejected').length;
  els.cntApproved.textContent = a; els.cntRejected.textContent = r; els.cntPending.textContent = p;

  els.tbody.innerHTML = data.map(row=>`
    <tr>
      <td>${new Date(row.created_at).toLocaleString('ar')}</td>
      <td>${row.speakers?.name||''}</td>
      <td>${row.texts?.code||''}</td>
      <td class="${row.status}">${arStatus(row.status)}</td>
      <td>${Math.round((row.duration_ms||0)/1000)}ث</td>
      <td><a class="btn ghost sm" href="${row.file_url}" target="_blank">فتح</a></td>
    </tr>`).join('');
}

async function exportCSV(){
  const sp = els.speakers.value;
  let q = supabase.from('recordings')
    .select('created_at,speakers(name),texts(code),status,duration_ms,file_url')
    .order('created_at',{ascending:false}).limit(2000);
  if (sp) q.eq('speaker_id', sp);
  const { data, error } = await q;
  if(error){ alert('خطأ في التصدير'); return; }

  const csv = [
    ['created_at','speaker','text_code','status','duration_ms','file_url'].join(',')
  ].concat(data.map(r=>[r.created_at, r.speakers?.name||'', r.texts?.code||'', r.status, r.duration_ms||0, r.file_url||'']
    .map(x=>`"${(x??'').toString().replace(/"/g,'""')}"`).join(','))).join('\n');

  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sawtna_follow_${Date.now()}.csv`; a.click();
}
