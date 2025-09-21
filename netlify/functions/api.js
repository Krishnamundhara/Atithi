const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Import the simplified version to ensure we have working API
const simplifiedHandler = require('./api-simplified').handler;

// Setup Express app
const app = express();
const router = express.Router();

// Fallback to simplified API if database connection fails
const USE_SIMPLIFIED_API = true; // Set to true until database is properly configured

// Middleware
app.use(cors());
app.use(express.json());

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'atithi-guardian-secure-jwt-secret-key';
const TOKEN_EXPIRY = '24h';

// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    
    // Create admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create registrations table
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
    
    // Check if admin exists, if not create default admin
    const adminCheck = await client.query('SELECT COUNT(*) FROM admins');
    if (parseInt(adminCheck.rows[0].count) === 0) {
      // Default password: admin123
      const passwordHash = '$2b$10$3IMpgOD.U5NfR6ZhdxhLdebODDJLvzW1gaADnF01oxv565LyJCP8C';
      await client.query(
        'INSERT INTO admins (id, username, password_hash) VALUES ($1, $2, $3)',
        ['admin1', 'admin', passwordHash]
      );
      console.log('Default admin created');
    }
    
    client.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize database on cold start
initializeDatabase().catch(console.error);

// Authentication functions
async function authenticateAdmin(username, password) {
  console.log(`Authenticating admin: ${username}`);
  
  try {
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      console.log(`Admin not found with username: ${username}`);
      return null;
    }
    
    const admin = result.rows[0];
    console.log(`Admin found: ${admin.username}, checking password...`);
    
    // For testing in Netlify, allow default admin login
    if (username === 'admin' && password === 'admin123') {
      console.log('Default admin credentials accepted');
      const token = jwt.sign(
        { id: admin.id, username: admin.username, isAdmin: true },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );
      return { admin: { id: admin.id, username: admin.username }, token };
    }
    
    const isPasswordValid = bcrypt.compareSync(password, admin.password_hash);
    console.log(`Password validation result: ${isPasswordValid ? 'valid' : 'invalid'}`);
    
    if (!isPasswordValid) {
      console.log(`Invalid password for username: ${username}`);
      return null;
    }
    
    console.log('Creating JWT token...');
    const token = jwt.sign(
      { id: admin.id, username: admin.username, isAdmin: true },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    return { admin: { id: admin.id, username: admin.username }, token };
  } catch (err) {
    console.error('Authentication error:', err);
    return null;
  }
}

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function isAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
}

// API Routes

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      functionName: 'api',
      database: 'connected',
      dbTimestamp: dbResult.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: 'disconnected'
    });
  }
});

// Test endpoint for connection checking
router.get('/test', async (req, res) => {
  try {
    // Get registration count from database
    const regCount = await pool.query('SELECT COUNT(*) FROM registrations');
    const adminCount = await pool.query('SELECT COUNT(*) FROM admins');
    
    res.json({ 
      status: 'online', 
      message: 'Server is running', 
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      registrationsCount: parseInt(regCount.rows[0].count),
      adminsConfigured: parseInt(adminCount.rows[0].count),
      apiMode: 'netlify-function-with-database',
      jwtSecretConfigured: !!process.env.JWT_SECRET,
      databaseConnected: true
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection error',
      error: error.message
    });
  }
});

// Admin login
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    console.log(`Login attempt for username: ${username}`);
    
    const result = await authenticateAdmin(username, password);
    
    if (!result) {
      console.log(`Failed login attempt for username: ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    console.log(`Successful login for username: ${username}`);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to process login' });
  }
});

// Get all registrations (admin only)
router.get('/admin/registrations', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registrations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting registrations:', error);
    res.status(500).json({ error: 'Failed to retrieve registrations' });
  }
});

// Get registrations by ID hash (for user verification)
router.get('/registrations', async (req, res) => {
  const { idHash } = req.query;
  
  if (!idHash) {
    return res.json([]);
  }
  
  try {
    const result = await pool.query('SELECT * FROM registrations WHERE id_hash = $1', [idHash]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting registrations by hash:', error);
    res.status(500).json({ error: 'Failed to retrieve registrations' });
  }
});

// Create new registration
router.post('/registrations', async (req, res) => {
  const registration = req.body;
  
  if (!registration.name || !registration.idHash || !registration.days) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Ensure registration has an ID and timestamps
  if (!registration.id) {
    registration.id = Date.now().toString();
  }
  
  if (!registration.createdAt) {
    registration.createdAt = new Date().toISOString();
  }
  
  if (!registration.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(registration.days));
    registration.expiresAt = expiryDate.toISOString();
  }
  
  try {
    await pool.query(
      'INSERT INTO registrations (id, name, id_hash, days, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        registration.id, 
        registration.name, 
        registration.idHash, 
        registration.days, 
        registration.createdAt, 
        registration.expiresAt
      ]
    );
    
    res.status(201).json({ 
      success: true,
      registration,
      stored: 'database' 
    });
  } catch (error) {
    console.error('Error saving registration:', error);
    res.status(500).json({ 
      error: 'Failed to save registration',
      details: error.message
    });
  }
});

// Delete registration by ID (admin only)
router.delete('/admin/registrations/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM registrations WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Error deleting registration:', error);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

// Delete all registrations (admin only)
router.delete('/admin/registrations', verifyToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM registrations');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting all registrations:', error);
    res.status(500).json({ error: 'Failed to delete registrations' });
  }
});

// Setup API endpoint
app.use('/.netlify/functions/api', router);

// Export the serverless function - use simplified version for now
module.exports.handler = USE_SIMPLIFIED_API ? simplifiedHandler : serverless(app);