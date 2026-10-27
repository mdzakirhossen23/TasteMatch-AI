
(() => {
'use strict';
const byId = id => document.getElementById(id);
const headings = {discover:['Discover','Cultural discovery, guided by your taste'], saved:['Saved discoveries','Your personal list'],how:['How It Works','Transparent recommendation steps'], settings:['Settings','Your local preferences']};
function page(name){document.querySelectorAll('.app-page').forEach(el=>el.classList.toggle('is-active',el.id==='page-'+name));document.querySelectorAll('.nav-btn').forEach(btn=>{const active=btn.dataset.page===name;btn.classList.toggle('selected',active);if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');});byId('pageHeading').textContent=t(headings[name][0]);byId('pageSubtitle').textContent=t(headings[name][1]);}
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>page(btn.dataset.page)));
const key='tastematch_saved_v1';const prefsKey='tastematch_prefs_v1';
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
let saved=read(key,[]); if(!Array.isArray(saved))saved=[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={movie:'Movies',book:'Books',artist:'Music artists',tv_show:'TV shows',podcast:'Podcasts',videogame:'Video games',destination:'Destinations',place:'Places'};
function provenance(src){const source=String(src||'');if(/groq/i.test(source))return ['Groq AI','AI-generated; not verified by Qloo'];if(/qloo/i.test(source))return ['Live Qloo Agent','Aggregate affinities, not personal predictions'];return ['Source not verified','Source was not recorded; verify before using as evidence'];}
function drawSaved(){
byId('savedCount').textContent=`${saved.length} ${t(saved.length===1?'saved recommendation':'saved recommendations')}`;
byId('clearSaved').disabled=!saved.length;
byId('savedItems').innerHTML=saved.length?saved.map((it,i)=>{const [label,notice]=provenance(it.source);return `<article class="card saved-card"><div class="rank saved-source">${esc(t(label))}</div><h3>${esc(it.name||'')}</h3><p><b>${esc(t('Category:'))}</b> ${esc(t(types[it.type]||it.type||'Unknown'))} · <b>${esc(t('Based on:'))}</b> ${esc(it.seed||'')}</p><p class="saved-caveat">${esc(t(notice))}</p><div class="saved-actions"><button type="button" class="save-item" data-remove="${i}">${esc(t('Remove'))}</button></div></article>`}).join(''):`<div class="empty-state">${esc(t('No saved discoveries yet. Discover something and select Save.'))}</div>`;
}
byId('savedItems').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;saved.splice(Number(b.dataset.remove),1);localStorage.setItem(key,JSON.stringify(saved));drawSaved();});
byId('clearSaved').addEventListener('click',()=>{if(saved.length&&!confirm(t('Clear all saved recommendations?')))return;saved=[];localStorage.setItem(key,'[]');drawSaved()});
let lastSeed='',lastType='',lastSource='';
byId('form').addEventListener('submit',()=>{lastSeed=byId('favorite').value.trim();lastType=byId('type').value;lastSource=byId('groqBtn').classList.contains('active')?'Groq AI':'Qloo Live';},true);
const cards=byId('cards');
cards.addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(!b)return;const name=b.closest('.card')?.querySelector('h3')?.textContent;if(!name)return;const item={name,seed:lastSeed,type:lastType,source:lastSource};if(!saved.some(s=>s.name===item.name&&s.seed===item.seed&&s.type===item.type&&s.source===item.source)){saved.unshift(item);saved=saved.slice(0,150);localStorage.setItem(key,JSON.stringify(saved));drawSaved();}b.textContent=t('Saved ✓');b.disabled=true;});
const observer=new MutationObserver(()=>{cards.querySelectorAll('.card').forEach(card=>{if(card.querySelector('.save-item') || card.querySelector('.groq-answer'))return;const b=document.createElement('button');b.type='button';b.className='save-item';b.dataset.save='';b.textContent=t('☆ Save');card.appendChild(b);});});observer.observe(cards,{childList:true});
const prefs=read(prefsKey,{mode:'live',type:'movie'});byId('defaultMode').value=prefs.mode==='groq'?'groq':'live';byId('defaultType').value=Object.keys({movie:1,book:1,artist:1,tv_show:1,podcast:1,videogame:1,destination:1,place:1}).includes(prefs.type)?prefs.type:'movie';byId('type').value=byId('defaultType').value;
if(prefs.mode==='groq')byId('groqBtn').click();
byId('settingsForm').addEventListener('submit',e=>{e.preventDefault();const mode=byId('defaultMode').value,type=byId('defaultType').value;localStorage.setItem(prefsKey,JSON.stringify({mode,type}));byId('type').value=type;byId(mode==='groq'?'groqBtn':'liveBtn').click();byId('settingsNotice').textContent=t('Saved on this device ✓');});
window.refreshLocalizedUI=()=>{const current=document.querySelector('.nav-btn.selected')?.dataset.page||'discover';page(current);drawSaved();document.querySelectorAll('#cards .save-item').forEach(b=>{b.textContent=t(b.disabled?'Saved ✓':'☆ Save')});};
drawSaved();
})();

