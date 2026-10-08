const supabase = require("../config/supabase");


const approveAdminCollection = async (req, res) => {
    try {
        const { paymentId } = req.params;


        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: "Payment ID is required",
            });
        }


        const {
            data: payment,
            error: paymentError,
        } = await supabase
            .from("payments")
            .select(`
                id,
                customer_id,
                account_id,
                amount,
                payment_date,
                status,
                created_by,
                approved_by,
                approved_at,
                receipt_number
            `)
            .eq("id", paymentId)
            .single();

        if (paymentError || !payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }


        if (payment.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message:
                    `Payment cannot be approved because its current status is ${payment.status}`,
            });
        }

        const {
            data: approvedPaymentId,
            error: approveError,
        } = await supabase.rpc("approve_payment", {
            p_payment_id: paymentId,
            p_approved_by: req.user.id,
        });

        if (approveError) {
            console.error(
                "Approve payment RPC error:",
                approveError
            );

            return res.status(400).json({
                success: false,
                message: approveError.message,
            });
        }


        const {
            data: updatedPayment,
            error: updatedPaymentError,
        } = await supabase
            .from("payments")
            .select(`
                id,
                customer_id,
                account_id,
                amount,
                payment_date,
                status,
                created_by,
                approved_by,
                approved_at,
                receipt_number,
                updated_at
            `)
            .eq("id", approvedPaymentId)
            .single();

        if (updatedPaymentError) {
            console.error(
                "Fetch approved payment error:",
                updatedPaymentError
            );

            return res.status(500).json({
                success: false,
                message:
                    "Payment was approved but updated payment could not be fetched",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment approved successfully",
            payment: updatedPayment,
        });

    } catch (error) {
        console.error(
            "Approve admin collection exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const rejectAdminCollection = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { rejection_reason } = req.body;


        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: "Payment ID is required",
            });
        }

        if (
            !rejection_reason ||
            typeof rejection_reason !== "string" ||
            !rejection_reason.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required",
            });
        }

        const rejectionReason = rejection_reason.trim();

        const {
            data: payment,
            error: paymentError,
        } = await supabase
            .from("payments")
            .select(`
                id,
                customer_id,
                account_id,
                amount,
                payment_date,
                status,
                created_by,
                rejected_by,
                rejected_at,
                rejection_reason
            `)
            .eq("id", paymentId)
            .single();

        if (paymentError || !payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }


        if (payment.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message:
                    `Payment cannot be rejected because its current status is ${payment.status}`,
            });
        }

        const {
            data: rejectedPaymentId,
            error: rejectError,
        } = await supabase.rpc("reject_payment", {
            p_payment_id: paymentId,
            p_rejected_by: req.user.id,
            p_rejection_reason: rejectionReason,
        });

        if (rejectError) {
            console.error(
                "Reject payment RPC error:",
                rejectError
            );

            return res.status(400).json({
                success: false,
                message: rejectError.message,
            });
        }

        const {
            data: updatedPayment,
            error: updatedPaymentError,
        } = await supabase
            .from("payments")
            .select(`
                id,
                customer_id,
                account_id,
                amount,
                payment_date,
                status,
                created_by,
                rejected_by,
                rejected_at,
                rejection_reason,
                updated_at
            `)
            .eq("id", rejectedPaymentId)
            .single();

        if (updatedPaymentError) {
            console.error(
                "Fetch rejected payment error:",
                updatedPaymentError
            );

            return res.status(500).json({
                success: false,
                message:
                    "Payment was rejected but updated payment could not be fetched",
            });
        }


        return res.status(200).json({
            success: true,
            message: "Payment rejected successfully",
            payment: updatedPayment,
        });

    } catch (error) {
        console.error(
            "Reject admin collection exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const reversePayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { reversal_reason } = req.body;

        // Validate payment ID
        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: "Payment ID is required",
            });
        }

        // Validate reversal reason
        if (
            !reversal_reason ||
            typeof reversal_reason !== "string" ||
            !reversal_reason.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Reversal reason is required",
            });
        }

        // Call database function
        const {
            data: reversedPaymentId,
            error: reversalError,
        } = await supabase.rpc("reverse_payment", {
            p_payment_id: paymentId,
            p_reversed_by: req.user.id,
            p_reversal_reason: reversal_reason.trim(),
        });

        if (reversalError) {
            console.error(
                "Reverse payment RPC error:",
                reversalError
            );

            return res.status(400).json({
                success: false,
                message: reversalError.message,
            });
        }

        // Fetch updated payment
        const {
            data: payment,
            error: paymentError,
        } = await supabase
            .from("payments")
            .select(`
                id,
                customer_id,
                account_id,
                amount,
                payment_date,
                status,
                created_by,
                approved_by,
                rejected_by,
                reversed_by,
                approved_at,
                rejected_at,
                reversed_at,
                rejection_reason,
                reversal_reason,
                receipt_number,
                updated_at
            `)
            .eq("id", reversedPaymentId)
            .single();

        if (paymentError || !payment) {
            console.error(
                "Fetch reversed payment error:",
                paymentError
            );

            return res.status(500).json({
                success: false,
                message: "Payment reversed but failed to fetch updated payment",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment reversed successfully",
            payment,
        });

    } catch (error) {
        console.error(
            "Reverse payment exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getAdminStaff = async (req, res) => {
    try {
        const page = Math.max(
            Number.parseInt(req.query.page, 10) || 1,
            1
        );

        const limit = Math.min(
            Math.max(
                Number.parseInt(req.query.limit, 10) || 20,
                1
            ),
            100
        );

        const search = (req.query.search || "").trim();
        const status = (req.query.status || "")
            .trim()
            .toUpperCase();

        const {
            data: staffRows,
            error: staffError,
        } = await supabase
            .from("staff")
            .select(
                `
                id,
                user_id,
                staff_code,
                created_by,
                created_at,
                updated_at
                `
            )
            .order("created_at", {
                ascending: false,
            });

        if (staffError) {
            console.error(
                "Get admin staff error:",
                staffError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch staff",
                error: staffError.message,
            });
        }

        let staff = staffRows || [];


        const userIds = staff.map(
            (item) => item.user_id
        );

        let profiles = [];

        if (userIds.length > 0) {
            const {
                data: profileRows,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select(
                    `
                    id,
                    username,
                    full_name,
                    phone,
                    role,
                    status,
                    created_at,
                    updated_at
                    `
                )
                .in("id", userIds);

            if (profileError) {
                console.error(
                    "Get staff profiles error:",
                    profileError
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to fetch staff profiles",
                    error: profileError.message,
                });
            }

            profiles = profileRows || [];
        }

        const profileMap = new Map(
            profiles.map((profile) => [
                profile.id,
                profile,
            ])
        );

        staff = staff.map((item) => {
            const profile = profileMap.get(
                item.user_id
            );

            return {
                id: item.id,
                user_id: item.user_id,
                staff_code: item.staff_code,

                username:
                    profile?.username || null,

                full_name:
                    profile?.full_name || null,

                phone:
                    profile?.phone || null,

                role:
                    profile?.role || "STAFF",

                status:
                    profile?.status || null,

                created_by: item.created_by,

                created_at:
                    item.created_at,

                updated_at:
                    item.updated_at,
            };
        });


        staff = staff.filter(
            (item) => item.role === "STAFF"
        );


        if (status) {
            staff = staff.filter(
                (item) => item.status === status
            );
        }

        if (search) {
            const searchLower =
                search.toLowerCase();

            staff = staff.filter((item) => {
                return (
                    item.full_name
                        ?.toLowerCase()
                        .includes(searchLower) ||

                    item.username
                        ?.toLowerCase()
                        .includes(searchLower) ||

                    item.phone
                        ?.toLowerCase()
                        .includes(searchLower) ||

                    item.staff_code
                        ?.toLowerCase()
                        .includes(searchLower)
                );
            });
        }


        const total = staff.length;

        const from = (page - 1) * limit;
        const to = from + limit;

        const paginatedStaff = staff.slice(
            from,
            to
        );

        return res.status(200).json({
            success: true,

            staff: paginatedStaff,

            pagination: {
                page,
                limit,
                total,
                totalPages:
                    total === 0
                        ? 0
                        : Math.ceil(
                            total / limit
                        ),
            },
        });

    } catch (error) {
        console.error(
            "Get admin staff exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getAdminStaffDetails = async (req, res) => {
    try {
        const { staffId } = req.params;

        if (!staffId) {
            return res.status(400).json({
                success: false,
                message: "Staff ID is required",
            });
        }

        // 1. Get staff record
        const {
            data: staffRow,
            error: staffError,
        } = await supabase
            .from("staff")
            .select(`
                id,
                user_id,
                staff_code,
                created_by,
                created_at,
                updated_at
            `)
            .eq("id", staffId)
            .maybeSingle();

        if (staffError) {
            console.error(
                "Get admin staff details error:",
                staffError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch staff details",
                error: staffError.message,
            });
        }

        if (!staffRow) {
            return res.status(404).json({
                success: false,
                message: "Staff not found",
            });
        }

        // 2. Get profile information
        const {
            data: profile,
            error: profileError,
        } = await supabase
            .from("profiles")
            .select(`
                id,
                username,
                full_name,
                phone,
                role,
                status,
                created_at,
                updated_at
            `)
            .eq("id", staffRow.user_id)
            .maybeSingle();

        if (profileError) {
            console.error(
                "Get staff profile error:",
                profileError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch staff profile",
                error: profileError.message,
            });
        }

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Staff profile not found",
            });
        }

        // 3. Return combined staff details
        return res.status(200).json({
            success: true,
            staff: {
                id: staffRow.id,
                user_id: staffRow.user_id,
                staff_code: staffRow.staff_code,

                username: profile.username,
                full_name: profile.full_name,
                phone: profile.phone,
                role: profile.role,
                status: profile.status,

                created_by: staffRow.created_by,
                created_at: staffRow.created_at,
                updated_at: staffRow.updated_at,
            },
        });

    } catch (error) {
        console.error(
            "Get admin staff details exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const updateAdminStaffStatus = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { status } = req.body;

        if (!staffId) {
            return res.status(400).json({
                success: false,
                message: "Staff ID is required",
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required",
            });
        }

        const normalizedStatus = status
            .trim()
            .toUpperCase();

        if (!["ACTIVE", "INACTIVE"].includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: "Status must be ACTIVE or INACTIVE",
            });
        }

        const {
            data: staffRow,
            error: staffError,
        } = await supabase
            .from("staff")
            .select(`
                id,
                user_id,
                staff_code
            `)
            .eq("id", staffId)
            .maybeSingle();

        if (staffError) {
            console.error(
                "Find staff for status update error:",
                staffError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to find staff",
                error: staffError.message,
            });
        }

        if (!staffRow) {
            return res.status(404).json({
                success: false,
                message: "Staff not found",
            });
        }

        const {
            data: updatedProfile,
            error: updateError,
        } = await supabase
            .from("profiles")
            .update({
                status: normalizedStatus,
                updated_at: new Date().toISOString(),
            })
            .eq("id", staffRow.user_id)
            .select(`
                id,
                username,
                full_name,
                phone,
                role,
                status,
                updated_at
            `)
            .single();

        if (updateError) {
            console.error(
                "Update staff status error:",
                updateError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to update staff status",
                error: updateError.message,
            });
        }

        return res.status(200).json({
            success: true,
            message:
                normalizedStatus === "ACTIVE"
                    ? "Staff activated successfully"
                    : "Staff deactivated successfully",

            staff: {
                id: staffRow.id,
                user_id: staffRow.user_id,
                staff_code: staffRow.staff_code,
                username: updatedProfile.username,
                full_name: updatedProfile.full_name,
                phone: updatedProfile.phone,
                role: updatedProfile.role,
                status: updatedProfile.status,
                updated_at: updatedProfile.updated_at,
            },
        });

    } catch (error) {
        console.error(
            "Update admin staff status exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getAdminDashboardSummary = async (req, res) => {
    try {
        const {
            count: totalCustomers,
            error: customerError,
        } = await supabase
            .from("customers")
            .select("id", {
                count: "exact",
                head: true,
            });

        if (customerError) {
            throw customerError;
        }


        const {
            count: totalStaff,
            error: staffError,
        } = await supabase
            .from("staff")
            .select("id", {
                count: "exact",
                head: true,
            });

        if (staffError) {
            throw staffError;
        }

        const {
            count: totalAccounts,
            error: accountError,
        } = await supabase
            .from("customer_accounts")
            .select("id", {
                count: "exact",
                head: true,
            });

        if (accountError) {
            throw accountError;
        }


        const {
            data: payments,
            error: paymentError,
        } = await supabase
            .from("payments")
            .select(`
                id,
                amount,
                payment_date,
                status
            `);

        if (paymentError) {
            throw paymentError;
        }

        const paymentRows = payments || [];


        const today = new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: "Asia/Kolkata",
            }
        ).format(new Date());


        const todayApprovedAmount = paymentRows
            .filter(
                (payment) =>
                    payment.payment_date === today &&
                    payment.status === "APPROVED"
            )
            .reduce(
                (total, payment) =>
                    total + Number(payment.amount || 0),
                0
            );


        const approvedAmount = paymentRows
            .filter(
                (payment) =>
                    payment.status === "APPROVED"
            )
            .reduce(
                (total, payment) =>
                    total + Number(payment.amount || 0),
                0
            );

        const pendingAmount = paymentRows
            .filter(
                (payment) =>
                    payment.status === "PENDING"
            )
            .reduce(
                (total, payment) =>
                    total + Number(payment.amount || 0),
                0
            );

        const rejectedAmount = paymentRows
            .filter(
                (payment) =>
                    payment.status === "REJECTED"
            )
            .reduce(
                (total, payment) =>
                    total + Number(payment.amount || 0),
                0
            );

        const reversedAmount = paymentRows
            .filter(
                (payment) =>
                    payment.status === "REVERSED"
            )
            .reduce(
                (total, payment) =>
                    total + Number(payment.amount || 0),
                0
            );


        return res.status(200).json({
            success: true,

            summary: {
                total_customers:
                    totalCustomers || 0,

                total_staff:
                    totalStaff || 0,

                total_accounts:
                    totalAccounts || 0,

                today: {
                    date: today,
                    collection_amount:
                        todayApprovedAmount,
                },

                collections: {
                    approved_amount:
                        approvedAmount,

                    pending_amount:
                        pendingAmount,

                    rejected_amount:
                        rejectedAmount,

                    reversed_amount:
                        reversedAmount,
                },
            },
        });

    } catch (error) {
        console.error(
            "Get admin dashboard summary error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch dashboard summary",
            error: error.message,
        });
    }
};

