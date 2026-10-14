import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';
import { db } from '../db.js';
import { isSupabaseConfiguredServer, getSupabaseServerClient } from './supabaseServer.js';

/**
 * =============================================================================
 * BloodBridge Enterprise Transactional Email Notification Service
 * =============================================================================
 *
 * CRITICAL ARCHITECTURAL MANDATES:
 * 1. Resend API Key is NEVER exposed to client-side bundles or browser requests.
 * 2. All notification operations execute strictly through the secure server backend.
 * 3. Primary Admin Notification Recipient: Configurable via ADMIN_NOTIFICATION_EMAIL
 *    (Default: bloodbridgesupportweb@gmail.com).
 * 4. Error isolation: Email dispatch failures NEVER block or rollback database
 *    operations (blood requests, donor offers, hospital accepts remain successful).
 * 5. Full audit logging & duplicate suppression built-in.
 * =============================================================================
 */

export const DEFAULT_SUPPORT_EMAIL = 'bloodbridgesupportweb@gmail.com';
export const SUPPORT_EMAIL = DEFAULT_SUPPORT_EMAIL;
const DEFAULT_ADMIN_EMAIL = DEFAULT_SUPPORT_EMAIL;
const LOGS_FILE_PATH = path.resolve(process.cwd(), 'server', 'data', 'email_logs.json');

// In-memory deduplication cache: `${type}:${requestId}:${recipient}` -> timestamp (ms)
const sentEventsCache = new Map();
const DEDUP_TTL_MS = 120 * 1000; // 2 minutes

/**
 * Resolve configured ADMIN_NOTIFICATION_EMAIL from environment or .env file
 */
export function getAdminEmail() {
  const p = path.resolve(process.cwd(), '.env');
  try {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const match = content.match(/^ADMIN_NOTIFICATION_EMAIL\s*=\s*([^\r\n]+)/m);
      if (match && match[1]) {
        const val = match[1].trim().replace(/^['"]|['"]$/g, '');
        if (val) {
          process.env.ADMIN_NOTIFICATION_EMAIL = val;
          return val;
        }
      }
    }
  } catch {
    // Continue with fallback
  }

  if (process.env.ADMIN_NOTIFICATION_EMAIL) {
    return process.env.ADMIN_NOTIFICATION_EMAIL.trim();
  }

  return DEFAULT_ADMIN_EMAIL;
}

/**
 * Resolve configured BLOODBRIDGE_SUPPORT_EMAIL for central support notifications and BCC copies.
 * Configurable via BLOODBRIDGE_SUPPORT_EMAIL or SUPPORT_EMAIL environment variables.
 * (Default: bloodbridgesupportweb@gmail.com)
 */
export function getSupportEmail() {
  const p = path.resolve(process.cwd(), '.env');
  try {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const match = content.match(/^(?:BLOODBRIDGE_SUPPORT_EMAIL|SUPPORT_EMAIL)\s*=\s*([^\r\n]+)/m);
      if (match && match[1]) {
        const val = match[1].trim().replace(/^['"]|['"]$/g, '');
        if (val) {
          process.env.BLOODBRIDGE_SUPPORT_EMAIL = val;
          return val;
        }
      }
    }
  } catch {
    // Continue with fallback
  }

  if (process.env.BLOODBRIDGE_SUPPORT_EMAIL) {
    return process.env.BLOODBRIDGE_SUPPORT_EMAIL.trim();
  }

  if (process.env.SUPPORT_EMAIL) {
    return process.env.SUPPORT_EMAIL.trim();
  }

  return getAdminEmail() || DEFAULT_SUPPORT_EMAIL;
}

/**
 * Resolve server-side RESEND_API_KEY
 */
export function getApiKey() {
  const potentialPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../../.env'),
  ];

  for (const p of potentialPaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const match = content.match(/^RESEND_API_KEY\s*=\s*([^\r\n]+)/m);
        if (match && match[1]) {
          const val = match[1].trim().replace(/^['"]|['"]$/g, '');
          if (val && val !== 're_your_resend_api_key_here') {
            process.env.RESEND_API_KEY = val;
            return val;
          }
        }
      }
    } catch {
      // Continue search
    }
  }

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_your_resend_api_key_here') {
    return process.env.RESEND_API_KEY.trim();
  }

  return null;
}

/**
 * Resolve RESEND_FROM_EMAIL sender address
 */
