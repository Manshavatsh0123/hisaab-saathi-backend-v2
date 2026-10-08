const express = require("express");

const {
    createStaff,
    getStaffCustomers,
    getStaffCustomerDetails,
    submitStaffCollection,
    getStaffCollections,
    getStaffCollectionDetails,
} = require("../controllers/staff.controller");

const requireAuth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const router = express.Router();

router.get(
    "/customers",
    requireAuth,
    requireRole("STAFF"),
    getStaffCustomers
);

router.get(
    "/customers/:customerId",
    requireAuth,
    requireRole("STAFF"),
    getStaffCustomerDetails
);

router.post(
    "/",
    requireAuth,
    requireRole("ADMIN"),
    createStaff
);

router.post(
    "/collections",
    requireAuth,
    requireRole("STAFF"),
    submitStaffCollection
);

router.get(
    "/collections",
    requireAuth,
    requireRole("STAFF"),
    getStaffCollections
);

router.get(
    "/collections/:paymentId",
    requireAuth,
    requireRole("STAFF"),
    getStaffCollectionDetails
);

module.exports = router;