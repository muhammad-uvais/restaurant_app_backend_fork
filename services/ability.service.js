const { AbilityBuilder, createMongoAbility } = require("@casl/ability");
const Role = require("../models/Role");
const { getTenantAdminId, getEntitlements } = require("./entitlement.service");

// "payment.advance.create" -> subject "payment", action "advance.create"
const splitKey = (key) => {
  const i = key.indexOf(".");
  return [key.slice(0, i), key.slice(i + 1)];
};

// Works out what this user may do: entitled (what the restaurant has) and allowed (entitled ∩ role)
const getAccess = async (user) => {
  const adminId = getTenantAdminId(user);
  const { features: entitled, hidden } = await getEntitlements(adminId);

  // The admin owns the restaurant and has no role: entitlements only
  if (user.role === "admin") return { entitled, allowed: entitled, hidden };

  // Staff: only the role's permissions that the restaurant also has.
  // The role must belong to the same restaurant.
  const role = user.roleId ? await Role.findOne({ _id: user.roleId, admin: adminId }) : null;
  const rolePermissions = new Set(role ? role.permissions : []);
  const allowed = new Set([...entitled].filter((key) => rolePermissions.has(key)));
  return { entitled, allowed, hidden };
};

// Turns a list of keys into a CASL ability
const buildAbility = (keys) => {
  const { can, build } = new AbilityBuilder(createMongoAbility); 6
  keys.forEach((key) => {
    const [subject, action] = splitKey(key);
    can(action, subject);
  });
  return build();
};

// For controllers that decide the key at runtime (e.g. same route handles both tables and rooms)
const requireOne = async (user, key) => {
  const { entitled, allowed } = await getAccess(user);
  if (!entitled.has(key)) return { code: "FEATURE_NOT_IN_PLAN", message: "This feature is not part of your plan." };
  if (!allowed.has(key)) return { code: "PERMISSION_DENIED", message: "You do not have permission for this action." };
  return null;
};

module.exports = { splitKey, getAccess, buildAbility, requireOne };