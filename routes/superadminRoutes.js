const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const planController = require("../controllers/planController");
const restaurantAccessController = require("../controllers/restaurantAccessController");

// Everything under /api/superadmin is for super admins only
router.use(authenticate, authorizeRoles("superadmin"));

router.get("/catalog", planController.getCatalog);
router.get("/plans", planController.listPlans);
router.post("/plans", planController.createPlan);
router.put("/plans/:planId", planController.updatePlan);
router.delete("/plans/:planId", planController.deletePlan);

router.get("/restaurants", restaurantAccessController.listRestaurants);
router.get("/restaurants/:adminId/access", restaurantAccessController.getRestaurantAccess);
router.put("/restaurants/:adminId/entitlement", restaurantAccessController.updateRestaurantEntitlement);

module.exports = router;