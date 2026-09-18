import fs from 'fs';
import path from 'path';
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

async function seedDonors() {
  const { fictionalDonorsDataset } = await import('../src/data/donorsDataset.js');
  console.log(`Loaded ${fictionalDonorsDataset.length} base donors.`);

  // Enrich base donors with latitude, longitude, and required schema fields
  const enriched = fictionalDonorsDataset.map((d, index) => {
    const dist = d.district || 'Karur';
    const center = DISTRICT_COORDS[dist] || DISTRICT_COORDS['Karur'];

    // Specific deterministic offsets yielding realistic distances (2km, 4.5km, 7.2km, 12km, etc.)
    // 1 deg lat ~ 111 km. 0.01 deg ~ 1.11 km.
    const angle = ((index * 47) % 360) * (Math.PI / 180);
    // Spread distances: some close (< 5km), some medium (5-10km), some within 25km, some within 50km
    const distKm = ((index % 12) + 1) * 2.2; // 2.2km, 4.4km, 6.6km, 8.8km, 11km... up to 26.4km
    const latOffset = (distKm / 111) * Math.cos(angle);
    const lngOffset = (distKm / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);

    const lat = Number((center.lat + latOffset).toFixed(6));
    const lng = Number((center.lng + lngOffset).toFixed(6));

    const isAvailable = d.availability === 'Available Now';

    return {
      id: d.id,
      name: d.name,
      blood_group: d.bloodGroup,
      bloodGroup: d.bloodGroup,
      phone: d.fullPhone || d.phone || '+91 98421 11001',
      fullPhone: d.fullPhone || d.phone || '+91 98421 11001',
      contact: d.fullPhone || d.phone || '+91 98421 11001',
      email: d.email || '',
      district: dist,
      city: d.area || dist,
      area: d.area || '',
      state: d.state || 'Tamil Nadu',
      latitude: lat,
      longitude: lng,
      is_available: isAvailable,
      availability: d.availability,
      emergency_available: Boolean(d.emergencyWillingness),
      last_available_at: new Date().toISOString(),
      last_donation_date: d.lastDonationDate || null,
      total_donations: d.totalDonations || 0,
      verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  // Also ensure Tiruppur has donors across all blood groups (since BB-T-01-4E5A is in Tiruppur)
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const tiruppurCenter = DISTRICT_COORDS['Tiruppur'];
  bloodGroups.forEach((bg, idx) => {
    const distKm = 2.1 + (idx * 2.5); // 2.1km, 4.6km, 7.1km, 9.6km, 12.1km, 14.6km, 17.1km, 19.6km
    const angle = (idx * 45) * (Math.PI / 180);
    const latOffset = (distKm / 111) * Math.cos(angle);
    const lngOffset = (distKm / (111 * Math.cos(tiruppurCenter.lat * Math.PI / 180))) * Math.sin(angle);

    enriched.push({
      id: `d-tiruppur-seeded-${idx + 1}`,
      name: `Tiruppur Donor ${bg}`,
      blood_group: bg,
      bloodGroup: bg,
      phone: `+91 98425 ${String(11000 + idx).padStart(5, '0')}`,
      fullPhone: `+91 98425 ${String(11000 + idx).padStart(5, '0')}`,
      contact: `+91 98425 ${String(11000 + idx).padStart(5, '0')}`,
      email: `tiruppur.donor.${bg.toLowerCase().replace('+', 'pos').replace('-', 'neg')}@example.com`,
      district: 'Tiruppur',
      city: 'Tiruppur',
      area: 'Kumaran Road',
      state: 'Tamil Nadu',
      latitude: Number((tiruppurCenter.lat + latOffset).toFixed(6)),
      longitude: Number((tiruppurCenter.lng + lngOffset).toFixed(6)),
      is_available: true,
      availability: 'Available Now',
      emergency_available: true,
      last_available_at: new Date().toISOString(),
      last_donation_date: '2026-03-01',
      total_donations: 5,
      verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  const donorsPath = path.join(__dirname, '../server/data/donors.json');
  fs.writeFileSync(donorsPath, JSON.stringify(enriched, null, 2), 'utf-8');
  console.log(`Saved ${enriched.length} geocoded donors to ${donorsPath}.`);
}

seedDonors().catch(err => {
  console.error('Error seeding donors:', err);
  process.exit(1);
});
