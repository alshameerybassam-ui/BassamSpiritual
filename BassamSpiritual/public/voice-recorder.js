/*
  مسجل صوت مستقل للاستخدام في نموذج الطلب أو المحادثة.
  - التسجيل حقيقي عبر MediaRecorder.
  - التفريغ النصي اختياري عبر SpeechRecognition أثناء التسجيل.
  - لا يعتمد على Gemini.
*/
window.NourVoiceRecorder = function(root, options = {}) {
  const input = root.querySelector('[data-voice-input]');
  const status = root.querySelector('[data-voice-status]');
  const audio = root.querySelector('[data-voice-audio]');
  const recordBtn = root.querySelector('[data-voice-record]');
  const stopBtn = root.querySelector('[data-voice-stop]');
  const transcriptBox = root.querySelector('[data-voice-transcript]');
  const uploadBtn = root.querySelector('[data-voice-upload]');
  let recorder = null;
  let chunks = [];
  let recognition = null;
  let stream = null;
  let blob = null;

  function setStatus(text){ if(status) status.textContent=text; }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setStatus('المتصفح لا يدعم التسجيل الصوتي.');
      return;
    }
    stream = await navigator.mediaDevices.getUserMedia({audio:true});
    recorder = new MediaRecorder(stream, {mimeType: 'audio/webm'});
    chunks = [];
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      blob = new Blob(chunks, {type:'audio/webm'});
      if(audio) audio.src = URL.createObjectURL(blob);
      if(input) input.value = '';
      setStatus('تم التسجيل. يمكنك الاستماع ثم الإرسال.');
      if(stream) stream.getTracks().forEach(t=>t.stop());
      if(recognition) try{recognition.stop()}catch(_){}
    };
    recorder.start();
    setStatus('جاري التسجيل… تحدث بهدوء.');
    if(recordBtn) recordBtn.disabled=true;
    if(stopBtn) stopBtn.disabled=false;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(SR && transcriptBox){
      recognition = new SR();
      recognition.lang = 'ar-SA';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = e => {
        let finalText='';
        for(let i=e.resultIndex;i<e.results.length;i++) finalText += e.results[i][0].transcript;
        transcriptBox.value = (transcriptBox.value+' '+finalText).trim();
      };
      recognition.start();
    }
  }

  function stop(){
    if(recorder && recorder.state !== 'inactive') recorder.stop();
    if(recordBtn) recordBtn.disabled=false;
    if(stopBtn) stopBtn.disabled=true;
  }

  async function upload(requestId=null){
    if(!blob) return setStatus('سجل مقطعاً أولاً.');
    const reader = new FileReader();
    reader.onload = async () => {
      const token = localStorage.getItem('bassam_auth_token')||'';
      const r = await fetch('/api/v2/media/audio',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
        body:JSON.stringify({
          requestId,
          fileName:'voice.webm',
          mimeType:'audio/webm',
          base64:reader.result,
          transcript:transcriptBox?.value||''
        })
      });
      const d = await r.json();
      if(!r.ok) return setStatus(d.error||'تعذر رفع التسجيل.');
      setStatus('تم حفظ التسجيل بنجاح.');
      options.onUploaded?.(d.media);
    };
    reader.readAsDataURL(blob);
  }

  recordBtn?.addEventListener('click', start);
  stopBtn?.addEventListener('click', stop);
  uploadBtn?.addEventListener('click', () => upload(options.requestId||null));

  return {start,stop,upload,getBlob:()=>blob};
};
