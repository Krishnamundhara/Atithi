@echo off
REM Production deployment script for Windows

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed.
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm is not installed.
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
call npm ci

REM Build the React app
echo Building React app...
call npm run build

REM Copy production files
echo Copying production files...
copy auth.prod.js auth.js

REM Create data directory if it doesn't exist
if not exist data mkdir data

REM Check if data.json exists, if not create it
if not exist data\data.json (
    echo Creating data.json...
    echo {^
    "registrations": [],^
    "admins": [^
        {^
            "id": "admin1",^
            "username": "admin",^
            "passwordHash": "$2b$10$3IMpgOD.U5NfR6ZhdxhLdebODDJLvzW1gaADnF01oxv565LyJCP8C"^
        }^
    ]^
} > data\data.json
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file...
    echo NODE_ENV=production^
PORT=5000^
JWT_SECRET=atithi-guardian-secure-jwt-secret-key-production^
DATA_FILE_PATH=./data/data.json^
CORS_ORIGIN=* > .env
)

REM Start the server
echo Starting production server...
node production-server.js