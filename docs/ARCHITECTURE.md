# GoCalma Architecture

## System Overview

GoCalma is a browser-based PDF redaction tool that operates entirely on the client side. It uses WebAssembly-compiled AI models for Named Entity Recognition (NER) to detect personally identifiable information (PII) in PDF documents.

## Core Principles

1. **Privacy-by-Design**: All processing happens in the browser, no data leaves the device
2. **AI-Powered Detection**: Uses Transformers.js with BERT-based NER models
3. **Reversible Redaction**: AES-256-GCM encryption allows document owners to restore data
4. **Zero Dependencies on Cloud**: Completely offline-capable after initial load

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User's Browser                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  PDF Upload │  │ Text Extract │  │ PII Detection│       │
│  │   (Input)   │─>│   (pdf.js)   │─>│(Transformers)│       │
│  └─────────────┘  └──────────────┘  └──────┬───────┘       │
│                                              │               │
│                                              v               │
│                    ┌─────────────────────────────┐          │
│                    │   User Review Interface     │          │
│                    │  (Select items to redact)   │          │
│                    └────────────┬────────────────┘          │
│                                 │                            │
│                                 v                            │
│             ┌──────────────────────────────────┐            │
│             │    Redaction Engine               │            │
│             │  - Token replacement              │            │
│             │  - AES-256-GCM encryption         │            │
│             │  - Mapping generation             │            │
│             └──────────┬───────────────────────┘            │
│                        │                                     │
│                        v                                     │
│          ┌─────────────────────────┐                        │
│          │   PDF Generation        │                        │
│          │    (pdf-lib)            │                        │
│          └──────────┬──────────────┘                        │
│                     │                                        │
│                     v                                        │
│     ┌───────────────────────────────────┐                  │
│     │  Download                          │                  │
│     │  1. Redacted PDF                   │                  │
│     │  2. Encryption Key (JSON)          │                  │
│     └────────────────────────────────────┘                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. PDF Parser (`pdf-parser.js`)

**Technology**: Mozilla pdf.js

**Responsibilities**:
- Load PDF documents from File objects
- Extract text content page-by-page
- Retrieve PDF metadata
- Handle multi-page documents

**Key Functions**:
- `extractTextFromPDF()`: Main extraction function
- `getPDFMetadata()`: Retrieve document info
- `validatePDF()`: Check if PDF is valid

**Output Format**:
```javascript
{
  text: "Full document text...",
  pages: [{pageNumber: 1, text: "Page 1 text..."}, ...],
  numPages: 10,
  metadata: {...}
}
```

### 2. PII Detector (`pii-detector.js`)

**Technology**: Xenova Transformers.js + BERT NER

**Detection Strategy**: Hybrid approach
1. **AI-Based**: BERT multilingual NER model
2. **Rule-Based**: Regex patterns for high-precision matching

**Model**: `Xenova/bert-base-multilingual-cased-ner-hrl`
- Runs locally via WebAssembly
- Supports: English, German, French, Italian, Spanish
- Token classification for PER, LOC, ORG, MISC entities

**Detection Categories**:
- Names (PERSON entities from NER)
- Emails (regex pattern)
- Phone numbers (international formats)
- Financial (IBAN, credit cards)
- National IDs (SSN, AHV, passport)
- Addresses (location entities + patterns)
- Dates

**Key Functions**:
- `initializeModel()`: Load WASM model (one-time)
- `detectPII()`: Main detection function
- `getPIIStats()`: Generate statistics

**Output Format**:
```javascript
[
  {
    id: 0,
    value: "John Doe",
    type: "NAME",
    label: "Person Name",
    start: 150,
    end: 158,
    score: 0.98,
    selected: true
  },
  ...
]
```

### 3. Crypto Utils (`crypto-utils.js`)

**Technology**: Web Crypto API

**Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits
- **IV Size**: 12 bytes (96 bits)
- **Authentication**: Built-in via GCM mode

**Security Features**:
- Cryptographically secure random key generation
- Authenticated encryption (prevents tampering)
- Unique IV per encryption operation
- Key export/import for storage

**Key Functions**:
- `generateEncryptionKey()`: Create new AES-256 key
- `encrypt()`: Encrypt plaintext → {ciphertext, iv}
- `decrypt()`: Decrypt with key and IV
- `createKeyFile()`: Generate downloadable key file

**Key File Format**:
```json
{
  "version": "1.0",
  "algorithm": "AES-256-GCM",
  "originalDocument": "invoice.pdf",
  "timestamp": "2024-03-08T10:00:00.000Z",
  "key": "hex_encoded_key...",
  "mapping": {
    "[REDACTED_NAME_000]": {
      "encryptedValue": "base64...",
      "iv": "base64...",
      "type": "NAME",
      "label": "Person Name"
    }
  }
}
```

### 4. Redaction Engine (`redaction-engine.js`)

**Core Functionality**: Token replacement and encryption

