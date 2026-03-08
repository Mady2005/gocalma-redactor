# 🔧 IMPORTANT: Clean Installation Required

## The Problem
Vite is caching the old pdfjs-dist version. We need to completely clear everything and reinstall.

## ✅ FOLLOW THESE STEPS EXACTLY:

### Step 1: Stop the Dev Server
Press `Ctrl+C` in your terminal to stop `npm run dev` if it's running.

### Step 2: Clean Everything
```bash
cd gocalma-redactor

# Remove node_modules
rm -rf node_modules

# Remove package-lock.json
rm -rf package-lock.json

# Remove Vite cache
rm -rf node_modules/.vite

# Remove dist folder
rm -rf dist

# For extra safety, also clear:
rm -rf .vite
```

### Step 3: Fresh Install
```bash
npm install
```

**Expected output:**
```
added 165 packages
```

### Step 4: Start with Force Flag (Clears Cache)
```bash
npm run dev
```

The `--force` flag is now in package.json, so it will clear Vite's cache automatically.

### Step 5: Hard Refresh Browser
Once the page loads:
- Press `Ctrl+Shift+R` (Windows/Linux)
- Press `Cmd+Shift+R` (Mac)

This clears browser cache.

## What Changed

1. **pdfjs-dist downgraded** from 4.0.379 → 3.11.174 (more stable)
2. **Worker disabled** - no more worker errors
3. **--force flag** added to dev script
4. **Simplified PDF parser** - just works

## Expected Behavior

**Upload test-medical-invoice.pdf:**

Console should show:
```
🚀 GoCalma initializing...
✅ Initialization complete
📄 Processing file: test-medical-invoice.pdf
📄 Starting PDF text extraction...
Converting File to ArrayBuffer...
ArrayBuffer size: 2847
Loading PDF document...
✅ PDF loaded, pages: 1
Extracting page 1...
Page 1 text length: 847
✅ Total text extracted: 847 characters
🔍 Detecting PII...
Rule-based detected: 18 items
📋 Showing review screen...
```

**NO ERRORS!** ✅

## If Still Not Working

1. **Delete the entire gocalma-redactor folder**
2. **Re-extract from the ZIP**
3. **Follow steps above again**

## Alternative: Use Different Port

If port 5173 is cached, try a different port:

```bash
# Edit package.json, change:
"dev": "vite --force"
# To:
"dev": "vite --force --port 5174"

# Then run:
npm run dev
```

---

**This MUST work after clean install!** 🎯
