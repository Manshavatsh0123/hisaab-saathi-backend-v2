const supabase = require("../config/supabase");

async function addAdminCollection(req, res, next) {
    try {

        const { customerId, accountId } = req.params;

        const {
            amount,
            payment_date,
            reference_number,
            notes,
        } = req.body || {};


        const adminId = req.user?.id;

        const idempotencyKey =
            req.headers["idempotency-key"];


        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found",
            });
        }

        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer ID is required",
            });
        }


        if (!accountId) {
            return res.status(400).json({
                success: false,
                message: "Account ID is required",
            });
        }


        if (!idempotencyKey) {
            return res.status(400).json({
                success: false,
                message: "Idempotency key is required",
            });
        }

        // Validate UUID format
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(idempotencyKey)) {
            return res.status(400).json({
                success: false,
                message: "Invalid idempotency key",
            });
        }


        if (
            amount === undefined ||
            amount === null ||
            amount === ""
        ) {
            return res.status(400).json({
                success: false,
                message: "Amount is required",
            });
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount)) {
            return res.status(400).json({
                success: false,
                message: "Amount must be a valid number",
            });
        }

        if (numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0",
            });
        }


        if (!payment_date) {
            return res.status(400).json({
                success: false,
                message: "Payment date is required",
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
            .select(`
                id,
                full_name,
                customer_code,
                status
            `)
            .eq("id", customerId)
            .single();

        if (customerError || !customer) {
            console.error(
                "Customer lookup error:",
                customerError
            );

            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        if (customer.status !== "ACTIVE") {
            return res.status(400).json({
                success: false,
                message: "Customer is not active",
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
            .eq("id", accountId)
            .eq("customer_id", customerId)
            .single();

        if (accountError || !account) {
            console.error(
                "Account lookup error:",
                accountError
            );

            return res.status(404).json({
                success: false,
                message: "Customer account not found",
            });
        }


        if (account.status !== "ACTIVE") {
            return res.status(400).json({
                success: false,
                message: "Customer account is not active",
            });
        }


        const {
            data: existingPayment,
            error: existingPaymentError,
        } = await supabase
            .from("payments")
            .select("*")
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();

        if (existingPaymentError) {
            console.error(
                "Idempotency check error:",
                existingPaymentError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to verify payment request",
            });
        }

        if (existingPayment) {
            return res.status(200).json({
                success: true,
                message: "Collection already submitted",
                duplicate: true,
                payment: existingPayment,
            });
        }



        const receiptNumber =
            `RCPT-${Date.now()}-${Math.floor(
                Math.random() * 1000
            )}`;



        const {
            data: payment,
            error: paymentError,
        } = await supabase
            .from("payments")
            .insert({
                customer_id: customerId,
                account_id: accountId,

                amount: numericAmount,
                payment_date,

                reference_number:
                    reference_number || null,

                status: "APPROVED",

                created_by: adminId,

                approved_by: adminId,

                approved_at:
                    new Date().toISOString(),

                receipt_number: receiptNumber,

                notes: notes || null,

                idempotency_key: idempotencyKey,
            })
            .select()
            .single();


        if (paymentError) {
            console.error(
                "Create payment error:",
                paymentError
            );


            if (paymentError.code === "23505") {
                const {
                    data: duplicatePayment,
                    error: duplicateLookupError,
                } = await supabase
                    .from("payments")
                    .select("*")
                    .eq(
                        "idempotency_key",
                        idempotencyKey
                    )
                    .maybeSingle();

                if (
                    !duplicateLookupError &&
                    duplicatePayment
                ) {
                    return res.status(200).json({
                        success: true,
                        message:
                            "Collection already submitted",
                        duplicate: true,
                        payment: duplicatePayment,
                    });
                }

                return res.status(409).json({
                    success: false,
                    message:
                        "This collection has already been submitted",
                });
            }

            return res.status(500).json({
                success: false,
                message: "Failed to add collection",
            });
        }


        return res.status(201).json({
            success: true,
            message: "Collection added successfully",

            duplicate: false,

            payment,
        });

    } catch (error) {

        console.error(
            "Add admin collection unexpected error:",
            error
        );

        next(error);
    }
};

async function getPaymentHistory(req, res, next) {
    try {
        const {
            customerId,
            accountId,
        } = req.params;


        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer ID is required",
            });
        }

        if (!accountId) {
            return res.status(400).json({
                success: false,
                message: "Account ID is required",
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
                account_name
            `)
            .eq("id", accountId)
            .eq("customer_id", customerId)
            .single();

        if (accountError || !account) {
            console.error(
                "Payment history account lookup error:",
                accountError
            );

            return res.status(404).json({
                success: false,
                message: "Customer account not found",
            });
        }


        const {
            data: payments,
            error: paymentsError,
        } = await supabase
            .from("payments")
            .select(`
                id,
                customer_id,
                account_id,
                amount,
                payment_date,
                reference_number,
                status,
                created_by,
                approved_by,
                rejected_by,
                reversed_by,
                submitted_at,
                approved_at,
                rejected_at,
                reversed_at,
                rejection_reason,
                reversal_reason,
                receipt_number,
                notes,
                created_at,
                updated_at
            `)
            .eq("customer_id", customerId)
            .eq("account_id", accountId)
            .order("payment_date", {
                ascending: false,
            })
            .order("created_at", {
                ascending: false,
            });


        if (paymentsError) {
            console.error(
                "Get payment history error:",
                paymentsError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch payment history",
            });
        }

        return res.status(200).json({
            success: true,

            account: {
                id: account.id,
                customer_id: account.customer_id,
                account_number:
                    account.account_number,
                scheme: account.scheme,
                account_name:
                    account.account_name,
            },

            count: payments?.length || 0,

            payments: payments || [],
        });

    } catch (error) {
        console.error(
            "Get payment history unexpected error:",
            error
        );

        next(error);
    }
};

const getAdminCollections = async (req, res) => {
    try {
        let {
            status,
            page = 1,
            limit = 20,
        } = req.query;

        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        // Pagination validation
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        if (isNaN(limit) || limit < 1) {
            limit = 20;
        }

        // Maximum 100 records per request
        if (limit > 100) {
            limit = 100;
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from("payments")
            .select(
                `
                id,
                amount,
                payment_date,
                status,
                receipt_number,
                reference_number,
                notes,
                created_at,
                submitted_at,
                approved_at,
                rejected_at,
                reversed_at,

                customer:customers (
                    id,
                    customer_code,
                    full_name,
                    phone
                ),

                account:customer_accounts!payments_account_id_fkey (
                    id,
                    account_number,
                    scheme,
                    account_name
                ),

                creator:profiles!payments_created_by_fkey (
                    id,
                    username,
                    full_name
                )
                `,
                { count: "exact" }
            );

        // ===============================
        // STATUS FILTER
        // ===============================

        if (status && status.trim()) {
            const cleanStatus = status.trim().toUpperCase();

            const allowedStatuses = [
                "APPROVED",
                "PENDING",
                "REJECTED",
                "REVERSED",
            ];

            if (!allowedStatuses.includes(cleanStatus)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid status. Allowed values: APPROVED, PENDING, REJECTED, REVERSED",
                });
            }

            query = query.eq("status", cleanStatus);
        }

        // ===============================
        // SORT + PAGINATION
        // ===============================

        query = query
            .order("payment_date", { ascending: false })
            .order("created_at", { ascending: false })
            .range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error("Admin collections error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch collections",
                error: error.message,
            });
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        // ===============================
        // FORMAT RESPONSE
        // ===============================

        const collections = (data || []).map((payment) => ({
            payment_id: payment.id,

            customer: payment.customer,

            account: payment.account,

            amount: payment.amount,

            payment_date: payment.payment_date,

            status: payment.status,

            receipt_number: payment.receipt_number,

            reference_number: payment.reference_number,

            notes: payment.notes,

            created_by: payment.creator,

            created_at: payment.created_at,

            submitted_at: payment.submitted_at,

            approved_at: payment.approved_at,

            rejected_at: payment.rejected_at,

            reversed_at: payment.reversed_at,
        }));

        return res.status(200).json({
            success: true,
            collections,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        });

    } catch (error) {
        console.error(
            "Admin collections exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getAdminCollectionDetails = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(paymentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment ID",
            });
        }

        const { data: payment, error: paymentError } = await supabase
            .from("payments")
            .select(`
                id,
                customer_id,
                account_id,
                amount,
                payment_date,
                reference_number,
                status,
                created_by,
                approved_by,
                rejected_by,
                reversed_by,
                submitted_at,
                approved_at,
                rejected_at,
                reversed_at,
                rejection_reason,
                reversal_reason,
                receipt_number,
                notes,
                created_at,
                updated_at
            `)
            .eq("id", paymentId)
            .single();

        if (paymentError) {
            if (paymentError.code === "PGRST116") {
                return res.status(404).json({
                    success: false,
                    message: "Collection not found",
                });
            }

            console.error(
                "Get collection details payment error:",
                paymentError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch collection",
                error: paymentError.message,
            });
        }

        const { data: customer, error: customerError } = await supabase
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

        if (customerError) {
            console.error(
                "Get collection customer error:",
                customerError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer details",
                error: customerError.message,
            });
        }

        const { data: account, error: accountError } = await supabase
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
            .eq("id", payment.account_id)
            .eq("customer_id", payment.customer_id)
            .single();

        if (accountError) {
            console.error(
                "Get collection account error:",
                accountError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch account details",
                error: accountError.message,
            });
        }

        const profileIds = [
            payment.created_by,
            payment.approved_by,
            payment.rejected_by,
            payment.reversed_by,
        ].filter(Boolean);

        let profiles = [];

        if (profileIds.length > 0) {
            const { data: profileData, error: profileError } =
                await supabase
                    .from("profiles")
                    .select(`
                        id,
                        username,
                        full_name,
                        role
                    `)
                    .in("id", profileIds);

            if (profileError) {
                console.error(
                    "Get collection profiles error:",
                    profileError
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to fetch user details",
                    error: profileError.message,
                });
            }

            profiles = profileData || [];
        }

        const findProfile = (profileId) => {
            if (!profileId) {
                return null;
            }

            return (
                profiles.find(
                    (profile) => profile.id === profileId
                ) || null
            );
        };

        return res.status(200).json({
            success: true,

            collection: {
                payment_id: payment.id,

                customer: customer,

                account: account,

                payment: {
                    amount: payment.amount,
                    payment_date: payment.payment_date,
                    status: payment.status,
                    reference_number: payment.reference_number,
                    receipt_number: payment.receipt_number,
                    notes: payment.notes,
                },

                created_by: findProfile(payment.created_by),

                approved_by: findProfile(payment.approved_by),

                rejected_by: findProfile(payment.rejected_by),

                reversed_by: findProfile(payment.reversed_by),

                timeline: {
                    submitted_at: payment.submitted_at,
                    approved_at: payment.approved_at,
                    rejected_at: payment.rejected_at,
                    reversed_at: payment.reversed_at,
                },

                reasons: {
                    rejection_reason: payment.rejection_reason,
                    reversal_reason: payment.reversal_reason,
                },

                created_at: payment.created_at,
                updated_at: payment.updated_at,
            },
        });

    } catch (error) {
        console.error(
            "Admin collection details exception:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    addAdminCollection,
    getPaymentHistory,
    getAdminCollections,
    getAdminCollectionDetails,
};
