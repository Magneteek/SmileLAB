# Vision API Troubleshooting Guide

## Summary

✅ **Local Testing**: Vision API works correctly on your local machine
❌ **Production Issue**: "Vision API failed" error on production server

This guide helps you diagnose and fix the production issue.

---

## Quick Diagnosis (On Production Server)

### Option 1: Use the Debug Endpoint

1. **Deploy the debug endpoint** (if not already deployed):
   - File: `/app/api/debug/vision-test/route.ts`
   - This file has been created for you

2. **Call the endpoint** from your browser or curl:
   ```bash
   curl https://YOUR-PRODUCTION-URL/api/debug/vision-test
   ```

3. **Read the JSON response** - it will tell you exactly what's wrong:
   - ✅ All checks passed → Vision API is working
   - ❌ Specific error → Follow the recommendation in the response

### Option 2: SSH into Production and Run Diagnostic Script

1. **Copy the diagnostic script to production**:
   ```bash
   # From your local machine
   scp diagnose-vision-api.js your-server:/path/to/app/
   ```

2. **SSH into production and run it**:
   ```bash
   ssh your-server
   cd /path/to/app
   node diagnose-vision-api.js
   ```

3. **Read the output** - it will show exactly what's failing

---

## Common Issues & Solutions

### Issue 1: API Key Not Configured

**Symptoms**:
- Error: "OpenAI API not configured. Please set OPENAI_API_KEY"
- Diagnostic shows: `apiKeyExists: false`

**Solution**:
1. Check if `.env.local` or `.env` exists on production server
2. Verify it contains: `OPENAI_API_KEY="sk-proj-..."`
3. Restart the Next.js application after adding the key
4. For Docker deployments, ensure env vars are passed to the container

**Example Docker Compose**:
```yaml
services:
  app:
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
```

### Issue 2: Invalid or Expired API Key

**Symptoms**:
- Error: "Vision API failed"
- HTTP Status: 401 (Unauthorized)
- Diagnostic shows: `Authentication failed`

**Solution**:
1. Go to https://platform.openai.com/api-keys
2. Check if your API key is still active
3. If expired/revoked, generate a new key
4. Update production environment variables
5. Restart the application

**Verify the key format**:
- Should start with `sk-proj-` (project key) or `sk-` (older format)
- Length: 100-200 characters
- No spaces or newlines

### Issue 3: Insufficient Credits / Rate Limit

**Symptoms**:
- Error: "Vision API failed"
- HTTP Status: 429 (Too Many Requests)
- Diagnostic shows: `Rate limit exceeded`

**Solution**:
1. Check your OpenAI usage: https://platform.openai.com/usage
2. Verify you have available credits
3. Check your billing settings: https://platform.openai.com/account/billing
4. Add payment method or increase spending limits if needed

**Credit Requirements**:
- GPT-4o Vision: ~$0.01 per image (varies by resolution)
- Minimum recommended: $10 credit balance

### Issue 4: Network/Firewall Blocking

**Symptoms**:
- Error: "Vision API failed"
- Network error: ENOTFOUND, ETIMEDOUT, ECONNREFUSED
- Diagnostic shows: `Network connectivity failed`

**Solution**:
1. **Check if production server can reach OpenAI**:
   ```bash
   curl -I https://api.openai.com/v1/models
   ```

2. **If it fails**, check firewall rules:
   ```bash
   # Allow outbound HTTPS to api.openai.com
   sudo ufw allow out to api.openai.com port 443
   ```

3. **For corporate proxies**, configure proxy settings:
   ```bash
   export HTTPS_PROXY=http://proxy.company.com:8080
   ```

4. **Required domains to whitelist**:
   - `api.openai.com` (port 443)
   - `cdn.openai.com` (port 443)

### Issue 5: Environment Variables Not Loaded

**Symptoms**:
- Works locally, fails on production
- Diagnostic shows API key exists but Vision API still fails
- No clear error message

**Solution (Next.js Specific)**:
1. **Check how you're loading environment variables**:
   ```typescript
   // This works in server components and API routes
   const apiKey = process.env.OPENAI_API_KEY;

   // This does NOT work in client components
   const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY; // Wrong!
   ```

2. **Verify environment variables are loaded**:
   ```bash
   # On production server
   env | grep OPENAI
   ```

3. **For PM2/systemd**, ensure env vars are set:
   ```bash
   # PM2
   pm2 start npm --name "smilelab" -- start
   pm2 env smilelab

   # systemd
   Environment="OPENAI_API_KEY=sk-proj-..."
   ```

4. **Restart the application** after any env changes

### Issue 6: Docker Environment Variables

**Symptoms**:
- Docker container can't access OpenAI API
- Works outside Docker, fails inside

