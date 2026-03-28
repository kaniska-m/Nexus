// ============================================================================
// Nexus — Simulated Indian Government API Tools
// Realistic mock data with configurable error rates for demo
// ============================================================================

function random(): number {
  return Math.random();
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

const COMPANY_SUFFIXES = ['Solutions', 'Industries', 'Enterprises', 'Corp', 'Technologies'];
const INDIAN_NAMES = [
  'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sunita Desai',
  'Vikram Singh', 'Anjali Mehta', 'Suresh Reddy', 'Meera Iyer',
];
const BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
  'Punjab National Bank', 'Bank of Baroda', 'Kotak Mahindra Bank',
];

// ── MCA21 (Ministry of Corporate Affairs) ───────────────────────────────────

export interface MCAResult {
  found: boolean;
  companyName?: string;
  cinNumber?: string;
  directors?: string[];
  status?: string;
  registeredAddress?: string;
  incorporationDate?: string;
  mismatch?: boolean;
}

export function checkMCA21(companyName: string, cinNumber: string): MCAResult {
  const r = random();

  if (r < 0.88) {
    // Match
    return {
      found: true,
      companyName,
      cinNumber,
      directors: [randomPick(INDIAN_NAMES), randomPick(INDIAN_NAMES)],
      status: 'Active',
      registeredAddress: `${Math.floor(random() * 500) + 1}, Industrial Area, ${randomPick(['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Ahmedabad'])}`,
      incorporationDate: `${2015 + Math.floor(random() * 8)}-0${Math.floor(random() * 9) + 1}-${Math.floor(random() * 28) + 1}`,
    };
  } else if (r < 0.95) {
    // Director name mismatch (triggers fraud check)
    return {
      found: true,
      companyName,
      cinNumber,
      directors: [`${randomPick(INDIAN_NAMES)} [MISMATCH]`, randomPick(INDIAN_NAMES)],
      status: 'Active',
      registeredAddress: `${Math.floor(random() * 500) + 1}, Tech Park, Bangalore`,
      mismatch: true,
    };
  } else {
    // Not found
    return { found: false };
  }
}

// ── GSTN (GST Network) ─────────────────────────────────────────────────────

export interface GSTNResult {
  valid: boolean;
  gstNumber?: string;
  legalName?: string;
  registrationDate?: string;
  status?: string;
  returnsFiled?: boolean;
  mismatch?: boolean;
  reason?: string;
}

export function checkGSTN(gstNumber: string, companyName?: string): GSTNResult {
  const r = random();

  if (r < 0.80) {
    // Valid and matching
    return {
      valid: true,
      gstNumber,
      legalName: companyName || 'Registered Legal Entity',
      registrationDate: `${2017 + Math.floor(random() * 6)}-0${Math.floor(random() * 9) + 1}-01`,
      status: 'Active',
      returnsFiled: true,
    };
  } else if (r < 0.95) {
    // Name mismatch — triggers fraud flag
    const fakeName = `${randomPick(COMPANY_SUFFIXES)} ${randomPick(COMPANY_SUFFIXES)} Pvt Ltd`;
    return {
      valid: true,
      gstNumber,
      legalName: fakeName,
      registrationDate: `2019-03-15`,
      status: 'Active',
      returnsFiled: true,
      mismatch: true,
    };
  } else {
    // Not found
    return { valid: false, reason: 'GST number not found in GSTN registry' };
  }
}

// ── CDSCO (Central Drugs Standard Control Organization) ─────────────────────

export interface CDSCOResult {
  valid: boolean;
  licenceNumber?: string;
  licenceType?: string;
  companyName?: string;
  expiryDate?: string;
  products?: string[];
  reason?: string;
  mismatch?: boolean;
}

export function checkCDSCO(licenceNumber: string, companyName: string): CDSCOResult {
  const r = random();
  const futureDate = new Date(Date.now() + (365 + Math.floor(random() * 1000)) * 86400000).toISOString().slice(0, 10);
  const pastDate = new Date(Date.now() - Math.floor(random() * 365) * 86400000).toISOString().slice(0, 10);

  if (r < 0.88) {
    // Valid
    return {
      valid: true,
      licenceNumber,
      licenceType: randomPick(['Manufacturing', 'Import', 'Distribution']),
      companyName,
      expiryDate: futureDate,
      products: [randomPick(['Paracetamol', 'Metformin', 'Amoxicillin', 'Surgical Gloves', 'Diagnostic Kit'])],
    };
  } else if (r < 0.95) {
    // Expired
    return {
      valid: false,
      licenceNumber,
      licenceType: 'Manufacturing',
      companyName,
      expiryDate: pastDate,
      reason: `Licence expired on ${pastDate}. Renewal application not found.`,
    };
  } else {
    // Company name mismatch
    return {
      valid: true,
      licenceNumber,
      licenceType: 'Manufacturing',
      companyName: `${randomPick(COMPANY_SUFFIXES)} Pharma Ltd`,
      expiryDate: futureDate,
      mismatch: true,
    };
  }
}

// ── Sanction List (RBI / MCA / OpenSanctions) ──────────────────────────────

export interface SanctionResult {
  flagged: boolean;
  matchedEntity?: string;
  source?: string;
  reason?: string;
  confidence?: number;
}

export function checkSanctionList(entityName: string, directors: string[] = []): SanctionResult {
  const r = random();

  if (r < 0.94) {
    // Clean
    return {
      flagged: false,
      source: 'RBI/MCA Sanction DB + OpenSanctions',
    };
  } else {
    // Flagged
    const matched = random() > 0.5 && directors.length > 0
      ? randomPick(directors)
      : entityName;
    return {
      flagged: true,
      matchedEntity: matched,
      source: randomPick(['RBI Sanction List', 'MCA Strike-Off Registry', 'OpenSanctions PEP Database']),
      reason: randomPick([
        'Regulatory violation 2024 — non-compliance with RBI circular',
        'Director linked to entity under PMLA investigation',
        'Company name matches partial entry in OFAC SDN list',
        'PEP match — director held government position within 5 years',
      ]),
      confidence: 0.7 + random() * 0.25,
    };
  }
}

// ── Bank Account Verification ───────────────────────────────────────────────

export interface BankResult {
  valid: boolean;
  bankName?: string;
  accountHolderName?: string;
  ifscCode?: string;
  mismatch?: boolean;
}

export function checkBankAccount(accountNumber: string, ifscCode: string, companyName?: string): BankResult {
  const r = random();
  const bank = randomPick(BANKS);

  if (r < 0.85) {
    // Valid — name matches
    return {
      valid: true,
      bankName: bank,
      accountHolderName: companyName || 'Account Holder',
      ifscCode,
    };
  } else {
    // Name mismatch
    return {
      valid: true,
      bankName: bank,
      accountHolderName: `${randomPick(INDIAN_NAMES)} / ${randomPick(COMPANY_SUFFIXES)} LLC`,
      ifscCode,
      mismatch: true,
    };
  }
}
