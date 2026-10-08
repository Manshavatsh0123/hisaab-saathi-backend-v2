const supabase = require("../config/supabase");


const getAdminNotifications = async (req, res) => {
    try {
        const {
            unread_only = "false",
            page = 1,
            limit = 20,
        } = req.query;

        const pageNumber = Math.max(Number(page) || 1, 1);

        const limitNumber = Math.min(
            Math.max(Number(limit) || 20, 1),
            100
        );

        const from =
            (pageNumber - 1) * limitNumber;

        const to =
            from + limitNumber - 1;

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
            .order("created_at", {
                ascending: false,
            })
            .range(from, to);


        if (unread_only === "true") {
            query = query.eq("is_read", false);
        }

        const {
            data: notifications,
            error,
            count,
        } = await query;

        if (error) {
            console.error(
                "Get admin notifications error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch notifications",
                error: error.message,
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
            .single();

        if (error) {
            console.error(
                "Mark notification as read error:",
                error
            );

            if (error.code === "PGRST116") {
                return res.status(404).json({
                    success: false,
                    message: "Notification not found",
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Failed to mark notification as read",
                error: error.message,
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