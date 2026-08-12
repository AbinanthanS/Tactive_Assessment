const pool = require("./config/db");

async function testDatabase() {
    try {
        const result = await pool.query("SELECT NOW()");
        console.log("Database connected:", result.rows[0]);
    } catch (error) {
        console.error("Database connection failed:");
        console.error(error);
    } finally {
        await pool.end();
    }
}

testDatabase();