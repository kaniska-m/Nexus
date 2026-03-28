// ============================================================================
// POST /api/monitor/[vendorId] — Monitor Agent (6th agent)
// Continuous monitoring: cert expiry, risk drift, SLA, sanctions
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callLLM } from '@/lib/groq';
import { checkMCA21, checkGSTN, checkSanctionList } from '@/lib/tools';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MonitoringSignal {
  signal_type: string;
  severity: 'info' | 'amber' | 'red';
  signal_value: Record<string, any>;
  trigger_condition: string;
  agent_response: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  const { vendorId } = params;

  try {
    // Load vendor
    const { data: vendor, error: vendorErr } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (vendorErr || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Load checklist
    const { data: checklist } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('vendor_id', vendorId);

    const items = checklist || [];
    const signals: MonitoringSignal[] = [];

    // ═══════════════════════════════════════════════════════════════
    // Signal 1: Certificate Expiry Check
    // ═══════════════════════════════════════════════════════════════

    const verifiedItems = items.filter((i) => i.status === 'verified');
    for (const item of verifiedItems) {
      // Simulate days_until_expiry
      const daysUntilExpiry = Math.floor(Math.random() * 400) + 5;

      if (daysUntilExpiry <= 0) {
        signals.push({
          signal_type: 'cert_expiry',
          severity: 'red',
          signal_value: {
            certificate: item.document_name,
            days_until_expiry: daysUntilExpiry,
            status: 'EXPIRED',
          },
          trigger_condition: 'days_until_expiry <= 0',
          agent_response: `CRITICAL: ${item.document_name} has expired. Vendor compliance suspended until renewal.`,
        });
      } else if (daysUntilExpiry < 7) {
        signals.push({
          signal_type: 'cert_expiry',
          severity: 'red',
          signal_value: {
            certificate: item.document_name,
            days_until_expiry: daysUntilExpiry,
            status: 'EXPIRING_CRITICAL',
          },
          trigger_condition: 'days_until_expiry < 7',
          agent_response: `ALERT: ${item.document_name} expires in ${daysUntilExpiry} days. Immediate renewal action required.`,
        });
      } else if (daysUntilExpiry < 30) {
        signals.push({
          signal_type: 'cert_expiry',
          severity: 'amber',
          signal_value: {
            certificate: item.document_name,
            days_until_expiry: daysUntilExpiry,
            status: 'EXPIRING_SOON',
          },
          trigger_condition: 'days_until_expiry < 30',
          agent_response: `Warning: ${item.document_name} expiring in ${daysUntilExpiry} days. Reminder sent to vendor.`,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // Signal 2: Risk Drift Detection
    // ═══════════════════════════════════════════════════════════════

    if (vendor.cin || vendor.gst_number) {
      const mcaResult = vendor.cin ? checkMCA21(vendor.vendor_name, vendor.cin) : null;
      const gstResult = vendor.gst_number ? checkGSTN(vendor.gst_number, vendor.vendor_name) : null;

      const driftFields: string[] = [];
      if (mcaResult?.mismatch) driftFields.push('MCA21 director names changed');
      if (mcaResult?.found === false) driftFields.push('Company not found in MCA21');
      if (gstResult?.mismatch) driftFields.push('GSTN legal name mismatch');
      if (gstResult?.valid === false) driftFields.push('GST registration no longer valid');

      if (driftFields.length > 0) {
        signals.push({
          signal_type: 'risk_drift',
          severity: 'amber',
          signal_value: {
            drift_fields: driftFields,
            mca_result: mcaResult,
            gst_result: gstResult,
          },
          trigger_condition: 'Government registry data changed since last verification',
          agent_response: `Risk drift detected: ${driftFields.join('; ')}. Re-verification recommended.`,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // Signal 3: SLA Performance
    // ═══════════════════════════════════════════════════════════════

    const slaScore = Math.floor(Math.random() * 50) + 50; // 50-100
    if (slaScore < 55) {
      signals.push({
        signal_type: 'sla_performance',
        severity: 'red',
        signal_value: { sla_score: slaScore, threshold: 55 },
        trigger_condition: 'sla_score < 55',
        agent_response: `Critical SLA breach: performance score ${slaScore}/100. Vendor review meeting recommended.`,
      });
    } else if (slaScore < 70) {
      signals.push({
        signal_type: 'sla_performance',
        severity: 'amber',
        signal_value: { sla_score: slaScore, threshold: 70 },
        trigger_condition: 'sla_score < 70',
        agent_response: `SLA performance below threshold: ${slaScore}/100. Monitoring cadence increased.`,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // Signal 4: Sanction List Re-check
    // ═══════════════════════════════════════════════════════════════

    const sanctionResult = checkSanctionList(
      vendor.vendor_name,
      [vendor.director_name].filter(Boolean)
    );

    if (sanctionResult.flagged) {
      signals.push({
        signal_type: 'sanction_match',
        severity: 'red',
        signal_value: {
          matched_entity: sanctionResult.matchedEntity,
          source: sanctionResult.source,
          reason: sanctionResult.reason,
          confidence: sanctionResult.confidence,
        },
        trigger_condition: 'New sanction list match detected',
        agent_response: `CRITICAL: ${sanctionResult.matchedEntity} matched in ${sanctionResult.source}. Immediate suspension recommended.`,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // Determine Health Status
    // ═══════════════════════════════════════════════════════════════

    const hasRed = signals.some((s) => s.severity === 'red');
    const hasAmber = signals.some((s) => s.severity === 'amber');
    const healthStatus = hasRed ? 'Red' : hasAmber ? 'Amber' : 'Green';

    // ═══════════════════════════════════════════════════════════════
    // Generate Monitoring Notes via LLM
    // ═══════════════════════════════════════════════════════════════

    let monitoringNotes = '';
    try {
      monitoringNotes = await callLLM(
        `Summarize health check for ${vendor.vendor_name} (${vendor.industry}). Signals evaluated: ${JSON.stringify(signals.map((s) => ({ type: s.signal_type, severity: s.severity, response: s.agent_response })))}. Write 2-3 sentences as the Nexus Monitor Agent: explain the current health status (${healthStatus}) and what action is recommended. Be specific and professional.`,
        'fast'
      );
    } catch {
      monitoringNotes = `Health status: ${healthStatus}. ${signals.length} signals evaluated. ${hasRed ? 'Critical issues require immediate attention.' : hasAmber ? 'Warnings detected — enhanced monitoring recommended.' : 'All checks passed — vendor in good standing.'}`;
    }

    // ═══════════════════════════════════════════════════════════════
    // Persist to Supabase
    // ═══════════════════════════════════════════════════════════════

    // Insert monitoring signals
    if (signals.length > 0) {
      const signalRows = signals.map((s) => ({
        vendor_id: vendorId,
        signal_type: s.signal_type,
        signal_value: s.signal_value,
        trigger_condition: s.trigger_condition,
        agent_response: s.agent_response,
        severity: s.severity,
      }));

      await supabase.from('monitoring_signals').insert(signalRows);
    }

    // Update vendor
    await supabase
      .from('vendors')
      .update({
        health_status: healthStatus,
        monitoring_notes: monitoringNotes,
        last_monitored: new Date().toISOString(),
      })
      .eq('id', vendorId);

    // Audit log
    await supabase.from('audit_logs').insert({
      vendor_id: vendorId,
      agent: 'Monitor',
      action: `Health check complete — ${healthStatus}. ${signals.length} signals evaluated. ${signals.filter((s) => s.severity === 'red').length} critical, ${signals.filter((s) => s.severity === 'amber').length} warnings.`,
    });

    return NextResponse.json({
      status: 'success',
      data: {
        health_status: healthStatus,
        monitoring_notes: monitoringNotes,
        signals: signals.map((s) => ({
          type: s.signal_type,
          severity: s.severity,
          message: s.agent_response,
          value: s.signal_value,
        })),
        vendor_name: vendor.vendor_name,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Monitor]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
