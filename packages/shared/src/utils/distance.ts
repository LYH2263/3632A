export interface GeoCoord {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(a: GeoCoord, b: GeoCoord): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function isWithinDeliveryRange(
  merchantCoord: GeoCoord | null | undefined,
  buyerCoord: GeoCoord | null | undefined,
  deliveryRadiusKm: number
): { inRange: boolean; distanceKm: number | null } {
  if (!merchantCoord || !buyerCoord || deliveryRadiusKm <= 0) {
    return { inRange: true, distanceKm: null };
  }
  const distanceKm = haversineDistanceKm(merchantCoord, buyerCoord);
  return { inRange: distanceKm <= deliveryRadiusKm, distanceKm };
}

export function formatDistanceKm(distanceKm: number | null): string {
  if (distanceKm === null || distanceKm === undefined) {
    return '';
  }
  if (distanceKm < 1) {
    return `${(distanceKm * 1000).toFixed(0)} 米`;
  }
  return `${distanceKm.toFixed(2)} 公里`;
}

export function isValidLatitude(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function parseCoord(text: string): GeoCoord | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[,，\s]+/).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!isValidLatitude(lat) || !isValidLongitude(lng)) return null;
  return { lat, lng };
}

export function validateDeliveryRadius(km: number): string | null {
  if (!Number.isFinite(km)) return '配送半径必须是数字';
  if (km < 0) return '配送半径不能为负数';
  if (!Number.isInteger(km)) return '配送半径必须是整数公里';
  if (km > 100) return '配送半径不能超过 100 公里';
  return null;
}

export const DELIVERY_RANGE_ERRORS = {
  OUT_OF_RANGE: (distance: number | null, radius: number): string => {
    if (distance !== null) {
      return `超出配送范围：当前距离 ${formatDistanceKm(distance)}，配送半径 ${radius} 公里`;
    }
    return `超出配送范围：配送半径 ${radius} 公里`;
  },
  INVALID_COORD: '坐标格式错误，应为：纬度,经度（例如 39.9042,116.4074）',
  INVALID_RADIUS: '配送半径配置错误'
} as const;
