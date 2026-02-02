function login() {
  const clientId =
    "3MVG9HtWXcDGV.nHI0zRBlvfsubgRjN5dn43lAdTzUhA492G9g0Gu3X60EsDM0I3sEiSd3Gl.Kq.Ww3EGRvB2";

  const redirectUri =
    "https://salesforce-validation-rule-switch-64vp.onrender.com/oauth/callback";

  const url =
    "https://login.salesforce.com/services/oauth2/authorize" +
    "?response_type=code" +
    "&client_id=" + clientId +
    "&redirect_uri=" + encodeURIComponent(redirectUri);

  window.location.href = url;
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
