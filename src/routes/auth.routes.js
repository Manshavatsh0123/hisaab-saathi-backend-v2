const express = require("express");

const { login, staffLogin, customerLogin, refreshSession } = require("../controllers/auth.controller");

const router = express.Router();

router.post(
    "/login",
    (req, res, next) => {
        const start = performance.now();

        res.on("finish", () => {
            console.log(
                `[LOGIN ROUTE] Total response time: ${
                    (performance.now() - start).toFixed(0)
                } ms`
            );
        });

        next();
    },
    login
);
// router.post("/refresh", refreshSession);

router.post("/customer/login", customerLogin);

router.post(
    "/staff/login",
    staffLogin
);

module.exports = router;