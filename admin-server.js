// This file updates the server configuration and fixes the admin login issue
try {
  require('dotenv').config();
} catch (err) {
  console.log('No .env file found, continuing without it');
}
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const dataFilePath = path.join(__dirname, 'data.json');
const JWT_SECRET = 'atithi-guardian-secure-jwt-secret-key';

// Middleware for CORS and JSON parsing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

// Helper function to read data
function readData() {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { registrations: [], admins: [] };
  }
}

// Helper function to write data
function writeData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
}

// Test endpoint to verify server is running
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running correctly' });
});

// Simple direct admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt: username=${username}`);
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  const data = readData();
  if (!data.admins || !Array.isArray(data.admins) || data.admins.length === 0) {
    console.log('No admin accounts found in data.json');
    return res.status(500).json({ error: 'No admin accounts configured' });
  }
  
  const admin = data.admins.find(a => a.username === username);
  if (!admin) {
    console.log(`Admin username not found: ${username}`);
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  
  try {
    const passwordValid = bcrypt.compareSync(password, admin.passwordHash);
    console.log(`Password validation result: ${passwordValid ? 'Success' : 'Failed'}`);
    
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username, isAdmin: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Login successful, token generated');
    return res.json({ 
      token,
      admin: { id: admin.id, username: admin.username }
    });
    
  } catch (error) {
    console.error('Password verification error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
});

// Create a test admin account
app.get('/api/setup', (req, res) => {
  try {
    const data = readData();
    
    // Create admin if it doesn't exist
    if (!data.admins) {
      data.admins = [];
    }
    
    // Replace any existing admin
    data.admins = [{
      id: 'admin1',
      username: 'admin',
      passwordHash: bcrypt.hashSync('admin123', 10)
    }];
    
    writeData(data);
    
    res.json({ 
      message: 'Admin account created successfully', 
      credentials: { username: 'admin', password: 'admin123' }
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Failed to setup admin account' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test API at http://localhost:${PORT}/api/test`);
  console.log(`Setup admin account at http://localhost:${PORT}/api/setup`);
});