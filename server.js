const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { authenticateAdmin, verifyToken, isAdmin, createAdmin } = require('./auth');

const app = express();
const PORT = process.env.PORT || 5000;
const dataFilePath = path.join(__dirname, 'data.json');

// Ensure data file exists
if (!fs.existsSync(dataFilePath)) {
  fs.writeFileSync(dataFilePath, JSON.stringify({ registrations: [] }), 'utf8');
}

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Helper function to read data from file
function readData() {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { registrations: [] };
  }
}

// Helper function to write data to file
function writeData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing to data file:', error);
    return false;
  }
}

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

// Admin registration (disabled in production)
app.post('/api/admin/register', async (req, res) => {
  const { username, password, adminKey } = req.body;
  
  // Security check - require admin key
  if (adminKey !== 'atithi-admin-secret-key') {
    return res.status(401).json({ error: 'Invalid admin registration key' });
  }
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    const result = await createAdmin(username, password);
    
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    
    res.status(201).json({ success: true, admin: result.admin });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
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
  const id = req.params.id;
  
  const registration = data.registrations.find(reg => reg.id === id);
  
  if (!registration) {
    return res.status(404).json({ error: 'Registration not found' });
  }
  
  res.json(registration);
});

// Get filtered registrations for regular users (only returns user's own registration by ID hash)
app.get('/api/registrations', (req, res) => {
  const { idHash } = req.query;
  
  // If no ID hash provided, return empty array for security
  if (!idHash) {
    return res.json([]);
  }
  
  const data = readData();
  // Filter to only return registrations matching this ID hash
  const userRegistrations = data.registrations.filter(reg => reg.idHash === idHash);
  
  res.json(userRegistrations);
});

// Add a new registration
app.post('/api/registrations', (req, res) => {
  const data = readData();
  const newRegistration = req.body;
  
  // Add ID if not present
  if (!newRegistration.id) {
    newRegistration.id = Date.now().toString();
  }
  
  data.registrations.push(newRegistration);
  
  if (writeData(data)) {
    res.status(201).json(newRegistration);
  } else {
    res.status(500).json({ error: 'Failed to save registration' });
  }
});

// Clear all registrations (admin only)
app.delete('/api/admin/registrations', verifyToken, isAdmin, (req, res) => {
  const data = readData();
  data.registrations = [];
  
  if (writeData(data)) {
    res.json({ message: 'All registrations cleared' });
  } else {
    res.status(500).json({ error: 'Failed to clear registrations' });
  }
});

// Delete a specific registration (admin only)
app.delete('/api/admin/registrations/:id', verifyToken, isAdmin, (req, res) => {
  const data = readData();
  const id = req.params.id;
  
  data.registrations = data.registrations.filter(reg => reg.id !== id);
  
  if (writeData(data)) {
    res.json({ message: 'Registration deleted', id });
  } else {
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

// Serve the React app for any other route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});