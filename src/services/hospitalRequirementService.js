/**
 * BloodBridge Hospital Blood Requirements & Donor Response Service
 * Connects frontend donor discovery, hospital requirements publication,
 * and voluntary donor triage with the backend API.
 */

import { getHospitalToken } from './hospitalService';
import { addNotification, NOTIFICATION_TYPES } from './notificationService';

const LOCAL_REQUIREMENTS_KEY = 'bloodbridge_hospital_requirements_local';
const LOCAL_RESPONSES_KEY = 'bloodbridge_donor_responses_local';

/**
 * 1. Fetch public verified hospital blood requirements with optional filters.
 */
export const fetchHospitalRequirements = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.bloodGroup && filters.bloodGroup !== 'All' && filters.bloodGroup !== 'All Groups') {
    params.append('bloodGroup', filters.bloodGroup);
  }
  if (filters.district && filters.district !== 'All' && filters.district !== 'All Districts') {
    params.append('district', filters.district);
  }
  if (filters.urgency && filters.urgency !== 'All') {
    params.append('urgency', filters.urgency);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }

  try {
    const res = await fetch(`/api/hospital-requirements?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.requirements || [];
    }
  } catch (err) {
    console.warn('API error fetching hospital requirements, checking fallback:', err);
  }

  // Graceful fallback from localStorage cache if API unreachable
  try {
    const raw = localStorage.getItem(LOCAL_REQUIREMENTS_KEY);
    if (raw) {
      let list = JSON.parse(raw);
      if (filters.bloodGroup && filters.bloodGroup !== 'All') {
        list = list.filter(r => r.blood_group === filters.bloodGroup);
      }
      if (filters.district && filters.district !== 'All') {
        list = list.filter(r => (r.district || '').toLowerCase().includes(filters.district.toLowerCase()));
      }
      if (filters.urgency && filters.urgency !== 'All') {
        list = list.filter(r => (r.urgency || '').toLowerCase() === filters.urgency.toLowerCase());
      }
      return list;
    }
  } catch (e) {
    console.warn('Fallback error:', e);
  }

  return [];
};

/**
 * 2. Fetch complete details of a single hospital blood requirement.
 */
export const fetchHospitalRequirementDetails = async (id) => {
  try {
    const res = await fetch(`/api/hospital-requirements/${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = await res.json();
      return data.requirement;
    }
  } catch (err) {
    console.warn('Error fetching requirement details:', err);
  }
  return null;
};

/**
 * 3. Hospital creates and publishes a verified blood requirement.
 */
export const createHospitalRequirement = async (formData) => {
  const token = getHospitalToken();
  if (!token) {
    throw new Error('Hospital authentication required.');
  }

  const res = await fetch('/api/hospital/requirements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(formData)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to publish hospital requirement.');
  }

  // Also cache locally for instant UI update
  try {
    const raw = localStorage.getItem(LOCAL_REQUIREMENTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    localStorage.setItem(LOCAL_REQUIREMENTS_KEY, JSON.stringify([data.requirement, ...list]));
  } catch (e) {
    console.warn('Error caching local requirement:', e);
  }

  return data.requirement;
};

/**
 * 4. Fetch blood requirements published by the currently logged-in hospital.
 */
export const fetchHospitalMyRequirements = async () => {
  const token = getHospitalToken();
  if (!token) return [];

  try {
    const res = await fetch('/api/hospital/my-requirements', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return data.requirements || [];
    }
  } catch (err) {
    console.warn('Error fetching hospital own requirements:', err);
  }
  return [];
};

/**
 * 5. Update requirement status (e.g. CANCELLED) by authenticated hospital.
 */
export const updateHospitalRequirementStatus = async (id, status) => {
  const token = getHospitalToken();
  if (!token) throw new Error('Hospital authentication required.');

  const res = await fetch(`/api/hospital/my-requirements/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update requirement status.');
  }
  return data.requirement;
};

/**
 * 6. Fetch donor responses for requirements belonging to the authenticated hospital.
 */
export const fetchHospitalDonorResponses = async (filters = {}) => {
  const token = getHospitalToken();
  if (!token) return [];

  const params = new URLSearchParams();
  if (filters.requirementId) params.append('requirementId', filters.requirementId);
  if (filters.status) params.append('status', filters.status);

  try {
    const res = await fetch(`/api/hospital/donor-responses?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return data.responses || [];
    }
  } catch (err) {
    console.warn('Error fetching donor responses for hospital:', err);
  }
  return [];
};

/**
 * 7. Hospital acts on a donor response (ACCEPT, DECLINE, SCHEDULE, COMPLETE).
 */
