/**
 * PDF Generator using pdf-lib
 * Creates redacted PDF documents
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Create a redacted PDF from original PDF and redaction mapping
 * @param {ArrayBuffer} originalPdfBuffer - Original PDF data
 * @param {string} redactedText - Text with redaction tokens
 * @param {Array} entities - Detected PII entities
 * @param {Object} options - Generation options
 * @returns {Promise<Uint8Array>} Redacted PDF bytes
 */
export async function createRedactedPDF(originalPdfBuffer, redactedText, entities, options = {}) {
    const {
        addWatermark = true,
        fontSize = 12,
        fontColor = rgb(0, 0, 0)
    } = options;
    
    // Load the original PDF
    const originalPdf = await PDFDocument.load(originalPdfBuffer);
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add title page with redaction notice
    const noticePage = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = noticePage.getSize();
    
    // Add watermark/notice
    noticePage.drawText('REDACTED DOCUMENT', {
        x: 50,
        y: height - 100,
        size: 24,
        font: boldFont,
        color: rgb(0.7, 0, 0)
    });
    
    noticePage.drawText('This document has been automatically processed to protect personal information.', {
        x: 50,
        y: height - 140,
        size: 12,
        font: font
    });
    
    noticePage.drawText(`Generated: ${new Date().toLocaleString()}`, {
        x: 50,
        y: height - 160,
        size: 10,
        font: font,
        color: rgb(0.5, 0.5, 0.5)
    });
    
    noticePage.drawText(`Total redactions: ${entities.filter(e => e.selected).length}`, {
        x: 50,
        y: height - 180,
        size: 10,
        font: font,
        color: rgb(0.5, 0.5, 0.5)
    });
    
    const warningText = [
        'PRIVACY NOTICE:',
        '',
        '• Sensitive personal information has been replaced with secure tokens',
        '• The original document owner can restore the data using their encryption key',
        '• This document is safe to share with third-party services',
        '• Redacted by GoCalma Privacy Tool (https://github.com/gocalma)',
        '',
        'Categories of redacted information:',
    ];
    
    let yPos = height - 220;
    for (const line of warningText) {
        noticePage.drawText(line, {
            x: 50,
            y: yPos,
            size: 10,
            font: line.startsWith('•') ? font : boldFont
        });
        yPos -= 20;
    }
    
    // List redacted categories
    const categories = [...new Set(entities.filter(e => e.selected).map(e => e.label))];
    for (const category of categories) {
        const count = entities.filter(e => e.selected && e.label === category).length;
        noticePage.drawText(`  - ${category}: ${count} item(s)`, {
            x: 50,
            y: yPos,
            size: 9,
            font: font,
            color: rgb(0.3, 0.3, 0.3)
        });
        yPos -= 18;
    }
    
    // Add content pages with redacted text
    const lines = redactedText.split('\n');
    const maxWidth = width - 100;
    const lineHeight = 16;
    const maxLinesPerPage = Math.floor((height - 100) / lineHeight);
    
    let currentPage = pdfDoc.addPage([595, 842]);
    let currentY = height - 50;
    let lineCount = 0;
    
    for (const line of lines) {
        // Handle page breaks
        if (lineCount >= maxLinesPerPage) {
            currentPage = pdfDoc.addPage([595, 842]);
            currentY = height - 50;
            lineCount = 0;
        }
        
        // Word wrap long lines
        const words = line.split(' ');
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);
            
            if (textWidth > maxWidth && currentLine) {
                // Draw current line and start new one
                currentPage.drawText(currentLine, {
                    x: 50,
                    y: currentY,
                    size: fontSize,
                    font: font,
                    color: fontColor
                });
                currentY -= lineHeight;
                lineCount++;
                currentLine = word;
                
                // Check page break
                if (lineCount >= maxLinesPerPage) {
                    currentPage = pdfDoc.addPage([595, 842]);
                    currentY = height - 50;
                    lineCount = 0;
                }
            } else {
                currentLine = testLine;
            }
        }
        
        // Draw remaining text
        if (currentLine) {
            // Highlight redaction tokens in red
            if (currentLine.includes('[REDACTED_')) {
                const parts = currentLine.split(/(\[REDACTED_[^\]]+\])/);
                let xPos = 50;
                
                for (const part of parts) {
                    const isRedacted = part.startsWith('[REDACTED_');
                    currentPage.drawText(part, {
                        x: xPos,
                        y: currentY,
                        size: fontSize,
                        font: isRedacted ? boldFont : font,
                        color: isRedacted ? rgb(0.8, 0, 0) : fontColor
                    });
                    xPos += font.widthOfTextAtSize(part, fontSize);
                }
            } else {
                currentPage.drawText(currentLine, {
                    x: 50,
                    y: currentY,
                    size: fontSize,
                    font: font,
                    color: fontColor
                });
            }
        }
        
        currentY -= lineHeight;
        lineCount++;
    }
    
    // Add footer watermark on each page
    if (addWatermark) {
        const pages = pdfDoc.getPages();
        for (const page of pages) {
            page.drawText('Generated by GoCalma Privacy Tool', {
                x: 50,
                y: 20,
                size: 8,
                font: font,
                color: rgb(0.7, 0.7, 0.7)
            });
        }
    }
    
    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

/**
 * Create a simple text-based PDF (fallback method)
 * @param {string} text - Text content
 * @param {string} title - PDF title
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function createSimplePDF(text, title = 'Document') {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const lines = text.split('\n');
    const fontSize = 12;
    const lineHeight = 16;
    
    let page = pdfDoc.addPage([595, 842]);
    let { width, height } = page.getSize();
    let y = height - 50;
    
    // Add title
    page.drawText(title, {
        x: 50,
        y: y,
        size: 18,
        font: await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    });
    
    y -= 40;
    
    // Add content
    for (const line of lines) {
        if (y < 50) {
            page = pdfDoc.addPage([595, 842]);
            y = height - 50;
        }
        
        page.drawText(line, {
            x: 50,
            y: y,
            size: fontSize,
            font: font
        });
        
        y -= lineHeight;
    }
    
    return await pdfDoc.save();
}

/**
 * Download PDF file
 * @param {Uint8Array} pdfBytes - PDF data
 * @param {string} filename - Output filename
 */
export function downloadPDF(pdfBytes, filename) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
