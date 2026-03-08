/**
 * PII Detection Engine
 * Hybrid approach: Rule-based patterns (primary) + Optional AI enhancement
 * Supports: English, German, French, Italian, Spanish
 */

// AI model is optional - will try to load but won't break if it fails
let nerPipeline = null;
let aiAvailable = false;

/**
 * Initialize the NER model (optional - graceful degradation)
 * @param {Function} progressCallback - Called with loading progress
 * @returns {Promise<void>}
 */
export async function initializeModel(progressCallback) {
    if (nerPipeline) return;
    
    try {
        if (progressCallback) {
            progressCallback('Loading AI model (optional)...');
        }
        
        // Lazy load transformers only if available
        const { pipeline } = await import('@xenova/transformers');
        
        nerPipeline = await pipeline(
            'token-classification',
            'Xenova/bert-base-NER',
            {
                progress_callback: (progress) => {
                    if (progressCallback && progress.status === 'progress') {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        progressCallback(`Downloading AI model: ${percent}%`);
                    }
                }
            }
        );
        
        aiAvailable = true;
        if (progressCallback) {
            progressCallback('AI model loaded successfully');
        }
    } catch (error) {
        console.warn('AI model not available, using rule-based detection only:', error);
        aiAvailable = false;
        if (progressCallback) {
            progressCallback('Using rule-based PII detection');
        }
    }
}

/**
 * Rule-based PII patterns for high-precision detection
 * This is our primary detection method - works without AI
 */
