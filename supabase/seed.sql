-- ============================================================================
-- Nexus — Seed Data
-- 3 realistic demo vendors with checklist, audit logs, fraud flags, etc.
-- ============================================================================

-- ── Vendor 1: Global Health Supplies Ltd (MedTech, active, Low risk) ────────

INSERT INTO vendors (id, vendor_name, industry, contact_email, contact_name, cin, gst_number, pan_number, registered_address, director_name, director_din, workflow_status, risk_score, risk_rationale, health_status, current_step, escalation_level, last_monitored, supplier_portal_link)
VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'Global Health Supplies Ltd',
  'MedTech',
  'compliance@globalhealth.in',
  'Dr. Ananya Sharma',
  'U33100MH2018PLC123456',
  '27AADCG1234F1ZA',
  'AADCG1234F',
  '401, Bioplex Tower, Andheri East, Mumbai 400069',
  'Dr. Rajesh Mehta',
  '03456789',
  'active',
  'Low',
  'All government registrations verified against MCA and GSTN databases. No sanctions matches found in OpenSanctions screening. ISO certifications valid. Company operational for 8+ years with clean compliance history.',
  'Green',
  4,
  0,
  now() - INTERVAL '2 hours',
  '/supplier/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'
);

-- Checklist items for Vendor 1
INSERT INTO checklist_items (vendor_id, category, document_name, description, required, status, api_to_check, verified_at) VALUES
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Legal Registration', 'Certificate of Incorporation', 'Company registration with MCA (Ministry of Corporate Affairs)', true, 'verified', 'MCA_API', now() - INTERVAL '6 hours'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Tax Compliance', 'GST Registration Certificate', 'Goods and Services Tax registration verification', true, 'verified', 'GSTN_API', now() - INTERVAL '5 hours 45 minutes'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Tax Compliance', 'PAN Card', 'Permanent Account Number verification via Income Tax portal', true, 'submitted', 'PAN_VERIFY', NULL),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Quality Standards', 'ISO 9001 Certificate', 'Quality Management System certification', true, 'submitted', NULL, NULL),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Regulatory', 'CDSCO Licence', 'Central Drugs Standard Control Organization manufacturing licence', true, 'pending', 'CDSCO_API', NULL),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Quality Standards', 'ISO 13485 Certificate', 'Medical Devices Quality Management', true, 'pending', NULL, NULL),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Regulatory', 'Drug Master File', 'API/excipient master file with CDSCO', false, 'pending', NULL, NULL),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Site Inspection', 'Factory Inspection Report', 'Latest WHO/CDSCO GMP inspection report', true, 'pending', NULL, NULL);

-- Audit logs for Vendor 1
INSERT INTO audit_logs (vendor_id, agent, action, reason, created_at) VALUES
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Orchestrator', 'Workflow initiated for Global Health Supplies Ltd', NULL, now() - INTERVAL '7 hours'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Orchestrator', 'MedTech compliance checklist generated — 8 items identified', NULL, now() - INTERVAL '6 hours 55 minutes'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Collector', 'Supplier portal link sent to compliance@globalhealth.in', NULL, now() - INTERVAL '6 hours 50 minutes'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Verifier', 'Certificate of Incorporation verified against MCA database', NULL, now() - INTERVAL '6 hours'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Verifier', 'GST Registration verified — GSTN status: Active', NULL, now() - INTERVAL '5 hours 45 minutes'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Verifier', 'PAN Card received — verification in progress via Income Tax portal', NULL, now() - INTERVAL '5 hours 30 minutes'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Verifier', 'ISO 9001 certificate received — manual review queued', NULL, now() - INTERVAL '5 hours 15 minutes'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Risk Scorer', 'Risk assessment complete: LOW risk. All government databases cross-referenced. No sanctions match.', NULL, now() - INTERVAL '5 hours'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Audit Agent', 'Audit trail compiled — 8 verification steps logged with timestamps and source APIs', NULL, now() - INTERVAL '4 hours 55 minutes');

