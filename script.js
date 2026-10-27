(() => {
  "use strict";

  const NOTE = "Please provide detailed, complete information or select the correct option.";
  const MARITAL_OPTIONS = [
    "Single",
    "Single with ex / no ex",
    "Has wife / husband",
    "Live-in partner",
    "Mutual-relationship",
    "Divorced annulled by law or paper",
    "Divorced without official law or paper"
  ];
  const DIVORCED_OPTIONS = [
    "Divorced annulled by law or paper",
    "Divorced without official law or paper"
  ];
  const MAX_PROFILE_DEPTH = 4;

  const mainRoot = document.getElementById("mainProfile");
  const form = document.getElementById("profileForm");
  const previewSection = document.getElementById("previewSection");
  const previewContent = document.getElementById("previewContent");

  function makeField(parent, labelText, type, options, full = false) {
    const wrap = document.createElement("div");
    wrap.className = "field" + (full ? " full" : "");

    const note = document.createElement("span");
    note.className = "question-note";
    note.textContent = NOTE;
    wrap.appendChild(note);

    const label = document.createElement("label");
    label.className = "question";
    label.textContent = labelText;
    wrap.appendChild(label);

    let input;
    if (type === "select") {
      input = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select an option";
      input.appendChild(placeholder);
      options.forEach(optionText => {
        const option = document.createElement("option");
        option.value = optionText;
        option.textContent = optionText;
        input.appendChild(option);
      });
    } else {
      input = document.createElement("input");
      input.type = type;
      if (type === "number") {
        input.min = "0";
        input.step = "1";
      }
    }
    label.appendChild(input);
    parent.appendChild(wrap);
    return { wrap, input };
  }

  function makeSection(parent, title, level = 2) {
    const section = document.createElement("section");
    section.className = "person-card";
    const heading = document.createElement("h" + level);
    heading.textContent = title;
    section.appendChild(heading);
    parent.appendChild(section);
    return section;
  }

  function makePerson(parent, title, path, depth, addParents = true) {
    const card = makeSection(parent, title, depth === 0 ? 2 : 3);
    card.dataset.profilePath = path;

    const fields = document.createElement("div");
    fields.className = "person-fields";
    card.appendChild(fields);

    const name = makeField(fields, "Full Name", "text", null);
    name.input.autocomplete = "off";
    const age = makeField(fields, "Age", "number", null);
    const gender = makeField(fields, "Gender", "select", ["Male", "Female", "Other", "Prefer not to say"]);
    const marital = makeField(fields, "Marital-relationship status", "select", MARITAL_OPTIONS);

    const extraWrap = document.createElement("div");
    extraWrap.className = "nested hidden";
    card.appendChild(extraWrap);
    const extraFields = document.createElement("div");
    extraFields.className = "person-fields";
    extraWrap.appendChild(extraFields);
    const extraPartner = makeField(
      extraFields,
      "Do you have a 2nd or 3rd wife/husband/mutual-relationship partner?",
      "select",
      ["None", "2nd partner", "3rd partner"],
      true
    );

    const childrenChoice = makeField(fields, "Child / pet-child", "select", ["No child", "Has child or pet-child"], true);
    childrenChoice.input.value = "No child"; // Required default for every profile.

    const childrenWrap = document.createElement("div");
    childrenWrap.className = "nested hidden";
    card.appendChild(childrenWrap);

    const childrenFields = document.createElement("div");
    childrenFields.className = "person-fields";
    childrenWrap.appendChild(childrenFields);
    const childPartner = makeField(childrenFields, "Which partner are the children/pet-children with?", "select", ["1st partner", "2nd partner", "3rd partner"], true);
    const childCount = makeField(childrenFields, "How many children / pet-children?", "number", null, true);
    childCount.input.min = "1";
    childCount.input.max = "20";
    childCount.input.placeholder = "Enter 1–20";
    const childEntries = document.createElement("div");
    childEntries.className = "nested";
    childrenWrap.appendChild(childEntries);

    const parentsWrap = document.createElement("div");
    parentsWrap.className = "nested";
    card.appendChild(parentsWrap);
    const parentHeading = document.createElement("h4");
    parentHeading.textContent = "Father's and Mother's Profiles";
    parentsWrap.appendChild(parentHeading);

    const data = { title, path, name: name.input, age: age.input, gender: gender.input, marital: marital.input,
      extraPartner: extraPartner.input, childrenChoice: childrenChoice.input, childPartner: childPartner.input,
      childCount: childCount.input, childEntries, childrenWrap, extraWrap, parentsWrap, childProfiles: [], parentProfiles: [] };

    function updateMarital() {
      const isDivorced = DIVORCED_OPTIONS.includes(marital.input.value);
      extraWrap.classList.toggle("hidden", !isDivorced);
      if (!isDivorced) extraPartner.input.value = "";
    }

    function updateChildren() {
      const hasChildren = childrenChoice.input.value === "Has child or pet-child";
      childrenWrap.classList.toggle("hidden", !hasChildren);
      if (!hasChildren) {
        childCount.input.value = "";
        childPartner.input.value = "";
        childEntries.replaceChildren();
        data.childProfiles = [];
      } else {
        updateChildEntries();
      }
    }

    function updateChildEntries() {
      const count = Math.max(0, Math.min(20, Number.parseInt(childCount.input.value || "0", 10)));
      childEntries.replaceChildren();
      data.childProfiles = [];
      if (!count) return;
      for (let i = 0; i < count; i++) {
        const entry = document.createElement("div");
        entry.className = "nested";
        childEntries.appendChild(entry);
        const child = makePerson(entry, `Child / Pet-child ${i + 1} — Full Profile`, `${path}.child${i + 1}`, depth + 1, true);
        data.childProfiles.push(child);
      }
    }

    marital.input.addEventListener("change", updateMarital);
    childrenChoice.input.addEventListener("change", updateChildren);
    childCount.input.addEventListener("input", updateChildEntries);

    if (addParents && depth < MAX_PROFILE_DEPTH) {
      const fatherHolder = document.createElement("div");
      const motherHolder = document.createElement("div");
      parentsWrap.appendChild(fatherHolder);
      parentsWrap.appendChild(motherHolder);
      data.parentProfiles.push(makePerson(fatherHolder, "Father's Profile", `${path}.father`, depth + 1, true));
      data.parentProfiles.push(makePerson(motherHolder, "Mother's Profile", `${path}.mother`, depth + 1, true));
    } else if (addParents) {
      const limitNote = document.createElement("p");
      limitNote.className = "muted";
      limitNote.textContent = "Parent-profile nesting limit reached to keep the page manageable. The profile fields above are still available.";
      parentsWrap.appendChild(limitNote);
    }

    // Avoid unnecessary empty ancestry sections at the very deepest level.
    if (!addParents) parentsWrap.classList.add("hidden");

    data.update = () => { updateMarital(); updateChildren(); };
    return data;
  }

  const mainProfile = makePerson(mainRoot, "Main Respondent's Profile", "main", 0, true);

  function profileToObject(profile) {
    const isDivorced = DIVORCED_OPTIONS.includes(profile.marital.value);
    const hasChildren = profile.childrenChoice.value === "Has child or pet-child";
    const result = {
      profile: profile.title,
      fullName: profile.name.value.trim(),
      age: profile.age.value,
      gender: profile.gender.value,
      maritalStatus: profile.marital.value,
      additionalPartner: isDivorced ? (profile.extraPartner.value || "Not selected") : "Not applicable",
      childrenOrPetChildren: hasChildren ? {
        partner: profile.childPartner.value || "Not selected",
        count: profile.childCount.value || "Not entered",
        entries: profile.childProfiles.map(profileToObject)
      } : "No child"
    };
    if (profile.parentProfiles.length) {
      result.fatherProfile = profileToObject(profile.parentProfiles[0]);
      result.motherProfile = profileToObject(profile.parentProfiles[1]);
    }
    return result;
  }

  function cleanObject(value, indent = 0) {
    if (Array.isArray(value)) {
      if (!value.length) return "[]";
      return "[\n" + value.map(item => " ".repeat(indent + 2) + cleanObject(item, indent + 2)).join(",\n") +
        "\n" + " ".repeat(indent) + "]";
    }
    if (value && typeof value === "object") {
      const entries = Object.entries(value);
      if (!entries.length) return "{}";
      return "{\n" + entries.map(([key, val]) =>
        " ".repeat(indent + 2) + JSON.stringify(key) + ": " + cleanObject(val, indent + 2)
      ).join(",\n") + "\n" + " ".repeat(indent) + "}";
    }
    return JSON.stringify(value);
  }

  document.getElementById("previewBtn").addEventListener("click", () => {
    previewContent.textContent = cleanObject(profileToObject(mainProfile));
    previewSection.classList.remove("hidden");
    previewSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("closePreview").addEventListener("click", () => {
    previewSection.classList.add("hidden");
  });

  form.addEventListener("reset", () => {
    // Reset event fires before controls finish resetting; update dependent sections afterwards.
    window.setTimeout(() => {
      mainRoot.querySelectorAll("select").forEach(select => {
        if (select.options.length && [...select.options].some(option => option.value === "No child")) {
          select.value = "No child";
        }
      });
      // Rebuild the whole page so all conditional sections return to their default state.
      mainRoot.replaceChildren();
      const fresh = makePerson(mainRoot, "Main Respondent's Profile", "main", 0, true);
      Object.assign(mainProfile, fresh);
      previewSection.classList.add("hidden");
    }, 0);
  });
})();
