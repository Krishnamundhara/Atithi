const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { authenticateAdmin, verifyToken, isAdmin } = require('./auth');

// Load environment variables
dotenv.config();

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE_PATH = process.env.DATA_FILE_PATH || path.join(__dirname, 'data.json');
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

console.log(`Starting server in ${NODE_ENV} mode`);

// Ensure data file exists
if (!fs.existsSync(DATA_FILE_PATH)) {
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify({ 
    registrations: [],
    admins: [
      {
        id: "admin1",
        username: "admin",
        passwordHash: "$2b$10$3IMpgOD.U5NfR6ZhdxhLdebODDJLvzW1gaADnF01oxv565LyJCP8C"
      }
    ] 
  }, null, 2), 'utf8');
  console.log(`Created initial data file at ${DATA_FILE_PATH}`);
}

// Security middleware
app.use((req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Remove server information
  res.setHeader('X-Powered-By', 'Atithi Guardian');
  next();
});

// CORS configuration
const corsOptions = {
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Test endpoint for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: NODE_ENV, timestamp: new Date() });
});

// Helper function to read data from file
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { registrations: [], admins: [] };
  }
}

// Helper function to write data to file
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing to data file:', error);
    return false;
  }
}

// Rate limiter for sensitive endpoints
const apiLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean up old entries
    requests.forEach((timestamp, key) => {
      if (now - timestamp > windowMs) {
        requests.delete(key);
      }
    });
    
    // Check rate limit
    if (requests.has(ip) && requests.get(ip) > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests, please try again later'
      });
    }
    
    // Increment request count
    requests.set(ip, (requests.get(ip) || 0) + 1);
    
    next();
  };
};

// Apply rate limiter to sensitive routes
app.use('/api/admin/*', apiLimiter(15 * 60 * 1000, 20)); // 20 requests per 15 minutes
app.use('/api/registrations', apiLimiter(60 * 1000, 30)); // 30 requests per minute

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    console.log(`Login attempt for username: ${username}`);
    
    // Read data directly to verify admin exists
    const data = readData();
    if (!data.admins || data.admins.length === 0) {
      console.error('No admin accounts found in data.json');
      return res.status(500).json({ error: 'No admin accounts configured' });
    }
    
    // Check if the username exists
    const adminExists = data.admins.some(a => a.username === username);
    if (!adminExists) {
      console.log(`Admin username not found: ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const result = await authenticateAdmin(username, password);
    
    if (!result) {
      console.log(`Failed login attempt for username: ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    console.log(`Successful login for username: ${username}`);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to process login: ' + error.message });
  }
});

// Get all registrations (admin only)
app.get('/api/admin/registrations', verifyToken, isAdmin, (req, res) => {
  const data = readData();
  res.json(data.registrations);
});

// Get single registration by ID or user's own registration
app.get('/api/registrations/:id', (req, res) => {
  const data = readData();
  const registration = data.registrations.find(r => r.id === req.params.id);
  
  if (!registration) {
    return res.status(404).json({ error: 'Registration not found' });
  }
  
  res.json(registration);
});

// Get registrations by ID hash (for user verification)
app.get('/api/registrations', (req, res) => {
  const { idHash } = req.query;
  const data = readData();
  
  if (idHash) {
    const userRegistrations = data.registrations.filter(r => r.idHash === idHash);
    return res.json(userRegistrations);
  }
  
  res.json([]);
});

// Create new registration
app.post('/api/registrations', (req, res) => {
  const registration = req.body;
  
  if (!registration.name || !registration.idHash || !registration.days) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const data = readData();
  
  // Ensure registration has an ID and timestamps
  if (!registration.id) {
    registration.id = Date.now().toString();
  }
  
  if (!registration.createdAt) {
    registration.createdAt = new Date().toISOString();
  }
  
  if (!registration.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + registration.days);
    registration.expiresAt = expiryDate.toISOString();
  }
  
  data.registrations.push(registration);
  
  if (writeData(data)) {
    res.status(201).json(registration);
  } else {
    res.status(500).json({ error: 'Failed to save registration' });
  }
});

// Delete registration by ID (admin only)
app.delete('/api/admin/registrations/:id', verifyToken, isAdmin, (req, res) => {
  const data = readData();
  const registrationIndex = data.registrations.findIndex(r => r.id === req.params.id);
  
  if (registrationIndex === -1) {
    return res.status(404).json({ error: 'Registration not found' });
  }
  
  data.registrations.splice(registrationIndex, 1);
  
  if (writeData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

// Delete all registrations (admin only)
app.delete('/api/admin/registrations', verifyToken, isAdmin, (req, res) => {
  const data = readData();
  data.registrations = [];
  
  if (writeData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to clear registrations' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
  console.log(`API available at http://localhost:${PORT}/api`);
});