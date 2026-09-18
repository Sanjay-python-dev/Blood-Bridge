import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { authenticateHospitalToken, JWT_SECRET } from '../middleware/auth.js';
import { findNearbyDonors } from '../utils/geo.js';

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

  // Verify password using bcrypt (check clean trimmed password and raw string)
  const isMatch = bcrypt.compareSync(cleanPassword, hospital.password_hash) ||
                  bcrypt.compareSync(String(rawPassword), hospital.password_hash);

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
    user_key: hospital.user_key
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

export default router;
