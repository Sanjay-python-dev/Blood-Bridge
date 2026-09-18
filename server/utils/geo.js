/**
 * Geographic utilities for Blood Bridge
 * Calculates Haversine distance between two geographic coordinates in kilometers.
 */

export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return Infinity;
  }

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Number(distance.toFixed(1));
}

/**
 * Filters and sorts donors near a reference point
 */
export function findNearbyDonors({
  donors,
  refLat,
  refLng,
  radiusKm = 25,
  bloodGroup = null,
  onlyAvailable = true
}) {
  const radius = Number(radiusKm) || 25;
  const targetGroup = bloodGroup && bloodGroup !== 'All' && bloodGroup !== 'All Groups' ? bloodGroup : null;

  const matches = [];

  for (const donor of donors) {
    if (onlyAvailable && !donor.is_available) {
      continue;
    }

    if (targetGroup && donor.blood_group !== targetGroup && donor.bloodGroup !== targetGroup) {
      continue;
    }

    const dist = haversineDistanceKm(refLat, refLng, donor.latitude, donor.longitude);
    if (dist <= radius) {
      matches.push({
        ...donor,
        distanceKm: dist,
        distanceFormatted: `${dist} km`
      });
    }
  }

  // Sort by nearest distance first
  matches.sort((a, b) => a.distanceKm - b.distanceKm);

  return matches;
}
