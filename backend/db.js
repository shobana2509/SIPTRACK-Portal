const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// First, create a connection WITHOUT specifying a database (to create it if needed)
async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Sakthi@05',
    multipleStatements: true
  });

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await connection.query(schema);
  await connection.end();
  console.log('✅ Database schema initialized');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Sakthi@05',
  database: 'sipcot_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
module.exports.initializeDatabase = initializeDatabase;
