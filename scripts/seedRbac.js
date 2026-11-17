require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Plan = require("../models/Plan");
const Entitlement = require("../models/Entitlement");
const Role = require("../models/Role");
const { allFeatureKeys, legacyStaffKeys } = require("../config/catalog");

const DRY = process.argv.includes("--dry");
const log = (message) => console.log(`${DRY ? "[DRY] " : ""}${message}`);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URL);
  const keys = allFeatureKeys();

  // 1. Legacy plan: every feature in the software
  let plan = await Plan.findOne({ name: "Legacy" });
  if (!DRY) {
    plan = await Plan.findOneAndUpdate(
      { name: "Legacy" },
      { $set: { features: keys } },
      { upsert: true, new: true }
    );
  }
  log(`Legacy plan has ${keys.length} features`);

  const admins = await User.find({ role: "admin", isDeleted: { $ne: true } }).select("_id restaurantName");

  for (const admin of admins) {
    // 2. Entitlement: put this restaurant on the Legacy plan
    if (!(await Entitlement.exists({ admin: admin._id }))) {
      log(`entitlement created for ${admin.restaurantName}`);
      if (!DRY) await Entitlement.create({ admin: admin._id, plan: plan._id });
    }

    // 3. "Staff (legacy)" role: only what staff can do today (refreshed on every run)
    let role = await Role.findOne({ admin: admin._id, name: "Staff (legacy)" });
    log(`${role ? "role refreshed" : "role created"} for ${admin.restaurantName}`);
    if (!DRY) {
      role = await Role.findOneAndUpdate(
        { admin: admin._id, name: "Staff (legacy)" },
        { $set: { permissions: legacyStaffKeys() } },
        { upsert: true, new: true }
      );
    }

    // 4. Give staff who have no role yet the legacy role
    const filter = { role: "staff", createdBy: admin._id, isDeleted: { $ne: true }, roleId: null };
    const count = await User.countDocuments(filter);
    if (count) {
      log(`${count} staff given the legacy role (${admin.restaurantName})`);
      if (!DRY) await User.updateMany(filter, { $set: { roleId: role._id } });
    }
  }

  await mongoose.disconnect();
  log("Done");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});