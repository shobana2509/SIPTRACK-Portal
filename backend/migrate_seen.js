const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Sakthi@05',
    database: 'sipcot_db'
  });

  const tables = [
    'investments', 'employees', 'term_loans', 'power_usages', 'turnovers', 'csr_entries', 'water_usages'
  ];

  for (const table of tables) {
    try {
      // Check if verification_status exists
      const [cols] = await connection.execute(`DESCRIBE ${table}`);
      const colNames = cols.map(c => c.Field);

      if (!colNames.includes('verification_status')) {
        console.log(`Adding verification_status to ${table}...`);
        await connection.execute(`ALTER TABLE ${table} ADD COLUMN verification_status ENUM('pending', 'verified') DEFAULT 'pending'`);
      }

      if (!colNames.includes('is_super_admin_seen')) {
        console.log(`Adding is_super_admin_seen to ${table}...`);
        await connection.execute(`ALTER TABLE ${table} ADD COLUMN is_super_admin_seen BOOLEAN DEFAULT false`);
      }
    } catch (err) {
      console.error(`Error migrating ${table}:`, err.message);
    }
  }

  await connection.end();
  console.log('✅ Migration complete');
}

migrate();
