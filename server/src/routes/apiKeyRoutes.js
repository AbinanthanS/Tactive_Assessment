const express = require("express");
const authenticate = require("../middleware/auth");
const { create } = require("../controllers/apiKeyController");

const router = express.Router();

router.post("/", authenticate, create);

module.exports = router;