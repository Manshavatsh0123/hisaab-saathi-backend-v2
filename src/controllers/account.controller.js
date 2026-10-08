const supabase = require("../config/supabase");

async function createAccount(req, res, next) {
    try {
        const { customerId } = req.params;

        const {
            account_number,
            scheme,
            account_name,
            collection_amount,
            frequency,
            start_date,
            maturity_date,
            previous_paid,
        } = req.body || {};

        // Validate required fields
        if (
            !account_number ||
            !scheme ||
            !account_name ||
            collection_amount === undefined ||
            !frequency ||
            !start_date
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Account number, scheme, account name, collection amount, frequency and start date are required",
            });
        }

        // Check customer exists
        const { data: customer, error: customerError } = await supabase
            .from("customers")
            .select("id, full_name, status")
            .eq("id", customerId)
            .single();

        if (customerError || !customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        // Don't create account for inactive customer
        if (customer.status !== "ACTIVE") {
            return res.status(400).json({
                success: false,
                message: "Customer account is inactive",
            });
        }

        // Create customer account
        const { data: account, error } = await supabase
            .from("customer_accounts")
            .insert({
                customer_id: customerId,
                account_number,
                scheme,
                account_name,
                collection_amount,
                frequency,
                start_date,
                maturity_date: maturity_date || null,
                previous_paid: previous_paid || 0,
                status: "ACTIVE",
            })
            .select()
            .single();

        if (error) {
            console.error("Create account error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to create customer account",
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
            });
        }

        return res.status(201).json({
            success: true,
            message: "Customer account created successfully",
            account,
        });
    } catch (error) {
        next(error);
    }
}


async function getAccountSummary(req, res, next) {
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
            .eq("customer_id", customerId)
            .single();


        if (accountError || !account) {
            console.error(
                "Get account error:",
                accountError
            );

            return res.status(404).json({
                success: false,
                message:
                    "Customer account not found",
            });
        }

        if (account.status !== "ACTIVE") {
            return res.status(400).json({
                success: false,
                message:
                    "Customer account is not active",
            });
        }


        const {
            data: payments,
            error: paymentsError,
        } = await supabase
            .from("payments")
            .select(`
                id,
                amount,
                status,
                payment_date
            `)
            .eq("customer_id", customerId)
            .eq("account_id", accountId);


        if (paymentsError) {
            console.error(
                "Get account payments error:",
                paymentsError
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to calculate account summary",
            });
        }


        let approvedAmount = 0;
        let pendingAmount = 0;
        let rejectedAmount = 0;
        let reversedAmount = 0;

        let approvedCount = 0;
        let pendingCount = 0;
        let rejectedCount = 0;
        let reversedCount = 0;

        for (const payment of payments || []) {
            const amount = Number(payment.amount) || 0;

            switch (payment.status) {
                case "APPROVED":
                    approvedAmount += amount;
                    approvedCount++;
                    break;

                case "PENDING":
                    pendingAmount += amount;
                    pendingCount++;
                    break;

                case "REJECTED":
                    rejectedAmount += amount;
                    rejectedCount++;
                    break;

                case "REVERSED":
                    reversedAmount += amount;
                    reversedCount++;
                    break;

                default:
                    break;
            }
        }


        const previousPaid =
            Number(account.previous_paid) || 0;


        const totalCollection =
            previousPaid + approvedAmount;

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
                collection_amount:
                    Number(account.collection_amount),
                frequency: account.frequency,
                start_date: account.start_date,
                maturity_date:
                    account.maturity_date,
                status: account.status,
            },

            summary: {
                previous_paid: previousPaid,

                approved_collection:
                    approvedAmount,

                total_collection:
                    totalCollection,

                pending_amount:
                    pendingAmount,

                rejected_amount:
                    rejectedAmount,

                reversed_amount:
                    reversedAmount,

                approved_count:
                    approvedCount,

                pending_count:
                    pendingCount,

                rejected_count:
                    rejectedCount,

                reversed_count:
                    reversedCount,
            },
        });

    } catch (error) {
        console.error(
            "Get account summary unexpected error:",
            error
        );

        next(error);
    }
}


module.exports = {
    createAccount,
    getAccountSummary,
};