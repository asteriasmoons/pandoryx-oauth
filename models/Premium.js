const mongoose = require("mongoose");

const premiumSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  tier: { type: String, default: "Supporter" },
  activatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Premium", premiumSchema, "premiums");