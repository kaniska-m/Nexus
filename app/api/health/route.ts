// ============================================================================
// GET /api/health — System health check
// Tests Supabase, Groq, and Chroma connections
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { testGroqConnection } from '@/lib/groq';
import { testChromaConnection } from '@/lib/chroma';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const results: Record<string, any> = {};

  // Test Supabase
  try {
    const { count, error } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true });
    results.supabase = error ? { status: 'error', error: error.message } : { status: 'connected', vendor_count: count };
  } catch (e) {
    results.supabase = { status: 'error', error: (e as Error).message };
  }

  // Test Groq
  try {
    const ok = await testGroqConnection();
    results.groq = { status: ok ? 'connected' : 'error', model_heavy: process.env.LLM_MODEL_HEAVY, model_light: process.env.LLM_MODEL_LIGHT };
  } catch (e) {
    results.groq = { status: 'error', error: (e as Error).message };
  }

  // Test Chroma
  try {
    const ok = await testChromaConnection();
    results.chroma = { status: ok ? 'connected' : 'unavailable (non-critical)' };
  } catch {
    results.chroma = { status: 'unavailable (non-critical)' };
  }

  const allOk = results.supabase?.status === 'connected' && results.groq?.status === 'connected';

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    services: results,
    agents: [
      { name: 'Orchestrator', role: 'Workflow initialization & checklist generation' },
      { name: 'Collector', role: 'Document collection & supplier portal management' },
      { name: 'Verifier', role: 'Government API verification & fraud detection' },
      { name: 'Risk Scorer', role: 'Risk assessment & sanction screening' },
      { name: 'Audit Agent', role: 'Compliance trail & audit pack generation' },
      { name: 'Monitor', role: 'Continuous health monitoring & alerting' },
    ],
    timestamp: new Date().toISOString(),
  });
}
