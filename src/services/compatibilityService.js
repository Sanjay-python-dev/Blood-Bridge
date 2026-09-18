/**
 * Blood Compatibility Logic Service
 * Provides clinical compatibility matrices, universal donor/recipient identification,
 * and matching utilities for BloodBridge.
 */

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const COMPATIBILITY_RULES = {
  'A+': {
    canDonateTo: ['A+', 'AB+'],
    canReceiveFrom: ['A+', 'A-', 'O+', 'O-'],
    isUniversalDonor: false,
    isUniversalRecipient: false,
    description: 'Can donate to A+ and AB+. Can receive from A+, A-, O+, and O-.',
  },
  'A-': {
    canDonateTo: ['A+', 'A-', 'AB+', 'AB-'],
    canReceiveFrom: ['A-', 'O-'],
    isUniversalDonor: false,
    isUniversalRecipient: false,
    description: 'Can donate to A+, A-, AB+, and AB-. Can receive from A- and O-.',
  },
  'B+': {
    canDonateTo: ['B+', 'AB+'],
    canReceiveFrom: ['B+', 'B-', 'O+', 'O-'],
    isUniversalDonor: false,
    isUniversalRecipient: false,
    description: 'Can donate to B+ and AB+. Can receive from B+, B-, O+, and O-.',
  },
  'B-': {
    canDonateTo: ['B+', 'B-', 'AB+', 'AB-'],
    canReceiveFrom: ['B-', 'O-'],
    isUniversalDonor: false,
    isUniversalRecipient: false,
    description: 'Can donate to B+, B-, AB+, and AB-. Can receive from B- and O-.',
  },
  'AB+': {
    canDonateTo: ['AB+'],
    canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    isUniversalDonor: false,
    isUniversalRecipient: true,
    description: 'Universal Recipient: Can receive red cells from all blood groups. Can donate to AB+.',
  },
  'AB-': {
    canDonateTo: ['AB+', 'AB-'],
    canReceiveFrom: ['AB-', 'A-', 'B-', 'O-'],
    isUniversalDonor: false,
    isUniversalRecipient: false,
    description: 'Can donate to AB+ and AB-. Can receive from all Rh-negative types (AB-, A-, B-, O-).',
  },
  'O+': {
    canDonateTo: ['O+', 'A+', 'B+', 'AB+'],
    canReceiveFrom: ['O+', 'O-'],
    isUniversalDonor: false,
    isUniversalRecipient: false,
    description: 'Can donate to all Rh-positive groups (O+, A+, B+, AB+). Can receive from O+ and O-.',
  },
  'O-': {
    canDonateTo: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    canReceiveFrom: ['O-'],
    isUniversalDonor: true,
    isUniversalRecipient: false,
    description: 'Universal Donor: Can donate red blood cells to all blood types. Can only receive from O-.',
  },
};

/**
 * Returns the list of blood groups a patient/recipient can safely receive from.
 * @param {string} recipientGroup e.g. 'O+'
 * @returns {string[]} Array of compatible donor blood groups
 */
export const getCompatibleDonorBloodGroups = (recipientGroup) => {
  if (!recipientGroup || !COMPATIBILITY_RULES[recipientGroup]) {
    return BLOOD_GROUPS;
  }
  return COMPATIBILITY_RULES[recipientGroup].canReceiveFrom;
};

/**
 * Returns the list of blood groups that can receive from a given donor blood group.
 * @param {string} donorGroup e.g. 'O-'
 * @returns {string[]} Array of recipient blood groups
 */
export const getCompatibleRecipientBloodGroups = (donorGroup) => {
  if (!donorGroup || !COMPATIBILITY_RULES[donorGroup]) {
    return BLOOD_GROUPS;
  }
  return COMPATIBILITY_RULES[donorGroup].canDonateTo;
};

/**
 * Checks if a donor's blood is clinically compatible with a recipient.
 * @param {string} donorGroup
 * @param {string} recipientGroup
 * @returns {boolean}
 */
export const isBloodCompatible = (donorGroup, recipientGroup) => {
  if (!donorGroup || !recipientGroup) return false;
  const compatible = getCompatibleDonorBloodGroups(recipientGroup);
  return compatible.includes(donorGroup);
};
