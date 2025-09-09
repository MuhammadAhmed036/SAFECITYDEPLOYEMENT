# Vercel Deployment Checklist

## Pre-Deployment Checklist

### ✅ Database Setup
- [ ] PostgreSQL database created (Vercel Postgres, Neon, Railway, or Supabase)
- [ ] Database connection details obtained
- [ ] Database tables initialized (run `npm run setup-postgres` with production credentials)
- [ ] Test database connection (run `npm run test-db`)

### ✅ Environment Variables
- [ ] `.env.local` created for local development (use `.env.example` as template)
- [ ] All required environment variables identified:
  - [ ] `DB_HOST`
  - [ ] `DB_PORT`
  - [ ] `DB_NAME`
  - [ ] `DB_USER`
  - [ ] `DB_PASSWORD`
  - [ ] `NEXT_PUBLIC_API_BASE`

### ✅ Code Preparation
- [ ] All changes committed to Git
- [ ] Repository pushed to GitHub/GitLab/Bitbucket
- [ ] Build works locally (`npm run build`)
- [ ] No sensitive data in code (passwords, API keys)

### ✅ Vercel Configuration
- [ ] `vercel.json` file created
- [ ] `middleware.js` file created for CORS handling
- [ ] Project settings configured correctly

## Deployment Steps

### 1. Create Vercel Project
- [ ] Go to [vercel.com/new](https://vercel.com/new)
- [ ] Import your Git repository
- [ ] Select Next.js framework preset

### 2. Configure Environment Variables in Vercel
- [ ] Add `DB_HOST`
- [ ] Add `DB_PORT`
- [ ] Add `DB_NAME`
- [ ] Add `DB_USER`
- [ ] Add `DB_PASSWORD`
- [ ] Add `NEXT_PUBLIC_API_BASE`

### 3. Deploy
- [ ] Click "Deploy" button
- [ ] Wait for build to complete
- [ ] Check deployment logs for errors

## Post-Deployment Verification

### ✅ Basic Functionality
- [ ] Website loads without errors
- [ ] Database connection works
- [ ] API endpoints respond correctly
- [ ] Settings panel loads (if applicable)

### ✅ Pages Testing
- [ ] Dashboard page works
- [ ] Live View page works
- [ ] Streams page works
- [ ] Zone management works

### ✅ API Testing
- [ ] `/api/endpoints` returns data
- [ ] `/api/events` works (if applicable)
- [ ] `/api/streams` works (if applicable)
- [ ] Database operations (CRUD) work

## Troubleshooting

### If Build Fails:
- [ ] Check build logs in Vercel dashboard
- [ ] Verify all dependencies in `package.json`
- [ ] Test build locally: `npm run build`
- [ ] Check Node.js version compatibility

### If Database Connection Fails:
- [ ] Verify environment variables in Vercel
- [ ] Check database host accessibility
- [ ] Test connection with database client
- [ ] Check database user permissions

### If API Routes Don't Work:
- [ ] Check function logs in Vercel dashboard
- [ ] Verify middleware configuration
- [ ] Test API routes individually
- [ ] Check CORS settings

## Performance Optimization (Optional)

- [ ] Enable Vercel Analytics
- [ ] Configure caching headers
- [ ] Optimize images and assets
- [ ] Monitor function execution times

## Security Review (Optional)

- [ ] Review environment variable security
- [ ] Check database access restrictions
- [ ] Verify CORS configuration
- [ ] Review API endpoint security

---

**Deployment Complete!** 🎉

Your Safe City application should now be live on Vercel. Don't forget to:
- Share the deployment URL
- Set up monitoring
- Plan for regular backups
- Document any custom configurations