const getAdminRecentCollections = async (req, res) => {
    try {
        const limit = Math.min(
            Math.max(
                Number.parseInt(req.query.limit, 10) || 10,
                1
            ),
            50
        );

        const {
            data: payments,
            error: paymentError,
        } = await supabase
            .from("payments")
            .select(`
                id,
                customer_id,
                account_id,
                amount,
                payment_date,
                status,
                receipt_number,
                submitted_at,
                approved_at,
                rejected_at,
                reversed_at,
                created_at,

                customer:customers!payments_customer_id_fkey(
                    id,
                    customer_code,
                    full_name
                ),

                account:customer_accounts!payments_account_id_fkey(
                    id,
                    account_number,
                    scheme,
                    account_name
                )
            `)
            .order("created_at", {
                ascending: false,
            })
            .limit(limit);

        if (paymentError) {
            console.error(
                "Get admin recent collections error:",
                paymentError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch recent collections",
                error: paymentError.message,
            });
        }

        const collections = (payments || []).map(
            (payment) => ({
                id: payment.id,

                customer: {
                    id: payment.customer?.id || null,
                    customer_code:
                        payment.customer?.customer_code || null,
                    name:
                        payment.customer?.full_name || null,
                },

                account: {
                    id: payment.account?.id || null,
                    account_number:
                        payment.account?.account_number || null,
                    scheme:
                        payment.account?.scheme || null,
                    account_name:
                        payment.account?.account_name || null,
                },

                amount: Number(payment.amount),

                payment_date:
                    payment.payment_date,

                status:
                    payment.status,

                receipt_number:
                    payment.receipt_number,

                submitted_at:
                    payment.submitted_at,

                approved_at:
                    payment.approved_at,

                rejected_at:
                    payment.rejected_at,

                reversed_at:
                    payment.reversed_at,

                created_at:
                    payment.created_at,
            })
        );

        return res.status(200).json({
            success: true,
            collections,
        });

    } catch (error) {
        console.error(
            "Get admin recent collections exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getAdminRecentNotifications = async (req, res) => {
    try {
        const limit = Math.min(
            Math.max(
                Number.parseInt(req.query.limit, 10) || 10,
                1
            ),
            50
        );

        const {
            data: notifications,
            error: notificationError,
        } = await supabase
            .from("notifications")
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
            .order("created_at", {
                ascending: false,
            })
            .limit(limit);

        if (notificationError) {
            console.error(
                "Get admin recent notifications error:",
                notificationError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch recent notifications",
                error: notificationError.message,
            });
        }

        return res.status(200).json({
            success: true,
            notifications: notifications || [],
        });

    } catch (error) {
        console.error(
            "Get admin recent notifications exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    approveAdminCollection,
    rejectAdminCollection,
    reversePayment,
    getAdminRecentNotifications,
    getAdminStaff,
    getAdminStaffDetails,
    updateAdminStaffStatus,
    getAdminDashboardSummary,
    getAdminRecentCollections,
};