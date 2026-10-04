import type { UserRole } from '@/types/pdam';

/**
 * Role-based visibility rules (PRD §5).
 *
 * NOTE: This is UI-level enforcement only. As long as data lives in the
 * browser, it is not a security boundary. Real enforcement must move to the
 * API response once the backend phase lands.
 */
export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin Data',
  verifikator: 'Verifikator',
  pimpinan: 'Pimpinan',
};

/** Name, address, exact coordinates, street view. */
export function canSeePII(role?: UserRole | null): boolean {
  return role === 'admin' || role === 'verifikator';
}

export function canExport(role?: UserRole | null): boolean {
  return role === 'admin' || role === 'verifikator';
}

export function canManageData(role?: UserRole | null): boolean {
  return role === 'admin';
}

export function maskName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const [first] = trimmed.split(/\s+/);
  return `${first.charAt(0)}${'•'.repeat(Math.max(3, first.length - 1))}`;
}

export function displayName(name: string, role?: UserRole | null): string {
  return canSeePII(role) ? name : maskName(name);
}

export function maskAddress(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return '-';
  const parts = trimmed.split(',');
  return parts.length > 1 ? `***, ${parts[parts.length - 1].trim()}` : '*** (Dibatasi UU PDP)';
}

export function displayAddress(address: string, role?: UserRole | null): string {
  return canSeePII(role) ? address : maskAddress(address);
}

export function displayCoordinates(lat: number, lng: number, role?: UserRole | null): string {
  if (canSeePII(role)) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
  return `${lat.toFixed(2)}***, ${lng.toFixed(2)}***`;
}
