"use strict";

(() => {
  const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbw4fCCUHJL1t_3RnWCp2Y7s65zRuzl887oF5CT_4H8JAKUX7LxnB6HlhmezAAE-LgKU8A/exec";
  const NOTE = "Please provide detailed, complete information or select the correct option.";
  const LIFE_NOTE = "We are asking about the recorded family member — NOT you, the informant. If deceased, you provide the details.";

  const GENDERS = ["Male", "Female", "Gay", "Lesbian", "Other (specify)"];
  const LIFE_SPAN = ["Alive", "Deceased", "Other (specify)"];
  const CHILD_TAGS = ["Adopted", "Foster child", "Pregnancy", "Miscarriage", "Abortion", "Identical twin", "Fraternal twin", "Deceased", "None of these", "Other (specify)"];
  const MEDICAL = ["Heart Disease", "Breast Cancer", "Diabetes", "Down Syndrome", "Depression", "Smoking", "Drug Addiction", "Alcoholic", "No known condition", "Other (specify)"];
  const RELATIONSHIPS = [
    "Single", "Girlfriend/Boyfriend", "Married", "Separated",
    "Divorced — now single (no new partner)", "Divorced", "Widowed",
    "Live-in", "Complicated", "Very close", "LDR", "Committed",
    "Sexual relationship", "Mutual-relationship",
    "Divorced annulled by law or paper", "Divorced without official law or paper",
    "Other (specify)"
  ];
  const EMOTIONAL = ["Hate", "Distant", "Violence", "Emotional abuse", "Manipulative", "Controlling", "Physical abuse", "Sexual abuse", "Neglected", "Best-friend", "In-love", "Estranged", "Other (specify)"];
  const PARTNER_STATUSES = new Set([
    "Girlfriend/Boyfriend", "Married", "Separated", "Divorced", "Live-in",
    "Complicated", "Very close", "LDR", "Committed", "Sexual relationship",
    "Mutual-relationship", "Divorced annulled by law or paper",
    "Divorced without official law or paper", "Other (specify)"
  ]);
  const EXTRA_PARTNER_STATUSES = new Set([
    "Divorced", "Divorced annulled by law or paper", "Divorced without official law or paper"
  ]);

  const app = document.getElementById("app");
  const stepLabel = document.getElementById("step-label");
  const progressPercent = document.getElementById("progress-percent");
  const progressFill = document.getElementById("progress-fill");

  const state = {
    informant: { generation: "", fullName: "", age: "", gender: "", genderOther: "" },
    members: [],
    currentMember: null,
    currentChildIndex: 0
  };

  let history = [];
  let page = null;

  function makePage(type, title, data = {}) {
    return { type, title, data };
  }

  function start() {
    history = [makePage("informantGeneration", "Confirm informant generation", state.informant)];
    render();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function noteBlock(clarify = false) {
    return `<div class="question-note">${NOTE}</div>${clarify ? `<div class="clarification">${LIFE_NOTE}</div>` : ""}`;
  }

  function field(label, key, value = "", type = "text", required = false, extra = "") {
    const req = required ? `<span class="required"> *</span>` : "";
    return `<div class="field ${extra}"><label for="${key}">${label}${req}</label><input id="${key}" name="${key}" type="${type}" value="${escapeHtml(value)}" ${required ? "required" : ""} ${type === "number" ? 'min="0" max="130" step="1"' : ""}></div>`;
  }

  function selectField(label, key, options, value = "", required = false) {
    const req = required ? `<span class="required"> *</span>` : "";
    const opts = options.map(opt => `<option value="${escapeHtml(opt)}" ${opt === value ? "selected" : ""}>${escapeHtml(opt)}</option>`).join("");
    const other = value === "Other (specify)" || (value && !options.includes(value));
    return `<div class="field"><label for="${key}">${label}${req}</label><select id="${key}" name="${key}" ${required ? "required" : ""}><option value="">Choose an option</option>${opts}</select><input class="other-input" data-other-for="${key}" type="text" name="${key}Other" placeholder="Please specify" value="${escapeHtml(other && value !== "Other (specify)" ? value : "")}" style="display:${other ? "block" : "none"}" ${required && other ? "required" : ""}></div>`;
  }

  function radioField(label, key, options, value = "", required = true) {
    return `<div class="field full"><span class="field-label">${label}${required ? '<span class="required"> *</span>' : ""}</span><div class="radio-list">${options.map((opt, i) => `<label class="radio-choice"><input type="radio" name="${key}" value="${escapeHtml(opt)}" ${value === opt ? "checked" : ""} ${required && i === 0 ? "required" : ""}><span>${escapeHtml(opt)}</span></label>`).join("")}</div></div>`;
  }

  function checklist(label, key, options, selected = [], otherText = "") {
    return `<div class="field full"><span class="field-label">${label}</span><div class="choice-list">${options.map(opt => `<label class="choice"><input type="checkbox" name="${key}" value="${escapeHtml(opt)}" ${selected.includes(opt) ? "checked" : ""}><span>${escapeHtml(opt)}</span></label>`).join("")}</div><input class="other-input" data-other-for-check="${key}" name="${key}Other" type="text" placeholder="Other (specify): enter details" value="${escapeHtml(otherText)}" style="display:${selected.includes("Other (specify)") ? "block" : "none"}"></div>`;
  }

  function textArea(label, key, value = "", required = false) {
    return `<div class="field full"><label for="${key}">${label}${required ? '<span class="required"> *</span>' : ""}</label><textarea id="${key}" name="${key}" ${required ? "required" : ""}>${escapeHtml(value)}</textarea></div>`;
  }

  function shell(kicker, title, intro, body) {
    return `<p class="page-kicker">${kicker}</p><h2>${title}</h2><p class="intro">${intro}</p>${body}<div id="form-error" class="error" role="alert" hidden></div><div class="action-row"><button type="button" class="btn-secondary" id="back-btn">← Back</button><div class="action-right"><button type="button" class="btn-primary" id="next-btn">Next →</button></div></div>`;
  }

  function currentMember() {
    return state.currentMember;
  }

  function render() {
    page = history[history.length - 1];
    const pageNames = {
      informantGeneration: "Informant · Generation",
      informantDetails: "Informant · Details",
      generation: "Choose generation",
      memberBasics: "Family member · Details",
      memberLife: "Family member · Life-span",
      memberMedical: "Family member · Medical status",
      memberRelationship: "Family member · Relationship",
      extraPartnerCheck: "Additional partner",
      partnerDetails: "Partner details",
      children: "Children / pet-children",
      childDetails: "Child / pet-child details",
      childParents: "Child's biological parents",
      preview: "Final preview"
    };
    const currentStep = history.length;
    const progress = Math.min(100, Math.round((currentStep / Math.max(currentStep + 2, 6)) * 100));
    stepLabel.textContent = `Step ${currentStep} · ${pageNames[page.type] || page.title}`;
    progressPercent.textContent = `${progress}%`;
    progressFill.style.width = `${progress}%`;

    let html = "";
    switch (page.type) {
      case "informantGeneration": html = renderInformantGeneration(page); break;
      case "informantDetails": html = renderInformantDetails(page); break;
      case "generation": html = renderGeneration(page); break;
      case "memberBasics": html = renderMemberBasics(page); break;
      case "memberLife": html = renderMemberLife(page); break;
      case "memberMedical": html = renderMemberMedical(page); break;
      case "memberRelationship": html = renderMemberRelationship(page); break;
      case "extraPartnerCheck": html = renderExtraPartnerCheck(page); break;
      case "partnerDetails": html = renderPartnerDetails(page); break;
      case "children": html = renderChildren(page); break;
      case "childDetails": html = renderChildDetails(page); break;
      case "childParents": html = renderChildParents(page); break;
      case "preview": html = renderPreview(); break;
      default: html = `<h2>Page not found</h2>`;
    }
    app.innerHTML = html;
    wireControls();
  }

  function renderInformantGeneration(p) {
    return shell("Step 1 of survey", "Who is providing the information?", "Only a 2nd-generation or 3rd-generation family member may be the informant.", `${noteBlock()}<div class="question-block"><div class="field-grid">${radioField("Confirm your generation", "generation", ["2nd generation", "3rd generation"], p.data.generation, true)}</div><p class="inline-help">Rule: grandparents (1st generation) do not use the phone; great-grandchildren (4th generation) are too young to inform.</p></div>`);
  }

  function renderInformantDetails(p) {
    return shell("Step 2 of survey", "Informant details", "Enter the details of the person answering this survey.", `${noteBlock()}<div class="question-block"><div class="field-grid">${field("Full name", "fullName", p.data.fullName, "text", true)}${field("Age", "age", p.data.age, "number", true)}${selectField("Gender", "gender", GENDERS, p.data.gender, true)}</div></div>`);
  }

  function renderGeneration(p) {
    const memberCount = state.members.length;
    return shell("Repeating loop", "Choose a generation to record", "Select a generation for the next family member. Choose Done when you have finished adding family members.", `${noteBlock()}<div class="question-block"><div class="field-grid">${radioField("Generation of the family member being recorded", "generation", ["1st generation", "2nd generation", "3rd generation", "4th generation", "Done"], p.data.generation || "", true)}</div><p class="inline-help">Family members recorded so far: ${memberCount}</p></div>`);
  }

  function renderMemberBasics(p) {
    const d = p.data;
    return shell("Family member · Step 1", "Family member details", "Record the relative selected from the generation screen.", `${noteBlock()}<div class="question-block"><div class="field-grid">${field("Full name", "fullName", d.fullName, "text", true)}${field("Age", "age", d.age, "number", true)}${selectField("Gender", "gender", GENDERS, d.gender, true)}</div></div>`);
  }

  function renderMemberLife(p) {
    const d = p.data;
    const deceased = d.lifeSpan === "Deceased";
    return shell("Family member · Step 2", "Life-span status", "Choose whether this recorded family member is alive or deceased.", `${noteBlock(true)}<div class="question-block"><div class="field-grid">${selectField("Life-span status", "lifeSpan", LIFE_SPAN, d.lifeSpan || "Alive", true)}<div class="field" id="death-age-wrap" style="display:${deceased ? "block" : "none"}"><label for="ageAtDeath">Age at death <span class="required">*</span></label><input id="ageAtDeath" name="ageAtDeath" type="number" min="0" max="130" value="${escapeHtml(d.ageAtDeath || "")}" ${deceased ? "required" : ""}></div>${textArea("Cause of death / notes", "causeOfDeath", d.causeOfDeath || "", false)}</div></div>`);
  }

  function renderMemberMedical(p) {
    const d = p.data;
    return shell("Family member · Step 3", "Medical status", "Select all that apply. Choose “No known condition” only if appropriate.", `${noteBlock(true)}<div class="question-block">${checklist("Medical status (select all that apply)", "medical", MEDICAL, d.medical || [], d.medicalOther || "")}</div>`);
  }

  function renderMemberRelationship(p) {
    const d = p.data;
    return shell("Family member · Step 4", "Family relationship status", "Choose the recorded family member's current or relevant relationship status. The children page will appear for every choice.", `${noteBlock(true)}<div class="question-block">${selectField("Family relationship status", "relationship", RELATIONSHIPS, d.relationship, true)}<p class="inline-help">Children / pet-children are always asked about, regardless of relationship status.</p></div>`);
  }

  function renderExtraPartnerCheck(p) {
    return shell("Conditional page", "Additional partner check", "Because a divorced status was selected, indicate whether another partner should also be recorded.", `${noteBlock(true)}<div class="question-block">${radioField("Does this person have an additional 2nd or 3rd partner to record?", "extraPartner", ["None", "2nd partner", "3rd partner"], p.data.extraPartner || "None", true)}</div>`);
  }

  function renderPartnerDetails(p) {
    const d = p.data;
    const member = currentMember();
    return shell("Conditional page", p.data.partnerLabel || "Partner details", `Partner information for ${escapeHtml(member?.fullName || "this family member")}.`, `${noteBlock(true)}<div class="question-block"><div class="field-grid">${field("Partner full name", "name", d.name, "text", true)}${field("Partner age", "age", d.age, "number", true)}${selectField("Partner gender", "gender", GENDERS, d.gender, true)}</div>${checklist("Emotional bond (select all that apply)", "emotionalBond", EMOTIONAL, d.emotionalBond || [], d.emotionalBondOther || "")}</div>`);
  }

  function renderChildren(p) {
    const hasChildren = p.data.childrenChoice === "Has child/pet-child";
    const partnerOptions = ["Recorded family member (no partner listed)", "1st partner", "2nd partner", "3rd partner", "Other (specify)"];
    return shell("Mandatory page", "Children / pet-children", "This question must be answered for every recorded family member, whatever their relationship status.", `${noteBlock(true)}<div class="question-block">${radioField("Does this person have any children or pet-children to record?", "childrenChoice", ["No child", "Has child/pet-child"], p.data.childrenChoice || "", true)}<div id="children-details-wrap" style="display:${hasChildren ? "block" : "none"}"><div class="field-grid">${selectField("Partner reference for these children", "partnerReference", partnerOptions, p.data.partnerReference || "", true)}<div class="field"><label for="childCount">How many children / pet-children? <span class="required">*</span></label><input id="childCount" name="childCount" type="number" min="1" max="100" value="${escapeHtml(p.data.childCount || "")}" ${hasChildren ? "required" : ""}></div></div><p class="inline-help">Enter a quantity from 1 to 100. Each child will have an individual entry page.</p></div></div>`);
  }

  function renderChildDetails(p) {
    const d = p.data;
    const idx = p.data.childNumber || 1;
    const member = currentMember();
    return shell(`Child entry ${idx}`, `Child / pet-child ${idx} details`, `Enter the details for child ${idx} of ${escapeHtml(member?.fullName || "this family member")}.`, `${noteBlock(true)}<div class="question-block"><div class="field-grid">${field("Full name / label if not named", "fullName", d.fullName, "text", true)}${field("Age", "age", d.age, "number", true)}${selectField("Gender", "gender", GENDERS, d.gender, true)}${selectField("Life-span status", "lifeSpan", LIFE_SPAN, d.lifeSpan || "Alive", true)}<div class="field" id="death-age-wrap" style="display:${d.lifeSpan === "Deceased" ? "block" : "none"}"><label for="ageAtDeath">Age at death</label><input id="ageAtDeath" name="ageAtDeath" type="number" min="0" max="130" value="${escapeHtml(d.ageAtDeath || "")}"></div>${textArea("Cause of death / notes", "causeOfDeath", d.causeOfDeath || "", false)}</div>${checklist("Medical status (select all that apply)", "medical", MEDICAL, d.medical || [], d.medicalOther || "")}${checklist("Child / pet-child status (select all that apply)", "childTags", CHILD_TAGS, d.childTags || [], d.childTagsOther || "")}${selectField("Family relationship status", "relationship", RELATIONSHIPS, d.relationship, true)}</div>`);
  }

  function renderChildParents(p) {
    const d = p.data;
    return shell("Child entry · Parent notes", "Biological father and mother notes", "Add the known information about this child's biological father and mother. If unknown, state that in the notes.", `${noteBlock(true)}<div class="question-block"><div class="field-grid">${field("Biological father — full name", "fatherName", d.fatherName, "text", false)}${field("Biological father — age (if known)", "fatherAge", d.fatherAge, "number", false)}${selectField("Biological father — gender", "fatherGender", GENDERS, d.fatherGender, false)}${field("Biological mother — full name", "motherName", d.motherName, "text", false)}${field("Biological mother — age (if known)", "motherAge", d.motherAge, "number", false)}${selectField("Biological mother — gender", "motherGender", GENDERS, d.motherGender, false)}</div>${textArea("Father / mother relationship or other biological-parent notes", "parentNotes", d.parentNotes || "", false)}</div>`);
  }

  function renderPreview() {
    const preview = {
      informant: state.informant,
      familyMembers: state.members
    };
    const membersHtml = state.members.length
      ? `<ol class="member-list">${state.members.map(m => `<li><strong>${escapeHtml(m.fullName || "Unnamed member")}</strong> — ${escapeHtml(m.generation || "Generation not set")}; ${escapeHtml(m.relationship || "relationship not set")}; children recorded: ${(m.children || []).length}</li>`).join("")}</ol>`
      : `<div class="empty-state">No family members have been recorded yet. Use “Record Another Member” to add one.</div>`;
    return `<p class="page-kicker">Final screen</p><h2>Review your survey data</h2><p class="intro">Review the current records before exporting them to a CSV file.</p>
      <div class="question-block">${noteBlock()}<h3>Informant</h3><div class="preview-box">${escapeHtml(state.informant.fullName || "Not entered")} · ${escapeHtml(state.informant.age || "Age not entered")} · ${escapeHtml(state.informant.gender || "Gender not entered")} · ${escapeHtml(state.informant.generation || "Generation not entered")}</div></div>
      <div class="preview-section"><h3>Recorded family members (${state.members.length})</h3>${membersHtml}</div>
      <div class="preview-section"><h3>Full-data preview</h3><div class="preview-box"><pre>${escapeHtml(JSON.stringify(preview, null, 2))}</pre></div></div>
      <div class="warning"><strong>Warning:</strong> All temporary data will be lost if page refreshes. Download the CSV to keep a local copy.</div>
      <div id="form-error" class="error" role="alert" hidden></div>
      <p id="submission-status" class="inline-help" role="status" aria-live="polite"></p>
      <div class="action-row"><button type="button" class="btn-secondary" id="back-btn">← Back</button><div class="action-right"><button type="button" class="btn-secondary" id="record-another-btn">Record Another Member</button><button type="button" class="btn-danger" id="restart-btn">Restart All</button><button type="button" class="btn-export" id="submit-google-sheets-btn">Submit to Google Sheets</button><button type="button" class="btn-export" id="export-btn">Download as CSV</button></div></div>`;
  }

  function wireControls() {
    const backBtn = document.getElementById("back-btn");
    if (backBtn) backBtn.addEventListener("click", goBack);
    const nextBtn = document.getElementById("next-btn");
    if (nextBtn) nextBtn.addEventListener("click", next);
    const exportBtn = document.getElementById("export-btn");
    if (exportBtn) exportBtn.addEventListener("click", exportCsv);
    const submitBtn = document.getElementById("submit-google-sheets-btn");
    if (submitBtn) submitBtn.addEventListener("click", submitToGoogleSheets);
    const recordAnother = document.getElementById("record-another-btn");
    if (recordAnother) recordAnother.addEventListener("click", recordAnotherMember);
    const restart = document.getElementById("restart-btn");
    if (restart) restart.addEventListener("click", restartAll);

    app.querySelectorAll('input[type="radio"][name="childrenChoice"]').forEach(radio => {
      radio.addEventListener("change", () => {
        const wrap = document.getElementById("children-details-wrap");
        const count = document.getElementById("childCount");
        const partnerRef = app.querySelector('select[name="partnerReference"]');
        const show = radio.checked && radio.value === "Has child/pet-child";
        if (wrap) wrap.style.display = show ? "block" : "none";
        if (count) count.required = show;
        if (partnerRef) partnerRef.required = show;
      });
    });
    app.querySelectorAll("select").forEach(sel => {
      sel.addEventListener("change", () => {
        const other = app.querySelector(`[data-other-for="${CSS.escape(sel.name)}"]`);
        if (other) {
          const show = sel.value === "Other (specify)";
          other.style.display = show ? "block" : "none";
          other.required = show;
        }
        if (sel.name === "lifeSpan") {
          const wrap = document.getElementById("death-age-wrap");
          const age = document.getElementById("ageAtDeath");
          if (wrap) wrap.style.display = sel.value === "Deceased" ? "block" : "none";
          if (age) age.required = sel.value === "Deceased" && page.type === "memberLife";
        }
      });
    });
    app.querySelectorAll('input[type="checkbox"]').forEach(box => {
      box.addEventListener("change", () => {
        const group = box.name;
        const other = app.querySelector(`[data-other-for-check="${CSS.escape(group)}"]`);
        if (other) {
          const checked = [...app.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(group)}"]`)].some(x => x.checked && x.value === "Other (specify)");
          other.style.display = checked ? "block" : "none";
          other.required = checked;
        }
      });
    });
    const relationship = app.querySelector('select[name="relationship"]');
    if (relationship) relationship.addEventListener("change", () => {});
  }

  function readForm(target) {
    const data = target.data;
    const form = app;
    form.querySelectorAll("input[name], select[name], textarea[name]").forEach(el => {
      if (el.type === "checkbox" || el.type === "radio") return;
      if (el.name.endsWith("Other") && el.dataset.otherFor) return;
      if (el.name.endsWith("Other") && el.dataset.otherForCheck) return;
      data[el.name] = el.value.trim();
    });
    const radioGroups = new Set([...form.querySelectorAll('input[type="radio"][name]')].map(el => el.name));
    radioGroups.forEach(name => {
      const checked = form.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
      data[name] = checked ? checked.value : "";
    });
    const checkGroups = new Set([...form.querySelectorAll('input[type="checkbox"][name]')].map(el => el.name));
    checkGroups.forEach(name => {
      data[name] = [...form.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(name)}"]:checked`)].map(el => el.value);
      const otherInput = form.querySelector(`[data-other-for-check="${CSS.escape(name)}"]`);
      if (otherInput) data[`${name}Other`] = otherInput.value.trim();
    });
    // Keep the free-text "Other" value in place of the generic option where appropriate.
    form.querySelectorAll("select[name]").forEach(sel => {
      const otherInput = form.querySelector(`[data-other-for="${CSS.escape(sel.name)}"]`);
      if (sel.value === "Other (specify)" && otherInput && otherInput.value.trim()) {
        data[`${sel.name}Other`] = otherInput.value.trim();
      }
    });
  }

  function validate(target) {
    const formError = document.getElementById("form-error");
    const invalid = app.querySelector(":invalid");
    if (invalid) {
      if (formError) {
        formError.hidden = false;
        formError.textContent = "Please complete the required field(s) before continuing.";
      }
      invalid.focus();
      return false;
    }
    if (formError) formError.hidden = true;
    return true;
  }

  function push(type, title, data) {
    history.push(makePage(type, title, data || {}));
    render();
  }

  function next() {
    readForm(page);
    if (!validate(page)) return;

    switch (page.type) {
      case "informantGeneration":
        if (!["2nd generation", "3rd generation"].includes(page.data.generation)) {
          showError("The informant must be 2nd-generation or 3rd-generation.");
          return;
        }
        state.informant.generation = page.data.generation;
        push("informantDetails", "Informant details", state.informant);
        break;
      case "informantDetails":
        Object.assign(state.informant, page.data);
        push("generation", "Choose a generation", { generation: "" });
        break;
      case "generation":
        if (page.data.generation === "Done") {
          push("preview", "Final preview", {});
        } else {
          state.currentMember = {
            generation: page.data.generation, fullName: "", age: "", gender: "",
            lifeSpan: "Alive", medical: [], relationship: "", partners: [],
            extraPartner: "None", childrenChoice: "", children: []
          };
          push("memberBasics", "Family member details", state.currentMember);
        }
        break;
      case "memberBasics":
        Object.assign(currentMember(), page.data);
        push("memberLife", "Life-span status", currentMember());
        break;
      case "memberLife":
        Object.assign(currentMember(), page.data);
        if (currentMember().lifeSpan !== "Deceased") {
          currentMember().ageAtDeath = "";
          currentMember().causeOfDeath = "";
        }
        push("memberMedical", "Medical status", currentMember());
        break;
      case "memberMedical":
        Object.assign(currentMember(), page.data);
        push("memberRelationship", "Relationship status", currentMember());
        break;
      case "memberRelationship": {
        Object.assign(currentMember(), page.data);
        const status = currentMember().relationship;
        if (EXTRA_PARTNER_STATUSES.has(status)) {
          push("extraPartnerCheck", "Additional partner check", currentMember());
        } else if (PARTNER_STATUSES.has(status)) {
          const partner = {};
          currentMember().partners = [partner];
          partner.partnerLabel = "Partner details";
          push("partnerDetails", "Partner details", partner);
        } else {
          currentMember().partners = [];
          push("children", "Children / pet-children", currentMember());
        }
        break;
      }
      case "extraPartnerCheck": {
        Object.assign(currentMember(), page.data);
        const choice = currentMember().extraPartner || "None";
        if (choice === "None") {
          if (PARTNER_STATUSES.has(currentMember().relationship)) {
            currentMember().partners = [{}];
            currentMember().partners[0].partnerLabel = "Partner details";
            push("partnerDetails", "Partner details", currentMember().partners[0]);
          } else {
            currentMember().partners = [];
            push("children", "Children / pet-children", currentMember());
          }
        } else {
          const first = {};
          first.partnerLabel = "Partner details";
          currentMember().partners = [first];
          currentMember().extraPartnerDetails = { label: choice, name: "", age: "", gender: "", emotionalBond: [] };
          push("partnerDetails", "Partner details", first);
        }
        break;
      }
      case "partnerDetails": {
        Object.assign(page.data, page.data);
        const partners = currentMember().partners || [];
        if (!partners.includes(page.data)) partners.push(page.data);
        // For divorced categories with a selected extra partner, gather an additional profile.
        const extra = currentMember().extraPartner;
        if (EXTRA_PARTNER_STATUSES.has(currentMember().relationship) && extra && extra !== "None" && !page.data.isExtraPartner) {
          const extraProfile = { partnerLabel: `${extra} details`, isExtraPartner: true };
          currentMember().partners.push(extraProfile);
          push("partnerDetails", `${extra} details`, extraProfile);
        } else {
          push("children", "Children / pet-children", currentMember());
        }
        break;
      }
      case "children": {
        Object.assign(currentMember(), page.data);
        if (page.data.childrenChoice === "No child") {
          currentMember().children = [];
          finishMember();
        } else {
          const count = Number(page.data.childCount || 0);
          if (!Number.isInteger(count) || count < 1 || count > 100) {
            showError("Enter a child quantity from 1 to 100.");
            return;
          }
          currentMember().children = [];
          currentMember().childCount = count;
          state.currentChildIndex = 0;
          pushChildPage();
        }
        break;
      }
      case "childDetails":
        Object.assign(page.data, page.data);
        currentMember().children[state.currentChildIndex] = page.data;
        push("childParents", "Biological father and mother notes", page.data);
        break;
      case "childParents":
        Object.assign(currentMember().children[state.currentChildIndex], page.data);
        state.currentChildIndex += 1;
        if (state.currentChildIndex < Number(currentMember().childCount)) {
          pushChildPage();
        } else {
          finishMember();
        }
        break;
      default:
        break;
    }
  }

  function pushChildPage() {
    const idx = state.currentChildIndex;
    const existing = currentMember().children[idx] || { childNumber: idx + 1, lifeSpan: "Alive", medical: [], childTags: [] };
    existing.childNumber = idx + 1;
    currentMember().children[idx] = existing;
    push("childDetails", `Child ${idx + 1} details`, existing);
  }

  function finishMember() {
    const member = currentMember();
    state.members.push(member);
    state.currentMember = null;
    state.currentChildIndex = 0;
    // Return to the loop-start page; generation selection is always available again.
    const generationPage = [...history].reverse().find(p => p.type === "generation");
    history = history.slice(0, history.indexOf(generationPage) + 1);
    generationPage.data = { generation: "" };
    render();
  }

  function goBack() {
    if (history.length > 1) {
      history.pop();
      render();
    }
  }

  function showError(message) {
    const err = document.getElementById("form-error");
    if (err) {
      err.hidden = false;
      err.textContent = message;
    } else {
      alert(message);
    }
  }

  function recordAnotherMember() {
    state.currentMember = null;
    const generationPage = makePage("generation", "Choose a generation", { generation: "" });
    history.push(generationPage);
    render();
  }

  function restartAll() {
    if (!confirm("Restart the survey and clear all temporary data?")) return;
    state.informant = { generation: "", fullName: "", age: "", gender: "", genderOther: "" };
    state.members = [];
    state.currentMember = null;
    state.currentChildIndex = 0;
    start();
  }


  async function submitToGoogleSheets() {
    const button = document.getElementById("submit-google-sheets-btn");
    const status = document.getElementById("submission-status");
    const errorBox = document.getElementById("form-error");

    if (!state.informant.fullName || state.members.length === 0) {
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent = "Please enter the informant details and record at least one family member before submitting.";
      }
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Submitting…";
    }
    if (status) status.textContent = "Sending your survey to Google Sheets…";
    if (errorBox) errorBox.hidden = true;

    const payload = {
      informant: state.informant,
      records: state.members
    };

    try {
      // text/plain avoids a CORS preflight. In no-cors mode, the browser cannot
      // read the server response, so the spreadsheet must be checked to confirm saving.
      await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      if (status) {
        status.textContent = "Request sent. Please open the Google Sheet and check the SurveySubmissions tab to confirm the rows were saved.";
      }
    } catch (error) {
      console.error("Google Sheets submission failed:", error);
      if (status) status.textContent = "Could not send the request. Check your internet connection and Apps Script deployment URL, then try again.";
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Submit to Google Sheets";
      }
    }
  }

  function csvCell(value) {
    if (Array.isArray(value)) value = value.join("; ");
    if (value && typeof value === "object") value = JSON.stringify(value);
    let text = String(value ?? "");
    // Prefix formula-like content so Excel does not interpret it as a formula.
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const rows = [];
    const headers = [
      "RecordType", "InformantGeneration", "InformantFullName", "InformantAge", "InformantGender",
      "Generation", "FullName", "Age", "Gender", "LifeSpan", "AgeAtDeath", "CauseOfDeath",
      "MedicalStatus", "MedicalOther", "RelationshipStatus", "RelationshipOther",
      "PartnerNumber", "PartnerName", "PartnerAge", "PartnerGender", "PartnerEmotionalBond", "PartnerEmotionalBondOther",
      "ChildrenChoice", "ChildCount", "ChildFullName", "ChildAge", "ChildGender", "ChildLifeSpan",
      "ChildAgeAtDeath", "ChildCauseOfDeath", "ChildMedicalStatus", "ChildMedicalOther", "ChildTags",
      "ChildTagsOther", "ChildRelationshipStatus", "ChildRelationshipOther", "BiologicalFatherName",
      "BiologicalFatherAge", "BiologicalFatherGender", "BiologicalMotherName", "BiologicalMotherAge",
      "BiologicalMotherGender", "BiologicalParentNotes"
    ];
    rows.push(headers);
    const info = state.informant;
    rows.push([
      "INFORMANT", info.generation, info.fullName, info.age, info.gender === "Other (specify)" ? info.genderOther : info.gender,
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
    ]);
    state.members.forEach(member => {
      const base = [
        "FAMILY_MEMBER", info.generation, info.fullName, info.age,
        info.gender === "Other (specify)" ? info.genderOther : info.gender,
        member.generation, member.fullName, member.age,
        member.gender === "Other (specify)" ? (member.genderOther || member.gender) : member.gender,
        member.lifeSpan, member.ageAtDeath, member.causeOfDeath,
        member.medical, member.medicalOther,
        member.relationship === "Other (specify)" ? (member.relationshipOther || member.relationship) : member.relationship,
        member.relationshipOther, "", "", "", "", "", "",
        member.childrenChoice, member.childCount || (member.children || []).length,
        "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
      ];
      if (!member.children || member.children.length === 0) rows.push(base);
      (member.children || []).forEach((child, idx) => {
        const row = base.slice();
        row[0] = "CHILD";
        row[16] = idx + 1;
        row[22] = member.childrenChoice;
        row[23] = member.childCount || member.children.length;
        row[24] = child.fullName;
        row[25] = child.age;
        row[26] = child.gender === "Other (specify)" ? (child.genderOther || child.gender) : child.gender;
        row[27] = child.lifeSpan;
        row[28] = child.ageAtDeath;
        row[29] = child.causeOfDeath;
        row[30] = child.medical;
        row[31] = child.medicalOther;
        row[32] = child.childTags;
        row[33] = child.childTagsOther;
        row[34] = child.relationship;
        row[35] = child.relationshipOther;
        row[36] = child.fatherName;
        row[37] = child.fatherAge;
        row[38] = child.fatherGender === "Other (specify)" ? (child.fatherGenderOther || child.fatherGender) : child.fatherGender;
        row[39] = child.motherName;
        row[40] = child.motherAge;
        row[41] = child.motherGender === "Other (specify)" ? (child.motherGenderOther || child.motherGender) : child.motherGender;
        row[42] = child.parentNotes;
        rows.push(row);
      });
      (member.partners || []).forEach((partner, idx) => {
        const row = base.slice();
        row[0] = "PARTNER";
        row[16] = idx + 1;
        row[17] = partner.name;
        row[18] = partner.age;
        row[19] = partner.gender === "Other (specify)" ? (partner.genderOther || partner.gender) : partner.gender;
        row[20] = partner.emotionalBond;
        row[21] = partner.emotionalBondOther;
        rows.push(row);
      });
    });
    const csv = "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "family_genogram_survey_records.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  start();
})();
