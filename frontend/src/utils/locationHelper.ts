import { api } from "@/services/api";
import type { User } from "@/types/auth";

export interface DetectedLocationResult {
  district: string;
  state: string;
  city?: string;
  displayName: string;
  lat: number;
  lng: number;
  source: "gps" | "ip" | "profile";
}

const STORAGE_KEY = "krishi_detected_location";

/**
 * Reads cached detected location from localStorage if fresh (< 2 hours).
 */
export function getCachedLocation(): DetectedLocationResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const age = Date.now() - (data.timestamp || 0);
    if (age < 2 * 60 * 60 * 1000) {
      return data;
    }
  } catch {}
  return null;
}

/**
 * Resolves coordinates into an Indian district via backend OpenStreetMap reverse-geocoding.
 */
async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<{ district: string; state: string; city?: string; displayName: string }> {
  try {
    const res = await api.get<{
      data?: {
        district?: string;
        city?: string;
        state?: string;
        displayName?: string;
      };
    }>(`/location/reverse?lat=${lat}&lng=${lng}`);

    const item = res.data;
    const district = item?.district || item?.city || "Maharashtra";
    const state = item?.state || "Maharashtra";
    const displayName = item?.displayName || `${district}, ${state}`;
    return { district, state, city: item?.city, displayName };
  } catch (err) {
    console.warn("Backend reverse geocode fallback:", err);
    return {
      district: "Central Maharashtra",
      state: "Maharashtra",
      displayName: `Coordinates (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
    };
  }
}

/**
 * Obtains geographic coordinates using HTML5 Geolocation, or falls back to IP-based location.
 */
export async function getCoordinates(): Promise<{ lat: number; lng: number; source: "gps" | "ip" }> {
  // 1. Try HTML5 Browser Geolocation
  if (typeof window !== "undefined" && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 4000,
          enableHighAccuracy: true,
          maximumAge: 60000,
        });
      });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        source: "gps",
      };
    } catch (gpsErr: any) {
      console.warn("Device GPS unavailable or permission prompt dismissed, using IP fallback:", gpsErr?.message);
    }
  }

  // 2. Fallback to IP-based Geolocation (ipapi.co or ipwho.is)
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          lat: Number(data.latitude),
          lng: Number(data.longitude),
          source: "ip",
        };
      }
    }
  } catch (ipErr) {
    console.warn("Primary IP location service failed, trying secondary:", ipErr);
  }

  try {
    const res2 = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(3500) });
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.latitude && data2.longitude) {
        return {
          lat: Number(data2.latitude),
          lng: Number(data2.longitude),
          source: "ip",
        };
      }
    }
  } catch (ipErr2) {
    console.warn("Secondary IP location service failed:", ipErr2);
  }

  // Default fallback: Central Maharashtra coordinates
  return {
    lat: 18.5204,
    lng: 73.8567,
    source: "ip",
  };
}

/**
 * Main routine: detects user's location, resolves district, and automatically syncs to profile.
 */
export async function detectAndSyncLocation(
  currentUser?: User | null,
  updateProfileFn?: (data: Partial<User>) => Promise<User>
): Promise<DetectedLocationResult> {
  // If user already has both district and valid coordinates, prioritize profile
  if (currentUser?.district && currentUser?.location?.coordinates?.length === 2) {
    const loc: DetectedLocationResult = {
      district: currentUser.district,
      state: "Maharashtra",
      displayName: `${currentUser.district}, Maharashtra`,
      lat: currentUser.location.coordinates[1],
      lng: currentUser.location.coordinates[0],
      source: "profile",
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loc, timestamp: Date.now() }));
    } catch {}
    return loc;
  }

  // Detect live coordinates
  const { lat, lng, source } = await getCoordinates();
  const rev = await reverseGeocodeCoordinates(lat, lng);

  const result: DetectedLocationResult = {
    district: rev.district,
    state: rev.state,
    city: rev.city,
    displayName: rev.displayName,
    lat,
    lng,
    source,
  };

  // Cache in localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...result, timestamp: Date.now() }));
  } catch {}

  // Sync to database profile if logged in and profile function provided
  if (currentUser && updateProfileFn) {
    try {
      await updateProfileFn({
        district: result.district,
        location: {
          type: "Point",
          coordinates: [result.lng, result.lat],
        },
      });
      console.log(`📍 [LOCATION] Auto-synced user location: ${result.district} (${result.lat.toFixed(2)}, ${result.lng.toFixed(2)}) via ${source}`);
    } catch (saveErr) {
      console.warn("Could not auto-save detected location to profile:", saveErr);
    }
  }

  return result;
}
