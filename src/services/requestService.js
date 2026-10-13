import { initialRequests } from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { db, isFirebaseConfigured } from '../lib/firebaseClient';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { getStoredDonors } from './donorService';
import { getDonorEligibility } from './eligibilityService';
import { addNotification, NOTIFICATION_TYPES } from './notificationService';
import { isBloodCompatible, getCompatibleDonorBloodGroups } from './compatibilityService';

const REQUESTS_STORAGE_KEY = 'bloodbridge_requests_store';
const DONATION_REQUESTS_STORAGE_KEY = 'bloodbridge_direct_donation_requests_store';

export const REQUEST_STATUS = {
  PENDING: 'PENDING',
  MATCHING: 'MATCHING',
  DONOR_CONTACTED: 'DONOR_CONTACTED',
  DONOR_ACCEPTED: 'DONOR_ACCEPTED',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  // Backward-compatibility aliases
  OPEN: 'Open',
  ACCEPTED: 'DONOR_ACCEPTED',
  DECLINED: 'CANCELLED',
  COMPLETED: 'FULFILLED',
};

export const mapDatabaseRequest = (r) => {
  const reqEmail = r.requester_email || r.requesterEmail || r.email || r.contact_email || r.contactEmail || '';
  return {
    id: r.id,
    requestCode: r.request_code || r.requestCode || r.id,
    code: r.request_code || r.requestCode || r.id,
    requesterId: r.requester_id || r.requesterId,
    requesterName: r.requester_name || r.requesterName || r.patient_name || r.patientName,
    requesterPhone: r.requester_phone || r.requesterPhone || r.contact_number,
    requesterEmail: reqEmail,
    email: reqEmail,
    contactEmail: reqEmail,
    patient: r.patient_name || r.patient,
    patientName: r.patient_name || r.patientName,
    bloodGroup: r.blood_group || r.bloodGroup,
    units: r.units_required || r.required_units || r.units || 1,
    requiredUnits: r.units_required || r.required_units || r.units || 1,
    unitsRequired: r.units_required || r.required_units || r.units || 1,
    hospital: r.hospital_name || r.hospital,
    hospitalName: r.hospital_name || r.hospitalName,
    hospitalLocation: r.hospital_location || r.hospitalAddress || r.hospital_address || '',
    hospitalAddress: r.hospital_location || r.hospital_address || r.hospitalAddress || '',
    city: r.city || r.district || 'Karur',
    district: r.district || r.city || 'Karur',
    state: r.state || 'Tamil Nadu',
    hospitalContact: r.hospital_contact || r.contact_number,
    contactPerson: r.requester_name || r.patient_name || r.contactPerson,
    contactPhone: r.contact_number || r.contactPhone,
    contactNumber: r.contact_number || r.contactNumber,
    urgency: r.urgency || (r.emergency_level === 'Critical' ? 'Emergency' : r.emergency_level) || 'Urgent',
    emergencyLevel: r.emergency_level || (r.urgency === 'Emergency' ? 'Critical' : r.urgency) || 'Critical',
    requiredDate: r.required_date || r.requiredDate || 'Immediately',
    reason: r.reason || r.additional_message || r.additionalMessage || '',
    additionalMessage: r.reason || r.additional_message || r.additionalMessage || '',
    documentUrl: r.document_url || r.documentUrl || null,
    status: r.status || 'PENDING',
    createdAt: (r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : r.createdAt) || (r.created_at?.toDate ? r.created_at.toDate().toISOString() : r.created_at) || new Date().toISOString(),
    updatedAt: (r.updatedAt?.toDate ? r.updatedAt.toDate().toISOString() : r.updatedAt) || (r.updated_at?.toDate ? r.updated_at.toDate().toISOString() : r.updated_at) || new Date().toISOString(),
  };
};

export const getStoredRequests = () => {
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading requests:', e);
  }
  return initialRequests.map((r) => ({
    ...r,
    requestCode: r.requestCode || r.id,
    requesterEmail: r.requesterEmail || r.contactEmail || r.email || '',
    email: r.requesterEmail || r.contactEmail || r.email || '',
    contactEmail: r.requesterEmail || r.contactEmail || r.email || '',
    urgency: r.urgency || (r.emergencyLevel === 'Critical' ? 'Emergency' : 'Urgent'),
    status: r.status === 'Fulfilled' || r.status === 'Cancelled' ? r.status : 'MATCHING',
  }));
};

