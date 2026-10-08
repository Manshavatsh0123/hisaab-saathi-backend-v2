const express = require("express");

const requireAuth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const { approveAdminCollection, rejectAdminCollection, reversePayment, getAdminStaff, getAdminStaffDetails, updateAdminStaffStatus, getAdminDashboardSummary, getAdminRecentCollections, getAdminRecentNotifications } = require("../controllers/admin.controller");

const router = express.Router();

router.get(
    "/test",
    requireAuth,
    requireRole("ADMIN"),
    (req, res) => {
        return res.status(200).json({
            success: true,
            message: "Admin route protected successfully",
            user: {
                id: req.user.id,
                email: req.user.email,
            },
            profile: {
                role: req.profile.role,
                username: req.profile.username,
                full_name: req.profile.full_name,
            },
        });
    }
);

router.post(
    "/collections/:paymentId/approve",
    requireAuth,
    requireRole("ADMIN"),
    approveAdminCollection
);

router.post(
    "/collections/:paymentId/reject",
    requireAuth,
    requireRole("ADMIN"),
    rejectAdminCollection
);

router.post(
    "/collections/:paymentId/reverse",
    requireAuth,
    requireRole("ADMIN"),
    reversePayment
);

router.get(
    "/staff",
    requireAuth,
    requireRole("ADMIN"),
    getAdminStaff
);

router.get(
    "/staff/:staffId",
    requireAuth,
    requireRole("ADMIN"),
    getAdminStaffDetails
);

router.patch(
    "/staff/:staffId/status",
    requireAuth,
    requireRole("ADMIN"),
    updateAdminStaffStatus
);

router.get(
    "/dashboard/summary",
    requireAuth,
    requireRole("ADMIN"),
    getAdminDashboardSummary
);

router.get(
    "/dashboard/recent-collections",
    requireAuth,
    requireRole("ADMIN"),
    getAdminRecentCollections
);

router.get(
    "/dashboard/recent-notifications",
    requireAuth,
    requireRole("ADMIN"),
    getAdminRecentNotifications
);

module.exports = router;