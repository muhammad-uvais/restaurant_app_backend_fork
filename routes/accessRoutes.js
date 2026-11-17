const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { getMyAccess } = require("../controllers/accessController");

router.get("/me", authenticate, getMyAccess);

module.exports = router;