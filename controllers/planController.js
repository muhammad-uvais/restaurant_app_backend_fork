const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const Entitlement = require("../models/Entitlement");
const { catalog, allFeatureKeys } = require("../config/catalog");

const validKeys = new Set(allFeatureKeys());

// Returns an error message, or null if the list is fine
const checkFeatures = (features) => {
    if (!Array.isArray(features) || features.length === 0) return "features must be a non-empty array";
    const unknown = features.filter((key) => !validKeys.has(key));
    if (unknown.length) return `Unknown feature keys: ${unknown.join(", ")}`;
    return null;
};

// What the super admin screen shows: all modules and their features
exports.getCatalog = (req, res) => res.json({ catalog });

exports.listPlans = async (req, res) => {
    try {
        const plans = await Plan.find().sort({ name: 1 }).lean();
        const counts = await Entitlement.aggregate([{ $group: { _id: "$plan", count: { $sum: 1 } } }]);
        const usedBy = new Map(counts.map((c) => [String(c._id), c.count]));
        res.json({ plans: plans.map((p) => ({ ...p, restaurants: usedBy.get(String(p._id)) || 0 })) });
    } catch (err) {
        res.status(500).json({ message: "Could not load plans", error: err.message });
    }
};

exports.createPlan = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        if (!name) return res.status(400).json({ message: "name is required" });

        const problem = checkFeatures(req.body.features);
        if (problem) return res.status(400).json({ message: problem });

        if (await Plan.exists({ name })) return res.status(409).json({ message: "A plan with this name already exists" });

        const plan = await Plan.create({ name, features: [...new Set(req.body.features)] });
        res.status(201).json({ plan });
    } catch (err) {
        res.status(500).json({ message: "Could not create plan", error: err.message });
    }
};

exports.updatePlan = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.planId)) return res.status(400).json({ message: "Invalid plan id" });

        const plan = await Plan.findById(req.params.planId);
        if (!plan) return res.status(404).json({ message: "Plan not found" });
        if (plan.name === "Legacy") {
            return res.status(400).json({ message: "The Legacy plan is managed by the seed script and cannot be edited" });
        }

        if (req.body.name !== undefined) {
            const name = String(req.body.name).trim();
            if (!name) return res.status(400).json({ message: "name cannot be empty" });
            if (name !== plan.name && (await Plan.exists({ name }))) {
                return res.status(409).json({ message: "A plan with this name already exists" });
            }
            plan.name = name;
        }

        if (req.body.features !== undefined) {
            const problem = checkFeatures(req.body.features);
            if (problem) return res.status(400).json({ message: problem });
            plan.features = [...new Set(req.body.features)];
        }

        await plan.save();
        const restaurants = await Entitlement.countDocuments({ plan: plan._id });
        res.json({ plan, restaurantsAffected: restaurants });
    } catch (err) {
        res.status(500).json({ message: "Could not update plan", error: err.message });
    }
};

exports.deletePlan = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.planId)) return res.status(400).json({ message: "Invalid plan id" });

        const plan = await Plan.findById(req.params.planId);
        if (!plan) return res.status(404).json({ message: "Plan not found" });
        if (plan.name === "Legacy") return res.status(400).json({ message: "The Legacy plan cannot be deleted" });

        const inUse = await Entitlement.countDocuments({ plan: plan._id });
        if (inUse) return res.status(409).json({ message: `${inUse} restaurant(s) still use this plan. Move them first.` });

        await plan.deleteOne();
        res.json({ message: "Plan deleted" });
    } catch (err) {
        res.status(500).json({ message: "Could not delete plan", error: err.message });
    }
};