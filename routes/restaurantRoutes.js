// routes/restaurantRoutes.js
const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const getTenant = require("../middleware/tenantMiddleware");
const { authenticate } = require("../middleware/authMiddleware");
const upload = require("../middleware/multer");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { requirePermission } = require("../middleware/requirePermission");

// Public: qr info
router.get("/public/qr-info", restaurantController.getQrInfo);

// Public: Get restaurant details using tenant context (QR / domain based)
router.get("/public", getTenant, restaurantController.getPublicRestaurant);

// Admin/Staff: Get restaurant details
router.get("/private", authenticate, authorizeRoles("admin", "staff"), requirePermission("restaurant.view"), restaurantController.getRestaurant);

// Admin: Update restaurant details (supports file upload)
router.put("/", authenticate, upload.single("file"), authorizeRoles("admin"), requirePermission("restaurant.edit"), restaurantController.updateRestaurant);

// Admin: Update GST configuration
router.patch("/gst", authenticate, authorizeRoles("admin"), requirePermission("restaurant.gst"), restaurantController.updateRestaurantGST);

// Admin: Toggle restaurant open/close status
router.patch("/status", authenticate, authorizeRoles("admin"), requirePermission("restaurant.status"), restaurantController.updateRestaurantStatus);

// Super Admin: Soft delete restaurant
router.delete("/", authenticate, authorizeRoles("superadmin"), restaurantController.deleteRestaurant);

// Admin: Add category
router.post("/categories", authenticate, authorizeRoles("admin"), requirePermission("menu.category.create"), restaurantController.createCategories);

// Admin: Rename category
router.patch("/categories/:categoryId", authenticate, authorizeRoles("admin"), requirePermission("menu.category.edit"), restaurantController.updateCategory);

// Admin: Reorder menu categories
router.post("/categories/reorder", authenticate, authorizeRoles("admin"), requirePermission("menu.category.reorder"), restaurantController.reorderCategories);

// Admin: Delete category
router.delete("/categories/:categoryId", authenticate, authorizeRoles("admin"), requirePermission("menu.category.delete"), restaurantController.deleteCategory);

// Admin: Create sections and units (tables/rooms)
router.post("/sections", authenticate, authorizeRoles("admin"), restaurantController.createSectionsAndUnits);

// Admin: Update Section
router.patch("/sections", authenticate, authorizeRoles("admin"),restaurantController.updateSections);

// Admin: Delete Section
router.delete("/sections/:sectionId", authenticate, authorizeRoles("admin"), restaurantController.deleteSection);

// Admin: Delete Unit
router.delete("/sections/units/:unitId", authenticate, authorizeRoles("admin"), restaurantController.deleteUnit);

// Admin: Book a room (initialize stay)
router.post("/room-booking", authenticate, authorizeRoles("admin", "staff"), requirePermission("room.booking.create"), restaurantController.createRoomBooking);

// Admin/Staff: Get live unit occupancy status (tables/rooms)
router.get("/units/live-status", authenticate, authorizeRoles("admin", "staff"), restaurantController.getLiveOccupancy);

module.exports = router;