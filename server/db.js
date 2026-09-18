import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const HOSPITALS_FILE = path.join(DATA_DIR, 'hospitals.json');
const DONORS_FILE = path.join(DATA_DIR, 'donors.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'blood_requests.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'hospital_sessions.json');

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
let sessionsCache = readJsonFile(SESSIONS_FILE, []);

export const db = {
  // --- HOSPITALS ---
  getHospitals() {
    return hospitalsCache;
  },

  findHospitalById(id) {
    return hospitalsCache.find(h => h.id === id);
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

  // --- BLOOD REQUESTS ---
  getBloodRequests() {
    return requestsCache;
  },

  getHospitalBloodRequests(hospitalId) {
    return requestsCache.filter(r => r.hospital_id === hospitalId);
  },

  createBloodRequest({ hospitalId, hospitalName, district, bloodGroup, unitsRequired, urgency, requiredDate, notes }) {
    const newRequest = {
      id: `br-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      hospital_id: hospitalId, // Strictly bound from authenticated token
      hospital_name: hospitalName,
      district: district,
      blood_group: bloodGroup,
      units_required: Number(unitsRequired) || 1,
      urgency: urgency || 'Normal',
      required_date: requiredDate || new Date().toISOString().split('T')[0],
      notes: notes || '',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    requestsCache.unshift(newRequest);
    writeJsonFile(REQUESTS_FILE, requestsCache);
    return newRequest;
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
  }
};
