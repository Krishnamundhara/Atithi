# Database Integration Guide for Atithi Guardian Protocol

This guide explains how to set up and use a Netlify database with your application.

## Step 1: Add a Database to Your Netlify Project

1. From your Netlify dashboard, click "Add database" for your site
2. Follow the Netlify wizard to create a PostgreSQL database
3. Once created, Netlify will provide you with connection details

✅ **Completed!** The Neon PostgreSQL database "wispy-fog-83740740" is now connected to your project.

## Step 2: Set Environment Variables

After database creation, add these environment variables in your Netlify dashboard:

- `DATABASE_URL`: The connection string provided by Netlify
- `JWT_SECRET`: Your secure JWT secret for authentication

## Step 3: Deploy the Database-Enabled API

This repository includes a database-ready version of the API:

1. Rename `api-with-database.js` to `api.js` in the `/netlify/functions/` folder
2. Install the PostgreSQL client: `npm install pg`
3. Push the changes to GitHub to trigger a new deployment

## Step 4: Using the Database

The database implementation:

- Creates tables for `admins` and `registrations` automatically
- Creates a default admin user if none exists
- Stores all registrations persistently
- Supports all the same API endpoints as before

## Database Schema

**Registrations Table:**
- `id`: Unique identifier
- `name`: Tourist's full name
- `id_hash`: Hashed ID number
- `days`: Trip duration
- `created_at`: Registration date
- `expires_at`: Expiration date

**Admins Table:**
- `id`: Unique identifier
- `username`: Admin username
- `password_hash`: Hashed password
- `created_at`: Account creation date

## Local Development

For local development with a database:

1. Install PostgreSQL locally
2. Create a `.env` file with your local `DATABASE_URL`
3. Run the app with `npm run dev:full`

## Troubleshooting

- Check Netlify logs if tables aren't being created
- Verify environment variables are set correctly
- Test connection with the `/test` API endpoint