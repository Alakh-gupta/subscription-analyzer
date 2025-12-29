const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const Usage = require("./models/Usage");

// ------------------ MongoDB Connection ------------------
mongoose.connect("mongodb://127.0.0.1:27017/subscription")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

// ------------------ App Setup ------------------
const app = express();
app.use(cors());
app.use(express.json());

// ------------------ Save Tracked Time ------------------
app.post("/api/usage", async (req, res) => {
  try {
    // Expected body: { platform: "Netflix", seconds: 120 }
    await Usage.create(req.body);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Failed to save usage data" });
  }
});

// ------------------ Usage Summary ------------------
app.get("/api/summary", async (req, res) => {
  try {
    const data = await Usage.aggregate([
      { $group: { _id: "$platform", total: { $sum: "$seconds" } } }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// ------------------ Cybersecurity (Node → Python) ------------------
app.get("/api/security/:platform", async (req, res) => {
  try {
    const platform = req.params.platform;

    const response = await axios.get(
      `http://127.0.0.1:7000/security/${platform}`
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: "Security service not reachable"
    });
  }
});

// ------------------ Final Recommendation Engine ------------------
app.get("/api/recommendation/:platform", async (req, res) => {
  try {
    const platform = req.params.platform;

    // 1️⃣ Get total usage from MongoDB
    const usageData = await Usage.aggregate([
      { $match: { platform } },
      { $group: { _id: "$platform", total: { $sum: "$seconds" } } }
    ]);

    const totalSeconds = usageData.length ? usageData[0].total : 0;
    const totalHours = (totalSeconds / 3600).toFixed(2);

    // 2️⃣ Get security data from Python service
    const securityRes = await axios.get(
      `http://127.0.0.1:7000/security/${platform}`
    );

    const securityScore = securityRes.data.security_score;

    // 3️⃣ Recommendation Logic
    let recommendation = "Not Worth It ❌";

    if (totalHours >= 10 && securityScore >= 70) {
      recommendation = "Worth It ✅";
    } else if (totalHours >= 5) {
      recommendation = "Use Occasionally ⚠️";
    }

    res.json({
      platform,
      usage_hours: totalHours,
      security_score: securityScore,
      recommendation
    });

  } catch (error) {
    res.status(500).json({ error: "Recommendation engine failed" });
  }
});

// ------------------ Server Start ------------------
app.listen(5000, () => {
  console.log("Node API running on port 5000");
});
