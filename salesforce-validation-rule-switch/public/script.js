function login() {
  window.location.href = "/login";
}


let validationRules = [];

async function getRules() {
  const res = await fetch("/validation-rules");
  validationRules = await res.json();
  renderRules();
}

function renderRules() {
  let html = "";

  validationRules.forEach((rule, index) => {
    html += `
      <div class="rule">
        <span>${rule.ValidationName}</span>

        <label class="switch">
          <input type="checkbox"
            ${rule.Active ? "checked" : ""}
            onchange="toggleLocal(${index})"
          />
          <span class="slider"></span>
        </label>
      </div>
    `;
  });

  document.getElementById("rules").innerHTML = html;
}

function toggleLocal(index) {
  validationRules[index].Active = !validationRules[index].Active;
  renderRules();
}

function enableAll() {
  validationRules.forEach(rule => (rule.Active = true));
  renderRules();
}

function disableAll() {
  validationRules.forEach(rule => (rule.Active = false));
  renderRules();
}

async function deploy() {
  await fetch("/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validationRules)
  });

  alert("Changes deployed to Salesforce");
}
