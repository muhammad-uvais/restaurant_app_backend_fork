require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");
const Entitlement = require("../models/Entitlement");
const Role = require("../models/Role");

// ---- What to KEEP. Every other admin and staff account is removed. ----
const KEEP_DOMAINS = [
  "app.flamendough.com",
  "flamendough.com",
  "newtownrestaurant.tapnbite.com",
  "app.sevenz.in",
];
const EXPECTED_STAFF = [
  "tahirkhan@gmail.com",
  "syedali3371129@gmail.com",
  "shahalamnewtown@gmail.com",
  "kuddusnewtown@gmail.com",
  "parvejnewtown@gmail.com",
  "suhailnewtown@gmail.com",
  "shahanshahnewtown@gmail.com",
];

const APPLY = process.argv.includes("--apply");
const confirmArg = (process.argv.find((a) => a.startsWith("--confirm=")) || "").split("=")[1];
const fail = (message) => {
  console.error(`STOP: ${message}`);
  process.exit(1);
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URL);
  const dbName = mongoose.connection.name;
  console.log(`Database: ${dbName} | Mode: ${APPLY ? "APPLY" : "DRY RUN (nothing is changed)"}\n`);

  // 1. Report every admin and what is attached to it
  const admins = await User.find({ role: "admin" }).lean();
  const isKept = (a) => KEEP_DOMAINS.includes(a.domain) && a.isDeleted !== true;

  console.log("ALL ADMINS");
  for (const a of admins) {
    const [staff, menu, orders] = await Promise.all([
      User.countDocuments({ role: "staff", createdBy: a._id }),
      MenuItem.countDocuments({ user: a._id }),
      Order.countDocuments({ user: a._id }),
    ]);
    console.log(
      `${isKept(a) ? "KEEP  " : "REMOVE"} ${a.domain || "(no domain)"} | ${a.restaurantName} | ${a.email} | deleted:${a.isDeleted === true} | staff:${staff} menu:${menu} orders:${orders}`
    );
  }

  // 2. Safety checks
  const keepAdmins = admins.filter(isKept);
  if (keepAdmins.length !== KEEP_DOMAINS.length)
    fail(`expected ${KEEP_DOMAINS.length} active admins for the keep domains, found ${keepAdmins.length}`);
  const keepAdminIds = keepAdmins.map((a) => a._id);

  const keepStaff = await User.find({
    role: "staff",
    createdBy: { $in: keepAdminIds },
    isDeleted: { $ne: true },
  }).lean();
  const found = keepStaff.map((s) => s.email.toLowerCase()).sort();
  const expected = EXPECTED_STAFF.map((e) => e.toLowerCase()).sort();
  const missing = expected.filter((e) => !found.includes(e));
  const extra = found.filter((e) => !expected.includes(e));
  console.log(`\nSTAFF TO KEEP (${found.length}): ${found.join(", ")}`);
  if (missing.length) fail(`expected staff not found under kept admins: ${missing.join(", ")}`);
  if (extra.length) fail(`unexpected active staff under kept admins: ${extra.join(", ")}`);

  const keepRestaurantIds = (
    await Restaurant.find({ user: { $in: keepAdminIds } }, "_id").lean()
  ).map((r) => r._id);
  const keepStaffIds = keepStaff.map((s) => s._id);
  const allAdminIds = admins.map((a) => a._id);

  // Orders are deliberately NOT deleted. This filter is only used to show how many remain.
  const ordersOfRemoved = {
    user: { $nin: keepAdminIds },
    "source.restaurantId": { $nin: keepRestaurantIds },
  };

  // 3. What would be deleted (orders are not in this list)
  const filters = {
    menuItems: { user: { $nin: keepAdminIds } },
    restaurants: { user: { $nin: keepAdminIds } },
    entitlements: { admin: { $nin: keepAdminIds } },
    roles: { admin: { $nin: keepAdminIds } },
    users: {
      role: { $in: ["admin", "staff"] },
      _id: { $nin: [...keepAdminIds, ...keepStaffIds] },
      createdBy: { $nin: keepAdminIds }, // never delete staff of the live restaurants, even soft-deleted ones
    },
  };
  const models = {
    menuItems: MenuItem,
    restaurants: Restaurant,
    entitlements: Entitlement,
    roles: Role,
    users: User,
  };

  console.log("\nWILL DELETE");
  for (const key of Object.keys(filters)) {
    console.log(`${key}: ${await models[key].countDocuments(filters[key])}`);
  }

  // Safeguard: do live restaurants have orders that use a menu item we are about to delete?
  const menuToDeleteIds = await MenuItem.find(filters.menuItems).distinct("_id");
  const keptOrdersUsingThem = await Order.countDocuments({
    user: { $in: keepAdminIds },
    "items.menuItemId": { $in: menuToDeleteIds },
  });
  console.log(`orders of kept restaurants that use a menu item about to be deleted: ${keptOrdersUsingThem}`);

  console.log(
    `ORDERS: not deleted. ${await Order.countDocuments(ordersOfRemoved)} belong to removed restaurants and stay in the database.`
  );
  console.log(
    `  of those, ${await Order.countDocuments({ ...ordersOfRemoved, user: { $nin: allAdminIds } })} point at something that is not an admin`
  );
  console.log(
    `NOT TOUCHED: superadmins ${await User.countDocuments({ role: "superadmin" })}, user-role accounts ${await User.countDocuments({ role: "user" })}`
  );

  if (!APPLY) {
    console.log(`\nDry run only. To delete: node scripts/cleanDb.js --apply --confirm=${dbName}`);
    return;
  }
  if (confirmArg !== dbName) fail("--confirm must equal the database name shown above");
  if (keptOrdersUsingThem > 0) fail("kept restaurants have orders that use menu items about to be deleted");

  // 4. Delete: dependent data first, users last. Orders are never touched.
  const ordersBefore = await Order.countDocuments();
  for (const key of Object.keys(filters)) {
    const result = await models[key].deleteMany(filters[key]);
    console.log(`${key}: deleted ${result.deletedCount}`);
  }
  const ordersAfter = await Order.countDocuments();
  console.log(`orders total: before ${ordersBefore}, after ${ordersAfter}`);
  if (ordersBefore !== ordersAfter) console.error("WARNING: the number of orders changed");
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());