**Solution**:
1. **Pass env vars to Docker container**:
   ```bash
   docker run -e OPENAI_API_KEY="sk-proj-..." your-image
   ```

2. **Or use docker-compose.yml**:
   ```yaml
   services:
     app:
       environment:
         - OPENAI_API_KEY=${OPENAI_API_KEY}
   ```

3. **Or use .env file**:
   ```yaml
   services:
     app:
       env_file:
         - .env.local
   ```

4. **Verify inside container**:
   ```bash
   docker exec -it container-name env | grep OPENAI
   ```

---

## Step-by-Step Production Fix

### Step 1: Identify the Issue

Run the debug endpoint or diagnostic script (see Quick Diagnosis above)

### Step 2: Fix Based on Error Type

| Error | Fix |
|-------|-----|
| API key not found | Add OPENAI_API_KEY to .env |
| Invalid API key (401) | Replace with valid key from OpenAI dashboard |
| Rate limit (429) | Add credits to OpenAI account |
| Network error | Check firewall, whitelist api.openai.com |
| Other | Check server logs for details |

### Step 3: Restart Application

```bash
# PM2
pm2 restart smilelab

# systemd
sudo systemctl restart smilelab

# Docker
docker-compose restart
```

### Step 4: Test Again

1. **Use the debug endpoint**:
   ```bash
   curl https://your-domain.com/api/debug/vision-test
   ```

2. **Or test the actual OCR scanner**:
   - Log into the app
   - Go to Materials > Add Material
   - Click "Scan Label with AI"
   - Take a photo of a material label
   - Should see "Analyzing with AI..." → Success

### Step 5: Verify in Production

1. Test with a real dental material label
2. Verify extracted data is correct
3. Check that no errors appear in console
4. Monitor server logs for any issues

---

## Testing Results

### ✅ Local Environment (WORKING)

```
Environment: development
API Key configured: ✅
Network connectivity: ✅ (OpenAI reachable)
Vision API status: ✅ WORKING

All checks passed!
```

**Files Created for Testing**:
- `test-vision-api.js` - Simple Vision API test
- `diagnose-vision-api.js` - Comprehensive diagnostic tool
- `app/api/debug/vision-test/route.ts` - Debug API endpoint

---

## Quick Reference: API Endpoints

| Endpoint | Purpose | Method |
|----------|---------|--------|
| `/api/ocr/vision` | Production OCR endpoint | POST |
| `/api/debug/vision-test` | Diagnostic endpoint | GET |

**Production OCR Endpoint** (`/api/ocr/vision`):
- Input: `{ imageBase64: "data:image/jpeg;base64,..." }`
- Output: `{ success: true, data: {...}, tokensUsed: {...} }`
- Error: `{ success: false, error: "message" }`

---

## Expected Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "lotNumber": "ABC123",
    "expiryDate": "2026-12-31",
    "quantity": "10g",
    "manufacturer": "Ivoclar Vivadent",
    "materialName": "IPS e.max CAD",
    "materialType": "CERAMIC",
    "confidence": "high",
    "reasoning": "All fields clearly visible on label"
  },
  "tokensUsed": {
    "prompt": 603,
    "completion": 120,
    "total": 723
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Vision API failed"
}
```

---

## Monitoring & Logging

### Enable Detailed Logging

Add to your Vision API route (`app/api/ocr/vision/route.ts`):

```typescript
console.log('[Vision API] Starting request');
console.log('[Vision API] Image size:', imageBase64.length, 'bytes');
console.log('[Vision API] Calling OpenAI...');

// ... API call ...

console.log('[Vision API] Success:', response.choices[0].message.content);
console.log('[Vision API] Tokens used:', response.usage);
```

### Check Logs

```bash
# PM2
pm2 logs smilelab

# Docker
docker logs -f container-name

# systemd
journalctl -u smilelab -f
```

---

## Support Resources

- **OpenAI Status**: https://status.openai.com/
- **OpenAI API Docs**: https://platform.openai.com/docs/guides/vision
- **OpenAI Support**: https://help.openai.com/

---

## Checklist for Production Deployment

- [ ] OPENAI_API_KEY environment variable set
- [ ] API key is valid and active
- [ ] OpenAI account has sufficient credits ($10+ recommended)
- [ ] Firewall allows outbound HTTPS to api.openai.com
- [ ] Application restarted after env var changes
- [ ] Debug endpoint deployed and tested
- [ ] Production OCR scanner tested with real label
- [ ] Server logs monitored for errors

---

## Contact Information

If issues persist after following this guide:

1. Check OpenAI status page for outages
2. Verify your OpenAI account is in good standing
3. Review server logs for additional error details
4. Test with the diagnostic scripts provided

**Last Updated**: 2026-02-05
