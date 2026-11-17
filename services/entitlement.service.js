// services/entitlement.service.js
const Entitlement = require("../models/Entitlement");
const Plan = require("../models/Plan");

// Who is the restaurant owner for this logged-in user?
const getTenantAdminId = (user) =>
    user.role === "admin" ? user._id : user.createdBy;

// Which features does this restaurant have? Returns a Set of feature keys.
const getEntitlements = async (adminId) => {
    const entitlement = await Entitlement.findOne({ admin: adminId }).populate("plan");

    // No entitlement yet (for example a brand new restaurant): use the Legacy plan
    if (!entitlement) {
        const legacy = await Plan.findOne({ name: "Legacy" });
        return { features: new Set(legacy ? legacy.features : []), hidden: new Set() };
    }

    const features = new Set(entitlement.plan?.features || []);
    entitlement.granted.forEach((key) => features.add(key));
    entitlement.revoked.forEach((key) => features.delete(key));
    entitlement.hidden.forEach((key) => features.delete(key));
    return { features, hidden: new Set(entitlement.hidden) };
};

module.exports = { getTenantAdminId, getEntitlements };