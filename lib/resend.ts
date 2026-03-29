import { Resend } from 'resend';

// Only instantiate if the key exists to avoid crashing on boot
export const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

/**
 * Global HTML Template for Nexus Emails
 */
function nexusEmailTemplate(title: string, body: string, ctaText?: string, ctaUrl?: string) {
  // Using Nexus brand colors: #0f1f3d (Dark Navy), #0d9488 (Teal), #2563eb (Accent Blue)
  const buttonHtml = (ctaText && ctaUrl) 
    ? `
      <div style="text-align: center; margin-top: 30px;">
        <a href="${ctaUrl}" style="background-color: #0d9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          ${ctaText}
        </a>
      </div>
    `
    : '';

  return `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
      
      <!-- Header -->
      <div style="background-color: #0f1f3d; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">
          NEXUS <span style="color: #0d9488;">&#9679;</span>
        </h2>
      </div>

      <!-- Body -->
      <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        <h1 style="color: #0f1f3d; font-size: 20px; text-align: center; margin-top: 0;">${title}</h1>
        <div style="color: #475569; font-size: 15px; line-height: 1.6; white-space: pre-line;">
          ${body}
        </div>
        ${buttonHtml}
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
        <p>Powered by Nexus — AI-Powered Vendor Verification</p>
      </div>
    </div>
  `;
}

/**
 * Core sendEmail wrapper that formats and routes through Resend
 */
export async function sendEmail({
  to,
  subject,
  title,
  body,
  ctaText,
  ctaUrl,
}: {
  to: string;
  subject: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  if (!resend) {
    console.warn('RESEND_API_KEY is not defined. Skipping email to', to);
    return false;
  }

  try {
    const html = nexusEmailTemplate(title, body, ctaText, ctaUrl);
    
    const { data, error } = await resend.emails.send({
      from: 'Nexus <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send email via Resend:', error);
      return false;
    }
    
    console.log('Email sent successfully:', data?.id);
    return true;
  } catch (err) {
    console.error('Exception sending email:', err);
    return false;
  }
}
