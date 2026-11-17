const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    features: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);