import { getSettings } from './settingsService';

/**
 * BloodBridge Privacy & Consent Architecture Service
 * Controls masking, access levels (PUBLIC, AUTHORIZED, PRIVATE),
 * and confidential handling for sensitive and rare blood groups.
 */

export const ACCESS_LEVELS = {
  PUBLIC: 'PUBLIC',
  AUTHORIZED: 'AUTHORIZED',
  PRIVATE: 'PRIVATE',
};

/**
 * Masks a phone number to protect donor privacy in public catalogs.
 * Example: +91 98421 87654 -> +91 98421 •••••
 */
export const maskPhone = (phone) => {
  if (!phone) return '+91 ••••• •••••';
  const clean = phone.replace(/\s+/g, ' ');
  if (clean.length > 8) {
    return `${clean.slice(0, 8)} •••••`;
  }
  return '+91 98421 •••••';
};

/**
 * Masks an email address to protect donor privacy in public catalogs.
 * Example: arun.kumar@example.com -> a***r@example.com
 */
export const maskEmail = (email) => {
  if (!email || !email.includes('@')) return '•••••@example.com';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
};

/**
 * Determines whether a blood group should receive confidential privacy protection.
 */
export const isRareBloodGroup = (bloodGroup) => {
  const settings = getSettings();
  if (!settings.rareBloodPrivacyEnabled) return false;
  return settings.rareBloodGroups.some(
    (rg) => rg.toLowerCase().trim() === (bloodGroup || '').toLowerCase().trim()
  );
};

/**
 * Prepares a donor object for display based on the requesting user's authorization level.
 * @param {Object} donor - Donor record
 * @param {string} userRole - 'USER' | 'AUTHORIZED_HOSPITAL' | 'ADMIN'
 * @param {string} requesterId - User ID if inspecting own profile
 */
export const sanitizeDonorForViewer = (donor, userRole = 'USER', requesterId = null) => {
  if (!donor) return null;

  const isOwner = requesterId && donor.id === requesterId;
  const isAdmin = userRole === 'ADMIN';
  const isAuthorizedHospital = userRole === 'AUTHORIZED_HOSPITAL';

  // 1. Private access: Donor viewing their own profile or Super Admin
  if (isOwner || isAdmin) {
    return {
      ...donor,
      viewerAccessLevel: ACCESS_LEVELS.PRIVATE,
      displayPhone: donor.fullPhone || donor.phone,
      displayEmail: donor.email,
      canViewSensitiveMedical: true,
    };
  }

  // 2. Authorized access: Verified Hospital with donor consent
  if (isAuthorizedHospital && donor.consentSettings?.shareWithHospitals) {
    return {
      ...donor,
      viewerAccessLevel: ACCESS_LEVELS.AUTHORIZED,
      displayPhone: donor.fullPhone || donor.phone,
      displayEmail: donor.email,
      canViewSensitiveMedical: false, // Protected medical notes still reserved for direct clinical intake
      isAuthorizedView: true,
    };
  }

  // 3. Rare Blood Group Privacy Safeguard for Public Viewers
  const isRare = isRareBloodGroup(donor.bloodGroup) || donor.isRareBloodSpecial;
  if (isRare && !isAuthorizedHospital && !isAdmin) {
    return {
      id: donor.id,
      name: `Verified Lifesaver (${donor.bloodGroup})`,
      bloodGroup: donor.bloodGroup,
      city: donor.district,
      district: donor.district,
      state: donor.state,
      country: donor.country,
      area: 'Regional Donor',
      availability: donor.availability,
      lastDonationDate: donor.lastDonationDate,
      totalDonations: donor.totalDonations,
      verified: true,
      age: donor.age,
      gender: donor.gender,
      displayPhone: '+91 ••••• ••••• (Protected)',
      displayEmail: 'Masked via BloodBridge',
      viewerAccessLevel: ACCESS_LEVELS.PUBLIC,
      isRareBloodProtected: true,
      rareNotice: 'Potential donor availability found in this region. Request will be routed through BloodBridge Administration or an Authorized Hospital.',
    };
  }

  // 4. Standard Public Safe Card
  return {
    ...donor,
    city: donor.district || donor.city,
    district: donor.district || donor.city,
    displayPhone: maskPhone(donor.fullPhone || donor.phone),
    displayEmail: maskEmail(donor.email),
    viewerAccessLevel: ACCESS_LEVELS.PUBLIC,
    canViewSensitiveMedical: false,
  };
};
