/** One GPS reading. Resolves null if the user denies permission or GPS is off. */
export type GeoPoint = { latitude: number; longitude: number; accuracy: number };

export function getPosition(timeoutMs = 15_000): Promise<GeoPoint | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}

export const GPS_HELP =
  'Location is off. Allow location for this app in your phone settings (and turn on GPS), then try again.';
