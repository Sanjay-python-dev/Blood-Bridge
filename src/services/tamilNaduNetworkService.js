import demoData from '../data/bloodbridge_38_districts_demo.json';
import { fictionalHospitalsDataset } from '../data/hospitalsDataset.js';
import { getStoredRequests } from './requestService.js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import districtsSvgData from '../data/tamilNaduDistrictsSvg.json';

/**
 * Standardizes district naming across different datasets, GeoJSON variants, and database entries.
 */
export const CANONICAL_DISTRICT_MAP = {
  'kanniyakumari': 'Kanyakumari',
  'kanyakumari': 'Kanyakumari',
  'the nilgiris': 'Nilgiris',
  'nilgiris': 'Nilgiris',
  'thiruvarur': 'Tiruvarur',
  'tiruvarur': 'Tiruvarur',
  'thiruvallur': 'Tiruvallur',
  'tiruvallur': 'Tiruvallur',
  'tuticorin': 'Thoothukudi',
  'thoothukudi': 'Thoothukudi',
  'villupuram': 'Viluppuram',
  'viluppuram': 'Viluppuram',
  'kanchipuram': 'Kancheepuram',
  'kancheepuram': 'Kancheepuram',
  'trichy': 'Tiruchirappalli',
  'tiruchirappalli': 'Tiruchirappalli',
  'tiruchirapalli': 'Tiruchirappalli',
};

export const normalizeDistrictName = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  const clean = raw.trim().toLowerCase();
  return CANONICAL_DISTRICT_MAP[clean] || raw.trim();
};

/**
 * Heatmap Tier definitions and visual styling tokens.
 */
export const HEATMAP_TIERS = {
  low: {
    key: 'low',
    label: 'Low',
    description: 'Lower donor availability',
    fill: '#381014',
    fillHover: '#52171c',
    stroke: '#6a1d23',
    glow: 'rgba(229, 9, 20, 0.25)',
    badgeBg: 'rgba(64, 16, 20, 0.7)',
    badgeBorder: 'rgba(229, 9, 20, 0.3)',
    badgeText: '#fca5a5',
  },
  medium: {
    key: 'medium',
    label: 'Medium',
    description: 'Moderate donor availability',
    fill: '#6f131a',
    fillHover: '#8e1922',
    stroke: '#9f1d24',
    glow: 'rgba(229, 9, 20, 0.45)',
    badgeBg: 'rgba(111, 19, 26, 0.7)',
    badgeBorder: 'rgba(229, 9, 20, 0.45)',
    badgeText: '#fecaca',
  },
  high: {
    key: 'high',
    label: 'High',
    description: 'High donor availability',
    fill: '#b8141f',
    fillHover: '#d31b27',
    stroke: '#e50914',
    glow: 'rgba(229, 9, 20, 0.65)',
    badgeBg: 'rgba(184, 20, 31, 0.7)',
    badgeBorder: 'rgba(229, 9, 20, 0.6)',
    badgeText: '#fee2e2',
  },
  very_high: {
    key: 'very_high',
    label: 'Very High',
    description: 'Very high donor availability',
    fill: '#ff1e2d',
    fillHover: '#ff424f',
    stroke: '#ff707b',
    glow: 'rgba(255, 30, 45, 0.85)',
    badgeBg: 'rgba(255, 30, 45, 0.35)',
    badgeBorder: 'rgba(255, 30, 45, 0.8)',
    badgeText: '#ffffff',
  },
};

const STANDARD_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/**
 * Compiles a clean, blank stats object for a district.
 */
const createInitialDistrictStat = (name) => {
  const bloodGroups = {};
  STANDARD_BLOOD_GROUPS.forEach((bg) => {
    bloodGroups[bg] = 0;
  });

  return {
    district: name,
    name: name,
    totalDonors: 0,
    availableDonors: 0,
    onCallDonors: 0,
    availabilityRatio: 0,
    tier: 'low',
    bloodGroups,
    availableBloodGroupsList: [],
    topBloodGroup: 'O+',
    activeRequests: 0,
    requestsList: [],
    hospitalsCount: 0,
    hospitalsList: [],
  };
};

/**
 * Evaluates the heatmap tier based on available donors & availability ratio across the state.
 */
const assignHeatmapTiers = (districtMap) => {
  const districts = Object.values(districtMap);
  if (!districts.length) return;

  const availableCounts = districts.map((d) => d.availableDonors);
  const minAvail = Math.min(...availableCounts);
  const maxAvail = Math.max(...availableCounts);
  const range = maxAvail - minAvail || 1;

  districts.forEach((d) => {
    const norm = (d.availableDonors - minAvail) / range;
    if (norm >= 0.75) {
      d.tier = 'very_high';
    } else if (norm >= 0.50) {
      d.tier = 'high';
    } else if (norm >= 0.25) {
      d.tier = 'medium';
    } else {
      d.tier = 'low';
    }

    // Determine available blood groups list with count > 0
    d.availableBloodGroupsList = Object.entries(d.bloodGroups)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([bg]) => bg);

    // Determine top blood group
    if (d.availableBloodGroupsList.length > 0) {
      d.topBloodGroup = d.availableBloodGroupsList[0];
    } else {
      d.topBloodGroup = 'O+';
    }

    d.availabilityRatio = d.totalDonors > 0
      ? Math.round((d.availableDonors / d.totalDonors) * 100)
      : 0;
  });
};

