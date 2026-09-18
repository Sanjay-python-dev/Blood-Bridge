import { locationData, defaultCountry, defaultState, defaultDistrict } from '../data/locationData';

/**
 * Location Service for BloodBridge
 * Provides dynamic country, state, and district hierarchy lookups.
 * Scales easily to support any future country or administrative subdivision.
 */

export const getCountries = () => {
  return locationData.map((c) => ({
    name: c.country,
    code: c.code,
  }));
};

export const getStates = (countryName = defaultCountry) => {
  const country = locationData.find(
    (c) => c.country.toLowerCase() === countryName.toLowerCase()
  );
  if (!country) return [];
  return country.states.map((s) => ({
    name: s.name,
    code: s.code,
  }));
};

export const getDistricts = (countryName = defaultCountry, stateName = defaultState) => {
  const country = locationData.find(
    (c) => c.country.toLowerCase() === countryName.toLowerCase()
  );
  if (!country) return [];
  const state = country.states.find(
    (s) => s.name.toLowerCase() === stateName.toLowerCase()
  );
  if (!state) return [];
  return state.districts;
};

export const getNearbyDistricts = (districtName) => {
  // Common proximity mapping in Tamil Nadu for fallback search
  const nearbyMap = {
    'Karur': ['Tiruchirappalli', 'Dindigul', 'Namakkal', 'Erode', 'Tiruppur', 'Salem'],
    'Chennai': ['Chengalpattu', 'Tiruvallur', 'Kanchipuram', 'Vellore'],
    'Coimbatore': ['Tiruppur', 'Erode', 'Nilgiris', 'Karur', 'Dindigul'],
    'Madurai': ['Dindigul', 'Virudhunagar', 'Sivaganga', 'Theni', 'Tiruchirappalli'],
    'Tiruchirappalli': ['Karur', 'Thanjavur', 'Pudukkottai', 'Perambalur', 'Dindigul', 'Salem'],
    'Salem': ['Namakkal', 'Erode', 'Dharmapuri', 'Karur', 'Tiruchirappalli'],
    'Erode': ['Karur', 'Coimbatore', 'Tiruppur', 'Salem', 'Namakkal'],
    'Tiruppur': ['Coimbatore', 'Erode', 'Karur', 'Dindigul'],
    'Thanjavur': ['Tiruchirappalli', 'Tiruvarur', 'Nagapattinam', 'Pudukkottai'],
    'Tirunelveli': ['Tenkasi', 'Thoothukudi', 'Virudhunagar', 'Kanniyakumari']
  };

  return nearbyMap[districtName] || ['Tiruchirappalli', 'Coimbatore', 'Karur', 'Chennai'];
};

export { defaultCountry, defaultState, defaultDistrict };
