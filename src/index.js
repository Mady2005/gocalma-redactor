/**
 * GoCalma Main Application
 * Privacy-first PDF redaction with local AI processing
 */

import { extractTextFromPDF } from './pdf-parser.js';
import { initializeModel, detectPII, getPIIStats } from './pii-detector.js';
import { createRedactionPackage, unredactText, downloadKeyFile } from './redaction-engine.js';
import { createRedactedPDF, downloadPDF } from './pdf-generator.js';

// Application state
const state = {
    currentFile: null,
    extractedText: null,
    detectedEntities: [],
    redactionPackage: null,
    modelInitialized: false
};

// DOM elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const reviewSection = document.getElementById('review-section');
const downloadSection = document.getElementById('download-section');
const loadingText = document.getElementById('loading-text');
const loadingDetail = document.getElementById('loading-detail');

// Initialize the application
async function init() {
    console.log('🚀 GoCalma initializing...');
    console.log('Upload zone:', uploadZone);
    console.log('File input:', fileInput);
    setupEventListeners();
    updateProgress('upload');
    console.log('✅ Initialization complete');
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // File upload
    uploadZone.addEventListener('click', () => {
        console.log('Upload zone clicked');
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        console.log('File input changed:', e.target.files);
        handleFileSelect(e);
    });
    
    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        console.log('Drag over');
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        console.log('Drag leave');
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        console.log('File dropped:', e.dataTransfer.files);
        const file = e.dataTransfer.files[0];
        if (file) {
            console.log('File type:', file.type);
            console.log('File name:', file.name);
            if (file.type === 'application/pdf') {
                console.log('✅ Valid PDF, processing...');
                handleFile(file);
            } else {
                console.error('❌ Not a PDF file');
                alert('Please upload a PDF file');
            }
        } else {
            console.error('❌ No file found');
        }
    });
    
    console.log('✅ Event listeners set up');
}

// Handle file selection
function handleFileSelect(e) {
    console.log('handleFileSelect called');
    const file = e.target.files[0];
    if (file) {
        console.log('File selected:', file.name, file.type);
        handleFile(file);
    } else {
        console.error('No file selected');
    }
}

// Process uploaded file
async function handleFile(file) {
    console.log('📄 Processing file:', file.name);
    state.currentFile = file;
    
    // Show loading
    console.log('Showing loading section...');
    showSection('loading');
    updateProgress('detect');
    
    try {
        // Try to initialize AI model (optional, won't break if it fails)
        if (!state.modelInitialized) {
            console.log('⚙️ Attempting to initialize AI model (optional)...');
            loadingText.textContent = 'Loading PII detection...';
            loadingDetail.textContent = 'Initializing (rule-based detection ready)...';
            
            try {
                await initializeModel((message) => {
                    console.log('Model progress:', message);
                    loadingDetail.textContent = message;
                });
                state.modelInitialized = true;
                console.log('✅ AI model initialized successfully');
            } catch (aiError) {
                console.warn('⚠️ AI model failed to load, using rule-based detection only:', aiError);
                loadingDetail.textContent = 'Using rule-based PII detection';
                state.modelInitialized = true; // Mark as initialized even without AI
            }
        }
        
        // Extract text from PDF
        console.log('📝 Extracting text from PDF...');
        loadingText.textContent = 'Extracting text from PDF...';
        const extracted = await extractTextFromPDF(file, (message) => {
            console.log('Extraction progress:', message);
            loadingDetail.textContent = message;
        });
        
        console.log('Extracted text length:', extracted.text.length);
        console.log('First 200 chars:', extracted.text.substring(0, 200));
        state.extractedText = extracted.text;
        
        // Detect PII
        console.log('🔍 Detecting PII...');
        loadingText.textContent = 'Detecting personal information...';
        loadingDetail.textContent = 'Running AI analysis...';
        
        const entities = await detectPII(extracted.text);
        console.log('Detected entities:', entities.length);
        console.log('Entities:', entities);
        state.detectedEntities = entities;
        
        // Show review screen
        console.log('📋 Showing review screen...');
        displayReviewScreen();
        
    } catch (error) {
        console.error('❌ Error processing PDF:', error);
        console.error('Error stack:', error.stack);
        alert('Error processing PDF: ' + error.message);
        showSection('upload');
        updateProgress('upload');
    }
}