/**
 * Loads and aggregates Tamil Nadu Network Data.
 * 1. Checks Supabase for real live donor & request records.
 * 2. Falls back to verified local 38-district demo dataset if Supabase is offline/empty.
 * 3. Integrates connected hospitals and active blood emergency requests per district.
 */
export const getTamilNaduNetworkData = async () => {
  const districtMap = {};

  // Initialize with all 38 districts from SVG metadata
  districtsSvgData.districts.forEach((d) => {
    districtMap[d.name] = createInitialDistrictStat(d.name);
  });

  let isLiveBackend = false;
  let dataSource = 'Verified System Network';

  // 1. Attempt Supabase live query if configured
  if (isSupabaseConfigured()) {
    try {
      const { data: supaDonors, error: dErr } = await supabase
        .from('donors')
        .select('*');

      if (!dErr && Array.isArray(supaDonors) && supaDonors.length > 0) {
        isLiveBackend = true;
        dataSource = 'Live Cloud Database';

        supaDonors.forEach((d) => {
          const normDist = normalizeDistrictName(d.district || d.city);
          if (normDist && districtMap[normDist]) {
            const stat = districtMap[normDist];
            stat.totalDonors += 1;
            if (d.available) {
              stat.availableDonors += 1;
            } else if (d.emergency_available) {
              stat.onCallDonors += 1;
            }
            if (d.blood_group) {
              stat.bloodGroups[d.blood_group] = (stat.bloodGroups[d.blood_group] || 0) + 1;
            }
          }
        });
      }
    } catch (e) {
      console.warn('Supabase donor fetch fallback:', e);
    }
  }

  // 2. If no live backend donors found, populate from local 38 districts demo dataset
  if (!isLiveBackend) {
    if (demoData && demoData.districts) {
      Object.entries(demoData.districts).forEach(([distName, donors]) => {
        const normDist = normalizeDistrictName(distName);
        if (!districtMap[normDist]) {
          districtMap[normDist] = createInitialDistrictStat(normDist);
        }
        const stat = districtMap[normDist];

        if (Array.isArray(donors)) {
          donors.forEach((d) => {
            stat.totalDonors += 1;
            const isAvail = d.status === 'Available';
            if (isAvail) {
              stat.availableDonors += 1;
            } else {
              stat.onCallDonors += 1;
            }
            if (d.blood_group) {
              stat.bloodGroups[d.blood_group] = (stat.bloodGroups[d.blood_group] || 0) + 1;
            }
          });
        }
      });
    }
  }

  // 3. Attach connected hospitals per district
  if (Array.isArray(fictionalHospitalsDataset)) {
    fictionalHospitalsDataset.forEach((hosp) => {
      const normDist = normalizeDistrictName(hosp.district);
      if (normDist && districtMap[normDist]) {
        districtMap[normDist].hospitalsCount += 1;
        districtMap[normDist].hospitalsList.push({
          id: hosp.id,
          name: hosp.name,
          licenseNumber: hosp.licenseNumber,
          address: hosp.address,
          phone: hosp.contactPhone,
          nodalOfficer: hosp.nodalOfficer,
          inventoryStatus: hosp.inventoryStatus,
        });
      }
    });
  }

  // 4. Attach active blood requests per district
  const storedRequests = getStoredRequests() || [];
  storedRequests.forEach((req) => {
    const normDist = normalizeDistrictName(req.district || req.city);
    if (normDist && districtMap[normDist]) {
      const isPending = req.status !== 'Fulfilled' && req.status !== 'Cancelled';
      if (isPending) {
        districtMap[normDist].activeRequests += 1;
        districtMap[normDist].requestsList.push({
          id: req.id || req.requestCode,
          code: req.requestCode || req.id,
          patientName: req.patientName || req.patient,
          bloodGroup: req.bloodGroup,
          units: req.units || req.requiredUnits || 1,
          hospital: req.hospital || req.hospitalName,
          urgency: req.urgency || 'Urgent',
          requiredDate: req.requiredDate || 'Immediately',
          phone: req.contactPhone || req.hospitalContact,
        });
      }
    }
  });

  // 5. Assign Heatmap Tiers based on calculated distribution
  assignHeatmapTiers(districtMap);

  // 6. Compute Statewide Summary Totals
  const districtList = Object.values(districtMap).sort((a, b) => a.name.localeCompare(b.name));
  const totalRegisteredDonors = districtList.reduce((acc, d) => acc + d.totalDonors, 0);
  const totalAvailableDonors = districtList.reduce((acc, d) => acc + d.availableDonors, 0);
  const totalActiveRequests = districtList.reduce((acc, d) => acc + d.activeRequests, 0);
  const totalHospitals = districtList.reduce((acc, d) => acc + d.hospitalsCount, 0);

  return {
    districts: districtMap,
    districtList: districtList,
    summary: {
      totalDistricts: districtList.length,
      registeredDonors: totalRegisteredDonors,
      availableDonors: totalAvailableDonors,
      activeRequests: totalActiveRequests,
      connectedHospitals: totalHospitals,
      isLiveBackend: isLiveBackend,
      dataSource: dataSource,
    },
    svgMeta: districtsSvgData,
  };
};
