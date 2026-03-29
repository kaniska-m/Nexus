// ============================================================================
// POST /api/onboard — Orchestrator Agent
// Creates vendor, generates AI compliance checklist, inserts to Supabase
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callLLMJSON } from '@/lib/groq';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ChecklistItem {
  category: string;
  document_name: string;
  description: string;
  required: boolean;
  api_to_check: string | null;
}

// Hardcoded fallback checklist if Groq fails
function getFallbackChecklist(industry: string): ChecklistItem[] {
  const base: ChecklistItem[] = [
    { category: 'Legal Registration', document_name: 'Certificate of Incorporation', description: 'Company registration with MCA', required: true, api_to_check: 'MCA21' },
    { category: 'Tax Compliance', document_name: 'GST Registration Certificate', description: 'GST registration verification', required: true, api_to_check: 'GSTN' },
    { category: 'Tax Compliance', document_name: 'PAN Card', description: 'Permanent Account Number verification', required: true, api_to_check: null },
    { category: 'Legal', document_name: 'Board Resolution', description: 'Board resolution authorizing onboarding', required: true, api_to_check: null },
    { category: 'Financial', document_name: 'Bank Account Verification', description: 'Bank account details and verification', required: true, api_to_check: 'BANK' },
    { category: 'Financial', document_name: 'Audited Financial Statements', description: 'Last 2 years audited financials', required: true, api_to_check: null },
    { category: 'Quality Standards', document_name: 'ISO 9001 Certificate', description: 'Quality Management System certification', required: true, api_to_check: null },
    { category: 'Legal', document_name: 'Non-Disclosure Agreement', description: 'Signed NDA for data handling', required: true, api_to_check: null },
    { category: 'Compliance', document_name: 'Sanction List Screening', description: 'RBI/MCA/OFAC sanction list check', required: true, api_to_check: 'SANCTION' },
    { category: 'Registration', document_name: 'MSME Certificate', description: 'MSME Udyam registration if applicable', required: false, api_to_check: null },
  ];

  const industrySpecific: Record<string, ChecklistItem[]> = {
    MedTech: [
      { category: 'Regulatory', document_name: 'CDSCO Licence', description: 'Central Drugs manufacturing licence', required: true, api_to_check: 'CDSCO' },
      { category: 'Quality Standards', document_name: 'ISO 13485 Certificate', description: 'Medical Devices QMS', required: true, api_to_check: null },
    ],
    Pharma: [
      { category: 'Regulatory', document_name: 'Drug Manufacturing Licence', description: 'State FDA manufacturing licence', required: true, api_to_check: 'CDSCO' },
      { category: 'Quality Standards', document_name: 'WHO-GMP Certificate', description: 'WHO Good Manufacturing Practice', required: true, api_to_check: null },
    ],
    IT: [
      { category: 'Security', document_name: 'ISO 27001 Certificate', description: 'Information Security Management', required: true, api_to_check: null },
      { category: 'Security', document_name: 'SOC 2 Type II Report', description: 'Service Organization Control audit', required: true, api_to_check: null },
    ],
    FinTech: [
      { category: 'Regulatory', document_name: 'RBI Registration', description: 'Reserve Bank of India licence', required: true, api_to_check: null },
      { category: 'Security', document_name: 'PCI DSS Certificate', description: 'Payment Card Industry compliance', required: true, api_to_check: null },
    ],
  };

  return [...base, ...(industrySpecific[industry] || industrySpecific.IT || [])];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendor_name, industry, contact_email, contact_name, urgency } = body;

    if (!vendor_name || !industry) {
      return NextResponse.json(
        { error: 'vendor_name and industry are required' },
        { status: 400 }
      );
    }

    // 1. Generate AI checklist via Groq
    let checklist: ChecklistItem[];
    try {
      checklist = await callLLMJSON<ChecklistItem[]>(
        `Generate a compliance checklist for a ${industry} vendor named "${vendor_name}" in India. Include 12-16 items across categories: Legal Registration, Tax Compliance, Financial, Regulatory, Quality Standards, Site Inspection. Each item must have: { "category": string, "document_name": string, "description": string, "required": boolean, "api_to_check": "MCA21"|"GSTN"|"CDSCO"|"BANK"|"SANCTION"|null }. Return ONLY a JSON array, no markdown.`,
        'heavy',
        'You are the Nexus Orchestrator Agent. Generate precise industry-specific vendor compliance checklists for Indian regulatory requirements. Respond ONLY with a valid JSON array. No explanation, no markdown fences.'
      );

      if (!Array.isArray(checklist) || checklist.length < 5) {
        throw new Error('Invalid checklist format');
      }
    } catch (err) {
      console.warn('[Orchestrator] Groq checklist generation failed, using fallback:', (err as Error).message);
      checklist = getFallbackChecklist(industry);
    }

    // 2. Insert vendor
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert({
        vendor_name,
        industry,
        contact_email: contact_email || null,
        contact_name: contact_name || null,
        workflow_status: 'active',
        current_step: 0,
      })
      .select()
      .single();

    if (vendorError) throw new Error(vendorError.message);

    // 3. Insert checklist items
    const checklistRows = checklist.map((item) => ({
      vendor_id: vendor.id,
      category: item.category,
      document_name: item.document_name,
      description: item.description,
      required: item.required ?? true,
      status: 'pending',
      api_to_check: item.api_to_check || null,
    }));

    const { error: clError } = await supabase
      .from('checklist_items')
      .insert(checklistRows);
    if (clError) throw new Error(clError.message);

    // 4. Generate and update supplier portal link
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/supplier/${vendor.id}`;
    await supabase
      .from('vendors')
      .update({ supplier_portal_link: portalUrl })
      .eq('id', vendor.id);

    // 5. Insert audit log
    await supabase.from('audit_logs').insert({
      vendor_id: vendor.id,
      agent: 'Orchestrator',
      action: `Workflow initialized. Generated ${checklist.length}-item ${industry} compliance checklist for ${vendor_name}. Supplier portal link generated.`,
    });

    // 6. Fetch final checklist from DB
    const { data: savedChecklist } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('vendor_id', vendor.id);

    // 7. Send notification if email exists
    if (contact_email) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'onboarding_started',
            recipient_email: contact_email,
            data: { vendor_id: vendor.id, vendor_name, industry },
          }),
        });
      } catch (notifyErr) {
        console.error('Failed to trigger onboarding notification:', notifyErr);
      }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        vendor_id: vendor.id,
        vendor_name: vendor.vendor_name,
        industry: vendor.industry,
        workflow_status: vendor.workflow_status,
        checklist: savedChecklist || [],
        supplier_portal_url: portalUrl,
        audit_log: [{
          agent: 'Orchestrator',
          action: `Workflow initialized. Generated ${checklist.length}-item checklist.`,
          timestamp: new Date().toISOString(),
        }],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Orchestrator] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
