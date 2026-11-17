const { allFeatureKeys } = require("../config/catalog");
const { getAccess } = require("../services/ability.service");

exports.getMyAccess = async (req, res) => {
  try {
    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({ code: "PERMISSION_DENIED", message: "Access denied." });
    }

    const { entitled, allowed, hidden } = await getAccess(req.user);

    const features = {};
    allFeatureKeys().forEach((key) => {
      features[key] = hidden.has(key)
        ? "hidden"
        : !entitled.has(key)
          ? "locked"
          : allowed.has(key)
            ? "visible"
            : "disabled";
    });

    res.json({ features });
  } catch (err) {
    res.status(500).json({ message: "Could not load access", error: err.message });
  }
};