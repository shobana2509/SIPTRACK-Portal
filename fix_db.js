const pool = require('./backend/db');

async function fixSchema() {
  try {
    console.log('Adding is_read column to chat_messages...');
    await pool.execute('ALTER TABLE chat_messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;');
    console.log('✅ Successfully updated schema.');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Column is_read already exists.');
    } else {
      console.error('Failed to update schema:', err);
    }
  } finally {
    process.exit();
  }
}

fixSchema();
