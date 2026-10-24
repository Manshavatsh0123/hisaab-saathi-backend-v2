const express = require("express");
const { login, staffLogin, customerLogin, refreshSession, } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/login", login);
router.post("/customer/login", customerLogin);
router.post("/staff/login", staffLogin);
router.post("/refresh", refreshSession);



module.exports = router;
