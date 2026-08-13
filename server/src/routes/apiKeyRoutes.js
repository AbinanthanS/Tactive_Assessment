const express = require("express");

const authenticate = require("../middleware/auth");

const { create, list, revoke } = require("../controllers/apiKeyController");

const router = express.Router();

router.post("/", authenticate, create);
router.get("/", authenticate, list);
router.delete("/:id", authenticate, revoke);

module.exports = router;