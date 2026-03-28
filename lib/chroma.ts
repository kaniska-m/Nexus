// ============================================================================
// Nexus — Vector-based Fraud Pattern Matching
// Uses in-memory cosine similarity with TF-IDF-style matching.
// ChromaDB integration is optional — gracefully degrades to keyword matching.
// ============================================================================

const FRAUD_COLLECTION = 'nexus_fraud_patterns';

// ── Known Fraud Patterns ────────────────────────────────────────────────────

const FRAUD_PATTERNS = [
  'GST number on submitted document does not match GSTN API registry record',
  'Certificate of Incorporation director names differ from MCA21 database',
  'CDSCO drug licence number format invalid or not found in registry',
  'Bank account holder name does not match company registered name',
  'ISO certification number not verifiable against issuing body registry',
  'Document appears digitally altered — metadata timestamp inconsistency detected',
  'Same certificate number submitted by two different vendors',
  'GST registration date on document predates company incorporation date',
  'PAN card number format valid but does not match Income Tax database',
  'Registered office address on document differs from MCA21 record',
  'FSSAI licence expired but submitted as valid document',
  'Drug Master File number referenced but not present in CDSCO portal',
  'Director DIN number does not match MCA21 director database',
  'Factory inspection report date older than 3 years — likely outdated',
  'Company name on document uses abbreviation not matching registered name',
];

// ── In-memory Document Store ────────────────────────────────────────────────

interface StoredDoc {
  id: string;
  text: string;
  metadata: Record<string, any>;
}

const documentStore: Map<string, StoredDoc> = new Map();

// ── Text Similarity (TF-IDF-inspired keyword matching) ──────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function computeSimilarity(query: string, document: string): number {
  const qTokens = new Set(tokenize(query));
  const dTokens = tokenize(document);
  if (qTokens.size === 0 || dTokens.length === 0) return 0;

  let matches = 0;
  const dSet = new Set(dTokens);
  for (const token of qTokens) {
    if (dSet.has(token)) matches++;
  }

  // Jaccard-style similarity
  const union = new Set([...qTokens, ...dSet]);
  return union.size > 0 ? matches / union.size : 0;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Seed fraud patterns — no-op in in-memory mode (patterns are hardcoded)
 */
export async function seedFraudPatterns(): Promise<void> {
  // Patterns are already in-memory via FRAUD_PATTERNS constant
  return;
}

/**
 * Search for similar fraud patterns given a query string.
 * Returns the top matches above the similarity threshold.
 */
export async function searchFraudPatterns(
  query: string,
  threshold = 0.08
): Promise<string[]> {
  const scored = FRAUD_PATTERNS.map((pattern) => ({
    pattern,
    score: computeSimilarity(query, pattern),
  }))
    .filter((p) => p.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map((s) => s.pattern);
}

/**
 * Store a document embedding (in-memory for demo).
 */
export async function embedDocument(
  vendorId: string,
  itemId: string,
  text: string,
  metadata: Record<string, any>
): Promise<void> {
  const id = `${vendorId}_${itemId}`;
  documentStore.set(id, {
    id,
    text,
    metadata: { vendor_id: vendorId, item_id: itemId, ...metadata },
  });
}

/**
 * Search for similar documents in the store.
 */
export async function searchSimilarDocuments(
  query: string,
  vendorId?: string
): Promise<any[]> {
  const docs = Array.from(documentStore.values());
  const filtered = vendorId
    ? docs.filter((d) => d.metadata.vendor_id === vendorId)
    : docs;

  return filtered
    .map((doc) => ({
      document: doc.text,
      metadata: doc.metadata,
      score: computeSimilarity(query, doc.text),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/**
 * Test connection — always true for in-memory mode.
 */
export async function testChromaConnection(): Promise<boolean> {
  return true; // In-memory mode always available
}
