import { fictionalDonorsDataset } from '../data/donorsDataset';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getDonorEligibility } from './eligibilityService';
import { sanitizeDonorForViewer } from './privacyService';
import { getSettings } from './settingsService';
import { getCompatibleDonorBloodGroups } from './compatibilityService';
import { loadDonors, filterDonors } from './demoDonorService';

const DONORS_STORAGE_KEY = 'bloodbridge_donors_store';

export const getStoredDonors = () => {
  try {
    const raw = localStorage.getItem(DONORS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 900) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading donors from localStorage:', e);
  }
  return loadDonors();
};

export const saveStoredDonors = (donors) => {
  try {
    localStorage.setItem(DONORS_STORAGE_KEY, JSON.stringify(donors));
  } catch (e) {
    console.warn('Error saving donors to localStorage:', e);
  }
};

/**
 * Maps a Supabase `donors` row into the frontend donor model format.
 */
const mapDatabaseDonor = (d) => ({
  id: d.id,
  userId: d.user_id,
  name: d.full_name,
  bloodGroup: d.blood_group,
  country: 'India',
  state: d.state || 'Tamil Nadu',
  district: d.district || d.city || '',
  city: d.city || d.district || '',
  area: d.address || '',
  availability: d.available ? 'Available Now' : 'Available Soon',
  isAvailable: Boolean(d.available),
  emergencyWillingness: Boolean(d.emergency_available),
  lastDonationDate: d.last_donation_date,
  totalDonations: d.total_donations || 0,
  livesHelped: Math.max(1, (d.total_donations || 1) - 1),
  verified: true,
  age: d.age || 28,
  gender: d.gender || 'Male',
  phone: d.phone,
  fullPhone: d.phone,
  email: d.email || '',
  accessLevel: 'PUBLIC',
  consentSettings: {
    shareWithHospitals: true,
    emergencyContactConsent: true,
    allowEmergencyPush: true,
  },
  adminStatus: 'Approved',
});

/**
 * Fetches filtered donors with real Supabase database query, compatibility support,
 * and privacy-safe view sanitization.
 */
