require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("../public"));

let accessToken = "";
let instanceUrl = "";

app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;

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

    res.redirect("/");
  } catch (err) {
    console.error("OAuth Error:", err.response?.data || err.message);
    res.status(500).send("OAuth Error");
  }
});


app.get("/validation-rules", async (req, res) => {
  try {

    const query = `
      SELECT Id, ValidationName, Active
      FROM ValidationRule
      WHERE EntityDefinition.QualifiedApiName='Account'
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
    res.status(500).send(err.response?.data || err.message);
  }
});


app.post("/deploy", async (req, res) => {
  try {
    const rules = req.body;

    console.log("Deploy called with rules:");
    console.log(rules);

    for (let rule of rules) {
      console.log(`Updating ${rule.ValidationName} -> ${rule.Active}`);

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

    res.send("Deployment successful");
  } catch (err) {
    console.error("DEPLOY ERROR:", err.response?.data || err.message);
    res.status(500).send(err.response?.data || err.message);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
