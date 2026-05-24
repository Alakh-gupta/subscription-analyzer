require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const { google } = require("googleapis");
const Usage = require("./models/Usage");
const Subscription = require("./models/Subscription");

// ------------------ OAuth Setup ------------------
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ------------------ MongoDB Connection ------------------
const MONGODB_URI = (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes("<db_password>"))
  ? process.env.MONGODB_URI 
  : "mongodb://127.0.0.1:27017/subscription";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB Connected to:", MONGODB_URI.startsWith("mongodb+srv") ? "MongoDB Atlas (Cloud)" : "Local MongoDB"))
  .catch(err => console.error("MongoDB Connection Error:", err));

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

    // 3️⃣ Get cost of subscription from MongoDB
    const sub = await Subscription.findOne({ platform: new RegExp(`^${platform}$`, 'i') });
    const cost = sub ? sub.cost : 9.99;

    // 4️⃣ Call trained AI Model Predict Endpoint
    let recommendation = "Not Worth It ❌";
    let isAiModel = false;
    try {
      const aiRes = await axios.post("http://127.0.0.1:7000/predict", {
        cost: parseFloat(cost),
        usage_hours: parseFloat(totalHours),
        security_score: parseInt(securityScore)
      });
      recommendation = aiRes.data.recommendation;
      isAiModel = true;
    } catch (aiErr) {
      // Fallback heuristics if python AI server is not reachable
      if (totalHours >= 10 && securityScore >= 70) {
        recommendation = "Worth It ✅";
      } else if (totalHours >= 5) {
        recommendation = "Use Occasionally ⚠️";
      }
    }

    res.json({
      platform,
      cost,
      usage_hours: parseFloat(totalHours),
      security_score: securityScore,
      recommendation,
      engine: isAiModel ? "Trained Decision Tree AI Model" : "Fallback Heuristics Rule Engine"
    });

  } catch (error) {
    res.status(500).json({ error: "Recommendation engine failed", details: error.message });
  }
});

// ------------------ Simulated Gmail Scanning (Resilient Fallback) ------------------
app.post("/api/auth/google/mock", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Decide which subscriptions to discover based on email content
    let discoveredSubs = [];
    const lowerEmail = email.toLowerCase();
    
    const platformTiers = {
      "Netflix": [6.99, 15.49, 22.99],
      "Spotify": [5.99, 10.99, 14.99, 16.99],
      "Amazon Prime": [8.99, 14.99],
      "Hulu": [7.99, 17.99],
      "JioHotstar": [5.99, 12.99],
      "YouTube Premium": [7.99, 13.99, 22.99],
      "Disney+": [7.99, 13.99],
      "Apple TV+": [9.99],
      "Apple Music": [5.99, 10.99, 16.99],
      "Max": [9.99, 15.99, 19.99],
      "Audible": [7.95, 14.95, 22.95]
    };

    const getRandomCost = (platform) => {
      const tiers = platformTiers[platform];
      return tiers[Math.floor(Math.random() * tiers.length)];
    };

    if (lowerEmail.includes("netflix")) {
      discoveredSubs.push({ platform: "Netflix", cost: getRandomCost("Netflix") });
    } else if (lowerEmail.includes("spotify")) {
      discoveredSubs.push({ platform: "Spotify", cost: getRandomCost("Spotify") });
    } else if (lowerEmail.includes("prime") || lowerEmail.includes("amazon")) {
      discoveredSubs.push({ platform: "Amazon Prime", cost: getRandomCost("Amazon Prime") });
    } else if (lowerEmail.includes("hulu")) {
      discoveredSubs.push({ platform: "Hulu", cost: getRandomCost("Hulu") });
    } else if (lowerEmail.includes("jio") || lowerEmail.includes("hotstar")) {
      discoveredSubs.push({ platform: "JioHotstar", cost: getRandomCost("JioHotstar") });
    } else if (lowerEmail.includes("youtube")) {
      discoveredSubs.push({ platform: "YouTube Premium", cost: getRandomCost("YouTube Premium") });
    } else if (lowerEmail.includes("disney")) {
      discoveredSubs.push({ platform: "Disney+", cost: getRandomCost("Disney+") });
    } else if (lowerEmail.includes("apple")) {
      discoveredSubs.push({ platform: "Apple TV+", cost: getRandomCost("Apple TV+") });
      discoveredSubs.push({ platform: "Apple Music", cost: getRandomCost("Apple Music") });
    } else if (lowerEmail.includes("hbo") || lowerEmail.includes("max")) {
      discoveredSubs.push({ platform: "Max", cost: getRandomCost("Max") });
    } else if (lowerEmail.includes("audible")) {
      discoveredSubs.push({ platform: "Audible", cost: getRandomCost("Audible") });
    } else {
      // Default bundle representing typical household services with randomized costs
      discoveredSubs = [
        { platform: "Netflix", cost: getRandomCost("Netflix") },
        { platform: "Spotify", cost: getRandomCost("Spotify") },
        { platform: "YouTube Premium", cost: getRandomCost("YouTube Premium") }
      ];
    }

    const uniqueSubs = [];
    // Save to DB
    for (const sub of discoveredSubs) {
      let activeSub = await Subscription.findOne({ platform: new RegExp(`^${sub.platform}$`, 'i') });
      if (!activeSub) {
        activeSub = await Subscription.create(sub);
        uniqueSubs.push(activeSub);
      }

      // Check total tracked seconds for this platform
      const usageDocs = await Usage.find({ platform: new RegExp(`^${sub.platform}$`, 'i') });
      const totalSeconds = usageDocs.reduce((sum, u) => sum + u.seconds, 0);

      // If the platform has no watch history or extremely low watch history (< 1 hour),
      // we auto-generate an immediate active watch time (e.g. 5 to 25 hours) so that the
      // AI model has realistic data to perform its value analysis!
      if (totalSeconds < 3600) {
        const dummySeconds = Math.floor(Math.random() * (90000 - 18000 + 1)) + 18000; 
        await Usage.create({ platform: sub.platform, seconds: dummySeconds });
      }
    }

    res.json({
      success: true,
      found: discoveredSubs.length,
      imported: uniqueSubs.length,
      subscriptions: discoveredSubs
    });

  } catch (error) {
    res.status(500).json({ error: "Simulated scan failed", details: error.message });
  }
});

