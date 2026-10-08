const express = require("express");

const { createCustomer,
    getCustomerDetails,
    listCustomers,
} = require("../controllers/customer.controller");

const requireAuth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const router = express.Router();

router.get(
    "/",
    requireAuth,
    requireRole("ADMIN"),
    listCustomers
);

router.post(
    "/",
    requireAuth,
    requireRole("ADMIN"),
    createCustomer
);

router.get(
    "/:customerId",
    requireAuth,
    requireRole("ADMIN"),
    getCustomerDetails
);


module.exports = router;