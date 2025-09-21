// Initialize database script for Netlify Neon PostgreSQL
require('dotenv').config();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for some PostgreSQL services
  }
});

// Initialize database tables
async function initializeDatabase() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected successfully!');
    
    // Create admins table
    console.log('Creating admins table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Admins table created or already exists.');
    
    // Create registrations table
    console.log('Creating registrations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        id_hash TEXT NOT NULL,
        days INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NOT NULL
      )
    `);
    console.log('Registrations table created or already exists.');
    
    // Check if admin exists, if not create default admin
    console.log('Checking for admin user...');
    const adminCheck = await client.query('SELECT COUNT(*) FROM admins');
    if (parseInt(adminCheck.rows[0].count) === 0) {
      // Default password: admin123
      const passwordHash = '$2b$10$3IMpgOD.U5NfR6ZhdxhLdebODDJLvzW1gaADnF01oxv565LyJCP8C';
      console.log('Creating default admin user...');
      await client.query(
        'INSERT INTO admins (id, username, password_hash) VALUES ($1, $2, $3)',
        ['admin1', 'admin', passwordHash]
      );
      console.log('Default admin created.');
    } else {
      console.log('Admin user already exists.');
    }
    
    // Count registrations
    const regCount = await client.query('SELECT COUNT(*) FROM registrations');
    console.log(`Current registration count: ${regCount.rows[0].count}`);
    
    client.release();
    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run initialization
initializeDatabase().catch(console.error);