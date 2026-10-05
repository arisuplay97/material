import { useCallback, useEffect, useState } from 'react';
import type { GolonganTarif, Pelanggan, StatusSambungan } from '@/types/pdam';
import { DEFAULT_KECAMATAN, GOLONGAN_LIST, GOLONGAN_META, type QualityFilter } from '@/lib/constants';

export interface FilterState {
  kecamatan: string;
  wilayah: string;
  golongan: string;
  status: string;
  quality: QualityFilter;
  q: string;
}

export const DEFAULT_FILTERS: FilterState = {
  kecamatan: DEFAULT_KECAMATAN,
  wilayah: 'all',
  golongan: 'all',
  status: 'all',
  quality: 'all',
  q: '',
};

/** URL query keys — short so links stay readable. */
const QUERY_KEYS: Record<keyof FilterState, string> = {
  kecamatan: 'kec',
  wilayah: 'wil',
  golongan: 'gol',
  status: 'st',
  quality: 'kual',
  q: 'q',
};

const QUALITY_VALUES: QualityFilter[] = ['all', 'valid', 'flagged', 'anomaly'];

function readFiltersFromUrl(): FilterState {
  const params = new URLSearchParams(window.location.search);
  const get = (k: keyof FilterState) => params.get(QUERY_KEYS[k]);
  const quality = get('quality') as QualityFilter | null;
  return {
    kecamatan: get('kecamatan') || DEFAULT_FILTERS.kecamatan,
    wilayah: get('wilayah') || 'all',
    golongan: get('golongan') || 'all',
    status: get('status') || 'all',
    quality: quality && QUALITY_VALUES.includes(quality) ? quality : 'all',
    q: get('q') || '',
  };
}

/** Serialises non-default filters into a query string (without leading "?"). */
export function filtersToQuery(f: FilterState, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  (Object.keys(QUERY_KEYS) as (keyof FilterState)[]).forEach((k) => {
    if (k === 'q') return; // search text is page-local
    if (f[k] !== DEFAULT_FILTERS[k]) params.set(QUERY_KEYS[k], String(f[k]));
  });
  Object.entries(extra).forEach(([k, v]) => params.set(k, v));
  return params.toString();
}

/**
 * Filter state synced to the URL so Dashboard and GIS share the same filters
 * (PRD G-4) and links can be shared.
 */
export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(readFiltersFromUrl);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    (Object.keys(QUERY_KEYS) as (keyof FilterState)[]).forEach((k) => {
      const v = filters[k];
      if (v === DEFAULT_FILTERS[k] || v === '') params.delete(QUERY_KEYS[k]);
      else params.set(QUERY_KEYS[k], String(v));
    });
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', url);
  }, [filters]);

  const update = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      // Wilayah belongs to a kecamatan; reset when the kecamatan changes.
      if (patch.kecamatan !== undefined && patch.kecamatan !== prev.kecamatan && patch.wilayah === undefined) {
        next.wilayah = 'all';
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setFilters((prev) => ({ ...DEFAULT_FILTERS, kecamatan: prev.kecamatan }));
  }, []);

  const activeCount =
    Number(filters.wilayah !== 'all') +
    Number(filters.golongan !== 'all') +
    Number(filters.status !== 'all') +
    Number(filters.quality !== 'all');

  return { filters, update, reset, activeCount };
}

export function filterPelanggan(
  list: Pelanggan[],
  f: FilterState,
  opts: { searchPII: boolean },
): Pelanggan[] {
  const q = f.q.trim().toLowerCase();
  return list.filter((p) => {
    if (f.kecamatan !== 'all' && p.kode_kecamatan !== f.kecamatan) return false;
    if (f.wilayah !== 'all' && p.kode_wilayah !== f.wilayah) return false;
    if (f.golongan !== 'all' && p.golongan !== f.golongan) return false;
    if (f.status !== 'all' && p.status_sambungan !== f.status) return false;
    if (f.quality === 'valid' && p.is_flagged) return false;
    if (f.quality === 'flagged' && !p.is_flagged) return false;
    if (f.quality === 'anomaly' && !p.spatial_anomaly) return false;
    if (q) {
      const hit =
        p.kode_pelanggan.includes(q) ||
        p.nama_wilayah.toLowerCase().includes(q) ||
        (opts.searchPII && (p.nama_pelanggan.toLowerCase().includes(q) || p.alamat.toLowerCase().includes(q)));
      if (!hit) return false;
    }
    return true;
  });
}

export interface PelangganStats {
  total: number;
  aktif: number;
  nonaktif: number;
  putus: number;
  flagged: number;
  anomaly: number;
  valid: number;
  validityPct: number;
  golongan: Record<string, number>;
  golonganLabels: Record<string, string>;
  status: Record<StatusSambungan, number>;
  perWilayah: Map<string, { total: number; flagged: number }>;
  flagReasons: Map<string, number>;
}

/** Single pass over the data (previously six separate filter() calls). */
export function computeStats(list: Pelanggan[]): PelangganStats {
  const golongan: Record<string, number> = {};
  const golonganLabels: Record<string, string> = {};
  const status: Record<StatusSambungan, number> = { Aktif: 0, Nonaktif: 0, Putus: 0 };
  const perWilayah = new Map<string, { total: number; flagged: number }>();
  const flagReasons = new Map<string, number>();
  let flagged = 0;
  let anomaly = 0;

  for (const p of list) {
    const g = p.golongan || 'Lainnya';
    golongan[g] = (golongan[g] || 0) + 1;
    if (p.uraian_golongan && !golonganLabels[g]) {
      golonganLabels[g] = p.uraian_golongan;
    } else if (!golonganLabels[g] && GOLONGAN_META[g]?.label) {
      golonganLabels[g] = GOLONGAN_META[g].label;
    }

    if (p.status_sambungan in status) status[p.status_sambungan]++;
    const w = perWilayah.get(p.kode_wilayah) || { total: 0, flagged: 0 };
    w.total++;
    if (p.is_flagged) {
      flagged++;
      w.flagged++;
      for (const reason of p.flag_reasons) {
        // Group the long dynamic anomaly messages under one bucket.
        const key = reason === p.spatial_anomaly ? 'Koordinat di luar batas kecamatan' : reason;
        flagReasons.set(key, (flagReasons.get(key) || 0) + 1);
      }
    }
    if (p.spatial_anomaly) anomaly++;
    perWilayah.set(p.kode_wilayah, w);
  }

  const total = list.length;
  return {
    total,
    aktif: status.Aktif,
    nonaktif: status.Nonaktif,
    putus: status.Putus,
    flagged,
    anomaly,
    valid: total - flagged,
    validityPct: total ? ((total - flagged) / total) * 100 : 100,
    golongan,
    golonganLabels,
    status,
    perWilayah,
    flagReasons,
  };
}
