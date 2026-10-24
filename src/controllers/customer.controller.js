const supabase = require("../config/supabase");

async function createCustomer(req, res, next) {
    let createdAuthUserId = null;

    try {
        const {
            full_name,
            phone,
            alternate_phone,
            aadhaar_number,
            pan_number,
            nominee_name,
            username,
            password,
        } = req.body || {};


        if (!full_name || !phone || !username || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Full name, phone, username and password are required",
            });
        }

        const cleanFullName = full_name.trim();
        const cleanPhone = phone.trim();
        const cleanUsername = username.trim().toLowerCase();

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
            });
        }

        const {
            data: existingProfile,
            error: usernameCheckError,
        } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", cleanUsername)
            .maybeSingle();

        if (usernameCheckError) {
            console.error(
                "Username check error:",
                usernameCheckError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to validate username",
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

        if (authError || !authData?.user) {
            console.error(
                "Create customer Auth user error:",
                authError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to create customer login account",
            });
        }

        const authUser = authData.user;

        createdAuthUserId = authUser.id;

        const {
            data: profile,
            error: profileError,
        } = await supabase
            .from("profiles")
            .insert({
                id: authUser.id,
                username: cleanUsername,
                full_name: cleanFullName,
                phone: cleanPhone,
                role: "CUSTOMER",
                status: "ACTIVE",
            })
            .select(`
                id,
                username,
                full_name,
                phone,
                role,
                status
            `)
            .single();

        if (profileError) {
            console.error(
                "Create customer profile error:",
                profileError
            );

            // Rollback Auth user
            await supabase.auth.admin.deleteUser(
                authUser.id
            );

            return res.status(500).json({
                success: false,
                message: "Failed to create customer profile",
            });
        }


        const customerCode = `CUS-${Date.now()}`;


        const {
            data: customer,
            error: customerError,
        } = await supabase
            .from("customers")
            .insert({
                user_id: authUser.id,
                customer_code: customerCode,
                full_name: cleanFullName,
                phone: cleanPhone,
                alternate_phone:
                    alternate_phone?.trim() || null,
                aadhaar_number:
                    aadhaar_number?.trim() || null,
                pan_number:
                    pan_number?.trim().toUpperCase() || null,
                nominee_name:
                    nominee_name?.trim() || null,
                status: "ACTIVE",
                created_by: req.user.id,
            })
            .select(`
                id,
                user_id,
                customer_code,
                full_name,
                phone,
                alternate_phone,
                aadhaar_number,
                pan_number,
                nominee_name,
                status,
                created_by,
                created_at,
                updated_at
            `)
            .single();

        if (customerError) {
            console.error(
                "Create customer error:",
                customerError
            );

            // Rollback profile
            await supabase
                .from("profiles")
                .delete()
                .eq("id", authUser.id);

            // Rollback Auth user
            await supabase.auth.admin.deleteUser(
                authUser.id
            );

            return res.status(500).json({
                success: false,
                message: "Failed to create customer",
            });
        }


        return res.status(201).json({
            success: true,
            message: "Customer created successfully",

            customer: {
                id: customer.id,
                user_id: customer.user_id,
                customer_code: customer.customer_code,
                full_name: customer.full_name,
                phone: customer.phone,
                alternate_phone: customer.alternate_phone,
                aadhaar_number: customer.aadhaar_number,
                pan_number: customer.pan_number,
                nominee_name: customer.nominee_name,
                status: customer.status,
                created_by: customer.created_by,
                created_at: customer.created_at,
                updated_at: customer.updated_at,
            },

            login: {
                username: cleanUsername,
                email: authEmail,
            },

            profile,
        });

    } catch (error) {
        console.error(
            "Create customer unexpected error:",
            error
        );

        // Safety rollback
        if (createdAuthUserId) {
            try {
                await supabase.auth.admin.deleteUser(
                    createdAuthUserId
                );
            } catch (rollbackError) {
                console.error(
                    "Auth rollback error:",
                    rollbackError
                );
            }
        }

        next(error);
    }
};