export const saveStoredRequests = (requests) => {
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.warn('Error saving requests:', e);
  }
};

export const getStoredDirectDonationRequests = () => {
  try {
    const raw = localStorage.getItem(DONATION_REQUESTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading direct donation requests:', e);
  }
  return [
    {
      id: 'dreq-501',
      donorId: 'd-101',
      donorName: 'Arun Kumar',
      donorBloodGroup: 'A+',
      patientName: 'Rajesh Kannan',
      hospital: 'Apollo Speciality Hospital, Karur',
      city: 'Karur',
      requesterPhone: '+91 98765 43210',
      urgency: 'Immediate',
      note: 'Urgent cardiac bypass surgery. Donor matched in Karur district.',
      status: 'Open',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'dreq-502',
      donorId: 'd-102',
      donorName: 'Sanjay Raj',
      donorBloodGroup: 'O+',
      patientName: 'Master Kavin',
      hospital: 'Government Medical College Hospital, Karur',
      city: 'Karur',
      requesterPhone: '+91 97890 55443',
      urgency: 'Urgent',
      note: 'Pediatric emergency. Platelets and whole blood needed.',
      status: 'Open',
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    }
  ];
};

export const saveStoredDirectDonationRequests = (requests) => {
  try {
    localStorage.setItem(DONATION_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.warn('Error saving direct donation requests:', e);
  }
};

/**
 * Fetch all requests created by a specific user.
 * Queries Google Cloud Firestore, then Vite Backend API, Supabase, with localStorage fallback.
 */
export const getUserBloodRequests = async (userId) => {
  // 1. Try Google Cloud Firestore
  if (isFirebaseConfigured() && db) {
    try {
      let q;
      if (userId) {
        q = query(collection(db, 'blood_requests'), where('requesterId', '==', userId));
      } else {
        q = collection(db, 'blood_requests');
      }
      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestoreList = snap.docs.map((d) => mapDatabaseRequest({ id: d.id, ...d.data() }));
        firestoreList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return firestoreList;
      }
    } catch (e) {
      console.warn('getUserBloodRequests Firestore error:', e);
    }
  }

  // 2. Try Vite Backend REST API
  try {
    const res = await fetch(`/api/blood-requests?userId=${encodeURIComponent(userId || '')}`);
    if (res.ok) {
      const data = await res.json();
      if (data.requests && data.requests.length > 0) {
        return data.requests.map(mapDatabaseRequest);
      }
    }
  } catch (e) {
    // API offline or vite fallback
  }

  // 3. Try Supabase
  if (isSupabaseConfigured() && userId) {
    try {
      const { data, error } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(mapDatabaseRequest);
      }
    } catch (e) {
      console.warn('getUserBloodRequests Supabase error:', e);
    }
  }

  // 4. Fallback to local storage
  const stored = getStoredRequests();
  return stored.filter((r) => r.requesterId === userId || !r.requesterId).map(mapDatabaseRequest);
};

/**
 * Fetch all open/active blood requests for emergency feeds and dashboards.
 */
