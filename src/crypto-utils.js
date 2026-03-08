/**
 * Cryptography utilities using Web Crypto API
 * Implements AES-256-GCM for secure, authenticated encryption
 */

/**
 * Generate a cryptographically secure random encryption key
 * @returns {Promise<CryptoKey>} AES-GCM key
 */
export async function generateEncryptionKey() {
    return await crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256
        },
        true, // extractable
        ['encrypt', 'decrypt']
    );
}

/**
 * Export key to raw format for storage
 * @param {CryptoKey} key - The encryption key
 * @returns {Promise<ArrayBuffer>} Raw key bytes
 */
export async function exportKey(key) {
    return await crypto.subtle.exportKey('raw', key);
}

/**
 * Import key from raw format
 * @param {ArrayBuffer} rawKey - Raw key bytes
 * @returns {Promise<CryptoKey>} Imported key
 */
export async function importKey(rawKey) {
    return await crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a string value
 * @param {string} plaintext - The text to encrypt
 * @param {CryptoKey} key - The encryption key
 * @returns {Promise<Object>} Object containing {ciphertext, iv}
 */
export async function encrypt(plaintext, key) {
    // Generate random IV (initialization vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encode plaintext to bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        data
    );
    
    return {
        ciphertext: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv)
    };
}

/**
 * Decrypt an encrypted value
 * @param {string} ciphertextB64 - Base64 encoded ciphertext
 * @param {string} ivB64 - Base64 encoded IV
 * @param {CryptoKey} key - The encryption key
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decrypt(ciphertextB64, ivB64, key) {
    const ciphertext = base64ToArrayBuffer(ciphertextB64);
    const iv = base64ToArrayBuffer(ivB64);
    
    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        ciphertext
    );
    
    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
}

/**
 * Convert ArrayBuffer to Base64 string
 * @param {ArrayBuffer} buffer
 * @returns {string} Base64 string
 */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Convert key to hex string for display/export
 * @param {CryptoKey} key - The encryption key
 * @returns {Promise<string>} Hex string representation
 */
export async function keyToHex(key) {
    const rawKey = await exportKey(key);
    const bytes = new Uint8Array(rawKey);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Import key from hex string
 * @param {string} hexString - Hex string representation
 * @returns {Promise<CryptoKey>} Imported key
 */
export async function hexToKey(hexString) {
    const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    return await importKey(bytes.buffer);
}

/**
 * Create a downloadable key file
 * @param {CryptoKey} key - The encryption key
 * @param {Object} mapping - The redaction mapping
 * @param {string} originalFilename - Original PDF filename
 * @returns {Promise<Object>} Key file data
 */
export async function createKeyFile(key, mapping, originalFilename) {
    const hexKey = await keyToHex(key);
    
    return {
        version: '1.0',
        algorithm: 'AES-256-GCM',
        originalDocument: originalFilename,
        timestamp: new Date().toISOString(),
        key: hexKey,
        mapping: mapping,
        instructions: [
            'This file contains the encryption key to restore redacted information.',
            'Store this file securely - without it, redacted data cannot be recovered.',
            'Do not share this key file with anyone.',
            'Recommended: Store in password manager or encrypted storage.'
        ]
    };
}
