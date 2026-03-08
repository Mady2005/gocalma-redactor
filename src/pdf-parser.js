/**
 * PDF Parser - Simple text extraction without workers
 * Works reliably across all browsers
 */

import * as pdfjsLib from 'pdfjs-dist';

// Disable worker completely - use main thread processing
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

/**
 * Extract text content from a PDF file
 * @param {File|ArrayBuffer} pdfFile - The PDF file or buffer
 * @param {Function} progressCallback - Called with progress updates
 * @returns {Promise<Object>} Extracted text and metadata
 */
export async function extractTextFromPDF(pdfFile, progressCallback) {
    console.log('📄 Starting PDF text extraction...');
    
    // Convert File to ArrayBuffer if needed
    let arrayBuffer;
    if (pdfFile instanceof File) {
        console.log('Converting File to ArrayBuffer...');
        arrayBuffer = await pdfFile.arrayBuffer();
    } else {
        arrayBuffer = pdfFile;
    }
    
    console.log('ArrayBuffer size:', arrayBuffer.byteLength);
    
    if (progressCallback) {
        progressCallback('Loading PDF document...');
    }
    
    try {
        // Load PDF with worker disabled
        console.log('Loading PDF document...');
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            verbosity: 0,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
        });
        
        const pdf = await loadingTask.promise;
        console.log('✅ PDF loaded, pages:', pdf.numPages);
        
        const totalPages = pdf.numPages;
        const textByPage = [];
        let fullText = '';
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            if (progressCallback) {
                progressCallback(`Extracting text from page ${pageNum}/${totalPages}...`);
            }
            
            console.log(`Extracting page ${pageNum}...`);
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Combine text items into a string
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');
            
            console.log(`Page ${pageNum} text length:`, pageText.length);
            
            textByPage.push({
                pageNumber: pageNum,
                text: pageText
            });
            
            fullText += pageText + '\n\n';
        }
        
        if (progressCallback) {
            progressCallback('Text extraction complete');
        }
        
        console.log('✅ Total text extracted:', fullText.length, 'characters');
        
        return {
            text: fullText.trim(),
            pages: textByPage,
            numPages: totalPages,
            metadata: {}
        };
    } catch (error) {
        console.error('❌ PDF extraction error:', error);
        throw new Error(`PDF extraction failed: ${error.message}`);
    }
}

/**
 * Get PDF metadata
 * @param {File|ArrayBuffer} pdfFile - The PDF file or buffer
 * @returns {Promise<Object>} PDF metadata
 */
export async function getPDFMetadata(pdfFile) {
    let arrayBuffer;
    if (pdfFile instanceof File) {
        arrayBuffer = await pdfFile.arrayBuffer();
    } else {
        arrayBuffer = pdfFile;
    }
    
    const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer
    });
    const pdf = await loadingTask.promise;
    
    return {
        numPages: pdf.numPages,
        info: {},
        metadata: {}
    };
}

/**
 * Extract text with position information (for advanced redaction)
 * @param {File|ArrayBuffer} pdfFile - The PDF file or buffer
 * @param {number} pageNum - Page number to extract
 * @returns {Promise<Array>} Text items with positions
 */
export async function extractTextWithPositions(pdfFile, pageNum) {
    let arrayBuffer;
    if (pdfFile instanceof File) {
        arrayBuffer = await pdfFile.arrayBuffer();
    } else {
        arrayBuffer = pdfFile;
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    return textContent.items.map(item => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
        fontName: item.fontName
    }));
}

/**
 * Check if PDF is valid and readable
 * @param {File|ArrayBuffer} pdfFile - The PDF file or buffer
 * @returns {Promise<boolean>} True if valid
 */
export async function validatePDF(pdfFile) {
    try {
        let arrayBuffer;
        if (pdfFile instanceof File) {
            arrayBuffer = await pdfFile.arrayBuffer();
        } else {
            arrayBuffer = pdfFile;
        }
        
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        await loadingTask.promise;
        return true;
    } catch (error) {
        console.error('PDF validation failed:', error);
        return false;
    }
}
