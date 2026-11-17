// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController")
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { requirePermission } = require("../middleware/requirePermission")

// Public registration (Superadmin only once — or via DB manually)
// router.post("/register", authController.registerUser); 

// Only superadmin can create admin
router.post("/register/admin", authenticate, authorizeRoles("superadmin"), authController.registerUser);

// Only admin can create staff
router.post("/register/staff", authenticate, authorizeRoles("admin"), requirePermission("staff.create"), authController.registerUser);

// Global login route (anyone)
router.post("/login", authController.loginUser);

// Only superadmin/admin can update users
router.put("/:id", authenticate, authorizeRoles("superadmin","admin"), authController.updateUser);

router.get("/admins", authenticate, authorizeRoles("superadmin"), authController.getAllAdmins);
router.get("/staff", authenticate, authorizeRoles("superadmin"), authController.getAllStaff);
router.get("/staff/mine", authenticate, authorizeRoles("admin"), requirePermission("staff.view"), authController.getAllStaffByAdmin);

router.delete("/:id", authenticate, authorizeRoles('superadmin', 'admin'), authController.deleteUser);



module.exports = router;