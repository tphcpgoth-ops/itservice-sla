require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('⏳ Starting dynamic database initialization via Node.js...');
  
  const sqlPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('✗ schema.sql not found at: ' + sqlPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // We first connect without database to create it if not exists
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '3306'),
      multipleStatements: true
    });
    console.log('✓ Connected to MySQL server.');
  } catch (err) {
    console.error('✗ Failed to connect to MySQL server. Please make sure MySQL is running.');
    console.error(err.message);
    process.exit(1);
  }

  // Split sql by semi-colon while ignoring comments and blank lines
  // A simple split might work, but multipleStatements: true allows us to run the whole schema.sql in one go!
  try {
    console.log('⏳ Importing database tables and mock seed data...');
    // We execute the whole file as a single call! Programmatic magic.
    await connection.query(sqlContent);
    console.log('✓ Successfully created database "itservice" and loaded all schema/mock data!');
  } catch (err) {
    console.error('✗ Failed to execute schema.sql statements:');
    console.error(err.message);
  } finally {
    await connection.end();
    console.log('🏁 MySQL Connection closed.');
  }
}

run();
