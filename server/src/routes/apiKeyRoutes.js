const express = require("express");

const authenticate = require("../middleware/auth");

const { create, list } = require("../controllers/apiKeyController");

const router = express.Router();

router.post("/", authenticate, create);
router.get("/", authenticate, list);

module.exports = router;