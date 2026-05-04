const express = require("express");
const router = express.Router();
const { getCustomers, createAdmin, updateUser, resetUserPassword } = require("../controllers/customers.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { createAdminSchema, updateUserSchema, resetPasswordSchema } = require("../schemas/customer.dto");

// Route: GET /api/v1/customers
router.get("/", requireAuth, requireRole("admin"), getCustomers);
router.post("/admin", requireAuth, requireRole("admin"), validate(createAdminSchema), createAdmin);
router.put("/:id", requireAuth, requireRole("admin"), validate(updateUserSchema), updateUser);
router.put("/:id/password", requireAuth, requireRole("admin"), validate(resetPasswordSchema), resetUserPassword);

module.exports = router;
