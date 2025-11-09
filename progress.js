import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/+esm';
const supabase=createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const totalEl=document.getElementById('k-total'), appEl=document.getElementById('k-approved'), rejEl=document.getElementById('k-rejected');

async function loadKPIs(){
  const all=await supabase.from('recordings').select('id',{count:'exact', head:true});
  const app=await supabase.from('recordings').select('id',{count:'exact', head:true}).eq('qa_status','approved');
  const rej=await supabase.from('recordings').select('id',{count:'exact', head:true}).eq('qa_status','rejected');
  totalEl.textContent=all.count??0; appEl.textContent=app.count??0; rejEl.textContent=rej.count??0;
}

async function loadChart(){
  const sp=await supabase.from('speakers').select('id,code,name').order('code');
  const labels=(sp.data||[]).map(s=> s.code);
  const data=[];
  for(const s of (sp.data||[])){
    const cnt=await supabase.from('recordings').select('id',{count:'exact', head:true}).eq('speaker_id', s.id);
    data.push(cnt.count||0);
  }
  const ctx=document.getElementById('bySpeaker');
  new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'عدد التسجيلات',data}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true}}}});
}

document.getElementById('exportCsv').onclick = async ()=>{
  // Pull a joined view for export
  const rec = await supabase.from('recordings').select('id, speaker_id, text_id, storage_path, qa_status, created_at').limit(10000).order('created_at', {ascending:true});
  if(rec.error){ alert('فشل الجلب'); return; }
  const speakers = await supabase.from('speakers').select('id, code, name');
  const texts = await supabase.from('texts').select('id, code, content');

  const spMap = new Map((speakers.data||[]).map(s => [s.id, s]));
  const txMap = new Map((texts.data||[]).map(t => [t.id, t]));

  const rows = (rec.data||[]).map(r => ({
    id: r.id,
    speaker_code: spMap.get(r.speaker_id)?.code || '',
    speaker_name: spMap.get(r.speaker_id)?.name || '',
    text_code: txMap.get(r.text_id)?.code || '',
    text_content: txMap.get(r.text_id)?.content || '',
    qa_status: r.qa_status,
    storage_path: r.storage_path,
    created_at: r.created_at
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "recordings");
  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  XLSX.writeFile(wb, `sawtna_export_${ts}.xlsx`);
};

loadKPIs();
loadChart();