export const getDonors = async ({
  country = 'India',
  state = 'Tamil Nadu',
  district = 'All Districts',
  bloodGroup = 'All Groups',
  availability = 'All Donors',
  onlyEligible = false,
  onlyEmergency = false,
  matchCompatibleForRecipient = null,
  searchQuery = '',
  page = 1,
  limit = 12,
  userRole = 'USER',
  requesterId = null,
}) => {
  const settings = getSettings();
  const ruleDays = settings.eligibilityIntervalDays;

  // 1. Try real Supabase database query if configured
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('donors').select('*');

      // District / City filter
      if (district && district !== 'All Districts' && district !== 'All Cities') {
        query = query.or(`district.ilike.%${district}%,city.ilike.%${district}%`);
      }

      // State filter
      if (state && state !== 'All States') {
        query = query.ilike('state', `%${state}%`);
      }

      // Blood Group filter (or compatible donor filter)
      if (matchCompatibleForRecipient) {
        const compatibleGroups = getCompatibleDonorBloodGroups(matchCompatibleForRecipient);
        query = query.in('blood_group', compatibleGroups);
      } else if (bloodGroup && bloodGroup !== 'All Groups') {
        query = query.eq('blood_group', bloodGroup);
      }

      // Availability filter
      if (availability === 'Available Now') {
        query = query.eq('available', true);
      }

      // Emergency availability filter
      if (onlyEmergency) {
        query = query.eq('emergency_available', true);
      }

      // Keyword search on name, city, address
      if (searchQuery.trim()) {
        const cleanQuery = searchQuery.trim();
        query = query.or(`full_name.ilike.%${cleanQuery}%,city.ilike.%${cleanQuery}%,address.ilike.%${cleanQuery}%,district.ilike.%${cleanQuery}%`);
      }

      query = query.order('available', { ascending: false }).order('created_at', { ascending: false });

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        let dbDonors = data.map(mapDatabaseDonor);

        // Client-side eligibility filter
        if (onlyEligible) {
          dbDonors = dbDonors.filter((d) => {
            const eligibility = getDonorEligibility(d, ruleDays);
            return eligibility.isEligible;
          });
        }

        const processed = dbDonors.map((d) => {
          const eligibility = getDonorEligibility(d, ruleDays);
          const sanitized = sanitizeDonorForViewer(d, userRole, requesterId);
          return {
            ...sanitized,
            eligibility,
          };
        });

        const total = processed.length;
        const startIndex = (page - 1) * limit;
        const paginatedDonors = processed.slice(startIndex, startIndex + limit);

        return {
          donors: paginatedDonors,
          total,
          page,
          totalPages: Math.ceil(total / limit) || 1,
        };
      }
    } catch (dbErr) {
      console.warn('Supabase donors query note, using cached catalog:', dbErr);
    }
  }

  // 2. Fallback to rich stored/fictional catalog
  let allDonors = getStoredDonors();

  let filtered = allDonors.filter((donor) => {
    // Country
    if (country && country !== 'All Countries') {
      if ((donor.country || 'India').toLowerCase() !== country.toLowerCase()) return false;
    }

    // State
    if (state && state !== 'All States') {
      if ((donor.state || 'Tamil Nadu').toLowerCase() !== state.toLowerCase()) return false;
    }

    // District / City
    if (district && district !== 'All Districts' && district !== 'All Cities') {
      const donorDistrict = (donor.district || donor.city || '').toLowerCase();
      if (donorDistrict !== district.toLowerCase()) return false;
    }

    // Blood Group / Compatibility
    if (matchCompatibleForRecipient) {
      const compatibleGroups = getCompatibleDonorBloodGroups(matchCompatibleForRecipient);
      if (!compatibleGroups.includes(donor.bloodGroup)) return false;
    } else if (bloodGroup && bloodGroup !== 'All Groups') {
      const donorBg = donor.bloodGroup || donor.blood_group;
      if (donorBg !== bloodGroup) return false;
    }

    // Availability Filter
    if (availability === 'Available Now' && donor.availability !== 'Available Now' && donor.status !== 'Available') {
      return false;
    }
    if (availability === 'Available Soon' && donor.availability !== 'Available Soon' && donor.status !== 'On Call') {
      return false;
    }

    // Emergency Availability Filter
    if (onlyEmergency && !donor.emergencyWillingness && donor.status !== 'On Call') {
      return false;
    }

    // Eligibility Filter
    const eligibility = getDonorEligibility(donor, ruleDays);
    if (onlyEligible && !eligibility.isEligible) {
      return false;
    }

    // Keyword Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (donor.name || '').toLowerCase().includes(q);
      const matchDist = (donor.district || donor.city || '').toLowerCase().includes(q);
      const matchArea = (donor.area || donor.address || '').toLowerCase().includes(q);
      const matchBlood = (donor.bloodGroup || donor.blood_group || '').toLowerCase().includes(q);
      const matchPhone = (donor.phone || '').toLowerCase().includes(q);
      if (!matchName && !matchDist && !matchArea && !matchBlood && !matchPhone) {
        return false;
      }
    }

    return true;
  });

  const processed = filtered.map((d) => {
    const eligibility = getDonorEligibility(d, ruleDays);
    const sanitized = sanitizeDonorForViewer(d, userRole, requesterId);
    return {
      ...sanitized,
      eligibility,
    };
  });

  const total = processed.length;
  const startIndex = (page - 1) * limit;
  const paginatedDonors = processed.slice(startIndex, startIndex + limit);

  return {
    donors: paginatedDonors,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Retrieve a specific donor by ID with role-aware privacy sanitization.
 */
export const getDonorById = async (id, userRole = 'USER', requesterId = null) => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const mapped = mapDatabaseDonor(data);
        const settings = getSettings();
        const eligibility = getDonorEligibility(mapped, settings.eligibilityIntervalDays);
        const sanitized = sanitizeDonorForViewer(mapped, userRole, requesterId);
        return { ...sanitized, eligibility };
      }
    } catch (e) {
      console.warn('getDonorById remote fetch error:', e);
    }
  }

  const donors = getStoredDonors();
  const found = donors.find((d) => d.id === id);
  if (!found) return null;

  const settings = getSettings();
  const eligibility = getDonorEligibility(found, settings.eligibilityIntervalDays);
  const sanitized = sanitizeDonorForViewer(found, userRole, requesterId);

  return {
    ...sanitized,
    eligibility,
  };
};

/**
 * Retrieve donor profile by user_id
 */
export const getDonorByUserId = async (userId) => {
  if (!userId) return null;
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return mapDatabaseDonor(data);
      }
    } catch (e) {
      console.warn('getDonorByUserId error:', e);
    }
  }
  return null;
};

/**
 * Register or update a donor profile.
 */
