import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/+esm';

const conf = window.SAWTNA;
const supabase = createClient(conf.SUPABASE_URL, conf.SUPABASE_ANON);

const els = {
  speakers: document.getElementById('speakerSelect'),
  mics: document.getElementById('micSelect'),
  status: document.getElementById('statusMsg'),
  textBox: document.getElementById('textBox'),
  btnStart: document.getElementById('btnStart'),
  btnStop: document.getElementById('btnStop'),
  btnUpload: document.getElementById('btnUpload'),
  timer: document.getElementById('timer'),
  preview: document.getElementById('preview'),
  meterBar: document.getElementById('meterBar'),
  wave: document.getElementById('wave')
};

let mediaStream, mediaRecorder, audioChunks=[], audioBlob=null;
let audioCtx, analyser, source, rafId;
let startTime=0, timerInt=null;
let currentText=null;

init();

async function init(){
  await fillSpeakers();
  await fillMics();
  await pickText();
  meterSetup();
  bind();
}

function bind(){
  els.btnStart.onclick = startRecording;
  els.btnStop.onclick = stopRecording;
  els.btnUpload.onclick = uploadRecording;
}

async function fillSpeakers(){
  const { data, error } = await supabase.from('speakers').select('id,name').order('name');
  if(error){ console.error(error); els.status.textContent='تعذر جلب المتحدثين'; return; }
  els.speakers.innerHTML = data.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
}

async function fillMics(){
  try{
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter(d=>d.kind==='audioinput');
    els.mics.innerHTML = inputs.map((d,i)=>`<option value="${d.deviceId}">${d.label||('ميكروفون #' + (i+1))}</option>`).join('');
  }catch(e){ console.warn('No devices enum', e); }
}

async function pickText(){
  els.textBox.textContent = 'جارِ جلب النص…';
  const { data, error } = await supabase
    .from('texts')
    .select('id,code,content,record_count,max_recordings')
    .lt('record_count', 9999)    // حرّر السقف لاحقًا
    .order('created_at', { ascending:false })
    .limit(1);
  if(error || !data || !data.length){
    els.textBox.textContent = 'النص غير متاح حالياً. حاول لاحقاً.';
    currentText=null;
    return;
  }
  currentText = data[0];
  els.textBox.textContent = data[0].content;
}

function meterSetup(){
  const canvas = els.wave;
  const ctx = canvas.getContext('2d');
  const DPR = window.devicePixelRatio || 1;
  function resize(){ canvas.width = canvas.clientWidth * DPR; canvas.height = canvas.clientHeight * DPR; }
  resize(); window.addEventListener('resize', resize);

  function draw(){
    if(!analyser){ ctx.clearRect(0,0,canvas.width,canvas.height); rafId = requestAnimationFrame(draw); return; }
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.lineWidth = 2 * DPR;
    ctx.strokeStyle = 'rgba(0,224,182,.9)';
    ctx.beginPath();
    const slice = canvas.width / bufferLength;
    let x=0;
    for (let i=0;i<bufferLength;i++){
      const v = dataArray[i]/128.0;
      const y = v * canvas.height/2;
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
      x += slice;
    }
    ctx.lineTo(canvas.width, canvas.height/2);
    ctx.stroke();
    rafId = requestAnimationFrame(draw);
  }
  rafId = requestAnimationFrame(draw);
}

async function startRecording(){
  try{
    const deviceId = els.mics.value || undefined;
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: deviceId ? {exact: deviceId} : undefined, noiseSuppression:true, echoCancellation:true, autoGainControl:true, sampleRate:48000 },
      video: false
    });
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    source = audioCtx.createMediaStreamSource(mediaStream);
    analyser.fftSize = 2048;
    source.connect(analyser);

    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
    audioChunks = [];
    mediaRecorder.ondataavailable = e => e.data.size && audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      els.preview.src = URL.createObjectURL(audioBlob);
    };
    mediaRecorder.start();

    startTime = Date.now();
    timerInt = setInterval(updateTimer, 200);
    els.status.textContent = 'يسجل الآن…';
  }catch(e){
    console.error(e);
    els.status.textContent = 'تعذر بدء التسجيل. راجع صلاحيات الميكروفون.';
  }
}

function stopRecording(){
  try{
    mediaRecorder && mediaRecorder.state !== 'inactive' && mediaRecorder.stop();
    mediaStream && mediaStream.getTracks().forEach(t=>t.stop());
    clearInterval(timerInt);
    els.status.textContent = 'تم الإيقاف. راجع المعاينة ثم احفظ.';
  }catch(e){ console.warn(e); }
}

function updateTimer(){
  const sec = Math.floor((Date.now()-startTime)/1000);
  const m = String(Math.floor(sec/60)).padStart(2,'0');
  const s = String(sec%60).padStart(2,'0');
  els.timer.textContent = `${m}:${s}`;
  const pct = Math.min(100, Math.max(5, Math.floor((sec%10)*10)));
  els.meterBar.style.width = pct + '%';
}

async function uploadRecording(){
  if(!audioBlob){ els.status.textContent='سجل أولاً.'; return; }
  if(!currentText){ els.status.textContent='لا يوجد نص نشط.'; return; }
  const spId = els.speakers.value;
  if(!spId){ els.status.textContent='اختر اسم المتحدث.'; return; }

  const fileName = `rec_${spId}_${currentText.id}_${Date.now()}.webm`;
  const arrayBuffer = await audioBlob.arrayBuffer();
  const { data: up, error: upErr } = await supabase.storage
    .from(conf.BUCKET)
    .upload(fileName, new Blob([arrayBuffer], {type:'audio/webm'}), { upsert:false });
  if(upErr){ els.status.textContent='تعذر رفع الملف'; console.error(upErr); return; }

  const { data: pub } = supabase.storage.from(conf.BUCKET).getPublicUrl(fileName);
  const fileUrl = pub?.publicUrl;

  const durationMs = (Date.now()-startTime);
  const { error: insErr } = await supabase.from('recordings').insert({
    speaker_id: spId, text_id: currentText.id, status:'pending',
    storage_path: fileName, file_url: fileUrl, duration_ms: durationMs
  });
  if(insErr){ els.status.textContent='تعذر حفظ السجل.'; console.error(insErr); return; }

  els.status.textContent='تم الحفظ. 👍 سيتم جلب النص التالي…';
  await pickText();
  audioBlob=null; els.preview.src=''; els.timer.textContent='00:00';
}
