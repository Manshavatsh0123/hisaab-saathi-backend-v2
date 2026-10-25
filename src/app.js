const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require('cookie-parser');
const supabase = require("./config/supabase");

const app = express();
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const customerRoutes = require("./routes/customer.routes");
const accountRoutes = require("./routes/account.routes");
const paymentRoutes = require("./routes/payment.routes");
const notificationRoutes = require("./routes/notification.routes");
const customerPortalRoutes = require("./routes/customer.portal.routes");

const staffRoutes = require("./routes/staff.routes");

app.use(helmet());
app.use(cookieParser());



const allowedOrigins = (process.env.CLIENT_URLS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error(`CORS blocked this origin: ${origin}`)
            );
        },
        credentials: true,
    })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

// Auth routes
app.use("/api/auth", authRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// Customer routes
app.use("/api/customers", customerRoutes);

// Customer portal routes
app.use("/api/customer", customerPortalRoutes);

//Account routes
app.use("/api", accountRoutes);

// Payment routes
app.use("/api", paymentRoutes);

// staff routes
app.use("/api/staff", staffRoutes);

// Notification routes
app.use(
    "/api/admin/notifications",
    notificationRoutes
);

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "HisaabSaathi API is running",
    });
});

app.get("/api/health/database", async (req, res) => {
    try {
        const { error } = await supabase
            .from("profiles")
            .select("id")
            .limit(1);

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Supabase connected successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

module.exports = app;