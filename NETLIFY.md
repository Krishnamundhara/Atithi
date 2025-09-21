# Netlify Serverless Configuration

This file contains instructions on configuring and deploying your Tourist QR App on Netlify.

## Overview (Updated)

The application consists of:
1. A React frontend (built with Vite)
2. A serverless backend API (using Netlify Functions)

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Run the app locally with Netlify CLI:
   ```
   npm run netlify:dev
   ```

3. Build for production:
   ```
   npm run netlify:build
   ```

## Deployment Steps

1. Push your code to GitHub
2. Connect your GitHub repository to Netlify
3. Set the following build settings:
   - Build command: `npm run netlify:build`
   - Publish directory: `dist`

## Environment Variables

Make sure to set these in your Netlify dashboard:

- `JWT_SECRET`: Secret key for JWT token generation
- `NODE_ENV`: Set to 'production' for deployed app

## API Endpoints

All API endpoints are available at `/.netlify/functions/api/*`:

- POST `/admin/login` - Admin login
- GET `/admin/registrations` - Get all registrations (admin)
- GET `/registrations` - Get user registrations by ID hash
- POST `/registrations` - Create new registration
- DELETE `/admin/registrations/:id` - Delete registration (admin)
- DELETE `/admin/registrations` - Delete all registrations (admin)

## Local Development

For local development with hot-reloading:

```
npm run dev:full
```

This will run both the Vite development server and API server concurrently.