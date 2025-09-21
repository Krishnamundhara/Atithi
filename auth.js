const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, 'data.json');
const JWT_SECRET = 'atithi-guardian-secure-jwt-secret-key';
const TOKEN_EXPIRY = '24h';

// Read data from the JSON file
function readData() {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { registrations: [], admins: [] };
  }
}

// Write data to the JSON file
function writeData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing to data file:', error);
    return false;
  }
}

// Authenticate admin
async function authenticateAdmin(username, password) {
  const data = readData();
  
  if (!data.admins) {
    console.log("No admins array found in data");
    return null;
  }
  
  const admin = data.admins.find(a => a.username === username);
  
  if (!admin) {
    console.log(`Admin not found with username: ${username}`);
    return null;
  }
  
  console.log(`Found admin with username: ${username}, verifying password...`);
  
  // Verify password
  try {
    const isPasswordValid = bcrypt.compareSync(password, admin.passwordHash);
    console.log(`Password verification result: ${isPasswordValid ? 'SUCCESS' : 'FAILED'}`);
    
    if (!isPasswordValid) {
      return null;
    }
  } catch (err) {
    console.error("Password verification error:", err);
    return null;
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { id: admin.id, username: admin.username, isAdmin: true },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
  
  return { admin: { id: admin.id, username: admin.username }, token };
}

// Verify JWT token middleware
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

// Middleware to check if user is admin
function isAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
}

// Create a new admin account
async function createAdmin(username, password) {
  // Hash password
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  
  const data = readData();
  
  if (!data.admins) {
    data.admins = [];
  }
  
  // Check if admin already exists
  const existingAdmin = data.admins.find(a => a.username === username);
  if (existingAdmin) {
    return { error: 'Admin with this username already exists' };
  }
  
  const newAdmin = {
    id: `admin_${Date.now()}`,
    username,
    passwordHash
  };
  
  data.admins.push(newAdmin);
  
  if (writeData(data)) {
    return { success: true, admin: { id: newAdmin.id, username: newAdmin.username } };
  } else {
    return { error: 'Failed to create admin account' };
  }
}

module.exports = {
  authenticateAdmin,
  verifyToken,
  isAdmin,
  createAdmin
};