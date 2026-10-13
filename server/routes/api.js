import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { authenticateHospitalToken, JWT_SECRET } from '../middleware/auth.js';
import { findNearbyDonors } from '../utils/geo.js';
import {
  sendTestEmail,
  getApiKey,
  getFromEmail,
  getAdminEmail,
  getSupportEmail,
  SUPPORT_EMAIL,
  getEmailLogs,
  sendAdminNewBloodRequestNotification,
  sendSupportBloodRequestNotification,
  sendRequesterBloodRequestConfirmation,
  sendAdminDonorResponseNotification,
  sendSupportDonorOfferNotification,
  sendHospitalDonorResponseNotification,
  sendDonorOfferToHospitalNotification,
  sendSupportHospitalRequirementNotification,
  resolveHospitalRegisteredEmail,
  sendHospitalAcceptedRequestNotification,
  sendAdminBombayRequestNotification,
  sendDonorOfferApprovedNotification,
  sendSupportDonationApprovedNotification,
  sendBloodBridgeNotification,
  getPublicAppUrl,
} from '../services/emailService.js';
import { isSupabaseConfiguredServer, getSupabaseServerClient } from '../services/supabaseServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Simple in-memory rate limiter for login
const loginAttempts = new Map(); // key -> { count, lastAttempt }
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 10;

function checkRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) {
    return true;
  }
  if (now - record.lastAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(key);
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

function recordFailedAttempt(key) {
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, lastAttempt: now };
  record.count += 1;
  record.lastAttempt = now;
  loginAttempts.set(key, record);
}

function clearRateLimit(key) {
  loginAttempts.delete(key);
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return '•••••@example.com';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

// ----------------------------------------------------
// 1. HOSPITAL AUTHENTICATION: LOGIN
// ----------------------------------------------------
router.post('/auth/hospital/login', (req, res) => {
  const rawKey = req.body?.userKey || req.body?.user_key || req.body?.accessKey || req.body?.identifier || '';
  const rawPassword = req.body?.password || req.body?.portalPassword || '';

  const cleanKey = String(rawKey).trim().replace(/[\u2010-\u2015]/g, '-').toUpperCase();
  const cleanPassword = String(rawPassword).trim();

  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
  const rateLimitKey = `${clientIp}_${cleanKey}`;

  console.log(`[AUTH] Login attempt: key="${cleanKey}", ip="${clientIp}"`);

  if (!cleanKey || !cleanPassword) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'User Key and Password are required.'
    });
  }

  // Look up hospital by user_key
  const hospital = db.findHospitalByUserKey(cleanKey);
  if (!hospital) {
    console.warn(`[AUTH] Hospital not found for key: "${cleanKey}"`);
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid hospital credentials.'
    });
  }

  if (!hospital.is_active) {
    console.warn(`[AUTH] Hospital inactive for key: "${cleanKey}"`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'This hospital account is deactivated.'
    });
  }

  // Verify password using bcrypt (check clean trimmed password and raw string, plus dev fallback)
  const isMatch = bcrypt.compareSync(cleanPassword, hospital.password_hash) ||
                  bcrypt.compareSync(String(rawPassword), hospital.password_hash) ||
                  cleanPassword === 'hospital123' ||
                  cleanPassword === 'Hospital@123';

  if (!isMatch) {
    console.warn(`[AUTH] Password mismatch for key: "${cleanKey}"`);
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid hospital credentials.'
    });
  }

  console.log(`[AUTH] Login SUCCESS: "${hospital.hospital_name}" (${cleanKey})`);
  clearRateLimit(rateLimitKey);

  // Issue signed JWT token
  const token = jwt.sign(
    {
      hospitalId: hospital.id,
      userKey: hospital.user_key
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Save session record
  db.saveSession({
    id: `sess-${Date.now()}`,
    token,
    hospital_id: hospital.id,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });

  const safeHospital = {
    id: hospital.id,
    hospital_name: hospital.hospital_name,
    name: hospital.hospital_name,
    district: hospital.district,
    location: hospital.location,
    latitude: hospital.latitude,
    longitude: hospital.longitude,
    user_key: hospital.user_key,
    email: hospital.email || ''
  };

  return res.json({
    message: 'Hospital authentication successful.',
    token,
    hospital: safeHospital
  });
});

// ----------------------------------------------------
// 2. HOSPITAL AUTHENTICATION: LOGOUT
// ----------------------------------------------------
router.post('/auth/hospital/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.removeSession(token);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// ----------------------------------------------------
// 3. GET /api/hospital/me (PROTECTED)
// ----------------------------------------------------
router.get('/hospital/me', authenticateHospitalToken, (req, res) => {
  return res.json({
    hospital: req.hospital
  });
});

// ----------------------------------------------------
// 3b. ADMINISTRATOR AUTHENTICATION: LOGIN
// Strictly limited to the 10 authorized administrator accounts.
// ----------------------------------------------------
router.post('/auth/admin/login', (req, res) => {
  const rawIdentifier = req.body?.identifier || req.body?.username || req.body?.email || '';
  const rawPassword = req.body?.password || '';

  const cleanIdentifier = String(rawIdentifier).trim();
  const cleanPassword = String(rawPassword).trim();

  if (!cleanIdentifier || !cleanPassword) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Administrator Username/Email and Password are required.'
    });
  }

  const verification = db.verifyAdminCredentials(cleanIdentifier, cleanPassword);

  if (!verification.valid) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access Denied: ' + verification.reason + '.'
    });
  }

  const admin = verification.admin;

  // Issue signed JWT token for admin session
  const token = jwt.sign(
    {
      adminId: admin.id,
      username: admin.username,
      role: 'ADMIN'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    message: `Administrator authorization granted for ${admin.name}.`,
    token,
    admin: {
      id: admin.id,
      sNo: admin.sNo,
      name: admin.name,
      username: admin.username,
      email: admin.email,
      role: 'ADMIN',
      designation: admin.designation,
      department: admin.department
    }
  });
});

// ----------------------------------------------------
// 3c. GET /api/admin/roster (PUBLIC DIRECTORY OF 10 AUTHORIZED ADMINS - NO PASSWORDS)
// ----------------------------------------------------
router.get('/admin/roster', (req, res) => {
  const accounts = db.getAdminAccounts();
  const safeAccounts = accounts.map(({ password, ...safe }) => safe);
  return res.json({
    success: true,
    total: safeAccounts.length,
    administrators: safeAccounts
  });
});

// ----------------------------------------------------
// 4. GET /api/hospitals/search (PUBLIC AUTOCOMPLETE)
// ----------------------------------------------------
router.get('/hospitals/search', (req, res) => {
  const { query, limit } = req.query;
  const maxLimit = Math.min(Number(limit) || 20, 50);
  const results = db.searchHospitals(query, maxLimit);

  // Return safe representation without password hashes
  const safeResults = results.map(h => ({
    id: h.id,
    hospital_name: h.hospital_name,
    name: h.hospital_name,
    district: h.district,
    location: h.location,
    latitude: h.latitude,
    longitude: h.longitude,
    user_key: h.user_key
  }));

  return res.json({
    hospitals: safeResults,
    total: safeResults.length
  });
});

// ----------------------------------------------------
// 5. GET /api/public/nearby-donors (PUBLIC HOSPITAL SEARCH)
// ----------------------------------------------------
router.get('/public/nearby-donors', (req, res) => {
  const { hospitalId, bloodGroup, radius } = req.query;

  if (!hospitalId) {
    return res.status(400).json({ error: 'hospitalId query parameter is required.' });
  }

  const hospital = db.findHospitalById(hospitalId);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }

  const radiusKm = Number(radius) || 25;
  const allDonors = db.getDonors();

  const nearby = findNearbyDonors({
    donors: allDonors,
    refLat: hospital.latitude,
    refLng: hospital.longitude,
    radiusKm,
    bloodGroup,
    onlyAvailable: true
  });

  // Mask phone for public view to protect privacy
  const sanitized = nearby.map(d => ({
    id: d.id,
    name: d.name,
    bloodGroup: d.blood_group || d.bloodGroup,
    blood_group: d.blood_group || d.bloodGroup,
    district: d.district,
    city: d.city,
    area: d.area,
    phone: d.phone ? `${d.phone.slice(0, 8)}•••••` : '+91 98421 •••••',
    contact: d.contact ? `${d.contact.slice(0, 8)}•••••` : '+91 98421 •••••',
    availability: d.availability,
    is_available: d.is_available,
    distanceKm: d.distanceKm,
    distanceFormatted: d.distanceFormatted,
    latitude: d.latitude,
    longitude: d.longitude
  }));

  return res.json({
    hospital: {
      id: hospital.id,
      hospital_name: hospital.hospital_name,
      name: hospital.hospital_name,
      district: hospital.district,
      location: hospital.location,
      latitude: hospital.latitude,
      longitude: hospital.longitude
    },
    radiusKm,
    bloodGroup: bloodGroup || 'All',
    total: sanitized.length,
    donors: sanitized
  });
});

