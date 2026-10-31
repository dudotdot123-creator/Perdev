'use strict';

/* LANGUAGE TEXTS ARE KEPT TOGETHER FOR EASY EDITING. */
const TXT = {
 tl:{
  sub:'Gabay sa pagkuha ng impormasyon tungkol sa pamilya.',
  privacy:'Ilagay lamang ang impormasyong kaya mong ibahagi. Ise-save ito sa Google Sheet kapag pinindot mo ang submit. Maaari ka ring mag-download ng CSV backup.',
  generation:'Piliin ang henerasyon ng sasagot',intro:'Pumili ng henerasyon at basahin ang paalala bago magpatuloy.',
  invalid:'Hindi pwedeng sumagot ang mga lolo’t-lola (ika-1 henerasyon) at mga apo (ika-4 henerasyon) para sa survey na ito.',
  name:'Buong pangalan',age:'Edad',gender:'Kasarian',next:'Susunod',back:'Bumalik',save:'Ipadala sa Google Sheet',csv:'I-download ang CSV',review:'Suriin ang mga sagot',add:'Magdagdag ng miyembro',member:'Impormasyon ng miyembro ng pamilya',
  gen1:'Ika-1 henerasyon',gen2:'Ika-2 henerasyon',gen3:'Ika-3 henerasyon',gen4:'Ika-4 henerasyon',
  desc2:['Nanay at tatay mo','Ikaw, asawa mo, mga kapatid mo at mga asawa nila','Mga anak mo at mga anak ng iyong mga kapatid','Mga apo mo at mga apo ng iyong mga kapatid'],
  desc3:['Mga lolo at lola mo','Nanay, tatay mo at mga kapatid nila kasama ang mga asawa nila','Ikaw, iyong mga kapatid, at mga anak ng mga kapatid ng iyong mga magulang (iyong mga pinsan)','Mga anak mo at mga anak ng iyong mga pinsan'],
  detail:'Dito ay ilalagay mo ang impormasyon tungkol sa miyembro ng pamilya na pinili mo.',
  child:'Ilagay ang impormasyon tungkol sa ___',childNamed:'Ilagay ang impormasyon tungkol kay ',
  sending:'Nagsasave…',sent:'Matagumpay na naisave sa Google Sheet.',sendError:'Hindi naipadala. Subukan muli o i-download ang CSV backup.',
  progress:'Hakbang'
 },
 en:{
  sub:'A guide to collecting family information.',
  privacy:'Only enter information you are comfortable sharing. Responses are sent to Google Sheets when submitted. You can also download a CSV backup.',
  generation:'Choose the respondent generation',intro:'Choose a generation and read the note before continuing.',
  invalid:'Grandparents (generation 1) and grandchildren (generation 4) cannot answer this survey.',
  name:'Full name',age:'Age',gender:'Gender',next:'Next',back:'Back',save:'Submit to Google Sheets',csv:'Download CSV',review:'Review answers',add:'Add family member',member:'Family member information',
  gen1:'Generation 1',gen2:'Generation 2',gen3:'Generation 3',gen4:'Generation 4',
  desc2:['Your mother and father','You, your spouse, your siblings, and their spouses','Your children and your siblings’ children','Your grandchildren and your siblings’ grandchildren'],
  desc3:['Your grandparents','Your parents and their siblings, including their spouses','You, your siblings, and your cousins','Your children and your cousins’ children'],
  detail:'Enter information about the family member you selected.',
  child:'Enter information about ___',childNamed:'Enter information about ',
  sending:'Saving…',sent:'Successfully saved to Google Sheets.',sendError:'Could not submit. Try again or download the CSV backup.',
  progress:'Step'
 }
};
const WEB_APP_URL='https://script.google.com/macros/s/AKfycbx7tLvi0BBmRNTmcv6KAYQFMrwRRdkB7zcpLm3ln6cX-itzraFqu3YO8lNhFo8wBLMq/exec';
const state={lang:'tl',generation:'',informant:{name:'',age:'',gender:''},members:[],page:0};
const $=id=>document.getElementById(id);
function t(k){return TXT[state.lang][k]||k}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function genDescription(){return state.generation==='2'?TXT[state.lang].desc2:TXT[state.lang].desc3}
function render(){
 $('siteSub').textContent=t('sub');$('privacy').textContent=t('privacy');
 $('langBtn').textContent=state.lang==='tl'?'English':'Tagalog';
 const total=3+state.members.length,step=Math.min(state.page+1,total);
 $('stepLabel').textContent=`${t('progress')} ${step} / ${total}`;$('pct').textContent=Math.round(step/total*100)+'%';$('fill').style.width=(step/total*100)+'%';
 if(state.page===0){$('app').innerHTML=`<h2>${t('generation')}</h2><p class="intro">${t('intro')}</p><div class="note">${t('invalid')}</div><div class="field"><label>${t('generation')}</label><label class="choice"><input type="radio" name="gen" value="2" ${state.generation==='2'?'checked':''}> ${t('gen2')}</label><label class="choice"><input type="radio" name="gen" value="3" ${state.generation==='3'?'checked':''}> ${t('gen3')}</label><label class="choice"><input type="radio" name="gen" value="1" ${state.generation==='1'?'checked':''}> ${t('gen1')}</label><label class="choice"><input type="radio" name="gen" value="4" ${state.generation==='4'?'checked':''}> ${t('gen4')}</label></div><div id="desc" class="note">${state.generation?genDescription().map((x,i)=>`${i+1}. ${escapeHtml(x)}`).join('<br>'):''}</div><div class="actions"><span></span><button id="next">${t('next')}</button></div>`;
 $('app').querySelectorAll('[name=gen]').forEach(el=>el.onchange=()=>{state.generation=el.value;$('desc').innerHTML=genDescription().map((x,i)=>`${i+1}. ${escapeHtml(x)}`).join('<br>');if(!['2','3'].includes(el.value))alert(t('invalid'));});
 $('next').onclick=()=>{if(!['2','3'].includes(state.generation)){alert(t('invalid'));return}state.page=1;render()};return}
 if(state.page===1){$('app').innerHTML=`<h2>${t('name')}</h2><p class="intro">Ilagay ang impormasyon ng taong sumasagot.</p>${input('name',t('name'),state.informant.name)}${input('age',t('age'),state.informant.age,'number')}${input('gender',t('gender'),state.informant.gender)}<div class="actions"><button class="secondary" id="back">${t('back')}</button><button id="next">${t('next')}</button></div>`;wireFields(state.informant);$('back').onclick=()=>{state.page=0;render()};$('next').onclick=()=>{state.page=2;render()};return}
 if(state.page===2){$('app').innerHTML=`<h2>${t('member')}</h2><p class="intro">${t('detail')}</p><div class="note">${t('detail')}</div>${input('memberName','Pangalan / Name','')}${input('memberGeneration','Henerasyon / Generation','')}${input('relationship','Relasyon sa pamilya / Relationship','')}${input('age','Edad / Age','')}${input('gender','Kasarian / Gender','')}<div class="actions"><button class="secondary" id="back">${t('back')}</button><div class="right"><button id="add">${t('add')}</button><button id="review">${t('review')}</button></div></div>`;$('back').onclick=()=>{state.page=1;render()};$('add').onclick=()=>{let m={};['memberName','memberGeneration','relationship','age','gender'].forEach(k=>m[k]=$(k).value);if(!m.memberName.trim()){alert('Ilagay ang pangalan.');return}state.members.push(m);state.page=2;render()};$('review').onclick=()=>{state.page=3;render()};return}
 $('app').innerHTML=`<h2>${t('review')}</h2><p>${state.members.length} recorded family member(s).</p><pre>${escapeHtml(JSON.stringify({informant:state.informant,members:state.members},null,2))}</pre><div id="status"></div><div class="actions"><button class="secondary" id="back">${t('back')}</button><div class="right"><button id="csv">${t('csv')}</button><button id="send">${t('save')}</button></div></div>`;$('back').onclick=()=>{state.page=2;render()};$('csv').onclick=downloadCsv;$('send').onclick=send;
}
function input(id,label,value,type='text'){return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${escapeHtml(value)}"></div>`}
function wireFields(obj){['name','age','gender'].forEach(k=>$(k).oninput=()=>obj[k]=$(k).value)}
function downloadCsv(){const rows=[['Informant name','Informant age','Informant gender','Generation','Member name','Member generation','Relationship','Age','Gender'],...state.members.map(m=>[state.informant.name,state.informant.age,state.informant.gender,state.generation,m.memberName,m.memberGeneration,m.relationship,m.age,m.gender])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\\r\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));a.download='family-genogram-survey.csv';a.click();URL.revokeObjectURL(a.href)}
async function send(){const status=$('status');if(!state.members.length){status.innerHTML=`<div class="error">Magdagdag muna ng kahit isang family member.</div>`;return}if(!WEB_APP_URL.startsWith('https://script.google.com/macros/s/')){status.innerHTML='<div class="error">Ilagay muna ang deployed Apps Script Web App URL sa script.js.</div>';return}status.innerHTML=`<div class="note">${t('sending')}</div>`;try{await fetch(WEB_APP_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({informant:state.informant,generation:state.generation,records:state.members})});status.innerHTML=`<div class="success">${t('sent')} (Tingnan ang Google Sheet para makumpirma.)</div>`}catch(e){status.innerHTML=`<div class="error">${t('sendError')}</div>`}}
$('langBtn').onclick=()=>{state.lang=state.lang==='tl'?'en':'tl';render()};render();