async function getCustomerDetails(req, res, next) {
    try {
        const { customerId } = req.params;


        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer ID is required",
            });
        }

        const {
            data: customer,
            error: customerError,
        } = await supabase
            .from("customers")
            .select(`
                id,
                user_id,
                customer_code,
                full_name,
                phone,
                alternate_phone,
                aadhaar_number,
                pan_number,
                nominee_name,
                status,
                created_by,
                created_at,
                updated_at
            `)
            .eq("id", customerId)
            .single();


        if (customerError || !customer) {
            console.error(
                "Get customer error:",
                customerError
            );

            return res.status(404).json({
                success: false,
                message: "Customer not found",
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
                status,
                created_at,
                updated_at
            `)
            .eq("customer_id", customerId)
            .order("created_at", {
                ascending: true,
            });

        if (accountsError) {
            console.error(
                "Get customer accounts error:",
                accountsError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer accounts",
            });
        }

        return res.status(200).json({
            success: true,
            customer,
            accounts: accounts || [],
        });

    } catch (error) {
        console.error(
            "Get customer details unexpected error:",
            error
        );

        next(error);
    }
};

const listCustomers = async (req, res) => {
    try {
        let {
            search = "",
            status,
            page = 1,
            limit = 20,
        } = req.query;

        // Convert pagination values to numbers
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        // Safe pagination defaults
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

        if (status && status.trim()) {
            query = query.eq("status", status.trim().toUpperCase());
        }

        query = query
            .order("created_at", { ascending: false })
            .range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error("List customers error:", error);

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
        console.error("List customers exception:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

async function getCustomerMe(req, res, next) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const {
            data: customer,
            error: customerError,
        } = await supabase
            .from("customers")
            .select(`
                id,
                user_id,
                customer_code,
                full_name,
                phone,
                alternate_phone,
                aadhaar,
                pan,
                nominee_name,
                status,
                created_at,
                updated_at
            `)
            .eq("user_id", userId)
            .maybeSingle();

        if (customerError) {
            console.error(
                "Get current customer error:",
                customerError.message
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer profile",
            });
        }

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer profile not found",
            });
        }

        if (customer.status !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: "Customer account is inactive",
            });
        }

        // Return masked identification numbers.
        const aadhaarDigits = (customer.aadhaar || "")
            .replace(/\D/g, "");

        const maskedAadhaar =
            aadhaarDigits.length === 12
                ? `XXXX XXXX ${aadhaarDigits.slice(-4)}`
                : null;

        const pan = (customer.pan || "")
            .trim()
            .toUpperCase();

        const maskedPan =
            /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)
                ? `XXXXX${pan.slice(5)}`
                : null;

        return res.status(200).json({
            success: true,
            customer: {
                id: customer.id,
                user_id: customer.user_id,
                customer_code: customer.customer_code,
                full_name: customer.full_name,
                phone: customer.phone,
                alternate_phone: customer.alternate_phone,
                aadhaar: maskedAadhaar,
                pan: maskedPan,
                nominee_name: customer.nominee_name,
                status: customer.status,
                created_at: customer.created_at,
                updated_at: customer.updated_at,
            },
        });

    } catch (error) {
        console.error("Get customer me exception:", error.message);
        next(error);
    }
}

async function getCustomerAccounts(req, res, next) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
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
                status
            `)
            .eq("user_id", userId)
            .maybeSingle();

        if (customerError) {
            console.error(
                "Get customer for accounts error:",
                customerError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer",
            });
        }

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer profile not found",
            });
        }

        if (customer.status !== "ACTIVE") {
            return res.status(403).json({
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
                status,
                created_at,
                updated_at
            `)
            .eq("customer_id", customer.id)
            .order("created_at", {
                ascending: true,
            });

        if (accountsError) {
            console.error(
                "Get customer accounts error:",
                accountsError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer accounts",
            });
        }

        return res.status(200).json({
            success: true,

            customer: {
                id: customer.id,
                customer_code: customer.customer_code,
                full_name: customer.full_name,
            },

            accounts: accounts || [],
        });

    } catch (error) {
        console.error(
            "Get customer accounts exception:",
            error
        );

        next(error);
    }
}

async function getCustomerAccountDetails(req, res, next) {
    try {
        const { accountId } = req.params;

        if (!accountId) {
            return res.status(400).json({
                success: false,
                message: "Account ID is required",
            });
        }

        // Find logged-in customer's record
        const { data: customer, error: customerError } = await supabase
            .from("customers")
            .select(`
                id,
                customer_code,
                full_name,
                phone,
                status
            `)
            .eq("user_id", req.user.id)
            .maybeSingle();

        if (customerError) {
            console.error(
                "Get customer account details customer error:",
                customerError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer",
            });
        }

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer record not found",
            });
        }

        // Get account belonging ONLY to this customer
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
                status,
                created_at,
                updated_at
            `)
            .eq("id", accountId)
            .eq("customer_id", customer.id)
            .maybeSingle();

        if (accountError) {
            console.error(
                "Get customer account error:",
                accountError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch account",
            });
        }

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account not found",
            });
        }

        // Get approved payments for this account
        const {
            data: approvedPayments,
            error: approvedPaymentsError,
        } = await supabase
            .from("payments")
            .select("amount")
            .eq("account_id", account.id)
            .eq("customer_id", customer.id)
            .eq("status", "APPROVED");

        if (approvedPaymentsError) {
            console.error(
                "Get approved payments error:",
                approvedPaymentsError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to calculate collection summary",
            });
        }

        const approvedCollection = (approvedPayments || []).reduce(
            (total, payment) => total + Number(payment.amount),
            0
        );

        // Get pending payments
        const {
            data: pendingPayments,
            error: pendingPaymentsError,
        } = await supabase
            .from("payments")
            .select("amount")
            .eq("account_id", account.id)
            .eq("customer_id", customer.id)
            .eq("status", "PENDING");

        if (pendingPaymentsError) {
            console.error(
                "Get pending payments error:",
                pendingPaymentsError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to calculate pending collection",
            });
        }

        const pendingCollection = (pendingPayments || []).reduce(
            (total, payment) => total + Number(payment.amount),
            0
        );

        return res.status(200).json({
            success: true,

            customer: {
                id: customer.id,
                customer_code: customer.customer_code,
                full_name: customer.full_name,
                phone: customer.phone,
                status: customer.status,
            },

            account: {
                id: account.id,
                customer_id: account.customer_id,
                account_number: account.account_number,
                scheme: account.scheme,
                account_name: account.account_name,
                collection_amount: account.collection_amount,
                frequency: account.frequency,
                start_date: account.start_date,
                maturity_date: account.maturity_date,
                previous_paid: account.previous_paid,
                status: account.status,
                created_at: account.created_at,
                updated_at: account.updated_at,
            },

            summary: {
                previous_paid: Number(account.previous_paid || 0),
                approved_collection: approvedCollection,
                pending_collection: pendingCollection,
                total_collection:
                    Number(account.previous_paid || 0) +
                    approvedCollection,
            },
        });
    } catch (error) {
        console.error(
            "Get customer account details exception:",
            error
        );

        next(error);
    }
}

