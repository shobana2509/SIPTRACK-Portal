const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');
const { analyzeExplanation } = require('./nlp');

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

    // Log activity
    const userRole = rows[0].role;
    // Log for super admin and sipcot admin (industry admin too, why not?)
    await pool.execute(
      'INSERT INTO activity_logs (user_id, username, role, activity_type) VALUES (?, ?, ?, ?)',
      [rows[0].id, rows[0].username, userRole, 'Login']
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activity-logs', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 200'
    );
    const mapped = rows.map(row => mapToCamel(row, 'activity_logs'));
    res.json(mapped);
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
    const [rows] = await pool.execute('SELECT id, name, district, submission_deadline as submissionDeadline, deadline_set_date as deadlineSetDate FROM sipcots');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/sipcots/:id/deadline', async (req, res) => {
  try {
    const { id } = req.params;
    const { deadline, senderId } = req.body;
    const setDate = new Date().toISOString().replace('T', ' ').split('.')[0];

    await pool.execute(
      'UPDATE sipcots SET submission_deadline = ?, deadline_set_date = ? WHERE id = ?',
      [deadline, setDate, id]
    );

    // Provide automated chat notification
    if (senderId) {
      const [industries] = await pool.execute('SELECT id FROM industries WHERE sipcot_id = ?', [id]);
      for (const ind of industries) {
        const [users] = await pool.execute('SELECT id FROM users WHERE industry_id = ? AND role = "industry_admin" LIMIT 1', [ind.id]);
        if (users.length > 0) {
          const receiverId = users[0].id;
          const msgId = await generatePrefixedId('chat_messages');
          const message = `System Alert: A new data submission deadline has been set for ${deadline}. Please submit your data before the deadline to avoid being marked as delayed.`;
          await pool.execute(
            'INSERT INTO chat_messages (id, sender_id, receiver_id, industry_id, message) VALUES (?, ?, ?, ?, ?)',
            [msgId, senderId, receiverId, ind.id, message]
          );
        }
      }
    }

    res.json({ success: true, deadline });
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
    let query = `
      SELECT i.id, i.name, i.sipcot_id as sipcotId,
      (
        EXISTS (SELECT 1 FROM investments WHERE industry_id = i.id AND is_super_admin_seen = FALSE) OR
        EXISTS (SELECT 1 FROM employees WHERE industry_id = i.id AND is_super_admin_seen = FALSE) OR
        EXISTS (SELECT 1 FROM term_loans WHERE industry_id = i.id AND is_super_admin_seen = FALSE) OR
        EXISTS (SELECT 1 FROM power_usages WHERE industry_id = i.id AND is_super_admin_seen = FALSE) OR
        EXISTS (SELECT 1 FROM turnovers WHERE industry_id = i.id AND is_super_admin_seen = FALSE) OR
        EXISTS (SELECT 1 FROM csr_entries WHERE industry_id = i.id AND is_super_admin_seen = FALSE) OR
        EXISTS (SELECT 1 FROM water_usages WHERE industry_id = i.id AND is_super_admin_seen = FALSE)
      ) as hasUnseenVerified
      FROM industries i
    `;
    let params = [];
    if (sipcotId) { query += ' WHERE i.sipcot_id = ?'; params.push(sipcotId); }
    const [rows] = await pool.execute(query, params);

    // Convert 1/0 to true/false for JS
    const results = rows.map(r => ({ ...r, hasUnseenVerified: !!r.hasUnseenVerified }));
    res.json(results);
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
  chat_messages: { prefix: 'msg', len: 3 },
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

async function detectAnomaly(tableName, industryId, dataId, newValue, dataType) {
  try {
    // Get last value (excluding the one we just added)
    const [rows] = await pool.execute(
      `SELECT * FROM ${tableName} WHERE industry_id = ? AND id != ? ORDER BY updated_date DESC, id DESC LIMIT 1`,
      [industryId, dataId]
    );

    if (rows.length === 0) return null;

    let oldValue = 0;
    if (tableName === 'turnovers') oldValue = Number(rows[0].monthly_turnover);
    else if (tableName === 'employees') oldValue = Number(rows[0].male) + Number(rows[0].female);
    else if (tableName === 'power_usages') oldValue = Number(rows[0].monthly_usage);
    else if (tableName === 'investments') oldValue = Number(rows[0].total_amount);
    else if (tableName === 'term_loans') oldValue = Number(rows[0].loan_amount);

    if (oldValue === 0) return null;

    const change = Math.abs(newValue - oldValue);
    const percentage = (change / oldValue) * 100;

    if (percentage >= 50) {
      const anomalyId = `anom${Date.now().toString().slice(-6)}`;
      await pool.execute(
        `INSERT INTO anomalies (id, industry_id, data_type, data_id, old_value, new_value, change_percentage)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [anomalyId, industryId, dataType, dataId, oldValue, newValue, percentage]
      );
      return { id: anomalyId, percentage };
    }
  } catch (err) {
    console.error('Anomaly detection error:', err);
  }
  return null;
}

function createCrudRoutes(tableName, routeName, columns, enableAnomaly = false) {
  // GET all or by industryId
  app.get(`/api/${routeName}`, async (req, res) => {
    try {
      const { industryId, verified } = req.query;
      let query = `SELECT * FROM ${tableName}`;
      let params = [];
      const conditions = [];
      if (industryId) { conditions.push('industry_id = ?'); params.push(industryId); }
      if (verified === 'true') { conditions.push("verification_status = 'verified'"); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
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

      const cols = ['id', 'industry_id', ...columns, 'proof_file_name', 'proof_file_path', 'updated_date', 'verification_status', 'is_super_admin_seen'];
      const placeholders = cols.map(() => '?').join(', ');
      const values = [
        id,
        data.industryId,
        ...columns.map(c => data[snakeToCamel(c)] ?? data[c] ?? null),
        proofFileName,
        proofFilePath,
        new Date().toISOString().replace('T', ' ').split('.')[0],
        data.verificationStatus || 'pending',
        false
      ];

      await pool.execute(
        `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
        values
      );

      const [rows] = await pool.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
      const result = mapToCamel(rows[0], tableName);

      // Anomaly Check
      if (enableAnomaly) {
        let newValue = 0;
        if (tableName === 'turnovers') newValue = Number(data.monthlyTurnover);
        else if (tableName === 'employees') newValue = Number(data.male) + Number(data.female);
        else if (tableName === 'power_usages') newValue = Number(data.monthlyUsage);
        else if (tableName === 'investments') newValue = Number(data.totalAmount);
        else if (tableName === 'term_loans') newValue = Number(data.loanAmount);

        const dataTypeMap = { turnovers: 'turnover', employees: 'employees', 'power-usages': 'power', 'investments': 'investment', 'term-loans': 'loan' };
        const anomaly = await detectAnomaly(tableName, data.industryId, id, newValue, dataTypeMap[routeName] || routeName);

        if (anomaly) {
          result.anomalyDetected = true;
          result.anomalyId = anomaly.id;
        }
      }

      res.json(result);
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
createCrudRoutes('investments', 'investments', ['total_amount', 'investment_date', 'investment_type'], true);
createCrudRoutes('employees', 'employees', ['male', 'female'], true);
createCrudRoutes('term_loans', 'term-loans', ['loan_amount', 'bank', 'interest_rate', 'tenure', 'emi', 'status'], true);
createCrudRoutes('power_usages', 'power-usages', ['monthly_usage', 'power_source', 'connection_number'], true);
createCrudRoutes('turnovers', 'turnovers', ['monthly_turnover', 'financial_year', 'turnover_date'], true);
createCrudRoutes('csr_entries', 'csr-entries', ['activity_name', 'description', 'amount_spent', 'activity_date', 'location']);
createCrudRoutes('water_usages', 'water-usages', ['monthly_usage', 'water_source']);

// ============ ANOMALY ROUTES ============
app.get('/api/anomalies', async (req, res) => {
  try {
    const { industryId } = req.query;
    let query = 'SELECT * FROM anomalies';
    let params = [];
    if (industryId) {
      query += ' WHERE industry_id = ?';
      params.push(industryId);
    }
    query += ' ORDER BY timestamp DESC';
    const [rows] = await pool.execute(query, params);
    res.json(rows.map(r => mapToCamel(r, 'anomalies')));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/anomalies/:id/explain', async (req, res) => {
  try {
    const { id } = req.params;
    const { explanation } = req.body;

    const { validation, result } = analyzeExplanation(explanation);

    await pool.execute(
      `UPDATE anomalies 
       SET explanation = ?, ai_validation = ?, validation_result = ?, status = 'resolved'
       WHERE id = ?`,
      [explanation, validation, result, id]
    );

    res.json({ success: true, validation, result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Verification endpoint
app.put('/api/verify/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const { status } = req.body; // 'verified' or 'pending'

    const allowedTables = ['investments', 'employees', 'term_loans', 'power_usages', 'turnovers', 'csr_entries', 'water_usages'];
    const dbTableName = tableName.replace(/-/g, '_');
    if (!allowedTables.includes(dbTableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    await pool.execute(
      `UPDATE ${dbTableName} SET verification_status = ? WHERE id = ?`,
      [status || 'verified', id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark as seen endpoint
app.put('/api/seen/:industryId', async (req, res) => {
  try {
    const { industryId } = req.params;
    const tables = ['investments', 'employees', 'term_loans', 'power_usages', 'turnovers', 'csr_entries', 'water_usages'];
    for (const table of tables) {
      await pool.execute(
        `UPDATE ${table} SET is_super_admin_seen = TRUE WHERE industry_id = ?`,
        [industryId]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Verify all endpoint
app.put('/api/verify-all/:industryId', async (req, res) => {
  try {
    const { industryId } = req.params;
    const tables = ['investments', 'employees', 'term_loans', 'power_usages', 'turnovers', 'csr_entries', 'water_usages'];
    for (const table of tables) {
      await pool.execute(
        `UPDATE ${table} SET verification_status = 'verified' WHERE industry_id = ? AND verification_status = 'pending'`,
        [industryId]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Download proof file
app.get('/api/proof/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// ============ ANALYTICS ROUTES ============
app.get('/api/stats/sipcot-comparison', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id, 
        s.name,
        (SELECT COALESCE(SUM(inv.total_amount), 0) FROM investments inv JOIN industries i ON inv.industry_id = i.id WHERE i.sipcot_id = s.id AND inv.id = (SELECT id FROM investments i2 WHERE i2.industry_id = inv.industry_id ORDER BY CAST(SUBSTRING(i2.id, 4) AS UNSIGNED) DESC LIMIT 1)) as totalInvestments,
        (SELECT COALESCE(SUM(tur.monthly_turnover), 0) FROM turnovers tur JOIN industries i ON tur.industry_id = i.id WHERE i.sipcot_id = s.id AND tur.id = (SELECT id FROM turnovers t2 WHERE t2.industry_id = tur.industry_id ORDER BY CAST(SUBSTRING(t2.id, 4) AS UNSIGNED) DESC LIMIT 1)) as totalTurnover,
        (SELECT COALESCE(SUM(pow.monthly_usage), 0) FROM power_usages pow JOIN industries i ON pow.industry_id = i.id WHERE i.sipcot_id = s.id AND pow.id = (SELECT id FROM power_usages p2 WHERE p2.industry_id = pow.industry_id ORDER BY CAST(SUBSTRING(p2.id, 4) AS UNSIGNED) DESC LIMIT 1)) as totalPowerUsage,
        (SELECT COALESCE(SUM(emp.male + emp.female), 0) FROM employees emp JOIN industries i ON emp.industry_id = i.id WHERE i.sipcot_id = s.id AND emp.id = (SELECT id FROM employees e2 WHERE e2.industry_id = emp.industry_id ORDER BY CAST(SUBSTRING(e2.id, 4) AS UNSIGNED) DESC LIMIT 1)) as totalEmployees,
        (SELECT COALESCE(SUM(wat.monthly_usage), 0) FROM water_usages wat JOIN industries i ON wat.industry_id = i.id WHERE i.sipcot_id = s.id AND wat.id = (SELECT id FROM water_usages w2 WHERE w2.industry_id = wat.industry_id ORDER BY CAST(SUBSTRING(w2.id, 4) AS UNSIGNED) DESC LIMIT 1)) as totalWaterUsage,
        (SELECT COALESCE(SUM(csr.amount_spent), 0) FROM csr_entries csr JOIN industries i ON csr.industry_id = i.id WHERE i.sipcot_id = s.id AND csr.id = (SELECT id FROM csr_entries c2 WHERE c2.industry_id = csr.industry_id ORDER BY CAST(SUBSTRING(c2.id, 4) AS UNSIGNED) DESC LIMIT 1)) as totalCsr,
        (SELECT COALESCE(SUM(loan.loan_amount), 0) FROM term_loans loan JOIN industries i ON loan.industry_id = i.id WHERE i.sipcot_id = s.id AND loan.id = (SELECT id FROM term_loans l2 WHERE l2.industry_id = loan.industry_id ORDER BY CAST(SUBSTRING(l2.id, 5) AS UNSIGNED) DESC LIMIT 1)) as totalLoans
      FROM sipcots s
    `;
    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats/usage-efficiency', async (req, res) => {
  try {
    // Flag industries with usage > 1.5x SIPCOT average
    const query = `
      SELECT 
        i.id as id,
        i.name as name,
        s.name as sipcotName,
        pu.monthly_usage as powerUsage,
        wu.monthly_usage as waterUsage,
        avg_pow.avg_val as avgPower,
        avg_wat.avg_val as avgWater
      FROM industries i
      JOIN sipcots s ON i.sipcot_id = s.id
      LEFT JOIN power_usages pu ON i.id = pu.industry_id
      LEFT JOIN water_usages wu ON i.id = wu.industry_id
      LEFT JOIN (
        SELECT i2.sipcot_id, AVG(pu2.monthly_usage) as avg_val
        FROM industries i2
        JOIN power_usages pu2 ON i2.id = pu2.industry_id
        GROUP BY i2.sipcot_id
      ) avg_pow ON i.sipcot_id = avg_pow.sipcot_id
      LEFT JOIN (
        SELECT i2.sipcot_id, AVG(wu2.monthly_usage) as avg_val
        FROM industries i2
        JOIN water_usages wu2 ON i2.id = wu2.industry_id
        GROUP BY i2.sipcot_id
      ) avg_wat ON i.sipcot_id = avg_wat.sipcot_id
      WHERE (pu.monthly_usage > avg_pow.avg_val * 1.5) OR (wu.monthly_usage > avg_wat.avg_val * 1.5)
    `;
    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats/industry-performance', async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id,
        i.name,
        s.name as sipcotName,
        (SELECT total_amount FROM investments WHERE industry_id = i.id ORDER BY CAST(SUBSTRING(id, 4) AS UNSIGNED) DESC LIMIT 1) as investment,
        (SELECT monthly_turnover FROM turnovers WHERE industry_id = i.id ORDER BY CAST(SUBSTRING(id, 4) AS UNSIGNED) DESC LIMIT 1) as turnover,
        (SELECT monthly_usage FROM power_usages WHERE industry_id = i.id ORDER BY CAST(SUBSTRING(id, 4) AS UNSIGNED) DESC LIMIT 1) as powerUsage,
        (SELECT monthly_usage FROM water_usages WHERE industry_id = i.id ORDER BY CAST(SUBSTRING(id, 4) AS UNSIGNED) DESC LIMIT 1) as waterUsage,
        (SELECT male + female FROM employees WHERE industry_id = i.id ORDER BY CAST(SUBSTRING(id, 4) AS UNSIGNED) DESC LIMIT 1) as employees,
        (SELECT amount_spent FROM csr_entries WHERE industry_id = i.id ORDER BY CAST(SUBSTRING(id, 4) AS UNSIGNED) DESC LIMIT 1) as csr,
        (SELECT loan_amount FROM term_loans WHERE industry_id = i.id ORDER BY CAST(SUBSTRING(id, 5) AS UNSIGNED) DESC LIMIT 1) as debt
      FROM industries i
      JOIN sipcots s ON i.sipcot_id = s.id
    `;
    const [rows] = pool.execute ? await pool.execute(query) : [[], []];

    // 1. Calculate Averages for Normalization
    const validPower = rows.map(r => Number(r.powerUsage) || 0).filter(v => v > 0);
    const validWater = rows.map(r => Number(r.waterUsage) || 0).filter(v => v > 0);

    const avgPower = validPower.length ? validPower.reduce((a, b) => a + b, 0) / validPower.length : 1;
    const avgWater = validWater.length ? validWater.reduce((a, b) => a + b, 0) / validWater.length : 1;

    // 2. Decision Tree Algorithm with new performance formulas
    const classified = rows.map(row => {
      const inv = Number(row.investment) || 1;
      const turn = Number(row.turnover) || 0;
      const pow = Number(row.powerUsage) || 0;
      const wat = Number(row.waterUsage) || 0;
      const emp = Number(row.employees) || 0;
      const csr = Number(row.csr) || 0;
      const debt = Number(row.debt) || 0;

      // User Requested Formulas
      const efficiency = pow > 0 ? (turn / pow) : 0;
      const waterEfficiency = wat > 0 ? (turn / wat) : 0;
      const debtRatio = inv > 0 ? (debt / inv) : 0;
      const csrRatio = turn > 0 ? (csr / turn) : 0;

      // Dimensionless Metrics for classification logic
      const roi = turn / inv;
      const normPower = pow / (avgPower || 1);
      const normWater = wat / (avgWater || 1);
      const resourceFootprint = normPower + normWater;

      // Unit-Agnostic Efficiency (ROI relative to resource footprint)
      const internalEfficiency = roi / (resourceFootprint + 1);

      // --- AI HEALTH SCORE CALCULATION (0-100) ---
      // We use sigmoid-like scaling for different components
      const roiScore = Math.min(100, (roi / 0.5) * 100) * 0.35; // Target ROI 0.5+ for max score
      const efficiencyScore = Math.min(100, (internalEfficiency / 0.2) * 100) * 0.25;
      const socialScore = Math.min(100, (emp / 100) * 100) * 0.15; // Target 100 employees
      const debtStabilityScore = Math.max(0, 100 - (debtRatio * 50)) * 0.15; // Lower debt is better
      const csrScore = Math.min(100, (csrRatio / 0.02) * 100) * 0.10; // Target 2% CSR

      const healthScore = Math.round(roiScore + efficiencyScore + socialScore + debtStabilityScore + csrScore);

      // --- ANOMALY DETECTION (Z-SCORE) ---
      const anomalies = [];
      if (avgPower > 0 && pow > avgPower * 2.5) anomalies.push("Critical Power Deviation");
      if (debtRatio > 1.5) anomalies.push("High Debt Risk");
      if (roi < 0.05 && turn > 0) anomalies.push("Sub-optimal ROI");

      let performance = "Poor";
      let reason = "High resource footprint relative to revenue generation";

      // Decision Node 1: High Profitability (ROI > 0.4)
      if (roi > 0.4) {
        if (internalEfficiency > 0.2) {
          performance = "Excellent";
          reason = "Exceptional ROI with optimized resource utilization";
        } else {
          performance = "Good";
          reason = "Strong profitability, but resource consumption relative to revenue is notable";
        }
      }
      // Decision Node 2: Moderate Profitability (0.2 < ROI <= 0.4)
      else if (roi > 0.2) {
        if (internalEfficiency > 0.1) {
          performance = "Good";
          reason = "Stable revenue with efficient resource footprints";
        } else {
          performance = "Average";
          reason = "Consistent operations but resource-intensive relative to turnover";
        }
      }
      // Decision Node 3: Low Profitability / Strategic Impact
      else if (roi > 0.1 || emp > 50) {
        performance = "Average";
        reason = emp > 50
          ? "Critical social impact via large workforce, despite lower financial returns"
          : "Sustained stability with manageable resource footprints";
      }

      return {
        ...row,
        performance,
        reason,
        healthScore,
        anomalies,
        metrics: {
          roi: roi.toFixed(2),
          efficiency: efficiency.toFixed(2),
          waterEfficiency: waterEfficiency.toFixed(2),
          debtRatio: debtRatio.toFixed(2),
          csrRatio: csrRatio.toFixed(4),
          footprint: resourceFootprint.toFixed(2)
        }
      };
    });

    const summary = {
      Excellent: classified.filter(c => c.performance === 'Excellent').length,
      Good: classified.filter(c => c.performance === 'Good').length,
      Average: classified.filter(c => c.performance === 'Average').length,
      Poor: classified.filter(c => c.performance === 'Poor').length,
    };

    res.json({
      summary: [
        { name: 'Excellent', value: summary.Excellent, color: '#22c55e' },
        { name: 'Good', value: summary.Good, color: '#3b82f6' },
        { name: 'Average', value: summary.Average, color: '#f59e0b' },
        { name: 'Poor', value: summary.Poor, color: '#ef4444' },
      ],
      avgMetrics: {
        power: Math.round(avgPower),
        water: Math.round(avgWater)
      },
      classified
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ============ CHAT ROUTES ============
app.get('/api/chat', async (req, res) => {
  try {
    const { industryId } = req.query;
    if (!industryId) return res.status(400).json({ error: 'industryId is required' });

    const [rows] = await pool.execute(
      `SELECT id, sender_id as senderId, receiver_id as receiverId, industry_id as industryId, 
              message, timestamp, is_deleted_for_everyone as isDeletedForEveryone, 
              deleted_by_sender as deletedBySender, deleted_by_receiver as deletedByReceiver,
              is_read as isRead
       FROM chat_messages 
       WHERE industry_id = ? 
       ORDER BY timestamp ASC`,
      [industryId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { senderId, receiverId, industryId, message } = req.body;
    const id = await generatePrefixedId('chat_messages');

    await pool.execute(
      'INSERT INTO chat_messages (id, sender_id, receiver_id, industry_id, message) VALUES (?, ?, ?, ?, ?)',
      [id, senderId, receiverId, industryId, message]
    );

    const [rows] = await pool.execute(
      `SELECT id, sender_id as senderId, receiver_id as receiverId, industry_id as industryId, 
              message, timestamp, is_deleted_for_everyone as isDeletedForEveryone, 
              deleted_by_sender as deletedBySender, deleted_by_receiver as deletedByReceiver,
              is_read as isRead
       FROM chat_messages WHERE id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/chat/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, userId } = req.body; // type: 'me' | 'everyone'

    if (type === 'everyone') {
      await pool.execute(
        'DELETE FROM chat_messages WHERE id = ?',
        [id]
      );
    } else {
      // Delete for me
      const [rows] = await pool.execute('SELECT sender_id FROM chat_messages WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Message not found' });

      const isSender = rows[0].sender_id === userId;
      if (isSender) {
        await pool.execute('UPDATE chat_messages SET deleted_by_sender = TRUE WHERE id = ?', [id]);
      } else {
        await pool.execute('UPDATE chat_messages SET deleted_by_receiver = TRUE WHERE id = ?', [id]);
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chat/clear', async (req, res) => {
  try {
    const { industryId, userId } = req.body;

    // PER USER REQUEST: Clear only for the local side (logical delete)
    // Mark as deleted by sender if user is sender
    await pool.execute(
      'UPDATE chat_messages SET deleted_by_sender = TRUE WHERE industry_id = ? AND sender_id = ?',
      [industryId, userId]
    );

    // Mark as deleted by receiver if user is receiver
    await pool.execute(
      'UPDATE chat_messages SET deleted_by_receiver = TRUE WHERE industry_id = ? AND receiver_id = ?',
      [industryId, userId]
    );

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chat/mark-read', async (req, res) => {
  try {
    const { industryId, userId } = req.body;
    await pool.execute(
      'UPDATE chat_messages SET is_read = TRUE WHERE industry_id = ? AND receiver_id = ? AND is_read = FALSE',
      [industryId, userId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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

