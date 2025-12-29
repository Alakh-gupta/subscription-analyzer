const mongoose = require("mongoose");

const UsageSchema = new mongoose.Schema({
  platform: String,
  seconds: Number,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Usage", UsageSchema);
