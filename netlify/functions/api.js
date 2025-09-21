const express = require('express');
const serverless = require('serverless-http');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Setup Express app
const app = express();
const router = express.Router();

// In-memory data (for Netlify functions)
let inMemoryData = {
  registrations: [],
  admins: [
    {
      id: 'admin1',
      username: 'admin',
      // Default password: admin123
      passwordHash: '$2b$10$3IMpgOD.U5NfR6ZhdxhLdebODDJLvzW1gaADnF01oxv565LyJCP8C'
    }
  ]
};

// Try to load initial data from JSON file for local development
try {
  if (process.env.NODE_ENV !== 'production') {
    const dataFilePath = path.join(__dirname, '../../data.json');
    if (fs.existsSync(dataFilePath)) {
      const fileData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
      inMemoryData = fileData;
    }
  }
} catch (error) {
  console.error('Error loading initial data:', error);
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'atithi-guardian-secure-jwt-secret-key';
const TOKEN_EXPIRY = '24h';

// Middleware
app.use(cors());
app.use(express.json());

// Authentication functions
function authenticateAdmin(username, password) {
  console.log(`Authenticating admin: ${username}`);
  console.log(`JWT_SECRET is ${JWT_SECRET ? 'set' : 'NOT SET'}`);
  console.log(`Admin accounts in system: ${inMemoryData.admins.length}`);
  console.log(`First admin username: ${inMemoryData.admins[0]?.username}`);
  
  const admin = inMemoryData.admins.find(a => a.username === username);
  
  if (!admin) {
    console.log(`Admin not found with username: ${username}`);
    return null;
  }
  
  try {
    console.log(`Admin found: ${admin.username}, checking password...`);
    console.log(`Stored password hash: ${admin.passwordHash.substring(0, 10)}...`);
    
    // For testing in Netlify, allow default admin login
    // Remove this in real production
    if (username === 'admin' && password === 'admin123') {
      console.log('Default admin credentials accepted');
      const token = jwt.sign(
        { id: admin.id, username: admin.username, isAdmin: true },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );
      return { admin: { id: admin.id, username: admin.username }, token };
    }
    
    const isPasswordValid = bcrypt.compareSync(password, admin.passwordHash);
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
    console.error("Password verification error:", err);
    console.error(err.stack);
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
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    functionName: 'api',
    registrationsCount: inMemoryData.registrations.length
  });
});

// Admin login
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    console.log(`Login attempt for username: ${username}`);
    
    if (!inMemoryData.admins || inMemoryData.admins.length === 0) {
      console.error('No admin accounts configured');
      return res.status(500).json({ error: 'No admin accounts configured' });
    }
    
    const adminExists = inMemoryData.admins.some(a => a.username === username);
    if (!adminExists) {
      console.log(`Admin username not found: ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const result = authenticateAdmin(username, password);
    
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
router.get('/admin/registrations', verifyToken, isAdmin, (req, res) => {
  res.json(inMemoryData.registrations);
});

// Get registrations by ID hash (for user verification)
router.get('/registrations', (req, res) => {
  const { idHash } = req.query;
  
  if (idHash) {
    const userRegistrations = inMemoryData.registrations.filter(r => r.idHash === idHash);
    return res.json(userRegistrations);
  }
  
  res.json([]);
});

// Create new registration
router.post('/registrations', (req, res) => {
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
  
  // Add to in-memory data
  inMemoryData.registrations.push(registration);
  
  try {
    // For local development, also save to file if possible
    if (process.env.NODE_ENV !== 'production') {
      const dataFilePath = path.join(__dirname, '../../data.json');
      fs.writeFileSync(dataFilePath, JSON.stringify(inMemoryData, null, 2));
    }
    
    // Return success
    res.status(201).json({ 
      success: true,
      registration,
      stored: process.env.NODE_ENV === 'production' ? 'cloud' : 'file' 
    });
  } catch (error) {
    console.error('Error saving registration:', error);
    
    // Even if file save fails, we still have it in memory, so return success
    res.status(201).json({ 
      success: true,
      registration,
      stored: 'memory',
      warning: 'Data saved in memory only. May be lost on server restart.'
    });
  }
});

// Delete registration by ID (admin only)
router.delete('/admin/registrations/:id', verifyToken, isAdmin, (req, res) => {
  const registrationIndex = inMemoryData.registrations.findIndex(r => r.id === req.params.id);
  
  if (registrationIndex === -1) {
    return res.status(404).json({ error: 'Registration not found' });
  }
  
  inMemoryData.registrations.splice(registrationIndex, 1);
  res.json({ success: true });
});

// Delete all registrations (admin only)
router.delete('/admin/registrations', verifyToken, isAdmin, (req, res) => {
  inMemoryData.registrations = [];
  res.json({ success: true });
});

// Test endpoint for connection checking
router.get('/test', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'Server is running', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    registrationsCount: inMemoryData.registrations.length,
    adminsConfigured: inMemoryData.admins.length,
    defaultAdminExists: inMemoryData.admins.some(a => a.username === 'admin'),
    apiMode: 'netlify-function',
    jwtSecretConfigured: !!process.env.JWT_SECRET
  });
});

// Setup API endpoint
app.use('/.netlify/functions/api', router);

// Export the serverless function
module.exports.handler = serverless(app);