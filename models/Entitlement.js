const mongoose = require("mongoose");

const entitlementSchema = new mongoose.Schema(
    {
        admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
        granted: [String],
        revoked: [String],
        hidden: [String],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Entitlement", entitlementSchema);