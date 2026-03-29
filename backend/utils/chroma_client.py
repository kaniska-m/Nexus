# ============================================================================
# Nexus — Chroma Vector DB Client
# Serves: Fraud pattern seeding and retrieval
# ============================================================================

import os
import logging
import chromadb

logger = logging.getLogger(__name__)

def get_chroma_client():
    """Initialize ChromaDB client (local persistence)."""
    try:
        # We use a simple persistent client for local storage
        client = chromadb.PersistentClient(path="./chroma_db")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Chroma: {e}")
        return None

FRAUD_PATTERNS = [
    {"id": "fp_01", "text": "GST mismatch: GSTN registry shows inactive status while submitted certificate is active", "metadata": {"severity": "high", "type": "data_mismatch"}},
    {"id": "fp_02", "text": "CDSCO manufacturing licence expired but vendor claims active status", "metadata": {"severity": "high", "type": "expired_document"}},
    {"id": "fp_03", "text": "Sanction list match: Director name matched against OFAC SDN list", "metadata": {"severity": "critical", "type": "sanctioned_entity"}},
    {"id": "fp_04", "text": "Bank account name mismatch: Beneficiary name differs from MCA21 company name", "metadata": {"severity": "high", "type": "finance_fraud"}},
    {"id": "fp_05", "text": "Metadata inconsistency: Document created directly before submission with recent modification date", "metadata": {"severity": "medium", "type": "forgery"}},
    {"id": "fp_06", "text": "Duplicate submission: Exact same document hash submitted across multiple vendor profiles", "metadata": {"severity": "medium", "type": "duplicate_identity"}},
    {"id": "fp_07", "text": "Shell company indicator: No website, generic email, and residential address in MCA21", "metadata": {"severity": "high", "type": "shell_company"}},
    {"id": "fp_08", "text": "ISO certificate fraud: Certification body not accredited or certificate number unverifiable", "metadata": {"severity": "medium", "type": "fake_certification"}},
    {"id": "fp_09", "text": "High risk jurisdiction: Ultimate beneficial owner located in sanctioned country", "metadata": {"severity": "critical", "type": "jurisdiction_risk"}},
    {"id": "fp_10", "text": "Address manipulation: Same physical location linked to multiple suspended vendors", "metadata": {"severity": "high", "type": "address_fraud"}},
    {"id": "fp_11", "text": "Financial discrepancy: Claimed revenue wildly inconsistent with GST filings", "metadata": {"severity": "medium", "type": "financial_discrepancy"}},
    {"id": "fp_12", "text": "Missing key personnel: No directors listed or directorships exceed legal limits", "metadata": {"severity": "medium", "type": "compliance_violation"}},
    {"id": "fp_13", "text": "Image tampering: Invisible text layers or altered seal detected in PDF", "metadata": {"severity": "high", "type": "document_tampering"}},
    {"id": "fp_14", "text": "Phishing risk: Contact email uses domain typosquatting of known brand", "metadata": {"severity": "medium", "type": "impersonation"}},
    {"id": "fp_15", "text": "Adverse media: Director involved in recent fraud investigation or CBI raid", "metadata": {"severity": "high", "type": "adverse_media"}},
]

def seed_fraud_patterns():
    """Seed Chroma DB with initial fraud patterns if not already populated."""
    client = get_chroma_client()
    if not client:
        return

    try:
        collections = client.list_collections()
        col_names = [c.name for c in collections]

        if "nexus_fraud_patterns" not in col_names:
            logger.info("Chroma collection 'nexus_fraud_patterns' not found. Seeding 15 fraud patterns...")
            collection = client.create_collection(
                name="nexus_fraud_patterns",
                metadata={"hnsw:space": "cosine"}
            )
            
            ids = [p["id"] for p in FRAUD_PATTERNS]
            texts = [p["text"] for p in FRAUD_PATTERNS]
            metadatas = [p["metadata"] for p in FRAUD_PATTERNS]
            
            collection.add(
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"✅ Successfully seeded {len(FRAUD_PATTERNS)} fraud patterns into Chroma.")
        else:
            logger.info("Chroma collection 'nexus_fraud_patterns' already exists. Skipping seed.")
    except Exception as e:
        logger.error(f"Error seeding Chroma fraud patterns: {e}")