export const getOpenBloodRequests = async (filters = {}) => {
  // 1. Try Google Cloud Firestore
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDocs(collection(db, 'blood_requests'));
      if (!snap.empty) {
        let results = snap.docs.map((d) => mapDatabaseRequest({ id: d.id, ...d.data() }));

        if (filters.status) {
          results = results.filter((r) => r.status === filters.status);
        } else {
          results = results.filter((r) => ['PENDING', 'MATCHING', 'DONOR_CONTACTED', 'DONOR_ACCEPTED', 'Open'].includes(r.status));
        }

        if (filters.bloodGroup && filters.bloodGroup !== 'All Groups') {
          results = results.filter((r) => r.bloodGroup === filters.bloodGroup);
        }

        if (filters.city && filters.city !== 'All Cities' && filters.city !== 'All Districts') {
          const qLoc = filters.city.toLowerCase();
          results = results.filter((r) =>
            (r.city || '').toLowerCase().includes(qLoc) ||
            (r.district || '').toLowerCase().includes(qLoc)
          );
        }

        results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return results;
      }
    } catch (e) {
      console.warn('getOpenBloodRequests Firestore error:', e);
    }
  }

  // 2. Try Backend API
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.urgency) params.append('urgency', filters.urgency);
    if (filters.bloodGroup && filters.bloodGroup !== 'All Groups') params.append('bloodGroup', filters.bloodGroup);
    if (filters.city && filters.city !== 'All Cities' && filters.city !== 'All Districts') params.append('district', filters.city);

    const res = await fetch(`/api/blood-requests?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.requests && data.requests.length > 0) {
        return data.requests.map(mapDatabaseRequest);
      }
    }
  } catch (e) {
    // API offline fallback
  }

  // 3. Try Supabase
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('blood_requests').select('*');

      if (filters.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.in('status', ['PENDING', 'MATCHING', 'DONOR_CONTACTED', 'DONOR_ACCEPTED', 'Open']);
      }

      if (filters.bloodGroup && filters.bloodGroup !== 'All Groups') {
        query = query.eq('blood_group', filters.bloodGroup);
      }

      if (filters.city && filters.city !== 'All Cities' && filters.city !== 'All Districts') {
        query = query.or(`city.ilike.%${filters.city}%,district.ilike.%${filters.city}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(mapDatabaseRequest);
      }
    } catch (e) {
      console.warn('getOpenBloodRequests Supabase error:', e);
    }
  }

  // 4. Fallback to localStorage
  const stored = getStoredRequests();
  return stored.map(mapDatabaseRequest);
};

/**
 * Fetch detailed request information, including matched donors and timeline.
 */
