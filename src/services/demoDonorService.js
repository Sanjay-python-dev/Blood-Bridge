import demoData from '../data/bloodbridge_38_districts_demo.json' with { type: 'json' };
import { getCompatibleDonorBloodGroups } from './compatibilityService.js';

export const isBombayBlood = (bg = '') => {
  const clean = String(bg).toLowerCase();
  return clean.includes('bombay') || clean === 'oh';
};

/**
 * Normalizes a raw donor record from the JSON into the application donor model.
 */
export const normalizeDemoDonor = (donor) => {
  const isAvailable = donor.status === 'Available';
  const cleanName = (donor.name || 'donor')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
  const idSuffix = donor.id ? `.${String(donor.id).toLowerCase().replace(/[^a-z0-9]/g, '')}` : '';
  const donorEmail = donor.email || `${cleanName}${idSuffix}@gmail.com`;

  return {
    id: `${donor.district}-${donor.id}`,
    originalId: donor.id,
    district_no: donor.district_no,
    district: donor.district,
    name: donor.name,
    age: donor.age,
    gender: donor.gender,
    blood_group: donor.blood_group,
    bloodGroup: donor.blood_group,
    status: donor.status,
    availability: isAvailable ? 'Available Now' : (donor.status === 'On Call' ? 'On Call' : donor.status),
    isAvailable: isAvailable,
    phone: donor.phone,
    fullPhone: donor.phone,
    displayPhone: donor.phone,
    email: donorEmail,
    displayEmail: donor.displayEmail || donorEmail,
    address: donor.address,
    city: donor.district,
    state: 'Tamil Nadu',
    country: 'India',
    verified: true,
    emergencyWillingness: donor.status === 'On Call' || isAvailable,
    lastDonationDate: null,
    totalDonations: Math.max(1, Math.floor((donor.age || 30) / 4)),
    livesHelped: Math.max(1, Math.floor((donor.age || 30) / 5)),
    accessLevel: 'PUBLIC',
    consentSettings: {
      shareWithHospitals: true,
      emergencyContactConsent: true,
      allowEmergencyPush: true,
    },
    adminStatus: 'Approved',
  };
};

/**
 * Loads standard donors across all districts from bloodbridge_38_districts_demo.json.
 * Excludes protected rare Bombay Blood Group donors from public discovery (Requirement 14).
 */
export const loadDonors = (includeProtectedRare = false) => {
  if (!demoData || !demoData.districts) return [];
  const all = [];
  for (const [districtName, donors] of Object.entries(demoData.districts)) {
    if (Array.isArray(donors)) {
      for (const d of donors) {
        if (!includeProtectedRare && isBombayBlood(d.blood_group)) {
          continue; // Protect rare Bombay donors from public browsing
        }
        all.push(normalizeDemoDonor(d));
      }
    }
  }
  return all;
};

/**
 * Dynamically extracts all available Tamil Nadu district names from the JSON.
 * Ensures zero hardcoding of district names into React components.
 */
export const getDemoDistricts = () => {
  if (!demoData || !demoData.districts) return [];
  return Object.keys(demoData.districts);
};

/**
 * Returns donors strictly belonging to the requested district.
 * If district is empty or 'All Districts', returns all donors.
 * Protects rare Bombay donors from public discovery unless specifically requested.
 */
export const getDonorsByDistrict = (district, includeProtectedRare = false) => {
  if (!demoData || !demoData.districts) return [];
  if (!district || district === 'All Districts') {
    return loadDonors(includeProtectedRare);
  }
  const donorsInDistrict = demoData.districts[district] || [];
  const list = [];
  for (const d of donorsInDistrict) {
    if (!includeProtectedRare && isBombayBlood(d.blood_group)) {
      continue;
    }
    list.push(normalizeDemoDonor(d));
  }
  return list;
};

/**
 * Filters donors by district, blood group, availability, search keyword, etc.
 */
export const filterDonors = ({
  district = 'All Districts',
  bloodGroup = 'All Groups',
  availability = 'All Donors',
  searchQuery = '',
  onlyEmergency = false,
  onlyEligible = false,
  matchCompatibleForRecipient = null,
  page = 1,
  limit = 9,
} = {}) => {
  // Public search: Bombay donors are protected from direct discovery
  const isDirectBombayQuery = isBombayBlood(bloodGroup);
  let donors = getDonorsByDistrict(district, isDirectBombayQuery);

  // Blood group filtering (or compatibility matching)
  if (matchCompatibleForRecipient) {
    const compatibleGroups = getCompatibleDonorBloodGroups(matchCompatibleForRecipient);
    donors = donors.filter((d) =>
      compatibleGroups.includes(d.blood_group) || compatibleGroups.includes(d.bloodGroup)
    );
  } else if (bloodGroup && bloodGroup !== 'All Groups') {
    donors = donors.filter(
      (d) => d.blood_group === bloodGroup || d.bloodGroup === bloodGroup
    );
  }

  // Availability filtering
  if (availability === 'Available Now') {
    donors = donors.filter((d) => d.status === 'Available' || d.availability === 'Available Now');
  } else if (availability === 'On Call' || availability === 'Available Soon') {
    donors = donors.filter((d) => d.status === 'On Call' || d.availability === 'Available Soon');
  }

  // Emergency readiness
  if (onlyEmergency) {
    donors = donors.filter((d) => d.status === 'On Call' || d.emergencyWillingness);
  }

  // Keyword search
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    donors = donors.filter((d) =>
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.address && d.address.toLowerCase().includes(q)) ||
      (d.district && d.district.toLowerCase().includes(q)) ||
      (d.blood_group && d.blood_group.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.email && d.email.toLowerCase().includes(q))
    );
  }

  const total = donors.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = donors.slice(startIndex, startIndex + limit);

  return {
    donors: paginated,
    total,
    page,
    totalPages,
  };
};

/**
 * Specifically returns eligible Bombay Blood donors for authorized hospital access only.
 */
export const getEligibleBombayDonors = ({ district = '', limit = 10 } = {}) => {
  if (!demoData || !demoData.districts) return [];
  const allBombay = [];
  for (const [distName, donors] of Object.entries(demoData.districts)) {
    if (Array.isArray(donors)) {
      for (const d of donors) {
        if (isBombayBlood(d.blood_group)) {
          const norm = normalizeDemoDonor(d);
          allBombay.push({
            ...norm,
            bloodGroup: 'Bombay Blood Group (Oh)',
            blood_group: 'Bombay Blood Group (Oh)',
            displayPhone: d.phone ? `${d.phone.substring(0, 8)}•••••` : 'Protected',
          });
        }
      }
    }
  }

  // Sort by target district proximity
  if (district && district !== 'All Districts') {
    const target = district.toLowerCase();
    allBombay.sort((a, b) => {
      const aMatches = (a.district || '').toLowerCase() === target ? -1 : 1;
      const bMatches = (b.district || '').toLowerCase() === target ? -1 : 1;
      return aMatches - bMatches;
    });
  }

  return allBombay.slice(0, limit);
};