**Process**:
1. Sort entities by position (reverse order)
2. For each selected entity:
   - Generate unique token: `[REDACTED_{TYPE}_{INDEX}]`
   - Encrypt original value with AES-256-GCM
   - Store mapping: token → encrypted value
   - Replace text: original → token
3. Return redacted text + mapping

**Token Format**: `[REDACTED_EMAIL_001]`
- Clearly visible as redaction
- Type-identified for context
- Indexed for uniqueness

**Key Functions**:
- `redactText()`: Perform redaction
- `unredactText()`: Restore original (with key)
- `createRedactionPackage()`: Complete workflow

### 5. PDF Generator (`pdf-generator.js`)

**Technology**: pdf-lib

**Output Structure**:
1. **Title Page**: Redaction notice with statistics
2. **Content Pages**: Redacted text with formatting
3. **Watermarks**: "Generated by GoCalma" on each page

**Formatting**:
- Font: Helvetica (standard, embedded)
- Page Size: A4 (595x842 points)
- Margins: 50 points
- Line Height: 16 points
- Redaction Tokens: Bold, red text

**Key Functions**:
- `createRedactedPDF()`: Generate full redacted PDF
- `downloadPDF()`: Trigger browser download

## Data Flow

### Upload → Redact Flow

```
User selects PDF
    ↓
File → ArrayBuffer
    ↓
pdf.js extracts text
    ↓
Transformers.js detects PII (WASM execution)
    ↓
User reviews detected items
    ↓
Selected items → Redaction Engine
    ↓
Generate encryption key (Web Crypto API)
    ↓
Encrypt each value (AES-256-GCM)
    ↓
Replace with tokens
    ↓
pdf-lib generates PDF
    ↓
Download redacted PDF + key file
```

### Un-redaction Flow

```
User uploads key file (JSON)
    ↓
Parse key + mapping
    ↓
Load redacted text
    ↓
For each token:
    Decrypt value with AES-256-GCM
    Replace token with original
    ↓
Display restored text
```

## Performance Considerations

### Model Loading
- **First Load**: ~50-100MB download (WASM + model weights)
- **Cached**: Subsequent loads instant via browser cache
- **Strategy**: Lazy loading on first PDF upload

### Processing Speed
- **Text Extraction**: ~1-2 seconds per 10 pages
- **PII Detection**: ~2-5 seconds for 1000 words
- **Redaction**: <1 second
- **PDF Generation**: ~1-2 seconds per 10 pages

### Memory Usage
- **Peak**: ~200-300MB (model in memory)
- **Steady**: ~50MB after processing
- **Garbage Collection**: Automatic after download

## Security Analysis

### Threat Model

**Protected Against**:
- ✅ Data breaches (no server storage)
- ✅ Man-in-the-middle (no network transmission)
- ✅ Cloud provider access (no cloud processing)
- ✅ Unauthorized un-redaction (requires key)

**Not Protected Against**:
- ❌ Local malware with memory access
- ❌ Compromised browser extensions
- ❌ Key file theft (if stored insecurely)
- ❌ Physical device access

### Encryption Strength

- **Algorithm**: AES-256-GCM (NIST approved)
- **Key Space**: 2^256 possible keys
- **Brute Force**: Computationally infeasible
- **Authentication**: GCM mode prevents tampering

### Privacy Guarantees

1. **No Network Calls**: All processing local (verify in Network tab)
2. **No Analytics**: No tracking or telemetry
3. **No Cookies**: No persistent identifiers
4. **No Server Logs**: No server to log anything
5. **Open Source**: Code is auditable

## Browser Compatibility

### Required Features
- ✅ WebAssembly (Chrome 57+, Firefox 52+, Safari 11+)
- ✅ Web Crypto API (All modern browsers)
- ✅ ES6 Modules (All modern browsers)
- ✅ File API (All modern browsers)

### Tested Browsers
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### Not Supported
- Internet Explorer (no WASM)
- Old mobile browsers (<2019)

## Deployment

### Static Hosting
Can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static host

### Build Process
```bash
npm install
npm run build
# Output in dist/ folder
```

### Environment
- No server required
- No environment variables
- No database
- No API keys

## Testing Strategy

### Unit Tests
- Crypto functions (encryption/decryption)
- PII detection accuracy
- Redaction logic
- PDF generation

### Integration Tests
- Full workflow (upload → download)
- Multi-language support
- Large document handling

### Benchmarks
- Detection recall: ≥90% on synthetic data
- False positive rate: <5%
- Processing speed: <10s for 10-page doc

## Future Enhancements

### Planned Features
1. **Image Redaction**: OCR + visual redaction
2. **Batch Processing**: Multiple files at once
3. **Custom Rules**: User-defined patterns
4. **Export Formats**: Word, text, etc.
5. **Cloud Integration**: Optional encrypted cloud sync

### Optimization Opportunities
1. **Model Quantization**: Reduce model size
2. **Incremental Processing**: Stream large documents
3. **Web Workers**: Parallel processing
4. **Service Worker**: Offline support

## License

MIT License - See LICENSE file
