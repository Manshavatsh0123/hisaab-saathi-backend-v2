const express = require("express");

const {
    addAdminCollection,
    getPaymentHistory,
    getAdminCollections,
    getAdminCollectionDetails,
} = require("../controllers/payment.controller");

const requireAuth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const router = express.Router();


router.get(
    "/admin/collections",
    requireAuth,
    requireRole("ADMIN"),
    getAdminCollections
);

router.get(
    "/admin/collections/:paymentId",
    requireAuth,
    requireRole("ADMIN"),
    getAdminCollectionDetails
);

router.post(
    "/customers/:customerId/accounts/:accountId/payments",
    requireAuth,
    requireRole("ADMIN"),
    addAdminCollection
);

router.get(
    "/customers/:customerId/accounts/:accountId/payments",
    requireAuth,
    requireRole("ADMIN"),
    getPaymentHistory
);


module.exports = router;