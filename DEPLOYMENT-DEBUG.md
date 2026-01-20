# Deployment Debugging Checklist

## Issue: Changes not visible after deployment
- No translations showing
- Materials/LOTs not saving
- Scanner improvements not working

## Step-by-Step Server Verification

### 1. SSH into Digital Ocean Server
```bash
ssh root@your-server-ip
cd /path/to/dental-lab-mdr
```

### 2. Verify Git Status
```bash
# Check current branch
git branch

# Check current commit
git log --oneline -1

# EXPECTED OUTPUT:
# c945a29 ✨ feat: Complete Material Scanner overhaul - save functionality, all fields, translations

# If you see an older commit, you need to pull:
git pull origin main
```

### 3. Verify Files Exist on Server
```bash
# Check if new file exists
ls -la components/materials/InlineMaterialLotForm.tsx

# Should show: -rw-r--r-- ... InlineMaterialLotForm.tsx

# Check if translations exist
grep "scanner" messages/en.json | head -5

# Should show: "scanner": {
```

### 4. Rebuild on Server
```bash
# CRITICAL: Must rebuild after pulling changes
npm run build

# This should take ~30-60 seconds
# Watch for any errors during build
```

### 5. Restart PM2
```bash
# Stop current process
pm2 stop dental-lab-mdr

# Start fresh
pm2 start dental-lab-mdr

# OR restart
pm2 restart dental-lab-mdr

# Verify it's running
pm2 status
pm2 logs dental-lab-mdr --lines 50
```

### 6. Clear Browser Cache (IMPORTANT!)
```
In your browser:
1. Press Ctrl+Shift+R (hard reload)
2. Or: Clear cache and hard reload
3. Or: Open in incognito/private window
```

### 7. Verify in Browser
Open developer console (F12) and check:

```javascript
// Network tab - look for errors (red items)
// Console tab - look for JavaScript errors

// Test the scanner:
1. Go to Materials page
2. Click "Smart Scanner" button
3. Does the modal open?
4. What text do you see? (English or translated?)
```

## Common Issues & Solutions

### Issue: "Cannot find module 'InlineMaterialLotForm'"
**Solution:** Files not pulled from git
```bash
git pull origin main
npm run build
pm2 restart dental-lab-mdr
```

### Issue: Translations showing in English, not Slovenian
**Solution:** Language setting issue
- Check locale in URL: `/sl/materials` (should have /sl/)
- Verify messages/sl.json has scanner section

### Issue: "Module not found" errors in browser
**Solution:** Build not run or incomplete
```bash
rm -rf .next
npm run build
pm2 restart dental-lab-mdr
```

### Issue: Changes visible but save doesn't work
**Solution:** Check API endpoints
```bash
# Check logs for errors
pm2 logs dental-lab-mdr --lines 100

# Look for:
# - POST /api/materials (should be 200)
# - POST /api/materials/[id]/lots (should be 200)
```

### Issue: "InlineMaterialLotForm is not defined"
**Solution:** Import issue or build cache
```bash
# Clear Next.js cache
rm -rf .next
npm run build
pm2 restart dental-lab-mdr
```

## Verification Commands (Run on Server)

```bash
# 1. Check git status
git status

# 2. Check last commit
git log -1 --oneline

# 3. List new files
git show --name-only c945a29

# 4. Verify build directory
ls -la .next

# 5. Check PM2 status
pm2 status

# 6. Check recent logs
pm2 logs dental-lab-mdr --lines 50 --nostream
```

## What Should Work After Proper Deployment

1. ✅ Scanner opens in Slovenian (if locale is /sl/)
2. ✅ "Pametni skener materialov" title visible
3. ✅ When creating new material, inline form appears
4. ✅ All fields visible: code, name, manufacturer, description, biocompatible, ISO cert, CE marking, LOT info
5. ✅ Clicking "Ustvari material + dodaj LOT" saves and shows success toast
6. ✅ Material appears in materials list immediately

## Still Not Working?

If you've done all the above and it's still not working, run this debug script:

```bash
#!/bin/bash
echo "=== Git Status ==="
git status
echo ""
echo "=== Current Commit ==="
git log -1 --oneline
echo ""
echo "=== File Check ==="
ls -la components/materials/InlineMaterialLotForm.tsx
echo ""
echo "=== Translation Check ==="
grep '"scanner":' messages/en.json | head -3
echo ""
echo "=== PM2 Status ==="
pm2 status
echo ""
echo "=== Recent Logs ==="
pm2 logs dental-lab-mdr --lines 20 --nostream
```

Save as `debug-deploy.sh`, run with `bash debug-deploy.sh`, and send me the output.