// Display review screen with detected PII
function displayReviewScreen() {
    const stats = getPIIStats(state.detectedEntities);
    
    document.getElementById('total-pii').textContent = stats.total;
    document.getElementById('selected-pii').textContent = stats.selected;
    
    // Render PII list
    const piiList = document.getElementById('pii-list');
    piiList.innerHTML = '';
    
    state.detectedEntities.forEach((entity) => {
        const item = document.createElement('div');
        item.className = `pii-item ${entity.selected ? 'selected' : ''}`;
        item.onclick = () => togglePIISelection(entity.id);
        
        item.innerHTML = `
            <div>
                <div class="pii-type">${entity.label}</div>
                <div style="font-family: monospace; font-size: 0.9rem;">${entity.value}</div>
                ${entity.score ? `<div style="font-size: 0.75rem; color: #6b7280;">Confidence: ${Math.round(entity.score * 100)}%</div>` : ''}
            </div>
            <div style="margin-left: 1rem;">
                <div style="width: 20px; height: 20px; border: 2px solid ${entity.selected ? '#ef4444' : '#d1d5db'}; border-radius: 4px; background: ${entity.selected ? '#ef4444' : 'white'}; display: flex; align-items: center; justify-content: center;">
                    ${entity.selected ? '<span style="color: white; font-size: 0.8rem;">✓</span>' : ''}
                </div>
            </div>
        `;
        
        piiList.appendChild(item);
    });
    
    // Show document preview
    document.getElementById('document-preview').textContent = state.extractedText;
    
    showSection('review');
    updateProgress('review');
}

// Toggle PII selection
function togglePIISelection(id) {
    const entity = state.detectedEntities.find(e => e.id === id);
    if (entity) {
        entity.selected = !entity.selected;
        displayReviewScreen();
    }
}

// Perform redaction
window.performRedaction = async function() {
    const selectedCount = state.detectedEntities.filter(e => e.selected).length;
    
    if (selectedCount === 0) {
        alert('Please select at least one item to redact');
        return;
    }
    
    showSection('loading');
    loadingText.textContent = 'Creating redacted document...';
    loadingDetail.textContent = 'Encrypting personal information...';
    
    try {
        // Create redaction package
        const redactionPackage = await createRedactionPackage(
            state.extractedText,
            state.detectedEntities,
            state.currentFile.name
        );
        
        state.redactionPackage = redactionPackage;
        
        loadingDetail.textContent = 'Generating PDF...';
        
        // Show download screen
        showSection('download');
        updateProgress('download');
        
    } catch (error) {
        console.error('Error during redaction:', error);
        alert('Error creating redacted document: ' + error.message);
        showSection('review');
    }
};

// Download redacted PDF
window.downloadRedactedPDF = async function() {
    if (!state.redactionPackage) return;
    
    try {
        // Get original PDF buffer
        const originalBuffer = await state.currentFile.arrayBuffer();
        
        // Create redacted PDF
        const pdfBytes = await createRedactedPDF(
            originalBuffer,
            state.redactionPackage.redactedText,
            state.detectedEntities
        );
        
        // Download
        const filename = state.currentFile.name.replace('.pdf', '_REDACTED.pdf');
        downloadPDF(pdfBytes, filename);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF: ' + error.message);
    }
};

// Download encryption key
window.downloadEncryptionKey = function() {
    if (!state.redactionPackage) return;
    
    const filename = state.currentFile.name.replace('.pdf', '_ENCRYPTION_KEY.json');
    downloadKeyFile(state.redactionPackage.keyFile, filename);
};

// Reset application
window.resetApp = function() {
    state.currentFile = null;
    state.extractedText = null;
    state.detectedEntities = [];
    state.redactionPackage = null;
    
    fileInput.value = '';
    
    showSection('upload');
    updateProgress('upload');
};

// Show specific section
function showSection(section) {
    uploadSection.classList.add('hidden');
    loadingSection.classList.add('hidden');
    reviewSection.classList.add('hidden');
    downloadSection.classList.add('hidden');
    
    const sections = {
        upload: uploadSection,
        loading: loadingSection,
        review: reviewSection,
        download: downloadSection
    };
    
    sections[section]?.classList.remove('hidden');
}

// Update progress steps
function updateProgress(currentStep) {
    const steps = ['upload', 'detect', 'review', 'download'];
    const stepElements = steps.map(s => document.getElementById(`step-${s}`));
    
    const currentIndex = steps.indexOf(currentStep);
    
    stepElements.forEach((el, index) => {
        el.classList.remove('active', 'complete');
        if (index < currentIndex) {
            el.classList.add('complete');
        } else if (index === currentIndex) {
            el.classList.add('active');
        }
    });
}

// Start the application
init();
