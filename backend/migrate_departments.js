require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  console.log('⏳ Running database migration to add departments table...');

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

    // 1. Create table `departments` if not exists
    console.log('⏳ Creating "departments" table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✓ Table "departments" created or already exists.');

    // 2. Seed initial departments
    console.log('⏳ Seeding initial departments...');
    const defaultDepartments = [
      'ทั่วไป',
      'OPD (แผนกผู้ป่วยนอก)',
      'IPD (แผนกผู้ป่วยใน)',
      'ห้องอุบัติเหตุและฉุกเฉิน (ER)',
      'ทันตกรรม (Dental)',
      'เภสัชกรรม (Pharmacy)',
      'ศูนย์คอมพิวเตอร์'
    ];

    for (const name of defaultDepartments) {
      try {
        await connection.query(
          'INSERT INTO departments (name) VALUES (?) ON DUPLICATE KEY UPDATE name = name',
          [name]
        );
        console.log(`  + Seeded department: "${name}"`);
      } catch (err) {
        console.error(`  - Failed to seed department: "${name}"`, err.message);
      }
    }

    console.log('✓ Seeding complete!');

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
