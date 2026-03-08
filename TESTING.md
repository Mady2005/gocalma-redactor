# 🧪 GoCalma Testing Guide

## ✅ Configuration Fixed

I've updated the project with proper configuration. **Re-download** the archives if you downloaded before:
- gocalma-redactor.zip
- gocalma-redactor.tar.gz

## 🚀 Start Testing

### 1. Start the Development Server

```bash
cd gocalma-redactor
npm run dev
```

Expected output:
```
VITE v5.1.0  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Your browser should automatically open to `http://localhost:5173`

### 2. Test with Sample PDF

**Use the included test PDF:** `test-medical-invoice.pdf`

This contains realistic PII:
- ✓ Names: "Maria Schmidt", "Hans Müller", "Hans Schmidt"
- ✓ Email: maria.schmidt@example.com, billing@klinik-zurich.ch
- ✓ Phone: +41 44 123 4567, +41 44 987 6543, +41 79 456 7890
- ✓ AHV Number: 756.1234.5678.90
- ✓ IBAN: CH93 0076 2011 6238 5295 7
- ✓ Address: Bahnhofstrasse 123, 8001 Zürich
- ✓ IDs: POL-2024-001234, PAT-987654, INV-2024-0456

### 3. Testing Workflow

**Step 1: Upload PDF**
- Click the upload zone or drag & drop `test-medical-invoice.pdf`
- Wait for "Processing..." message

**Step 2: AI Model Download (First Time Only)**
- You'll see: "Downloading AI model..."
- Progress bar shows download (50-100MB)
- **This takes 30-60 seconds on first run**
- Model is cached - instant on subsequent uploads

**Step 3: Review Detected PII**
- You should see **15-20+ detected items**
- Categories shown: Names, Emails, Phones, IBAN, AHV, etc.
- Each item shows:
  - Type badge (e.g., "Email Address")
  - Actual value
  - Confidence score
  - Selection checkbox (red = will be redacted)

**Step 4: Toggle Selections (Optional)**
- Click any item to toggle redaction on/off
- Selected items have red background
- Stats update: "Will Be Redacted" counter

**Step 5: Redact Document**
- Click "🛡️ Redact Document" button
- Wait 1-2 seconds for encryption
- You'll see success message

**Step 6: Download Files**
- **Download Redacted PDF**: Click to get safe version
  - Opens/saves as `test-medical-invoice_REDACTED.pdf`
  - Contains tokens like `[REDACTED_EMAIL_001]`
  - Has notice page explaining redaction
  
- **Download Encryption Key**: Click to get key file
  - Saves as `test-medical-invoice_ENCRYPTION_KEY.json`
  - Contains encrypted mapping
  - Required to restore original data

## 🔍 What to Verify

### ✅ Functionality Tests

1. **PII Detection Accuracy**
   - [ ] All emails detected (3 total)
   - [ ] All phones detected (3 total)
   - [ ] Names detected (3 total)
   - [ ] IBAN detected
   - [ ] AHV number detected
   - [ ] Addresses detected

2. **Redacted PDF Quality**
   - [ ] PDF opens correctly
   - [ ] Notice page appears first
   - [ ] Redaction statistics shown
   - [ ] Tokens clearly visible in red
   - [ ] Original formatting preserved

3. **Encryption Key File**
   - [ ] Valid JSON format
   - [ ] Contains encrypted values
   - [ ] Includes all metadata
   - [ ] Shows instructions

4. **Un-redaction Preview (Optional)**
   - After downloading, click "Decrypt" in preview
   - Should show original values with ** markers

### ✅ Privacy Tests

1. **Network Tab (Chrome DevTools)**
   - Press F12 → Network tab
   - Upload PDF and process
   - **Verify:** Only these requests appear:
     - Initial page load
     - AI model download (first time only, from Hugging Face CDN)
     - **NO requests** containing your PDF data
     - **NO analytics** or tracking calls

2. **Local Storage (DevTools)**
   - F12 → Application → Local Storage
   - **Verify:** No sensitive data stored
   - Only model cache (if any)

## 🐛 Troubleshooting

### Model Download Fails
**Error:** "Failed to download model"
**Fix:** 
- Check internet connection
- Try again (sometimes CDN is slow)
- Clear browser cache: Ctrl+Shift+Del

### PDF Won't Upload
**Error:** "Error processing PDF"
**Fix:**
- Ensure file is .pdf format
- Try the included test-medical-invoice.pdf
- Check browser console (F12) for errors

### No PII Detected
**Possible causes:**
- Scanned PDF (image-based) - not supported yet
- Empty/corrupt PDF
- Model still loading - wait for completion

### Browser Console Errors
**Open console:** F12 → Console tab
**Look for:**
- Red errors = something broken
- Yellow warnings = usually safe to ignore

## 📊 Expected Performance

| Metric | Expected Result |
|--------|----------------|
| Model download | 30-60 seconds (first time) |
| PDF text extraction | 1-2 seconds |
| PII detection | 2-5 seconds |
| Redaction + encryption | <1 second |
| PDF generation | 1-2 seconds |
| Total time (first run) | ~40-70 seconds |
| Total time (cached) | ~5-10 seconds |

## 🎯 Success Criteria

Your test is successful if:
- ✅ Can upload and process PDF
- ✅ Detects majority of PII (≥90% of expected items)
- ✅ Generates redacted PDF with tokens
- ✅ Downloads encryption key file
- ✅ No network calls with PDF data
- ✅ UI is usable by non-technical person

## 🔄 Testing Multiple PDFs

After first test, try:
1. Click "Redact Another Document"
2. Upload a different PDF (or same one)
3. **Should be faster** - model already loaded

## 📝 Create Your Own Test PDF

Want to test with other data? Create a text file with:
- Your name
- An email address
- A phone number
- An IBAN
- An address

Then convert to PDF using:
- Microsoft Word → Save as PDF
- Google Docs → Download → PDF
- LibreOffice → Export as PDF

## 💡 Advanced Testing

### Test Edge Cases
- Empty PDF
- PDF with only images (should fail gracefully)
- Very large PDF (100+ pages)
- PDF with special characters
- Multi-language PDF

### Test Languages
Try PDFs in:
- 🇬🇧 English
- 🇩🇪 German (Deutsch)
- 🇫🇷 French (Français)
- 🇮🇹 Italian (Italiano)
- 🇪🇸 Spanish (Español)

## 🎉 Ready for Demo

Once testing works, you can:
1. **Build for production:** `npm run build`
2. **Deploy:** Upload `dist/` folder to GitHub Pages, Netlify, etc.
3. **Demo:** Show live at hackathon presentation

---

**Questions?** Check the console, review README.md, or check ARCHITECTURE.md for technical details.
