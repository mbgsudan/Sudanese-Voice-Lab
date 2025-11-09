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
  const sp=await supabase.from('speakers').select('id,code,name').order('code'); const labels=(sp.data||[]).map(s=>s.code); const data=[];
  for(const s of (sp.data||[])){ const cnt=await supabase.from('recordings').select('id',{count:'exact', head:true}).eq('speaker_id', s.id); data.push(cnt.count||0); }
  const ctx=document.getElementById('bySpeaker'); new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'عدد التسجيلات',data}]} ,options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true}}}});
}
loadKPIs(); loadChart();