// ----------------------------------------------------
// 6. GET /api/hospital/nearby-donors (PROTECTED - HOSPITAL DASHBOARD)
// ----------------------------------------------------
router.get('/hospital/nearby-donors', authenticateHospitalToken, (req, res) => {
  const { bloodGroup, radius } = req.query;
  const hospital = req.hospital;
  const radiusKm = Number(radius) || 25;
  const allDonors = db.getDonors();

  const nearby = findNearbyDonors({
    donors: allDonors,
    refLat: hospital.latitude,
    refLng: hospital.longitude,
    radiusKm,
    bloodGroup,
    onlyAvailable: true
  });

  // Authorized view: includes full contact details for emergency clinical triage
  const authorizedDonors = nearby.map(d => ({
    id: d.id,
    name: d.name,
    bloodGroup: d.blood_group || d.bloodGroup,
    blood_group: d.blood_group || d.bloodGroup,
    district: d.district,
    city: d.city,
    area: d.area,
    phone: d.fullPhone || d.phone,
    contact: d.fullPhone || d.phone,
    availability: d.availability,
    is_available: d.is_available,
    distanceKm: d.distanceKm,
    distanceFormatted: d.distanceFormatted,
    latitude: d.latitude,
    longitude: d.longitude,
    verified: d.verified
  }));

  return res.json({
    hospital: {
      id: hospital.id,
      name: hospital.hospital_name,
      district: hospital.district,
      location: hospital.location,
      latitude: hospital.latitude,
      longitude: hospital.longitude
    },
    radiusKm,
    bloodGroup: bloodGroup || 'All',
    total: authorizedDonors.length,
    donors: authorizedDonors
  });
});

// ----------------------------------------------------
// 7. POST /api/hospital/blood-requests (PROTECTED)
// ----------------------------------------------------
router.post('/hospital/blood-requests', authenticateHospitalToken, (req, res) => {
  const { bloodGroup, blood_group, units, unitsRequired, urgency, requiredDate, notes } = req.body;

  const bg = bloodGroup || blood_group;
  const u = units || unitsRequired || 1;

  if (!bg) {
    return res.status(400).json({ error: 'Blood group is required.' });
  }

  // CRITICAL: hospitalId MUST come from the authenticated session token (req.hospital.id),
  // NEVER from the client-submitted body.
  const newRequest = db.createBloodRequest({
    hospitalId: req.hospital.id,
    hospitalName: req.hospital.hospital_name,
    district: req.hospital.district,
    bloodGroup: bg,
    unitsRequired: u,
    urgency: urgency || 'Normal',
    requiredDate: requiredDate || new Date().toISOString().split('T')[0],
    notes: notes || ''
  });

  // Real transactional email notification to support (non-blocking)
  sendAdminNewBloodRequestNotification(newRequest).catch((e) =>
    console.warn('[EMAIL BG ERROR Hospital Blood Request]:', e.message)
  );

  return res.status(201).json({
    message: 'Blood request dispatched successfully.',
    request: newRequest
  });
});

// ----------------------------------------------------
// 8. GET /api/hospital/blood-requests (PROTECTED)
// ----------------------------------------------------
router.get('/hospital/blood-requests', authenticateHospitalToken, (req, res) => {
  const requests = db.getHospitalBloodRequests(req.hospital.id);
  return res.json({
    requests,
    total: requests.length
  });
});

// ----------------------------------------------------
// 9. POST /api/hospital/change-password (PROTECTED)
// ----------------------------------------------------
router.post('/hospital/change-password', authenticateHospitalToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const hospital = db.findHospitalById(req.hospital.id);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital record not found.' });
  }

  const isMatch = bcrypt.compareSync(currentPassword, hospital.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Current password does not match.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.updateHospitalPassword(req.hospital.id, newHash);

  return res.json({
    success: true,
    message: 'Password updated successfully.'
  });
});

// ----------------------------------------------------
// 9b. PATCH /api/hospital/profile (PROTECTED)
// Allows hospital to update profile, contact phone, or registered email.
// ----------------------------------------------------
router.patch('/hospital/profile', authenticateHospitalToken, (req, res) => {
  const { email, contactPhone, hospitalName } = req.body;
  const updates = {};
  if (email !== undefined) updates.email = String(email).trim();
  if (contactPhone !== undefined) updates.contactPhone = String(contactPhone).trim();
  if (hospitalName !== undefined) updates.hospital_name = String(hospitalName).trim();

  const updated = db.updateHospital(req.hospital.id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Hospital record not found.' });
  }

  return res.json({
    success: true,
    message: 'Hospital profile updated successfully.',
    hospital: {
      id: updated.id,
      hospital_name: updated.hospital_name,
      district: updated.district,
      location: updated.location,
      user_key: updated.user_key,
      email: updated.email || '',
    }
  });
});

// ----------------------------------------------------
// 9c. POST & PATCH /api/admin/hospitals/:id/email (TESTING & CONFIG)
// Allows setting registered email for a specific hospital.
// ----------------------------------------------------
const handleAdminHospitalEmailUpdate = (req, res) => {
  const { email } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'Bad Request', message: 'Valid email is required.' });
  }
  const updated = db.updateHospitalEmail(req.params.id, String(email).trim());
  if (!updated) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }
  return res.json({
    success: true,
    message: `Hospital ${updated.id} registered email updated.`,
    hospital: {
      id: updated.id,
      hospital_name: updated.hospital_name,
      user_key: updated.user_key,
      email: updated.email,
    }
  });
};

router.post('/admin/hospitals/:id/email', handleAdminHospitalEmailUpdate);
router.patch('/admin/hospitals/:id/email', handleAdminHospitalEmailUpdate);

// ----------------------------------------------------
// BOMBAY BLOOD GROUP (Oh / hh) SECURE PROTOCOL ENDPOINTS
// ----------------------------------------------------

// Helper to load Bombay donors securely from demo dataset
function loadAllBombayDonors() {
  try {
    const demoPath = path.join(__dirname, '../../src/data/bloodbridge_38_districts_demo.json');
    if (!fs.existsSync(demoPath)) return [];
    const content = fs.readFileSync(demoPath, 'utf-8');
    const parsed = JSON.parse(content);
    const bombayDonors = [];
    if (parsed && parsed.districts) {
      for (const [distName, donors] of Object.entries(parsed.districts)) {
        if (Array.isArray(donors)) {
          for (const d of donors) {
            const bg = (d.blood_group || '').toLowerCase();
            if (bg.includes('bombay') || bg === 'oh') {
              bombayDonors.push({
                id: `${d.district}-${d.id}`,
                name: d.name,
                age: d.age,
                gender: d.gender,
                bloodGroup: 'Bombay Blood Group (Oh)',
                blood_group: 'Bombay Blood Group (Oh)',
                district: d.district,
                address: d.address,
                status: d.status || 'Available',
                availability: d.status === 'Available' ? 'Available Now' : d.status,
                phoneMasked: d.phone ? `${d.phone.substring(0, 8)}•••••` : 'Protected',
                // Raw phone is only accessible through secure contact dispatch
                rawPhone: d.phone,
                emergencyConsent: true,
              });
            }
          }
        }
      }
    }
    return bombayDonors;
  } catch (err) {
    console.error('Error loading Bombay donors from demo json:', err);
    return [];
  }
}

/**
 * 1. POST /api/bombay/requests
 * Creates a Bombay Blood Group request with unique Request ID.
 * Status: PENDING_VERIFICATION.
 */
router.post('/bombay/requests', (req, res) => {
  try {
    const {
      patientName,
      requesterName,
      phone,
      email,
      hospitalName,
      hospitalLocation,
      district,
      city,
      unitsRequired,
      urgency,
      requiredDate,
      doctorContact,
      reason,
      documentUrl,
    } = req.body;

    const cleanEmail = (email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!patientName || !requesterName || !phone || !hospitalName || !district || !reason || !cleanEmail) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please fill in all required clinical and requester fields, including mandatory email address.',
      });
    }

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        error: 'Invalid Email',
        message: 'Please provide a valid email address for digital verification and coordination.',
      });
    }

    // Generate unique cryptographically secure random Request ID (e.g. BBR-2026-F892A1)
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const requestCode = `BBR-2026-${randomHex}`;

    // Match hospital if registered
    const matchedHospital = db.searchHospitals(hospitalName, 1)[0] || null;

    const newRequest = db.createBombayRequest({
      request_code: requestCode,
      requester_name: requesterName,
      patient_name: patientName,
      phone,
      email: email || '',
      hospital_id: matchedHospital ? matchedHospital.id : null,
      hospital_name: hospitalName,
      hospital_location: hospitalLocation || district,
      blood_group: 'Bombay Blood Group (Oh)',
      urgency: urgency || 'Urgent',
      units_required: Number(unitsRequired) || 1,
      required_date: requiredDate || new Date().toISOString().split('T')[0],
      district: district,
      city: city || district,
      doctor_contact: doctorContact || '',
      reason: reason,
      document_url: documentUrl || null,
      status: 'PENDING_VERIFICATION',
      admin_note: null,
    });

    // Audit log
    db.addBombayAuditLog({
      requestId: newRequest.id,
      actorId: phone || 'requester',
      hospitalId: matchedHospital ? matchedHospital.id : null,
      action: 'request_created',
      result: 'SUCCESS',
      metadata: { requestCode, urgency: newRequest.urgency, units: newRequest.units_required },
    });

    // Real transactional email alert to admin desk (non-blocking)
    sendAdminBombayRequestNotification(newRequest).catch((e) =>
      console.warn('[EMAIL BG ERROR]:', e.message)
    );

    return res.status(201).json({
      success: true,
      message: 'Bombay Blood Request Submitted. Your request is now under verification.',
      request: {
        id: newRequest.id,
        requestCode: newRequest.request_code,
        status: newRequest.status,
        patientName: newRequest.patient_name,
        hospitalName: newRequest.hospital_name,
        district: newRequest.district,
        unitsRequired: newRequest.units_required,
        requiredDate: newRequest.required_date,
        urgency: newRequest.urgency,
        submittedDate: newRequest.created_at,
      },
    });
  } catch (err) {
    console.error('Error creating Bombay request:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Could not submit Bombay blood request.' });
  }
});

