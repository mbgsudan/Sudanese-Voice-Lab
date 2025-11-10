import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $=s=>document.querySelector(s);
const select=$('#speakerSelect'), ok=$('#okCnt'), rej=$('#rejCnt'), pen=$('#penCnt');
async function loadSpeakers(){
  const { data } = await supabase.from('speakers').select('name').order('name');
  if(data){ data.forEach(s=>{ const o=document.createElement('option'); o.value=o.textContent=s.name; select.appendChild(o); }); }
}
async function stats(){
  const name = select.value.trim();
  let q = supabase.from('recordings').select('status,speaker_name'); if(name) q=q.eq('speaker_name', name);
  const { data, error } = await q; if(error){ ok.textContent=rej.textContent=pen.textContent='?'; return; }
  let a=0,b=0,c=0; for(const r of data){ if(r.status==='approved') a++; else if(r.status==='rejected') b++; else c++; }
  ok.textContent=a; rej.textContent=b; pen.textContent=c; return data;
}
select.onchange=stats;
document.querySelector('#exportCsv').onclick = async ()=>{
  const data = await stats(); if(!data) return;
  const rows = [['name','status']].concat(data.map(r=>[r.speaker_name||'', r.status]));
  const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='sawtna_records.csv'; a.click(); URL.revokeObjectURL(url);
};
await loadSpeakers(); await stats();
supabase.channel('rec_stats').on('postgres_changes',{event:'*',schema:'public',table:'recordings'},()=>stats()).subscribe();
