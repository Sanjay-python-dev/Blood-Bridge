/**
 * BloodBridge System Settings Service
 * Allows Admin Console to configure eligibility parameters, rare blood group privacy,
 * and dispatch thresholds. Persists in localStorage with safe defaults.
 */

const SETTINGS_KEY = 'bloodbridge_admin_settings';

export const defaultSettings = {
  eligibilityIntervalDays: 90,
  rareBloodPrivacyEnabled: true,
  rareBloodGroups: ['AB-', 'B-', 'O-', 'Bombay (hh)'],
  requireHospitalAccessKey: true,
  autoTriageCriticalRequests: true,
  maskedContactEnforced: true,
};

export const getSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Could not read admin settings from localStorage:', e);
  }
  return { ...defaultSettings };
};

export const saveSettings = (newSettings) => {
  try {
    const updated = { ...getSettings(), ...newSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    // Dispatch storage event for live components
    window.dispatchEvent(new Event('bloodbridge_settings_updated'));
    return updated;
  } catch (e) {
    console.warn('Could not save admin settings:', e);
    return newSettings;
  }
};