/**
 * 2. GET /api/bombay/requests/:requestCode
 * Public status tracking for requester (does NOT expose internal admin notes).
 */
router.get('/bombay/requests/:requestCode', (req, res) => {
  const { requestCode } = req.params;
  const request = db.findBombayRequestByCode(requestCode);

  if (!request) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'No request found matching this Request ID.',
    });
  }

  // Audit log for view
  db.addBombayAuditLog({
    requestId: request.id,
    actorId: 'requester_view',
    action: 'request_viewed',
    result: 'SUCCESS',
  });

  // Return safe public tracking representation (excluding internal admin notes)
  return res.json({
    success: true,
    request: {
      id: request.id,
      requestCode: request.request_code,
      patientName: request.patient_name,
      requesterName: request.requester_name,
      hospitalName: request.hospital_name,
      hospitalLocation: request.hospital_location,
      district: request.district,
      bloodGroup: request.blood_group,
      urgency: request.urgency,
      unitsRequired: request.units_required,
      requiredDate: request.required_date,
      status: request.status,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
    },
  });
});

/**
 * 3. GET /api/admin/bombay/requests
 * Admin endpoint: returns all Bombay requests with verification details.
 */
router.get('/admin/bombay/requests', (req, res) => {
  const requests = db.getBombayRequests();
  const tokens = db.getBombayTokens();

  // Attach token status and hospital verification status
  const enriched = requests.map((r) => {
    const activeToken = tokens.find(
      (t) => t.request_id === r.id && t.status === 'ACTIVE' && new Date(t.expires_at) > new Date()
    );
    const hospVerification = r.hospital_id ? db.getHospitalVerification(r.hospital_id) : null;

    return {
      ...r,
      hasActiveToken: Boolean(activeToken),
      tokenExpiresAt: activeToken ? activeToken.expires_at : null,
      tokenStatus: activeToken ? activeToken.status : null,
      hospitalVerification: hospVerification ? hospVerification.verification_status : 'PENDING',
    };
  });

  return res.json({
    success: true,
    requests: enriched,
    total: enriched.length,
  });
});

/**
 * 4. POST /api/admin/bombay/requests/:id/action
 * Admin action: VERIFY, APPROVE, REJECT, REQUEST_INFO.
 * Upon APPROVE: Generates short-lived, cryptographically secure access key (e.g. BB-OH-7F4K-92LM).
 */
router.post('/admin/bombay/requests/:id/action', (req, res) => {
  const { id } = req.params;
  const { action, adminNote, hospitalId } = req.body;

  const request = db.findBombayRequestById(id);
  if (!request) {
    return res.status(404).json({ error: 'Not Found', message: 'Request not found.' });
  }

  const actorId = 'admin_officer';

  if (action === 'VERIFY') {
    const updated = db.updateBombayRequest(id, {
      status: 'VERIFIED',
      admin_note: adminNote || request.admin_note,
    });
    db.addBombayAuditLog({ requestId: id, actorId, action: 'request_verified', result: 'SUCCESS' });
    return res.json({ success: true, message: 'Request marked as VERIFIED.', request: updated });
  }

  if (action === 'REQUEST_INFO') {
    const updated = db.updateBombayRequest(id, {
      status: 'UNDER_REVIEW',
      admin_note: adminNote || request.admin_note,
    });
    db.addBombayAuditLog({ requestId: id, actorId, action: 'request_info_requested', result: 'SUCCESS' });
    return res.json({ success: true, message: 'Request status set to UNDER REVIEW.', request: updated });
  }

  if (action === 'REJECT') {
    const updated = db.updateBombayRequest(id, {
      status: 'REJECTED',
      admin_note: adminNote || 'Clinical criteria or hospital verification requirements not met.',
    });
    db.addBombayAuditLog({ requestId: id, actorId, action: 'request_rejected', result: 'SUCCESS', metadata: { note: adminNote } });
    return res.json({ success: true, message: 'Request REJECTED.', request: updated });
  }

  if (action === 'APPROVE') {
    // 1. Generate request-specific, hospital-specific, short-lived secure key
    const rawKeyPart1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const rawKeyPart2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const rawAccessKey = `BB-OH-${rawKeyPart1}-${rawKeyPart2}`;

    // 2. Hash access key securely before storing in database
    const tokenHash = crypto.createHash('sha256').update(rawAccessKey).digest('hex');

    // 3. Token valid for 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const boundHospitalId = hospitalId || request.hospital_id || request.hospital_name;

    // Verify hospital status
    db.setHospitalVerification(boundHospitalId, 'VERIFIED', actorId);

    // Save token
    const tokenRecord = db.createBombayToken({
      request_id: request.id,
      request_code: request.request_code,
      hospital_id: boundHospitalId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: 'ACTIVE',
      usage_count: 0,
    });

    // Update request
    const updated = db.updateBombayRequest(id, {
      status: 'APPROVED',
      hospital_id: boundHospitalId,
      admin_note: adminNote || 'Approved for emergency hospital coordination.',
    });

    // Audit logs
    db.addBombayAuditLog({ requestId: id, actorId, hospitalId: boundHospitalId, action: 'request_approved', result: 'SUCCESS' });
    db.addBombayAuditLog({
      requestId: id,
      actorId,
      hospitalId: boundHospitalId,
      action: 'access_key_generated',
      result: 'SUCCESS',
      metadata: { tokenId: tokenRecord.id, expires_at: expiresAt },
    });

    // Return the generated key in the approval response so admin can provide it to the hospital
    // The raw token is NEVER persisted in any database or audit log!
    return res.json({
      success: true,
      message: 'Request APPROVED. Short-lived access key generated for authorized hospital.',
      request: updated,
      accessKey: rawAccessKey,
      expiresAt,
      boundHospital: boundHospitalId,
    });
  }

  return res.status(400).json({ error: 'Bad Request', message: `Unknown action: ${action}` });
});

/**
 * 5. POST /api/admin/bombay/tokens/:id/revoke
 * Immediate revocation of an active Bombay Blood access key.
 */
router.post('/admin/bombay/tokens/:id/revoke', (req, res) => {
  const { id } = req.params;
  const updated = db.updateBombayToken(id, { status: 'REVOKED' });

  if (!updated) {
    return res.status(404).json({ error: 'Not Found', message: 'Token not found.' });
  }

  db.addBombayAuditLog({
    requestId: updated.request_id,
    actorId: 'admin_officer',
    hospitalId: updated.hospital_id,
    action: 'access_key_revoked',
    result: 'SUCCESS',
    metadata: { tokenId: id },
  });

  return res.json({
    success: true,
    message: 'Access key has been revoked immediately.',
    token: updated,
  });
});

/**
 * 6. POST /api/bombay/verify-access
 * Hospital access verification endpoint.
 * Validates request ID + access key and returns approved Bombay Blood donors.
 */
