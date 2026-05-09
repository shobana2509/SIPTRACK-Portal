const pool = require('./db');

async function migrate() {
    try {
        await pool.execute('ALTER TABLE sipcots ADD COLUMN submission_deadline VARCHAR(20) DEFAULT NULL;');
        console.log("Migration successful");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column already exists");
        } else {
            console.error(e);
        }
    } finally {
        process.exit(0);
    }
}
migrate();
