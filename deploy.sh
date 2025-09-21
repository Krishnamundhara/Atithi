#!/bin/bash

# Production deployment script

# Check if Node.js is installed
if ! [ -x "$(command -v node)" ]; then
  echo 'Error: Node.js is not installed.' >&2
  exit 1
fi

# Check if npm is installed
if ! [ -x "$(command -v npm)" ]; then
  echo 'Error: npm is not installed.' >&2
  exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the React app
echo "Building React app..."
npm run build

# Copy production files
echo "Copying production files..."
cp auth.prod.js auth.js

# Create data directory if it doesn't exist
mkdir -p data

# Check if data.json exists, if not create it
if [ ! -f data/data.json ]; then
  echo "Creating data.json..."
  echo '{
  "registrations": [],
  "admins": [
    {
      "id": "admin1",
      "username": "admin",
      "passwordHash": "$2b$10$3IMpgOD.U5NfR6ZhdxhLdebODDJLvzW1gaADnF01oxv565LyJCP8C"
    }
  ]
}' > data/data.json
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file..."
  echo "NODE_ENV=production
PORT=5000
JWT_SECRET=atithi-guardian-secure-jwt-secret-key-production
DATA_FILE_PATH=./data/data.json
CORS_ORIGIN=*" > .env
fi

# Start the server
echo "Starting production server..."
node production-server.js