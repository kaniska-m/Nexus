import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/resend';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, recipient_email, data } = body;

    if (!recipient_email) {
      return NextResponse.json({ error: 'Missing recipient_email' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let subject, title, htmlBody, ctaText, ctaUrl;

    switch (type) {
      case 'onboarding_started':
        subject = 'Nexus: Your compliance verification has started';
        title = `Verification Started: ${data.vendor_name || 'Vendor'}`;
        htmlBody = `Your vendor lifecycle onboarding has been formally initiated. We are evaluating your status in the ${data.industry || 'registered'} sector. Please follow the portal link below to upload any required missing documents.`;
        ctaText = 'Open Supplier Portal';
        ctaUrl = `${appUrl}/supplier/${data.vendor_id}`;
        break;

      case 'document_reminder':
        const missingCount = data.missing_documents?.length || 0;
        subject = `Nexus: ${missingCount} documents still required`;
        title = 'Action Required: Pending Documents';
        htmlBody = `Our automated agents require the following pending documents to continue verifying your enterprise:\n\n• ${(data.missing_documents || []).join('\n• ')}\n\nPlease supply these within 48 hours to avoid processing delays.`;
        ctaText = 'Upload Documents';
        ctaUrl = `${appUrl}/supplier/${data.vendor_id}`;
        break;

      case 'verification_complete':
        subject = `Nexus: Verification complete for ${data.vendor_name}`;
        title = 'Compliance Clearance ✓';
        htmlBody = `The AI agent pipeline has successfully finished evaluating ${data.vendor_name}.\n\nFinal Risk Score: <strong>${data.risk_score}</strong>\nStatus: <strong>${data.status}</strong>\n\nAutomated execution notes:\n${data.summary}`;
        ctaText = 'View Dashboard';
        ctaUrl = `${appUrl}/dashboard`;
        break;

      case 'fraud_alert':
        subject = `🚨 Nexus: Fraud signal detected — ${data.vendor_name}`;
        title = 'URGENT: Fraud Signal Detected';
        htmlBody = `A critical anomaly was registered during document analysis for ${data.vendor_name}.\n\nFlag Severity: <strong>${data.severity}</strong>\nDetails: ${data.description}\n\nRecommended Action: ${data.recommended_action || 'Halt pipeline and trigger immediate human review.'}`;
        ctaText = 'Review Audit Trail';
        ctaUrl = `${appUrl}/dashboard`;
        break;

      case 'health_alert':
        subject = `⚠ Nexus: Health alert for ${data.vendor_name}`;
        title = 'Vendor Health Compromised';
        htmlBody = `Continuous monitoring has flagged a ${data.health_status} alert for ${data.vendor_name}.\n\nMonitoring System Note:\n${data.monitoring_notes}\n\nPlease take immediate action.`;
        ctaText = 'View Health Dashboard';
        ctaUrl = `${appUrl}/dashboard/health`;
        break;

      default:
        return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
    }

    const success = await sendEmail({
      to: recipient_email,
      subject,
      title,
      body: htmlBody,
      ctaText,
      ctaUrl,
    });

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Notify route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
