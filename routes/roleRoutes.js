const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const roleController = require("../controllers/roleController");

router.use(authenticate, authorizeRoles("admin"));

router.get("/", roleController.listRoles);
router.post("/", roleController.createRole);
router.put("/:roleId", roleController.updateRole);
router.delete("/:roleId", roleController.deleteRole);

module.exports = router;