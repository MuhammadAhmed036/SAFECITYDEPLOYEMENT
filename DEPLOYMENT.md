# Vercel Deployment Guide

This guide will help you deploy your Safe City application to Vercel with PostgreSQL database integration.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **PostgreSQL Database**: You'll need a cloud PostgreSQL instance (recommended providers below)
3. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)

## Database Setup

### Recommended PostgreSQL Providers:

1. **Vercel Postgres** (Recommended)
   - Native integration with Vercel
   - Easy setup and management
   - Automatic connection pooling

2. **Neon** (Free tier available)
   - Serverless PostgreSQL
   - Good for development and small projects

3. **Railway**
   - Simple setup
   - Good free tier

4. **Supabase**
   - PostgreSQL with additional features
   - Good free tier

### Setting up Vercel Postgres:

1. Go to your Vercel dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" → "Postgres"
4. Choose your region and create the database
5. Note down the connection details

## Environment Variables

### Required Environment Variables:

```bash
# Database Configuration
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-postgres-user
DB_PASSWORD=your-postgres-password

# API Configuration
NEXT_PUBLIC_API_BASE=https://your-api-domain.com
```

### Setting Environment Variables in Vercel:

1. Go to your project in Vercel dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add each variable with appropriate values:
   - `DB_HOST`: Your PostgreSQL host
   - `DB_PORT`: Usually 5432
   - `DB_NAME`: Your database name
   - `DB_USER`: Your database username
   - `DB_PASSWORD`: Your database password
   - `NEXT_PUBLIC_API_BASE`: Your API base URL

## Deployment Steps

### 1. Prepare Your Repository

```bash
# Make sure all files are committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (if your Next.js app is in the root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3. Configure Environment Variables

In the Vercel deployment interface:
1. Add all the environment variables listed above
2. Make sure to set the correct values for your PostgreSQL database

### 4. Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be available at the provided Vercel URL

## Database Initialization

### Option 1: Manual Setup

Connect to your PostgreSQL database and run the initialization script:

```sql
-- Create endpoints table
CREATE TABLE IF NOT EXISTS endpoints (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  url TEXT NOT NULL,
  method VARCHAR(10) DEFAULT 'GET',
  description TEXT,
  category VARCHAR(100) DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Option 2: Use the Setup Script

Create a `.env.local` file with your production database credentials and run:

```bash
npm run setup-postgres
```

## Post-Deployment Configuration

### 1. Update API Endpoints

Update your `NEXT_PUBLIC_API_BASE` environment variable to point to your production API endpoints.

### 2. Test Database Connection

Visit your deployed app and check:
- Database connectivity
- API endpoints functionality
- Settings panel (if applicable)

### 3. Configure Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Troubleshooting

### Common Issues:

1. **Database Connection Errors**
   - Verify environment variables are set correctly
   - Check database host and credentials
   - Ensure database is accessible from Vercel's IP ranges

2. **Build Failures**
   - Check build logs in Vercel dashboard
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

3. **API Route Issues**
   - Check function logs in Vercel dashboard
   - Verify middleware configuration
   - Test API endpoints individually

### Debugging Steps:

1. **Check Vercel Function Logs**
   ```bash
   vercel logs [deployment-url]
   ```

2. **Test Database Connection**
   Create a simple API route to test database connectivity:
   ```javascript
   // app/api/test-db/route.js
   import { pool } from '../../../lib/db.js';
   import { NextResponse } from 'next/server';
   
   export async function GET() {
     try {
       const result = await pool.query('SELECT NOW()');
       return NextResponse.json({ success: true, time: result.rows[0] });
     } catch (error) {
       return NextResponse.json({ success: false, error: error.message });
     }
   }
   ```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to your repository
2. **Database Security**: Use strong passwords and restrict database access
3. **API Security**: Implement proper authentication for sensitive endpoints
4. **CORS**: Configure CORS properly for your domain

## Performance Optimization

1. **Database Connection Pooling**: Already configured in `lib/db.js`
2. **Function Timeout**: Configured in `vercel.json` (30 seconds)
3. **Caching**: Consider implementing caching for frequently accessed data

## Monitoring

1. **Vercel Analytics**: Enable in project settings
2. **Database Monitoring**: Use your database provider's monitoring tools
3. **Error Tracking**: Consider integrating Sentry or similar service

## Support

If you encounter issues:
1. Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
2. Review function logs in Vercel dashboard
3. Test locally with production environment variables

---

**Note**: This deployment guide assumes you're using the current project structure. Adjust paths and configurations as needed for your specific setup.