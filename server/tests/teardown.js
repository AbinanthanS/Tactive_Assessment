const pool = require("../src/config/db");

module.exports = async () => {
    try {
        await pool.end();
    } catch (err) {
        // Pool already closed or not open
    }
};
