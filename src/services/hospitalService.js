/**
 * BloodBridge Hospital Service
 * Connects frontend hospital workflows directly to the authenticated backend API routes.
 * Completely eliminates old demo keys (HOSP-KEY-2026 / DemoKey2026).
 */

const HOSPITAL_TOKEN_KEY = 'bloodbridge_hospital_token';

export const getHospitalToken = () => {
  try {
    return sessionStorage.getItem(HOSPITAL_TOKEN_KEY);
  } catch (e) {
    console.warn('Cannot read hospital token from sessionStorage:', e);
    return null;
  }
};

export const setHospitalToken = (token) => {
  try {
    if (token) {
      sessionStorage.setItem(HOSPITAL_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(HOSPITAL_TOKEN_KEY);
    }
  } catch (e) {
    console.warn('Cannot write hospital token to sessionStorage:', e);
  }
};

/**
 * Authenticates hospital using User Key and Password against the real backend API.
 */
export const authenticateHospital = async ({ userKey, password }) => {
  const cleanKey = String(userKey || '').trim().replace(/[\u2010-\u2015]/g, '-').toUpperCase();
  const cleanPassword = String(password || '').trim();

  if (!cleanKey || !cleanPassword) {
    throw new Error('Please enter both Hospital User Key and Password.');
  }

  const response = await fetch('/api/auth/hospital/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userKey: cleanKey, password: cleanPassword })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Invalid hospital credentials.');
  }

  setHospitalToken(data.token);

  return {
    hospital: data.hospital,
    role: 'AUTHORIZED_HOSPITAL',
    token: data.token
  };
};

/**
 * Fetches the currently authenticated hospital profile from GET /api/hospital/me.
 */
export const getCurrentHospital = async () => {
  const token = getHospitalToken();
  if (!token) return null;

  try {
    const response = await fetch('/api/hospital/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        setHospitalToken(null);
      }
      return null;
    }

    const data = await response.json();
    return data.hospital;
  } catch (err) {
    console.warn('Error fetching /api/hospital/me:', err);
    return null;
  }
};

/**
 * Logs out the authenticated hospital.
 */
export const logoutHospital = async () => {
  const token = getHospitalToken();
  if (token) {
    try {
      await fetch('/api/auth/hospital/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.warn('Error during logout API call:', e);
    }
  }
  setHospitalToken(null);
};

/**
 * Searches hospitals by name, district, or location across all 550 hospitals.
 */
export const searchHospitals = async (query = '', limit = 20) => {
  try {
    const res = await fetch(`/api/hospitals/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return data.hospitals || [];
  } catch (err) {
    console.warn('searchHospitals API error:', err);
    return [];
  }
};

/**
 * Public nearby donor discovery for a selected hospital.
 */
export const getPublicNearbyDonors = async ({ hospitalId, bloodGroup, radius }) => {
  const params = new URLSearchParams();
  if (hospitalId) params.append('hospitalId', hospitalId);
  if (bloodGroup && bloodGroup !== 'All' && bloodGroup !== 'All Groups') params.append('bloodGroup', bloodGroup);
  if (radius) params.append('radius', radius);

  const res = await fetch(`/api/public/nearby-donors?${params.toString()}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to fetch nearby donors.');
  }
  return res.json();
};

/**
 * Authenticated nearby donor discovery for the logged-in hospital dashboard.
 */
export const getHospitalNearbyDonors = async ({ bloodGroup, radius = 25 }) => {
  const token = getHospitalToken();
  if (!token) throw new Error('Hospital authentication required.');

  const params = new URLSearchParams();
  if (bloodGroup && bloodGroup !== 'All' && bloodGroup !== 'All Groups') params.append('bloodGroup', bloodGroup);
  if (radius) params.append('radius', radius);

  const res = await fetch(`/api/hospital/nearby-donors?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to load nearby donors.');
  }

  return res.json();
};

/**
 * Dispatches a blood request from the authenticated hospital dashboard.
 */
export const createHospitalBloodRequest = async (requestData) => {
  const token = getHospitalToken();
  if (!token) throw new Error('Hospital authentication required.');

  const res = await fetch('/api/hospital/blood-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestData)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to dispatch blood request.');
  }

  return res.json();
};

/**
 * Fetches blood requests belonging to the authenticated hospital.
 */
export const getHospitalBloodRequests = async () => {
  const token = getHospitalToken();
  if (!token) return [];

  const res = await fetch('/api/hospital/blood-requests', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.requests || [];
};

/**
 * Changes password for the authenticated hospital.
 */
export const changeHospitalPassword = async ({ currentPassword, newPassword }) => {
  const token = getHospitalToken();
  if (!token) throw new Error('Hospital authentication required.');

  const res = await fetch('/api/hospital/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ currentPassword, newPassword })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to change password.');
  }

  return data;
};

const HOSPITALS_STORAGE_KEY = 'bloodbridge_hospitals_store';

export const getHospitalsList = () => {
  try {
    const raw = localStorage.getItem(HOSPITALS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading hospitals store:', e);
  }
  return [];
};

export const saveHospitalsList = (list) => {
  try {
    localStorage.setItem(HOSPITALS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving hospitals store:', e);
  }
};

export const registerHospitalAccount = async (formData) => {
  const hospitals = getHospitalsList();
  const newHospital = {
    id: `hosp-${Date.now()}`,
    hospitalId: `HOSP-TN-${(formData.district || 'GEN').slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
    name: formData.name.trim(),
    licenseNumber: formData.licenseNumber.trim(),
    district: formData.district,
    state: formData.state || 'Tamil Nadu',
    country: formData.country || 'India',
    address: formData.address.trim(),
    nodalOfficer: formData.nodalOfficer.trim(),
    contactPhone: formData.contactPhone.trim(),
    email: formData.email.trim(),
    authorizationStatus: 'PENDING',
    authorizedDate: null,
    bloodRequirements: [],
    inventoryStatus: { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 },
    submittedAt: new Date().toISOString(),
  };

  const updated = [newHospital, ...hospitals];
  saveHospitalsList(updated);
  return newHospital;
};

export const updateHospitalAuthorization = (hospitalId, newStatus) => {
  const hospitals = getHospitalsList();
  const updated = hospitals.map((h) => {
    if (h.id === hospitalId || h.hospitalId === hospitalId) {
      return {
        ...h,
        authorizationStatus: newStatus,
        authorizedDate: newStatus === 'AUTHORIZED' ? new Date().toISOString().split('T')[0] : h.authorizedDate,
      };
    }
    return h;
  });
  saveHospitalsList(updated);
  return updated;
};