export const respondToHospitalDonorResponse = async ({ responseId, action, scheduledAt, reason }) => {
  const token = getHospitalToken();
  if (!token) throw new Error('Hospital authentication required.');

  const res = await fetch(`/api/hospital/donor-responses/${encodeURIComponent(responseId)}/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action, scheduledAt, reason })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update donor response.');
  }

  // Trigger reactive in-app notification to donor
  if (action === 'ACCEPT') {
    addNotification({
      type: NOTIFICATION_TYPES.REQUEST_ACCEPTED,
      title: 'Donation Response Accepted! 🎉',
      message: `${data.response?.hospital_name || 'The hospital'} has accepted your donation response. Check your dashboard for scheduling details.`,
      targetRole: 'USER',
      actionLink: '/donor-dashboard?tab=responses',
      metadata: { responseId: data.response?.id, code: data.response?.response_code },
    });
  } else if (action === 'SCHEDULE') {
    addNotification({
      type: NOTIFICATION_TYPES.HOSPITAL_REQUEST,
      title: 'Donation Appointment Scheduled',
      message: `Your donation at ${data.response?.hospital_name} has been scheduled for ${new Date(scheduledAt).toLocaleString()}.`,
      targetRole: 'USER',
      actionLink: '/donor-dashboard?tab=responses',
      metadata: { responseId: data.response?.id, scheduledAt },
    });
  } else if (action === 'COMPLETE') {
    addNotification({
      type: NOTIFICATION_TYPES.HOSPITAL_REQUEST,
      title: 'Donation Completed! ❤️',
      message: `Thank you for saving lives! Your donation at ${data.response?.hospital_name} has been marked completed and added to your donation history.`,
      targetRole: 'USER',
      actionLink: '/donor-dashboard?tab=history',
      metadata: { responseId: data.response?.id },
    });
  } else if (action === 'DECLINE') {
    addNotification({
      type: NOTIFICATION_TYPES.REQUEST_DECLINED,
      title: 'Donation Response Update',
      message: `Your response to ${data.response?.hospital_name} could not be accepted at this time (${reason || 'Capacity reached'}). Thank you for your willingness to help!`,
      targetRole: 'USER',
      actionLink: '/donor-dashboard?tab=responses',
      metadata: { responseId: data.response?.id },
    });
  }

  return data.response;
};

/**
 * 8. Donor submits "I Want to Donate" response to a hospital requirement.
 */
export const submitDonorResponse = async ({
  requirementId,
  donorId,
  donorName,
  donorBloodGroup,
  donorDistrict,
  donorCity,
  donorPhone = '',
  donorEmail = '',
  donorMessage = '',
  isAvailable = true,
}) => {
  const cleanEmail = (donorEmail || '').trim();
  if (!cleanEmail) {
    throw new Error('Email address is mandatory for donation confirmations.');
  }

  const payload = {
    requirementId,
    donorId,
    donorName,
    donorBloodGroup,
    donorDistrict,
    donorCity,
    donorPhone,
    donorEmail: cleanEmail,
    donorMessage,
    isAvailable,
  };

  const res = await fetch('/api/donor/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to submit donation response.');
  }

  // Also cache locally in case user is in local fallback mode
  try {
    const raw = localStorage.getItem(LOCAL_RESPONSES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    localStorage.setItem(LOCAL_RESPONSES_KEY, JSON.stringify([data.response, ...list]));
  } catch (e) {
    console.warn('Local response caching note:', e);
  }

  // Dispatch in-app notification confirming submission
  addNotification({
    type: NOTIFICATION_TYPES.NEW_DONATION_REQUEST,
    title: 'Donation Response Submitted',
    message: data.message || `Your response (${data.response?.response_code}) was submitted. BloodBridge support will coordinate with the hospital.`,
    targetRole: 'USER',
    actionLink: '/donor-dashboard?tab=responses',
    metadata: { responseCode: data.response?.response_code },
  });

  return data.response;
};

/**
 * 9. Fetch responses submitted by a specific donor.
 */
export const fetchDonorMyResponses = async (donorId) => {
  if (!donorId) return [];

  try {
    const res = await fetch(`/api/donor/my-responses?donorId=${encodeURIComponent(donorId)}`);
    if (res.ok) {
      const data = await res.json();
      return data.responses || [];
    }
  } catch (err) {
    console.warn('API error fetching donor responses, checking local cache:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_RESPONSES_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      return list.filter(r => r.donor_id === donorId);
    }
  } catch (e) {
    console.warn('Local responses read error:', e);
  }

  return [];
};

/**
 * 10. Donor cancels their pending response.
 */
export const cancelDonorResponse = async (responseId, donorId) => {
  const res = await fetch(`/api/donor/responses/${encodeURIComponent(responseId)}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ donorId })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to cancel response.');
  }
  return data.response;
};
