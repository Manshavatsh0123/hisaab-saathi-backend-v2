const supabase = require("../config/supabase");

const getAdminNotifications = async (req, res) => {
    try {
        const {
            unread_only = "false",
            page = 1,
            limit = 20,
        } = req.query;

        const pageNumber = Math.max(
            Number.parseInt(page, 10) || 1,
            1
        );

        const limitNumber = Math.min(
            Math.max(Number.parseInt(limit, 10) || 20, 1),
            100
        );

        const from = (pageNumber - 1) * limitNumber;
        const to = from + limitNumber - 1;

        // STEP 1: Find payments that are currently pending.
        const {
            data: pendingPayments,
            error: paymentsError,
        } = await supabase
            .from("payments")
            .select("id")
            .eq("status", "PENDING");

        if (paymentsError) {
            console.error(
                "Get pending payment IDs error:",
                paymentsError
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to check pending payment statuses",
            });
        }

        const pendingPaymentIds = (pendingPayments || [])
            .map((payment) => payment.id)
            .filter(
                (id) => id !== null && id !== undefined
            );

        // STEP 2: If there are no pending payments,
        // return an empty approvals list.
        if (pendingPaymentIds.length === 0) {
            return res.status(200).json({
                success: true,
                notifications: [],
                pagination: {
                    page: pageNumber,
                    limit: limitNumber,
                    total: 0,
                    totalPages: 0,
                },
            });
        }

        // STEP 3: Fetch only notifications linked to
        // currently pending payments.
        let query = supabase
            .from("notifications")
            .select(
                `
                    id,
                    recipient_id,
                    payment_id,
                    type,
                    title,
                    message,
                    is_read,
                    created_at
                `,
                {
                    count: "exact",
                }
            )
            .eq("recipient_id", req.user.id)
            .in("payment_id", pendingPaymentIds)
            .order("created_at", {
                ascending: false,
            });

        // Read status is independent of payment status.
        // Read-but-pending notifications remain visible
        // unless unread_only=true was explicitly requested.
        if (String(unread_only) === "true") {
            query = query.eq("is_read", false);
        }

        // STEP 4: Apply pagination AFTER filtering.
        const {
            data: notifications,
            error,
            count,
        } = await query.range(from, to);

        if (error) {
            console.error(
                "Get admin notifications error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch notifications",
            });
        }

        return res.status(200).json({
            success: true,
            notifications: notifications || [],
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total: count || 0,
                totalPages: Math.ceil(
                    (count || 0) / limitNumber
                ),
            },
        });
    } catch (error) {
        console.error(
            "Get admin notifications exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        if (!notificationId) {
            return res.status(400).json({
                success: false,
                message: "Notification ID is required",
            });
        }

        const {
            data: notification,
            error,
        } = await supabase
            .from("notifications")
            .update({
                is_read: true,
            })
            .eq("id", notificationId)
            .eq("recipient_id", req.user.id)
            .select(`
                id,
                recipient_id,
                payment_id,
                type,
                title,
                message,
                is_read,
                created_at
            `)
            .maybeSingle();

        if (error) {
            console.error(
                "Mark notification as read error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to mark notification as read",
            });
        }

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            notification,
        });
    } catch (error) {
        console.error(
            "Mark notification as read exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    getAdminNotifications,
    markNotificationAsRead,
};