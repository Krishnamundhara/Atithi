# Atithi — The Guardian Protocol (Tourist Registration)

A full-stack application for tourist registration and management with QR code generation, privacy features, and admin capabilities.

## Features

- Tourist information registration form with:
  - Full Name
  - Passport/Visa Number (securely hashed)
  - Trip Duration (in days)
- QR code generation for tourist identification
- History view to see previous registrations
- Admin dashboard for viewing all registrations
- Responsive design for mobile and desktop

## Technology Stack

- **Frontend**: React.js, Vite
- **Backend**: Node.js with Express, Netlify Functions
- **Deployment**: Netlify
- **Authentication**: JWT for admin
- **Security**: bcrypt for password hashing, crypto-js for data encryption

## Run locally (Windows PowerShell)

```powershell
cd "c:\\Users\\krish\\OneDrive\\Desktop\\new\\SIH\\qr"
npm install
npm run dev:full  # Runs both frontend and backend
```

Or use the Netlify development environment:
```powershell
npm run netlify:dev
```

Then open the printed local URL (usually http://localhost:5173) in your browser.

## Build for production

```powershell
cd "c:\\Users\\krish\\OneDrive\\Desktop\\new\\SIH\\qr"
npm run build
```

For deployment to Netlify, see the [DEPLOY.md](./DEPLOY.md) file.

## Notes
- QR content schema: `{ schema: 'atithi.v1', name, id, days, issuedAt, expiresAt }`.
- You can print the QR directly using the Print button; the page has print styles for a clean output.
- To reset and edit details, click Back.
- Admin login is available at the bottom of the page (default: admin/admin123)

## Security & Privacy
- Passport/ID numbers are hashed before storage
- JWT authentication for admin access
- Admin passwords are securely hashed with bcrypt
- Sensitive configuration uses environment variables

## Deployment
For complete deployment instructions, see:
- [NETLIFY.md](./NETLIFY.md) - Netlify configuration details
- [DEPLOY.md](./DEPLOY.md) - Step-by-step deployment guide