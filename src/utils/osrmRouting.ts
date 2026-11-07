export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface OsrmRouteResult {
  coordinates: [number, number][]; // [lat, lng][]
  distanceKm: number;
  durationMinutes: number;
}

/**
 * Gọi OSRM (Open Source Routing Machine) để lấy tọa độ bám sát mặt đường thực tế (Street-snapped Geometry)
 * giữa danh sách các điểm (Ví dụ: Shipper -> Gánh Ngoại -> Khách hàng).
 */
export async function fetchOsrmRoadRoute(waypoints: LatLngPoint[]): Promise<OsrmRouteResult | null> {
  if (!waypoints || waypoints.length < 2) return null;

  try {
    const coordString = waypoints
      .map((pt) => `${pt.lng.toFixed(6)},${pt.lat.toFixed(6)}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route || !route.geometry?.coordinates) return null;

    // GeoJSON trả về [lng, lat], cần đảo lại thành [lat, lng] cho Leaflet Polyline
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    const distanceKm = Number(((route.distance || 0) / 1000).toFixed(2));
    const durationMinutes = Math.max(1, Math.round((route.duration || 0) / 60));

    return {
      coordinates,
      distanceKm,
      durationMinutes,
    };
  } catch (err) {
    console.warn('OSRM routing fallback:', err);
    return null;
  }
}
