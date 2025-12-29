const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Usage = require("./models/Usage");

mongoose.connect("mongodb://127.0.0.1:27017/subscription");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/usage", async (req, res) => {
  await Usage.create(req.body);
  res.sendStatus(200);
});

app.get("/api/summary", async (req, res) => {
  const data = await Usage.aggregate([
    { $group: { _id: "$platform", total: { $sum: "$seconds" } } }
  ]);
  res.json(data);
});

app.listen(5000, () => console.log("Node API running"));
