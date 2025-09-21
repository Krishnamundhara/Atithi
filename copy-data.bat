@echo off
REM This script runs during build to copy data.json to multiple directories for access

REM Create necessary directories if they don't exist
if not exist "netlify\functions\data" mkdir "netlify\functions\data"
if not exist "dist" mkdir "dist"

REM Copy data.json to multiple directories for redundancy
copy "data.json" "netlify\functions\data\"
copy "data.json" "netlify\"
copy "data.json" "dist\"

REM Print success message
echo Copied data.json to multiple directories for function access
dir "netlify\functions\data"
dir "netlify" | findstr data.json
dir "dist" | findstr data.json