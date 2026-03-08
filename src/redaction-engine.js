/**
 * Redaction Engine
 * Core logic for redacting text and managing encrypted mappings
 */

import { generateEncryptionKey, encrypt, decrypt, createKeyFile } from './crypto-utils.js';

/**
 * Perform redaction on text with selected entities
 * @param {string} originalText - Original text content
 * @param {Array} entities - PII entities (with selection state)
 * @param {CryptoKey} encryptionKey - Encryption key
 * @returns {Promise<Object>} Redaction result
 */
export async function redactText(originalText, entities, encryptionKey) {
    // Filter selected entities and sort by position (reverse order for replacement)
    const selectedEntities = entities
        .filter(e => e.selected)
        .sort((a, b) => b.start - a.start);
    
    let redactedText = originalText;
    const mapping = {};
    
    // Replace each entity with a token
    for (let i = 0; i < selectedEntities.length; i++) {
        const entity = selectedEntities[i];
        
        // Create unique token
        const token = `[REDACTED_${entity.type}_${String(i).padStart(3, '0')}]`;
        
        // Encrypt the original value
        const encrypted = await encrypt(entity.value, encryptionKey);
        
        // Store in mapping
        mapping[token] = {
            encryptedValue: encrypted.ciphertext,
            iv: encrypted.iv,
            type: entity.type,
            label: entity.label,
            originalLength: entity.value.length
        };
        
        // Replace in text
        redactedText = 
            redactedText.substring(0, entity.start) +
            token +
            redactedText.substring(entity.end);
    }
    
    return {
        redactedText,
        mapping,
        stats: {
            totalEntities: entities.length,
            redactedEntities: selectedEntities.length,
            preservedEntities: entities.length - selectedEntities.length
        }
    };
}

/**
 * Un-redact text using encryption key and mapping
 * @param {string} redactedText - Redacted text with tokens
 * @param {Object} mapping - Redaction mapping
 * @param {CryptoKey} encryptionKey - Encryption key
 * @returns {Promise<string>} Original text
 */
export async function unredactText(redactedText, mapping, encryptionKey) {
    let originalText = redactedText;
    
    // Replace each token with decrypted value
    for (const [token, data] of Object.entries(mapping)) {
        try {
            const decrypted = await decrypt(
                data.encryptedValue,
                data.iv,
                encryptionKey
            );
            originalText = originalText.replace(token, decrypted);
        } catch (error) {
            console.error(`Failed to decrypt token ${token}:`, error);
            // Keep token in place if decryption fails
        }
    }
    
    return originalText;
}

/**
 * Create a complete redaction package
 * @param {string} originalText - Original text
 * @param {Array} entities - Detected PII entities
 * @param {string} originalFilename - Original PDF filename
 * @returns {Promise<Object>} Complete redaction package
 */
export async function createRedactionPackage(originalText, entities, originalFilename) {
    // Generate encryption key
    const encryptionKey = await generateEncryptionKey();
    
    // Perform redaction
    const result = await redactText(originalText, entities, encryptionKey);
    
    // Create key file
    const keyFile = await createKeyFile(
        encryptionKey,
        result.mapping,
        originalFilename
    );
    
    return {
        redactedText: result.redactedText,
        mapping: result.mapping,
        encryptionKey,
        keyFile,
        stats: result.stats
    };
}

/**
 * Validate a redaction mapping
 * @param {Object} mapping - Redaction mapping to validate
 * @returns {boolean} True if valid
 */
export function validateMapping(mapping) {
    if (!mapping || typeof mapping !== 'object') {
        return false;
    }
    
    for (const [token, data] of Object.entries(mapping)) {
        if (!token.startsWith('[REDACTED_')) {
            return false;
        }
        if (!data.encryptedValue || !data.iv || !data.type) {
            return false;
        }
    }
    
    return true;
}

/**
 * Generate statistics about redaction
 * @param {Object} mapping - Redaction mapping
 * @returns {Object} Statistics
 */
export function getRedactionStats(mapping) {
    const stats = {
        totalRedactions: Object.keys(mapping).length,
        byType: {},
        totalEncryptedBytes: 0
    };
    
    for (const [token, data] of Object.entries(mapping)) {
        stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;
        stats.totalEncryptedBytes += data.encryptedValue.length;
    }
    
    return stats;
}

/**
 * Preview redacted text with visual indicators
 * @param {string} redactedText - Redacted text
 * @param {Object} mapping - Redaction mapping
 * @returns {string} HTML-formatted preview
 */
export function createRedactionPreview(redactedText, mapping) {
    let preview = redactedText;
    
    // Replace tokens with styled spans
    for (const [token, data] of Object.entries(mapping)) {
        const replacement = `<span class="redaction-token" data-type="${data.type}" title="${data.label}">${token}</span>`;
        preview = preview.replace(token, replacement);
    }
    
    return preview;
}

/**
 * Export redaction data for storage
 * @param {Object} redactionPackage - Redaction package
 * @returns {Object} Exportable data
 */
export function exportRedactionData(redactionPackage) {
    return {
        version: '1.0',
        timestamp: new Date().toISOString(),
        redactedText: redactionPackage.redactedText,
        keyFile: redactionPackage.keyFile,
        stats: redactionPackage.stats
    };
}

/**
 * Download key file as JSON
 * @param {Object} keyFile - Key file data
 * @param {string} filename - Output filename
 */
export function downloadKeyFile(keyFile, filename) {
    const blob = new Blob([JSON.stringify(keyFile, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
