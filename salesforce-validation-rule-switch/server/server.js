require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

let accessToken = "";
let instanceUrl = "";

/* ===============================
   ROOT (optional health check)
================================ */
app.get("/", (req, res) => {
  res.send("Salesforce Validation Rule Switch Server is running ✅");
});

/* ===============================
   OAUTH CALLBACK (FIXED)
================================ */
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Authorization code missing ❌");
  }

  try {
    const response = await axios.post(
      "https://login.salesforce.com/services/oauth2/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          redirect_uri: process.env.CALLBACK_URL,
          code
        }
      }
    );

    accessToken = response.data.access_token;
    instanceUrl = response.data.instance_url;

    res.send(`
      <h2>Salesforce Authorization Successful ✅</h2>
      <p>You can now close this tab.</p>
      <p>Access Token stored on server.</p>
    `);

  } catch (err) {
    console.error("OAuth Error:", err.response?.data || err.message);
    res.status(500).send("OAuth failed ❌");
  }
});

/* ===============================
   FETCH VALIDATION RULES
================================ */
app.get("/validation-rules", async (req, res) => {
  if (!accessToken || !instanceUrl) {
    return res.status(401).send("Not authorized ❌");
  }

  try {
    const query = `
      SELECT Id, ValidationName, Active
      FROM ValidationRule
      WHERE EntityDefinition.QualifiedApiName = 'Account'
    `;

    const result = await axios.get(
      `${instanceUrl}/services/data/v59.0/tooling/query`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { q: query }
      }
    );

    const rules = result.data.records;

    for (let rule of rules) {
      const metaResponse = await axios.get(
        `${instanceUrl}/services/data/v59.0/tooling/sobjects/ValidationRule/${rule.Id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      rule.Metadata = metaResponse.data.Metadata;
    }

    res.json(rules);

  } catch (err) {
    console.error("FETCH ERROR:", err.response?.data || err.message);
    res.status(500).send("Failed to fetch validation rules ❌");
  }
});

/* ===============================
   DEPLOY / TOGGLE RULES
================================ */
app.post("/deploy", async (req, res) => {
  if (!accessToken || !instanceUrl) {
    return res.status(401).send("Not authorized ❌");
  }

  try {
    const rules = req.body;

    for (let rule of rules) {
      await axios.patch(
        `${instanceUrl}/services/data/v59.0/tooling/sobjects/ValidationRule/${rule.Id}`,
        {
          Metadata: {
            ...rule.Metadata,
            active: rule.Active
          }
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );
    }

    res.send("Deployment successful ✅");

  } catch (err) {
    console.error("DEPLOY ERROR:", err.response?.data || err.message);
    res.status(500).send("Deployment failed ❌");
  }
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
