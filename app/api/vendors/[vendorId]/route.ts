// ============================================================================
// GET + PATCH /api/vendors/[vendorId]
// Vendor detail and human approval/rejection
// ============================================================================

export const dynamic = 'force-dynamic'; // Disable Next.js route caching

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const { vendorId } = params;

    const [vendorRes, checklistRes, fraudRes, auditRes, exceptionsRes] = await Promise.all([
      supabase.from('vendors').select('*').eq('id', vendorId).single(),
      supabase.from('checklist_items').select('*').eq('vendor_id', vendorId).order('category'),
      supabase.from('fraud_flags').select('*').eq('vendor_id', vendorId),
      supabase.from('audit_logs').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: true }),
      supabase.from('exceptions').select('*').eq('vendor_id', vendorId),
    ]);

    if (vendorRes.error || !vendorRes.data) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const vendor = vendorRes.data;

    return NextResponse.json({
      data: {
        ...vendor,
        vendor_id: vendor.id,
        checklist: checklistRes.data || [],
        fraud_flags: fraudRes.data || [],
        audit_log: (auditRes.data || []).map((a: any) => ({
          agent: a.agent,
          action: a.action,
          reason: a.reason,
          timestamp: a.created_at,
        })),
        exceptions: exceptionsRes.data || [],
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const { vendorId } = params;
    const body = await request.json();
    const { action, email, reason } = body;

    if (action === 'approve') {
      await supabase
        .from('vendors')
        .update({ workflow_status: 'complete', escalation_level: 0 })
        .eq('id', vendorId);

      await supabase.from('audit_logs').insert({
        vendor_id: vendorId,
        agent: 'Orchestrator',
        action: `Human approval: ${email || 'compliance officer'} approved this vendor. ${reason || ''}`.trim(),
      });

      // Resolve exceptions
      await supabase
        .from('exceptions')
        .update({ resolution: 'Approved by human review', resolved_at: new Date().toISOString() })
        .eq('vendor_id', vendorId)
        .is('resolved_at', null);

      return NextResponse.json({ status: 'approved' });
    }

    if (action === 'reject') {
      await supabase
        .from('vendors')
        .update({ workflow_status: 'halted' })
        .eq('id', vendorId);

      await supabase.from('audit_logs').insert({
        vendor_id: vendorId,
        agent: 'Orchestrator',
        action: `Human rejection: ${email || 'compliance officer'} rejected this vendor. Reason: ${reason || 'Not specified'}`,
      });

      return NextResponse.json({ status: 'rejected' });
    }

    // Generic update
    const updateFields: any = {};
    if (body.workflow_status) updateFields.workflow_status = body.workflow_status;
    if (body.current_step !== undefined) updateFields.current_step = body.current_step;
    if (body.risk_score) updateFields.risk_score = body.risk_score;
    if (body.health_status) updateFields.health_status = body.health_status;

    if (Object.keys(updateFields).length > 0) {
      await supabase.from('vendors').update(updateFields).eq('id', vendorId);
    }

    return NextResponse.json({ status: 'updated' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
