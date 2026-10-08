const express = require("express");

const {
    getAdminNotifications,
    markNotificationAsRead
} = require("../controllers/notification.controller");

const requireAuth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const router = express.Router();

router.get(
    "/",
    requireAuth,
    requireRole("ADMIN"),
    getAdminNotifications
);

router.patch(
    "/:notificationId/read",
    requireAuth,
    requireRole("ADMIN"),
    markNotificationAsRead
);

module.exports = router;