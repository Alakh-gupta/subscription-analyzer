const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  cost: { type: Number, required: true },
  domain: { type: String, required: false },
  dateAdded: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
