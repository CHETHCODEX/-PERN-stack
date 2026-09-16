"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const salesOrder_controller_1 = require("../controllers/salesOrder.controller");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const validate_1 = require("../middleware/validate");
const validators_1 = require("../validators");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Sales & Admin can view orders
router.get('/', (0, rbac_1.authorizeRoles)(client_1.Role.SALES, client_1.Role.ADMIN), salesOrder_controller_1.getSalesOrders);
router.get('/:id', (0, rbac_1.authorizeRoles)(client_1.Role.SALES, client_1.Role.ADMIN), salesOrder_controller_1.getSalesOrderById);
// Admin-only operational transitions (Case study requirement)
router.post('/:id/confirm', (0, rbac_1.authorizeRoles)(client_1.Role.ADMIN), salesOrder_controller_1.confirmSalesOrder);
router.post('/:id/cancel', (0, rbac_1.authorizeRoles)(client_1.Role.ADMIN), salesOrder_controller_1.cancelSalesOrder);
router.post('/:id/dispatch', (0, rbac_1.authorizeRoles)(client_1.Role.ADMIN), (0, validate_1.validateBody)(validators_1.dispatchSchema), salesOrder_controller_1.dispatchSalesOrder);
exports.default = router;
