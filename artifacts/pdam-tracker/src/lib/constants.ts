import type { GolonganTarif, StatusSambungan } from '@/types/pdam';

export const GOLONGAN_LIST: string[] = ['2B', '2A', '3A', '1A', 'R1', 'R2', 'B1', 'S', 'I'];
export const STATUS_LIST: StatusSambungan[] = ['Aktif', 'Nonaktif', 'Putus'];

export const GOLONGAN_META: Record<string, { label: string; color: string }> = {
  '2B': { label: 'Rumah Tangga A', color: '#3B6EA8' },
  '2A': { label: 'Rumah Tangga B', color: '#5B8FC7' },
  '2C': { label: 'Rumah Tangga C', color: '#4F46E5' },
  '3A': { label: 'Niaga Kecil', color: '#8AAFD6' },
  '3B': { label: 'Niaga Besar', color: '#0EA5E9' },
  '1A': { label: 'Sosial Umum', color: '#6B8E7F' },
  '1B': { label: 'Sosial Khusus', color: '#10B981' },
  '4A': { label: 'Instansi / Industri', color: '#A3A3A3' },
  R1: { label: 'Rumah Tangga 1', color: '#3B6EA8' },
  R2: { label: 'Rumah Tangga 2', color: '#5B8FC7' },
  B1: { label: 'Niaga', color: '#8AAFD6' },
  S: { label: 'Sosial', color: '#6B8E7F' },
  I: { label: 'Instansi', color: '#A3A3A3' },
};

export const DEFAULT_GOLONGAN_COLORS = [
  '#3B6EA8', '#5B8FC7', '#8AAFD6', '#6B8E7F', '#D97706', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
];

export const STATUS_META: Record<StatusSambungan, { color: string; tone: 'success' | 'warning' | 'danger' }> = {
  Aktif: { color: '#2F855A', tone: 'success' },
  Nonaktif: { color: '#B7791F', tone: 'warning' },
  Putus: { color: '#C53030', tone: 'danger' },
};

export const STATUS_CONNECTION_META: Record<StatusSambungan, { color: string; badgeClass: string }> = {
  Aktif: { color: '#2F855A', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' },
  Nonaktif: { color: '#B7791F', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400' },
  Putus: { color: '#C53030', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400' },
};

export type QualityFilter = 'all' | 'valid' | 'flagged' | 'anomaly' | 'colocation';

export const QUALITY_LABEL: Record<QualityFilter, string> = {
  all: 'Semua',
  valid: 'Valid',
  flagged: 'Perlu verifikasi',
  anomaly: 'Anomali batas',
  colocation: 'Titik sama beda wilayah',
};

/** PRD §3 target persentase data lolos validasi. */
export const VALIDITY_TARGET = 95;

/** PRD §9 batas ukuran file upload. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const DEFAULT_KECAMATAN = '07';

export function formatNumber(n: number): string {
  return n.toLocaleString('id-ID');
}

export function formatDate(iso?: string, withTime = false): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}
