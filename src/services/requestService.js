import { initialRequests } from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getStoredDonors } from './donorService';
import { getDonorEligibility } from './eligibilityService';
import { addNotification, NOTIFICATION_TYPES } from './notificationService';
import { isBloodCompatible, getCompatibleDonorBloodGroups } from './compatibilityService';

const REQUESTS_STORAGE_KEY = 'bloodbridge_requests_store';
const DONATION_REQUESTS_STORAGE_KEY = 'bloodbridge_direct_donation_requests_store';

export const REQUEST_STATUS = {
  OPEN: 'Open',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
  // Backward-compatibility aliases
  PENDING: 'Open',
  ACCEPTED: 'Fulfilled',
  DECLINED: 'Cancelled',
  COMPLETED: 'Fulfilled',
};

const mapDatabaseRequest = (r) => ({
  id: r.id,
  requesterId: r.requester_id,
  patient: r.patient_name,
  patientName: r.patient_name,
  bloodGroup: r.blood_group,
  units: r.required_units,
  requiredUnits: r.required_units,
  hospital: r.hospital_name,
  hospitalName: r.hospital_name,
  hospitalAddress: r.hospital_address || '',
  city: r.city || r.district || 'Karur',
  district: r.district || r.city || 'Karur',
  state: r.state || 'Tamil Nadu',
  contactPerson: r.patient_name,
  contactPhone: r.contact_number,
  contactNumber: r.contact_number,
  emergencyLevel: r.emergency_level || 'Critical',
  requiredDate: r.required_date || 'Immediately',
  additionalMessage: r.additional_message || '',
  status: r.status || 'Open',
  createdAt: r.created_at,
});

export const getStoredRequests = () => {
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading requests:', e);
  }
  return initialRequests.map((r) => ({
    ...r,
    status: r.status === 'Fulfilled' || r.status === 'Cancelled' ? r.status : 'Open',
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
 * Fetch all requests created by a specific user from Supabase.
 */
export const getUserBloodRequests = async (userId) => {
  if (isSupabaseConfigured() && userId) {
    try {
      const { data, error } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(mapDatabaseRequest);
      }
    } catch (e) {
      console.warn('getUserBloodRequests Supabase error:', e);
    }
  }

  // Fallback to local storage
  const stored = getStoredRequests();
  return stored.filter((r) => r.requesterId === userId || !r.requesterId);
};

/**
 * Fetch all open blood requests for emergency feeds and dashboards.
 */
export const getOpenBloodRequests = async (filters = {}) => {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('blood_requests').select('*');

      if (filters.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.eq('status', 'Open');
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

  return getStoredRequests();
};

/**
 * Intelligent Emergency Matching Algorithm using Blood Compatibility Logic.
 */
export const matchDonorsForEmergency = (emergencyRequest) => {
  const donors = getStoredDonors();
  const reqGroup = emergencyRequest.bloodGroup;
  const reqDistrict = emergencyRequest.city || emergencyRequest.district;
  const compatibleGroups = getCompatibleDonorBloodGroups(reqGroup);

  const scoredDonors = donors.map((donor) => {
    let score = 0;

    // 1. Blood Compatibility (Max 100 pts)
    if (donor.bloodGroup === reqGroup) {
      score += 100; // Exact match
    } else if (isBloodCompatible(donor.bloodGroup, reqGroup)) {
      score += 75; // Clinically compatible
    } else {
      score -= 100; // Incompatible
    }

    // 2. District Match (Max 50 pts)
    const donorDist = (donor.district || donor.city || '').toLowerCase();
    if (donorDist === (reqDistrict || '').toLowerCase()) {
      score += 50;
    } else {
      score += 10;
    }

    // 3. Current Availability (Max 30 pts)
    if (donor.availability === 'Available Now' || donor.isAvailable) {
      score += 30;
    }

    // 4. Donation Eligibility (Max 25 pts)
    const eligibility = getDonorEligibility(donor);
    if (eligibility.isEligible) {
      score += 25;
    }

    // 5. Emergency Readiness (Max 15 pts)
    if (donor.emergencyWillingness) {
      score += 15;
    }

    return {
      donor,
      matchScore: score,
      eligibility,
    };
  });

  return scoredDonors
    .filter((item) => item.matchScore > 50)
    .sort((a, b) => b.matchScore - a.matchScore)
    .map((item) => ({
      ...item.donor,
      matchScore: item.matchScore,
      eligibility: item.eligibility,
    }));
};

/**
 * Creates an emergency blood ticket in Supabase `blood_requests` table.
 */
export const createEmergencyRequest = async (formData, userId = null) => {
  let createdReq = null;

  const dbRecord = {
    requester_id: userId || null,
    patient_name: formData.patientName.trim(),
    blood_group: formData.bloodGroup,
    required_units: parseInt(formData.units) || 1,
    hospital_name: formData.hospitalName.trim(),
    hospital_address: formData.hospitalAddress?.trim() || '',
    city: formData.city || 'Karur',
    district: formData.district || formData.city || 'Karur',
    state: formData.state || 'Tamil Nadu',
    contact_number: formData.contactPhone?.trim() || '',
    required_date: formData.requiredDate || 'Immediately',
    emergency_level: formData.emergencyLevel || 'Critical',
    additional_message: formData.additionalMessage?.trim() || '',
    status: 'Open',
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('blood_requests')
        .insert(dbRecord)
        .select()
        .single();

      if (error) throw error;
      if (data) createdReq = mapDatabaseRequest(data);
    } catch (err) {
      console.warn('Supabase blood_requests insert error:', err);
      if (err.message && !err.message.includes('FetchError')) {
        throw err;
      }
    }
  }

  // Fallback / local store sync
  if (!createdReq) {
    createdReq = {
      id: `req-${Date.now().toString().slice(-6)}`,
      requesterId: userId,
      patient: dbRecord.patient_name,
      patientName: dbRecord.patient_name,
      bloodGroup: dbRecord.blood_group,
      units: dbRecord.required_units,
      requiredUnits: dbRecord.required_units,
      hospital: dbRecord.hospital_name,
      hospitalName: dbRecord.hospital_name,
      hospitalAddress: dbRecord.hospital_address,
      city: dbRecord.city,
      district: dbRecord.district,
      state: dbRecord.state,
      contactPerson: dbRecord.patient_name,
      contactPhone: dbRecord.contact_number,
      contactNumber: dbRecord.contact_number,
      emergencyLevel: dbRecord.emergency_level,
      requiredDate: dbRecord.required_date,
      additionalMessage: dbRecord.additional_message,
      status: 'Open',
      createdAt: new Date().toISOString(),
    };
  }

  const current = getStoredRequests();
  saveStoredRequests([createdReq, ...current]);

  // Dispatch emergency alert notification to donors in region
  addNotification({
    type: NOTIFICATION_TYPES.EMERGENCY_REQUEST_NEARBY,
    title: `Emergency ${createdReq.bloodGroup} Blood Needed`,
    message: `${createdReq.units} units of ${createdReq.bloodGroup} requested at ${createdReq.hospital} (${createdReq.city}).`,
    targetRole: 'USER',
    actionLink: '/donor-dashboard',
    metadata: { requestId: createdReq.id, bloodGroup: createdReq.bloodGroup, city: createdReq.city },
  });

  return createdReq;
};

/**
 * Updates blood request status ('Open', 'Fulfilled', 'Cancelled') in Supabase.
 */
export const updateBloodRequestStatus = async (requestId, newStatus) => {
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

  const current = getStoredRequests();
  const updated = current.map((r) => {
    if (r.id === requestId) {
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
