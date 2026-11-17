const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    permissions: [String],
  },
  { timestamps: true }
);
roleSchema.index({ admin: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Role", roleSchema);