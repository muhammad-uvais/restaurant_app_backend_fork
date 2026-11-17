const mongoose = require("mongoose");
const Role = require("../models/Role");
const User = require("../models/User");
const { allFeatureKeys } = require("../config/catalog");
const { getEntitlements } = require("../services/entitlement.service");

const validKeys = new Set(allFeatureKeys());

// A role may only use keys that exist in the catalog AND that this restaurant currently has
const checkPermissions = async (adminId, permissions) => {
  if (!Array.isArray(permissions) || permissions.length === 0) return "permissions must be a non-empty array";

  const unknown = permissions.filter((key) => !validKeys.has(key));
  if (unknown.length) return `Unknown feature keys: ${unknown.join(", ")}`;

  const { features: entitled } = await getEntitlements(adminId);
  const notEntitled = permissions.filter((key) => !entitled.has(key));
  if (notEntitled.length) return `Your restaurant does not have these features: ${notEntitled.join(", ")}`;

  return null;
};

exports.listRoles = async (req, res) => {
  try {
    const roles = await Role.find({ admin: req.user._id }).sort({ name: 1 }).lean();
    const counts = await User.aggregate([
      { $match: { role: "staff", createdBy: req.user._id, isDeleted: { $ne: true } } },
      { $group: { _id: "$roleId", count: { $sum: 1 } } },
    ]);
    const staffCount = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json({ roles: roles.map((r) => ({ ...r, staffCount: staffCount.get(String(r._id)) || 0 })) });
  } catch (err) {
    res.status(500).json({ message: "Could not load roles", error: err.message });
  }
};

exports.createRole = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "name is required" });

    const problem = await checkPermissions(req.user._id, req.body.permissions);
    if (problem) return res.status(400).json({ message: problem });

    if (await Role.exists({ admin: req.user._id, name })) {
      return res.status(409).json({ message: "A role with this name already exists" });
    }

    const role = await Role.create({
      admin: req.user._id,
      name,
      permissions: [...new Set(req.body.permissions)],
    });
    res.status(201).json({ role });
  } catch (err) {
    res.status(500).json({ message: "Could not create role", error: err.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.roleId)) return res.status(400).json({ message: "Invalid role id" });

    const role = await Role.findOne({ _id: req.params.roleId, admin: req.user._id });
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.name === "Staff (legacy)") {
      return res.status(400).json({ message: "The Staff (legacy) role cannot be edited" });
    }

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: "name cannot be empty" });
      if (name !== role.name && (await Role.exists({ admin: req.user._id, name }))) {
        return res.status(409).json({ message: "A role with this name already exists" });
      }
      role.name = name;
    }

    if (req.body.permissions !== undefined) {
      const problem = await checkPermissions(req.user._id, req.body.permissions);
      if (problem) return res.status(400).json({ message: problem });
      role.permissions = [...new Set(req.body.permissions)];
    }

    await role.save();
    const staffCount = await User.countDocuments({ role: "staff", roleId: role._id, isDeleted: { $ne: true } });
    res.json({ role, staffAffected: staffCount });
  } catch (err) {
    res.status(500).json({ message: "Could not update role", error: err.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.roleId)) return res.status(400).json({ message: "Invalid role id" });

    const role = await Role.findOne({ _id: req.params.roleId, admin: req.user._id });
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.name === "Staff (legacy)") {
      return res.status(400).json({ message: "The Staff (legacy) role cannot be deleted" });
    }

    const inUse = await User.countDocuments({ role: "staff", roleId: role._id, isDeleted: { $ne: true } });
    if (inUse) return res.status(409).json({ message: `${inUse} staff member(s) still use this role. Reassign them first.` });

    await role.deleteOne();
    res.json({ message: "Role deleted" });
  } catch (err) {
    res.status(500).json({ message: "Could not delete role", error: err.message });
  }
};