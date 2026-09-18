import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// District Coordinates in Tamil Nadu
const DISTRICT_COORDS = {
  'Ariyalur': { lat: 11.1400, lng: 79.0786 },
  'Chengalpattu': { lat: 12.6825, lng: 79.9836 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Coimbatore': { lat: 11.0168, lng: 76.9558 },
  'Cuddalore': { lat: 11.7480, lng: 79.7714 },
  'Dharmapuri': { lat: 12.1211, lng: 78.1582 },
  'Dindigul': { lat: 10.3673, lng: 77.9803 },
  'Erode': { lat: 11.3410, lng: 77.7172 },
  'Kallakurichi': { lat: 11.7384, lng: 78.9639 },
  'Kancheepuram': { lat: 12.8342, lng: 79.7036 },
  'Kanyakumari': { lat: 8.0883, lng: 77.5385 },
  'Karur': { lat: 10.9601, lng: 78.0766 },
  'Krishnagiri': { lat: 12.5186, lng: 78.2137 },
  'Madurai': { lat: 9.9252, lng: 78.1198 },
  'Mayiladuthurai': { lat: 11.1075, lng: 79.6524 },
  'Nagapattinam': { lat: 10.7672, lng: 79.8449 },
  'Namakkal': { lat: 11.2189, lng: 78.1674 },
  'Nilgiris': { lat: 11.4102, lng: 76.6950 },
  'The Nilgiris': { lat: 11.4102, lng: 76.6950 },
  'Perambalur': { lat: 11.2333, lng: 78.8833 },
  'Pudukkottai': { lat: 10.3797, lng: 78.8208 },
  'Ramanathapuram': { lat: 9.3639, lng: 78.8395 },
  'Ranipet': { lat: 12.9278, lng: 79.3331 },
  'Salem': { lat: 11.6643, lng: 78.1460 },
  'Sivaganga': { lat: 9.8433, lng: 78.4809 },
  'Tenkasi': { lat: 8.9594, lng: 77.3152 },
  'Thanjavur': { lat: 10.7870, lng: 79.1378 },
  'Theni': { lat: 10.0104, lng: 77.4768 },
  'Thoothukudi': { lat: 8.7642, lng: 78.1348 },
  'Tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
  'Tirunelveli': { lat: 8.7139, lng: 77.7567 },
  'Tirupathur': { lat: 12.4925, lng: 78.5678 },
  'Tiruppur': { lat: 11.1085, lng: 77.3411 },
  'Tiruvallur': { lat: 13.1439, lng: 79.9083 },
  'Tiruvannamalai': { lat: 12.2253, lng: 79.0747 },
  'Tiruvarur': { lat: 10.7725, lng: 79.6365 },
  'Vellore': { lat: 12.9165, lng: 79.1325 },
  'Viluppuram': { lat: 11.9401, lng: 79.4861 },
  'Virudhunagar': { lat: 9.5872, lng: 77.9514 }
};

// Known Town/Taluk Coordinates
const TOWN_COORDS = {
  'kulithalai': { lat: 10.9333, lng: 78.4167 },
  'aravakurichi': { lat: 10.7719, lng: 77.9108 },
  'krishnarayapuram': { lat: 10.9333, lng: 78.2833 },
  'manmangalam': { lat: 11.0000, lng: 78.0833 },
  'mylampatti': { lat: 10.8500, lng: 78.1833 },
  'pallapatti': { lat: 10.7667, lng: 77.8833 },
  'avinashi': { lat: 11.1930, lng: 77.2688 },
  'dharapuram': { lat: 10.7300, lng: 77.5300 },
  'kangeyam': { lat: 11.0040, lng: 77.5610 },
  'udumalaipettai': { lat: 10.5833, lng: 77.2500 },
  'madathukulam': { lat: 10.5600, lng: 77.3700 },
  'pollachi': { lat: 10.6583, lng: 77.0083 },
  'mettupalayam': { lat: 11.3000, lng: 76.9500 },
  'sulur': { lat: 11.0270, lng: 77.1260 },
  'tambaram': { lat: 12.9249, lng: 80.1000 },
  'guindy': { lat: 13.0067, lng: 80.2030 },
  'adyar': { lat: 13.0012, lng: 80.2565 },
  'chromepet': { lat: 12.9516, lng: 80.1462 },
  'ambattur': { lat: 13.1143, lng: 80.1548 },
  'poonamallee': { lat: 13.0489, lng: 80.0911 },
  'avadi': { lat: 13.1147, lng: 80.1018 },
  'srirangam': { lat: 10.8600, lng: 78.6900 },
  'thiruverumbur': { lat: 10.7800, lng: 78.7800 },
  'manapparai': { lat: 10.6000, lng: 78.4100 },
  'musiri': { lat: 10.9400, lng: 78.4500 },
  'lalgudi': { lat: 10.8700, lng: 78.8200 },
  'turaiyur': { lat: 11.1000, lng: 78.6000 },
  'attur': { lat: 11.5900, lng: 78.6000 },
  'mettut': { lat: 11.8000, lng: 77.8000 },
  'sankari': { lat: 11.4800, lng: 77.8700 },
  'edappadi': { lat: 11.5800, lng: 77.8500 },
  'omadur': { lat: 11.7500, lng: 78.0500 },
  'hosur': { lat: 12.7409, lng: 77.8253 },
  'denkanikottai': { lat: 12.5200, lng: 77.7800 },
  'pochampalli': { lat: 12.3300, lng: 78.3600 },
  'uthangarai': { lat: 12.2700, lng: 78.5300 },
  'arakkonam': { lat: 13.0800, lng: 79.6700 },
  'arcot': { lat: 12.9000, lng: 79.3300 },
  'walajapet': { lat: 12.9300, lng: 79.3600 },
  'sholinghur': { lat: 13.1100, lng: 79.4200 },
  'gudiyatham': { lat: 12.9500, lng: 78.8700 },
  'katpadi': { lat: 12.9800, lng: 79.1300 },
  'perambalur': { lat: 11.2333, lng: 78.8833 },
  'veppanthattai': { lat: 11.3200, lng: 78.8300 },
  'kunnam': { lat: 11.2400, lng: 79.0200 },
  'sendurai': { lat: 11.2700, lng: 79.1700 },
  'udayarpolayam': { lat: 11.1800, lng: 79.3000 },
  'jayankondam': { lat: 11.2100, lng: 79.3800 },
  'andimadam': { lat: 11.3300, lng: 79.3800 }
};

function getCoordinates(district, location, index) {
  const locLower = (location || '').toLowerCase().trim();
  
  // Check exact town match
  for (const [town, coords] of Object.entries(TOWN_COORDS)) {
    if (locLower.includes(town)) {
      const latOffset = ((index % 5) - 2) * 0.003;
      const lngOffset = (((index * 3) % 5) - 2) * 0.003;
      return {
        lat: Number((coords.lat + latOffset).toFixed(6)),
        lng: Number((coords.lng + lngOffset).toFixed(6))
      };
    }
  }

  // Fallback to district center with deterministic offset
  const distCoords = DISTRICT_COORDS[district] || { lat: 11.1271, lng: 78.6569 };
  const latOffset = ((index % 7) - 3) * 0.006;
  const lngOffset = (((index * 5) % 7) - 3) * 0.006;
  return {
    lat: Number((distCoords.lat + latOffset).toFixed(6)),
    lng: Number((distCoords.lng + lngOffset).toFixed(6))
  };
}

async function seedHospitals() {
  const rawPath = path.join(__dirname, '../server/data/raw_hospitals.json');
  if (!fs.existsSync(rawPath)) {
    console.error('raw_hospitals.json not found! Run python export first.');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
  console.log(`Loaded ${rawData.length} raw hospital records.`);

  // Load existing database if present to preserve custom updates/password changes
  const dbPath = path.join(__dirname, '../server/data/hospitals.json');
  let existingMap = new Map();
  if (fs.existsSync(dbPath)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      for (const h of existingData) {
        existingMap.set(h.user_key, h);
      }
      console.log(`Found ${existingMap.size} existing hospital records in database.`);
    } catch (e) {
      console.warn('Could not parse existing hospitals.json:', e);
    }
  }

  const hospitals = [];
  const saltRounds = 10;

  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    const userKey = item.user_key.trim();
    const existing = existingMap.get(userKey);

    const coords = getCoordinates(item.district, item.location, i);

    let passwordHash;
    if (existing && existing.password_hash) {
      passwordHash = existing.password_hash;
    } else {
      passwordHash = bcrypt.hashSync(item.password, saltRounds);
    }

    const hospitalRecord = {
      id: existing?.id || `hosp-${item.district.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
      district: item.district.trim(),
      hospital_name: item.name.trim(),
      name: item.name.trim(), // Alias for frontend compatibility
      location: item.location.trim(),
      latitude: coords.lat,
      longitude: coords.lng,
      user_key: userKey,
      password_hash: passwordHash,
      is_active: true,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    hospitals.push(hospitalRecord);
  }

  // Verify uniqueness of user_key
  const keys = new Set(hospitals.map(h => h.user_key));
  if (keys.size !== hospitals.length) {
    console.error(`FATAL: Key collision detected! Total: ${hospitals.length}, Unique: ${keys.size}`);
    process.exit(1);
  }

  fs.writeFileSync(dbPath, JSON.stringify(hospitals, null, 2), 'utf-8');
  console.log(`Successfully seeded ${hospitals.length} hospitals into ${dbPath}.`);
  console.log(`All ${keys.size} user keys are 100% unique.`);
  console.log('Sample hospital:', {
    id: hospitals[0].id,
    name: hospitals[0].hospital_name,
    district: hospitals[0].district,
    location: hospitals[0].location,
    user_key: hospitals[0].user_key,
    lat: hospitals[0].latitude,
    lng: hospitals[0].longitude,
    has_hash: Boolean(hospitals[0].password_hash)
  });
}

seedHospitals().catch(err => {
  console.error('Error seeding hospitals:', err);
  process.exit(1);
});
