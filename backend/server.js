const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

const app = express();
const PORT = 5000;


// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// ============ AUTH ROUTES ============
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.execute(
      'SELECT id, username, role, name, sipcot_id as sipcotId, industry_id as industryId FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ USER ROUTES ============
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, username, role, name, sipcot_id as sipcotId, industry_id as industryId FROM users');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, role, name, sipcotId, industryId } = req.body;

    // Determine prefix based on role / relation
    const normalizedRole = String(role || '').toLowerCase();
    const hasSipcot = Boolean(sipcotId) || normalizedRole.includes('sipcot');
    const hasIndustry = Boolean(industryId) || normalizedRole.includes('industry');

    let prefix = 'usr';
    let prefixLen = 3;

    if (hasIndustry) {
      prefix = 'iu';
      prefixLen = 2;
    } else if (hasSipcot) {
      prefix = 'su';
      prefixLen = 2;
    }

    const [rows] = await pool.execute(
      `SELECT id FROM users WHERE id LIKE ?
       ORDER BY CAST(SUBSTRING(id, ${prefixLen + 1}) AS UNSIGNED) DESC
       LIMIT 1`,
      [`${prefix}%`]
    );
    let nextNumber = 1;
    if (rows.length > 0) {
      nextNumber = parseInt(rows[0].id.substring(prefixLen)) + 1;
    }
    const id = `${prefix}${nextNumber}`;

    await pool.execute(
      'INSERT INTO users (id, username, password, role, name, sipcot_id, industry_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, username, password, role, name, sipcotId || null, industryId || null]
    );
    res.json({ id, username, role, name, sipcotId, industryId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ SIPCOT ROUTES ============
app.get('/api/sipcots', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM sipcots');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sipcots', async (req, res) => {
  try {
    const { name, district } = req.body;

    const [rows] = await pool.execute(`
      SELECT id 
      FROM sipcots 
      WHERE id LIKE 'sip%' 
      ORDER BY CAST(SUBSTRING(id,4) AS UNSIGNED) DESC 
      LIMIT 1
    `);

    let nextNumber = 1;
    if (rows.length > 0) {
      const lastId = rows[0].id;   // example: sip3
      nextNumber = parseInt(lastId.substring(3)) + 1;
    }

    const id = `sip${nextNumber}`;

    await pool.execute(
      'INSERT INTO sipcots (id, name, district) VALUES (?, ?, ?)',
      [id, name, district]
    );

    res.json({ id, name, district });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============ INDUSTRY ROUTES ============
app.get('/api/industries', async (req, res) => {
  try {
    const { sipcotId } = req.query;
    let query = 'SELECT id, name, sipcot_id as sipcotId FROM industries';
    let params = [];
    if (sipcotId) { query += ' WHERE sipcot_id = ?'; params.push(sipcotId); }
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/industries', async (req, res) => {
  try {
    const { name, sipcotId } = req.body;

    const [rows] = await pool.execute(`
      SELECT id 
      FROM industries
      WHERE id LIKE 'ind%'
      ORDER BY CAST(SUBSTRING(id,4) AS UNSIGNED) DESC
      LIMIT 1
    `);

    let nextNumber = 1;

    if (rows.length > 0) {
      const lastId = rows[0].id;   // example: ind5
      nextNumber = parseInt(lastId.substring(3)) + 1;
    }

    const id = `ind${nextNumber}`;

    await pool.execute(
      'INSERT INTO industries (id, name, sipcot_id) VALUES (?, ?, ?)',
      [id, name, sipcotId]
    );

    res.json({ id, name, sipcotId });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete('/api/industries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Delete associated users
    await pool.execute('DELETE FROM users WHERE industry_id = ?', [id]);
    // Delete industry (cascades to all related data)
    await pool.execute('DELETE FROM industries WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ GENERIC CRUD HELPER ============
// Prefix map for custom IDs
const prefixMap = {
  investments: { prefix: 'inv', len: 3 },
  employees: { prefix: 'emp', len: 3 },
  term_loans: { prefix: 'loan', len: 4 },
  power_usages: { prefix: 'pow', len: 3 },
  turnovers: { prefix: 'tur', len: 3 },
  csr_entries: { prefix: 'csr', len: 3 },
  water_usages: { prefix: 'wat', len: 3 },
};

async function generatePrefixedId(tableName) {
  const config = prefixMap[tableName];
  if (!config) return uuidv4();
  const { prefix, len } = config;
  const [rows] = await pool.execute(`
    SELECT id FROM ${tableName}
    WHERE id LIKE '${prefix}%'
    ORDER BY CAST(SUBSTRING(id, ${len + 1}) AS UNSIGNED) DESC
    LIMIT 1
  `);
  let nextNumber = 1;
  if (rows.length > 0) {
    nextNumber = parseInt(rows[0].id.substring(len)) + 1;
  }
  return `${prefix}${nextNumber}`;
}

function createCrudRoutes(tableName, routeName, columns) {
  // GET all or by industryId
  app.get(`/api/${routeName}`, async (req, res) => {
    try {
      const { industryId } = req.query;
      let query = `SELECT * FROM ${tableName}`;
      let params = [];
      if (industryId) { query += ' WHERE industry_id = ?'; params.push(industryId); }
      const [rows] = await pool.execute(query, params);
      const mapped = rows.map(row => mapToCamel(row, tableName));
      res.json(mapped);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // POST with optional file upload
  app.post(`/api/${routeName}`, upload.single('proofFile'), async (req, res) => {
    try {
      const id = await generatePrefixedId(tableName);
      const data = req.body;
      const proofFileName = req.file ? req.file.originalname : (data.proofFileName || null);
      const proofFilePath = req.file ? `/uploads/${req.file.filename}` : null;

      const cols = ['id', 'industry_id', ...columns, 'proof_file_name', 'proof_file_path', 'updated_date'];
      const placeholders = cols.map(() => '?').join(', ');
      const values = [
        id,
        data.industryId,
        ...columns.map(c => data[snakeToCamel(c)] ?? data[c] ?? null),
        proofFileName,
        proofFilePath,
        data.updatedDate || new Date().toISOString().split('T')[0]
      ];

      await pool.execute(
        `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
        values
      );

      const [rows] = await pool.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
      res.json(mapToCamel(rows[0], tableName));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // DELETE
  app.delete(`/api/${routeName}/:id`, async (req, res) => {
    try {
      await pool.execute(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
}

// Snake to camel helper
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// Map DB row to camelCase
function mapToCamel(row, tableName) {
  if (!row) return null;
  const mapped = {};
  for (const [key, value] of Object.entries(row)) {
    mapped[snakeToCamel(key)] = value;
  }
  // Add proofFileData as URL for frontend compatibility
  if (mapped.proofFilePath) {
    mapped.proofFileData = `http://localhost:${PORT}${mapped.proofFilePath}`;
  }
  return mapped;
}

// Register CRUD routes
createCrudRoutes('investments', 'investments', ['total_amount', 'investment_date', 'investment_type']);
createCrudRoutes('employees', 'employees', ['male', 'female']);
createCrudRoutes('term_loans', 'term-loans', ['loan_amount', 'bank', 'interest_rate', 'tenure', 'emi', 'status']);
createCrudRoutes('power_usages', 'power-usages', ['monthly_usage', 'yearly_usage', 'power_source', 'connection_number']);
createCrudRoutes('turnovers', 'turnovers', ['monthly_turnover', 'annual_turnover', 'financial_year']);
createCrudRoutes('csr_entries', 'csr-entries', ['activity_name', 'description', 'amount_spent', 'activity_date', 'location']);
createCrudRoutes('water_usages', 'water-usages', ['monthly_usage', 'yearly_usage', 'water_source']);

// Download proof file
app.get('/api/proof/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

const { initializeDatabase } = require('./db');

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
  });