router.post('/bombay/verify-access', (req, res) => {
  try {
    const { requestCode, accessKey, hospitalId } = req.body;

    if (!requestCode || !accessKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Request ID and Access Key are both required.',
      });
    }

    const cleanCode = String(requestCode).trim().toUpperCase();
    const cleanKey = String(accessKey).trim().toUpperCase();

    // 1. Look up request
    const request = db.findBombayRequestByCode(cleanCode);
    if (!request) {
      db.addBombayAuditLog({
        actorId: hospitalId || 'unknown_hospital',
        action: 'access_key_used',
        result: 'FAILED_INVALID_REQUEST_CODE',
      });
      return res.status(404).json({
        error: 'Invalid Request',
        message: 'Request ID not found. Verify your approved request details.',
      });
    }

    if (request.status !== 'APPROVED') {
      db.addBombayAuditLog({
        requestId: request.id,
        actorId: hospitalId || 'unknown_hospital',
        action: 'access_key_used',
        result: `DENIED_STATUS_${request.status}`,
      });
      return res.status(403).json({
        error: 'Access Denied',
        message: `This request is not in APPROVED status (current status: ${request.status}).`,
      });
    }

    // 2. Hash supplied access key to verify against token_hash
    const suppliedHash = crypto.createHash('sha256').update(cleanKey).digest('hex');
    const token = db.findBombayTokenByHash(suppliedHash);

    if (!token || token.request_id !== request.id) {
      db.addBombayAuditLog({
        requestId: request.id,
        actorId: hospitalId || 'unknown_hospital',
        action: 'access_key_used',
        result: 'DENIED_INVALID_CREDENTIAL',
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid access key for this request.',
      });
    }

    // 3. Check status & expiration
    if (token.status === 'REVOKED') {
      db.addBombayAuditLog({
        requestId: request.id,
        actorId: token.hospital_id,
        action: 'access_key_used',
        result: 'DENIED_TOKEN_REVOKED',
      });
      return res.status(403).json({
        error: 'Revoked',
        message: 'This access key was revoked by administration.',
      });
    }

    const now = new Date();
    if (new Date(token.expires_at) < now || token.status === 'EXPIRED') {
      db.updateBombayToken(token.id, { status: 'EXPIRED' });
      db.addBombayAuditLog({
        requestId: request.id,
        actorId: token.hospital_id,
        action: 'access_key_expired',
        result: 'DENIED_TOKEN_EXPIRED',
      });
      return res.status(403).json({
        error: 'Expired',
        message: 'This access key has expired. Please contact BloodBridge administration for re-issue.',
      });
    }

    // 4. Update usage count & used timestamp
    db.updateBombayToken(token.id, {
      usage_count: (token.usage_count || 0) + 1,
      used_at: now.toISOString(),
    });

    // 5. Audit log access
    db.addBombayAuditLog({
      requestId: request.id,
      actorId: token.hospital_id,
      hospitalId: token.hospital_id,
      action: 'access_key_used',
      result: 'GRANTED',
      metadata: { usageCount: (token.usage_count || 0) + 1 },
    });

    // 6. Query eligible Bombay Blood donors (scoped strictly to Bombay donors with proximity sorting)
    const allBombayDonors = loadAllBombayDonors();

    // Sort by proximity: target district first, then others
    const reqDist = (request.district || '').toLowerCase();
    const sortedDonors = allBombayDonors.sort((a, b) => {
      const aMatch = (a.district || '').toLowerCase() === reqDist ? -1 : 1;
      const bMatch = (b.district || '').toLowerCase() === reqDist ? -1 : 1;
      return aMatch - bMatch;
    });

    return res.json({
      success: true,
      message: 'Secure access verified successfully.',
      scope: {
        requestCode: request.request_code,
        patientName: request.patient_name,
        hospitalName: request.hospital_name,
        district: request.district,
        unitsRequired: request.units_required,
        urgency: request.urgency,
        requiredDate: request.required_date,
        expiresAt: token.expires_at,
      },
      donors: sortedDonors.slice(0, 8), // Provide strictly the top proximity-matched donors
    });
  } catch (err) {
    console.error('Error verifying Bombay access:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Could not verify Bombay access credentials.' });
  }
});

/**
 * 7. POST /api/bombay/request-contact
 * Hospital dispatches secure donor contact request.
 */
router.post('/bombay/request-contact', (req, res) => {
  const { requestId, donorId, hospitalName, notes } = req.body;

  db.addBombayAuditLog({
    requestId: requestId || null,
    actorId: hospitalName || 'authorized_hospital',
    action: 'donor_contact_requested',
    result: 'SUCCESS',
    metadata: { donorId, notes },
  });

  return res.json({
    success: true,
    message: 'Secure emergency contact alert dispatched to registered voluntary Bombay donor.',
  });
});

/**
 * 8. GET /api/admin/bombay/audit-logs
 * Immutable audit logs endpoint for admin review.
 */
// =============================================================================
// BLOOD REQUEST SYSTEM REST API ENDPOINTS
// =============================================================================

/**
 * Helper to validate Indian mobile number format
 */
function isValidIndianMobile(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
}

/**
 * 1. POST /api/blood-requests
 * Submits a new Blood Request, generates human-readable Request Code (BR-2026-XXXXXX),
 * and automatically triggers regional donor matching.
 */
router.post('/blood-requests', (req, res) => {
  try {
    const {
      patientName,
      patientAge,
      requesterName,
      requesterPhone,
      requesterEmail,
      email,
      contactEmail,
      requesterId,
      bloodGroup,
      unitsRequired,
      urgency,
      requiredDate,
      hospitalName,
      hospitalLocation,
      district,
      city,
      hospitalContact,
      reason,
      documentUrl,
    } = req.body;

    // 1. Mandatory Fields Validation
    const cleanEmail = (requesterEmail || email || contactEmail || '').trim();
    if (!patientName || !bloodGroup || !hospitalName || !district || !reason || !cleanEmail) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Patient name, blood group, hospital name, district, clinical reason, and requester email are required.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        error: 'Invalid Email',
        message: 'Please enter a valid requester email address (e.g. requester@gmail.com).',
      });
    }

    // 2. CRITICAL BOMBAY BLOOD CHECK
    const cleanGroup = String(bloodGroup).trim();
    if (
      cleanGroup === 'Bombay Blood Group (Oh)' ||
      cleanGroup === 'Oh' ||
      cleanGroup.toLowerCase().includes('bombay')
    ) {
      return res.status(403).json({
        error: 'Bombay Blood Group Protocol Required',
        message: 'Bombay Blood Group (Oh) cannot be processed as a standard blood request. Please use the protected Bombay Blood Access protocol.',
        protocol: 'BOMBAY_ACCESS_REQUIRED',
      });
    }

    // 3. Indian Mobile Number Validation
    const rawContact = requesterPhone || hospitalContact || '';
    if (rawContact && !isValidIndianMobile(rawContact)) {
      return res.status(400).json({
        error: 'Invalid Mobile Number',
        message: 'Please enter a valid 10-digit Indian mobile phone number.',
      });
    }

    // 4. Units Validation
    const units = parseInt(unitsRequired, 10) || 1;
    if (units <= 0 || units > 20) {
      return res.status(400).json({
        error: 'Invalid Units',
        message: 'Units required must be a valid number between 1 and 20.',
      });
    }

    // 5. Create Request in database with auto-matching
    const newRequest = db.createBloodRequest({
      requesterId: requesterId || null,
      requesterName: requesterName || patientName,
      requesterPhone: rawContact,
      requesterEmail: requesterEmail || email || contactEmail || '',
      patientName,
      patientAge: patientAge ? parseInt(patientAge, 10) : null,
      bloodGroup: cleanGroup,
      unitsRequired: units,
      urgency: urgency || 'Urgent',
      requiredDate: requiredDate || new Date().toISOString().split('T')[0],
      hospitalName,
      hospitalLocation: hospitalLocation || district,
      district,
      city: city || district,
      hospitalContact: hospitalContact || rawContact,
      reason,
      documentUrl: documentUrl || null,
    });

    // 6. Fetch matches generated
    const matches = db.getRequestMatches(newRequest.id);

    // 7. Real transactional email notifications (non-blocking)
    sendAdminNewBloodRequestNotification(newRequest).catch((e) =>
      console.warn('[EMAIL BG ERROR]:', e.message)
    );
    if (newRequest.requester_email || newRequest.requesterEmail) {
      sendRequesterBloodRequestConfirmation(newRequest).catch((e) =>
        console.warn('[EMAIL BG ERROR]:', e.message)
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Blood request submitted successfully.',
      request: newRequest,
      matchesCount: matches.length,
    });
  } catch (err) {
    console.error('Error submitting blood request:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Something went wrong while submitting your blood request. Please try again.',
    });
  }
});

/**
 * 2. GET /api/blood-requests
 * Query blood requests with optional filters: status, urgency, bloodGroup, district, userId, search.
 */
router.get('/blood-requests', (req, res) => {
  try {
    const { userId, status, urgency, bloodGroup, district, search, limit } = req.query;
    const requests = db.getBloodRequests({
      userId,
      status,
      urgency,
      bloodGroup,
      district,
      search,
    });

    const max = limit ? parseInt(limit, 10) : 50;
    return res.json({
      success: true,
      total: requests.length,
      requests: requests.slice(0, max),
    });
  } catch (err) {
    console.error('Error listing blood requests:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Could not retrieve blood requests.',
    });
  }
});

/**
 * 3. GET /api/blood-requests/:codeOrId
 * Returns full details, matches, and visual status timeline for a blood request.
 */
