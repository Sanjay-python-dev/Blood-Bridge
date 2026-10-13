// =============================================================================
// BloodBridge – Supabase Edge Function: email-action
// =============================================================================
// Public HTTPS endpoint for one-click Hospital Donation Approval & Decline.
// Enables hospitals to approve or decline donation offers directly from Gmail,
// mobile phones, or any device without requiring localhost or npm run dev.
//
// Endpoint format:
// https://<project-ref>.supabase.co/functions/v1/email-action?token=<SECURE_TOKEN>&action=approve
//
// Expected workflow:
// Hospital Gmail -> Approve Donation link -> Public Supabase Edge Function
// -> Validate Token -> Verify Hospital -> Update Status (PENDING -> APPROVED)
// -> Send Donor Notification via Resend (BCC support) -> Return Clean Success Response
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface RenderOptions {
  title: string;
  badge: string;
  badgeColor?: string;
  message: string;
  submessage?: string;
  details?: {
    hospitalName?: string;
    donorName?: string;
    bloodGroup?: string;
    units?: number | string;
    requestCode?: string;
    status?: string;
  };
  portalUrl?: string;
}

function renderHtml(options: RenderOptions): string {
  const {
    title,
    badge,
    badgeColor = "#10b981",
    message,
    submessage,
    details,
    portalUrl = "https://bloodbridge.org",
  } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BloodBridge – ${title}</title>
  <style>
    body {
      margin: 0;
      padding: 24px 16px;
      background-color: #0c0c10;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
    }
    .card {
      max-width: 540px;
      width: 100%;
      background-color: #141419;
      border: 1px solid #262634;
      border-radius: 20px;
      padding: 36px 32px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
      text-align: center;
      box-sizing: border-box;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: ${badgeColor};
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid ${badgeColor}55;
      border-radius: 20px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 23px;
      font-weight: 800;
      margin: 0 0 10px 0;
      color: #ffffff;
      letter-spacing: -0.3px;
    }
    .main-msg {
      font-size: 15px;
      line-height: 1.6;
      color: #f1f5f9;
      margin: 0 0 8px 0;
      font-weight: 500;
    }
    .sub-msg {
      font-size: 13px;
      line-height: 1.5;
      color: #94a3b8;
      margin: 0 0 20px 0;
    }
    .info-box {
      background-color: #1a1a24;
      border: 1px solid #2b2b3a;
      border-radius: 14px;
      padding: 18px 20px;
      text-align: left;
      margin: 20px 0;
      font-size: 13px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #242432;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #94a3b8;
      font-weight: 500;
    }
    .info-val {
      color: #ffffff;
      font-weight: 700;
    }
    .btn-portal {
      display: inline-block;
      margin-top: 10px;
      padding: 13px 30px;
      background: linear-gradient(135deg, #FF2B2B 0%, #990000 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 4px 15px rgba(229, 9, 20, 0.45);
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">${badge}</span>
    <h1>${title}</h1>
    <p class="main-msg">${message}</p>
    ${submessage ? `<p class="sub-msg">${submessage}</p>` : ""}
    ${details ? `
    <div class="info-box">
      ${details.hospitalName ? `<div class="info-row"><span class="info-label">Hospital</span><span class="info-val">${details.hospitalName}</span></div>` : ""}
      ${details.donorName ? `<div class="info-row"><span class="info-label">Donor</span><span class="info-val">${details.donorName}</span></div>` : ""}
      ${details.bloodGroup ? `<div class="info-row"><span class="info-label">Blood Group</span><span class="info-val" style="color: #FF2B2B; font-weight: 800;">${details.bloodGroup}</span></div>` : ""}
      ${details.units ? `<div class="info-row"><span class="info-label">Units</span><span class="info-val">${details.units} Unit(s)</span></div>` : ""}
      ${details.requestCode ? `<div class="info-row"><span class="info-label">Request ID</span><span class="info-val" style="font-family: monospace;">${details.requestCode}</span></div>` : ""}
      ${details.status ? `<div class="info-row"><span class="info-label">Status</span><span class="info-val" style="color: ${badgeColor}; font-weight: 800;">${details.status}</span></div>` : ""}
    </div>
    ` : ""}
    <a href="${portalUrl}" class="btn-portal">Return to BloodBridge Portal &rarr;</a>
  </div>
</body>
</html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = (url.searchParams.get("token") || "").trim();
  const actionParam = (url.searchParams.get("action") || "approve").toLowerCase();
  const format = url.searchParams.get("format") || (req.headers.get("accept")?.includes("application/json") ? "json" : "html");
  const portalUrl = Deno.env.get("APP_PUBLIC_URL") || "https://bloodbridge.org";

  const responseHeaders = {
    ...corsHeaders,
    "Content-Type": format === "json" ? "application/json" : "text/html; charset=utf-8",
  };

  const reply = (status: number, jsonBody: Record<string, unknown>, htmlContent: string) => {
    return new Response(
      format === "json" ? JSON.stringify(jsonBody) : htmlContent,
      { status, headers: responseHeaders }
    );
  };

  // 1. Verify token presence
  if (!token) {
    return reply(
      400,
      { success: false, error: "This approval link is invalid or has expired.", code: "INVALID_TOKEN" },
      renderHtml({
        title: "Invalid Approval Link",
        badge: "SECURITY NOTICE",
        badgeColor: "#ef4444",
        message: "This approval link is invalid or has expired.",
        submessage: "Please log in to BloodBridge to review the blood donation request.",
        portalUrl,
      })
    );
  }

  // Connect to Supabase
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

  // If Edge Function is executed where database secrets are routed through backend proxy:
  if (!supabaseUrl || !supabaseKey) {
    const backendUrl = Deno.env.get("APP_BACKEND_URL") || Deno.env.get("APP_PUBLIC_URL");
    if (backendUrl && !backendUrl.includes("localhost")) {
      try {
        const forwardRes = await fetch(
          `${backendUrl.replace(/\/$/, "")}/api/email-action?token=${encodeURIComponent(token)}&action=${encodeURIComponent(actionParam)}&format=json`
        );
        const forwardData = await forwardRes.json();
        return reply(
          forwardRes.status,
          forwardData,
          renderHtml({
            title: forwardData.message || (forwardData.success ? "Donation Approved" : "Action Failed"),
            badge: forwardData.success ? "CONFIRMED" : "NOTICE",
            badgeColor: forwardData.success ? "#10b981" : "#ef4444",
            message: forwardData.message || "Action processed.",
            submessage: forwardData.submessage || "Thank you for using BloodBridge.",
            portalUrl,
          })
        );
      } catch (fErr) {
        console.error("Backend proxy error:", fErr);
      }
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. Look up approval token in public.approval_tokens
  const { data: tokenRecord, error: tokenErr } = await supabase
    .from("approval_tokens")
    .select("*")
    .or(`token.eq.${token},token_hash.eq.${token}`)
    .maybeSingle();

  if (tokenErr || !tokenRecord) {
    return reply(
      400,
      { success: false, error: "This approval link is invalid or has expired.", code: "INVALID_TOKEN" },
      renderHtml({
        title: "Invalid Approval Link",
        badge: "SECURITY NOTICE",
        badgeColor: "#ef4444",
        message: "This approval link is invalid or has expired.",
        submessage: "Please log in to BloodBridge to review the blood donation request.",
        portalUrl,
      })
    );
  }

  // 3. Check expiration
  if (tokenRecord.expires_at && new Date() > new Date(tokenRecord.expires_at)) {
    return reply(
      400,
      { success: false, error: "This approval link is invalid or has expired.", code: "EXPIRED_TOKEN" },
      renderHtml({
        title: "Invalid Approval Link",
        badge: "LINK EXPIRED",
        badgeColor: "#f59e0b",
        message: "This approval link is invalid or has expired.",
        submessage: "Please log in to BloodBridge to review the blood donation request.",
        portalUrl,
      })
    );
  }

  // 4. Fetch donation response
  const { data: response, error: respErr } = await supabase
    .from("donor_blood_responses")
    .select("*")
    .eq("id", tokenRecord.donation_response_id)
    .maybeSingle();

  if (respErr || !response) {
    return reply(
      404,
      { success: false, error: "Donation response record not found.", code: "RESPONSE_NOT_FOUND" },
      renderHtml({
        title: "Record Not Found",
        badge: "NOT FOUND",
        badgeColor: "#ef4444",
        message: "The corresponding donation response could not be located.",
        portalUrl,
      })
    );
  }

  // 5. Fetch requirement & hospital details
  const { data: requirement } = await supabase
    .from("hospital_blood_requirements")
    .select("*")
    .eq("id", response.requirement_id)
    .maybeSingle();

  const hospitalName = response.hospital_name || requirement?.hospital_name || "Hospital Desk";
  const donorName = response.donor_name || "Voluntary Donor";
  const bloodGroup = response.donor_blood_group || requirement?.blood_group || "—";
  const requestCode = requirement?.requirement_code || response.requirement_code || response.id;
  const units = requirement?.units_required || 1;

  // 6. Prevent Double Approval & Verify Token Not Already Used
  if (
    tokenRecord.status === "USED" ||
    response.status === "ACCEPTED_BY_HOSPITAL" ||
    response.status === "APPROVED"
  ) {
    return reply(
      200,
      {
        success: true,
        message: "Donation already approved.",
        alreadyApproved: true,
        response,
      },
      renderHtml({
        title: "Donation Already Approved",
        badge: "ALREADY CONFIRMED",
        badgeColor: "#38bdf8",
        message: "Donation already approved.",
        submessage: "This donation offer has already been confirmed. No duplicate approval was created.",
        details: { hospitalName, donorName, bloodGroup, units, requestCode, status: "APPROVED" },
        portalUrl,
      })
    );
  }

  // 7. Verify hospital
  if (tokenRecord.hospital_id && response.hospital_id && tokenRecord.hospital_id !== response.hospital_id) {
    return reply(
      403,
      { success: false, error: "Token does not match hospital record.", code: "HOSPITAL_MISMATCH" },
      renderHtml({
        title: "Unauthorized Action",
        badge: "SECURITY NOTICE",
        badgeColor: "#ef4444",
        message: "This approval link does not match the hospital for this request.",
        submessage: "Please log in to BloodBridge to review the blood donation request.",
        portalUrl,
      })
    );
  }

  const action = (tokenRecord.action || actionParam).toLowerCase();

  // 8. DECLINE / REJECT
  if (action === "decline" || action === "reject") {
    await supabase
      .from("donor_blood_responses")
      .update({ status: "DECLINED_BY_HOSPITAL", updated_at: new Date().toISOString() })
      .eq("id", response.id);

    await supabase
      .from("approval_tokens")
      .update({ status: "USED", used_at: new Date().toISOString() })
      .eq("id", tokenRecord.id);

    return reply(
      200,
      { success: true, message: "Donation offer declined successfully." },
      renderHtml({
        title: "Donation Offer Declined",
        badge: "OFFER DECLINED",
        badgeColor: "#64748b",
        message: "The donation offer has been declined.",
        submessage: "The donor response status has been updated in BloodBridge.",
        details: { hospitalName, donorName, bloodGroup, requestCode, status: "DECLINED" },
        portalUrl,
      })
    );
  }

  // 9. APPROVE ACTION
  await supabase
    .from("donor_blood_responses")
    .update({ status: "ACCEPTED_BY_HOSPITAL", updated_at: new Date().toISOString() })
    .eq("id", response.id);

  if (requirement) {
    await supabase
      .from("hospital_blood_requirements")
      .update({
        units_confirmed: (requirement.units_confirmed || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requirement.id);
  }

  await supabase
    .from("approval_tokens")
    .update({ status: "USED", used_at: new Date().toISOString() })
    .eq("id", tokenRecord.id);

  // 10. Send Donor Notification via Resend (BCC to support email)
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const donorEmail = response.donor_email || tokenRecord.donor_email;
  const supportEmail = Deno.env.get("BLOODBRIDGE_SUPPORT_EMAIL") || "bloodbridgesupportweb@gmail.com";

  if (resendApiKey && donorEmail) {
    try {
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "BloodBridge <onboarding@resend.dev>";
      const emailPayload = {
        from: fromEmail,
        to: [donorEmail],
        bcc: [supportEmail],
        subject: "BloodBridge – Your Donation Offer Has Been Approved",
        html: `
          <div style="background-color: #0c0c10; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #fff;">
            <h2 style="color: #10b981; margin: 0 0 16px 0;">Your Donation Offer Has Been Approved!</h2>
            <p style="font-size: 15px; color: #e2e8f0;">Hello ${donorName},</p>
            <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
              Your blood donation offer has been approved by <strong>${hospitalName}</strong>.
            </p>
            <div style="background-color: #171720; border: 1px solid #272736; border-radius: 12px; padding: 18px; margin: 20px 0;">
              <p style="margin: 6px 0;"><strong>Blood Group:</strong> <span style="color: #FF2B2B;">${bloodGroup}</span></p>
              <p style="margin: 6px 0;"><strong>Hospital:</strong> ${hospitalName}</p>
              <p style="margin: 6px 0;"><strong>Units Required:</strong> ${units} Unit(s)</p>
              <p style="margin: 6px 0;"><strong>Request ID:</strong> ${requestCode}</p>
            </div>
            <p style="color: #10b981; font-weight: 600;">Thank you for helping save a life.</p>
            <p style="color: #94a3b8; font-size: 13px;">BloodBridge &bull; Connecting Lives. One Drop at a Time.</p>
          </div>
        `,
      };

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      // Dispatch dedicated support notification
      if (supportEmail) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [supportEmail],
            subject: "BloodBridge – Donation Offer Approved",
            html: `
              <div style="background-color: #0c0c10; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #fff;">
                <h2 style="color: #10b981; margin: 0 0 16px 0;">Donation Offer Approved</h2>
                <p style="font-size: 15px; color: #e2e8f0;">Hospital <strong>${hospitalName}</strong> has approved the blood donation offer.</p>
                <div style="background-color: #171720; border: 1px solid #272736; border-radius: 12px; padding: 18px; margin: 20px 0;">
                  <p style="margin: 6px 0;"><strong>Hospital:</strong> ${hospitalName}</p>
                  <p style="margin: 6px 0;"><strong>Donor:</strong> ${donorName} (${donorEmail || 'Not Provided'})</p>
                  <p style="margin: 6px 0;"><strong>Blood Group:</strong> <span style="color: #FF2B2B;">${bloodGroup}</span></p>
                  <p style="margin: 6px 0;"><strong>Request ID:</strong> ${requestCode}</p>
                  <p style="margin: 6px 0;"><strong>Donation Response ID:</strong> ${response.id}</p>
                  <p style="margin: 6px 0;"><strong>Approval Status:</strong> <span style="color: #10b981;">APPROVED</span></p>
                  <p style="margin: 6px 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                </div>
              </div>
            `,
          }),
        }).catch((sErr) => console.warn("Edge support copy failed:", sErr));
      }
    } catch (mailErr) {
      console.error("Resend donor notification error:", mailErr);
    }
  }

  // 11. Return Clean Success Response
  return reply(
    200,
    {
      success: true,
      message: "Donation Approved Successfully",
      details: { hospitalName, donorName, bloodGroup, units, requestCode },
    },
    renderHtml({
      title: "Donation Approved Successfully",
      badge: "DONATION CONFIRMED",
      badgeColor: "#10b981",
      message: "The donor's blood donation offer has been approved.",
      submessage: "Thank you for using BloodBridge.",
      details: {
        hospitalName,
        donorName,
        bloodGroup,
        units,
        requestCode,
        status: "APPROVED",
      },
      portalUrl,
    })
  );
});
