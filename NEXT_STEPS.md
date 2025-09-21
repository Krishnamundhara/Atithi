# Next Steps for Atithi Guardian Protocol

This document outlines the next steps for the Atithi Guardian Protocol project after fixing the server deployment.

## Current Status

- ✅ Frontend fully functional and deployed to Netlify
- ✅ Simplified in-memory API deployed as a fallback (no database persistence)
- ⚠️ Database integration implemented but not fully functional on Netlify

## Next Steps

### 1. Verify Current Deployment

- ✅ Confirm the API is working with the simplified fallback
- ✅ Test the admin login functionality (username: `admin`, password: `admin123`)
- ✅ Test the registration flow and QR code generation

### 2. Database Integration

- Create necessary database tables:
  ```sql
  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    id_hash TEXT NOT NULL,
    days INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
  );
  ```
- Initialize the admin account in the database:
  ```sql
  INSERT INTO admins (id, username, password_hash)
  VALUES ('admin1', 'admin', '$2b$10$3IMpgOD.U5NfR6ZhdxhLdebODDJLvzW1gaADnF01oxv565LyJCP8C')
  ON CONFLICT (username) DO NOTHING;
  ```

### 3. Re-enable Database API

Once the database is properly set up and tested:

1. Modify `netlify/functions/api.js` to use the database-enabled API:
   ```javascript
   // Change this line
   const USE_SIMPLIFIED_API = false;
   ```

2. Test the database connection using the `test-netlify-function.js` script:
   ```bash
   npm run test:function
   ```

### 4. Additional Enhancements

- Add proper error handling for database connection issues
- Implement data migration from JSON to database
- Add pagination for large registration lists
- Improve search functionality in the admin dashboard
- Implement backup and restore functionality for registrations

### 5. Future Features

- Multiple admin users with different permission levels
- Email notifications for registrations
- Analytics dashboard for visitor statistics
- Export functionality for registration data
- Multiple language support

## Troubleshooting

If you encounter issues with the database connection:

1. Verify the database environment variables are properly set in the Netlify dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`

2. Check the Netlify function logs for detailed error messages

3. Use the API test page (`/api-test.html`) to diagnose specific endpoints

4. If needed, temporarily revert to the simplified API by setting `USE_SIMPLIFIED_API = true`