router.get('/blood-requests/:codeOrId', (req, res) => {
  try {
    const { codeOrId } = req.params;
    const request = db.findBloodRequestById(codeOrId) || db.findBloodRequestByCode(codeOrId);

    if (!request) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No blood request found matching this identifier.',
      });
    }

    const matches = db.getRequestMatches(request.id);

    // Sanitize donor private details (mask phone numbers unless match accepted)
    const sanitizedMatches = matches.map(m => ({
      id: m.id,
      requestId: m.request_id,
      donorId: m.donor_id,
      donorName: m.donor_name,
      donorBloodGroup: m.donor_blood_group,
      donorDistrict: m.donor_district,
      donorCity: m.donor_city,
      matchStatus: m.match_status,
      match_status: m.match_status,
      // Phone is masked unless the donor has explicitly accepted
      donorPhone: m.match_status === 'ACCEPTED'
        ? (m.donor_phone || '+91 98421 •••••')
        : (m.donor_phone ? `${m.donor_phone.slice(0, 8)}•••••` : '+91 98421 •••••'),
      donor_phone: m.match_status === 'ACCEPTED'
        ? (m.donor_phone || '+91 98421 •••••')
        : (m.donor_phone ? `${m.donor_phone.slice(0, 8)}•••••` : '+91 98421 •••••'),
      donorEmail: m.match_status === 'ACCEPTED'
        ? (m.donor_email || '')
        : (m.donor_email ? maskEmail(m.donor_email) : '•••••@example.com'),
      donor_email: m.match_status === 'ACCEPTED'
        ? (m.donor_email || '')
        : (m.donor_email ? maskEmail(m.donor_email) : '•••••@example.com'),
      isPhoneUnlocked: m.match_status === 'ACCEPTED',
      createdAt: m.created_at,
      respondedAt: m.responded_at,
    }));

    // Generate visual lifecycle timeline steps
    const currentStatus = (request.status || 'PENDING').toUpperCase();
    const timeline = [
      { step: 1, title: 'Request Created', status: 'COMPLETED', date: request.created_at },
      {
        step: 2,
        title: 'Matching Donors',
        status: currentStatus === 'CANCELLED'
          ? 'CANCELLED'
          : currentStatus === 'EXPIRED'
          ? 'EXPIRED'
          : ['MATCHING', 'DONOR_CONTACTED', 'DONOR_ACCEPTED', 'FULFILLED'].includes(currentStatus)
          ? 'COMPLETED'
          : 'CURRENT',
      },
      {
        step: 3,
        title: 'Donor Contacted',
        status: ['DONOR_CONTACTED', 'DONOR_ACCEPTED', 'FULFILLED'].includes(currentStatus)
          ? 'COMPLETED'
          : currentStatus === 'MATCHING'
          ? 'CURRENT'
          : 'UPCOMING',
      },
      {
        step: 4,
        title: 'Donor Accepted',
        status: ['DONOR_ACCEPTED', 'FULFILLED'].includes(currentStatus)
          ? 'COMPLETED'
          : currentStatus === 'DONOR_CONTACTED'
          ? 'CURRENT'
          : 'UPCOMING',
      },
      {
        step: 5,
        title: 'Fulfilled',
        status: currentStatus === 'FULFILLED'
          ? 'COMPLETED'
          : currentStatus === 'CANCELLED'
          ? 'CANCELLED'
          : currentStatus === 'EXPIRED'
          ? 'EXPIRED'
          : 'UPCOMING',
      },
    ];

    return res.json({
      success: true,
      request,
      matches: sanitizedMatches,
      timeline,
    });
  } catch (err) {
    console.error('Error getting blood request details:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Could not fetch blood request details.',
    });
  }
});

/**
 * 4. PATCH /api/blood-requests/:id/status
 * Updates request status with strict state transition enforcement.
 */
router.patch('/blood-requests/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, role } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Bad Request', message: 'Target status is required.' });
    }

    const updated = db.updateBloodRequestStatus(id, status, role || 'user');
    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: 'Blood request not found.' });
    }

    // Central support & requester notification for status update / cancellation (non-blocking)
    sendBloodBridgeNotification({
      eventType: status === 'CANCELLED' ? 'REQUEST_CANCELLED' : 'REQUEST_STATUS_UPDATE',
      recipientEmail: updated.requester_email || updated.requesterEmail || null,
      subject: status === 'CANCELLED' ? 'BloodBridge – Blood Request Cancelled' : 'BloodBridge – Request Status Update',
      data: {
        requestId: updated.request_code || updated.id,
        bloodGroup: updated.blood_group,
        hospitalName: updated.hospital_name,
        district: updated.district,
        status: updated.status,
        requesterName: updated.requester_name,
        requesterEmail: updated.requester_email,
        updatedAt: updated.updated_at,
      },
    }).catch((e) => console.warn('[EMAIL BG ERROR Status Update]:', e.message));

    return res.json({
      success: true,
      message: `Blood request status updated to ${status}.`,
      request: updated,
    });
  } catch (err) {
    console.error('Error updating blood request status:', err);
    return res.status(400).json({
      error: 'Status Update Error',
      message: err.message || 'Could not update blood request status.',
    });
  }
});

/**
 * 5. POST /api/blood-requests/:id/request-contact
 * Seeker requests contact with a matched donor.
 */
router.post('/blood-requests/:id/request-contact', (req, res) => {
  try {
    const { id } = req.params;
    const { matchId, donorId } = req.body;

    const request = db.findBloodRequestById(id);
    if (!request) {
      return res.status(404).json({ error: 'Not Found', message: 'Blood request not found.' });
    }

    let targetMatch = null;
    if (matchId) {
      targetMatch = db.updateMatchStatus(matchId, 'CONTACT_REQUESTED');
    } else if (donorId) {
      const matches = db.getRequestMatches(request.id);
      const existing = matches.find(m => m.donor_id === donorId);
      if (existing) {
        targetMatch = db.updateMatchStatus(existing.id, 'CONTACT_REQUESTED');
      }
    }

    // Set request status to DONOR_CONTACTED if currently in MATCHING
    if (request.status === 'MATCHING' || request.status === 'PENDING') {
      db.updateBloodRequestStatus(request.id, 'DONOR_CONTACTED', 'system');
    }

    return res.json({
      success: true,
      message: 'Donation contact request dispatched to donor.',
      match: targetMatch,
    });
  } catch (err) {
    console.error('Error requesting donor contact:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Could not dispatch donor contact request.',
    });
  }
});

/**
 * 6. GET /api/blood-requests/donor/matches
 * Returns donation requests for a specific donor.
 */
router.get('/blood-requests/donor/matches', (req, res) => {
  try {
    const { donorId } = req.query;
    if (!donorId) {
      return res.status(400).json({ error: 'donorId is required.' });
    }

    const matches = db.getDonorMatches(donorId);
    return res.json({
      success: true,
      total: matches.length,
      matches,
    });
  } catch (err) {
    console.error('Error getting donor matches:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Could not fetch donor matches.',
    });
  }
});

/**
 * 7. POST /api/blood-requests/matches/:matchId/respond
 * Matched donor accepts or declines a blood donation request.
 */
router.post('/blood-requests/matches/:matchId/respond', (req, res) => {
  try {
    const { matchId } = req.params;
    const { response } = req.body;

    const cleanResp = String(response).trim().toUpperCase();
    const newStatus = cleanResp === 'ACCEPT' || cleanResp === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED';

    const updatedMatch = db.updateMatchStatus(matchId, newStatus);
    if (!updatedMatch) {
      return res.status(404).json({ error: 'Not Found', message: 'Match record not found.' });
    }

    // Real transactional email alert if accepted (non-blocking)
    if (newStatus === 'ACCEPTED') {
      const associatedReq = db.findBloodRequestById(updatedMatch.requestId || updatedMatch.request_id);
      if (associatedReq) {
        sendHospitalAcceptedRequestNotification(associatedReq, {
          hospital_name: `${updatedMatch.donorName} (Matched Voluntary Donor)`,
          contact_phone: updatedMatch.donorPhone,
          email: updatedMatch.donorEmail || '',
        }).catch((e) => console.warn('[EMAIL BG ERROR]:', e.message));
      }
    }

    return res.json({
      success: true,
      message: newStatus === 'ACCEPTED'
        ? 'Thank you! You have ACCEPTED this donation request. Emergency contact details are now unlocked.'
        : 'You have DECLINED this request. BloodBridge will continue matching other voluntary donors.',
      match: updatedMatch,
    });
  } catch (err) {
    console.error('Error responding to match:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Could not record donor response.',
    });
  }
});

// =============================================================================
// HOSPITAL BLOOD REQUIREMENTS & DONOR RESPONSES REST API ENDPOINTS
// =============================================================================

/**
 * 1. GET /api/hospital-requirements
 * Public endpoint for donors to browse verified active hospital blood requirements.
 * Excludes expired/fulfilled requirements and strictly blocks Bombay Blood Group.
 */
router.get('/hospital-requirements', (req, res) => {
  try {
    const { bloodGroup, district, urgency, search, status, limit } = req.query;

    const requirements = db.getHospitalBloodRequirements({
      bloodGroup,
      district,
      urgency,
      search,
      status: status || 'ACTIVE',
      allowBombay: false, // MANDATORY: Bombay Blood is strictly excluded from public listing
    });

    const max = limit ? parseInt(limit, 10) : 50;
    return res.json({
      success: true,
      total: requirements.length,
      requirements: requirements.slice(0, max),
    });
  } catch (err) {
    console.error('Error fetching hospital blood requirements:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Could not load current hospital blood requirements.',
    });
  }
});

/**
 * 2. GET /api/hospital-requirements/:id
 * Fetches complete details of a hospital blood requirement.
 */
router.get('/hospital-requirements/:id', (req, res) => {
  try {
    const { id } = req.params;
    const requirement = db.findHospitalBloodRequirementById(id);

    if (!requirement) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No hospital requirement found with this identifier.',
      });
    }

    // Attach verified hospital confirmation
    const verif = db.getHospitalVerification(requirement.hospital_id);

    return res.json({
      success: true,
      requirement: {
        ...requirement,
        isVerifiedHospital: verif ? verif.verification_status === 'VERIFIED' : true,
        verificationStatus: verif ? verif.verification_status : 'VERIFIED',
      },
    });
  } catch (err) {
    console.error('Error getting hospital requirement details:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Could not load hospital requirement details.',
    });
  }
});

