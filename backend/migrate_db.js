require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  console.log('⏳ Running database migration to add image_url to tickets table...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'itservice',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    console.log('✓ Connected to MySQL database.');

    // Check if column already exists to prevent error
    const [columns] = await connection.query('SHOW COLUMNS FROM tickets LIKE "image_url"');
    if (columns.length > 0) {
      console.log('✓ Column "image_url" already exists in tickets table. No migration needed.');
    } else {
      console.log('⏳ Adding "image_url" column to tickets table...');
      await connection.query('ALTER TABLE tickets ADD COLUMN image_url VARCHAR(500) NULL AFTER description');
      console.log('✓ Successfully added "image_url" column to tickets table!');
    }
  } catch (err) {
    console.error('✗ Migration failed:');
    console.error(err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🏁 MySQL Connection closed.');
    }
  }
}

run();
