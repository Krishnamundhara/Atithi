# This script runs during build to copy data.json to multiple directories for access

# Create necessary directories if they don't exist
mkdir -p netlify/functions/data
mkdir -p dist

# Copy data.json to multiple directories for redundancy
cp data.json netlify/functions/data/
cp data.json netlify/
cp data.json dist/

# Print success message
echo "Copied data.json to multiple directories for function access"
ls -la netlify/functions/data/
ls -la netlify/
ls -la dist/ | grep data.json