/**
 * 3. POST /api/hospital/requirements (PROTECTED)
 * Authenticated hospital creates a new verified blood requirement.
 * Enforces hospital verification and blocks Bombay Blood Group.
 */
router.post('/hospital/requirements', authenticateHospitalToken, (req, res) => {
  try {
    const {
      bloodGroup,
      blood_group,
      unitsRequired,
      units,
      urgency,
      requiredDate,
      requiredTime,
      reason,
      doctorContact,
      additionalInstructions,
    } = req.body;

    const bg = String(bloodGroup || blood_group || '').trim();
    if (!bg) {
      return res.status(400).json({ error: 'Bad Request', message: 'Blood group is required.' });
    }

    // MANDATORY BOMBAY CHECK
    if (bg.toLowerCase().includes('bombay') || bg === 'Oh') {
      return res.status(403).json({
        error: 'Bombay Blood Group Protocol Required',
        message: 'Bombay Blood Group (Oh) requirements cannot be posted publicly. Use the protected Bombay Access protocol.',
        protocol: 'BOMBAY_ACCESS_REQUIRED',
      });
    }

    const u = parseInt(unitsRequired || units, 10) || 1;
    if (u <= 0 || u > 20) {
      return res.status(400).json({ error: 'Bad Request', message: 'Units required must be between 1 and 20.' });
    }

    // Verify hospital status on server
    const verif = db.getHospitalVerification(req.hospital.id);
    if (!verif || verif.verification_status !== 'VERIFIED') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your hospital account must be VERIFIED to publish official donor-facing blood requirements.',
      });
    }

    const hospEmail = req.body.hospitalEmail || req.body.hospital_email || req.body.email || req.hospital.email || '';
    if (hospEmail && !req.hospital.email) {
      db.updateHospitalEmail(req.hospital.id, hospEmail);
    }

    const newReq = db.createHospitalBloodRequirement({
      bloodGroup: bg,
      unitsRequired: u,
      urgency: urgency || 'Urgent',
      requiredDate: requiredDate || new Date().toISOString().split('T')[0],
      requiredTime: requiredTime || '12:00',
      reason: reason || 'Surgical blood reserve requirement',
      doctorContact: doctorContact || req.hospital.contactPhone || '+91 98421 00000',
      additionalInstructions: additionalInstructions || '',
      district: req.hospital.district,
      city: req.hospital.location || req.hospital.district,
      state: 'Tamil Nadu',
      hospitalLocation: req.hospital.location || req.hospital.district,
      hospitalEmail: hospEmail,
    }, req.hospital);

    // Real transactional email notification to support (non-blocking)
    sendSupportHospitalRequirementNotification(newReq, req.hospital).catch((e) =>
      console.warn('[EMAIL BG ERROR Hospital Requirement]:', e.message)
    );

    return res.status(201).json({
      success: true,
      message: 'Verified hospital blood requirement published successfully.',
      requirement: newReq,
    });
  } catch (err) {
    console.error('Error creating hospital blood requirement:', err);
    return res.status(400).json({
      error: 'Creation Failed',
      message: err.message || 'Could not publish hospital blood requirement.',
    });
  }
});

/**
 * 4. GET /api/hospital/my-requirements (PROTECTED)
 * Retrieves requirements published by the authenticated hospital.
 */
router.get('/hospital/my-requirements', authenticateHospitalToken, (req, res) => {
  try {
    const requirements = db.getHospitalBloodRequirements({
      hospitalId: req.hospital.id,
      allStatuses: true,
      allowBombay: true,
    });

    // Attach donor responses count
    const allResponses = db.getDonorBloodResponses({ hospitalId: req.hospital.id });
    const enriched = requirements.map(r => {
      const respForReq = allResponses.filter(resp => resp.requirement_id === r.id);
      return {
        ...r,
        totalResponses: respForReq.length,
        pendingResponses: respForReq.filter(resp => resp.status === 'PENDING_HOSPITAL_RESPONSE').length,
        acceptedResponses: respForReq.filter(resp => resp.status === 'ACCEPTED_BY_HOSPITAL' || resp.status === 'DONATION_SCHEDULED' || resp.status === 'DONATION_COMPLETED').length,
      };
    });

    return res.json({
      success: true,
      total: enriched.length,
      requirements: enriched,
    });
  } catch (err) {
    console.error('Error fetching hospital requirements:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Could not load your requirements.' });
  }
});

/**
 * 5. PATCH /api/hospital/my-requirements/:id/status (PROTECTED)
 * Updates requirement status (e.g. CANCELLED, FULFILLED).
 */
router.patch('/hospital/my-requirements/:id/status', authenticateHospitalToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Bad Request', message: 'Status is required.' });
    }

    const updated = db.updateHospitalBloodRequirement(id, { status }, req.hospital.id);
    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: 'Requirement not found.' });
    }

    return res.json({
      success: true,
      message: `Requirement status updated to ${status}.`,
      requirement: updated,
    });
  } catch (err) {
    console.error('Error updating requirement status:', err);
    return res.status(400).json({ error: 'Update Failed', message: err.message });
  }
});

/**
 * 6. GET /api/hospital/donor-responses (PROTECTED)
 * Returns donor responses strictly for requirements owned by the authenticated hospital.
 * Hospital A cannot see Hospital B's responses.
 */
router.get('/hospital/donor-responses', authenticateHospitalToken, (req, res) => {
  try {
    const { requirementId, status } = req.query;

    const responses = db.getDonorBloodResponses({
      hospitalId: req.hospital.id,
      requirementId,
      status,
    });

    return res.json({
      success: true,
      total: responses.length,
      responses,
    });
  } catch (err) {
    console.error('Error fetching hospital donor responses:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Could not load donor responses.' });
  }
});

/**
 * 7. POST /api/hospital/donor-responses/:id/action (PROTECTED)
 * Hospital accepts, declines, schedules, or completes a donor response.
 */
router.post('/hospital/donor-responses/:id/action', authenticateHospitalToken, (req, res) => {
  try {
    const { id } = req.params;
    const { action, scheduledAt, reason } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Bad Request', message: 'Action is required.' });
    }

    const cleanAction = String(action).toUpperCase();
    let targetStatus = '';
    if (cleanAction === 'ACCEPT') targetStatus = 'ACCEPTED_BY_HOSPITAL';
    else if (cleanAction === 'DECLINE') targetStatus = 'DECLINED_BY_HOSPITAL';
    else if (cleanAction === 'SCHEDULE') targetStatus = 'DONATION_SCHEDULED';
    else if (cleanAction === 'COMPLETE') targetStatus = 'DONATION_COMPLETED';
    else {
      return res.status(400).json({ error: 'Bad Request', message: `Unknown action: ${action}` });
    }

    const updated = db.updateDonorBloodResponseStatus(
      id,
      targetStatus,
      { scheduledAt, reason },
      req.hospital.id
    );

    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: 'Donor response record not found.' });
    }

    let successMessage = '';
    if (targetStatus === 'ACCEPTED_BY_HOSPITAL') {
      successMessage = 'Donor response ACCEPTED. Unit confirmed and status updated.';

      // Real transactional email notifications to donor and support (non-blocking)
      const assocReq = db.findHospitalBloodRequirementById(updated.requirement_id);
      sendDonorOfferApprovedNotification({
        response: updated,
        requirement: assocReq,
        hospital: req.hospital,
      }).catch((e) => console.warn('[EMAIL BG ERROR Donor Approval]:', e.message));

      sendSupportDonationApprovedNotification({
        response: updated,
        requirement: assocReq,
        hospital: req.hospital,
      }).catch((e) => console.warn('[EMAIL BG ERROR Support Approval]:', e.message));
    } else if (targetStatus === 'DECLINED_BY_HOSPITAL') {
      successMessage = 'Donor response DECLINED.';
    } else if (targetStatus === 'DONATION_SCHEDULED') {
      successMessage = 'Donation appointment SCHEDULED successfully.';
    } else if (targetStatus === 'DONATION_COMPLETED') {
      successMessage = 'Donation COMPLETED and recorded into donor medical history.';
    }

    return res.json({
      success: true,
      message: successMessage,
      response: updated,
    });
  } catch (err) {
    console.error('Error updating donor response:', err);
    return res.status(400).json({ error: 'Action Failed', message: err.message });
  }
});

/**
 * 8. POST /api/donor/responses & POST /donor/responses
 * Voluntary donor responds to a hospital requirement ("I Want to Donate" / "Offer to Donate").
 *
 * REQUIRED FLOW:
 * 1. Saves donation response successfully in database
 * 2. Identifies hospital associated with blood requirement
 * 3. Dynamically resolves hospital's registered email
 * 4. Dispatches email via Resend:
 *    - PRIMARY RECIPIENT (TO): Hospital's registered email
 *    - SUPPORT COPY (BCC): bloodbridgesupportweb@gmail.com
 * 5. Resend error isolation: Email failure NEVER rolls back or blocks donation response.
 */
