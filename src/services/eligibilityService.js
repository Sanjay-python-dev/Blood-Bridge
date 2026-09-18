/**
 * BloodBridge Donation Eligibility Service
 * 
 * Implements configurable calculation of donation eligibility intervals
 * according to national voluntary blood donation norms.
 * Includes official informational disclaimer.
 */

export const DEFAULT_ELIGIBILITY_INTERVAL_DAYS = 90; // Standard 3-month cooling period

export const MEDICAL_ELIGIBILITY_DISCLAIMER =
  'Donation eligibility shown by BloodBridge is informational and may require verification according to applicable medical guidelines.';

/**
 * Calculates the next eligible donation date based on last donation date and configured interval.
 * @param {string|Date} lastDonationDate 
 * @param {string} gender 
 * @param {number} customIntervalDays 
 * @returns {Date|null}
 */
export const calculateNextEligibleDate = (lastDonationDate, gender = 'Male', customIntervalDays = DEFAULT_ELIGIBILITY_INTERVAL_DAYS) => {
  if (!lastDonationDate) return null;
  const lastDate = new Date(lastDonationDate);
  if (isNaN(lastDate.getTime())) return null;

  // Standard interval: 90 days for males, 120 days for females if using gender-differentiated clinical rules,
  // or user-configured custom interval from Admin Settings
  const interval = customIntervalDays || (gender === 'Female' ? 120 : 90);
  
  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + interval);
  return nextDate;
};

/**
 * Evaluates current donation eligibility status for a donor.
 * @param {Object} donor 
 * @param {number} customIntervalDays 
 * @returns {Object} { isEligible: boolean, statusText: string, nextEligibleDate: string|null, daysRemaining: number }
 */
export const getDonorEligibility = (donor, customIntervalDays = DEFAULT_ELIGIBILITY_INTERVAL_DAYS) => {
  if (!donor) {
    return {
      isEligible: false,
      statusText: 'Eligibility Unknown',
      nextEligibleDate: null,
      daysRemaining: 0,
      disclaimer: MEDICAL_ELIGIBILITY_DISCLAIMER,
    };
  }

  // If donor has never donated before or no last donation recorded
  if (!donor.lastDonationDate) {
    return {
      isEligible: true,
      statusText: 'Eligible to Donate Now',
      nextEligibleDate: null,
      daysRemaining: 0,
      disclaimer: MEDICAL_ELIGIBILITY_DISCLAIMER,
    };
  }

  const nextDate = calculateNextEligibleDate(donor.lastDonationDate, donor.gender, customIntervalDays);
  if (!nextDate) {
    return {
      isEligible: true,
      statusText: 'Eligible to Donate Now',
      nextEligibleDate: null,
      daysRemaining: 0,
      disclaimer: MEDICAL_ELIGIBILITY_DISCLAIMER,
    };
  }

  const now = new Date();
  const diffTime = nextDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = nextDate.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (daysRemaining <= 0) {
    return {
      isEligible: true,
      statusText: 'Eligible to Donate Now',
      nextEligibleDate: formattedDate,
      daysRemaining: 0,
      disclaimer: MEDICAL_ELIGIBILITY_DISCLAIMER,
    };
  }

  return {
    isEligible: false,
    statusText: `Available After ${formattedDate}`,
    nextEligibleDate: formattedDate,
    daysRemaining,
    disclaimer: MEDICAL_ELIGIBILITY_DISCLAIMER,
  };
};