export function getFromEmail() {
  if (process.env.RESEND_FROM_EMAIL) {
    return process.env.RESEND_FROM_EMAIL.trim();
  }

  const p = path.resolve(process.cwd(), '.env');
  try {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const match = content.match(/^RESEND_FROM_EMAIL\s*=\s*([^\r\n]+)/m);
      if (match && match[1]) {
        const val = match[1].trim().replace(/^['"]|['"]$/g, '');
        if (val) {
          process.env.RESEND_FROM_EMAIL = val;
          return val;
        }
      }
    }
  } catch {
    // Continue fallback
  }

  return 'BloodBridge <onboarding@resend.dev>';
}

/**
 * Resolve optional RESEND_DEV_FALLBACK_EMAIL for Resend sandbox mode
 */
export function getDevFallbackEmail() {
  return 'bloodbridgesupportweb@gmail.com';
}

/**
 * Resolve optional GMAIL_COMPANY_USER and GMAIL_COMPANY_APP_PASSWORD for direct SMTP delivery
 */
export function getGmailCompanyCredentials() {
  const p = path.resolve(process.cwd(), '.env');
  let user = process.env.GMAIL_COMPANY_USER || 'bloodbridgesupportweb@gmail.com';
  let pass = process.env.GMAIL_COMPANY_APP_PASSWORD || '';
  try {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const uMatch = content.match(/^GMAIL_COMPANY_USER\s*=\s*([^\r\n]+)/m);
      if (uMatch && uMatch[1]) user = uMatch[1].trim().replace(/^['"]|['"]$/g, '');
      const pMatch = content.match(/^GMAIL_COMPANY_APP_PASSWORD\s*=\s*([^\r\n]+)/m);
      if (pMatch && pMatch[1]) pass = pMatch[1].trim().replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // Continue fallback
  }

  if (pass && pass !== 'your_16char_app_password_here' && pass.length >= 8) {
    return { user: user.trim(), pass: pass.trim().replace(/\s+/g, '') };
  }
  return null;
}

/**
 * Send an email directly to bloodbridgesupportweb@gmail.com via Gmail SMTP (Nodemailer)
 */
export async function sendDirectGmailEmail({ to, subject, html, text }) {
  const creds = getGmailCompanyCredentials();
  if (!creds) {
    return { success: false, reason: 'GMAIL_COMPANY_APP_PASSWORD not configured' };
  }
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: creds.user,
        pass: creds.pass,
      },
    });
    const info = await transporter.sendMail({
      from: `"BloodBridge Support Desk" <${creds.user}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`[GMAIL SMTP SUCCESS] Delivered directly to "${to}": Message ID ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.warn(`[GMAIL SMTP NOTE] Could not deliver via Gmail SMTP to "${to}":`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Resolve public application URL for transactional email buttons and links.
 * MANDATE: NEVER return localhost or 127.0.0.1 in transactional emails, as emails
 * are accessed from mobile phones, external computers, and Gmail web/app.
 */
export function getPublicAppUrl() {
  // If explicitly configured in .env and not in automated test mode, use the user's configured URL
  if (process.env.APP_PUBLIC_URL && process.env.NODE_ENV !== 'test') {
    return process.env.APP_PUBLIC_URL.trim().replace(/\/$/, '');
  }

  const candidate = (
    process.env.APP_PUBLIC_URL ||
    process.env.PUBLIC_URL ||
    process.env.BLOODBRIDGE_PUBLIC_URL ||
    process.env.APP_URL ||
    process.env.VITE_APP_URL ||
    ''
  ).trim().replace(/\/$/, '');

  // If candidate is a valid public URL and not localhost
  if (candidate && !candidate.includes('localhost') && !candidate.includes('127.0.0.1')) {
    return candidate;
  }

  // Fallback to configured public production domain
  return 'https://bloodbridge.org';
}

/**
 * Backwards compatibility alias for getPublicAppUrl()
 */
export function getAppBaseUrl() {
  return getPublicAppUrl();
}

/**
 * Generate a publicly accessible approval action URL for one-click email actions.
 * Prioritizes deployed Supabase Edge Function if configured; falls back to public app URL.
 * Under NO circumstances does this ever output a localhost URL.
 *
 * @param {Object} params
 * @param {string} params.token - Secure approval token
 * @param {string} [params.action='approve'] - Action: 'approve' or 'decline'
 * @returns {string} Public HTTPS endpoint URL
 */
export function getPublicApprovalActionUrl({ token, action = 'approve' }) {
  const encToken = encodeURIComponent((token || '').trim());
  const encAction = encodeURIComponent((action || 'approve').toLowerCase());

  // 1. Direct Edge Function URL override if explicitly provided
  const explicitFunctionUrl = (process.env.SUPABASE_FUNCTIONS_URL || process.env.SUPABASE_FUNCTION_URL || '').trim();
  if (explicitFunctionUrl && !explicitFunctionUrl.includes('localhost') && !explicitFunctionUrl.includes('127.0.0.1')) {
    const cleanFn = explicitFunctionUrl.replace(/\/$/, '');
    return `${cleanFn}/email-action?token=${encToken}&action=${encAction}`;
  }

  // 2. Preferred Architecture: Supabase Edge Function if a real Supabase project is configured
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const isRealSupabaseProject = Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('localhost') &&
    !supabaseUrl.includes('127.0.0.1')
  );

  if (isRealSupabaseProject) {
    const fnName = (process.env.SUPABASE_EDGE_FUNCTION_NAME || 'email-action').trim();
    return `${supabaseUrl}/functions/v1/${fnName}?token=${encToken}&action=${encAction}`;
  }

  // 3. Configured Public Application Endpoint (e.g. APP_PUBLIC_URL, PUBLIC_URL)
  const publicBase = getPublicAppUrl();
  return `${publicBase}/api/email-action?token=${encToken}&action=${encAction}`;
}

/**
 * Validate RFC 5322 email address format
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Record an email notification attempt into persistent audit log
 */
export function recordEmailLog(entry) {
  try {
    const supportEmail = getSupportEmail();
    const logItem = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      notification_type: entry.notification_type || 'GENERAL',
      recipient_email: entry.recipient_email || entry.hospital_email || 'unknown',
      user_id: entry.user_id || entry.metadata?.userId || entry.metadata?.donorId || entry.metadata?.requesterId || null,
      hospital_id: entry.hospital_id || entry.metadata?.hospitalId || null,
      hospital_email: entry.hospital_email || entry.recipient_email || null,
      support_email: entry.support_email || entry.support_copy || supportEmail,
      support_copy_enabled: Boolean(entry.support_copy_enabled !== false && (entry.support_copy || entry.support_email)),
      support_copy: entry.support_copy || entry.support_email || supportEmail,
      donation_response_id: entry.donation_response_id || entry.response_id || entry.metadata?.donationResponseId || null,
      blood_requirement_id: entry.blood_requirement_id || entry.requirement_id || entry.metadata?.bloodRequirementId || null,
      request_id: entry.request_id || entry.blood_requirement_id || null,
      subject: entry.subject || 'BloodBridge Notification',
      status: entry.status || 'pending',
      resend_message_id: entry.resend_message_id || entry.provider_message_id || null,
      provider_message_id: entry.provider_message_id || entry.resend_message_id || null,
      error_message: entry.error_message || null,
      created_at: entry.created_at || new Date().toISOString(),
      sent_at: entry.status === 'sent' ? (entry.sent_at || new Date().toISOString()) : null,
      metadata: entry.metadata || null,
    };

    let logs = [];
    if (fs.existsSync(LOGS_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(LOGS_FILE_PATH, 'utf8');
        logs = raw ? JSON.parse(raw) : [];
      } catch {
        logs = [];
      }
    }

    logs.unshift(logItem);
    // Keep max 500 logs to prevent unbounded file growth
    if (logs.length > 500) logs = logs.slice(0, 500);

    fs.writeFileSync(LOGS_FILE_PATH, JSON.stringify(logs, null, 2), 'utf8');

    // Also mirror to Supabase if configured (non-blocking)
    if (isSupabaseConfiguredServer()) {
      const supa = getSupabaseServerClient();
      if (supa) {
        supa.from('email_notification_logs').insert([{
          notification_type: logItem.notification_type,
          recipient_email: logItem.recipient_email,
          subject: logItem.subject,
          support_copy_enabled: logItem.support_copy_enabled,
          support_copy: logItem.support_copy,
          request_id: logItem.request_id,
          status: logItem.status,
          resend_message_id: logItem.resend_message_id,
          error_message: logItem.error_message,
        }]).then().catch(e => console.warn('[SUPABASE LOG SYNC NOTE]:', e.message));
      }
    }

    return logItem;
  } catch (err) {
    console.warn('[EMAIL LOG ERROR] Could not persist email audit log:', err.message);
    return null;
  }
}

/**
 * Retrieve recent email logs for monitoring and verification
 */
export function getEmailLogs(limit = 50) {
  try {
    if (fs.existsSync(LOGS_FILE_PATH)) {
      const raw = fs.readFileSync(LOGS_FILE_PATH, 'utf8');
      const logs = raw ? JSON.parse(raw) : [];
      return logs.slice(0, limit);
    }
  } catch (err) {
    console.warn('[EMAIL LOG READ ERROR]:', err.message);
  }
  return [];
}

/**
 * Core transactional email dispatch engine:
 * Routes ALL acknowledgements (request, donate, support, hospital approvals, receipts)
 * exclusively to bloodbridgesupportweb@gmail.com.
 */
export async function dispatchEmail({
  to,
  subject,
  html,
  text,
  notificationType = 'GENERAL',
  requestId = null,
  dedupId = null,
  metadata = null,
}) {
  const cleanRecipient = typeof to === 'string' ? to.trim() : '';
  const centralTargetEmail = getSupportEmail() || 'bloodbridgesupportweb@gmail.com';

  // Deduplication check: uses dedupId if provided, else requestId
  const dedupKey = `${notificationType}:${dedupId || requestId || ''}:${cleanRecipient.toLowerCase()}`;
  const now = Date.now();
  if (sentEventsCache.has(dedupKey)) {
    const lastSent = sentEventsCache.get(dedupKey);
    if (now - lastSent < DEDUP_TTL_MS) {
      console.log(`[EMAIL DEDUP] Suppressed duplicate acknowledgement for ${dedupKey} (sent ${Math.round((now - lastSent) / 1000)}s ago)`);
      return { success: true, message: 'Duplicate email suppressed.', duplicateSuppressed: true };
    }
  }

  // Register in cache
  sentEventsCache.set(dedupKey, now);

  // Prepare acknowledgement wrapper for central support desk
  const isOriginalSupport = cleanRecipient && cleanRecipient.toLowerCase() === centralTargetEmail.toLowerCase();
  const ackSubject = isOriginalSupport ? subject : `[Ack: ${notificationType}] ${subject}`;

  const ackBadge = isOriginalSupport ? '' : `
    <div style="background-color: #121626; border-left: 4px solid #FF2B2B; padding: 14px 18px; margin-bottom: 22px; border-radius: 8px; font-family: sans-serif; font-size: 13px; color: #e2e8f0;">
      <strong style="color: #FF2B2B; text-transform: uppercase; letter-spacing: 0.5px;">[CENTRAL ACKNOWLEDGEMENT DESK]</strong><br />
      <span style="color: #94a3b8;">Workflow / Work Type:</span> <strong style="color: #ffffff;">${notificationType}</strong><br />
      <span style="color: #94a3b8;">Original Context:</span> <strong style="color: #38bdf8;">${cleanRecipient || 'System Event'}</strong><br />
      <span style="color: #94a3b8;">Target Mailbox:</span> <strong style="color: #10b981;">${centralTargetEmail}</strong>
    </div>
  `;

  const finalHtml = ackBadge ? (html.includes('<td style="padding: 12px 32px 28px 32px;">') ? html.replace(/(<td style="padding: 12px 32px 28px 32px;">)/, `$1${ackBadge}`) : `${ackBadge}${html}`) : html;
  const finalText = isOriginalSupport
    ? text
    : `[CENTRAL ACKNOWLEDGEMENT: ${notificationType}]\n[Target Mailbox: ${centralTargetEmail}]\n[Original Context: ${cleanRecipient || 'System Event'}]\n\n${text}`;

  // 1. Prioritize Gmail SMTP if configured in .env (bypasses Resend sandbox restrictions)
  const gmailCreds = getGmailCompanyCredentials();
  if (gmailCreds) {
    console.log(`[EMAIL ACK] Dispatching via Gmail SMTP directly to central desk "${centralTargetEmail}" (Work: ${notificationType})`);
    const gmailRes = await sendDirectGmailEmail({
      to: centralTargetEmail,
      subject: ackSubject,
      html: finalHtml,
      text: finalText,
    });
    if (gmailRes.success) {
      recordEmailLog({
        notification_type: notificationType,
        recipient_email: centralTargetEmail,
        hospital_id: metadata?.hospitalId || null,
        hospital_email: metadata?.hospitalEmail || (cleanRecipient !== centralTargetEmail ? cleanRecipient : null),
        support_email: centralTargetEmail,
        support_copy_enabled: true,
        support_copy: centralTargetEmail,
        subject: ackSubject,
        request_id: requestId,
        donation_response_id: metadata?.donationResponseId || null,
        blood_requirement_id: metadata?.bloodRequirementId || null,
        status: 'sent',
        provider_message_id: gmailRes.messageId,
        resend_message_id: gmailRes.messageId,
        metadata: { ...metadata, originalRecipient: cleanRecipient, transport: 'gmail_smtp' },
      });
      return {
        success: true,
        message: 'Acknowledgement notification delivered to bloodbridgesupportweb@gmail.com via Gmail SMTP.',
        id: gmailRes.messageId,
        recipient: centralTargetEmail,
      };
    }
  }

  // 2. Dispatch via Resend directly to centralTargetEmail
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 're_your_resend_api_key_here') {
    const errorMsg = 'RESEND_API_KEY is not configured in server environment.';
    console.warn(`[EMAIL WARNING] ${errorMsg}`);
    recordEmailLog({
      notification_type: notificationType,
      recipient_email: centralTargetEmail,
      hospital_id: metadata?.hospitalId || null,
      hospital_email: metadata?.hospitalEmail || cleanRecipient,
      support_email: centralTargetEmail,
      subject: ackSubject,
      support_copy_enabled: true,
      support_copy: centralTargetEmail,
      request_id: requestId,
      status: 'failed',
      error_message: errorMsg,
      metadata,
    });
    return { success: false, error: errorMsg, code: 'MISSING_API_KEY' };
  }

  try {
    const resend = new Resend(apiKey);
    const from = getFromEmail();

    console.log(`[EMAIL ACK] Dispatching via Resend directly to central desk "${centralTargetEmail}" (Work: ${notificationType})`);

    const { data, error } = await resend.emails.send({
      from,
      to: [centralTargetEmail],
      subject: ackSubject,
      text: finalText,
      html: finalHtml,
    });

    if (error) {
      console.warn(`[EMAIL ACK RESEND ERROR] Resend error for "${centralTargetEmail}":`, error.message);

      recordEmailLog({
        notification_type: notificationType,
        recipient_email: centralTargetEmail,
        hospital_id: metadata?.hospitalId || null,
        hospital_email: metadata?.hospitalEmail || (cleanRecipient !== centralTargetEmail ? cleanRecipient : null),
        support_email: centralTargetEmail,
        subject: ackSubject,
        support_copy_enabled: true,
        support_copy: centralTargetEmail,
        request_id: requestId,
        donation_response_id: metadata?.donationResponseId || null,
        blood_requirement_id: metadata?.bloodRequirementId || null,
        status: 'failed',
        error_message: error.message,
        metadata: { ...metadata, originalRecipient: cleanRecipient, centralDesk: centralTargetEmail },
      });

      return {
        success: false,
        error: error.message,
        code: error.name || 'RESEND_API_ERROR',
        targetRecipient: centralTargetEmail,
      };
    }

    console.log(`[EMAIL ACK SUCCESS] Successfully delivered to central desk "${centralTargetEmail}". Resend ID: ${data?.id}`);

    recordEmailLog({
      notification_type: notificationType,
      recipient_email: centralTargetEmail,
      hospital_id: metadata?.hospitalId || null,
      hospital_email: metadata?.hospitalEmail || (cleanRecipient !== centralTargetEmail ? cleanRecipient : null),
      support_email: centralTargetEmail,
      subject: ackSubject,
      support_copy_enabled: true,
      support_copy: centralTargetEmail,
      request_id: requestId,
      donation_response_id: metadata?.donationResponseId || null,
      blood_requirement_id: metadata?.bloodRequirementId || null,
      status: 'sent',
      provider_message_id: data?.id,
      resend_message_id: data?.id,
      metadata: { ...metadata, originalRecipient: cleanRecipient, centralDesk: centralTargetEmail },
    });

    return {
      success: true,
      message: 'Acknowledgement notification delivered to bloodbridgesupportweb@gmail.com.',
      id: data?.id,
      recipient: centralTargetEmail,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[EMAIL EXCEPTION] Unexpected error delivering to "${centralTargetEmail}":`, err.message);

    recordEmailLog({
      notification_type: notificationType,
      recipient_email: centralTargetEmail,
      hospital_id: metadata?.hospitalId || null,
      hospital_email: metadata?.hospitalEmail || cleanRecipient,
      support_email: centralTargetEmail,
      support_copy_enabled: true,
      support_copy: centralTargetEmail,
      request_id: requestId,
      status: 'failed',
      error_message: err.message,
      metadata,
    });

    return {
      success: false,
      error: err.message,
      code: 'SERVER_EXCEPTION',
    };
  }
}

/**
 * =============================================================================
 * HTML TEMPLATE WRAPPER (iOS Glassmorphism Inspired Healthcare Email Design)
 * =============================================================================
 */
function wrapBloodBridgeTemplate({
  title,
  preheader,
  badgeText = 'VERIFIED ALERT',
  badgeColor = '#E50914',
  contentHtml,
  actionButtonText = 'Open BloodBridge Portal',
  actionButtonUrl = null,
}) {
  const resolvedButtonUrl = (actionButtonUrl && actionButtonUrl.trim())
    ? actionButtonUrl.trim()
    : getPublicAppUrl();

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #08080c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <!-- Hidden preheader text -->
      <div style="display: none; max-height: 0px; overflow: hidden;">
        ${preheader || title} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
      </div>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #08080c; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #121218; border: 1px solid #23232e; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);">
              
              <!-- Header with BloodBridge Branding -->
              <tr>
                <td style="padding: 28px 32px; background: linear-gradient(135deg, #22080b 0%, #121218 100%); border-bottom: 1px solid #281518;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="vertical-align: middle;">
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="vertical-align: middle;">
                              <div style="width: 38px; height: 38px; line-height: 38px; text-align: center; background: linear-gradient(135deg, #FF2B2B, #990000); border-radius: 12px; color: #ffffff; font-weight: bold; font-size: 19px; box-shadow: 0 4px 15px rgba(229, 9, 20, 0.5);">
                                &#129656;
                              </div>
                            </td>
                            <td style="vertical-align: middle; padding-left: 12px;">
                              <span style="font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                                Blood<span style="color: #FF2B2B;">Bridge</span>
                              </span>
                              <span style="display: block; font-size: 10px; color: #8e8e93; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                                Smart Donor Connect
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td align="right" style="vertical-align: middle;">
                        <span style="display: inline-block; padding: 5px 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: ${badgeColor}; background-color: rgba(229, 9, 20, 0.12); border: 1px solid rgba(229, 9, 20, 0.35); border-radius: 20px;">
                          ${badgeText}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Hero Title -->
              <tr>
                <td style="padding: 32px 32px 16px 32px;">
                  <h1 style="margin: 0 0 8px 0; font-size: 23px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.3;">
                    ${title}
                  </h1>
                  <p style="margin: 0; font-size: 13px; color: #94a3b8; font-weight: 500;">
                    Connecting Lives. One Drop at a Time.
                  </p>
                </td>
              </tr>

              <!-- Dynamic Body Content -->
              <tr>
                <td style="padding: 12px 32px 28px 32px;">
                  ${contentHtml}
                </td>
              </tr>

              <!-- Primary Call to Action -->
              <tr>
                <td style="padding: 0 32px 32px 32px;" align="center">
                  <a href="${resolvedButtonUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #FF2B2B 0%, #E50914 50%, #990000 100%); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 14px; box-shadow: 0 6px 25px rgba(229, 9, 20, 0.6); letter-spacing: 0.3px;">
                    ${actionButtonText} &rarr;
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #0b0b0f; border-top: 1px solid #1a1a24; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                    This is an automated notification from <strong style="color: #94a3b8;">BloodBridge &ndash; Smart Donor Connect</strong>.<br />
                    Official Notification Desk: <a href="mailto:${DEFAULT_ADMIN_EMAIL}" style="color: #E50914; text-decoration: none;">${DEFAULT_ADMIN_EMAIL}</a>
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 11px; color: #475569;">
                    Please do not reply directly to this automated transmission. Log in to the platform to take action.
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
}

/**
 * =============================================================================
 * SPECIFIC EVENT NOTIFICATION HANDLERS
 * =============================================================================
 */

/**
 * 1. EVENT: New Blood Request Submitted
 * Recipient: bloodbridgesupportweb@gmail.com (ADMIN_NOTIFICATION_EMAIL)
 */
export async function sendAdminNewBloodRequestNotification(request) {
  const supportEmail = getSupportEmail();
  const requestCode = request.request_code || request.requestCode || request.id || 'NEW-REQUEST';
  const subject = 'BloodBridge – New Blood Request Submitted';

  const requesterName = request.requester_name || request.requesterName || request.patient_name || request.patientName || 'Anonymous';
  const requesterEmail = request.requester_email || request.requesterEmail || request.email || request.contact_email || 'Not Provided';
  const requesterPhone = request.requester_phone || request.requesterPhone || request.contact_number || request.phone || 'Not Provided';
  const bloodGroup = request.blood_group || request.bloodGroup || 'Unknown';
  const district = request.district || request.city || 'Tamil Nadu';
  const hospital = request.hospital_name || request.hospitalName || request.hospital || 'Hospital Desk';
  const hospitalEmail = request.hospital_email || request.hospitalEmail || 'Not Available';
  const units = request.units_required || request.unitsRequired || request.units || 1;
  const urgency = request.urgency || request.emergency_level || 'Urgent';
  const requiredDate = request.required_date || request.requiredDate || 'Immediate';
  const reason = request.reason || request.additional_message || 'Transfusion requirement';
  const submittedAt = request.created_at || new Date().toISOString();

  const isEmergency = urgency === 'Emergency' || urgency === 'Critical';

  const contentHtml = `
    <div style="background-color: #171720; border: 1px solid #272736; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #e2e8f0;">
        A new blood request has been submitted to the BloodBridge platform. Regional voluntary donors are currently being matched.
      </p>

      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr>
          <td width="35%" style="color: #94a3b8; font-weight: 600;">Request ID</td>
          <td style="color: #ffffff; font-family: monospace; font-weight: 700;">${requestCode}</td>
        </tr>
        <tr>
          <td width="35%" style="color: #94a3b8; font-weight: 600;">Submitted Date/Time</td>
          <td style="color: #94a3b8; font-size: 12px;">${new Date(submittedAt).toUTCString()}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Blood Group</td>
          <td style="color: #FF2B2B; font-weight: 800; font-size: 16px;">${bloodGroup}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Units Required</td>
          <td style="color: #ffffff; font-weight: 700;">${units} Unit(s)</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Urgency</td>
          <td style="color: ${isEmergency ? '#ef4444' : '#f59e0b'}; font-weight: 700;">${urgency}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">District / Location</td>
          <td style="color: #ffffff;">${district}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital</td>
          <td style="color: #ffffff; font-weight: 600;">${hospital}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital Email</td>
          <td style="color: #38bdf8;">${hospitalEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Required Date</td>
          <td style="color: #ffffff;">${requiredDate}</td>
        </tr>
        <tr style="border-top: 1px solid #262635;">
          <td style="color: #94a3b8; font-weight: 600; padding-top: 10px;">Requester Name</td>
          <td style="color: #ffffff; font-weight: 600; padding-top: 10px;">${requesterName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Requester Phone</td>
          <td style="color: #10b981; font-family: monospace;">${requesterPhone}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Requester Email</td>
          <td style="color: #38bdf8;">${requesterEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Clinical Purpose</td>
          <td style="color: #cbd5e1; font-style: italic;">"${reason}"</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
      Please log in to the BloodBridge system to review and manage this request.
    </p>
  `;

  const text = `
BloodBridge – New Blood Request Submitted
A new blood request has been submitted to BloodBridge.

Request ID: ${requestCode}
Requester Name: ${requesterName}
Requester Email: ${requesterEmail}
Requester Phone: ${requesterPhone}
Blood Group: ${bloodGroup}
Units Required: ${units}
District / Location: ${district}
Hospital: ${hospital}
Hospital Email: ${hospitalEmail}
Urgency: ${urgency}
Request Date/Time: ${submittedAt}
Clinical Purpose: ${reason}

Please log in to the BloodBridge system to review this request.
  `.trim();

  const html = wrapBloodBridgeTemplate({
    title: 'New Blood Request Submitted',
    preheader: `Emergency blood request for ${units} Unit(s) of ${bloodGroup} at ${hospital} (${district}).`,
    badgeText: isEmergency ? 'CRITICAL DISPATCH' : 'BLOOD REQUEST',
    badgeColor: isEmergency ? '#ef4444' : '#E50914',
    contentHtml,
    actionButtonText: 'Review Blood Request in Admin Console',
    actionButtonUrl: `${getPublicAppUrl()}/admin-dashboard?tab=requests`,
  });

  return await dispatchEmail({
    to: supportEmail,
    subject,
    html,
    text,
    notificationType: 'BLOOD_REQUEST_SUBMITTED',
    requestId: requestCode,
    dedupId: `${request.id || requestCode}:BLOOD_REQ_SUBMITTED`,
    metadata: {
      userId: request.requester_id || request.requesterId || null,
      requesterName,
      requesterEmail,
      requesterPhone,
      bloodGroup,
      district,
      hospital,
      units,
      urgency,
      submittedAt,
    },
  });
}

export const sendSupportBloodRequestNotification = sendAdminNewBloodRequestNotification;

/**
 * 1b. EVENT: Requester Confirmation Receipt
 * Recipient: requester_email (if provided)
 */
export async function sendRequesterBloodRequestConfirmation(request) {
  const requesterEmail = request.requester_email || request.requesterEmail || request.email;
  if (!requesterEmail || !isValidEmail(requesterEmail)) return null;

  const requestCode = request.request_code || request.requestCode || request.id;
  const subject = `BloodBridge – Blood Request Dispatched (#${requestCode})`;
  const bloodGroup = request.blood_group || request.bloodGroup;
  const units = request.units_required || request.unitsRequired || 1;
  const hospital = request.hospital_name || request.hospitalName || request.hospital;

  const contentHtml = `
    <div style="background-color: #171720; border: 1px solid #272736; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #e2e8f0;">
        Your blood requirement for <strong>${units} Unit(s) of ${bloodGroup}</strong> has been successfully registered and dispatched to nearby voluntary lifesavers.
      </p>

      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr>
          <td width="35%" style="color: #94a3b8; font-weight: 600;">Tracking Code</td>
          <td style="color: #ffffff; font-family: monospace; font-weight: 700;">${requestCode}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Blood Group</td>
          <td style="color: #FF2B2B; font-weight: 800;">${bloodGroup}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital</td>
          <td style="color: #ffffff;">${hospital}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Status</td>
          <td style="color: #10b981; font-weight: 700;">MATCHING REGIONAL DONORS</td>
        </tr>
      </table>
    </div>
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
      You will receive alerts as soon as donors or hospitals confirm availability.
    </p>
  `;

  const text = `
BloodBridge – Blood Request Dispatched
Your blood request (#${requestCode}) for ${units} Unit(s) of ${bloodGroup} at ${hospital} has been dispatched.
Track live progress on your BloodBridge portal.
  `.trim();

  const html = wrapBloodBridgeTemplate({
    title: 'Blood Request Registered',
    preheader: `Your request #${requestCode} is now actively matching donors.`,
    badgeText: 'DISPATCH CONFIRMED',
    badgeColor: '#10b981',
    contentHtml,
    actionButtonText: 'Track Your Request',
    actionButtonUrl: `${getPublicAppUrl()}/my-requests`,
  });

  return await dispatchEmail({
    to: requesterEmail,
    subject,
    html,
    text,
    notificationType: 'REQUESTER_RECEIPT',
    requestId: requestCode,
  });
}

/**
 * 2. EVENT: Donate Blood / Offer to Donate - Support Notification
 * Subject: BloodBridge – New Blood Donation Offer
 * Recipient: bloodbridgesupportweb@gmail.com
 * Notification type: DONOR_OFFER_SUBMITTED
 */
export async function sendSupportDonorOfferNotification(response, customSubject = null) {
  if (!response || !response.id) {
    console.warn('[EMAIL WARNING] Invalid response passed to sendSupportDonorOfferNotification');
    return { success: false, error: 'Invalid response', code: 'INVALID_RESPONSE' };
  }

  const supportEmail = getSupportEmail();
  const reqId = response.requirement_id || response.requirementId;
  const respCode = response.response_code || response.id;

  let requirement = null;
  if (db && typeof db.findHospitalBloodRequirementById === 'function') {
    requirement = db.findHospitalBloodRequirementById(reqId);
  }

  const hospitalId = response.hospital_id || requirement?.hospital_id || null;
  let hospital = null;
  if (hospitalId && db && typeof db.findHospitalById === 'function') {
    hospital = db.findHospitalById(hospitalId);
  }

  let hospitalEmail = hospital?.email || requirement?.hospital_email || response.hospital_email || null;
  if (!hospitalEmail && hospitalId && typeof resolveHospitalRegisteredEmail === 'function') {
    try {
      hospitalEmail = await resolveHospitalRegisteredEmail(hospitalId, requirement, hospital);
    } catch {
      // safe fallback
    }
  }
  const cleanHospitalEmail = (hospitalEmail && isValidEmail(hospitalEmail)) ? hospitalEmail : 'Not Available';

  const reqCode = requirement?.requirement_code || response.requirement_code || reqId || 'HBR-REQ';
  const hospitalName = hospital?.hospital_name || hospital?.name || requirement?.hospital_name || response.hospital_name || 'Hospital Blood Bank';
  const hospitalDistrict = requirement?.district || hospital?.district || response.donor_district || 'Tamil Nadu';
  const requiredBloodGroup = requirement?.blood_group || response.donor_blood_group || '—';
  const unitsRequired = requirement?.units_required || 1;
  const urgency = requirement?.urgency || 'Urgent';

  const donorName = response.donor_name || response.donorName || 'Voluntary Donor';
  const donorBloodGroup = response.donor_blood_group || response.donorBloodGroup || '—';
  const donorDistrict = response.donor_district || response.donorDistrict || hospitalDistrict;
  const donorPhone = response.donor_raw_phone || response.donor_phone || response.donorPhone || 'Not Provided';
  const donorEmail = response.donor_email || response.donorEmail || response.email || 'Not Provided';
  const donorMessage = response.donor_message || response.donorMessage || 'Ready to donate.';
  const timestamp = response.created_at || new Date().toISOString();

  const subject = customSubject || 'BloodBridge – New Blood Donation Offer';

  const text = `
BloodBridge – Donor Response Notification
A donor has responded to a hospital blood requirement.

Request Details:
Request ID: ${reqCode}
Hospital Name: ${hospitalName}
Hospital Email: ${cleanHospitalEmail}
Hospital Location: ${hospitalDistrict}
Required Blood Group: ${requiredBloodGroup}
Required Units: ${unitsRequired}
Emergency Status: ${urgency}

Donor Details:
Donor Name: ${donorName}
Donor Blood Group: ${donorBloodGroup}
Donor Phone: ${donorPhone}
Donor Email: ${donorEmail}
Donor District: ${donorDistrict}
Response Date/Time: ${new Date(timestamp).toUTCString()}

Response Status:
DONOR OFFERED TO DONATE

Please contact/coordinate with the hospital and donor as required.

BloodBridge
"Connecting Lives. One Drop at a Time."
  `.trim();

  const contentHtml = `
    <div style="background-color: #171720; border: 1px solid #272736; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 14px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #10b981; font-weight: 800;">
        BloodBridge &ndash; Donor Response Notification
      </h3>
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #e2e8f0;">
        A donor has responded to a hospital blood requirement.
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr style="background-color: rgba(255, 255, 255, 0.02);">
          <td colspan="2" style="color: #f87171; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 10px; padding-bottom: 6px;">
            Request Details
          </td>
        </tr>
        <tr>
          <td width="38%" style="color: #94a3b8; font-weight: 600;">Request ID</td>
          <td style="color: #ffffff; font-family: monospace; font-weight: 700;">${reqCode}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital Name</td>
          <td style="color: #ffffff; font-weight: 700;">${hospitalName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital Email</td>
          <td style="color: #38bdf8;">${cleanHospitalEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital Location</td>
          <td style="color: #ffffff;">${hospitalDistrict}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Required Blood Group</td>
          <td style="color: #FF2B2B; font-weight: 800;">${requiredBloodGroup}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Required Units</td>
          <td style="color: #ffffff; font-weight: 700;">${unitsRequired} Unit(s)</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Emergency Status</td>
          <td style="color: #f59e0b; font-weight: 700;">${urgency}</td>
        </tr>
        <tr style="background-color: rgba(255, 255, 255, 0.02); border-top: 1px solid #262635;">
          <td colspan="2" style="color: #38bdf8; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 14px; padding-bottom: 6px;">
            Donor Details
          </td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donor Name</td>
          <td style="color: #ffffff; font-weight: 700;">${donorName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donor Blood Group</td>
          <td style="color: #FF2B2B; font-weight: 800; font-size: 15px;">${donorBloodGroup}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donor Phone</td>
          <td style="color: #10b981; font-family: monospace; font-weight: 700;">${donorPhone}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donor Email</td>
          <td style="color: #38bdf8;">${donorEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donor District</td>
          <td style="color: #ffffff;">${donorDistrict}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donor Message</td>
          <td style="color: #cbd5e1; font-style: italic;">"${donorMessage}"</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Response Date / Time</td>
          <td style="color: #94a3b8; font-size: 12px;">${new Date(timestamp).toUTCString()}</td>
        </tr>
        <tr style="border-top: 1px solid #262635;">
          <td style="color: #94a3b8; font-weight: 600; padding-top: 10px;">Response Status</td>
          <td style="color: #10b981; font-weight: 800; font-size: 14px; padding-top: 10px;">DONOR OFFERED TO DONATE</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donation Response ID</td>
          <td style="color: #ffffff; font-family: monospace;">${respCode}</td>
        </tr>
      </table>
    </div>
    <div style="padding: 12px 16px; background-color: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 12px; color: #a7f3d0; line-height: 1.5;">
        <strong>Action Notice:</strong> Please contact/coordinate with the hospital and donor as required.<br />
        <span style="font-size: 11px; color: #6ee7b7;">BloodBridge &ndash; Connecting Lives. One Drop at a Time.</span>
      </p>
    </div>
  `;

  const html = wrapBloodBridgeTemplate({
    title: 'New Blood Donation Offer',
    preheader: `New donation offer from ${donorName} (${donorBloodGroup}) for ${hospitalName}.`,
    badgeText: 'DONOR OFFER',
    badgeColor: '#10b981',
    contentHtml,
    actionButtonText: 'Open BloodBridge Dashboard',
    actionButtonUrl: `${getPublicAppUrl()}/admin-dashboard?tab=donors`,
  });

  return await dispatchEmail({
    to: supportEmail,
    subject,
    html,
    text,
    notificationType: 'DONOR_OFFER_SUBMITTED',
    requestId: reqCode,
    dedupId: `${response.id || respCode}:SUPPORT_DONOR_OFFER`,
    metadata: {
      userId: response.donor_id || response.donorId || null,
      donationResponseId: response.id || respCode,
      bloodRequirementId: reqId,
      hospitalId,
      hospitalName,
      hospitalEmail: cleanHospitalEmail,
      donorName,
      donorBloodGroup,
      donorEmail,
      donorPhone,
      status: 'PENDING',
    },
  });
}

export const sendAdminDonorResponseNotification = sendSupportDonorOfferNotification;

/**
 * 2b. EVENT: Hospital Blood Requirement Created - Support Notification
 * Subject: BloodBridge – New Hospital Blood Requirement
 * Recipient: bloodbridgesupportweb@gmail.com
 * Notification type: HOSPITAL_BLOOD_REQUIREMENT_CREATED
 */
export async function sendSupportHospitalRequirementNotification(requirement, hospital = null) {
  if (!requirement || !requirement.id) {
    console.warn('[EMAIL WARNING] Invalid requirement passed to sendSupportHospitalRequirementNotification');
    return { success: false, error: 'Invalid requirement', code: 'INVALID_REQUIREMENT' };
  }

  const supportEmail = getSupportEmail();
  const reqCode = requirement.requirement_code || requirement.id;
  const hospitalName = hospital?.hospital_name || hospital?.name || requirement.hospital_name || 'Hospital Blood Bank';
  const hospitalEmail = requirement.hospital_email || hospital?.email || hospital?.registered_email || 'Not Provided';
  const hospitalPhone = requirement.doctor_contact || hospital?.contact_phone || hospital?.phone || 'Not Provided';
  const bloodGroup = requirement.blood_group || '—';
  const unitsRequired = requirement.units_required || 1;
  const district = requirement.district || hospital?.district || 'Tamil Nadu';
  const urgency = requirement.urgency || 'Urgent';
  const submittedAt = requirement.created_at || new Date().toISOString();

  const subject = 'BloodBridge – New Hospital Blood Requirement';

  const text = `
BloodBridge Support Notification
Event: New Hospital Blood Requirement

Hospital Details:
Hospital Name: ${hospitalName}
Hospital Email: ${hospitalEmail}
Hospital Phone: ${hospitalPhone}
District: ${district}

Requirement Details:
Blood Group Required: ${bloodGroup}
Units Required: ${unitsRequired} Unit(s)
Urgency: ${urgency}
Requirement ID: ${reqCode}
Date/Time: ${submittedAt}
  `.trim();

  const contentHtml = `
    <div style="background-color: #171720; border: 1px solid #272736; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 14px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #38bdf8; font-weight: 800;">
        Hospital Blood Requirement Published
      </h3>
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr>
          <td width="38%" style="color: #94a3b8; font-weight: 600;">Hospital Name</td>
          <td style="color: #ffffff; font-weight: 700;">${hospitalName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital Email</td>
          <td style="color: #38bdf8;">${hospitalEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital Phone</td>
          <td style="color: #10b981; font-family: monospace;">${hospitalPhone}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">District</td>
          <td style="color: #ffffff;">${district}</td>
        </tr>
        <tr style="border-top: 1px solid #262635;">
          <td style="color: #94a3b8; font-weight: 600; padding-top: 10px;">Blood Group Required</td>
          <td style="color: #FF2B2B; font-weight: 800; font-size: 15px; padding-top: 10px;">${bloodGroup}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Units Required</td>
          <td style="color: #ffffff; font-weight: 700;">${unitsRequired} Unit(s)</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Urgency</td>
          <td style="color: #f59e0b; font-weight: 700;">${urgency}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Requirement ID</td>
          <td style="color: #ffffff; font-family: monospace; font-weight: 700;">${reqCode}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Published Date/Time</td>
          <td style="color: #94a3b8; font-size: 12px;">${new Date(submittedAt).toUTCString()}</td>
        </tr>
      </table>
    </div>
  `;

  const html = wrapBloodBridgeTemplate({
    title: 'New Hospital Blood Requirement',
    preheader: `${hospitalName} published requirement for ${unitsRequired} unit(s) of ${bloodGroup} blood in ${district}.`,
    badgeText: 'HOSPITAL REQUIREMENT',
    badgeColor: '#38bdf8',
    contentHtml,
    actionButtonText: 'View Requirements',
    actionButtonUrl: `${getPublicAppUrl()}/find-blood`,
  });

  return await dispatchEmail({
    to: supportEmail,
    subject,
    html,
    text,
    notificationType: 'HOSPITAL_BLOOD_REQUIREMENT_CREATED',
    requestId: reqCode,
    dedupId: `${requirement.id || reqCode}:HOSPITAL_REQ_CREATED`,
    metadata: {
      hospitalId: hospital?.id || requirement.hospital_id || null,
      hospitalName,
      hospitalEmail,
      bloodGroup,
      unitsRequired,
      district,
      urgency,
      requirementId: requirement.id || reqCode,
      submittedAt,
    },
  });
}

/**
 * Dynamically resolves the hospital's registered email from Supabase and/or database.
 *
 * Precedence:
 * 1. Supabase hospitals table (if Supabase configured)
 * 2. Supabase profiles table (if Supabase configured)
 * 3. Supabase hospital_blood_requirements table (if Supabase configured)
 * 4. Local requirement record (hospital_email or email)
 * 5. Local hospital record (email, registered_email, contact_email)
 */
export async function resolveHospitalRegisteredEmail(hospitalId, requirement = null, hospital = null) {
  // 1. Check Supabase if configured
  if (isSupabaseConfiguredServer()) {
    try {
      const supa = getSupabaseServerClient();
      if (supa) {
        // A. Check hospitals table in Supabase
        if (hospitalId) {
          const { data: hospRow } = await supa
            .from('hospitals')
            .select('*')
            .eq('id', hospitalId)
            .maybeSingle();
          if (hospRow) {
            const candidate = hospRow.email || hospRow.registered_email || hospRow.contact_email;
            if (candidate && isValidEmail(candidate)) return candidate.trim();
          }
        }

        // B. Check profiles table in Supabase
        if (hospitalId) {
          const { data: profileRow } = await supa
            .from('profiles')
            .select('email, id, user_id, role')
            .or(`id.eq.${hospitalId},user_id.eq.${hospitalId}`)
            .maybeSingle();
          if (profileRow && profileRow.email && isValidEmail(profileRow.email)) {
            return profileRow.email.trim();
          }
        }

        // C. Check hospital_blood_requirements table in Supabase
        const reqId = requirement?.id || requirement?.requirement_id;
        if (reqId) {
          const { data: reqRow } = await supa
            .from('hospital_blood_requirements')
            .select('hospital_email, email')
            .eq('id', reqId)
            .maybeSingle();
          if (reqRow) {
            const candidate = reqRow.hospital_email || reqRow.email;
            if (candidate && isValidEmail(candidate)) return candidate.trim();
          }
        }
      }
    } catch (e) {
      console.warn('[SUPABASE EMAIL RESOLVE WARN]:', e.message);
    }
  }

  // 2. Check local database requirement record
  if (requirement) {
    const reqEmail = requirement.hospital_email || requirement.email;
    if (reqEmail && isValidEmail(reqEmail)) {
      return reqEmail.trim();
    }
  }

  // 3. Check local database hospital record
  let hospObj = hospital;
  if (!hospObj && hospitalId && db && typeof db.findHospitalById === 'function') {
    hospObj = db.findHospitalById(hospitalId);
  }

  if (hospObj) {
    const candidate = hospObj.email || hospObj.registered_email || hospObj.contact_email;
    if (candidate && isValidEmail(candidate)) {
      return candidate.trim();
    }
  }

  return null;
}

/**
 * 2b. EVENT: Hospital Alert When Donor Responds to Hospital Requirement
 *
 * REQUIRED FLOW:
 * User / Donor -> Existing "Donate Blood" action -> Save donation response ->
 * Identify hospital associated with requirement -> Retrieve hospital's registered email ->
 * Resend sends email:
 *   PRIMARY RECIPIENT (TO): Hospital's registered email
 *   SUPPORT COPY (BCC): bloodbridgesupportweb@gmail.com
 *
 * Notification type: DONOR_OFFER_TO_HOSPITAL
 * Error isolation: Resend failure NEVER blocks or rolls back donation response.
 */
export async function sendDonorOfferToHospitalNotification(response) {
  if (!response || !response.id) {
    console.warn('[EMAIL WARNING] Invalid or empty donation response passed to sendDonorOfferToHospitalNotification.');
    return { success: false, error: 'Invalid donation response', code: 'INVALID_RESPONSE' };
  }

  const reqId = response.requirement_id || response.requirementId;
  const respCode = response.response_code || response.id;
  const supportEmail = getSupportEmail(); // bloodbridgesupportweb@gmail.com

  // 1. Resolve requirement from database
  let requirement = null;
  if (db && typeof db.findHospitalBloodRequirementById === 'function') {
    requirement = db.findHospitalBloodRequirementById(reqId);
  }

  // 2. Resolve hospital from database
  const hospitalId = response.hospital_id || requirement?.hospital_id || null;
  let hospital = null;
  if (hospitalId && db && typeof db.findHospitalById === 'function') {
    hospital = db.findHospitalById(hospitalId);
  }

  // 3. Resolve hospital's registered email dynamically (Supabase + local database)
  const hospitalEmail = await resolveHospitalRegisteredEmail(hospitalId, requirement, hospital);

  const reqCode = requirement?.requirement_code || response.requirement_code || reqId || 'HBR-REQ';
  const hospitalName = hospital?.hospital_name || hospital?.name || requirement?.hospital_name || response.hospital_name || 'Hospital Blood Bank';
  const hospitalDistrict = requirement?.district || hospital?.district || response.donor_district || 'Tamil Nadu';
  const requiredBloodGroup = requirement?.blood_group || response.donor_blood_group || '—';
  const unitsRequired = requirement?.units_required || 1;
  const urgency = requirement?.urgency || 'Urgent';

  const donorName = response.donor_name || response.donorName || 'Voluntary Donor';
  const donorBloodGroup = response.donor_blood_group || response.donorBloodGroup || '—';
  const donorDistrict = response.donor_district || response.donorDistrict || hospitalDistrict;
  const donorPhone = response.donor_raw_phone || response.donor_phone || response.donorPhone || 'Not Provided';
  const donorEmail = response.donor_email || response.donorEmail || response.email || 'Not Provided';

  // VALIDATION: Hospital registered email must exist and be valid RFC 5322 email
  if (!hospitalEmail || !isValidEmail(hospitalEmail)) {
    console.warn(`[EMAIL NOTICE] Hospital "${hospitalId || 'unknown'}" has no registered email. Aborting direct dispatch to hospital; forwarding to BloodBridge central support.`);
    recordEmailLog({
      notification_type: 'DONOR_OFFER_TO_HOSPITAL',
      recipient_email: hospitalEmail || 'unregistered_hospital_email',
      hospital_id: hospitalId || 'unknown',
      hospital_email: hospitalEmail || null,
      support_email: supportEmail,
      support_copy_enabled: false,
      support_copy: null,
      request_id: reqCode,
      donation_response_id: response.id || respCode,
      blood_requirement_id: reqId,
      subject: 'BloodBridge – New Blood Donation Offer Received',
      status: 'failed',
      error_message: `Hospital "${hospitalId || 'unknown'}" has no registered email. Email delivery aborted to prevent misdirection.`,
      metadata: {
        hospitalId,
        requirementId: reqId,
        responseId: response.id,
        responseCode: respCode,
        donorName,
        donorBloodGroup,
      },
    });

    // Central support guarantee: Notification routed directly to central support
    await sendSupportDonorOfferNotification(response).catch((e) =>
      console.warn('[EMAIL BG ERROR Support Forward]:', e.message)
    );

    return {
      success: true,
      hospitalEmailMissing: true,
      message: 'Hospital registered email not found. Donation response successfully recorded and routed to BloodBridge central support.',
      code: 'FORWARDED_TO_SUPPORT',
    };
  }

  // Generate secure action tokens for one-click Approve / Decline
  let approveUrl = `${getPublicAppUrl()}/hospital-dashboard`;
  let declineUrl = `${getPublicAppUrl()}/hospital-dashboard`;
  let approveToken = null;
  let declineToken = null;

  if (db && typeof db.createApprovalToken === 'function') {
    const apprObj = db.createApprovalToken({
      responseId: response.id || respCode,
      requirementId: reqId,
      hospitalId,
      hospitalEmail,
      donorId: response.donor_id || response.donorId,
      donorEmail,
      donorName,
      action: 'APPROVE',
      expiresInHours: 168,
    });
    approveToken = apprObj.token;

    const declObj = db.createApprovalToken({
      responseId: response.id || respCode,
      requirementId: reqId,
      hospitalId,
      hospitalEmail,
      donorId: response.donor_id || response.donorId,
      donorEmail,
      donorName,
      action: 'DECLINE',
      expiresInHours: 168,
    });
    declineToken = declObj.token;

    approveUrl = getPublicApprovalActionUrl({ token: approveToken, action: 'approve' });
    declineUrl = getPublicApprovalActionUrl({ token: declineToken, action: 'decline' });
  }

  // Build subject and content matching Section 6 & Part 16
  const subject = 'BloodBridge – New Blood Donation Offer Received';

  const text = `
Hello ${hospitalName},

A donor has offered to donate blood through BloodBridge for your blood requirement.

Donation Offer Details:
Donor Name: ${donorName}
Blood Group: ${donorBloodGroup}
District: ${donorDistrict}
Phone: ${donorPhone}
Email: ${donorEmail}

Blood Requirement:
Blood Group Required: ${requiredBloodGroup}
Units Required: ${unitsRequired}
Hospital: ${hospitalName}
District: ${hospitalDistrict}
Urgency: ${urgency}
Request ID: ${reqCode}

ACTION REQUIRED:
A donor has offered to donate blood for your requirement.
[APPROVE DONATION]: ${approveUrl}
[REJECT DONATION]: ${declineUrl}

Please log in to BloodBridge to review the donation offer.

Thank you,
BloodBridge
Connecting Lives. One Drop at a Time.
  `.trim();

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #ffffff; font-weight: 600;">
      Hello ${hospitalName},
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #e2e8f0;">
      A donor has offered to donate blood through BloodBridge for your blood requirement.
    </p>

    <!-- Donation Offer Details -->
    <div style="background-color: #171720; border: 1px solid #272736; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 14px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #FF2B2B; font-weight: 800;">
        Donation Offer Details
      </h3>
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr>
          <td width="38%" style="color: #94a3b8; font-weight: 600;">Donor Name</td>
          <td style="color: #ffffff; font-weight: 700;">${donorName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Blood Group</td>
          <td style="color: #FF2B2B; font-weight: 800; font-size: 15px;">${donorBloodGroup}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">District</td>
          <td style="color: #ffffff;">${donorDistrict}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Phone</td>
          <td style="color: #10b981; font-family: monospace; font-weight: 700;">${donorPhone}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Email</td>
          <td style="color: #38bdf8;">${donorEmail}</td>
        </tr>
        ${response.donor_message ? `
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donor Message</td>
          <td style="color: #cbd5e1; font-style: italic;">"${response.donor_message}"</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <!-- Blood Requirement Details -->
    <div style="background-color: #171720; border: 1px solid #272736; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 14px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #38bdf8; font-weight: 800;">
        Blood Requirement
      </h3>
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr>
          <td width="38%" style="color: #94a3b8; font-weight: 600;">Blood Group Required</td>
          <td style="color: #FF2B2B; font-weight: 800;">${requiredBloodGroup}</td>
        </tr>
        <tr>
          <td width="38%" style="color: #94a3b8; font-weight: 600;">Units Required</td>
          <td style="color: #ffffff; font-weight: 700;">${unitsRequired} Unit(s)</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital</td>
          <td style="color: #ffffff; font-weight: 700;">${hospitalName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">District</td>
          <td style="color: #ffffff;">${hospitalDistrict}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Urgency</td>
          <td style="color: #f59e0b; font-weight: 700;">${urgency}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Request ID</td>
          <td style="color: #ffffff; font-family: monospace; font-weight: 700;">${reqCode}</td>
        </tr>
      </table>
    </div>

    <!-- ACTION REQUIRED: Approve / Decline Action Section -->
    <div style="background: linear-gradient(135deg, #1f0b0d 0%, #141419 100%); border: 1px solid #7f1d1d; border-radius: 14px; padding: 22px; margin-bottom: 24px; text-align: center;">
      <h3 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px; color: #f87171; font-weight: 800;">
        ACTION REQUIRED
      </h3>
      <p style="margin: 0 0 18px 0; font-size: 13px; line-height: 1.5; color: #fecaca;">
        A donor has offered to donate blood for your requirement. You can approve or decline this offer directly:
      </p>
      <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto;">
        <tr>
          <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <a href="${approveUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
              &#10003; APPROVE DONATION
            </a>
          </td>
          <td style="width: 12px;"></td>
          <td align="center" style="border-radius: 10px; background-color: #272736; border: 1px solid #3f3f50;">
            <a href="${declineUrl}" target="_blank" style="display: inline-block; padding: 14px 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 700; color: #cbd5e1; text-decoration: none; border-radius: 10px;">
              &#10005; Reject Donation
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 14px 0 0 0; font-size: 11px; color: #94a3b8;">
        Secure one-time link. Approving confirms this donation and automatically alerts the donor.
      </p>
    </div>

    <p style="margin: 0 0 8px 0; font-size: 13px; color: #cbd5e1;">
      Please log in to BloodBridge to review the donation offer.
    </p>
    <p style="margin: 0; font-size: 13px; color: #94a3b8;">
      Thank you,<br />
      <strong style="color: #ffffff;">BloodBridge</strong><br />
      <span style="font-size: 12px; color: #64748b;">Connecting Lives. One Drop at a Time.</span>
    </p>
  `;

  const html = wrapBloodBridgeTemplate({
    title: 'New Blood Donation Offer Received',
    preheader: `A donor has offered to donate ${donorBloodGroup} blood for requirement ${reqCode}.`,
    badgeText: 'DONOR OFFER',
    badgeColor: '#10b981',
    contentHtml,
    actionButtonText: 'Approve Donation',
    actionButtonUrl: approveUrl,
  });

  return await dispatchEmail({
    to: hospitalEmail,
    subject,
    html,
    text,
    notificationType: 'DONOR_OFFER_TO_HOSPITAL',
    requestId: reqCode,
    dedupId: response.id || respCode,
    metadata: {
      donationResponseId: response.id || respCode,
      bloodRequirementId: reqId,
      hospitalId,
      hospitalName,
      hospitalEmail,
      supportEmail,
      donorName,
      donorBloodGroup,
      approveToken,
      declineToken,
      approveUrl,
      declineUrl,
    },
  });
}

/**
 * 2b. EVENT: Hospital Approves Blood Donation Offer
 * Recipients:
 * - Primary (TO): Donor's registered email
 * - Monitoring copy (BCC): bloodbridgesupportweb@gmail.com
 * Notification type: DONATION_APPROVED
 */
export async function sendDonorOfferApprovedNotification({ response, requirement, hospital }) {
  if (!response || !response.id) {
    console.warn('[EMAIL WARNING] Invalid response object passed to sendDonorOfferApprovedNotification');
    return { success: false, error: 'Invalid response' };
  }

  const donorEmail = response.donor_email || response.donorEmail || response.email;
  if (!donorEmail || !isValidEmail(donorEmail)) {
    console.warn(`[EMAIL NOTICE] Donor for response "${response.id}" has no valid registered email. Skipping donor notification.`);
    return { success: false, error: 'Donor has no valid email address' };
  }

  const donorName = response.donor_name || response.donorName || 'Voluntary Donor';
  const donorBloodGroup = response.donor_blood_group || response.donorBloodGroup || requirement?.blood_group || '—';
  const hospitalName = hospital?.hospital_name || hospital?.name || requirement?.hospital_name || response.hospital_name || 'Hospital';
  const hospitalDistrict = requirement?.district || hospital?.district || response.donor_district || 'Tamil Nadu';
  const unitsRequired = requirement?.units_required || 1;
  const reqCode = requirement?.requirement_code || response.requirement_code || requirement?.id || response.id;
  const supportEmail = getSupportEmail();

  const subject = 'BloodBridge – Your Donation Offer Has Been Approved';

  const text = `
Hello ${donorName},

Your blood donation offer has been approved by:
${hospitalName}

Donation Details:
Blood Group: ${donorBloodGroup}
Hospital: ${hospitalName}
District: ${hospitalDistrict}
Units Required: ${unitsRequired}
Request ID: ${reqCode}

Please log in to BloodBridge for further details.

Thank you for helping save a life.
BloodBridge
Connecting Lives. One Drop at a Time.
  `.trim();

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #ffffff; font-weight: 600;">
      Hello ${donorName},
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #e2e8f0;">
      Your blood donation offer has been approved by: <strong style="color: #38bdf8;">${hospitalName}</strong>.
    </p>

    <!-- Donation Details -->
    <div style="background-color: #171720; border: 1px solid #272736; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 14px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #10b981; font-weight: 800;">
        Donation Details
      </h3>
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr>
          <td width="38%" style="color: #94a3b8; font-weight: 600;">Blood Group</td>
          <td style="color: #FF2B2B; font-weight: 800; font-size: 15px;">${donorBloodGroup}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital</td>
          <td style="color: #ffffff; font-weight: 700;">${hospitalName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">District</td>
          <td style="color: #ffffff;">${hospitalDistrict}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Units Required</td>
          <td style="color: #ffffff; font-weight: 700;">${unitsRequired} Unit(s)</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Request ID</td>
          <td style="color: #ffffff; font-family: monospace; font-weight: 700;">${reqCode}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 14px 0; font-size: 13px; color: #cbd5e1;">
      Please log in to BloodBridge for further details.
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #10b981; font-weight: 600;">
      Thank you for helping save a life.
    </p>
    <p style="margin: 0; font-size: 13px; color: #94a3b8;">
      Thank you,<br />
      <strong style="color: #ffffff;">BloodBridge</strong><br />
      <span style="font-size: 12px; color: #64748b;">Connecting Lives. One Drop at a Time.</span>
    </p>
  `;

  const html = wrapBloodBridgeTemplate({
    title: 'Your Donation Offer Has Been Approved',
    preheader: `Your blood donation offer has been approved by ${hospitalName}.`,
    badgeText: 'OFFER APPROVED',
    badgeColor: '#10b981',
    contentHtml,
    actionButtonText: 'View Donation Status',
    actionButtonUrl: `${getAppBaseUrl()}/donor-dashboard`,
  });

  return await dispatchEmail({
    to: donorEmail,
    subject,
    html,
    text,
    notificationType: 'DONATION_APPROVED',
    requestId: reqCode,
    dedupId: `${response.id}:APPROVED`,
    metadata: {
      donationResponseId: response.id,
      bloodRequirementId: requirement?.id || response.requirement_id,
      hospitalId: hospital?.id || response.hospital_id,
      hospitalName,
      hospitalEmail: hospital?.email,
      supportEmail,
      donorName,
      donorEmail,
    },
  });
}

/**
 * 2c. EVENT: Hospital Approves Donation - Dedicated Support Notification
 * Subject: BloodBridge – Donation Offer Approved
 * Recipient: bloodbridgesupportweb@gmail.com
 * Notification type: DONATION_APPROVED
 */
export async function sendSupportDonationApprovedNotification({ response, requirement, hospital }, customSubject = null) {
  if (!response || !response.id) {
    console.warn('[EMAIL WARNING] Invalid response object passed to sendSupportDonationApprovedNotification');
    return { success: false, error: 'Invalid response' };
  }

  const supportEmail = getSupportEmail();
  const hospitalName = hospital?.hospital_name || hospital?.name || requirement?.hospital_name || response.hospital_name || 'Hospital Blood Bank';
  const hospitalEmail = hospital?.email || requirement?.hospital_email || response.hospital_email || 'Not Provided';
  const donorName = response.donor_name || response.donorName || 'Voluntary Donor';
  const donorEmail = response.donor_email || response.donorEmail || response.email || 'Not Provided';
  const donorPhone = response.donor_raw_phone || response.donor_phone || response.donorPhone || 'Not Provided';
  const bloodGroup = response.donor_blood_group || response.donorBloodGroup || requirement?.blood_group || '—';
  const district = requirement?.district || hospital?.district || response.donor_district || 'Tamil Nadu';
  const reqCode = requirement?.requirement_code || response.requirement_code || requirement?.id || response.id;
  const respCode = response.response_code || response.id;
  const approvedAt = response.updated_at || new Date().toISOString();

  const subject = customSubject || 'BloodBridge – Donation Offer Approved';

  const text = `
BloodBridge Support Notification
Event: Hospital Accepted Donor Response
Subject: ${subject}

Hospital Details:
Hospital Name: ${hospitalName}
Hospital Email: ${hospitalEmail}
Hospital Location: ${district}

Donor Details:
Donor Name: ${donorName}
Donor Email: ${donorEmail}
Donor Phone: ${donorPhone}
Blood Group: ${bloodGroup}
Donor District: ${district}

Approval Details:
Request ID: ${reqCode}
Donation Response ID: ${respCode}
Approval Status: ACCEPTED_BY_HOSPITAL
Date/Time: ${approvedAt}

Coordination Notice:
Hospital has accepted the donor response. Please contact/coordinate with the hospital and donor as required.

BloodBridge
"Connecting Lives. One Drop at a Time."
  `.trim();

  const contentHtml = `
    <div style="background-color: #171720; border: 1px solid #272736; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 14px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #10b981; font-weight: 800;">
        BloodBridge &ndash; Hospital Accepted Donor Response
      </h3>
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr>
          <td width="38%" style="color: #94a3b8; font-weight: 600;">Request ID</td>
          <td style="color: #ffffff; font-family: monospace; font-weight: 700;">${reqCode}</td>
        </tr>
        <tr>
          <td width="38%" style="color: #94a3b8; font-weight: 600;">Hospital Name</td>
          <td style="color: #ffffff; font-weight: 700;">${hospitalName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital Email</td>
          <td style="color: #38bdf8;">${hospitalEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Location / District</td>
          <td style="color: #ffffff;">${district}</td>
        </tr>
        <tr style="border-top: 1px solid #262635;">
          <td style="color: #94a3b8; font-weight: 600; padding-top: 10px;">Donor Name</td>
          <td style="color: #ffffff; font-weight: 700; padding-top: 10px;">${donorName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donor Email</td>
          <td style="color: #38bdf8;">${donorEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donor Phone</td>
          <td style="color: #10b981; font-family: monospace; font-weight: 700;">${donorPhone}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Blood Group</td>
          <td style="color: #FF2B2B; font-weight: 800; font-size: 15px;">${bloodGroup}</td>
        </tr>
        <tr style="border-top: 1px solid #262635;">
          <td style="color: #94a3b8; font-weight: 600; padding-top: 10px;">Donation Response ID</td>
          <td style="color: #ffffff; font-family: monospace; padding-top: 10px;">${respCode}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Current Request Status</td>
          <td style="color: #10b981; font-weight: 800;">ACCEPTED BY HOSPITAL</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Acceptance Date / Time</td>
          <td style="color: #94a3b8; font-size: 12px;">${new Date(approvedAt).toUTCString()}</td>
        </tr>
      </table>
    </div>
    <div style="padding: 12px 16px; background-color: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 12px; color: #a7f3d0; line-height: 1.5;">
        <strong>Coordination Information:</strong> Hospital accepted donation offer. Please coordinate donor arrival and donation schedule as required.<br />
        <span style="font-size: 11px; color: #6ee7b7;">BloodBridge &ndash; Connecting Lives. One Drop at a Time.</span>
      </p>
    </div>
  `;

  const html = wrapBloodBridgeTemplate({
    title: 'Hospital Accepted Donor Response',
    preheader: `${hospitalName} approved blood donation offer from ${donorName} (${bloodGroup}).`,
    badgeText: 'DONATION APPROVED',
    badgeColor: '#10b981',
    contentHtml,
    actionButtonText: 'Open BloodBridge Dashboard',
    actionButtonUrl: `${getPublicAppUrl()}/admin-dashboard?tab=requests`,
  });

  return await dispatchEmail({
    to: supportEmail,
    subject,
    html,
    text,
    notificationType: 'DONATION_APPROVED',
    requestId: reqCode,
    dedupId: `${response.id || respCode}:SUPPORT_DONATION_APPROVED`,
    metadata: {
      userId: response.donor_id || response.donorId || null,
      donationResponseId: response.id || respCode,
      bloodRequirementId: requirement?.id || response.requirement_id || null,
      hospitalId: hospital?.id || response.hospital_id || null,
      hospitalName,
      hospitalEmail,
      donorName,
      donorEmail,
      bloodGroup,
      status: 'APPROVED',
      approvedAt,
    },
  });
}

/**
 * Backwards compatibility alias for existing code referencing sendHospitalDonorResponseNotification
 */
export async function sendHospitalDonorResponseNotification(response, hospitalEmail) {
  if (response) {
    if (hospitalEmail && isValidEmail(hospitalEmail) && !response.hospital_email) {
      response.hospital_email = hospitalEmail;
    }
    return await sendDonorOfferToHospitalNotification(response);
  }
  return null;
}

/**
 * 3. EVENT: Hospital / Donor Accepts Request
 * Recipients:
 * - Admin notification: bloodbridgesupportweb@gmail.com
 * - Requester notification: requester_email (if available)
 */
export async function sendHospitalAcceptedRequestNotification(requestData, hospitalData = {}) {
  const adminEmail = getAdminEmail();
  const requestCode = requestData.request_code || requestData.requestCode || requestData.id;
  const requesterName = requestData.requester_name || requestData.requesterName || 'Blood Requester';
  const requesterEmail = requestData.requester_email || requestData.requesterEmail || requestData.email || 'Not Provided';
  const requesterPhone = requestData.requester_phone || requestData.requesterPhone || requestData.contact_number || 'Not Provided';
  const bloodGroup = requestData.blood_group || requestData.bloodGroup;
  const hospital = hospitalData.hospital_name || hospitalData.name || requestData.hospital_name || 'Hospital Desk';
  const hospitalContact = hospitalData.contact_phone || hospitalData.phone || requestData.hospital_contact || 'N/A';
  const hospitalEmail = hospitalData.email || requestData.hospital_email || 'N/A';
  const acceptedAt = new Date().toISOString();

  const subject = 'BloodBridge – Blood Request Accepted';

  const contentHtml = `
    <div style="background-color: #171720; border: 1px solid #272736; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #e2e8f0;">
        Blood request <strong>#${requestCode}</strong> has been officially accepted for medical fulfillment.
      </p>

      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr>
          <td width="35%" style="color: #94a3b8; font-weight: 600;">Request ID</td>
          <td style="color: #ffffff; font-family: monospace; font-weight: 700;">${requestCode}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Requester</td>
          <td style="color: #ffffff; font-weight: 700;">${requesterName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Requester Email</td>
          <td style="color: #38bdf8;">${requesterEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Requester Phone</td>
          <td style="color: #10b981; font-family: monospace;">${requesterPhone}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Blood Group</td>
          <td style="color: #FF2B2B; font-weight: 800;">${bloodGroup}</td>
        </tr>
        <tr style="border-top: 1px solid #262635;">
          <td style="color: #94a3b8; font-weight: 600; padding-top: 10px;">Fulfilling Hospital</td>
          <td style="color: #ffffff; font-weight: 700; padding-top: 10px;">${hospital}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital Contact</td>
          <td style="color: #10b981; font-family: monospace;">${hospitalContact}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital Email</td>
          <td style="color: #38bdf8;">${hospitalEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Accepted At</td>
          <td style="color: #94a3b8; font-size: 12px;">${new Date(acceptedAt).toUTCString()}</td>
        </tr>
      </table>
    </div>
  `;

  const text = `
BloodBridge – Blood Request Accepted
Request ID: ${requestCode}
Requester: ${requesterName}
Requester Email: ${requesterEmail}
Requester Phone: ${requesterPhone}
Blood Group: ${bloodGroup}
Hospital: ${hospital}
Hospital Contact: ${hospitalContact}
Hospital Email: ${hospitalEmail}
Accepted At: ${acceptedAt}
  `.trim();

  const html = wrapBloodBridgeTemplate({
    title: 'Blood Request Accepted',
    preheader: `Request #${requestCode} accepted by ${hospital}.`,
    badgeText: 'REQUEST ACCEPTED',
    badgeColor: '#10b981',
    contentHtml,
    actionButtonText: 'View Request Status',
    actionButtonUrl: `${getPublicAppUrl()}/my-requests`,
  });

  // 1. Send Admin notification
  await dispatchEmail({
    to: adminEmail,
    subject,
    html,
    text,
    notificationType: 'REQUEST_ACCEPTED_ADMIN',
    requestId: requestCode,
  });

  // 2. Send Requester notification if valid email exists
  if (requesterEmail && isValidEmail(requesterEmail)) {
    await dispatchEmail({
      to: requesterEmail,
      subject: `BloodBridge – Your Blood Request Has Been Accepted! 🎉`,
      html,
      text,
      notificationType: 'REQUEST_ACCEPTED_USER',
      requestId: requestCode,
    });
  }
}

/**
 * 4. EVENT: Bombay Blood Group Special Request Submitted
 * Recipient: bloodbridgesupportweb@gmail.com (ADMIN_NOTIFICATION_EMAIL)
 * Note: NEVER leaks secure tokens or passwords.
 */
export async function sendAdminBombayRequestNotification(bombayRequest) {
  const adminEmail = getAdminEmail();
  const requestCode = bombayRequest.request_code || bombayRequest.requestCode || bombayRequest.id || 'BOMBAY-REQ';
  const subject = 'BloodBridge – Bombay Blood Group Special Request';

  const patientName = bombayRequest.patient_name || bombayRequest.patientName || 'Protected Patient';
  const hospital = bombayRequest.hospital_name || bombayRequest.hospitalName || 'Clinical Centre';
  const district = bombayRequest.district || 'Karur';
  const units = bombayRequest.units_required || bombayRequest.unitsRequired || 1;
  const urgency = bombayRequest.urgency || 'Critical / Emergency';
  const reason = bombayRequest.reason || 'Clinical triage requirement';
  const submittedAt = bombayRequest.created_at || new Date().toISOString();

  const contentHtml = `
    <div style="background-color: #1f0b0d; border: 1px solid #7f1d1d; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <div style="color: #f87171; font-weight: 800; font-size: 15px; margin-bottom: 12px; display: flex; align-items: center;">
        &#9888; HIGH CLINICAL PRIORITY: Bombay Blood Group (Oh / hh)
      </div>
      <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #fecaca;">
        A special request for ultra-rare Bombay Blood Group has been registered. This request is held under protected clinical verification protocol.
      </p>

      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr>
          <td width="35%" style="color: #fca5a5; font-weight: 600;">Request Code</td>
          <td style="color: #ffffff; font-family: monospace; font-weight: 700;">${requestCode}</td>
        </tr>
        <tr>
          <td style="color: #fca5a5; font-weight: 600;">Blood Group</td>
          <td style="color: #ffffff; font-weight: 900; font-size: 16px;">Bombay Blood Group (Oh)</td>
        </tr>
        <tr>
          <td style="color: #fca5a5; font-weight: 600;">Patient / Initials</td>
          <td style="color: #ffffff; font-weight: 700;">${patientName}</td>
        </tr>
        <tr>
          <td style="color: #fca5a5; font-weight: 600;">Hospital</td>
          <td style="color: #ffffff;">${hospital}</td>
        </tr>
        <tr>
          <td style="color: #fca5a5; font-weight: 600;">District</td>
          <td style="color: #ffffff;">${district}</td>
        </tr>
        <tr>
          <td style="color: #fca5a5; font-weight: 600;">Units Required</td>
          <td style="color: #ffffff; font-weight: 700;">${units} Unit(s)</td>
        </tr>
        <tr>
          <td style="color: #fca5a5; font-weight: 600;">Urgency</td>
          <td style="color: #f87171; font-weight: 700;">${urgency}</td>
        </tr>
        <tr>
          <td style="color: #fca5a5; font-weight: 600;">Clinical Purpose</td>
          <td style="color: #fecaca; font-style: italic;">"${reason}"</td>
        </tr>
        <tr>
          <td style="color: #fca5a5; font-weight: 600;">Submitted At</td>
          <td style="color: #fca5a5; font-size: 12px;">${new Date(submittedAt).toUTCString()}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
      Security Notice: Confidential verification tokens and access keys are strictly protected and never transmitted in email alerts. Log in to the Admin Dashboard with clinical credentials to verify this request.
    </p>
  `;

  const text = `
BloodBridge – Bombay Blood Group Special Request
A protected Bombay Blood Group (Oh) request has been registered.

Request Code: ${requestCode}
Blood Group: Bombay Blood Group (Oh)
Patient: ${patientName}
Hospital: ${hospital}
District: ${district}
Units Required: ${units}
Urgency: ${urgency}
Clinical Reason: ${reason}
Submitted At: ${submittedAt}

Security Notice: Confidential keys are never exposed in email. Please log in to BloodBridge Admin Dashboard to verify.
  `.trim();

  const html = wrapBloodBridgeTemplate({
    title: 'Bombay Blood Group Special Request',
    preheader: `Protected Oh requirement registered at ${hospital} (${district}).`,
    badgeText: 'PROTECTED PROTOCOL',
    badgeColor: '#ef4444',
    contentHtml,
    actionButtonText: 'Access Admin Dashboard',
    actionButtonUrl: `${getPublicAppUrl()}/admin-dashboard`,
  });

  return await dispatchEmail({
    to: adminEmail,
    subject,
    html,
    text,
    notificationType: 'BOMBAY_SPECIAL_REQUEST_ADMIN',
    requestId: requestCode,
    metadata: { patientName, hospital, district, units },
  });
}

/**
 * 5. EVENT: Developer & Admin Connection Test Function
 */
export async function sendTestEmail(recipientEmail) {
  const targetEmail = recipientEmail || getAdminEmail();
  const subject = 'BloodBridge – Email Notification Test';
  const timestamp = new Date().toISOString();

  const contentHtml = `
    <div style="background-color: #171720; border: 1px solid #272736; border-radius: 14px; padding: 22px; margin-bottom: 24px;">
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #e2e8f0;">
        This is a test email from the <strong>BloodBridge notification system</strong>.
      </p>
      <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #10b981; font-weight: 600;">
        &#10003; Email service connection is working successfully.
      </p>

      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr>
          <td width="35%" style="color: #94a3b8; font-weight: 600;">Configured Admin</td>
          <td style="color: #ffffff; font-family: monospace;">${targetEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Dispatch Engine</td>
          <td style="color: #38bdf8;">Resend Transactional API</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Timestamp</td>
          <td style="color: #ffffff; font-size: 12px;">${timestamp}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
      The BloodBridge transactional email engine is active and monitoring blood requests, donor offers, hospital accepts, and Bombay blood group protocols.
    </p>
  `;

  const text = `
BloodBridge – Email Notification Test
This is a test email from the BloodBridge notification system.
Email service connection is working successfully.
Recipient: ${targetEmail}
Timestamp: ${timestamp}
  `.trim();

  const html = wrapBloodBridgeTemplate({
    title: 'Email Notification Test',
    preheader: 'BloodBridge transactional email automation test.',
    badgeText: 'CONNECTION ACTIVE',
    badgeColor: '#10b981',
    contentHtml,
    actionButtonText: 'Return to BloodBridge',
    actionButtonUrl: getPublicAppUrl(),
  });

  return await dispatchEmail({
    to: targetEmail,
    subject,
    html,
    text,
    notificationType: 'TEST_EMAIL',
    requestId: `test-${Date.now()}`,
  });
}

/**
 * Standard centralized BloodBridge transactional email sender with automatic support BCC
 */
export const sendBloodBridgeEmail = dispatchEmail;

/**
 * 6. REUSABLE CENTRAL SUPPORT NOTIFICATION FUNCTION (Requirement 7)
 *
 * Conceptually:
 * sendBloodBridgeNotification({
 *   eventType,
 *   recipientEmail,
 *   supportEmail,
 *   subject,
 *   data
 * })
 *
 * Implements centralized transactional email routing with:
 * - Direct delivery to recipient + automatic BCC copy to central support
 * - Graceful fallback to central support if recipient is missing or invalid
 * - Non-blocking execution & Resend error isolation
 * - Full audit logging to file and Supabase
 */
export async function sendBloodBridgeNotification({
  eventType = 'GENERAL',
  recipientEmail = null,
  supportEmail = null,
  subject = null,
  data = {},
}) {
  const centralSupport = supportEmail || getSupportEmail();
  const cleanRecipient = typeof recipientEmail === 'string' ? recipientEmail.trim() : '';
  const hasValidRecipient = Boolean(cleanRecipient && isValidEmail(cleanRecipient));

  const requestId = data.requestId || data.requestCode || data.request_id || data.request_code || data.id || 'BB-REQ';
  const responseId = data.responseId || data.responseCode || data.donationResponseId || data.donation_response_id || null;
  const hospitalName = data.hospitalName || data.hospital_name || data.hospital || 'Hospital Blood Bank';
  const hospitalEmail = data.hospitalEmail || data.hospital_email || (hasValidRecipient ? cleanRecipient : 'Not Available');
  const donorName = data.donorName || data.donor_name || 'Voluntary Donor';
  const donorEmail = data.donorEmail || data.donor_email || 'Not Provided';
  const donorPhone = data.donorPhone || data.donor_phone || data.donor_raw_phone || 'Not Provided';
  const bloodGroup = data.bloodGroup || data.blood_group || '—';
  const units = data.units || data.unitsRequired || data.units_required || 1;
  const district = data.district || data.location || data.city || 'Tamil Nadu';
  const urgency = data.urgency || data.emergency_level || 'Normal';
  const status = data.status || 'ACTIVE';
  const timestamp = data.timestamp || data.createdAt || data.created_at || new Date().toISOString();

  // Generate subject if not provided
  let emailSubject = subject;
  if (!emailSubject) {
    switch (eventType) {
      case 'BLOOD_REQUEST_SUBMITTED':
      case 'BLOOD_REQUEST':
        emailSubject = 'BloodBridge – New Blood Request';
        break;
      case 'DONOR_RESPONSE':
      case 'DONOR_OFFER':
      case 'DONOR_OFFER_SUBMITTED':
        emailSubject = 'BloodBridge – New Donor Response';
        break;
      case 'HOSPITAL_ACCEPTED_DONOR':
      case 'DONATION_APPROVED':
        emailSubject = 'BloodBridge – Hospital Accepted Donor';
        break;
      case 'EMERGENCY_BLOOD_REQUEST':
      case 'EMERGENCY_REQUEST':
        emailSubject = 'BloodBridge – Emergency Blood Request';
        break;
      case 'BOMBAY_BLOOD_REQUEST':
      case 'BOMBAY_REQUEST':
        emailSubject = 'BloodBridge – Bombay Blood Group Request';
        break;
      case 'REQUEST_STATUS_UPDATE':
        emailSubject = 'BloodBridge – Request Status Update';
        break;
      case 'REQUEST_CANCELLED':
        emailSubject = 'BloodBridge – Blood Request Cancelled';
        break;
      case 'HOSPITAL_REQUIREMENT_CREATED':
      case 'HOSPITAL_REQUIREMENT':
        emailSubject = 'BloodBridge – New Hospital Blood Requirement';
        break;
      default:
        emailSubject = `BloodBridge – ${eventType}`;
    }
  }

  // Plain text
  const text = `
BloodBridge – Central Support Notification
Event: ${eventType}
Subject: ${emailSubject}

Request Details:
Request ID: ${requestId}
${responseId ? `Response ID: ${responseId}\n` : ''}Hospital Name: ${hospitalName}
Hospital Email: ${hospitalEmail}
Hospital Location: ${district}
Required Blood Group: ${bloodGroup}
Required Units: ${units}
Emergency Status: ${urgency}
Current Status: ${status}

Donor Details:
Donor Name: ${donorName}
Donor Blood Group: ${bloodGroup}
Donor Phone: ${donorPhone}
Donor Email: ${donorEmail}
Donor District: ${district}
Date/Time: ${new Date(timestamp).toUTCString()}

Please contact/coordinate with the hospital and donor as required.

BloodBridge
"Connecting Lives. One Drop at a Time."
  `.trim();

  // HTML content table
  const contentHtml = `
    <div style="background-color: #171720; border: 1px solid #272736; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 14px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #10b981; font-weight: 800;">
        ${emailSubject}
      </h3>
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
        <tr>
          <td width="38%" style="color: #94a3b8; font-weight: 600;">Request ID</td>
          <td style="color: #ffffff; font-family: monospace; font-weight: 700;">${requestId}</td>
        </tr>
        ${responseId ? `
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Response ID</td>
          <td style="color: #ffffff; font-family: monospace;">${responseId}</td>
        </tr>` : ''}
        <tr>
          <td width="38%" style="color: #94a3b8; font-weight: 600;">Hospital Name</td>
          <td style="color: #ffffff; font-weight: 700;">${hospitalName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Hospital Email</td>
          <td style="color: #38bdf8;">${hospitalEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Blood Group</td>
          <td style="color: #FF2B2B; font-weight: 800; font-size: 15px;">${bloodGroup}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Required Units</td>
          <td style="color: #ffffff; font-weight: 700;">${units} Unit(s)</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">District / Location</td>
          <td style="color: #ffffff;">${district}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Emergency Status</td>
          <td style="color: #f59e0b; font-weight: 700;">${urgency}</td>
        </tr>
        <tr style="border-top: 1px solid #262635;">
          <td style="color: #94a3b8; font-weight: 600; padding-top: 10px;">Donor Name</td>
          <td style="color: #ffffff; font-weight: 700; padding-top: 10px;">${donorName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donor Email</td>
          <td style="color: #38bdf8;">${donorEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Donor Phone</td>
          <td style="color: #10b981; font-family: monospace;">${donorPhone}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Current Status</td>
          <td style="color: #10b981; font-weight: 700;">${status}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">Date / Time</td>
          <td style="color: #94a3b8; font-size: 12px;">${new Date(timestamp).toUTCString()}</td>
        </tr>
      </table>
    </div>
    <div style="padding: 12px 16px; background-color: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 12px; color: #a7f3d0; line-height: 1.5;">
        <strong>Coordination Information:</strong> Please contact/coordinate with the hospital and donor as required.<br />
        <span style="font-size: 11px; color: #6ee7b7;">BloodBridge &ndash; Connecting Lives. One Drop at a Time.</span>
      </p>
    </div>
  `;

  const html = wrapBloodBridgeTemplate({
    title: emailSubject,
    preheader: `${eventType}: ${requestId} (${bloodGroup}) at ${hospitalName}.`,
    badgeText: 'SUPPORT NOTICE',
    badgeColor: '#10b981',
    contentHtml,
    actionButtonText: 'Open BloodBridge Dashboard',
    actionButtonUrl: `${getPublicAppUrl()}/admin-dashboard`,
  });

  // If valid primary recipient exists and is not the support email, send to recipient with BCC to support
  if (hasValidRecipient && cleanRecipient.toLowerCase() !== centralSupport.toLowerCase()) {
    return await dispatchEmail({
      to: cleanRecipient,
      subject: emailSubject,
      html,
      text,
      notificationType: eventType,
      requestId,
      dedupId: responseId || requestId,
      metadata: {
        ...data,
        eventType,
        hospitalEmail,
        supportEmail: centralSupport,
      },
    });
  }

  // Otherwise, send directly to central support email
  return await dispatchEmail({
    to: centralSupport,
    subject: emailSubject,
    html,
    text,
    notificationType: eventType,
    requestId,
    dedupId: `${responseId || requestId}:SUPPORT_DIRECT`,
    metadata: {
      ...data,
      eventType,
      hospitalEmail,
      recipientOriginal: cleanRecipient || null,
      routedToSupportDirect: true,
    },
  });
}


