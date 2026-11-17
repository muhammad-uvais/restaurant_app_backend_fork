// routes/analytics.js
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const  analyticsController = require("../controllers/analyticsController");
const { authorizeRoles } = require("../middleware/roleMiddleware")
const { requirePermission } = require("../middleware/requirePermission");

router.get("/insights", authenticate, authorizeRoles("admin"), requirePermission("analytics.revenue"), analyticsController.getRestaurantInsights);
router.get("/top-products", authenticate, authorizeRoles("admin"), requirePermission("analytics.products"), analyticsController.getTopSellingProducts);
router.get("/top-categories", authenticate, authorizeRoles("admin"), requirePermission("analytics.categories"), analyticsController.getTopSellingCategories);

module.exports = router;