export const registerNewDonor = async (donorData, userId = null) => {
  let createdDonor = null;

  const newDonorRecord = {
    user_id: userId || null,
    full_name: donorData.fullName.trim(),
    phone: donorData.phone.trim(),
    blood_group: donorData.bloodGroup,
    date_of_birth: donorData.dob || null,
    age: donorData.age || 25,
    gender: donorData.gender || 'Male',
    city: donorData.city || donorData.district || '',
    district: donorData.district || donorData.city || '',
    state: donorData.state || 'Tamil Nadu',
    address: donorData.area?.trim() || '',
    last_donation_date: donorData.lastDonationDate || null,
    available: Boolean(donorData.isAvailable ?? true),
    emergency_available: true,
  };

  // 1. If Supabase is configured, insert into live `donors` table
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('donors')
        .insert(newDonorRecord)
        .select()
        .single();

      if (error) throw error;
      if (data) createdDonor = mapDatabaseDonor(data);
    } catch (err) {
      console.warn('Supabase donor insert error:', err);
      if (err.message && !err.message.includes('FetchError')) {
        throw err;
      }
    }
  }

  // 2. Fallback / local store sync
  if (!createdDonor) {
    createdDonor = {
      id: `d-${Date.now()}`,
      name: newDonorRecord.full_name,
      bloodGroup: newDonorRecord.blood_group,
      country: 'India',
      state: newDonorRecord.state,
      district: newDonorRecord.district,
      city: newDonorRecord.city,
      area: newDonorRecord.address,
      gender: newDonorRecord.gender,
      age: newDonorRecord.age,
      availability: newDonorRecord.available ? 'Available Now' : 'Available Soon',
      isAvailable: newDonorRecord.available,
      lastDonationDate: newDonorRecord.last_donation_date,
      totalDonations: 0,
      livesHelped: 0,
      verified: true,
      email: donorData.email ? donorData.email.trim() : '',
      phone: newDonorRecord.phone,
      fullPhone: newDonorRecord.phone,
      emergencyWillingness: true,
      accessLevel: 'PUBLIC',
      consentSettings: {
        shareWithHospitals: true,
        emergencyContactConsent: true,
        allowEmergencyPush: true,
      },
      adminStatus: 'Approved',
    };
  }

  const existingDonors = getStoredDonors();
  saveStoredDonors([createdDonor, ...existingDonors]);

  return createdDonor;
};

/**
 * Updates donor availability.
 */
export const updateDonorAvailability = async (donorIdOrUserId, newAvailability) => {
  const isAvailableBool = typeof newAvailability === 'boolean'
    ? newAvailability
    : newAvailability === 'Available Now';

  // Remote Supabase update
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('donors')
        .update({ available: isAvailableBool })
        .or(`id.eq.${donorIdOrUserId},user_id.eq.${donorIdOrUserId}`);
    } catch (e) {
      console.warn('Supabase updateDonorAvailability error:', e);
    }
  }

  // Local storage update
  const donors = getStoredDonors();
  const updated = donors.map((d) => {
    if (d.id === donorIdOrUserId || d.userId === donorIdOrUserId) {
      return {
        ...d,
        availability: isAvailableBool ? 'Available Now' : 'Available Soon',
        isAvailable: isAvailableBool,
      };
    }
    return d;
  });
  saveStoredDonors(updated);
  return updated;
};

/**
 * Updates donor's last donation date.
 */
export const updateDonorLastDonationDate = async (userIdOrDonorId, lastDonationDate) => {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('donors')
        .update({ last_donation_date: lastDonationDate })
        .or(`id.eq.${userIdOrDonorId},user_id.eq.${userIdOrDonorId}`);
    } catch (e) {
      console.warn('updateDonorLastDonationDate remote error:', e);
    }
  }

  const donors = getStoredDonors();
  const updated = donors.map((d) => {
    if (d.id === userIdOrDonorId || d.userId === userIdOrDonorId) {
      return {
        ...d,
        lastDonationDate,
        totalDonations: (d.totalDonations || 0) + 1,
      };
    }
    return d;
  });
  saveStoredDonors(updated);
  return updated;
};

/**
 * Update donor consent and privacy settings.
 */
export const updateDonorConsent = (donorId, consentSettings) => {
  const donors = getStoredDonors();
  const updated = donors.map((d) => {
    if (d.id === donorId) {
      return {
        ...d,
        consentSettings: { ...d.consentSettings, ...consentSettings },
      };
    }
    return d;
  });
  saveStoredDonors(updated);
  return updated;
};

/**
 * Admin action: verify or reject donor.
 */
export const updateDonorAdminStatus = (donorId, adminStatus) => {
  const donors = getStoredDonors();
  const updated = donors.map((d) => {
    if (d.id === donorId) {
      return {
        ...d,
        adminStatus,
        verified: adminStatus === 'Approved',
      };
    }
    return d;
  });
  saveStoredDonors(updated);
  return updated;
};