const PII_PATTERNS = {
    email: {
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        type: 'EMAIL',
        label: 'Email Address'
    },
    phone: {
        // International phone numbers
        regex: /(\+?\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g,
        type: 'PHONE',
        label: 'Phone Number'
    },
    iban: {
        // European IBAN format
        regex: /\b[A-Z]{2}\d{2}\s?(\d{4}\s?){3,7}\d{1,4}\b/g,
        type: 'IBAN',
        label: 'IBAN'
    },
    creditCard: {
        // Credit card numbers (with optional spaces/dashes)
        regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        type: 'CREDIT_CARD',
        label: 'Credit Card'
    },
    ssn: {
        // US Social Security Number
        regex: /\b\d{3}-\d{2}-\d{4}\b/g,
        type: 'SSN',
        label: 'Social Security Number'
    },
    ahv: {
        // Swiss AHV/AVS number
        regex: /\b756\.\d{4}\.\d{4}\.\d{2}\b/g,
        type: 'AHV',
        label: 'Swiss AHV/AVS Number'
    },
    passport: {
        // Generic passport number patterns
        regex: /\b[A-Z]{1,2}\d{6,9}\b/g,
        type: 'PASSPORT',
        label: 'Passport Number'
    },
    postalCode: {
        // European postal codes (5-digit format common in DE, CH, etc.)
        regex: /\b\d{5}\b/g,
        type: 'POSTAL_CODE',
        label: 'Postal Code'
    },
    dateOfBirth: {
        // Common date formats
        regex: /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/g,
        type: 'DATE',
        label: 'Date'
    },
    // Enhanced name detection
    fullName: {
        // Common name patterns (Title? FirstName LastName)
        regex: /\b(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)?\s*[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g,
        type: 'NAME',
        label: 'Person Name'
    },
    // Swiss/German addresses
    streetAddress: {
        regex: /\b[A-Z][a-zäöüß]+(?:strasse|straße|str\.|weg|platz|gasse)\s+\d{1,4}[a-z]?\b/gi,
        type: 'ADDRESS',
        label: 'Street Address'
    },
    // City with postal code
    cityPostal: {
        regex: /\b\d{4,5}\s+[A-Z][a-zäöüß]+\b/g,
        type: 'LOCATION',
        label: 'City/Location'
    },
    // Generic IDs
    idNumber: {
        regex: /\b(ID|Patient|Policy|Invoice|Account)[:\s-]*(No\.?|Number)?[\s-]*[A-Z0-9-]{5,20}\b/gi,
        type: 'ID',
        label: 'ID Number'
    }
};

/**
 * Detect PII using AI-based NER (if available)
 * @param {string} text - Input text
 * @returns {Promise<Array>} Detected entities with positions
 */
async function detectWithAI(text) {
    if (!nerPipeline || !aiAvailable) {
        console.log('AI detection not available, skipping');
        return [];
    }
    
    try {
        const results = await nerPipeline(text);
        const entities = [];
        let currentEntity = null;
        
        for (const result of results) {
            const piiType = mapEntityType(result.entity);
            if (!piiType) continue;
            
            if (currentEntity && 
                result.entity === currentEntity.rawType &&
                result.start <= currentEntity.end + 1) {
                currentEntity.end = result.end;
                currentEntity.word += text.slice(currentEntity.end, result.end);
            } else {
                if (currentEntity) {
                    entities.push(currentEntity);
                }
                currentEntity = {
                    value: result.word.replace(/^##/, ''),
                    type: piiType.type,
                    label: piiType.label,
                    start: result.start,
                    end: result.end,
                    score: result.score,
                    rawType: result.entity
                };
            }
        }
        
        if (currentEntity) {
            entities.push(currentEntity);
        }
        
        return entities;
    } catch (error) {
        console.warn('AI detection failed, using rules only:', error);
        return [];
    }
}

/**
 * Map NER entity types to our PII categories
 */
function mapEntityType(entityType) {
    const cleanType = entityType.replace(/^[BI]-/, '');
    
    const mapping = {
        'PER': { type: 'NAME', label: 'Person Name' },
        'PERSON': { type: 'NAME', label: 'Person Name' },
        'LOC': { type: 'LOCATION', label: 'Location' },
        'LOCATION': { type: 'LOCATION', label: 'Location' },
        'ORG': { type: 'ORGANIZATION', label: 'Organization' },
        'ORGANIZATION': { type: 'ORGANIZATION', label: 'Organization' },
        'MISC': { type: 'MISC', label: 'Miscellaneous' }
    };
    
    return mapping[cleanType] || null;
}

/**
 * Detect PII using rule-based patterns
 * This is our primary, reliable detection method
 * @param {string} text - Input text
 * @returns {Array} Detected entities
 */
function detectWithRules(text) {
    const entities = [];
    
    for (const [patternName, pattern] of Object.entries(PII_PATTERNS)) {
        const matches = [...text.matchAll(pattern.regex)];
        
        for (const match of matches) {
            // Skip very short matches that are likely false positives
            if (match[0].length < 3) continue;
            
            entities.push({
                value: match[0],
                type: pattern.type,
                label: pattern.label,
                start: match.index,
                end: match.index + match[0].length,
                score: 1.0,
                method: 'rule'
            });
        }
    }
    
    return entities;
}

/**
 * Merge and deduplicate entities from multiple sources
 */
function mergeEntities(aiEntities, ruleEntities) {
    const allEntities = [...aiEntities, ...ruleEntities];
    
    // Sort by position
    allEntities.sort((a, b) => a.start - b.start);
    
    // Remove overlaps (prefer higher confidence)
    const merged = [];
    for (const entity of allEntities) {
        const overlaps = merged.some(existing => 
            (entity.start >= existing.start && entity.start < existing.end) ||
            (entity.end > existing.start && entity.end <= existing.end)
        );
        
        if (!overlaps) {
            merged.push(entity);
        }
    }
    
    return merged;
}

/**
 * Main PII detection function
 * Uses rule-based patterns (always) + AI (if available)
 * @param {string} text - Input text
 * @param {Object} options - Detection options
 * @returns {Promise<Array>} Detected PII entities
 */
export async function detectPII(text, options = {}) {
    const {
        useAI = true,
        useRules = true,
        minConfidence = 0.7
    } = options;
    
    console.log('Starting PII detection...');
    console.log('AI available:', aiAvailable);
    
    // Rule-based detection (always runs, very reliable)
    const ruleEntities = useRules ? detectWithRules(text) : [];
    console.log('Rule-based detected:', ruleEntities.length, 'items');
    
    // AI-based detection (optional enhancement)
    let aiEntities = [];
    if (useAI && aiAvailable) {
        try {
            aiEntities = await detectWithAI(text);
            console.log('AI detected:', aiEntities.length, 'items');
        } catch (error) {
            console.warn('AI detection failed:', error);
        }
    }
    
    // Filter by confidence
    const filteredAI = aiEntities.filter(e => e.score >= minConfidence);
    
    // Merge results
    const mergedEntities = mergeEntities(filteredAI, ruleEntities);
    console.log('Total merged:', mergedEntities.length, 'items');
    
    // Add IDs and selection state
    return mergedEntities.map((entity, index) => ({
        ...entity,
        id: index,
        selected: true // Default: redact all
    }));
}

/**
 * Get statistics about detected PII
 */
export function getPIIStats(entities) {
    const stats = {
        total: entities.length,
        byType: {},
        selected: entities.filter(e => e.selected).length
    };
    
    for (const entity of entities) {
        stats.byType[entity.type] = (stats.byType[entity.type] || 0) + 1;
    }
    
    return stats;
}