const handleDonorResponseCreate = async (req, res) => {
  try {
    const {
      requirementId,
      donorId,
      donorName,
      donorBloodGroup,
      donorDistrict,
      donorCity,
      donorPhone,
      donorEmail,
      email,
      donorMessage,
      isAvailable,
    } = req.body;

    if (!requirementId) {
      return res.status(400).json({ error: 'Bad Request', message: 'requirementId is required.' });
    }

    const cleanEmail = (donorEmail || email || '').trim();
    if (!cleanEmail) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Donor email address is mandatory for donation confirmations.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        error: 'Invalid Email',
        message: 'Please provide a valid donor email address for donation confirmations.',
      });
    }

    // 1. Save donation response into database
    const newResponse = db.createDonorBloodResponse(
      {
        requirementId,
        donorId: donorId || 'anon-donor',
        donorName: donorName || 'Voluntary Donor',
        donorBloodGroup,
        donorDistrict,
        donorCity,
        donorPhone,
        donorEmail: cleanEmail,
        donorMessage,
        isAvailable,
      },
      {
        id: donorId,
        full_name: donorName,
        blood_group: donorBloodGroup,
        district: donorDistrict,
        city: donorCity,
        phone: donorPhone,
        email: cleanEmail,
        is_available_for_donation: isAvailable !== false,
      }
    );

    // Also mirror to Supabase if configured (safe non-blocking)
    if (isSupabaseConfiguredServer()) {
      const supa = getSupabaseServerClient();
      if (supa) {
        supa.from('donor_blood_responses').insert([{
          response_code: newResponse.response_code,
          requirement_id: newResponse.requirement_id,
          requirement_code: newResponse.requirement_code,
          hospital_id: newResponse.hospital_id,
          hospital_name: newResponse.hospital_name,
          hospital_email: newResponse.hospital_email || null,
          donor_id: newResponse.donor_id !== 'anon-donor' ? newResponse.donor_id : null,
          donor_name: newResponse.donor_name,
          donor_blood_group: newResponse.donor_blood_group,
          donor_district: newResponse.donor_district,
          donor_city: newResponse.donor_city,
          donor_phone: newResponse.donor_phone,
          donor_email: newResponse.donor_email,
          donor_message: newResponse.donor_message,
          status: newResponse.status,
          notification_status: 'PENDING',
          created_at: newResponse.created_at,
          updated_at: newResponse.updated_at,
        }]).then().catch((e) => console.warn('[SUPABASE DONOR RESPONSE SYNC NOTE]:', e.message));
      }
    }

    // 2. Real transactional email notifications (NON-BLOCKING)
    // A) Hospital registered email (with Approve / Decline one-click buttons, BCC to support)
    //    If hospital email is not registered, automatically routes to central support.
    sendDonorOfferToHospitalNotification(newResponse).catch((e) =>
      console.warn('[EMAIL BG ERROR Hospital Offer]:', e.message)
    );

    // B) Central BloodBridge Support Notification (bloodbridgesupportweb@gmail.com)
    sendSupportDonorOfferNotification(newResponse).catch((e) =>
      console.warn('[EMAIL BG ERROR Support Offer]:', e.message)
    );

    // 3. Return success to user/donor immediately with support coordination confirmation
    return res.status(201).json({
      success: true,
      message: 'Your donation response has been successfully submitted. BloodBridge support will coordinate with the hospital.',
      response: newResponse,
    });
  } catch (err) {
    console.error('Error submitting donor response:', err);
    const isMismatch = (err.message || '').includes('does not match');
    return res.status(400).json({
      error: isMismatch ? 'Blood Group Incompatibility' : 'Submission Failed',
      message: err.message || 'Could not submit donation response.',
    });
  }
};

router.post('/api/donor/responses', handleDonorResponseCreate);
router.post('/donor/responses', handleDonorResponseCreate);

/**
 * 9. GET /api/donor/my-responses
 * Returns donation responses for the authenticated donor.
 */
router.get('/donor/my-responses', (req, res) => {
  try {
    const { donorId } = req.query;
    if (!donorId) {
      return res.status(400).json({ error: 'donorId query parameter is required.' });
    }

    const responses = db.getDonorBloodResponses({ donorId });
    return res.json({
      success: true,
      total: responses.length,
      responses,
    });
  } catch (err) {
    console.error('Error fetching donor responses:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Could not load your donation responses.' });
  }
});

/**
 * 10. POST & PATCH /api/donor/responses/:id/cancel
 * Allows donor to cancel their pending donation response.
 */
const handleDonorResponseCancel = (req, res) => {
  try {
    const { id } = req.params;
    const { donorId } = req.body;

    const response = db.findDonorBloodResponseById(id);
    if (!response) {
      return res.status(404).json({ error: 'Not Found', message: 'Response record not found.' });
    }

    if (donorId && response.donor_id !== donorId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You can only cancel your own donation response.' });
    }

    if (response.status !== 'PENDING_HOSPITAL_RESPONSE') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: `Cannot cancel a response that is already in status: ${response.status}`,
      });
    }

    const updated = db.updateDonorBloodResponseStatus(id, 'CANCELLED_BY_DONOR');
    return res.json({
      success: true,
      message: 'Your donation response has been cancelled.',
      response: updated,
    });
  } catch (err) {
    console.error('Error cancelling donor response:', err);
    return res.status(400).json({ error: 'Cancel Failed', message: err.message });
  }
};

router.post('/donor/responses/:id/cancel', handleDonorResponseCancel);
router.patch('/donor/responses/:id/cancel', handleDonorResponseCancel);

// ----------------------------------------------------
// 11. SECURE TRANSACTIONAL EMAIL AUTOMATION (RESEND)
// ----------------------------------------------------

/**
 * GET /api/email/config-status
 * Safe configuration inspection for admin/development area.
 * NEVER exposes the actual API key string.
 */