async function getCustomerAccountPayments(req, res, next) {
    try {
        const { accountId } = req.params;

        if (!accountId) {
            return res.status(400).json({
                success: false,
                message: "Account ID is required",
            });
        }

        // 1. Find the logged-in customer
        const { data: customer, error: customerError } = await supabase
            .from("customers")
            .select("id")
            .eq("user_id", req.user.id)
            .maybeSingle();

        if (customerError) {
            console.error("Get customer error:", customerError);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer",
            });
        }

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer record not found",
            });
        }

        // 2. Verify account ownership
        const { data: account, error: accountError } = await supabase
            .from("customer_accounts")
            .select("id, account_number, scheme, account_name")
            .eq("id", accountId)
            .eq("customer_id", customer.id)
            .maybeSingle();

        if (accountError) {
            console.error("Get customer account error:", accountError);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch account",
            });
        }

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account not found",
            });
        }

        // 3. Fetch payment history for this account only
        const { data: payments, error: paymentsError } = await supabase
            .from("payments")
            .select(`
                id,
                account_id,
                amount,
                payment_date,
                reference_number,
                status,
                receipt_number,
                notes,
                submitted_at,
                approved_at,
                rejected_at,
                reversed_at,
                rejection_reason,
                reversal_reason,
                created_at,
                updated_at
            `)
            .eq("account_id", account.id)
            .eq("customer_id", customer.id)
            .order("payment_date", { ascending: false });

        if (paymentsError) {
            console.error("Get account payment history error:", paymentsError);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch payment history",
            });
        }

        return res.status(200).json({
            success: true,
            account,
            count: payments.length,
            payments,
        });
    } catch (error) {
        console.error("Get customer account payments exception:", error);
        next(error);
    }
}

