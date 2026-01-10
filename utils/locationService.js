import * as Location from 'expo-location';

/**
 * Get user's current GPS location and verify it
 * @returns {Promise<{location: string, latitude: number, longitude: number, verified: boolean}>}
 */
export async function getVerifiedLocation() {
  try {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Get current position with high accuracy
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      maximumAge: 10000, // Cache for 10 seconds
    });

    const { latitude, longitude } = location.coords;

    // Reverse geocode to get address
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      const locality =
        address.district ||
        address.subregion ||
        address.subLocality ||
        address.neighborhood ||
        address.city ||
        address.subAdministrativeArea;

      const city = address.city || address.subAdministrativeArea;

      // Only include locality and city (exclude state and country)
      const parts = [locality, city].filter(Boolean);
      // Remove duplicates if locality and city are the same
      const uniqueParts = [...new Set(parts)];
      const locationString = uniqueParts.join(', ');

      return {
        location: locationString,
        latitude,
        longitude,
        verified: true,
        address: address,
      };
    }

    // Fallback if reverse geocoding fails
    return {
      location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      latitude,
      longitude,
      verified: true,
    };
  } catch (error) {
    console.error('Location error:', error);
    throw error;
  }
}

/**
 * Verify if provided location matches GPS coordinates
 * @param {string} claimedLocation - User's claimed location
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @returns {Promise<boolean>}
 */
export async function verifyLocation(claimedLocation, latitude, longitude) {
  try {
    if (!latitude || !longitude) {
      return false;
    }

    // Get address from coordinates
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (!addresses || addresses.length === 0) {
      return false;
    }

    const address = addresses[0];
    const locationString = [
      address.city || address.subAdministrativeArea,
      address.region || address.administrativeArea,
      address.country,
    ]
      .filter(Boolean)
      .join(', ');

    // Check if claimed location matches or contains parts of the verified location
    const claimedLower = claimedLocation.toLowerCase();
    const verifiedLower = locationString.toLowerCase();

    // Check if city, region, or country matches
    const cityMatch = address.city && claimedLower.includes(address.city.toLowerCase());
    const regionMatch = address.region && claimedLower.includes(address.region.toLowerCase());
    const countryMatch = address.country && claimedLower.includes(address.country.toLowerCase());

    return cityMatch || regionMatch || countryMatch || verifiedLower.includes(claimedLower);
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}


