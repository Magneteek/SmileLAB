# Production Deployment Checklist

## ✅ Completed Changes

### 1. User Accounts Updated
- ✅ Changed admin email: `admin@smilelab.si` → `info@dentro.si`
- ✅ Changed technician email: `tech@smilelab.si` → `3d@dentro.si`
- ✅ Set secure passwords (12 characters with bcrypt)
- ✅ Removed QC and Invoicing test users

### 2. Security Improvements
- ✅ Removed Quick Login (test accounts) from login page
- ✅ Increased password hash rounds from 10 to 12

---

## 🚀 Deployment Steps

### Step 1: Update Database
```bash
# Reset database with production users
npx prisma migrate reset --force

# This will:
# - Drop all tables
# - Re-run migrations
# - Run seed script with new production users
```

### Step 2: Production Login Credentials
**Admin Account:**
- Email: `info@dentro.si`
- Password: `DentroAdmin2025!`

**Technician Account:**
- Email: `3d@dentro.si`
- Password: `Dentro3D2025!`

⚠️ **CRITICAL**: Change these passwords immediately after first login!

### Step 3: Environment Variables (Production)
Create `.env.production` file:

```env
# Database (Production PostgreSQL)
DATABASE_URL="postgresql://user:password@production-host:5432/smilelab_production"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="generate-a-secure-random-secret-here"

# Email (Production SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-production-email@dentro.si"
SMTP_PASS="your-app-specific-password"

# Node Environment
NODE_ENV="production"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 4: Update Laboratory Configuration
Login as admin and go to Settings to update:
- ✅ Laboratory name, address, contact info
- ✅ Tax ID, registration numbers
- ✅ Bank account details
- ✅ Responsible person information

### Step 5: Security Checklist

#### Database Security
- [ ] Production database has strong password
- [ ] Database is not publicly accessible
- [ ] SSL/TLS enabled for database connections
- [ ] Regular automated backups configured

#### Application Security
- [ ] NEXTAUTH_SECRET is strong and unique
- [ ] All environment variables are secure
- [ ] HTTPS/SSL certificate installed
- [ ] CORS configured properly
- [ ] Rate limiting enabled (optional)

#### User Management
- [ ] Default passwords changed
- [ ] User email addresses verified
- [ ] Only necessary user accounts created
- [ ] Admin account secured

### Step 6: Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Step 7: Post-Deployment Testing
- [ ] Login works with production credentials
- [ ] Dashboard loads correctly
- [ ] Orders can be created
- [ ] Worksheets can be created with FDI teeth selector
- [ ] Material LOT tracking works
- [ ] Quality control workflow functions
- [ ] Invoice generation works
- [ ] Email sending works
- [ ] PDF generation (Annex XIII) works
- [ ] Audit logs are being created

---

## 📋 Additional Production Recommendations

### 1. Monitoring
- [ ] Set up application monitoring (e.g., Sentry, LogRocket)
- [ ] Configure error logging
- [ ] Set up uptime monitoring
- [ ] Database performance monitoring

### 2. Backups
- [ ] Daily database backups
- [ ] Backup retention policy (at least 30 days)
- [ ] Test backup restoration process
- [ ] Document storage backups (Annex XIII PDFs)

### 3. Performance
- [ ] Enable Redis for session storage (optional)
- [ ] Configure CDN for static assets (optional)
- [ ] Database query optimization
- [ ] Enable Next.js image optimization

### 4. Compliance (EU MDR)
- [ ] Verify 10-year document retention is working
- [ ] Audit logs are immutable
- [ ] Material traceability is complete
- [ ] Annex XIII generation includes all required fields

### 5. User Documentation
- [ ] Create user manual for technicians
- [ ] Document workflow procedures
- [ ] Create troubleshooting guide
- [ ] Training for staff

---

## 🔐 Password Change Process

### For Admin (info@dentro.si):
1. Login with initial password: `DentroAdmin2025!`
2. Go to Settings → User Management (or Profile)
3. Change password to a secure password
4. Use password manager to store new password

### For Technician (3d@dentro.si):
1. Login with initial password: `Dentro3D2025!`
2. Go to Settings → Profile
3. Change password
4. Use password manager

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Test database connection
npx prisma db execute --stdin <<< "SELECT 1;"
```

### Email Not Sending
- Check SMTP credentials
- Verify app-specific password (if using Gmail)
- Check firewall rules for port 587

### Login Issues
- Verify database has correct user records
- Check NEXTAUTH_URL matches your domain
- Verify NEXTAUTH_SECRET is set

### PDF Generation Fails
- Ensure Puppeteer dependencies are installed
- Check Chrome/Chromium is available
- Verify sufficient disk space

---

## 📞 Support

If you encounter issues during deployment, check:
1. Browser console for client-side errors
2. Server logs for backend errors
3. Database logs for query issues
4. Email logs for SMTP issues

---

**Last Updated**: 2025-01-05
**Application Version**: 1.0.0
**Database Schema Version**: Latest