async function getCustomerPaymentDetails(req, res, next) {
    try {
        const { paymentId } = req.params;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: "Payment ID is required",
            });
        }

        // 1. Find logged-in customer
        const {
            data: customer,
            error: customerError,
        } = await supabase
            .from("customers")
            .select(`
                id,
                customer_code,
                full_name,
                phone
            `)
            .eq("user_id", req.user.id)
            .maybeSingle();

        if (customerError) {
            console.error(
                "Get customer for payment details error:",
                customerError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer",
            });
        }

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer record not found",
            });
        }

        // 2. Get payment ONLY if it belongs to this customer
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
                reference_number,
                status,
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
            .eq("customer_id", customer.id)
            .maybeSingle();

        if (paymentError) {
            console.error(
                "Get customer payment details error:",
                paymentError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch payment",
            });
        }

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }

        // 3. Get account details
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
            .eq("customer_id", customer.id)
            .maybeSingle();

        if (accountError) {
            console.error(
                "Get payment account error:",
                accountError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch account details",
            });
        }

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Payment account not found",
            });
        }

        return res.status(200).json({
            success: true,

            customer: {
                id: customer.id,
                customer_code: customer.customer_code,
                full_name: customer.full_name,
                phone: customer.phone,
            },

            account: {
                id: account.id,
                account_number: account.account_number,
                scheme: account.scheme,
                account_name: account.account_name,
                collection_amount: account.collection_amount,
                frequency: account.frequency,
                start_date: account.start_date,
                maturity_date: account.maturity_date,
                status: account.status,
            },

            payment: {
                id: payment.id,
                amount: payment.amount,
                payment_date: payment.payment_date,
                reference_number: payment.reference_number,
                status: payment.status,
                receipt_number: payment.receipt_number,
                notes: payment.notes,

                submitted_at: payment.submitted_at,
                approved_at: payment.approved_at,
                rejected_at: payment.rejected_at,
                reversed_at: payment.reversed_at,

                rejection_reason: payment.rejection_reason,
                reversal_reason: payment.reversal_reason,

                created_at: payment.created_at,
                updated_at: payment.updated_at,
            },
        });
    } catch (error) {
        console.error(
            "Get customer payment details exception:",
            error
        );

        next(error);
    }
}

