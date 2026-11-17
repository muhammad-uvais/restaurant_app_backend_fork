const { splitKey, getAccess, buildAbility } = require("../services/ability.service");

exports.requirePermission = (key) => async (req, res, next) => {
  try {
    // Only restaurant admins and staff use tenant features
    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({ code: "PERMISSION_DENIED", message: "Access denied." });
    }

    const { entitled, allowed } = await getAccess(req.user);

    if (!entitled.has(key)) {
      return res.status(403).json({ code: "FEATURE_NOT_IN_PLAN", message: "This feature is not part of your plan." });
    }

    const [subject, action] = splitKey(key);
    if (!buildAbility(allowed).can(action, subject)) {
      return res.status(403).json({ code: "PERMISSION_DENIED", message: "You do not have permission for this action." });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: "Permission check failed", error: err.message });
  }
};