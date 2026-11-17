const mongoose = require("mongoose");
const User = require("../models/User");
const Plan = require("../models/Plan");
const Entitlement = require("../models/Entitlement");
const { allFeatureKeys } = require("../config/catalog");
const { getEntitlements } = require("../services/entitlement.service");

const validKeys = new Set(allFeatureKeys());

// Only an active restaurant admin counts as a "restaurant"
const findRestaurantAdmin = async (adminId) => {
  if (!mongoose.isValidObjectId(adminId)) return null;
  return User.findOne({ _id: adminId, role: "admin", isDeleted: { $ne: true } })
    .select("_id restaurantName domain email");
};

const checkKeys = (list, field) => {
  if (!Array.isArray(list)) return `${field} must be an array`;
  const unknown = list.filter((key) => !validKeys.has(key));
  return unknown.length ? `Unknown feature keys in ${field}: ${unknown.join(", ")}` : null;
};

exports.listRestaurants = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin", isDeleted: { $ne: true } })
      .select("_id restaurantName domain email").lean();
    const entitlements = await Entitlement.find({ admin: { $in: admins.map((a) => a._id) } })
      .populate("plan", "name").lean();
    const byAdmin = new Map(entitlements.map((e) => [String(e.admin), e]));

    res.json({
      restaurants: admins.map((a) => {
        const e = byAdmin.get(String(a._id));
        return {
          adminId: a._id,
          restaurantName: a.restaurantName,
          domain: a.domain,
          email: a.email,
          plan: e?.plan?.name || "Legacy (no entitlement yet)",
          granted: e ? e.granted.length : 0,
          revoked: e ? e.revoked.length : 0,
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ message: "Could not load restaurants", error: err.message });
  }
};

exports.getRestaurantAccess = async (req, res) => {
  try {
    const admin = await findRestaurantAdmin(req.params.adminId);
    if (!admin) return res.status(404).json({ message: "Restaurant not found" });

    const entitlement = await Entitlement.findOne({ admin: admin._id }).populate("plan", "name").lean();
    const { features: effective, hidden: hiddenSet } = await getEntitlements(admin._id);
    const granted = new Set(entitlement?.granted || []);
    const revoked = new Set(entitlement?.revoked || []);

    const features = {};
    allFeatureKeys().forEach((key) => {
      const enabled = effective.has(key);
      features[key] = {
        enabled: effective.has(key),
        source: hiddenSet.has(key) ? "hidden" : revoked.has(key) ? "revoked" : granted.has(key) ? "granted" : effective.has(key) ? "plan" : "none",
      };
    });

    res.json({
      restaurant: { adminId: admin._id, restaurantName: admin.restaurantName, domain: admin.domain },
      plan: entitlement?.plan?.name || "Legacy (no entitlement yet)",
      features,
    });
  } catch (err) {
    res.status(500).json({ message: "Could not load access", error: err.message });
  }
};

exports.updateRestaurantEntitlement = async (req, res) => {
  try {
    const admin = await findRestaurantAdmin(req.params.adminId);
    if (!admin) return res.status(404).json({ message: "Restaurant not found" });

    const { planId, granted, revoked, hidden } = req.body;
    if (planId === undefined && granted === undefined && revoked === undefined && hidden === undefined) {
      return res.status(400).json({ message: "Send planId, granted, revoked and/or hidden" });
    }

    if (planId !== undefined && (!mongoose.isValidObjectId(planId) || !(await Plan.exists({ _id: planId })))) {
      return res.status(400).json({ message: "Plan not found" });
    }
    for (const [field, list] of [["granted", granted], ["revoked", revoked], ["hidden", hidden]]) {
      if (list === undefined) continue;
      const problem = checkKeys(list, field);
      if (problem) return res.status(400).json({ message: problem });
    }

    let entitlement = await Entitlement.findOne({ admin: admin._id });
    if (!entitlement) {
      // A restaurant without an entitlement starts on Legacy unless a plan is given
      const planToUse = planId || (await Plan.findOne({ name: "Legacy" }))?._id;
      if (!planToUse) return res.status(400).json({ message: "No plan available. Run the seed first." });
      entitlement = new Entitlement({ admin: admin._id, plan: planToUse });
    }

    if (planId !== undefined) entitlement.plan = planId;
    if (granted !== undefined) entitlement.granted = [...new Set(granted)];
    if (revoked !== undefined) entitlement.revoked = [...new Set(revoked)];
    if (hidden !== undefined) entitlement.hidden = [...new Set(hidden)];

    // A feature cannot be granted and revoked at the same time
    const clash = entitlement.granted.filter((key) => entitlement.revoked.includes(key));
    if (clash.length) {
      return res.status(400).json({ message: `Keys cannot be both granted and revoked: ${clash.join(", ")}` });
    }

    await entitlement.save();
    res.json({ message: "Entitlement updated", entitlement });
  } catch (err) {
    res.status(500).json({ message: "Could not update entitlement", error: err.message });
  }
};