async function getCustomerDashboardSummary(req, res, next) {
    try {
        // 1. Find logged-in customer
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
            .eq("user_id", req.user.id)
            .maybeSingle();

        if (customerError) {
            console.error(
                "Customer dashboard customer error:",
                customerError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer",
            });
        }

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer record not found",
            });
        }

        // 2. Get customer's accounts
        const {
            data: accounts,
            error: accountsError,
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
                previous_paid,
                status,
                created_at,
                updated_at
            `)
            .eq("customer_id", customer.id)
            .order("created_at", {
                ascending: true,
            });

        if (accountsError) {
            console.error(
                "Customer dashboard accounts error:",
                accountsError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer accounts",
            });
        }

        // 3. Get all payments of this customer
        const {
            data: payments,
            error: paymentsError,
        } = await supabase
            .from("payments")
            .select(`
                id,
                account_id,
                amount,
                status,
                payment_date,
                receipt_number,
                created_at
            `)
            .eq("customer_id", customer.id);

        if (paymentsError) {
            console.error(
                "Customer dashboard payments error:",
                paymentsError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch customer payments",
            });
        }

        const paymentList = payments || [];

        // 4. Calculate overall totals
        const approvedCollection = paymentList
            .filter((payment) => payment.status === "APPROVED")
            .reduce(
                (total, payment) => total + Number(payment.amount || 0),
                0
            );

        const pendingCollection = paymentList
            .filter((payment) => payment.status === "PENDING")
            .reduce(
                (total, payment) => total + Number(payment.amount || 0),
                0
            );

        const rejectedCollection = paymentList
            .filter((payment) => payment.status === "REJECTED")
            .reduce(
                (total, payment) => total + Number(payment.amount || 0),
                0
            );

        const reversedCollection = paymentList
            .filter((payment) => payment.status === "REVERSED")
            .reduce(
                (total, payment) => total + Number(payment.amount || 0),
                0
            );

        // 5. Account-wise summary
        const accountSummaries = (accounts || []).map((account) => {
            const accountPayments = paymentList.filter(
                (payment) => payment.account_id === account.id
            );

            const approved = accountPayments
                .filter((payment) => payment.status === "APPROVED")
                .reduce(
                    (total, payment) =>
                        total + Number(payment.amount || 0),
                    0
                );

            const pending = accountPayments
                .filter((payment) => payment.status === "PENDING")
                .reduce(
                    (total, payment) =>
                        total + Number(payment.amount || 0),
                    0
                );

            const rejected = accountPayments
                .filter((payment) => payment.status === "REJECTED")
                .reduce(
                    (total, payment) =>
                        total + Number(payment.amount || 0),
                    0
                );

            const reversed = accountPayments
                .filter((payment) => payment.status === "REVERSED")
                .reduce(
                    (total, payment) =>
                        total + Number(payment.amount || 0),
                    0
                );

            return {
                id: account.id,
                account_number: account.account_number,
                scheme: account.scheme,
                account_name: account.account_name,
                collection_amount: account.collection_amount,
                frequency: account.frequency,
                start_date: account.start_date,
                maturity_date: account.maturity_date,
                previous_paid: Number(account.previous_paid || 0),
                status: account.status,

                summary: {
                    approved_collection: approved,
                    pending_collection: pending,
                    rejected_collection: rejected,
                    reversed_collection: reversed,
                    total_collection:
                        Number(account.previous_paid || 0) +
                        approved,
                },
            };
        });

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

            summary: {
                total_accounts: accounts?.length || 0,
                approved_collection: approvedCollection,
                pending_collection: pendingCollection,
                rejected_collection: rejectedCollection,
                reversed_collection: reversedCollection,
                total_collection: approvedCollection +
                    Number(
                        (accounts || []).reduce(
                            (total, account) =>
                                total +
                                Number(account.previous_paid || 0),
                            0
                        )
                    ),
            },

            accounts: accountSummaries,
        });
    } catch (error) {
        console.error(
            "Customer dashboard summary exception:",
            error
        );

        next(error);
    }
}

module.exports = {
    createCustomer,
    getCustomerDetails,
    listCustomers,
    getCustomerMe,
    getCustomerAccounts,
    getCustomerAccountDetails,
    getCustomerPaymentDetails,
    getCustomerAccountPayments,
    getCustomerDashboardSummary,
};