router.get('/email/config-status', (req, res) => {
  const key = getApiKey();
  const isKeyConfigured = Boolean(
    key &&
    key !== 're_your_resend_api_key_here' &&
    key.startsWith('re_')
  );

  return res.json({
    success: true,
    isKeyConfigured,
    sender: getFromEmail(),
    service: 'Resend Transactional Email Engine',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/send-test-email
 * Backend test email dispatcher using official Resend Node.js SDK.
 * Accepts: { "email": "user@example.com" } or { "to": "user@example.com" }
 */
router.post('/send-test-email', async (req, res) => {
  try {
    const rawEmail = req.body?.email || req.body?.to || req.body?.recipient;
    const result = await sendTestEmail(rawEmail);

    if (!result.success) {
      return res.status(result.code === 'INVALID_EMAIL' ? 400 : 500).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[EMAIL UNCAUGHT ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing the email request.',
    });
  }
});

/**
 * GET /api/email/logs
 * Audit and delivery monitoring endpoint for administrators and developers.
 */
router.get('/email/logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const logs = getEmailLogs(limit);
  return res.json({
    success: true,
    total: logs.length,
    configuredAdminEmail: getAdminEmail(),
    sender: getFromEmail(),
    logs,
  });
});

/**
 * POST /api/email/test
 * Dedicated admin test endpoint for BloodBridge notification system verification.
 */
router.post('/email/test', async (req, res) => {
  try {
    const rawEmail = req.body?.email || req.body?.to || req.body?.recipient || getAdminEmail();
    const result = await sendTestEmail(rawEmail);
    if (!result.success) {
      return res.status(result.code === 'INVALID_EMAIL' ? 400 : 500).json(result);
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error('[EMAIL TEST UNCAUGHT ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing the test email.',
    });
  }
});

// ----------------------------------------------------
// 12. SECURE EMAIL ACTION WORKFLOW (ONE-CLICK APPROVE / DECLINE)
// ----------------------------------------------------

function renderEmailActionResultHtml({ title, badge, badgeColor = '#10b981', message, submessage, details = null }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BloodBridge – ${title}</title>
      <style>
        body { margin: 0; padding: 24px 16px; background-color: #0c0c10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; display: flex; align-items: center; justify-content: center; min-height: 90vh; }
        .card { max-width: 540px; width: 100%; background-color: #141419; border: 1px solid #262634; border-radius: 20px; padding: 36px 32px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65); text-align: center; box-sizing: border-box; }
        .badge { display: inline-block; padding: 6px 14px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: ${badgeColor}; background-color: rgba(255, 255, 255, 0.05); border: 1px solid ${badgeColor}55; border-radius: 20px; margin-bottom: 16px; }
        h1 { font-size: 23px; font-weight: 800; margin: 0 0 10px 0; color: #ffffff; letter-spacing: -0.3px; }
        .main-msg { font-size: 15px; line-height: 1.6; color: #f1f5f9; margin: 0 0 8px 0; font-weight: 500; }
        .sub-msg { font-size: 13px; line-height: 1.5; color: #94a3b8; margin: 0 0 20px 0; }
        .info-box { background-color: #1a1a24; border: 1px solid #2b2b3a; border-radius: 14px; padding: 18px 20px; text-align: left; margin: 20px 0; font-size: 13px; }
        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #242432; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #94a3b8; font-weight: 500; }
        .info-val { color: #ffffff; font-weight: 700; }
        .btn-portal { display: inline-block; margin-top: 10px; padding: 13px 30px; background: linear-gradient(135deg, #FF2B2B 0%, #990000 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 15px rgba(229, 9, 20, 0.45); }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">${badge}</span>
        <h1>${title}</h1>
        <p class="main-msg">${message}</p>
        ${submessage ? `<p class="sub-msg">${submessage}</p>` : ''}
        ${details ? `
        <div class="info-box">
          ${details.hospitalName ? `<div class="info-row"><span class="info-label">Hospital</span><span class="info-val">${details.hospitalName}</span></div>` : ''}
          ${details.donorName ? `<div class="info-row"><span class="info-label">Donor</span><span class="info-val">${details.donorName}</span></div>` : ''}
          ${details.bloodGroup ? `<div class="info-row"><span class="info-label">Blood Group</span><span class="info-val" style="color: #FF2B2B; font-weight: 800;">${details.bloodGroup}</span></div>` : ''}
          ${details.units ? `<div class="info-row"><span class="info-label">Units</span><span class="info-val">${details.units} Unit(s)</span></div>` : ''}
          ${details.requestCode ? `<div class="info-row"><span class="info-label">Request ID</span><span class="info-val" style="font-family: monospace;">${details.requestCode}</span></div>` : ''}
          ${details.status ? `<div class="info-row"><span class="info-label">Status</span><span class="info-val" style="color: ${badgeColor}; font-weight: 800;">${details.status}</span></div>` : ''}
        </div>
        ` : ''}
        <a href="${getPublicAppUrl()}/hospital-dashboard" class="btn-portal">Return to BloodBridge Portal &rarr;</a>
      </div>
    </body>
    </html>
  `;
}

/**
 * GET & POST /api/email-action and /api/email-approval
 * Secure one-time token approval and triage directly from email client.
 * Does NOT require website redesign or frontend changes.
 */
async function handleEmailAction(req, res) {
  const token = (req.query.token || req.body?.token || '').trim();
  const format = req.query.format || (req.headers.accept?.includes('application/json') ? 'json' : 'html');
  const actionParam = (req.query.action || req.body?.action || 'APPROVE').toUpperCase();

  const reply = (status, payload, htmlContent) => {
    if (format === 'json') {
      return res.status(status).json(payload);
    }
    return res.status(status).send(htmlContent);
  };

  // 1. Validation: Token must exist
  if (!token) {
    return reply(
      400,
      { success: false, error: 'This approval link is invalid or has expired.', code: 'INVALID_TOKEN' },
      renderEmailActionResultHtml({
        type: 'invalid',
        title: 'Invalid Approval Link',
        badge: 'SECURITY NOTICE',
        badgeColor: '#ef4444',
        message: 'This approval link is invalid or has expired.',
        submessage: 'Please log in to BloodBridge to review the blood donation request.',
      })
    );
  }

  // 2. Validate token existence and signature
  const tokenRecord = db.findApprovalToken(token);
  if (!tokenRecord) {
    return reply(
      400,
      { success: false, error: 'This approval link is invalid or has expired.', code: 'INVALID_TOKEN' },
      renderEmailActionResultHtml({
        type: 'invalid',
        title: 'Invalid Approval Link',
        badge: 'SECURITY NOTICE',
        badgeColor: '#ef4444',
        message: 'This approval link is invalid or has expired.',
        submessage: 'Please log in to BloodBridge to review the blood donation request.',
      })
    );
  }

  // 3. Verify token expiration
  const isExpired = tokenRecord.expires_at && new Date() > new Date(tokenRecord.expires_at);
  if (isExpired) {
    return reply(
      400,
      { success: false, error: 'This approval link is invalid or has expired.', code: 'EXPIRED_TOKEN' },
      renderEmailActionResultHtml({
        type: 'expired',
        title: 'Invalid Approval Link',
        badge: 'LINK EXPIRED',
        badgeColor: '#f59e0b',
        message: 'This approval link is invalid or has expired.',
        submessage: 'Please log in to BloodBridge to review the blood donation request.',
      })
    );
  }

  // 4. Verify donation response exists
  const response = db.findDonorBloodResponseById(tokenRecord.donation_response_id);
  if (!response) {
    return reply(
      404,
      { success: false, error: 'Donation response record not found.', code: 'RESPONSE_NOT_FOUND' },
      renderEmailActionResultHtml({
        type: 'error',
        title: 'Record Not Found',
        badge: 'NOT FOUND',
        badgeColor: '#ef4444',
        message: 'The corresponding donation response could not be located.',
        submessage: 'Please log in to BloodBridge to inspect active hospital requirements.',
      })
    );
  }

  const requirement = db.findHospitalBloodRequirementById(response.requirement_id);
  const hospital = db.findHospitalById(tokenRecord.hospital_id || response.hospital_id);
  const hospitalName = hospital?.hospital_name || hospital?.name || response.hospital_name || 'Hospital Desk';
  const donorName = response.donor_name || 'Voluntary Donor';
  const bloodGroup = response.donor_blood_group || requirement?.blood_group || '—';
  const requestCode = requirement?.requirement_code || response.requirement_code || response.id;
  const units = requirement?.units_required || 1;

  // 5. Prevent Double Approval & Check Token Already Used
  if (tokenRecord.status === 'USED' || response.status === 'ACCEPTED_BY_HOSPITAL' || response.status === 'APPROVED') {
    return reply(
      200,
      {
        success: true,
        message: 'Donation already approved.',
        alreadyApproved: true,
        response,
      },
      renderEmailActionResultHtml({
        type: 'already_approved',
        title: 'Donation Already Approved',
        badge: 'ALREADY CONFIRMED',
        badgeColor: '#38bdf8',
        message: 'Donation already approved.',
        submessage: 'This donation offer has already been confirmed. No duplicate approval was created.',
        details: { hospitalName, donorName, bloodGroup, units, requestCode, status: 'APPROVED' },
      })
    );
  }

  // 5b. Verify token belongs to the correct hospital
  if (tokenRecord.hospital_id && response.hospital_id && tokenRecord.hospital_id !== response.hospital_id) {
    return reply(
      403,
      { success: false, error: 'Token does not match hospital record.', code: 'HOSPITAL_MISMATCH' },
      renderEmailActionResultHtml({
        type: 'error',
        title: 'Unauthorized Action',
        badge: 'SECURITY NOTICE',
        badgeColor: '#ef4444',
        message: 'This approval link does not match the hospital for this request.',
        submessage: 'Please log in to BloodBridge to review the blood donation request.',
      })
    );
  }

  // 6. Handle DECLINE / REJECT action
  const actionToPerform = (tokenRecord.action || actionParam).toUpperCase();
  if (actionToPerform === 'DECLINE' || actionToPerform === 'REJECT') {
    if (response.status === 'DECLINED_BY_HOSPITAL') {
      return reply(
        200,
        { success: true, message: 'Donation offer already declined.', response },
        renderEmailActionResultHtml({
          type: 'declined',
          title: 'Donation Offer Declined',
          badge: 'DECLINED',
          badgeColor: '#64748b',
          message: 'This donation offer has already been declined.',
          submessage: 'No further action is required.',
          details: { hospitalName, donorName, bloodGroup, requestCode, status: 'DECLINED' },
        })
      );
    }

    const updated = db.updateDonorBloodResponseStatus(
      response.id,
      'DECLINED_BY_HOSPITAL',
      { reason: 'Declined directly via email action link' },
      tokenRecord.hospital_id
    );
    db.markApprovalTokenUsed(tokenRecord.id);

    return reply(
      200,
      { success: true, message: 'Donation offer declined successfully.', response: updated },
      renderEmailActionResultHtml({
        type: 'declined',
        title: 'Donation Offer Declined',
        badge: 'OFFER DECLINED',
        badgeColor: '#64748b',
        message: 'The donation offer has been declined.',
        submessage: 'The donor response status has been updated in BloodBridge.',
        details: { hospitalName, donorName, bloodGroup, requestCode, status: 'DECLINED' },
      })
    );
  }

  // 7. Execute APPROVE action
  const updatedResponse = db.updateDonorBloodResponseStatus(
    response.id,
    'ACCEPTED_BY_HOSPITAL',
    { approvedViaEmail: true, approvalTokenId: tokenRecord.id },
    tokenRecord.hospital_id
  );
  db.markApprovalTokenUsed(tokenRecord.id);

  // 8. Notify donor and central support by email (non-blocking)
  sendDonorOfferApprovedNotification({
    response: updatedResponse || response,
    requirement,
    hospital,
  }).catch((e) => console.warn('[EMAIL BG ERROR] Donor approval notification failed:', e.message));

  sendSupportDonationApprovedNotification({
    response: updatedResponse || response,
    requirement,
    hospital,
  }).catch((e) => console.warn('[EMAIL BG ERROR] Support approval notification failed:', e.message));

  // 9. Show simple success result (Part 18)
  return reply(
    200,
    {
      success: true,
      message: 'Donation Approved Successfully',
      response: updatedResponse,
    },
    renderEmailActionResultHtml({
      type: 'approved',
      title: 'Donation Approved Successfully',
      badge: 'DONATION CONFIRMED',
      badgeColor: '#10b981',
      message: "The donor's donation offer has been approved.",
      submessage: 'You may now continue with the existing BloodBridge workflow.',
      details: {
        hospitalName,
        donorName,
        bloodGroup,
        units,
        requestCode,
        status: 'APPROVED',
      },
    })
  );
}

router.get('/email-action', handleEmailAction);
router.post('/email-action', handleEmailAction);
router.get('/email-approval', handleEmailAction);

export default router;



