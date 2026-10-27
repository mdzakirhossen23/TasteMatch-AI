const $=id=>document.getElementById(id);
let mode='live',groqHistory=[],groqModel='AI',groqBusy=false;
let groqContext={seed:'',type:'movie'};

function escapeHtml(v){return String(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}
function qlooErrorMessage(status){
 const language=window.currentLanguage||'en';
 const messages={
  notFound:{en:'No Qloo recommendations were found for this term. Try another title, artist, or keyword.',bn:'এই শব্দটির জন্য কোনো Qloo সুপারিশ পাওয়া যায়নি। অন্য কোনো শিরোনাম, শিল্পী বা কীওয়ার্ড চেষ্টা করুন।',ar:'لم يتم العثور على توصيات من Qloo لهذا المصطلح. جرّب عنوانًا أو فنانًا أو كلمة مفتاحية أخرى.',nl:'Er zijn geen Qloo-aanbevelingen voor deze term gevonden. Probeer een andere titel, artiest of zoekterm.',de:'Für diesen Begriff wurden keine Qloo-Empfehlungen gefunden. Versuche einen anderen Titel, Künstler oder Suchbegriff.'},
  busy:{en:'Qloo is receiving many requests right now. Please try again in a moment.',bn:'Qloo-তে এখন অনেক অনুরোধ আসছে। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।',ar:'يتلقى Qloo العديد من الطلبات الآن. يرجى المحاولة مرة أخرى بعد قليل.',nl:'Qloo ontvangt momenteel veel verzoeken. Probeer het zo meteen opnieuw.',de:'Qloo erhält gerade viele Anfragen. Bitte versuche es gleich noch einmal.'},
  unavailable:{en:'Qloo is temporarily unavailable. Please try again in a moment.',bn:'Qloo সাময়িকভাবে পাওয়া যাচ্ছে না। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।',ar:'Qloo غير متاح مؤقتًا. يرجى المحاولة مرة أخرى بعد قليل.',nl:'Qloo is tijdelijk niet beschikbaar. Probeer het zo meteen opnieuw.',de:'Qloo ist vorübergehend nicht verfügbar. Bitte versuche es gleich noch einmal.'}
 };
 const kind=status===400||status===404?'notFound':status===429?'busy':'unavailable';
 return messages[kind][language]||messages[kind].en;
}
function showGroqComposer(show){$('groqChatForm').hidden=!show;$('groqChatInput').disabled=!show||groqBusy;$('groqChatSend').disabled=!show||groqBusy;}
function setGroqSessionLayout(active){$('page-discover').classList.toggle('groq-session-active',Boolean(active));}
function renderGroqConversation(){
 const cards=$('cards');cards.classList.add('groq-chat-log');
 cards.innerHTML=groqHistory.map(item=>item.role==='user'
  ?`<article class="groq-message groq-message-user"><div class="groq-message-label">${escapeHtml(t('You'))}</div><p>${escapeHtml(item.content)}</p></article>`
  :`<article class="groq-message groq-message-ai"><div class="groq-message-label">Groq AI · ${escapeHtml(item.model||groqModel)}</div><div class="groq-answer">${window.TasteMatchMarkdown.render(item.content)}</div></article>`).join('');
 const hasReply=groqHistory.some(item=>item.role==='assistant');cards.scrollTop=cards.scrollHeight;setGroqSessionLayout(mode==='groq'&&hasReply);showGroqComposer(hasReply);
}
function resetDiscoveryView(){const cards=$('cards');cards.classList.remove('groq-chat-log');cards.innerHTML='';setGroqSessionLayout(false);showGroqComposer(false);$('message').textContent=t('Enter a favorite to explore recommendations.');}
function setMode(next){
 mode=next==='groq'?'groq':'live';
 for(const [name,id] of [['live','liveBtn'],['groq','groqBtn']]){const el=$(id);el.classList.toggle('active',mode===name);el.setAttribute('aria-pressed',String(mode===name));}
 if(mode==='groq'){
  $('stateText').textContent=t('Groq AI chat: discover suggestions, then ask follow-up questions.');$('source').textContent='Groq AI';
  if(groqHistory.length){renderGroqConversation();$('message').textContent=t('Continue the conversation below.');}else resetDiscoveryView();
 }else{
  $('stateText').textContent=t('Live Qloo Agent: real API recommendations from Qloo.');$('source').textContent=t('Live Qloo');resetDiscoveryView();
 }
}

async function requestGroq(message,{fresh=false,action='chat'}={}){
 if(groqBusy)return;
 const previous=(fresh?[]:groqHistory).slice(-8);
 if(fresh)groqHistory=[];
 groqHistory.push({role:'user',content:message});groqBusy=true;renderGroqConversation();showGroqComposer(false);$('message').textContent=t('Groq AI is replying…');
 try{
  const response=await fetch('./groq-chat.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:window.currentLanguage||'en',message,history:previous,subject:groqContext.type,goal:`Cultural discovery conversation based on ${groqContext.seed||'the user request'}; no Qloo data`,action})});
  const ct=response.headers.get('content-type')||'';if(!ct.includes('application/json'))throw Error('Groq endpoint is unavailable. Check groq-chat.php deployment.');
  const j=await response.json();if(!response.ok)throw Error(j.error||'Groq AI request failed');
  groqModel=j.model||'AI';groqHistory.push({role:'assistant',content:j.answer||'',model:groqModel});renderGroqConversation();$('source').textContent='Groq AI';$('message').textContent=t('Continue the conversation below.');
 }catch(err){$('message').textContent=err.message;renderGroqConversation();throw err;}
 finally{groqBusy=false;showGroqComposer(mode==='groq'&&groqHistory.some(item=>item.role==='assistant'));}
}

$('liveBtn').onclick=()=>setMode('live');$('groqBtn').onclick=()=>setMode('groq');
fetch('./api.php?action=status',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('API status unavailable');const content=r.headers.get('content-type')||'';if(!content.includes('application/json'))throw Error('API backend unavailable');return r.json()}).then(data=>{if(mode==='live')$('stateText').textContent=data.live?t('Qloo API configured. Ready for live discovery.'):t('Qloo API is not ready. Check the server configuration.')}).catch(()=>{if(mode==='live')$('stateText').textContent=t('Server status unavailable.')});

$('form').onsubmit=async e=>{
 e.preventDefault();const seed=$('favorite').value.trim(),type=$('type').value;if(!seed)return;$('go').disabled=true;
 try{
  if(mode==='groq'){
   groqContext={seed,type};const prompt=`I like ${seed}. Suggest up to 4 ${type.replace('_',' ')} recommendations and explain each briefly.`;
   await requestGroq(prompt,{fresh:true,action:'suggest'});return;
  }
  showGroqComposer(false);const cards=$('cards');cards.classList.remove('groq-chat-log');cards.innerHTML='';$('message').textContent=t('Discovering connections…');
  const r=await fetch('./api.php?action=discover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seed,type})});const contentType=r.headers.get('content-type')||'';if(!contentType.includes('application/json'))throw Object.assign(Error('Qloo unavailable'),{qlooStatus:r.status||503});let j;try{j=await r.json()}catch{throw Object.assign(Error('Qloo unavailable'),{qlooStatus:r.status||503})};if(!r.ok){const upstreamError=String(j.error||'');const upstreamStatus=/HTTP\s*(?:400|404)|\/v2\/insights failed/i.test(upstreamError)?400:r.status;throw Object.assign(Error('Qloo request failed'),{qlooStatus:upstreamStatus});}const names=j.results||[],source=t('Live Qloo API recommendations');$('source').textContent=t('Qloo Live');$('message').textContent=names.length?source+' '+t('based on')+' “'+seed+'”.':t('No recommendations found. Try another favorite.');cards.innerHTML=names.map((item,i)=>`<article class="card"><div class="rank">${t('DISCOVERY')} ${String(i+1).padStart(2,'0')}</div><h3>${escapeHtml(item.name)}</h3><p>${t('Suggested by Qloo based on taste affinity with your selected favorite.')}</p></article>`).join('');
 }catch(err){if(mode==='live')$('message').textContent=qlooErrorMessage(err.qlooStatus||0);}finally{$('go').disabled=false;}
};

$('groqChatForm').onsubmit=async e=>{e.preventDefault();if(mode!=='groq'||groqBusy)return;const input=$('groqChatInput'),message=input.value.trim();if(!message)return;input.value='';try{await requestGroq(message,{action:'follow-up'})}catch{input.value=message}input.focus();};
$('groqChatInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('groqChatForm').requestSubmit();}});
$('groqChatClear').onclick=()=>{groqHistory=[];groqModel='AI';$('cards').classList.remove('groq-chat-log');$('cards').innerHTML='';setGroqSessionLayout(false);showGroqComposer(false);$('message').textContent=t('Enter a favorite to start a new Groq conversation.');$('favorite').focus();};
window.updateTasteStatus=()=>{if($('stateText'))$('stateText').textContent=t(mode==='groq'?'Groq AI chat: discover suggestions, then ask follow-up questions.':'Live Qloo Agent: real API recommendations from Qloo.');};

