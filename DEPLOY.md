# Tourist QR App - Netlify Deployment Guide

## Prerequisites
- Node.js 18+ installed
- Git installed
- GitHub account
- Netlify account

## Local Setup

1. Clone the repository:
```bash
git clone <your-repository-url>
cd qr
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional for local development):
```
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

4. Start the development server:
```bash
# Run frontend and backend together
npm run dev:full

# Or run Netlify development environment
npm run netlify:dev
```

## Deploying to Netlify

### Option 1: Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Install Netlify CLI if not installed:
```bash
npm install -g netlify-cli
```

3. Login to Netlify:
```bash
netlify login
```

4. Deploy to Netlify:
```bash
netlify deploy
```

5. For production deployment:
```bash
netlify deploy --prod
```

### Option 2: Continuous Deployment with GitHub

1. Push your code to GitHub:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. In the Netlify dashboard:
   - Click "New site from Git"
   - Choose GitHub and select your repository
   - Configure build settings:
     - Build command: `npm run netlify:build`
     - Publish directory: `dist`
   - Add environment variables in the Netlify dashboard:
     - `JWT_SECRET`: Your JWT secret key
     - `NODE_ENV`: Set to 'production'
   - Click "Deploy site"

3. After the initial setup, all pushes to your main branch will automatically deploy.

## GitHub Actions (Optional)

We've included a GitHub Actions workflow file at `.github/workflows/netlify-deploy.yml`. To use it:

1. In your Netlify account:
   - Get your Netlify Site ID from Site settings > General > Site details
   - Generate a Personal Access Token from User settings > Applications

2. In your GitHub repository:
   - Go to Settings > Secrets and variables > Actions
   - Add two secrets:
     - `NETLIFY_SITE_ID`: Your site ID from step 1
     - `NETLIFY_AUTH_TOKEN`: Your personal access token from step 1

3. Now pushes to your main branch will trigger automatic deployment through GitHub Actions.

## Testing the Deployment

Once deployed, your application will be available at:
- Frontend: `https://your-netlify-app-name.netlify.app/`
- API: `https://your-netlify-app-name.netlify.app/.netlify/functions/api/`

## Troubleshooting

- If your API routes aren't working, check:
  - Your netlify.toml file has the correct redirects
  - The serverless function is exported properly
  - Environment variables are set in Netlify

- For local debugging of Netlify functions:
  ```bash
  node test-netlify-function.js
  ```