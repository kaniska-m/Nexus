# ============================================================================
# Nexus — Resend Email Client
# Serves: Notification routes
# ============================================================================

import os
import logging
from resend import Resend

logger = logging.getLogger(__name__)
resend_api_key = os.getenv("RESEND_API_KEY", "")

# We instantiate standard Resend library
resend = Resend(resend_api_key) if resend_api_key else None

def nexus_email_template(title: str, body: str, cta_text: str, cta_url: str) -> str:
    """Returns the HTML email template for Nexus."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&display=swap');
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }}
        .header {{ background-color: #0f1f3d; padding: 20px; text-align: center; }}
        .header h1 {{ margin: 0; color: #ffffff; font-family: 'Syne', sans-serif; font-size: 24px; letter-spacing: 1px; display: inline-flex; align-items: center; gap: 8px; }}
        .dot {{ width: 8px; height: 8px; background-color: #14b8a6; border-radius: 50%; display: inline-block; }}
        .card {{ background-color: #ffffff; max-width: 600px; margin: 32px auto; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
        .title {{ color: #0f1f3d; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; }}
        .body {{ color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }}
        .cta {{ display: inline-block; background-color: #0d9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center; }}
        .footer {{ text-align: center; color: #94a3b8; font-size: 12px; margin-top: 32px; }}
      </style>
    </head>
    <body>
      <div class="header">
        <h1>NEXUS <span class="dot"></span></h1>
      </div>
      <div class="card">
        <h1 class="title">{title}</h1>
        <div class="body">{body}</div>
        <div style="text-align: center;">
          <a href="{cta_url}" class="cta">{cta_text}</a>
        </div>
        <div class="footer">
          Powered by Nexus — AI-Powered Vendor Verification
        </div>
      </div>
    </body>
    </html>
    """

async def send_email(to: str, subject: str, html: str) -> bool:
    """Send an email using Resend, catching errors and logging."""
    if not resend:
        logger.warning(f"RESEND_API_KEY not set. Mocking email send to {to}. Subject: {subject}")
        return True

    try:
        if hasattr(resend, 'emails'):
            resend.emails.send({
                "from": "Nexus Verification <onboarding@resend.dev>",
                "to": to,
                "subject": subject,
                "html": html
            })
        elif hasattr(resend, 'Emails'):
            resend.Emails.send({
                "from": "Nexus Verification <onboarding@resend.dev>",
                "to": to,
                "subject": subject,
                "html": html
            })
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False