// ------------------ Real Gmail Scanning (OAuth) ------------------
app.get("/api/auth/google", (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/gmail.readonly"];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(url);
});

app.get("/api/auth/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Call Gmail API
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    
    // Search for typical subscription keywords in user's real inbox
    const response = await gmail.users.messages.list({
      userId: "me",
      q: "subject:receipt OR subject:subscription OR subject:billing OR from:netflix OR from:spotify OR from:prime OR from:hulu",
      maxResults: 20,
    });

    const messages = response.data.messages || [];
    let discoveredSubs = [];

    if (messages.length > 0) {
      for (const msg of messages) {
        const fullMsg = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From"]
        });
        
        const headers = fullMsg.data.payload.headers;
        const fromHeader = headers.find(h => h.name === "From")?.value.toLowerCase() || "";
        const subjectHeader = headers.find(h => h.name === "Subject")?.value.toLowerCase() || "";
        
        const content = fromHeader + " " + subjectHeader;
        
        if (content.includes("netflix")) discoveredSubs.push({ platform: "Netflix", cost: 15.49 });
        else if (content.includes("spotify")) discoveredSubs.push({ platform: "Spotify", cost: 10.99 });
        else if (content.includes("prime") || content.includes("amazon")) discoveredSubs.push({ platform: "Amazon Prime", cost: 14.99 });
        else if (content.includes("hulu")) discoveredSubs.push({ platform: "Hulu", cost: 7.99 });
      }
    }

    // Remove duplicates
    const uniqueSubs = [];
    const seen = new Set();
    for (const sub of discoveredSubs) {
      if (!seen.has(sub.platform)) {
        seen.add(sub.platform);
        uniqueSubs.push(sub);
      }
    }

    // Save to DB
    for (const sub of uniqueSubs) {
      const exists = await Subscription.findOne({ platform: sub.platform });
      if (!exists) {
        await Subscription.create(sub);
        const dummySeconds = Math.floor(Math.random() * (72000 - 3600 + 1)) + 3600; 
        await Usage.create({ platform: sub.platform, seconds: dummySeconds });
      }
    }

    // Redirect back to frontend
    res.redirect("http://localhost:5173/dashboard?scan=success&found=" + uniqueSubs.length);

  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect("http://localhost:5173/dashboard?scan=error");
  }
});

