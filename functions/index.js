import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { Resend } from 'resend';
import 'dotenv/config';

/**
 * Validate RFC 5322 standard email address format
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Build professional BloodBridge transactional email template
 */
function buildTestEmailContent(recipientEmail) {
  const subject = 'BloodBridge Email Automation Test';
  const text = `This is a test email from BloodBridge.\nYour email automation system is connected successfully.\n\nRecipient: ${recipientEmail}\nTimestamp: ${new Date().toISOString()}\nPlatform: BloodBridge Smart Donor Connect`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0c0c10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c0c10; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #141419; border: 1px solid #262630; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">
              <!-- Header -->
              <tr>
                <td style="padding: 32px 36px; background: linear-gradient(135deg, #1f0b0d 0%, #141419 100%); border-bottom: 1px solid #2a1618;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="vertical-align: middle;">
                        <div style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background: linear-gradient(135deg, #FF2B2B, #990000); border-radius: 10px; color: #ffffff; font-weight: bold; font-size: 18px;">
                          &#129656;
                        </div>
                        <span style="font-size: 20px; font-weight: 800; color: #ffffff; margin-left: 12px; letter-spacing: -0.5px; vertical-align: middle;">
                          Blood<span style="color: #FF2B2B;">Bridge</span>
                        </span>
                      </td>
                      <td align="right" style="vertical-align: middle;">
                        <span style="display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #10b981; background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 20px;">
                          SYSTEM VERIFIED
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Content Body -->
              <tr>
                <td style="padding: 36px;">
                  <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                    Email Automation Test
                  </h1>
                  <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #e2e8f0;">
                    This is a test email from BloodBridge.<br />
                    Your email automation system is connected successfully.
                  </p>
                  
                  <!-- Info card -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1a1a22; border: 1px solid #282836; border-radius: 12px; margin: 24px 0; padding: 18px 20px;">
                    <tr>
                      <td>
                        <table width="100%" border="0" cellspacing="0" cellpadding="6">
                          <tr>
                            <td width="30%" style="font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Recipient</td>
                            <td style="font-size: 13px; color: #ffffff; font-family: monospace;">${recipientEmail}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Engine</td>
                            <td style="font-size: 13px; color: #38bdf8;">Resend Transactional API</td>
                          </tr>
                          <tr>
                            <td style="font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Timestamp</td>
                            <td style="font-size: 13px; color: #cbd5e1;">${new Date().toUTCString()}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.6; color: #94a3b8;">
                    Transactional pipelines for voluntary donor alerts, emergency hospital requests, and Bombay blood group triage are ready for secure execution.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 36px; background-color: #0f0f13; border-top: 1px solid #1f1f28; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #64748b;">
                    BloodBridge Healthcare Technology &bull; Secure Server-Side Transactional Dispatch
                  </p>
                  <p style="margin: 6px 0 0 0; font-size: 11px; color: #475569;">
                    This is an automated test transmission. Do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return { subject, text, html };
}

/**
 * Core server-side function to send test email via Resend SDK
 */
async function sendTestEmailCore(recipientEmail) {
  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    throw new Error('A valid recipient email address is required.');
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.error('[BloodBridge Email] Missing RESEND_API_KEY environment variable on server.');
    throw new Error('Server configuration error: RESEND_API_KEY is not configured in server environment.');
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || 'BloodBridge <onboarding@resend.dev>';
  const { subject, text, html } = buildTestEmailContent(recipientEmail.trim());

  logger.info(`[BloodBridge Email] Attempting to dispatch test email to: ${recipientEmail.trim()}`);

  const { data, error } = await resend.emails.send({
    from,
    to: [recipientEmail.trim()],
    subject,
    text,
    html,
  });

  if (error) {
    logger.error(`[BloodBridge Email] Resend API error: ${error.message} (${error.name || 'UNKNOWN'})`);
    throw new Error(error.message || 'Failed to send email via Resend.');
  }

  logger.info(`[BloodBridge Email] Test email dispatched successfully. Resend ID: ${data?.id}`);

  return {
    success: true,
    message: 'Test email sent successfully via Resend.',
    id: data?.id,
    recipient: recipientEmail.trim(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * 1. Firebase Callable Cloud Function: sendTestEmail
 * Invoked securely from frontend using:
 * httpsCallable(functions, 'sendTestEmail')({ email: 'user@example.com' })
 */
export const sendTestEmail = onCall({ cors: true }, async (request) => {
  try {
    const rawEmail = request.data?.email || request.data?.to || request.data?.recipient;
    const result = await sendTestEmailCore(rawEmail);
    return result;
  } catch (err) {
    logger.error('[BloodBridge Email] Callable error:', err.message);
    throw new HttpsError('internal', err.message);
  }
});

/**
 * 2. Firebase HTTP Cloud Function: sendTestEmailHttp
 * Accepts HTTP POST { "email": "user@example.com" }
 */
export const sendTestEmailHttp = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const rawEmail = req.body?.email || req.body?.to || req.body?.recipient;
    const result = await sendTestEmailCore(rawEmail);
    return res.status(200).json(result);
  } catch (err) {
    logger.error('[BloodBridge Email] HTTP endpoint error:', err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
});