-- Monitoring signal for Vendor 1
INSERT INTO monitoring_signals (vendor_id, signal_type, signal_value, trigger_condition, agent_response, severity)
VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'cert_expiry',
  '{"certificate": "ISO 9001", "expiry_date": "2026-04-25", "days_until_expiry": 28}'::jsonb,
  'days_until_expiry < 30',
  'Alert generated: ISO 9001 certificate expiring in 28 days. Notification sent to vendor and procurement team.',
  'amber'
);


-- ── Vendor 2: TechFlow Systems Pvt Ltd (IT, escalated, High risk) ───────────

INSERT INTO vendors (id, vendor_name, industry, contact_email, contact_name, cin, gst_number, pan_number, registered_address, director_name, director_din, workflow_status, risk_score, risk_rationale, health_status, current_step, escalation_level, last_monitored, supplier_portal_link)
VALUES (
  'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
  'TechFlow Systems Pvt Ltd',
  'IT',
  'onboarding@techflow.io',
  'Vikram Patel',
  'U72200DL2020PTC987654',
  '07AADCT1234F1Z5',
  'AADCT1234F',
  '12B, Cyber Hub, Sector 24, Gurugram, Haryana 122002',
  'Vikram Patel',
  '09876543',
  'escalated',
  'High',
  'CRITICAL: GST number on submitted document (07AADCT1234F1Z5) does not match GSTN API response (07AADCT1234F1Z6). Last digit discrepancy indicates potential document tampering. OpenSanctions screening flagged a partial name match for director — requires manual review. Company incorporated only 6 years ago with limited compliance track record.',
  'Red',
  3,
  3,
  now() - INTERVAL '30 minutes',
  '/supplier/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e'
);