// ------------------ Subscriptions ------------------
app.post("/api/subscriptions", async (req, res) => {
  try {
    let platform = req.body.platform;
    let cost = req.body.cost;
    const profileLink = req.body.profileLink;

    if (profileLink) {
      try {
        let urlString = profileLink;
        // add https if missing
        if (!/^https?:\/\//i.test(urlString)) {
          urlString = 'https://' + urlString;
        }
        
        const url = new URL(urlString);
        const domain = url.hostname.toLowerCase();
        
        const platformMap = {
          "netflix.com": { name: "Netflix", cost: 15.49 },
          "www.netflix.com": { name: "Netflix", cost: 15.49 },
          "open.spotify.com": { name: "Spotify", cost: 10.99 },
          "spotify.com": { name: "Spotify", cost: 10.99 },
          "youtube.com": { name: "YouTube Premium", cost: 13.99 },
          "www.youtube.com": { name: "YouTube Premium", cost: 13.99 },
          "primevideo.com": { name: "Amazon Prime", cost: 14.99 },
          "www.primevideo.com": { name: "Amazon Prime", cost: 14.99 },
          "amazon.com": { name: "Amazon Prime", cost: 14.99 },
          "www.amazon.com": { name: "Amazon Prime", cost: 14.99 },
          "hulu.com": { name: "Hulu", cost: 7.99 },
          "www.hulu.com": { name: "Hulu", cost: 7.99 },
          "hotstar.com": { name: "JioHotstar", cost: 12.99 },
          "www.hotstar.com": { name: "JioHotstar", cost: 12.99 },
        };

        const found = platformMap[domain];
        if (found) {
          platform = found.name;
          cost = found.cost;
        } else {
          // Fallback if domain is not known
          platform = domain.replace("www.", "").split(".")[0];
          platform = platform.charAt(0).toUpperCase() + platform.slice(1);
          cost = 9.99; // Default estimated cost
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid profile link URL" });
      }
    }

    if (!platform || cost === undefined) {
      return res.status(400).json({ error: "Platform and cost are required" });
    }

    const sub = await Subscription.create({ platform, cost });

    // Auto-generate some dummy watch time (1 to 20 hours) for demonstration purposes 
    // so the dashboard populates immediately when a link is pasted.
    if (profileLink) {
      const dummySeconds = Math.floor(Math.random() * (72000 - 3600 + 1)) + 3600; 
      try {
        const Usage = require("./models/Usage");
        await Usage.create({ platform, seconds: dummySeconds });
      } catch (err) {
        console.error("Failed to add dummy usage", err);
      }
    }

    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ error: "Failed to add subscription", details: err.message });
  }
});

