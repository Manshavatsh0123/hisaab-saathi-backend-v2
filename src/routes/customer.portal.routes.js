const express = require("express");

const { getCustomerMe, getCustomerAccounts, getCustomerAccountDetails, getCustomerPaymentDetails, getCustomerDashboardSummary,getCustomerAccountPayments,
} = require("../controllers/customer.controller");

const requireAuth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const router = express.Router();

router.get(
    "/me",
    requireAuth,
    requireRole("CUSTOMER"),
    getCustomerMe
);

router.get(
    "/accounts",
    requireAuth,
    requireRole("CUSTOMER"),
    getCustomerAccounts
);

router.get(
    "/accounts/:accountId",
    requireAuth,
    requireRole("CUSTOMER"),
    getCustomerAccountDetails
);


router.get(
    "/accounts/:accountId/payments",
    requireAuth,
    requireRole("CUSTOMER"),
    getCustomerAccountPayments
);

router.get(
    "/payments/:paymentId",
    requireAuth,
    requireRole("CUSTOMER"),
    getCustomerPaymentDetails
);

router.get(
    "/dashboard/summary",
    requireAuth,
    requireRole("CUSTOMER"),
    getCustomerDashboardSummary
);

module.exports = router;