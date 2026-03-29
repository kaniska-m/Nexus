// ============================================================================
// GET /api/vendors — List vendors with related counts
// ============================================================================

export const dynamic = 'force-dynamic'; // Disable Next.js route caching

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, { ...options, cache: 'no-store' });
    },
  },
});

export async function GET() {
  console.log("==== NEXTJS API ROUTE EXECUTING ====");
  try {
    // Fetch all vendors
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!vendors || vendors.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const vendorIds = vendors.map((v) => v.id);

    // Fetch related data in parallel
    const [checklistRes, fraudRes, auditRes, exceptionsRes] = await Promise.all([
      supabase.from('checklist_items').select('*').in('vendor_id', vendorIds),
      supabase.from('fraud_flags').select('*').in('vendor_id', vendorIds),
      supabase.from('audit_logs').select('*').in('vendor_id', vendorIds).order('created_at', { ascending: true }),
      supabase.from('exceptions').select('*').in('vendor_id', vendorIds),
    ]);

    const groupBy = (arr: any[], key: string) =>
      (arr || []).reduce((acc: any, item: any) => {
        const k = item[key];
        if (!acc[k]) acc[k] = [];
        acc[k].push(item);
        return acc;
      }, {});

    const checklistByVendor = groupBy(checklistRes.data || [], 'vendor_id');
    const fraudByVendor = groupBy(fraudRes.data || [], 'vendor_id');
    const auditByVendor = groupBy(auditRes.data || [], 'vendor_id');
    const exceptionsByVendor = groupBy(exceptionsRes.data || [], 'vendor_id');

    // Reshape to match frontend expectations
    const enriched = vendors.map((v) => ({
      ...v,
      vendor_id: v.id,
      checklist: checklistByVendor[v.id] || [],
      fraud_flags: fraudByVendor[v.id] || [],
      audit_log: (auditByVendor[v.id] || []).map((a: any) => ({
        agent: a.agent,
        action: a.action,
        reason: a.reason,
        timestamp: a.created_at,
      })),
      exceptions: exceptionsByVendor[v.id] || [],
    }));

    return NextResponse.json({ data: { vendors: enriched, total: enriched.length } });
  } catch (err) {
    console.error('[Vendors API]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