app.get("/api/subscriptions", async (req, res) => {
  try {
    const subs = await Subscription.find();
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

app.delete("/api/subscriptions/:id", async (req, res) => {
  try {
    await Subscription.findByIdAndDelete(req.params.id);
    res.json({ message: "Subscription deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete subscription" });
  }
});

app.put("/api/subscriptions/:id", async (req, res) => {
  try {
    const { platform, cost } = req.body;
    const updatedSub = await Subscription.findByIdAndUpdate(
      req.params.id,
      { platform, cost },
      { new: true }
    );
    res.json(updatedSub);
  } catch (err) {
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

// Caches to optimize real-time 1-second polling
const securityCache = {};
const aiRecommendationCache = {};

// ------------------ Dashboard ------------------
app.get("/api/dashboard", async (req, res) => {
  try {
    const subscriptions = await Subscription.find().lean();
    const usageData = await Usage.aggregate([
      { $group: { _id: "$platform", total: { $sum: "$seconds" } } }
    ]);

    const usageMap = {};
    usageData.forEach(u => { 
      // handle case insensitivity
      usageMap[u._id.toLowerCase()] = u.total; 
    });

    const dashboard = await Promise.all(subscriptions.map(async sub => {
      const totalSeconds = usageMap[sub.platform.toLowerCase()] || 0;
      const totalHours = (totalSeconds / 3600).toFixed(2);
      
      const now = Date.now();
      const platformKey = sub.platform.toLowerCase();
      
      // 1. Get security score (with 30-second cache)
      let securityScore = 70; // safe fallback
      if (securityCache[platformKey] && now < securityCache[platformKey].expireAt) {
        securityScore = securityCache[platformKey].score;
      } else {
        try {
          const securityRes = await axios.get(`http://127.0.0.1:7000/security/${sub.platform}`);
          securityScore = securityRes.data.security_score;
          securityCache[platformKey] = {
            score: securityScore,
            expireAt: now + 30000 // 30 seconds cache
          };
        } catch (err) {
          // If python service is down, use cached value if exists, else fallback
          if (securityCache[platformKey]) {
            securityScore = securityCache[platformKey].score;
          }
        }
      }
      
      // 2. Get AI recommendation (with 3-second cache)
      const aiKey = `${platformKey}-${sub.cost}-${totalHours}-${securityScore}`;
      let prompt = "Good Value ✅";
      
      if (aiRecommendationCache[aiKey] && now < aiRecommendationCache[aiKey].expireAt) {
        prompt = aiRecommendationCache[aiKey].recommendation;
      } else {
        try {
          const aiRes = await axios.post("http://127.0.0.1:7000/predict", {
            cost: parseFloat(sub.cost),
            usage_hours: parseFloat(totalHours),
            security_score: parseInt(securityScore)
          });
          prompt = aiRes.data.recommendation;
          aiRecommendationCache[aiKey] = {
            recommendation: prompt,
            expireAt: now + 3000 // 3 seconds cache
          };
        } catch (err) {
          // Fallback rules if ML python microservice is down
          if (sub.cost > 0 && totalHours < 2) {
            prompt = "Underutilized - Consider Canceling ⚠️";
          } else if (sub.cost > 20 && totalHours < 5) {
            prompt = "High Cost for Low Usage ❌";
          } else {
            prompt = "Good Value ✅";
          }
        }
      }

      return {
        ...sub,
        totalHours: parseFloat(totalHours),
        prompt
      };
    }));

    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: "Failed to load dashboard", details: err.message });
  }
});

// ------------------ Unified Subscription Content Search ------------------
app.get("/api/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Query is required" });

    const subscriptions = await Subscription.find().lean();
    const results = [];

    for (const sub of subscriptions) {
      const platform = sub.platform.toLowerCase();
      const encodedQuery = encodeURIComponent(query);

      if (platform.includes("youtube")) {
        try {
          const ytRes = await axios.get(`http://127.0.0.1:7000/search/youtube?q=${encodedQuery}`);
          results.push(ytRes.data);
        } catch (err) {
          results.push({
            platform: "YouTube Premium",
            title: `Search '${query}' on YouTube`,
            url: `https://www.youtube.com/results?search_query=${encodedQuery}`,
            type: "Video/Song 🎵",
            confidence: "Fallback Link ⚠️"
          });
        }
      } else if (platform.includes("spotify")) {
        results.push({
          platform: "Spotify",
          title: `Listen to '${query}' on Spotify`,
          url: `https://open.spotify.com/search/${encodedQuery}`,
          type: "Audio/Song 🎵",
          confidence: "Direct Link ✅"
        });
      } else if (platform.includes("netflix")) {
        results.push({
          platform: "Netflix",
          title: `Watch '${query}' on Netflix`,
          url: `https://www.netflix.com/search?q=${encodedQuery}`,
          type: "Movie/Show 🎬",
          confidence: "Direct Link ✅"
        });
      } else if (platform.includes("hotstar") || platform.includes("jio")) {
        results.push({
          platform: "JioHotstar",
          title: `Stream '${query}' on JioHotstar`,
          url: `https://www.hotstar.com/in/explore?q=${encodedQuery}`,
          type: "Movie/Show 🎬",
          confidence: "Direct Link ✅"
        });
      } else if (platform.includes("prime") || platform.includes("amazon")) {
        results.push({
          platform: "Amazon Prime",
          title: `Search '${query}' on Prime Video`,
          url: `https://www.amazon.com/s?k=${encodedQuery}&i=instant-video`,
          type: "Movie/Show 🎬",
          confidence: "Direct Link ✅"
        });
      } else if (platform.includes("hulu")) {
        results.push({
          platform: "Hulu",
          title: `Search '${query}' on Hulu`,
          url: `https://www.hulu.com/search?q=${encodedQuery}`,
          type: "Movie/Show 🎬",
          confidence: "Direct Link ✅"
        });
      } else {
        // Generic fallback for other platforms
        results.push({
          platform: sub.platform,
          title: `Search '${query}' on ${sub.platform}`,
          url: `https://www.google.com/search?q=site:${platform}+${encodedQuery}`,
          type: "Content 🔎",
          confidence: "Google Search 🔍"
        });
      }
    }

    res.json({ query, results });
  } catch (error) {
    res.status(500).json({ error: "Unified search failed", details: error.message });
  }
});

// ------------------ Server Start ------------------
app.listen(5000, () => {
  console.log("Node API running on port 5000");
});