-- Checklist items for Vendor 2
INSERT INTO checklist_items (id, vendor_id, category, document_name, description, required, status, api_to_check, verified_at, failure_reason) VALUES
('c1111111-1111-4111-8111-111111111111', 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Legal Registration', 'Certificate of Incorporation', 'Company registration with MCA', true, 'verified', 'MCA_API', now() - INTERVAL '4 hours', NULL),
('c2222222-2222-4222-8222-222222222222', 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Tax Compliance', 'GST Registration Certificate', 'GST registration verification via GSTN portal', true, 'failed', 'GSTN_API', NULL, 'Data mismatch: Document GST 07AADCT1234F1Z5 ≠ GSTN API 07AADCT1234F1Z6'),
('c3333333-3333-4333-8333-333333333333', 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Security', 'ISO 27001 Certificate', 'Information Security Management certification', true, 'pending', NULL, NULL, NULL),
('c4444444-4444-4444-8444-444444444444', 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Security', 'SOC 2 Type II Report', 'Service Organization Control audit report', true, 'pending', NULL, NULL, NULL),
('c5555555-5555-4555-8555-555555555555', 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Registration', 'MSME Certificate', 'Ministry of MSME registration', false, 'submitted', 'MSME_API', NULL, NULL),
('c6666666-6666-4666-8666-666666666666', 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Legal', 'Non-Disclosure Agreement', 'Signed NDA for data handling', true, 'verified', NULL, now() - INTERVAL '3 hours', NULL);

-- Fraud flag for Vendor 2
INSERT INTO fraud_flags (vendor_id, checklist_item_id, doc_name, flag_type, description, severity)
VALUES (
  'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
  'c2222222-2222-4222-8222-222222222222',
  'GST Registration Certificate',
  'data_mismatch',
  'GST number on PDF (07AADCT1234F1Z5) mismatches GSTN API (07AADCT1234F1Z6). Last character discrepancy. Possible document alteration or outdated certificate submitted.',
  'critical'
);

-- Exception for Vendor 2
INSERT INTO exceptions (vendor_id, exception_type, description, agent, level, requires_human)
VALUES (
  'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
  'verification_failure',
  'GST document verification failed with data mismatch. Director name partial match found in OpenSanctions PEP database. Automated verification halted at step 3. Manual compliance officer review required before proceeding.',
  'Risk Scorer',
  3,
  true
);

-- Audit logs for Vendor 2
INSERT INTO audit_logs (vendor_id, agent, action, reason, created_at) VALUES
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Orchestrator', 'Workflow initiated for TechFlow Systems Pvt Ltd', NULL, now() - INTERVAL '5 hours'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Orchestrator', 'IT compliance checklist generated — 6 items identified', NULL, now() - INTERVAL '4 hours 55 minutes'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Collector', 'Supplier portal link sent to onboarding@techflow.io', NULL, now() - INTERVAL '4 hours 50 minutes'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Collector', 'Documents received from supplier: CoI, GST, MSME, NDA', NULL, now() - INTERVAL '4 hours 15 minutes'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Verifier', 'Certificate of Incorporation verified against MCA database — CIN confirmed', NULL, now() - INTERVAL '4 hours'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Verifier', 'NDA reviewed and verified — signatures and clauses validated', NULL, now() - INTERVAL '3 hours 50 minutes'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Verifier', 'GST Registration FAILED — Data mismatch detected between PDF and GSTN API', 'Document GST: 07AADCT1234F1Z5, GSTN API: 07AADCT1234F1Z6. Last digit mismatch.', now() - INTERVAL '3 hours 30 minutes'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Verifier', 'Fraud flag raised for GST Registration Certificate — possible document alteration', 'Severity: Critical. Data mismatch pattern consistent with manual PDF editing.', now() - INTERVAL '3 hours 25 minutes'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Risk Scorer', 'Risk assessment: HIGH risk. Fraud indicator on GST doc + OpenSanctions partial match on director', 'Combining document fraud signal with PEP screening result yields elevated risk profile.', now() - INTERVAL '3 hours 15 minutes'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Risk Scorer', 'Escalation Level 3 triggered — human review required', 'Automated verification cannot proceed. Exception raised for compliance officer.', now() - INTERVAL '3 hours 10 minutes'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Audit Agent', 'Audit trail compiled with fraud detection evidence — 10 verification steps logged', NULL, now() - INTERVAL '3 hours'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Monitor', 'Health status changed to RED — active fraud investigation in progress', NULL, now() - INTERVAL '30 minutes');


-- ── Vendor 3: PharmaChem Gujarat Ltd (Pharma, complete, Medium risk) ────────

INSERT INTO vendors (id, vendor_name, industry, contact_email, contact_name, cin, gst_number, pan_number, registered_address, director_name, director_din, workflow_status, risk_score, risk_rationale, health_status, current_step, escalation_level, monitoring_notes, last_monitored, supplier_portal_link)
VALUES (
  'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f',
  'PharmaChem Gujarat Ltd',
  'Pharma',
  'regulatory@pharmachem.co.in',
  'Meera Desai',
  'L24100GJ2015PLC098765',
  '24AADCP5678G1ZB',
  'AADCP5678G',
  'Survey No. 45, GIDC Industrial Estate, Ankleshwar, Gujarat 393002',
  'Dr. Suresh Patel',
  '07654321',
  'complete',
  'Medium',
  'All documents verified and compliant. Company cleared initial onboarding. However, risk elevated from Low to Medium after post-onboarding monitoring detected a news article mentioning a regulatory inquiry by Gujarat FDA into batch quality. No formal action taken yet but risk trajectory is upward.',
  'Amber',
  7,
  0,
  'Risk drift detected on 2026-03-25. News mention of regulatory inquiry found via web scan. Risk score remains Medium but upward trend flagged. Renewal of Drug Licence recommended within 30 days.',
  now() - INTERVAL '1 hour',
  '/supplier/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f'
);

-- Checklist items for Vendor 3 (all verified)
INSERT INTO checklist_items (vendor_id, category, document_name, description, required, status, api_to_check, verified_at) VALUES
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Legal Registration', 'Certificate of Incorporation', 'Company registration with MCA', true, 'verified', 'MCA_API', now() - INTERVAL '3 days'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Tax Compliance', 'GST Registration Certificate', 'GST registration verification', true, 'verified', 'GSTN_API', now() - INTERVAL '3 days'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Tax Compliance', 'PAN Card', 'Permanent Account Number verification', true, 'verified', 'PAN_VERIFY', now() - INTERVAL '2 days 20 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Regulatory', 'Drug Manufacturing Licence', 'State FDA manufacturing licence for scheduled drugs', true, 'verified', 'FDA_API', now() - INTERVAL '2 days 18 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Quality Standards', 'WHO-GMP Certificate', 'WHO Good Manufacturing Practice certification', true, 'verified', NULL, now() - INTERVAL '2 days 15 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Environmental', 'Pollution Control Board NOC', 'Gujarat Pollution Control Board clearance', true, 'verified', NULL, now() - INTERVAL '2 days 12 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Regulatory', 'Export-Import Code', 'DGFT IEC for pharma exports', false, 'verified', 'DGFT_API', now() - INTERVAL '2 days 10 hours');

-- Monitoring signal for Vendor 3 (risk drift)
INSERT INTO monitoring_signals (vendor_id, signal_type, signal_value, trigger_condition, agent_response, severity)
VALUES (
  'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f',
  'risk_drift',
  '{"source": "news_scan", "headline": "Gujarat FDA initiates inquiry into PharmaChem batch quality reports", "sentiment": "negative", "confidence": 0.82, "url": "https://pharmanews.in/gujarat-fda-pharmachem-inquiry-2026", "detected_at": "2026-03-25T14:30:00Z"}'::jsonb,
  'negative_sentiment_score > 0.7 AND source = news',
  'Health status changed from Green to Amber. Risk score under review. Vendor flagged for enhanced monitoring cadence (daily instead of weekly). Procurement team notified.',
  'warning'
);

-- Audit logs for Vendor 3 (complete pipeline)
INSERT INTO audit_logs (vendor_id, agent, action, reason, created_at) VALUES
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Orchestrator', 'Workflow initiated for PharmaChem Gujarat Ltd', NULL, now() - INTERVAL '3 days 2 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Orchestrator', 'Pharma compliance checklist generated — 7 items identified including FDA and GMP requirements', NULL, now() - INTERVAL '3 days 1 hour 55 minutes'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Collector', 'Supplier portal link sent to regulatory@pharmachem.co.in', NULL, now() - INTERVAL '3 days 1 hour 50 minutes'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Collector', 'All 7 documents received from supplier within 4 hours', NULL, now() - INTERVAL '3 days'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Verifier', 'Certificate of Incorporation verified — CIN L24100GJ2015PLC098765 confirmed in MCA records', NULL, now() - INTERVAL '3 days'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Verifier', 'GST Registration verified — GSTN status: Active, filing up to date', NULL, now() - INTERVAL '2 days 23 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Verifier', 'PAN verified via Income Tax portal — status valid', NULL, now() - INTERVAL '2 days 20 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Verifier', 'Drug Manufacturing Licence verified — Licence No. GJ/FDA/MFG/2024/1234, valid until 2029', NULL, now() - INTERVAL '2 days 18 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Verifier', 'WHO-GMP Certificate verified — certification body NABCB accredited', NULL, now() - INTERVAL '2 days 15 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Verifier', 'All 7 documents verified successfully. Zero discrepancies found.', NULL, now() - INTERVAL '2 days 10 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Risk Scorer', 'Risk assessment complete: LOW risk. Clean compliance record across all government databases. No sanctions matches.', NULL, now() - INTERVAL '2 days 9 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Audit Agent', 'Full audit pack compiled — PDF report generated with 7 verification certificates and chain-of-custody', NULL, now() - INTERVAL '2 days 8 hours'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Monitor', 'Risk drift detected — news scan found negative sentiment article about Gujarat FDA inquiry. Health status changed Green → Amber. Risk score upgraded Low → Medium.', 'Source: pharmanews.in. Confidence: 0.82. Enhanced monitoring cadence activated.', now() - INTERVAL '1 hour');
