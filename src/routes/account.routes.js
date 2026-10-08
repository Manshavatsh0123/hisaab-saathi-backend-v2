const express = require("express");

const {
    createAccount,
    getAccountSummary,
} = require("../controllers/account.controller");

const requireAuth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const router = express.Router();

router.post(
    "/customers/:customerId/accounts",
    requireAuth,
    requireRole("ADMIN"),
    createAccount
);

router.get(
    "/customers/:customerId/accounts/:accountId/summary",
    requireAuth,
    requireRole("ADMIN"),
    getAccountSummary
);

module.exports = router;