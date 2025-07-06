const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const Premium = require("./models/Premium");

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

app.get("/api/oauth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  try {
    // 1. Exchange code for access token
    const tokenRes = await axios.post("https://www.patreon.com/api/oauth2/token", null, {
      params: {
        code,
        grant_type: "authorization_code",
        client_id: process.env.PATREON_CLIENT_ID,
        client_secret: process.env.PATREON_CLIENT_SECRET,
        redirect_uri: process.env.PATREON_REDIRECT_URI,
      },
    });

    const accessToken = tokenRes.data.access_token;

    // 2. Fetch user info
    const userRes = await axios.get("https://www.patreon.com/api/oauth2/v2/identity?include=memberships", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
	console.log(JSON.stringify(userRes.data, null, 2));

    const discordUserId = userRes.data.included?.[0]?.attributes?.social_connections?.discord?.user_id;
    const tier = userRes.data.included?.[0]?.attributes?.currently_entitled_tiers?.[0]?.title || "Unknown";

    if (!discordUserId) return res.status(400).send("No Discord linked to Patreon.");

    await Premium.updateOne(
      { discordId: discordUserId },
      { $set: { tier, activatedAt: new Date() } },
      { upsert: true }
    );

    return res.send("✅ Premium access granted! You can now use premium commands in Pandoryx.");
  } catch (err) {
    console.error("OAuth error:", err?.response?.data || err.message);
    return res.status(500).send("Something went wrong.");
  }
});

app.listen(PORT, () => {
  console.log(`OAuth server listening on port ${PORT}`);
});
