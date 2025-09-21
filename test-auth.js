const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Read the data.json file
const dataFilePath = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

// Check if admins exist
if (!data.admins || data.admins.length === 0) {
  console.log('No admin accounts found in data.json');
  process.exit(1);
}

// Get the admin user
const admin = data.admins[0];
console.log(`Found admin: ${admin.username}, Hash: ${admin.passwordHash.substring(0, 10)}...`);

// Create a new admin with password 'admin123'
const salt = bcrypt.genSaltSync(10);
const newPasswordHash = bcrypt.hashSync('admin123', salt);

// Update the admin password
data.admins[0].passwordHash = newPasswordHash;

// Write back to data.json
fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
console.log('Updated admin password to "admin123"');

// Verify the password works
const isPasswordValid = bcrypt.compareSync('admin123', newPasswordHash);
console.log(`Password verification test: ${isPasswordValid ? 'PASSED' : 'FAILED'}`);