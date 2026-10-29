(() => {
"use strict";
const NOTE="Please provide detailed, complete information or select the correct option.";
const GENDERS=["Male","Female","Gay","Lesbian","Other (specify)"];
const LIFE=["Alive","Deceased"];
const CHILD=["Adopted","Foster child","Pregnancy","Miscarriage","Abortion","Identical twin","Fraternal twin","Deceased","None of these","Other (specify)"];
const MEDICAL=["Heart Disease","Breast Cancer","Diabetes","Down Syndrome","Depression","Smoking","Drug Addiction","Alcoholic","No known condition","Other (specify)"];
const REL=["Single","Girlfriend/Boyfriend","Married","Separated","Divorced — now single (no new partner)","Divorced","Widowed","Live-in","Complicated","Very close","LDR","Committed","Sexual relationship","Mutual-relationship","Divorced annulled by law or paper","Divorced without official law or paper","Other (specify)"];
const BONDS=["Hate","Distant","Violence","Emotional abuse","Manipulative","Controlling","Physical abuse","Sexual abuse","Neglected","Best-friend","In-love","Estranged","Other (specify)"];
const PARTNER_STATUSES=new Set(["Girlfriend/Boyfriend","Married","Separated","Divorced","Live-in","Complicated","Very close","LDR","Committed","Sexual relationship","Mutual-relationship","Divorced annulled by law or paper","Divorced without official law or paper","Other (specify)"]);
const DIVORCED=new Set(["Divorced","Divorced annulled by law or paper","Divorced without official law or paper"]);
const $=id=>document.getElementById(id);
const pages=[...document.querySelectorAll(".page")];
let page=0, records=[], recNum=0, informant, person, partner, extra, childQuestion, childPartner, childCount, children=[];
function field(parent,labelText,type="text",options=[],full=false){
 const wrap=document.createElement("div");wrap.className="field"+(full?" full":"");
 const note=document.createElement("span");note.className="question-note";note.textContent=NOTE;wrap.append(note);
 const label=document.createElement("label");label.textContent=labelText;wrap.append(label);
 let control;
 if(type==="select"){control=document.createElement("select");let blank=document.createElement("option");blank.value="";blank.textContent="Select an option";control.append(blank);options.forEach(v=>{let o=document.createElement("option");o.value=v;o.textContent=v;control.append(o);});}
 else if(type==="checklist"){control=document.createElement("div");control.className="checklist";options.forEach(v=>{let l=document.createElement("label");l.className="check-option";let c=document.createElement("input");c.type="checkbox";c.value=v;l.append(c,document.createTextNode(v));control.append(l);});}
 else{control=document.createElement("input");control.type=type;if(type==="number"){control.min="0";control.step="1";}}
 label.append(control);parent.append(wrap);return{wrap,control};
}
function otherFor(wrap,select){const input=document.createElement("input");input.type="text";input.className="other-input hidden";input.placeholder="Specify other";input.setAttribute("aria-label","Other (specify)");wrap.append(input);const update=()=>{input.classList.toggle("hidden",select.value!=="Other (specify)");if(select.value!=="Other (specify)")input.value="";};select.addEventListener("change",update);update();return input;}
function otherForChecks(wrap,control){const input=document.createElement("input");input.type="text";input.className="other-input hidden";input.placeholder="Specify other";input.setAttribute("aria-label","Other (specify)");wrap.append(input);const update=()=>{const yes=[...control.querySelectorAll("input")].some(x=>x.checked&&x.value==="Other (specify)");input.classList.toggle("hidden",!yes);if(!yes)input.value="";};control.addEventListener("change",update);update();return input;}
function makeBase(parent,prefix=""){
 const name=field(parent,prefix+"Full Name"),age=field(parent,prefix+"Age","number"),gender=field(parent,prefix+"Gender","select",GENDERS),genderOther=otherFor(gender.wrap,gender.control);
 const life=field(parent,prefix+"Life-span","select",LIFE);life.control.value="Alive";
 const death=document.createElement("div");death.className="fields full hidden";death.style.gridColumn="1/-1";parent.append(death);
 const ageDeath=field(death,prefix+"Age at death","number"),cause=field(death,prefix+"Cause of death / notes");
 life.control.addEventListener("change",()=>{death.classList.toggle("hidden",life.control.value!=="Deceased");if(life.control.value!=="Deceased"){ageDeath.control.value="";cause.control.value="";}});
 const medical=field(parent,prefix+"Medical status (select all that apply)","checklist",MEDICAL,true),medicalOther=otherForChecks(medical.wrap,medical.control);
 const relationship=field(parent,prefix+"Family relationship status","select",REL,true),relationshipOther=otherFor(relationship.wrap,relationship.control);
 const child=field(parent,prefix+"Child / Pet-child status (select all that apply)","checklist",CHILD,true),childOther=otherForChecks(child.wrap,child.control);
 child.control.addEventListener("change",e=>{const boxes=[...child.control.querySelectorAll("input")],none=boxes.find(x=>x.value==="None of these");if(e.target.value==="None of these"&&e.target.checked)boxes.forEach(x=>{if(x!==none)x.checked=false;});else if(e.target.checked&&none)none.checked=false;});
 return{name,age,gender,genderOther,life,ageDeath,cause,medical,medicalOther,relationship,relationshipOther,child,childOther};
}
function makePartner(parent,prefix="Partner"){
 const name=field(parent,prefix+" name"),age=field(parent,prefix+" age","number"),gender=field(parent,prefix+" gender","select",GENDERS),genderOther=otherFor(gender.wrap,gender.control),bond=field(parent,prefix+" emotional bond (select all that apply)","checklist",BONDS,true),bondOther=otherForChecks(bond.wrap,bond.control);
 return{name,age,gender,genderOther,bond,bondOther};
}
function initInformant(){
 $("informantFields").replaceChildren();
 const name=field($("informantFields"),"Informant full name"),age=field($("informantFields"),"Informant age","number"),gender=field($("informantFields"),"Informant gender","select",GENDERS),genderOther=otherFor(gender.wrap,gender.control),generation=field($("informantFields"),"Informant generation","select",["2nd generation","3rd generation","Other (specify)"],true),generationOther=otherFor(generation.wrap,generation.control);
 informant={name,age,gender,genderOther,generation,generationOther};
}
function initPerson(){
 $("personFields").replaceChildren();$("partnerFields").replaceChildren();$("extraPartnerFields").replaceChildren();$("childrenFields").replaceChildren();$("childEntries").replaceChildren();
 person=makeBase($("personFields"));partner=makePartner($("partnerFields"));extra=makePartner($("extraPartnerFields"),"Additional partner");
 const countPartner=field($("extraPartnerFields"),"Do you have a 2nd or 3rd partner?","select",["None","2nd partner","3rd partner"],true);extra.countPartner=countPartner;
 countPartner.control.addEventListener("change",()=>{const old=$("extraPartnerFields").querySelector(".extra-details");if(old)old.remove();extra.details=null;if(["2nd partner","3rd partner"].includes(countPartner.control.value)){const holder=document.createElement("div");holder.className="fields full extra-details";$("extraPartnerFields").append(holder);extra.details=makePartner(holder,countPartner.control.value+" — ");}});
 childQuestion=field($("childrenFields"),"Do you have children / pet-children to record?","select",["No child","Has child or pet-child"],true);childQuestion.control.value="No child";
 childPartner=field($("childrenFields"),"Which partner are the children / pet-children with?","select",["1st partner","2nd partner","3rd partner"],true);
 childCount=field($("childrenFields"),"How many children / pet-children?","number",[],true);childCount.control.min="1";childCount.control.max="30";childCount.control.placeholder="Enter 1–30";
 childQuestion.control.addEventListener("change",refreshChildren);childCount.control.addEventListener("input",refreshChildren);person.relationship.control.addEventListener("change",updateBranch);refreshChildren();updateBranch();
}
function updateBranch(){
 const s=person.relationship.control.value,needs=PARTNER_STATUSES.has(s)&&s!=="Divorced — now single (no new partner)"&&s!=="Widowed";
 $("partnerSection").classList.toggle("hidden",!needs);$("extraPartnerSection").classList.toggle("hidden",!DIVORCED.has(s));
 if(!needs)clear($("partnerFields"));if(!DIVORCED.has(s))clear($("extraPartnerFields"));
}
function clear(parent){parent.querySelectorAll("input").forEach(x=>{if(x.type==="checkbox")x.checked=false;else x.value="";});parent.querySelectorAll("select").forEach(x=>x.value="");}
function makeChild(index){
 const card=document.createElement("div");card.className="child-card";const h=document.createElement("h4");h.textContent="Child / Pet-child "+(index+1);card.append(h);const grid=document.createElement("div");grid.className="fields";card.append(grid);const base=makeBase(grid,"Child "+(index+1)+" — ");
 const section=document.createElement("div");section.className="subsection";const title=document.createElement("h4");title.textContent="This child's own father and mother";section.append(title);card.append(section);
 const fh=document.createElement("h4");fh.textContent="Father's profile";section.append(fh);const fg=document.createElement("div");fg.className="fields";section.append(fg);const father=makeBase(fg,"Child's father — ");
 const mh=document.createElement("h4");mh.textContent="Mother's profile";section.append(mh);const mg=document.createElement("div");mg.className="fields";section.append(mg);const mother=makeBase(mg,"Child's mother — ");
 return{card,base,father,mother};
}
function refreshChildren(){
 if(!childQuestion)return;const has=childQuestion.control.value==="Has child or pet-child";
 childPartner.wrap.classList.toggle("hidden",!has);childCount.wrap.classList.toggle("hidden",!has);$("childEntries").classList.toggle("hidden",!has);
 if(!has){childCount.control.value="";childPartner.control.value="";$("childEntries").replaceChildren();children=[];return;}
 const n=Math.max(0,Math.min(30,parseInt(childCount.control.value||"0",10)||0));$("childEntries").replaceChildren();children=[];
 for(let i=0;i<n;i++){const c=makeChild(i);$("childEntries").append(c.card);children.push(c);}
}
function readBase(b){
 const checked=c=>[...c.querySelectorAll("input:checked")].map(x=>x.value==="Other (specify")?"Other: "+(b.childOther?.value||""):x.value);
 const vals=c=>[...c.querySelectorAll("input:checked")].map(x=>x.value);
 const replaceOther=(arr,input)=>arr.map(v=>v==="Other (specify)"?"Other: "+input.value.trim():v);
 return{fullName:b.name.control.value.trim(),age:b.age.control.value,gender:b.gender.control.value==="Other (specify)"?b.genderOther.value.trim():b.gender.control.value,lifeSpan:b.life.control.value,ageAtDeath:b.life.control.value==="Deceased"?b.ageDeath.control.value:"",causeOfDeathNotes:b.life.control.value==="Deceased"?b.cause.control.value.trim():"",medicalStatus:replaceOther(vals(b.medical.control),b.medicalOther),relationshipStatus:b.relationship.control.value==="Other (specify)"?"Other: "+b.relationshipOther.value.trim():b.relationship.control.value,childPetChildStatus:replaceOther(vals(b.child.control),b.childOther)};
}
function readPartner(p){return{name:p.name.control.value.trim(),age:p.age.control.value,gender:p.gender.control.value==="Other (specify)"?p.genderOther.value.trim():p.gender.control.value,emotionalBond:[...p.bond.control.querySelectorAll("input:checked")].map(x=>x.value==="Other (specify)"?"Other: "+p.bondOther.value.trim():x.value)};}
function buildRecord(){
 const s=person.relationship.control.value,needs=PARTNER_STATUSES.has(s)&&s!=="Divorced — now single (no new partner)"&&s!=="Widowed";
 return{generation:$("generation").value==="Other (specify)"?$("generationOther").value.trim():$("generation").value,recordedPerson:readBase(person),partner:needs?readPartner(partner):"Skipped by relationship-status rule",additionalPartner:DIVORCED.has(s)?{selection:extra.countPartner.control.value,details:extra.details?readPartner(extra.details):null}:"Not applicable",children:childQuestion.control.value==="Has child or pet-child"?{partner:childPartner.control.value,count:children.length,entries:children.map((c,i)=>({childNumber:i+1,profile:readBase(c.base),fatherProfile:readBase(c.father),motherProfile:readBase(c.mother)}))}:"No child"};
}
function showPage(n){
 page=Math.max(0,Math.min(3,n));pages.forEach((p,i)=>p.classList.toggle("active",i===page));
 const labels=["Informant","Choose family member","Recorded person's profile","Full preview"];$("stepLabel").textContent=`Step ${page+1} of 4 — ${labels[page]}`;
 const pct=Math.round((page+1)/4*100);$("percentLabel").textContent=pct+"%";$("progressBar").style.width=pct+"%";$("backBtn").disabled=page===0;$("nextBtn").textContent=page===3?"Finish":"Next";$("navStatus").textContent=page===3?"Review the complete survey record":"";$("finalActions").classList.toggle("hidden",page!==3);
 if(page===3){$("preview").textContent=JSON.stringify({informant:{fullName:informant.name.control.value.trim(),age:informant.age.control.value,gender:informant.gender.control.value==="Other (specify)"?informant.genderOther.value.trim():informant.gender.control.value,generation:informant.generation.control.value==="Other (specify)"?informant.generationOther.value.trim():informant.generation.control.value},recordedFamilyMembers:records},null,2);}
 window.scrollTo({top:0,behavior:"smooth"});
}
function valid(){
 if(page===0){if(!informant.name.control.value.trim()||!informant.age.control.value||!informant.gender.control.value||!informant.generation.control.value){alert("Please complete all informant fields.");return false;}if(!["2nd generation","3rd generation"].includes(informant.generation.control.value)&&informant.generation.control.value!=="Other (specify)"){alert("Informant must be 2nd or 3rd generation.");return false;}if(informant.generation.control.value==="Other (specify)"&&!informant.generationOther.value.trim()){alert("Please specify informant generation.");return false;}}
 if(page===1){if(!$("generation").value){alert("Please select a generation or Done.");return false;}if($("generation").value==="Other (specify)"&&!$("generationOther").value.trim()){alert("Please specify generation.");return false;}}
 if(page===2){if(!person.name.control.value.trim()||!person.age.control.value||!person.gender.control.value||!person.life.control.value||!person.relationship.control.value){alert("Please complete name, age, gender, life-span, and relationship status.");return false;}if(person.life.control.value==="Deceased"&&!person.ageDeath.control.value){alert("Please enter age at death.");return false;}if(childQuestion.control.value==="Has child or pet-child"){const n=Number(childCount.control.value);if(!childPartner.control.value||!Number.isInteger(n)||n<1||n>30){alert("Select a partner and enter a child count from 1 to 30.");return false;}for(const c of children){if(!c.base.name.control.value.trim()||!c.base.age.control.value||!c.base.gender.control.value||!c.base.life.control.value||!c.base.relationship.control.value){alert("Complete each child's name, age, gender, life-span, and relationship status.");return false;}}}}
 return true;
}
function resetPerson(){initPerson();}
initInformant();initPerson();
$("generation").addEventListener("change",()=>{$("generationOther").classList.toggle("hidden",$("generation").value!=="Other (specify)");if($("generation").value!=="Other (specify)")$("generationOther").value="";});
$("nextBtn").addEventListener("click",()=>{
 if(!valid())return;
 if(page===0){showPage(1);return;}
 if(page===1){if($("generation").value==="Done"){showPage(3);return;}initPerson();showPage(2);return;}
 if(page===2){const data=buildRecord();recNum++;records.push({...data,recordNumber:recNum});showPage(1);return;}
 alert("Survey preview ready. Data is temporary and will be lost on refresh.");
});
$("backBtn").addEventListener("click",()=>{if(page===2)showPage(1);else if(page===3)showPage(1);else showPage(page-1);});
$("recordAnotherBtn").addEventListener("click",()=>{$("generation").value="";$("generationOther").value="";$("generationOther").classList.add("hidden");initPerson();showPage(1);});
$("restartBtn").addEventListener("click",()=>{if(!confirm("Restart all and clear informant and family records?"))return;records=[];recNum=0;initInformant();initPerson();$("generation").value="";$("generationOther").value="";$("generationOther").classList.add("hidden");showPage(0);});
showPage(0);
})();