export const getBloodRequestDetails = async (codeOrId) => {
  // 1. Try Google Cloud Firestore
  if (isFirebaseConfigured() && db) {
    try {
      // By Firestore document ID
      try {
        const docRef = doc(db, 'blood_requests', codeOrId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const mapped = mapDatabaseRequest({ id: docSnap.id, ...docSnap.data() });
          return {
            request: mapped,
            matches: [],
            timeline: [
              { step: 1, title: 'Request Created', status: 'COMPLETED', date: mapped.createdAt },
              { step: 2, title: 'Matching Donors', status: 'CURRENT' },
              { step: 3, title: 'Donor Contacted', status: 'UPCOMING' },
              { step: 4, title: 'Donor Accepted', status: 'UPCOMING' },
              { step: 5, title: 'Fulfilled', status: 'UPCOMING' },
            ],
          };
        }
      } catch (docErr) {
        // Continue to query by requestCode
      }

      // By requestCode
      const q = query(collection(db, 'blood_requests'), where('requestCode', '==', codeOrId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const d = qSnap.docs[0];
        const mapped = mapDatabaseRequest({ id: d.id, ...d.data() });
        return {
          request: mapped,
          matches: [],
          timeline: [
            { step: 1, title: 'Request Created', status: 'COMPLETED', date: mapped.createdAt },
            { step: 2, title: 'Matching Donors', status: 'CURRENT' },
            { step: 3, title: 'Donor Contacted', status: 'UPCOMING' },
            { step: 4, title: 'Donor Accepted', status: 'UPCOMING' },
            { step: 5, title: 'Fulfilled', status: 'UPCOMING' },
          ],
        };
      }
    } catch (e) {
      console.warn('getBloodRequestDetails Firestore error:', e);
    }
  }

  // 2. Try Backend API
  try {
    const res = await fetch(`/api/blood-requests/${encodeURIComponent(codeOrId)}`);
    if (res.ok) {
      const data = await res.json();
      return {
        request: mapDatabaseRequest(data.request),
        matches: data.matches || [],
        timeline: data.timeline || [],
      };
    }
  } catch (e) {
    console.warn('getBloodRequestDetails backend fetch error:', e);
  }

  // 3. Fallback: lookup in localStorage
  const stored = getStoredRequests();
  const found = stored.find((r) => r.id === codeOrId || r.requestCode === codeOrId);
  if (!found) return null;

  const mapped = mapDatabaseRequest(found);
  return {
    request: mapped,
    matches: [],
    timeline: [
      { step: 1, title: 'Request Created', status: 'COMPLETED', date: mapped.createdAt },
      { step: 2, title: 'Matching Donors', status: 'CURRENT' },
      { step: 3, title: 'Donor Contacted', status: 'UPCOMING' },
      { step: 4, title: 'Donor Accepted', status: 'UPCOMING' },
      { step: 5, title: 'Fulfilled', status: 'UPCOMING' },
    ],
  };
};

/**
 * Creates a comprehensive Blood Request with unique Request Code (BR-2026-XXXXXX).
 */
export const createBloodRequest = async (formData, userId = null) => {
  // Check Bombay Blood Group
  const bg = formData.bloodGroup;
  if (bg === 'Bombay Blood Group (Oh)' || bg === 'Oh' || bg?.toLowerCase().includes('bombay')) {
    throw new Error('Bombay Blood Group (Oh) requires verified hospital protocol. Please use the Bombay Blood Access portal.');
  }

  let createdReq = null;
  const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
  const requestCode = `BR-2026-${randomHex}`;
  const nowIso = new Date().toISOString();

  const cleanEmail = (formData.requesterEmail || formData.email || formData.contactEmail || '').trim();
  if (!cleanEmail) {
    throw new Error('Email address is mandatory for blood request notifications and coordination.');
  }

  // 1. Save directly to Google Cloud Firestore
  if (isFirebaseConfigured() && db) {
    try {
      const firestoreRecord = {
        requestCode,
        request_code: requestCode,
        code: requestCode,
        requesterId: userId || null,
        requester_id: userId || null,
        requesterName: formData.requesterName || formData.patientName || '',
        requesterPhone: formData.contactPhone || formData.requesterPhone || '',
        requesterEmail: cleanEmail,
        requester_email: cleanEmail,
        email: cleanEmail,
        contactEmail: cleanEmail,
        patient: formData.patientName?.trim() || '',
        patientName: formData.patientName?.trim() || '',
        patient_name: formData.patientName?.trim() || '',
        bloodGroup: formData.bloodGroup,
        blood_group: formData.bloodGroup,
        units: parseInt(formData.unitsRequired || formData.units, 10) || 1,
        unitsRequired: parseInt(formData.unitsRequired || formData.units, 10) || 1,
        requiredUnits: parseInt(formData.unitsRequired || formData.units, 10) || 1,
        units_required: parseInt(formData.unitsRequired || formData.units, 10) || 1,
        required_units: parseInt(formData.unitsRequired || formData.units, 10) || 1,
        hospital: formData.hospitalName?.trim() || '',
        hospitalName: formData.hospitalName?.trim() || '',
        hospital_name: formData.hospitalName?.trim() || '',
        hospitalLocation: formData.hospitalLocation?.trim() || formData.hospitalAddress?.trim() || '',
        hospitalAddress: formData.hospitalLocation?.trim() || formData.hospitalAddress?.trim() || '',
        hospital_location: formData.hospitalLocation?.trim() || formData.hospitalAddress?.trim() || '',
        hospital_address: formData.hospitalLocation?.trim() || formData.hospitalAddress?.trim() || '',
        city: formData.city || formData.district || 'Karur',
        district: formData.district || formData.city || 'Karur',
        state: formData.state || 'Tamil Nadu',
        hospitalContact: formData.hospitalContact?.trim() || formData.contactPhone?.trim() || '',
        hospital_contact: formData.hospitalContact?.trim() || formData.contactPhone?.trim() || '',
        contactPerson: formData.contactPerson || formData.patientName || '',
        contactPhone: formData.contactPhone?.trim() || formData.hospitalContact?.trim() || '',
        contactNumber: formData.contactPhone?.trim() || formData.hospitalContact?.trim() || '',
        contact_number: formData.contactPhone?.trim() || formData.hospitalContact?.trim() || '',
        requiredDate: formData.requiredDate || 'Immediately',
        required_date: formData.requiredDate || 'Immediately',
        urgency: formData.urgency || 'Urgent',
        emergencyLevel: formData.urgency === 'Emergency' ? 'Critical' : (formData.emergencyLevel || 'Critical'),
        emergency_level: formData.urgency === 'Emergency' ? 'Critical' : (formData.emergencyLevel || 'Critical'),
        reason: formData.reason?.trim() || formData.additionalMessage?.trim() || '',
        additionalMessage: formData.reason?.trim() || formData.additionalMessage?.trim() || '',
        documentUrl: formData.documentUrl || null,
        document_url: formData.documentUrl || null,
        status: 'MATCHING',
        createdAt: nowIso,
        created_at: nowIso,
        updatedAt: nowIso,
        updated_at: nowIso,
      };

      const docRef = await addDoc(collection(db, 'blood_requests'), firestoreRecord);
      createdReq = mapDatabaseRequest({ id: docRef.id, ...firestoreRecord });
    } catch (e) {
      console.warn('Google Cloud Firestore save error:', e);
    }
  }

  // 2. Dispatch to Backend API for automatic donor matching & server cache
  try {
    const res = await fetch('/api/blood-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        requesterEmail: cleanEmail,
        email: cleanEmail,
        contactEmail: cleanEmail,
        requestCode: createdReq?.requestCode || requestCode,
        requesterId: userId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.request && !createdReq) {
        createdReq = mapDatabaseRequest(data.request);
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.message && !createdReq) throw new Error(errData.message);
    }
  } catch (err) {
    if (err.message && !err.message.includes('fetch') && !createdReq) {
      throw err;
    }
  }

  // 3. Try Supabase direct if neither Firestore nor Backend responded
  if (!createdReq && isSupabaseConfigured()) {
    try {
      const dbRecord = {
        request_code: requestCode,
        requester_id: userId || null,
        patient_name: formData.patientName.trim(),
        blood_group: formData.bloodGroup,
        units_required: parseInt(formData.unitsRequired || formData.units, 10) || 1,
        required_units: parseInt(formData.unitsRequired || formData.units, 10) || 1,
        hospital_name: formData.hospitalName.trim(),
        hospital_location: formData.hospitalLocation?.trim() || formData.hospitalAddress?.trim() || '',
        hospital_address: formData.hospitalLocation?.trim() || formData.hospitalAddress?.trim() || '',
        city: formData.city || 'Karur',
        district: formData.district || formData.city || 'Karur',
        state: formData.state || 'Tamil Nadu',
        hospital_contact: formData.hospitalContact?.trim() || formData.contactPhone?.trim() || '',
        contact_number: formData.contactPhone?.trim() || formData.hospitalContact?.trim() || '',
        requester_email: cleanEmail,
        email: cleanEmail,
        required_date: formData.requiredDate || 'Immediately',
        urgency: formData.urgency || 'Urgent',
        emergency_level: formData.urgency === 'Emergency' ? 'Critical' : (formData.emergencyLevel || 'Critical'),
        reason: formData.reason?.trim() || formData.additionalMessage?.trim() || '',
        additional_message: formData.reason?.trim() || formData.additionalMessage?.trim() || '',
        status: 'MATCHING',
      };

      const { data, error } = await supabase.from('blood_requests').insert(dbRecord).select().single();
      if (!error && data) {
        createdReq = mapDatabaseRequest(data);
      }
    } catch (e) {
      console.warn('Supabase fallback create error:', e);
    }
  }

  // 3. Fallback to localStorage
  if (!createdReq) {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const requestCode = `BR-2026-${randomHex}`;
    createdReq = {
      id: `req-${Date.now().toString().slice(-6)}`,
      requestCode,
      code: requestCode,
      requesterId: userId,
      requesterName: formData.requesterName || formData.patientName,
      requesterPhone: formData.contactPhone || formData.requesterPhone,
      requesterEmail: cleanEmail,
      requester_email: cleanEmail,
      email: cleanEmail,
      contactEmail: cleanEmail,
      patient: formData.patientName,
      patientName: formData.patientName,
      bloodGroup: formData.bloodGroup,
      units: parseInt(formData.unitsRequired || formData.units, 10) || 1,
      requiredUnits: parseInt(formData.unitsRequired || formData.units, 10) || 1,
      unitsRequired: parseInt(formData.unitsRequired || formData.units, 10) || 1,
      hospital: formData.hospitalName,
      hospitalName: formData.hospitalName,
      hospitalLocation: formData.hospitalLocation || formData.hospitalAddress || '',
      hospitalAddress: formData.hospitalLocation || formData.hospitalAddress || '',
      city: formData.city || 'Karur',
      district: formData.district || formData.city || 'Karur',
      state: formData.state || 'Tamil Nadu',
      hospitalContact: formData.hospitalContact || formData.contactPhone,
      contactPerson: formData.contactPerson || formData.patientName,
      contactPhone: formData.contactPhone,
      contactNumber: formData.contactPhone,
      urgency: formData.urgency || 'Urgent',
      emergencyLevel: formData.urgency === 'Emergency' ? 'Critical' : (formData.emergencyLevel || 'Critical'),
      requiredDate: formData.requiredDate || 'Immediately',
      reason: formData.reason || formData.additionalMessage || '',
      additionalMessage: formData.reason || formData.additionalMessage || '',
      documentUrl: formData.documentUrl || null,
      status: 'MATCHING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Cache in local store
  const current = getStoredRequests();
  saveStoredRequests([createdReq, ...current]);

  // Dispatch in-app notification
  addNotification({
    type: NOTIFICATION_TYPES.EMERGENCY_REQUEST_NEARBY,
    title: `${createdReq.urgency === 'Emergency' ? '🚨 Emergency' : 'New'} ${createdReq.bloodGroup} Blood Request #${createdReq.requestCode}`,
    message: `${createdReq.units} units of ${createdReq.bloodGroup} requested at ${createdReq.hospital} (${createdReq.district}). Donors are being matched.`,
    targetRole: 'USER',
    actionLink: '/my-requests',
    metadata: { requestId: createdReq.id, requestCode: createdReq.requestCode, bloodGroup: createdReq.bloodGroup, district: createdReq.district },
  });

  return createdReq;
};

/**
 * Backward-compatible wrapper for emergency request submission.
 */
export const createEmergencyRequest = async (formData, userId = null) => {
  return createBloodRequest({
    ...formData,
    urgency: formData.urgency || 'Emergency',
    emergencyLevel: 'Critical',
  }, userId);
};

/**
 * Cancels an active blood request.
 */
export const cancelBloodRequest = async (requestId) => {
  return updateBloodRequestStatus(requestId, 'CANCELLED');
};

/**
 * Requests contact with a matched donor.
 */
export const requestDonorContact = async (requestId, donorId, matchId = null) => {
  try {
    const res = await fetch(`/api/blood-requests/${encodeURIComponent(requestId)}/request-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donorId, matchId }),
    });
    if (res.ok) {
      addNotification({
        type: NOTIFICATION_TYPES.NEW_DONATION_REQUEST,
        title: 'Donation Contact Dispatched',
        message: 'A donation connection alert was sent to the donor.',
        targetRole: 'USER',
        actionLink: '/donor-dashboard',
      });
      return await res.json();
    }
  } catch (e) {
    console.warn('requestDonorContact error:', e);
  }
  return { success: true };
};

/**
 * Matched donor accepts or declines a request.
 */
export const respondToDonorMatch = async (matchId, response) => {
  try {
    const res = await fetch(`/api/blood-requests/matches/${encodeURIComponent(matchId)}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    });
    if (res.ok) {
      const data = await res.json();
      const isAccepted = response === 'ACCEPT' || response === 'ACCEPTED';
      addNotification({
        type: isAccepted ? NOTIFICATION_TYPES.REQUEST_ACCEPTED : NOTIFICATION_TYPES.REQUEST_DECLINED,
        title: isAccepted ? 'Blood Request Accepted! 🎉' : 'Donor Status Update',
        message: isAccepted
          ? 'A voluntary donor has ACCEPTED your blood request. Contact details unlocked.'
          : 'A donor was unavailable. We are continuing the search in your area.',
        targetRole: 'USER',
        actionLink: '/my-requests',
      });
      return data;
    }
  } catch (e) {
    console.warn('respondToDonorMatch error:', e);
  }
  return { success: false };
};

/**
 * Get matches for a specific donor.
 */
export const getDonorMatches = async (donorId) => {
  try {
    const res = await fetch(`/api/blood-requests/donor/matches?donorId=${encodeURIComponent(donorId)}`);
    if (res.ok) {
      const data = await res.json();
      return data.matches || [];
    }
  } catch (e) {
    console.warn('getDonorMatches error:', e);
  }
  return [];
};

/**
 * Updates blood request status in Backend API, Supabase, and localStorage.
 */
export const updateBloodRequestStatus = async (requestId, newStatus) => {
  // 1. Try Backend API
  try {
    await fetch(`/api/blood-requests/${encodeURIComponent(requestId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  } catch (e) {
    // Fallback
  }

  // 2. Try Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('blood_requests')
        .update({ status: newStatus })
        .eq('id', requestId);
    } catch (e) {
      console.warn('updateBloodRequestStatus remote error:', e);
    }
  }

  // 3. Sync localStorage
  const current = getStoredRequests();
  const updated = current.map((r) => {
    if (r.id === requestId || r.requestCode === requestId) {
      return { ...r, status: newStatus };
    }
    return r;
  });
  saveStoredRequests(updated);
  return updated;
};

/**
 * Secure Direct Donation Request Flow.
 */
export const createDirectDonationRequest = async (requestData) => {
  const directRequests = getStoredDirectDonationRequests();

  const newDirectReq = {
    id: `dreq-${Date.now().toString().slice(-6)}`,
    donorId: requestData.donorId,
    donorName: requestData.donorName,
    donorBloodGroup: requestData.donorBloodGroup,
    patientName: requestData.patientName.trim(),
    hospital: requestData.hospital.trim(),
    city: requestData.city || 'Karur',
    requesterPhone: requestData.phone?.trim() || '',
    requesterEmail: requestData.email?.trim() || requestData.requesterEmail?.trim() || '',
    email: requestData.email?.trim() || requestData.requesterEmail?.trim() || '',
    urgency: requestData.urgency || 'Immediate',
    note: requestData.note?.trim() || '',
    status: 'Open',
    createdAt: new Date().toISOString(),
  };

  const updated = [newDirectReq, ...directRequests];
  saveStoredDirectDonationRequests(updated);

  addNotification({
    type: NOTIFICATION_TYPES.NEW_DONATION_REQUEST,
    title: 'New Donation Connection Request',
    message: `Patient ${newDirectReq.patientName} at ${newDirectReq.hospital} has requested blood connection with you.`,
    targetRole: 'USER',
    actionLink: '/donor-dashboard?tab=requests',
    metadata: { requestId: newDirectReq.id, donorId: newDirectReq.donorId },
  });

  return newDirectReq;
};

/**
 * Donor accepts or declines a connection request.
 */
export const updateDonationRequestStatus = (requestId, newStatus) => {
  const directRequests = getStoredDirectDonationRequests();
  let targetReq = null;

  const updated = directRequests.map((r) => {
    if (r.id === requestId) {
      targetReq = { ...r, status: newStatus };
      return targetReq;
    }
    return r;
  });

  saveStoredDirectDonationRequests(updated);

  if (targetReq) {
    if (newStatus === REQUEST_STATUS.ACCEPTED || newStatus === 'Fulfilled') {
      addNotification({
        type: NOTIFICATION_TYPES.REQUEST_ACCEPTED,
        title: 'Donation Request Accepted! 🎉',
        message: `${targetReq.donorName} (${targetReq.donorBloodGroup}) has ACCEPTED the connection for patient ${targetReq.patientName}. Direct medical coordination is now approved.`,
        targetRole: 'USER',
        actionLink: '/find-blood',
        metadata: { requestId: targetReq.id },
      });
    } else if (newStatus === REQUEST_STATUS.DECLINED || newStatus === 'Cancelled') {
      addNotification({
        type: NOTIFICATION_TYPES.REQUEST_DECLINED,
        title: 'Donation Request Status Updated',
        message: `A donor was unavailable for patient ${targetReq.patientName}. System is matching alternative donors in region.`,
        targetRole: 'USER',
        actionLink: '/find-blood',
        metadata: { requestId: targetReq.id },
      });
    }
  }

  return updated;
};
