const supabase = require("../config/supabase");


const createStaff = async (req, res) => {
    try {
        const {
            full_name,
            username,
            phone,
            password,
        } = req.body;


        if (!full_name || !username || !password) {
            return res.status(400).json({
                success: false,
                message: "Full name, username and password are required",
            });
        }

        const cleanName = full_name.trim();
        const cleanUsername = username.trim().toLowerCase();
        const cleanPhone = phone
            ? phone.trim()
            : null;

        if (cleanUsername.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Username must be at least 3 characters",
            });
        }

        if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
            return res.status(400).json({
                success: false,
                message:
                    "Username can contain only letters, numbers, dot, underscore and hyphen",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
            });
        }

        const { data: existingProfile, error: profileCheckError } =
            await supabase
                .from("profiles")
                .select("id")
                .eq("username", cleanUsername)
                .maybeSingle();

        if (profileCheckError) {
            console.error(
                "Username check error:",
                profileCheckError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to check username",
                error: profileCheckError.message,
            });
        }

        if (existingProfile) {
            return res.status(409).json({
                success: false,
                message: "Username already exists",
            });
        }

        const authEmail =
            `${cleanUsername}@hisaabsaathi.local`;

        const {
            data: authData,
            error: authError,
        } = await supabase.auth.admin.createUser({
            email: authEmail,
            password,
            email_confirm: true,
        });

        if (authError) {
            console.error(
                "Create staff auth user error:",
                authError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to create staff authentication",
                error: authError.message,
            });
        }

        const userId = authData.user.id;

        const staffCode =
            `STF-${Date.now()}`;

        const {
            data: profile,
            error: profileError,
        } = await supabase
            .from("profiles")
            .insert([
                {
                    id: userId,
                    role: "STAFF",
                    username: cleanUsername,
                    full_name: cleanName,
                    phone: cleanPhone,
                    status: "ACTIVE",
                },
            ])
            .select()
            .single();

        if (profileError) {
            console.error(
                "Create staff profile error:",
                profileError
            );

            // Roll back Auth user if profile creation fails
            await supabase.auth.admin.deleteUser(userId);

            return res.status(500).json({
                success: false,
                message: "Failed to create staff profile",
                error: profileError.message,
            });
        }

        const {
            data: staff,
            error: staffError,
        } = await supabase
            .from("staff")
            .insert([
                {
                    user_id: userId,
                    staff_code: staffCode,
                    created_by: req.user.id,
                },
            ])
            .select()
            .single();

        if (staffError) {
            console.error(
                "Create staff record error:",
                staffError
            );

            // Roll back profile + auth
            await supabase
                .from("profiles")
                .delete()
                .eq("id", userId);

            await supabase.auth.admin.deleteUser(userId);

            return res.status(500).json({
                success: false,
                message: "Failed to create staff record",
                error: staffError.message,
            });
        }

        return res.status(201).json({
            success: true,
            message: "Staff created successfully",

            staff: {
                id: staff.id,
                user_id: staff.user_id,
                staff_code: staff.staff_code,
                full_name: profile.full_name,
                username: profile.username,
                phone: profile.phone,
                role: profile.role,
                status: profile.status,
            },
        });

    } catch (error) {
        console.error(
            "Create staff exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getStaffCustomers = async (req, res) => {
    try {
        let {
            search = "",
            page = 1,
            limit = 20,
        } = req.query;

        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        if (isNaN(page) || page < 1) {
            page = 1;
        }

        if (isNaN(limit) || limit < 1) {
            limit = 20;
        }

        // Maximum 100 customers per request
        if (limit > 100) {
            limit = 100;
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;


        let query = supabase
            .from("customers")
            .select(
                `
                id,
                customer_code,
                full_name,
                phone,
                alternate_phone,
                status,
                created_at
                `,
                { count: "exact" }
            );


        if (search && search.trim()) {
            const cleanSearch = search
                .trim()
                .replace(/[%_]/g, "");

            query = query.or(
                `full_name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,customer_code.ilike.%${cleanSearch}%`
            );
        }

        query = query
            .order("created_at", {
                ascending: false,
            })
            .range(from, to);

        const {
            data,
            error,
            count,
        } = await query;

        if (error) {
            console.error(
                "Staff customer search error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customers",
                error: error.message,
            });
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,

            customers: data || [],

            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        });

    } catch (error) {
        console.error(
            "Staff customer search exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getStaffCustomerDetails = async (req, res) => {
    try {
        const { customerId } = req.params;

        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(customerId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID",
            });
        }

        const {
            data: customer,
            error: customerError,
        } = await supabase
            .from("customers")
            .select(`
                id,
                customer_code,
                full_name,
                phone,
                alternate_phone,
                status,
                created_at
            `)
            .eq("id", customerId)
            .single();

        if (customerError) {
            if (customerError.code === "PGRST116") {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
            }

            console.error(
                "Staff customer details error:",
                customerError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer",
                error: customerError.message,
            });
        }

        if (customer.status !== "ACTIVE") {
            return res.status(400).json({
                success: false,
                message: "Customer account is inactive",
            });
        }

        const {
            data: accounts,
            error: accountsError,
        } = await supabase
            .from("customer_accounts")
            .select(`
                id,
                customer_id,
                account_number,
                scheme,
                account_name,
                collection_amount,
                frequency,
                start_date,
                maturity_date,
                previous_paid,
                status
            `)
            .eq("customer_id", customerId)
            .eq("status", "ACTIVE")
            .order("created_at", {
                ascending: false,
            });

        if (accountsError) {
            console.error(
                "Staff customer accounts error:",
                accountsError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer accounts",
                error: accountsError.message,
            });
        }

        return res.status(200).json({
            success: true,

            customer: {
                id: customer.id,
                customer_code: customer.customer_code,
                full_name: customer.full_name,
                phone: customer.phone,
                alternate_phone: customer.alternate_phone,
                status: customer.status,
                created_at: customer.created_at,
            },

            accounts: accounts || [],
        });

    } catch (error) {
        console.error(
            "Staff customer details exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const submitStaffCollection = async (req, res) => {
    try {
        const {
            customer_id,
            account_id,
            amount,
            payment_date,
        } = req.body;

        if (
            !customer_id ||
            !account_id ||
            amount === undefined ||
            !payment_date
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "customer_id, account_id, amount and payment_date are required",
            });
        }


        const numericAmount = Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0",
            });
        }

        const paymentDate = new Date(payment_date);

        if (Number.isNaN(paymentDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment date",
            });
        }


        const {
            data: customer,
            error: customerError,
        } = await supabase
            .from("customers")
            .select(
                "id, full_name, customer_code, status"
            )
            .eq("id", customer_id)
            .single();

        if (customerError || !customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        if (customer.status !== "ACTIVE") {
            return res.status(400).json({
                success: false,
                message: "Customer is inactive",
            });
        }


        const {
            data: account,
            error: accountError,
        } = await supabase
            .from("customer_accounts")
            .select(`
                id,
                customer_id,
                account_number,
                scheme,
                account_name,
                collection_amount,
                frequency,
                status
            `)
            .eq("id", account_id)
            .eq("customer_id", customer_id)
            .single();

        if (accountError || !account) {
            return res.status(404).json({
                success: false,
                message:
                    "Account not found for this customer",
            });
        }


        if (account.status !== "ACTIVE") {
            return res.status(400).json({
                success: false,
                message: "Account is inactive",
            });
        }

        const {
            data: staffProfile,
            error: staffProfileError,
        } = await supabase
            .from("profiles")
            .select("id, full_name, username")
            .eq("id", req.user.id)
            .eq("role", "STAFF")
            .eq("status", "ACTIVE")
            .single();

        if (staffProfileError || !staffProfile) {
            return res.status(403).json({
                success: false,
                message:
                    "Active staff profile not found",
            });
        }

        const {
            data: paymentId,
            error: paymentError,
        } = await supabase.rpc("submit_payment", {
            p_customer_id: customer_id,
            p_account_id: account_id,
            p_amount: numericAmount,
            p_payment_date: payment_date,
            p_created_by: req.user.id,
        });

        if (paymentError) {
            console.error(
                "Submit payment RPC error:",
                paymentError
            );

            return res.status(400).json({
                success: false,
                message: paymentError.message,
            });
        }

        const {
            data: admins,
            error: adminsError,
        } = await supabase
            .from("profiles")
            .select("id")
            .eq("role", "ADMIN")
            .eq("status", "ACTIVE");

        if (adminsError) {
            console.error(
                "Admin profiles fetch error:",
                adminsError
            );

            return res.status(201).json({
                success: true,
                message:
                    "Collection submitted successfully, but admin notification could not be created",
                payment: {
                    id: paymentId,
                    customer_id: customer.id,
                    customer_name: customer.full_name,
                    customer_code: customer.customer_code,
                    account_id: account.id,
                    account_number: account.account_number,
                    scheme: account.scheme,
                    amount: numericAmount,
                    payment_date,
                    status: "PENDING",
                    submitted_by: req.user.id,
                },
                notification_created: false,
            });
        }


        const staffName =
            staffProfile.full_name ||
            staffProfile.username ||
            "Staff";

        const notificationRows = (admins || []).map(
            (admin) => ({
                recipient_id: admin.id,
                payment_id: paymentId,
                type: "PAYMENT_SUBMITTED",
                title: "New Collection",
                message: `${staffName} submitted ₹${numericAmount} for ${customer.full_name}`,
                is_read: false,
            })
        );

        let notificationCreated = false;

        if (notificationRows.length > 0) {
            const {
                error: notificationError,
            } = await supabase
                .from("notifications")
                .insert(notificationRows);

            if (notificationError) {
                console.error(
                    "Notification creation error:",
                    notificationError
                );
            } else {
                notificationCreated = true;
            }
        }

        return res.status(201).json({
            success: true,
            message:
                "Collection submitted successfully",

            payment: {
                id: paymentId,
                customer_id: customer.id,
                customer_name: customer.full_name,
                customer_code: customer.customer_code,

                account_id: account.id,
                account_number: account.account_number,
                scheme: account.scheme,

                amount: numericAmount,
                payment_date,

                status: "PENDING",

                submitted_by: req.user.id,
            },

            notification_created:
                notificationCreated,
        });

    } catch (error) {
        console.error(
            "Submit staff collection exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


const getStaffCollections = async (req, res) => {
    try {
        const staffId = req.user.id;

        const {
            status,
            page = 1,
            limit = 20,
        } = req.query;

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.min(
            Math.max(Number(limit) || 20, 1),
            100
        );

        const from = (pageNumber - 1) * limitNumber;
        const to = from + limitNumber - 1;

        const allowedStatuses = [
            "PENDING",
            "APPROVED",
            "REJECTED",
            "REVERSED",
        ];

        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid status. Allowed values: PENDING, APPROVED, REJECTED, REVERSED",
            });
        }

        let query = supabase
            .from("payments")
            .select(
                `
                id,
                customer_id,
                account_id,
                amount,
                payment_date,
                status,
                submitted_at,
                approved_at,
                rejected_at,
                reversed_at,
                rejection_reason,
                reversal_reason,
                receipt_number,
                created_at,
                updated_at
                `,
                { count: "exact" }
            )
            .eq("created_by", staffId)
            .order("created_at", {
                ascending: false,
            })
            .range(from, to);

        if (status) {
            query = query.eq("status", status);
        }

        const {
            data: payments,
            error: paymentError,
            count,
        } = await query;

        if (paymentError) {
            console.error(
                "Get staff collections error:",
                paymentError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch collections",
                error: paymentError.message,
            });
        }

        // ========================================
        // GET CUSTOMER + ACCOUNT DETAILS
        // ========================================

        const collections = [];

        for (const payment of payments || []) {
            // Customer
            const {
                data: customer,
                error: customerError,
            } = await supabase
                .from("customers")
                .select(
                    `
                    id,
                    customer_code,
                    full_name,
                    phone
                    `
                )
                .eq("id", payment.customer_id)
                .single();

            if (customerError) {
                console.error(
                    "Customer fetch error:",
                    customerError
                );
            }

            // Account
            const {
                data: account,
                error: accountError,
            } = await supabase
                .from("customer_accounts")
                .select(
                    `
                    id,
                    account_number,
                    scheme,
                    account_name,
                    collection_amount,
                    frequency
                    `
                )
                .eq("id", payment.account_id)
                .single();

            if (accountError) {
                console.error(
                    "Account fetch error:",
                    accountError
                );
            }

            collections.push({
                id: payment.id,

                customer: customer || null,

                account: account || null,

                amount: payment.amount,

                payment_date: payment.payment_date,

                status: payment.status,

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

                rejection_reason:
                    payment.rejection_reason,

                reversal_reason:
                    payment.reversal_reason,

                created_at:
                    payment.created_at,

                updated_at:
                    payment.updated_at,
            });
        }

        const total = count || 0;

        const totalPages =
            total === 0
                ? 0
                : Math.ceil(total / limitNumber);


        return res.status(200).json({
            success: true,

            collections,

            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages,
            },
        });

    } catch (error) {
        console.error(
            "Get staff collections exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getStaffCollectionDetails = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const staffId = req.user.id;


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
                reference_number,
                receipt_number,
                notes,
                submitted_at,
                approved_at,
                rejected_at,
                reversed_at,
                rejection_reason,
                reversal_reason,
                created_at,
                updated_at,
                created_by,
                approved_by,
                rejected_by,
                reversed_by
            `)
            .eq("id", paymentId)
            .eq("created_by", staffId)
            .single();

        if (paymentError || !payment) {
            return res.status(404).json({
                success: false,
                message: "Collection not found",
            });
        }

        const {
            data: customer,
            error: customerError,
        } = await supabase
            .from("customers")
            .select(`
                id,
                customer_code,
                full_name,
                phone,
                alternate_phone,
                status
            `)
            .eq("id", payment.customer_id)
            .single();

        if (customerError || !customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        const {
            data: account,
            error: accountError,
        } = await supabase
            .from("customer_accounts")
            .select(`
                id,
                account_number,
                scheme,
                account_name,
                collection_amount,
                frequency,
                start_date,
                maturity_date,
                status
            `)
            .eq("id", payment.account_id)
            .eq("customer_id", payment.customer_id)
            .single();

        if (accountError || !account) {
            return res.status(404).json({
                success: false,
                message: "Account not found",
            });
        }

        return res.status(200).json({
            success: true,

            collection: {
                id: payment.id,

                customer: {
                    id: customer.id,
                    customer_code: customer.customer_code,
                    full_name: customer.full_name,
                    phone: customer.phone,
                    alternate_phone:
                        customer.alternate_phone,
                    status: customer.status,
                },

                account: {
                    id: account.id,
                    account_number:
                        account.account_number,
                    scheme: account.scheme,
                    account_name:
                        account.account_name,
                    collection_amount:
                        account.collection_amount,
                    frequency:
                        account.frequency,
                    start_date:
                        account.start_date,
                    maturity_date:
                        account.maturity_date,
                    status: account.status,
                },

                amount: payment.amount,

                payment_date:
                    payment.payment_date,

                status:
                    payment.status,

                reference_number:
                    payment.reference_number,

                receipt_number:
                    payment.receipt_number,

                notes:
                    payment.notes,

                // Timeline
                submitted_at:
                    payment.submitted_at,

                approved_at:
                    payment.approved_at,

                rejected_at:
                    payment.rejected_at,

                reversed_at:
                    payment.reversed_at,

                // Reasons
                rejection_reason:
                    payment.rejection_reason,

                reversal_reason:
                    payment.reversal_reason,

                created_at:
                    payment.created_at,

                updated_at:
                    payment.updated_at,
            },
        });

    } catch (error) {
        console.error(
            "Get staff collection details exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    createStaff,
    getStaffCustomers,
    getStaffCustomerDetails,
    submitStaffCollection,
    getStaffCollections,
    getStaffCollectionDetails,
};