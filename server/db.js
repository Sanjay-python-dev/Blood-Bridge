import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const HOSPITALS_FILE = path.join(DATA_DIR, 'hospitals.json');
const DONORS_FILE = path.join(DATA_DIR, 'donors.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'blood_requests.json');
const MATCHES_FILE = path.join(DATA_DIR, 'blood_request_matches.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'hospital_sessions.json');
const BOMBAY_REQUESTS_FILE = path.join(DATA_DIR, 'bombay_requests.json');
const BOMBAY_TOKENS_FILE = path.join(DATA_DIR, 'bombay_tokens.json');
const BOMBAY_AUDIT_FILE = path.join(DATA_DIR, 'bombay_audit.json');
const HOSPITAL_VERIFICATIONS_FILE = path.join(DATA_DIR, 'hospital_verifications.json');
const HOSPITAL_REQUIREMENTS_FILE = path.join(DATA_DIR, 'hospital_blood_requirements.json');
const DONOR_RESPONSES_FILE = path.join(DATA_DIR, 'donor_blood_responses.json');
const APPROVAL_TOKENS_FILE = path.join(DATA_DIR, 'approval_tokens.json');
const ADMIN_ACCOUNTS_FILE = path.join(DATA_DIR, 'admin_accounts.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// In-memory cache for fast reads with disk backing
let hospitalsCache = readJsonFile(HOSPITALS_FILE, []);
let donorsCache = readJsonFile(DONORS_FILE, []);
let requestsCache = readJsonFile(REQUESTS_FILE, []);
let matchesCache = readJsonFile(MATCHES_FILE, []);
let sessionsCache = readJsonFile(SESSIONS_FILE, []);
let bombayRequestsCache = readJsonFile(BOMBAY_REQUESTS_FILE, []);
let bombayTokensCache = readJsonFile(BOMBAY_TOKENS_FILE, []);
let bombayAuditCache = readJsonFile(BOMBAY_AUDIT_FILE, []);
let hospitalVerificationsCache = readJsonFile(HOSPITAL_VERIFICATIONS_FILE, []);
let hospitalRequirementsCache = readJsonFile(HOSPITAL_REQUIREMENTS_FILE, []);
let donorResponsesCache = readJsonFile(DONOR_RESPONSES_FILE, []);
let approvalTokensCache = readJsonFile(APPROVAL_TOKENS_FILE, []);
let adminAccountsCache = readJsonFile(ADMIN_ACCOUNTS_FILE, []);

const CLINICAL_COMPATIBILITY = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

export const db = {
  // --- HOSPITALS ---
  getHospitals() {
    return hospitalsCache;
  },

  findHospitalById(id) {
    if (!id) return null;
    const clean = String(id).trim();
    return hospitalsCache.find(h => 
      h.id === clean || 
      h.user_key === clean || 
      (h.hospital_name && h.hospital_name.toLowerCase() === clean.toLowerCase())
    );
  },

  updateHospitalEmail(id, email) {
    const idx = hospitalsCache.findIndex(h => h.id === id || h.user_key === id);
    if (idx !== -1) {
      hospitalsCache[idx].email = email ? String(email).trim() : null;
      hospitalsCache[idx].updated_at = new Date().toISOString();
      writeJsonFile(HOSPITALS_FILE, hospitalsCache);
      return hospitalsCache[idx];
    }
    return null;
  },

  updateHospital(id, updates = {}) {
    const idx = hospitalsCache.findIndex(h => h.id === id || h.user_key === id);
    if (idx !== -1) {
      hospitalsCache[idx] = {
        ...hospitalsCache[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      writeJsonFile(HOSPITALS_FILE, hospitalsCache);
      return hospitalsCache[idx];
    }
    return null;
  },

  registerHospital(hospitalData) {
    const newHospital = {
      id: hospitalData.id || `hosp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      district: hospitalData.district || 'Chennai',
      hospital_name: hospitalData.hospital_name || hospitalData.name || 'Hospital',
      name: hospitalData.name || hospitalData.hospital_name || 'Hospital',
      location: hospitalData.location || hospitalData.district || 'City',
      latitude: hospitalData.latitude || 13.0827,
      longitude: hospitalData.longitude || 80.2707,
      user_key: hospitalData.user_key || `KEY-${Date.now()}`,
      password_hash: hospitalData.password_hash || '',
      email: hospitalData.email || '',
      is_active: hospitalData.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    hospitalsCache.push(newHospital);
    writeJsonFile(HOSPITALS_FILE, hospitalsCache);
    return newHospital;
  },

  findHospitalByUserKey(userKey) {
    if (!userKey) return null;
    const cleanKey = String(userKey).trim().replace(/[\u2010-\u2015]/g, '-').toUpperCase();
    return hospitalsCache.find(h => {
      const hKey = String(h.user_key).trim().replace(/[\u2010-\u2015]/g, '-').toUpperCase();
      return hKey === cleanKey;
    });
  },

  searchHospitals(query, limit = 20) {
    if (!query || !query.trim()) {
      return hospitalsCache.slice(0, limit);
    }
    const q = query.trim().toLowerCase();
    const matches = hospitalsCache.filter(h => {
      const name = (h.hospital_name || h.name || '').toLowerCase();
      const district = (h.district || '').toLowerCase();
      const loc = (h.location || '').toLowerCase();
      return name.includes(q) || district.includes(q) || loc.includes(q);
    });
    return matches.slice(0, limit);
  },

  updateHospitalPassword(id, newPasswordHash) {
    const idx = hospitalsCache.findIndex(h => h.id === id);
    if (idx !== -1) {
      hospitalsCache[idx].password_hash = newPasswordHash;
      hospitalsCache[idx].updated_at = new Date().toISOString();
      writeJsonFile(HOSPITALS_FILE, hospitalsCache);
      return hospitalsCache[idx];
    }
    return null;
  },

  // --- DONORS ---
  getDonors() {
    return donorsCache;
  },

  findDonorById(id) {
    return donorsCache.find(d => d.id === id);
  },

  // --- BLOOD REQUESTS & MATCHING ---
  checkExpiredRequests() {
    const todayStr = new Date().toISOString().split('T')[0];
    let updatedAny = false;
    requestsCache.forEach(r => {
      if ((r.status === 'PENDING' || r.status === 'MATCHING' || r.status === 'Open') && r.required_date) {
        const reqDate = String(r.required_date).trim();
        // Check if required_date is a YYYY-MM-DD format and in the past
        if (/^\d{4}-\d{2}-\d{2}$/.test(reqDate) && reqDate < todayStr) {
          r.status = 'EXPIRED';
          r.updated_at = new Date().toISOString();
          updatedAny = true;
        }
      }
    });
    if (updatedAny) {
      writeJsonFile(REQUESTS_FILE, requestsCache);
    }
  },

  getBloodRequests(filters = {}) {
    this.checkExpiredRequests();
    let results = [...requestsCache];

    if (filters.userId) {
      results = results.filter(r => r.requester_id === filters.userId || !r.requester_id);
    }
    if (filters.hospitalId) {
      results = results.filter(r => r.hospital_id === filters.hospitalId);
    }
    if (filters.status && filters.status !== 'All') {
      const targetStatus = filters.status.toUpperCase();
      results = results.filter(r => {
        const s = (r.status || '').toUpperCase();
        if (targetStatus === 'OPEN') return s === 'OPEN' || s === 'PENDING' || s === 'MATCHING';
        if (targetStatus === 'PENDING') return s === 'PENDING' || s === 'OPEN';
        if (targetStatus === 'ACTIVE') return s === 'PENDING' || s === 'MATCHING' || s === 'DONOR_CONTACTED' || s === 'DONOR_ACCEPTED' || s === 'OPEN';
        return s === targetStatus;
      });
    }
    if (filters.urgency && filters.urgency !== 'All') {
      results = results.filter(r => (r.urgency || r.emergency_level || '').toLowerCase() === filters.urgency.toLowerCase());
    }
    if (filters.bloodGroup && filters.bloodGroup !== 'All' && filters.bloodGroup !== 'All Groups') {
      results = results.filter(r => (r.blood_group || r.bloodGroup) === filters.bloodGroup);
    }
    if (filters.district && filters.district !== 'All' && filters.district !== 'All Districts') {
      const qDist = filters.district.toLowerCase();
      results = results.filter(r => (r.district || '').toLowerCase().includes(qDist) || (r.city || '').toLowerCase().includes(qDist));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(r =>
        (r.request_code || '').toLowerCase().includes(q) ||
        (r.patient_name || r.patient || '').toLowerCase().includes(q) ||
        (r.hospital_name || r.hospital || '').toLowerCase().includes(q) ||
        (r.district || '').toLowerCase().includes(q)
      );
    }

    return results;
  },

  findBloodRequestById(id) {
    this.checkExpiredRequests();
    if (!id) return null;
    const clean = String(id).trim();
    return requestsCache.find(r => r.id === clean || (r.request_code && r.request_code.toUpperCase() === clean.toUpperCase()));
  },

  findBloodRequestByCode(code) {
    this.checkExpiredRequests();
    if (!code) return null;
    const clean = String(code).trim().toUpperCase();
    return requestsCache.find(r => r.request_code && r.request_code.toUpperCase() === clean);
  },

  getUserBloodRequests(userId) {
    return this.getBloodRequests({ userId });
  },

  getHospitalBloodRequests(hospitalId) {
    return this.getBloodRequests({ hospitalId });
  },

  createBloodRequest(data) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const requestCode = `BR-2026-${randomHex}`;
    const now = new Date().toISOString();

    const bg = data.bloodGroup || data.blood_group;
    const units = Number(data.unitsRequired || data.units_required || data.units) || 1;
    const urgency = data.urgency || data.emergency_level || 'Urgent';
    const reqDate = data.requiredDate || data.required_date || now.split('T')[0];
    const district = data.district || data.city || 'Karur';
    const city = data.city || data.district || 'Karur';

    const newRequest = {
      id: `br-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      request_code: requestCode,
      requestCode: requestCode,
      code: requestCode,
      requester_id: data.requesterId || data.requester_id || null,
      requester_name: data.requesterName || data.requester_name || data.patientName || data.patient_name || 'Requester',
      requester_phone: data.requesterPhone || data.requester_phone || data.contactNumber || data.contact_number || '',
      requester_email: data.requesterEmail || data.requester_email || data.email || data.contactEmail || '',
      requesterEmail: data.requesterEmail || data.requester_email || data.email || data.contactEmail || '',
      email: data.requesterEmail || data.requester_email || data.email || data.contactEmail || '',
      contact_email: data.requesterEmail || data.requester_email || data.email || data.contactEmail || '',
      patient_name: data.patientName || data.patient_name || 'Patient',
      patient_age: data.patientAge || data.patient_age || null,
      blood_group: bg,
      units_required: units,
      required_units: units,
      urgency: urgency,
      emergency_level: urgency === 'Emergency' ? 'Critical' : urgency,
      required_date: reqDate,
      hospital_name: data.hospitalName || data.hospital_name || 'Hospital',
      hospital_location: data.hospitalLocation || data.hospital_location || data.hospitalAddress || '',
      hospital_address: data.hospitalLocation || data.hospital_address || '',
      district: district,
      city: city,
      state: data.state || 'Tamil Nadu',
      hospital_contact: data.hospitalContact || data.hospital_contact || data.doctorContact || '',
      contact_number: data.contactNumber || data.contact_number || data.requesterPhone || '',
      reason: data.reason || data.additionalMessage || '',
      additional_message: data.reason || data.additionalMessage || '',
      document_url: data.documentUrl || data.document_url || null,
      status: 'MATCHING',
      created_at: now,
      updated_at: now
    };

    requestsCache.unshift(newRequest);
    writeJsonFile(REQUESTS_FILE, requestsCache);

    // Automatic Donor Matching
    this.matchDonorsForRequest(newRequest);

    return newRequest;
  },

  matchDonorsForRequest(request) {
    const reqDist = (request.district || '').toLowerCase();
    const reqGroup = request.blood_group;
    const compatibleGroups = CLINICAL_COMPATIBILITY[reqGroup] || [reqGroup];

    // Filter available donors in district with exact or compatible blood group
    const matchedDonors = donorsCache.filter(d => {
      const isAvail = d.is_available !== false && d.availability !== 'Unavailable';
      if (!isAvail) return false;
      const dDist = (d.district || '').toLowerCase();
      const distMatches = !reqDist || dDist === reqDist || dDist.includes(reqDist) || reqDist.includes(dDist);
      if (!distMatches) return false;
      const dGroup = d.blood_group || d.bloodGroup;
      return compatibleGroups.includes(dGroup);
    });

    // Create match records
    const now = new Date().toISOString();
    const createdMatches = [];

    matchedDonors.slice(0, 10).forEach(d => {
      // Check if match already exists
      const exists = matchesCache.find(m => m.request_id === request.id && m.donor_id === d.id);
      if (!exists) {
        const matchRecord = {
          id: `match-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          request_id: request.id,
          request_code: request.request_code,
          donor_id: d.id,
          donor_name: d.name,
          donor_blood_group: d.blood_group || d.bloodGroup,
          donor_district: d.district,
          donor_city: d.city || d.area,
          donor_phone: d.fullPhone || d.phone,
          donor_email: d.email || '',
          match_status: 'MATCHED',
          created_at: now,
          updated_at: now,
          responded_at: null
        };
        matchesCache.unshift(matchRecord);
        createdMatches.push(matchRecord);
      }
    });

    if (createdMatches.length > 0) {
      writeJsonFile(MATCHES_FILE, matchesCache);
    }

    return createdMatches;
  },

  getRequestMatches(requestId) {
    return matchesCache.filter(m => m.request_id === requestId || m.request_code === requestId);
  },

  getDonorMatches(donorIdentifier) {
    if (!donorIdentifier) return [];
    const cleanId = String(donorIdentifier).trim();
    const cleanDigits = cleanId.replace(/\D/g, '');
    const donorMatches = matchesCache.filter(m => {
      if (m.donor_id === cleanId) return true;
      if (cleanDigits.length >= 10 && m.donor_phone) {
        const mDigits = m.donor_phone.replace(/\D/g, '');
        if (mDigits.endsWith(cleanDigits.slice(-10))) return true;
      }
      return false;
    });
    // Enrich with request details
    return donorMatches.map(m => {
      const req = requestsCache.find(r => r.id === m.request_id);
      return {
        ...m,
        request: req || null,
        patientName: req ? req.patient_name : 'Patient',
        hospital: req ? req.hospital_name : 'Hospital',
        city: req ? req.city : m.donor_city,
        urgency: req ? req.urgency : 'Urgent',
        requiredDate: req ? req.required_date : 'Immediate',
        unitsRequired: req ? req.units_required : 1,
        bloodGroup: req ? req.blood_group : m.donor_blood_group,
      };
    });
  },

  updateMatchStatus(matchId, newStatus) {
    const idx = matchesCache.findIndex(m => m.id === matchId);
    if (idx === -1) return null;

    const validStatuses = ['MATCHED', 'CONTACT_REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELLED'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid match status: ${newStatus}`);
    }

    matchesCache[idx].match_status = newStatus;
    matchesCache[idx].updated_at = new Date().toISOString();
    if (newStatus === 'ACCEPTED' || newStatus === 'DECLINED') {
      matchesCache[idx].responded_at = new Date().toISOString();
    }

    writeJsonFile(MATCHES_FILE, matchesCache);

    // Update parent request status accordingly
    const targetRequestId = matchesCache[idx].request_id;
    const req = requestsCache.find(r => r.id === targetRequestId);
    if (req) {
      if (newStatus === 'ACCEPTED') {
        req.status = 'DONOR_ACCEPTED';
        req.updated_at = new Date().toISOString();
        writeJsonFile(REQUESTS_FILE, requestsCache);
      } else if (newStatus === 'CONTACT_REQUESTED' && req.status === 'MATCHING') {
        req.status = 'DONOR_CONTACTED';
        req.updated_at = new Date().toISOString();
        writeJsonFile(REQUESTS_FILE, requestsCache);
      }
    }

    return matchesCache[idx];
  },

  updateBloodRequestStatus(id, newStatus, userRole = 'user') {
    const idx = requestsCache.findIndex(r => r.id === id || r.request_code === id);
    if (idx === -1) return null;

    const currentStatus = (requestsCache[idx].status || 'PENDING').toUpperCase();
    const target = newStatus.toUpperCase();

    // Transition rules:
    // PENDING/MATCHING -> DONOR_CONTACTED -> DONOR_ACCEPTED -> FULFILLED
    // PENDING/MATCHING/DONOR_CONTACTED/DONOR_ACCEPTED -> CANCELLED
    // PENDING/MATCHING -> EXPIRED
    const allowedTransitions = {
      'PENDING': ['MATCHING', 'CANCELLED', 'EXPIRED'],
      'MATCHING': ['DONOR_CONTACTED', 'DONOR_ACCEPTED', 'CANCELLED', 'EXPIRED', 'FULFILLED'],
      'DONOR_CONTACTED': ['DONOR_ACCEPTED', 'MATCHING', 'CANCELLED', 'FULFILLED'],
      'DONOR_ACCEPTED': ['FULFILLED', 'MATCHING', 'CANCELLED'],
      'FULFILLED': [],
      'CANCELLED': [],
      'EXPIRED': [],
      'OPEN': ['MATCHING', 'DONOR_CONTACTED', 'DONOR_ACCEPTED', 'CANCELLED', 'FULFILLED'],
    };

    // Admins can override, otherwise check transition table
    if (userRole !== 'ADMIN' && userRole !== 'admin') {
      const allowed = allowedTransitions[currentStatus] || [];
      if (!allowed.includes(target) && currentStatus !== target) {
        throw new Error(`Unauthorized transition: cannot change request from ${currentStatus} to ${target}`);
      }
    }

    requestsCache[idx].status = target;
    requestsCache[idx].updated_at = new Date().toISOString();
    writeJsonFile(REQUESTS_FILE, requestsCache);

    // If cancelled, also cancel associated active matches
    if (target === 'CANCELLED') {
      matchesCache.forEach(m => {
        if (m.request_id === requestsCache[idx].id && m.match_status !== 'ACCEPTED' && m.match_status !== 'DECLINED') {
          m.match_status = 'CANCELLED';
          m.updated_at = new Date().toISOString();
        }
      });
      writeJsonFile(MATCHES_FILE, matchesCache);
    }

    return requestsCache[idx];
  },

  // --- SESSIONS ---
  saveSession(session) {
    sessionsCache = sessionsCache.filter(s => s.token !== session.token);
    sessionsCache.push(session);
    writeJsonFile(SESSIONS_FILE, sessionsCache);
  },

  findSession(token) {
    return sessionsCache.find(s => s.token === token);
  },

  removeSession(token) {
    sessionsCache = sessionsCache.filter(s => s.token !== token);
    writeJsonFile(SESSIONS_FILE, sessionsCache);
  },

  // --- BOMBAY BLOOD REQUESTS ---
  getBombayRequests() {
    return bombayRequestsCache;
  },

  findBombayRequestById(id) {
    return bombayRequestsCache.find(r => r.id === id);
  },

  findBombayRequestByCode(code) {
    if (!code) return null;
    const cleanCode = String(code).trim().toUpperCase();
    return bombayRequestsCache.find(r => String(r.request_code).toUpperCase() === cleanCode);
  },

  createBombayRequest(data) {
    const newReq = {
      id: `bbr-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    bombayRequestsCache.unshift(newReq);
    writeJsonFile(BOMBAY_REQUESTS_FILE, bombayRequestsCache);
    return newReq;
  },

  updateBombayRequest(id, updates) {
    const idx = bombayRequestsCache.findIndex(r => r.id === id);
    if (idx !== -1) {
      bombayRequestsCache[idx] = {
        ...bombayRequestsCache[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      writeJsonFile(BOMBAY_REQUESTS_FILE, bombayRequestsCache);
      return bombayRequestsCache[idx];
    }
    return null;
  },

  // --- BOMBAY ACCESS TOKENS ---
  getBombayTokens() {
    return bombayTokensCache;
  },

  createBombayToken(tokenData) {
    const newToken = {
      id: `token-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: 'ACTIVE',
      usage_count: 0,
      created_at: new Date().toISOString(),
      ...tokenData,
    };
    bombayTokensCache.unshift(newToken);
    writeJsonFile(BOMBAY_TOKENS_FILE, bombayTokensCache);
    return newToken;
  },

  findBombayTokenByHash(tokenHash) {
    return bombayTokensCache.find(t => t.token_hash === tokenHash);
  },

  findActiveBombayTokenForRequest(requestId) {
    const now = new Date().toISOString();
    return bombayTokensCache.find(
      t => t.request_id === requestId && t.status === 'ACTIVE' && t.expires_at > now
    );
  },

  updateBombayToken(id, updates) {
    const idx = bombayTokensCache.findIndex(t => t.id === id);
    if (idx !== -1) {
      bombayTokensCache[idx] = {
        ...bombayTokensCache[idx],
        ...updates,
      };
      writeJsonFile(BOMBAY_TOKENS_FILE, bombayTokensCache);
      return bombayTokensCache[idx];
    }
    return null;
  },

  // --- BOMBAY AUDIT LOGS ---
  addBombayAuditLog({ requestId, actorId, hospitalId, action, result, metadata }) {
    const logEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      request_id: requestId || null,
      actor_id: actorId || 'system',
      hospital_id: hospitalId || null,
      action,
      result,
      metadata: metadata || null,
      created_at: new Date().toISOString(),
    };
    bombayAuditCache.unshift(logEntry);
    writeJsonFile(BOMBAY_AUDIT_FILE, bombayAuditCache);
    return logEntry;
  },

  getBombayAuditLogs(limit = 100) {
    return bombayAuditCache.slice(0, limit);
  },

  // --- HOSPITAL VERIFICATIONS ---
  getHospitalVerification(hospitalId) {
    if (!hospitalId) return null;
    try {
      hospitalVerificationsCache = readJsonFile(HOSPITAL_VERIFICATIONS_FILE, hospitalVerificationsCache);
    } catch (_) {}
    const match = hospitalVerificationsCache.find(v => v.hospital_id === hospitalId);
    if (match) return match;
    return {
      hospital_id: hospitalId,
      verification_status: 'PENDING',
    };
  },

  setHospitalVerification(hospitalId, status, verifiedBy = 'admin') {
    const idx = hospitalVerificationsCache.findIndex(v => v.hospital_id === hospitalId);
    const entry = {
      id: idx !== -1 ? hospitalVerificationsCache[idx].id : `hverif-${Date.now()}`,
      hospital_id: hospitalId,
      verification_status: status,
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (idx !== -1) {
      hospitalVerificationsCache[idx] = { ...hospitalVerificationsCache[idx], ...entry };
    } else {
      hospitalVerificationsCache.push(entry);
    }
    writeJsonFile(HOSPITAL_VERIFICATIONS_FILE, hospitalVerificationsCache);
    return entry;
  },

  // --- HOSPITAL BLOOD REQUIREMENTS & DONOR RESPONSES ---
  checkExpiredHospitalRequirements() {
    const todayStr = new Date().toISOString().split('T')[0];
    let updatedAny = false;
    hospitalRequirementsCache.forEach(r => {
      if ((r.status === 'ACTIVE' || r.status === 'PARTIALLY_FULFILLED') && r.required_date) {
        const reqDate = String(r.required_date).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(reqDate) && reqDate < todayStr) {
          r.status = 'EXPIRED';
          r.updated_at = new Date().toISOString();
          updatedAny = true;

          // Also expire associated pending donor responses
          donorResponsesCache.forEach(resp => {
            if (resp.requirement_id === r.id && resp.status === 'PENDING_HOSPITAL_RESPONSE') {
              resp.status = 'EXPIRED';
              resp.updated_at = new Date().toISOString();
            }
          });
        }
      }
    });

    if (updatedAny) {
      writeJsonFile(HOSPITAL_REQUIREMENTS_FILE, hospitalRequirementsCache);
      writeJsonFile(DONOR_RESPONSES_FILE, donorResponsesCache);
    }
  },

  getHospitalBloodRequirements(filters = {}) {
    this.checkExpiredHospitalRequirements();
    let results = [...hospitalRequirementsCache];

    // Filter by hospitalId
    if (filters.hospitalId) {
      results = results.filter(r => r.hospital_id === filters.hospitalId);
    }

    // Filter by status (default: ACTIVE and PARTIALLY_FULFILLED for donor-facing views)
    if (filters.status && filters.status !== 'All') {
      const targetStatus = filters.status.toUpperCase();
      if (targetStatus === 'ACTIVE') {
        results = results.filter(r => r.status === 'ACTIVE' || r.status === 'PARTIALLY_FULFILLED');
      } else {
        results = results.filter(r => (r.status || '').toUpperCase() === targetStatus);
      }
    } else if (!filters.hospitalId && !filters.allStatuses) {
      // Public / donor view defaults to active and partially fulfilled requirements
      results = results.filter(r => r.status === 'ACTIVE' || r.status === 'PARTIALLY_FULFILLED');
    }

    // Filter by blood group
    if (filters.bloodGroup && filters.bloodGroup !== 'All' && filters.bloodGroup !== 'All Groups') {
      results = results.filter(r => (r.blood_group || '').toUpperCase() === filters.bloodGroup.toUpperCase());
    }

    // Filter by urgency
    if (filters.urgency && filters.urgency !== 'All') {
      results = results.filter(r => (r.urgency || '').toLowerCase() === filters.urgency.toLowerCase());
    }

    // Filter by district
    if (filters.district && filters.district !== 'All' && filters.district !== 'All Districts') {
      const qDist = filters.district.toLowerCase();
      results = results.filter(r => (r.district || '').toLowerCase().includes(qDist) || (r.city || '').toLowerCase().includes(qDist));
    }

    // Search query filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(r =>
        (r.hospital_name || '').toLowerCase().includes(q) ||
        (r.requirement_code || '').toLowerCase().includes(q) ||
        (r.district || '').toLowerCase().includes(q) ||
        (r.city || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q)
      );
    }

    // STRICT BOMBAY BLOOD SEPARATION:
    // Bombay Blood Group (Oh) requirements are never exposed in standard public queries
    if (!filters.allowBombay) {
      results = results.filter(r => {
        const bg = (r.blood_group || '').toLowerCase();
        return !bg.includes('bombay') && bg !== 'oh';
      });
    }

    // Sort order: Emergency first, then Urgent, then Planned; newer first
    const urgencyWeight = { 'Emergency': 3, 'Urgent': 2, 'Planned': 1 };
    results.sort((a, b) => {
      const weightA = urgencyWeight[a.urgency] || 1;
      const weightB = urgencyWeight[b.urgency] || 1;
      if (weightB !== weightA) return weightB - weightA;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return results;
  },

  findHospitalBloodRequirementById(id) {
    this.checkExpiredHospitalRequirements();
    if (!id) return null;
    const clean = String(id).trim();
    return hospitalRequirementsCache.find(r => r.id === clean || (r.requirement_code && r.requirement_code.toUpperCase() === clean.toUpperCase()));
  },

  findHospitalBloodRequirementByCode(code) {
    this.checkExpiredHospitalRequirements();
    if (!code) return null;
    const clean = String(code).trim().toUpperCase();
    return hospitalRequirementsCache.find(r => r.requirement_code && r.requirement_code.toUpperCase() === clean);
  },

  createHospitalBloodRequirement(data, hospital) {
    // 1. Enforce verified hospital requirement
    const verif = this.getHospitalVerification(hospital.id || hospital.hospital_id);
    if (!verif || verif.verification_status !== 'VERIFIED') {
      throw new Error('Only verified hospitals are authorized to publish official blood requirements.');
    }

    // 2. Enforce Bombay Blood Separation
    const bg = String(data.bloodGroup || data.blood_group || '').trim();
    if (bg.toLowerCase().includes('bombay') || bg === 'Oh') {
      throw new Error('Bombay Blood Group (Oh) requirements must be routed through the protected Bombay Blood Protocol.');
    }

    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const reqCode = `HBR-2026-${randomHex}`;
    const now = new Date().toISOString();
    const unitsReq = parseInt(data.unitsRequired || data.units_required || data.units, 10) || 1;
    const reqDate = data.requiredDate || data.required_date || now.split('T')[0];

    const newReq = {
      id: `hbr-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      requirement_code: reqCode,
      hospital_id: hospital.id,
      hospital_name: hospital.hospital_name || hospital.name || data.hospitalName || 'Verified Hospital',
      hospital_location: data.hospitalLocation || data.hospital_location || hospital.location || hospital.district,
      hospital_email: data.hospitalEmail || data.hospital_email || hospital.email || data.email || '',
      district: data.district || hospital.district || 'Karur',
      city: data.city || hospital.location || data.district || 'Karur',
      state: data.state || 'Tamil Nadu',
      blood_group: bg,
      units_required: unitsReq,
      units_confirmed: 0,
      urgency: data.urgency || 'Urgent',
      required_date: reqDate,
      required_time: data.requiredTime || data.required_time || '12:00',
      reason: data.reason || 'Hospital blood bank replenishment / surgical requirement',
      doctor_contact: data.doctorContact || data.doctor_contact || hospital.contactPhone || '+91 98421 00000',
      additional_instructions: data.additionalInstructions || data.additional_instructions || '',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
      expires_at: data.expiresAt || `${reqDate}T23:59:59.000Z`,
    };

    hospitalRequirementsCache.unshift(newReq);
    writeJsonFile(HOSPITAL_REQUIREMENTS_FILE, hospitalRequirementsCache);

    this.addBombayAuditLog({
      requestId: newReq.id,
      actorId: hospital.id,
      hospitalId: hospital.id,
      action: 'hospital_requirement_created',
      result: 'SUCCESS',
      metadata: { requirementCode: reqCode, bloodGroup: bg, units: unitsReq, urgency: newReq.urgency },
    });

    return newReq;
  },

  updateHospitalBloodRequirement(id, updates, hospitalId) {
    const idx = hospitalRequirementsCache.findIndex(r => r.id === id || r.requirement_code === id);
    if (idx === -1) return null;

    const req = hospitalRequirementsCache[idx];
    if (hospitalId && req.hospital_id !== hospitalId) {
      throw new Error('Unauthorized: You can only update blood requirements belonging to your hospital.');
    }

    const updated = {
      ...req,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    hospitalRequirementsCache[idx] = updated;
    writeJsonFile(HOSPITAL_REQUIREMENTS_FILE, hospitalRequirementsCache);

    const actionName = updates.status === 'CANCELLED' ? 'hospital_requirement_cancelled' : 'hospital_requirement_updated';
    this.addBombayAuditLog({
      requestId: id,
      actorId: hospitalId || 'hospital',
      hospitalId: req.hospital_id,
      action: actionName,
      result: 'SUCCESS',
      metadata: updates,
    });

    return updated;
  },

  // --- DONOR BLOOD RESPONSES ---
  getDonorBloodResponses(filters = {}) {
    let results = [...donorResponsesCache];

    if (filters.requirementId) {
      results = results.filter(r => r.requirement_id === filters.requirementId);
    }
    if (filters.donorId) {
      results = results.filter(r => r.donor_id === filters.donorId);
    }
    if (filters.hospitalId) {
      results = results.filter(r => r.hospital_id === filters.hospitalId);
    }
    if (filters.status && filters.status !== 'All') {
      results = results.filter(r => (r.status || '').toUpperCase() === filters.status.toUpperCase());
    }

    // Enrich with requirement details
    return results.map(resp => {
      const parentReq = hospitalRequirementsCache.find(r => r.id === resp.requirement_id);
      return {
        ...resp,
        requirement: parentReq || null,
        hospitalName: parentReq ? parentReq.hospital_name : resp.hospital_name,
        bloodGroup: parentReq ? parentReq.blood_group : resp.donor_blood_group,
        urgency: parentReq ? parentReq.urgency : 'Urgent',
        requiredDate: parentReq ? parentReq.required_date : '',
        district: parentReq ? parentReq.district : resp.donor_district,
        city: parentReq ? parentReq.city : resp.donor_city,
      };
    });
  },

  findDonorBloodResponseById(id) {
    if (!id) return null;
    const clean = String(id).trim();
    return donorResponsesCache.find(r => r.id === clean || (r.response_code && r.response_code.toUpperCase() === clean.toUpperCase()));
  },

  createDonorBloodResponse(data, donorUser) {
    // 1. Find requirement
    const req = this.findHospitalBloodRequirementById(data.requirementId);
    if (!req) {
      throw new Error('Hospital blood requirement not found.');
    }

    if (req.status !== 'ACTIVE' && req.status !== 'PARTIALLY_FULFILLED') {
      throw new Error(`This blood requirement is no longer active (current status: ${req.status}).`);
    }

    // 2. Validate Donor Blood Group Match
    const donorBlood = data.donorBloodGroup || donorUser?.blood_group;
    if (!donorBlood || donorBlood !== req.blood_group) {
      throw new Error(`This request requires ${req.blood_group} blood. Your registered blood group (${donorBlood || 'Unspecified'}) does not match this requirement.`);
    }

    // 3. Validate Donor Availability
    const isAvail = data.isAvailable !== undefined ? data.isAvailable : (donorUser?.is_available_for_donation !== false);
    if (!isAvail) {
      throw new Error('Your donor availability is currently turned off. Please update your donor availability before responding.');
    }

    // 4. Prevent duplicate pending responses to same requirement
    const donorId = donorUser?.id || data.donorId || 'anonymous-donor';
    const existing = donorResponsesCache.find(
      r => r.requirement_id === req.id && r.donor_id === donorId &&
      (r.status === 'PENDING_HOSPITAL_RESPONSE' || r.status === 'ACCEPTED_BY_HOSPITAL' || r.status === 'DONATION_SCHEDULED')
    );
    if (existing) {
      throw new Error('You have already submitted an active response for this requirement.');
    }

    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const respCode = `DR-2026-${randomHex}`;
    const now = new Date().toISOString();

    const rawPhone = donorUser?.phone || data.donorPhone || '';
    const rawEmail = donorUser?.email || data.donorEmail || data.email || '';
    const maskedPhone = rawPhone && rawPhone.length >= 10 ? `${rawPhone.slice(0, 8)}•••••` : (rawPhone || '');

    const newResponse = {
      id: `dr-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      response_code: respCode,
      requirement_id: req.id,
      requirement_code: req.requirement_code,
      hospital_id: req.hospital_id,
      hospital_name: req.hospital_name,
      hospital_email: req.hospital_email || '',
      donor_id: donorId,
      donor_name: donorUser?.full_name || donorUser?.name || data.donorName || 'Voluntary Donor',
      donor_blood_group: donorBlood,
      donor_district: donorUser?.district || data.donorDistrict || req.district,
      donor_city: donorUser?.city || data.donorCity || req.city,
      donor_phone: maskedPhone,
      donor_raw_phone: rawPhone,
      donor_email: rawEmail,
      donor_message: (data.donorMessage || data.message || '').trim(),
      status: 'PENDING_HOSPITAL_RESPONSE',
      responded_at: now,
      hospital_response_at: null,
      scheduled_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };

    donorResponsesCache.unshift(newResponse);
    writeJsonFile(DONOR_RESPONSES_FILE, donorResponsesCache);

    this.addBombayAuditLog({
      requestId: req.id,
      actorId: donorId,
      hospitalId: req.hospital_id,
      action: 'donor_response_created',
      result: 'SUCCESS',
      metadata: { responseCode: respCode, bloodGroup: donorBlood, requirementCode: req.requirement_code },
    });

    return newResponse;
  },

  updateDonorBloodResponseStatus(responseId, newStatus, meta = {}, hospitalId = null) {
    const idx = donorResponsesCache.findIndex(r => r.id === responseId || r.response_code === responseId);
    if (idx === -1) return null;

    const resp = donorResponsesCache[idx];

    // Hospital authorization check
    if (hospitalId && resp.hospital_id !== hospitalId) {
      throw new Error('Unauthorized: Hospital can only manage responses to its own requirements.');
    }

    const validStatuses = [
      'PENDING_HOSPITAL_RESPONSE',
      'ACCEPTED_BY_HOSPITAL',
      'DECLINED_BY_HOSPITAL',
      'DONATION_SCHEDULED',
      'DONATION_COMPLETED',
      'CANCELLED',
      'CANCELLED_BY_DONOR',
      'EXPIRED',
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid response status: ${newStatus}`);
    }

    const now = new Date().toISOString();
    resp.status = newStatus;
    resp.updated_at = now;

    if (newStatus === 'ACCEPTED_BY_HOSPITAL') {
      resp.hospital_response_at = now;

      // Increment confirmed units on parent requirement
      const req = hospitalRequirementsCache.find(r => r.id === resp.requirement_id);
      if (req) {
        req.units_confirmed = (req.units_confirmed || 0) + 1;
        if (req.units_confirmed >= req.units_required) {
          req.status = 'FULFILLED';
        } else {
          req.status = 'PARTIALLY_FULFILLED';
        }
        req.updated_at = now;
        writeJsonFile(HOSPITAL_REQUIREMENTS_FILE, hospitalRequirementsCache);

        if (req.status === 'FULFILLED') {
          this.addBombayAuditLog({
            requestId: req.id,
            actorId: hospitalId || 'hospital',
            hospitalId: req.hospital_id,
            action: 'requirement_fulfilled',
            result: 'SUCCESS',
            metadata: { unitsConfirmed: req.units_confirmed, unitsRequired: req.units_required },
          });
        }
      }

      this.addBombayAuditLog({
        requestId: resp.requirement_id,
        actorId: hospitalId || 'hospital',
        hospitalId: resp.hospital_id,
        action: 'donor_response_accepted',
        result: 'SUCCESS',
        metadata: { responseId, responseCode: resp.response_code },
      });
    } else if (newStatus === 'DECLINED_BY_HOSPITAL') {
      resp.hospital_response_at = now;
      this.addBombayAuditLog({
        requestId: resp.requirement_id,
        actorId: hospitalId || 'hospital',
        hospitalId: resp.hospital_id,
        action: 'donor_response_declined',
        result: 'SUCCESS',
        metadata: { responseId, reason: meta.reason || 'Capacity reached' },
      });
    } else if (newStatus === 'DONATION_SCHEDULED') {
      resp.scheduled_at = meta.scheduledAt || meta.scheduled_at || now;
      this.addBombayAuditLog({
        requestId: resp.requirement_id,
        actorId: hospitalId || 'hospital',
        hospitalId: resp.hospital_id,
        action: 'donation_scheduled',
        result: 'SUCCESS',
        metadata: { responseId, scheduledAt: resp.scheduled_at },
      });
    } else if (newStatus === 'DONATION_COMPLETED') {
      resp.completed_at = now;

      // Update parent requirement units_fulfilled
      const req = hospitalRequirementsCache.find(r => r.id === resp.requirement_id);
      if (req) {
        req.units_fulfilled = (req.units_fulfilled || 0) + 1;
        if (req.units_fulfilled >= req.units_required) {
          req.status = 'FULFILLED';
        }
        req.updated_at = now;
        writeJsonFile(HOSPITAL_REQUIREMENTS_FILE, hospitalRequirementsCache);
      }

      // Update donor total donations in cache if found
      const donorObj = donorsCache.find(d => d.id === resp.donor_id || d.user_id === resp.donor_id);
      if (donorObj) {
        donorObj.total_donations = (donorObj.total_donations || 0) + 1;
        donorObj.last_donation_date = now.split('T')[0];
        donorObj.updated_at = now;
        writeJsonFile(DONORS_FILE, donorsCache);
      }

      this.addBombayAuditLog({
        requestId: resp.requirement_id,
        actorId: hospitalId || 'hospital',
        hospitalId: resp.hospital_id,
        action: 'donation_completed',
        result: 'SUCCESS',
        metadata: { responseId, completedAt: now },
      });
    } else if (newStatus === 'CANCELLED' || newStatus === 'CANCELLED_BY_DONOR') {
      this.addBombayAuditLog({
        requestId: resp.requirement_id,
        actorId: resp.donor_id,
        hospitalId: resp.hospital_id,
        action: 'donor_response_cancelled',
        result: 'SUCCESS',
        metadata: { responseId },
      });
    }

    writeJsonFile(DONOR_RESPONSES_FILE, donorResponsesCache);
    return resp;
  },

  // -------------------------------------------------------------------------
  // SECURE APPROVAL TOKENS (EMAIL ONE-CLICK APPROVE/DECLINE)
  // -------------------------------------------------------------------------
  createApprovalToken({
    responseId,
    requirementId,
    hospitalId,
    hospitalEmail,
    donorId,
    donorEmail,
    donorName,
    action = 'APPROVE',
    expiresInHours = 168, // 7 days
  }) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 3600000).toISOString();

    const tokenRecord = {
      id: `appr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      token: rawToken,
      token_hash: tokenHash,
      action: String(action || 'APPROVE').toUpperCase(),
      donation_response_id: responseId,
      blood_requirement_id: requirementId,
      hospital_id: hospitalId,
      hospital_email: hospitalEmail || '',
      donor_id: donorId || '',
      donor_email: donorEmail || '',
      donor_name: donorName || '',
      status: 'ACTIVE',
      created_at: now.toISOString(),
      expires_at: expiresAt,
      used_at: null,
    };

    approvalTokensCache.push(tokenRecord);
    writeJsonFile(APPROVAL_TOKENS_FILE, approvalTokensCache);

    return { token: rawToken, tokenRecord };
  },

  findApprovalToken(tokenStr) {
    if (!tokenStr || typeof tokenStr !== 'string') return null;
    const cleanToken = tokenStr.trim();
    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');

    return (
      approvalTokensCache.find(
        (t) => t.token === cleanToken || t.token_hash === tokenHash || t.token_hash === cleanToken
      ) || null
    );
  },

  markApprovalTokenUsed(tokenId) {
    const token = approvalTokensCache.find((t) => t.id === tokenId);
    if (!token) return null;

    token.status = 'USED';
    token.used_at = new Date().toISOString();
    writeJsonFile(APPROVAL_TOKENS_FILE, approvalTokensCache);
    return token;
  },

  getApprovalTokens() {
    return [...approvalTokensCache];
  },

  // --- AUTHORIZED ADMINISTRATOR ROSTER ---
  getAdminAccounts() {
    return [...adminAccountsCache];
  },

  findAdminAccountByIdentifier(identifier) {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    const usernamePart = clean.includes('@') ? clean.split('@')[0] : clean;

    return (
      adminAccountsCache.find(
        (a) =>
          a.username.toLowerCase() === clean ||
          a.username.toLowerCase() === usernamePart ||
          a.email.toLowerCase() === clean
      ) || null
    );
  },

  verifyAdminCredentials(identifier, password) {
    const admin = this.findAdminAccountByIdentifier(identifier);
    if (!admin) {
      return { valid: false, reason: 'Admin account not found in authorized roster' };
    }
    const cleanPassword = String(password || '').trim();
    if (admin.password !== cleanPassword) {
      return { valid: false, reason: 'Incorrect administrator password' };
    }
    return { valid: true, admin };
  },
};

