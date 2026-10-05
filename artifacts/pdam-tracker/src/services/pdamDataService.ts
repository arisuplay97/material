import { Pelanggan, WilayahAcuan, UploadSnapshot, GolonganTarif, StatusSambungan } from '@/types/pdam';
import { sanitizeSpreadsheetCell } from '@/lib/escape';

type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

// ── Bounding box kasar per kecamatan untuk deteksi anomali spasial ──
// NOTE: kotak-kotak ini saling tumpang tindih. Ganti dengan poligon resmi
// (Geoportal BIG/BPS) + uji point-in-polygon pada fase backend.
// PENTING: Batas-batas ini sudah dikalibrasi ulang agar TIDAK saling tumpang-tindih
// secara berlebihan, khususnya antara Praya Barat (07) dan Kota Praya (01).
// Referensi: titik pusat desa terluar dari DEFAULT_WILAYAH_LIST + peta OSM.
export const KECAMATAN_BOUNDS: Record<string, Bounds> = {
  '01': { minLat: -8.735, maxLat: -8.66, minLng: 116.265, maxLng: 116.32 }, // Praya (kota)
  '02': { minLat: -8.66, maxLat: -8.56, minLng: 116.27, maxLng: 116.36 }, // Batukliang
  '03': { minLat: -8.68, maxLat: -8.58, minLng: 116.32, maxLng: 116.42 }, // Kopang
  '04': { minLat: -8.74, maxLat: -8.65, minLng: 116.36, maxLng: 116.46 }, // Janapria
  '05': { minLat: -8.82, maxLat: -8.72, minLng: 116.32, maxLng: 116.44 }, // Praya Timur
  '06': { minLat: -8.96, maxLat: -8.75, minLng: 116.265, maxLng: 116.36 }, // Pujut (Tanak Awu, Sengkol, Rembitan)
  '07': { minLat: -8.86, maxLat: -8.705, minLng: 116.12, maxLng: 116.266 }, // Praya Barat (selatan: Selong Belanak/Lolat, utara: Belemong/Penujak, timur: Batujai/Kr. Daye)
  '08': { minLat: -8.67, maxLat: -8.56, minLng: 116.20, maxLng: 116.29 }, // Pringgarata
  '09': { minLat: -8.96, maxLat: -8.86, minLng: 116.24, maxLng: 116.35 }, // Kuta (pesisir selatan Pujut/Kuta)
  '10': { minLat: -8.58, maxLat: -8.45, minLng: 116.26, maxLng: 116.40 }, // Batukliang Utara
  '11': { minLat: -8.745, maxLat: -8.65, minLng: 116.275, maxLng: 116.36 }, // Praya Tengah (Batunyala, Kelebuh, Sasake)
  '12': { minLat: -8.700, maxLat: -8.62, minLng: 116.16, maxLng: 116.26 }, // Jonggat (Sukarara, Puyung, Ubung)
  '13': { minLat: -8.92, maxLat: -8.74, minLng: 116.08, maxLng: 116.19 }, // Praya Barat Daya (Darek, Pelambik)
};

/** Batas kasar area layanan (Pulau Lombok). */
export const SERVICE_AREA_BOUNDS: Bounds = { minLat: -9.12, maxLat: -8.18, minLng: 115.82, maxLng: 116.75 };

export function isInBounds(lat: number, lng: number, b: Bounds): boolean {
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}

export function boundsCenter(b: Bounds): [number, number] {
  return [(b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2];
}

// ── Master kecamatan registry ──
export interface KecamatanInfo {
  kode: string;
  nama: string;
}

export const KECAMATAN_LIST: KecamatanInfo[] = [
  { kode: '01', nama: 'Praya' },
  { kode: '02', nama: 'Batukliang' },
  { kode: '03', nama: 'Kopang' },
  { kode: '04', nama: 'Janapria' },
  { kode: '05', nama: 'Praya Timur' },
  { kode: '06', nama: 'Pujut' },
  { kode: '07', nama: 'Praya Barat' },
  { kode: '08', nama: 'Pringgarata' },
  { kode: '09', nama: 'Kuta' },
  { kode: '10', nama: 'Batukliang Utara' },
  { kode: '11', nama: 'Praya Tengah' },
  { kode: '12', nama: 'Jonggat' },
  { kode: '13', nama: 'Praya Barat Daya' },
];

export function kecamatanName(kode: string): string {
  return KECAMATAN_LIST.find((k) => k.kode === kode)?.nama || kode;
}

// ── 20 Acuan Wilayah Resmi Kecamatan 07 (Praya Barat) Sesuai PRD v1.2 ──
export const DEFAULT_WILAYAH_LIST: WilayahAcuan[] = [
  { kode: '0701', nama: 'Karang Dalam', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#EF4444', centerLat: -8.7892, centerLng: 116.2198 },
  { kode: '0702', nama: 'Kateng', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#10B981', centerLat: -8.8251, centerLng: 116.1952 },
  { kode: '0703', nama: 'Gabak', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#F59E0B', centerLat: -8.7615, centerLng: 116.2284 },
  { kode: '0704', nama: 'Bonder', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#3B82F6', centerLat: -8.7753, centerLng: 116.2051 },
  { kode: '0706', nama: 'BTN Salva Batujai', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#8B5CF6', centerLat: -8.7368, centerLng: 116.2554 },
  { kode: '0709', nama: 'Penujak', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#EC4899', centerLat: -8.7452, centerLng: 116.2415 },
  { kode: '0710', nama: 'Karang Daye', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#14B8A6', centerLat: -8.7941, centerLng: 116.2287 },
  { kode: '0712', nama: 'Kebonre', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#F97316', centerLat: -8.7523, centerLng: 116.2165 },
  { kode: '0717', nama: 'Batujai', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#6366F1', centerLat: -8.7312, centerLng: 116.2621 },
  { kode: '0720', nama: 'Wage', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#06B6D4', centerLat: -8.8105, centerLng: 116.2403 },
  { kode: '0721', nama: 'Tongkik', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#84CC16', centerLat: -8.8354, centerLng: 116.2152 },
  { kode: '0722', nama: 'Dandung', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#A855F7', centerLat: -8.7681, centerLng: 116.1824 },
  { kode: '0723', nama: 'Ketangge', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#EAB308', centerLat: -8.8023, centerLng: 116.1742 },
  { kode: '0725', nama: 'KR Puntik', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#0EA5E9', centerLat: -8.8182, centerLng: 116.1856 },
  { kode: '0726', nama: 'Jomang', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#D946EF', centerLat: -8.7618, centerLng: 116.1927 },
  { kode: '0727', nama: 'Batu Lajang', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#64748B', centerLat: -8.8142, centerLng: 116.1623 },
  { kode: '0728', nama: 'Lakah', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#475569', centerLat: -8.8284, centerLng: 116.1718 },
  { kode: '0729', nama: 'Montor', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#22C55E', centerLat: -8.7801, centerLng: 116.1812 },
  { kode: '0730', nama: 'Lolat', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#E11D48', centerLat: -8.8412, centerLng: 116.1895 },
  { kode: '0732', nama: 'Kentawang - SL Paok', kodeKecamatan: '07', namaKecamatan: 'Praya Barat', warna: '#7C3AED', centerLat: -8.8402, centerLng: 116.1685 },
];

const STORAGE_KEYS = {
  WILAYAH: 'pdam_tiara_wilayah_v1',
  PELANGGAN: 'pdam_tiara_pelanggan_v1',
  SNAPSHOTS: 'pdam_tiara_snapshots_v1',
  ACTIVE_SNAPSHOT_ID: 'pdam_tiara_active_snapshot_id_v1',
  ARCHIVE_PREFIX: 'pdam_tiara_snapshot_data_v1:',
};

/** Jumlah maksimum arsip data snapshot yang disimpan untuk rollback. */
const MAX_ARCHIVES = 5;

/** Seed snapshot IDs from earlier builds (demo data, not real uploads). */
const LEGACY_DEMO_IDS = new Set(['snap-2026-10-01-1400', 'snap-2026-09-18-1030']);

export class StorageQuotaError extends Error {
  constructor() {
    super(
      'Penyimpanan browser penuh. Data terlalu besar untuk mode lokal; fase backend diperlukan untuk dataset ini.',
    );
    this.name = 'StorageQuotaError';
  }
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22)
  );
}

function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (err) {
    if (isQuotaError(err)) throw new StorageQuotaError();
    throw err;
  }
}

// ── Spatial anomaly check: does the coordinate sit inside its kecamatan's bounds? ──
export function checkSpatialAnomaly(pelanggan: Pick<Pelanggan, 'kode_kecamatan' | 'latitude' | 'longitude'>): string | null {
  const kodeKec = pelanggan.kode_kecamatan;
  const bounds = KECAMATAN_BOUNDS[kodeKec];
  if (!bounds) return null; // unknown kecamatan, skip check

  const { latitude, longitude } = pelanggan;

  let isInside = isInBounds(latitude, longitude, bounds);

  // Periksa batas mikro spesifik Praya Barat (07):
  if (kodeKec === '07' && isInside) {
    // 1. Batas Tenggara (Pujut / Tanak Awu):
    // Di selatan lat -8.770, wilayah di timur lng 116.265 adalah wilayah Kecamatan Pujut (Tanak Awu & Sengkol).
    // Wilayah Karang Daye / Penujak barat bandara (lat > -8.770, lng <= 116.265) tetap sah Praya Barat.
    if (latitude < -8.770 && longitude > 116.265) {
      isInside = false;
    }
    // 2. Batas Timur Laut (Kota Praya / Renteng):
    // Di utara lat -8.725, koordinat di timur lng 116.265 sudah masuk wilayah Kota Praya (Renteng / Tiwugalih).
    // Batujai & BTN Salva (lng <= 116.265) tetap sah Praya Barat.
    if (latitude > -8.725 && longitude > 116.265) {
      isInside = false;
    }
  }

  if (isInside) return null;

  // Boxes overlap, so pick the containing kecamatan whose center is nearest
  // instead of the first match.
  let foundKec: string | null = null;
  let bestDist = Infinity;
  for (const [kec, b] of Object.entries(KECAMATAN_BOUNDS)) {
    if (kec === kodeKec) continue; // Jangan bandingkan dengan kecamatan asal yang sudah terbukti di luar batas
    if (!isInBounds(latitude, longitude, b)) continue;
    const [cLat, cLng] = boundsCenter(b);
    const dist = (latitude - cLat) ** 2 + (longitude - cLng) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      foundKec = kec;
    }
  }

  const kecNama = kecamatanName(kodeKec);
  if (foundKec) {
    return `Kode pelanggan Kec. ${kecNama} (${kodeKec}) tapi koordinat berada di area Kec. ${kecamatanName(foundKec)} (${foundKec})`;
  }
  return `Koordinat di luar batas wajar Kec. ${kecNama} (${kodeKec})`;
}

/** Recomputes spatial anomaly and keeps flag_reasons consistent. Returns true if changed. */
export function refreshAnomaly(p: Pelanggan): boolean {
  const next = checkSpatialAnomaly(p);
  if (next === p.spatial_anomaly) return false;
  const reasons = (p.flag_reasons || []).filter((r) => r !== p.spatial_anomaly);
  if (next) reasons.push(next);
  p.flag_reasons = reasons;
  p.spatial_anomaly = next;
  p.is_flagged = reasons.length > 0;
  return true;
}

/**
 * Deteksi anomali ko-lokasi: 1 titik koordinat (akurasi ~1 meter) yang dipakai
 * oleh pelanggan di beberapa kode_wilayah berbeda.
 */
export function detectColocationAnomalies(pelangganList: Pelanggan[]): boolean {
  let changed = false;
  const coordGroups = new Map<string, Pelanggan[]>();

  for (const p of pelangganList) {
    if (
      typeof p.latitude === 'number' &&
      typeof p.longitude === 'number' &&
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude)
    ) {
      const key = `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
      let list = coordGroups.get(key);
      if (!list) {
        list = [];
        coordGroups.set(key, list);
      }
      list.push(p);
    }
  }

  for (const p of pelangganList) {
    let nextColoc: string | null = null;
    if (
      typeof p.latitude === 'number' &&
      typeof p.longitude === 'number' &&
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude)
    ) {
      const key = `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
      const group = coordGroups.get(key);
      if (group && group.length > 1) {
        const distinctWilayah = Array.from(
          new Set(group.map((item) => item.kode_wilayah || item.kode_pelanggan?.slice(0, 4) || ''))
        ).filter(Boolean);

        if (distinctWilayah.length > 1) {
          const names = Array.from(new Set(group.map((item) => item.nama_wilayah || item.kode_wilayah))).filter(Boolean);
          nextColoc = `Titik koordinat (${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}) dipakai di ${distinctWilayah.length} wilayah berbeda: ${names.join(', ')}`;
        }
      }
    }

    if (p.colocation_anomaly !== nextColoc) {
      changed = true;
      const reasons = (p.flag_reasons || []).filter((r) => r !== p.colocation_anomaly);
      if (nextColoc) reasons.push(nextColoc);
      p.flag_reasons = reasons;
      p.colocation_anomaly = nextColoc;
      p.is_flagged = reasons.length > 0;
    }
  }

  return changed;
}

// ── Realistic seed customer generator for Praya Barat (DEMO ONLY) ──
function generateSeedPelanggan(): Pelanggan[] {
  const pelangganList: Pelanggan[] = [];
  const golongans: GolonganTarif[] = ['R1', 'R2', 'R2', 'R2', 'R1', 'B1', 'S', 'I'];
  const statuses: StatusSambungan[] = ['Aktif', 'Aktif', 'Aktif', 'Aktif', 'Aktif', 'Nonaktif', 'Putus'];

  const sampleNames = [
    'Ahmad Zulkifli', 'Baiq Nurul Aini', 'Lalu Muhammad Ridwan', 'H. Suwardi', 'Siti Maryam',
    'Lalu Samsul Hadi', 'Baiq Ratna Sari', 'M. Fadli Rahman', 'I Nyoman Sudarta', 'H. M. Taufik',
    'Baiq Salmah', 'Lalu Husnul Hakim', 'Zaenuddin', 'Fatmawati', 'Lalu Kamaruddin',
    'Baiq Mulyani', 'Syamsuri', 'Hj. Rohani', 'Lalu Suparman', 'Nurhidayati',
    'Lalu Wardani', 'Baiq Indah Permata', 'H. Ismail Marzuki', 'Hasan Basri', 'Baiq Rohana',
    'Lalu Hamzanwadi', 'Mustafa Kamal', 'Baiq Asmah', 'Sukran', 'Lalu Danial',
    'Suhartini', 'Lalu Gunawan', 'Baiq Rohmatin', 'Amrullah', 'Lalu Faisal'
  ];

  const dusunNames = [
    'Dusun Karang Anyar', 'Dusun Timur Daye', 'Dusun Dasan Baru', 'Dusun Montong Gedeng',
    'Dusun Batu Bolong', 'Dusun Karang Bangket', 'Dusun Reak', 'Dusun Tengak Lauk',
    'Dusun Salva', 'Dusun Penujak Lauq', 'Dusun Karang Tanggor', 'Dusun Batu Jangkih'
  ];

  let counter = 1;

  DEFAULT_WILAYAH_LIST.forEach((wilayah, wIdx) => {
    const count = 28 + ((wIdx * 7) % 18);
    for (let i = 1; i <= count; i++) {
      const padNum = String(counter).padStart(5, '0');
      const kodePelanggan = `${wilayah.kode}${padNum}`;
      const name = `${sampleNames[(counter + i) % sampleNames.length]} ${i > 20 ? (i % 5 + 1) : ''}`.trim();
      const dusun = dusunNames[(counter + i) % dusunNames.length];
      const golongan = golongans[(counter + i * 3) % golongans.length];
      const status = statuses[(counter + i * 5) % statuses.length];

      const latOffset = (Math.sin(counter * 12.9898 + i) * 0.008) + (Math.cos(i * 4.12) * 0.004);
      const lngOffset = (Math.cos(counter * 78.233 + i) * 0.009) + (Math.sin(i * 3.14) * 0.005);

      let lat = Number((wilayah.centerLat + latOffset).toFixed(6));
      let lng = Number((wilayah.centerLng + lngOffset).toFixed(6));

      // Intentionally place ~3% of demo customers at coordinates that drift into another kecamatan
      // to demonstrate the spatial anomaly detection
      const isSpatialAnomaly = counter % 31 === 0;
      if (isSpatialAnomaly) {
        lat = Number((-8.68 + (Math.sin(counter) * 0.03)).toFixed(6));
        lng = Number((116.22 + (Math.cos(counter) * 0.04)).toFixed(6));
      }

      const flagReasons: string[] = [];
      if (counter % 29 === 0) flagReasons.push('Koordinat perlu verifikasi lapangan');
      if (counter % 47 === 0) flagReasons.push('Nama pemakai berbeda dengan arsip');

      const record: Pelanggan = {
        id: kodePelanggan,
        kode_pelanggan: kodePelanggan,
        nama_pelanggan: name,
        alamat: `${dusun}, RT 0${(i % 4) + 1} / RW 0${(i % 2) + 1}, Ds. ${wilayah.nama}, Kec. Praya Barat`,
        kode_kecamatan: '07',
        kode_wilayah: wilayah.kode,
        nama_wilayah: wilayah.nama,
        golongan,
        status_sambungan: status,
        latitude: lat,
        longitude: lng,
        is_flagged: flagReasons.length > 0,
        flag_reasons: flagReasons,
        spatial_anomaly: null,
        colocation_anomaly: null,
        nomor_meter: `WM-${wilayah.kode}-${String(1000 + i)}`,
        tanggal_pasang: `202${(counter % 4) + 2}-0${(i % 9) + 1}-1${(i % 8) + 1}`,
      };

      refreshAnomaly(record);
      pelangganList.push(record);
      counter++;
    }
  });

  // Demo co-location conflict: introduce deliberate overlap between different wilayah
  if (pelangganList.length > 40) {
    const p1 = pelangganList.find((p) => p.kode_wilayah === '0701');
    const p2 = pelangganList.find((p) => p.kode_wilayah === '0702');
    if (p1 && p2) {
      p2.latitude = p1.latitude;
      p2.longitude = p1.longitude;
    }
  }
  detectColocationAnomalies(pelangganList);

  return pelangganList;
}

function buildInitialSnapshots(seed: Pelanggan[]): UploadSnapshot[] {
  const flagged = seed.filter((p) => p.is_flagged).length;
  return [
    {
      id: 'snap-demo-2026-10-01',
      filename: 'Data_Demo_Praya_Barat.xlsx',
      uploaded_at: '2026-10-01T14:00:00+08:00',
      uploader_name: 'Sistem (data demo)',
      uploader_role: 'Demo',
      total_rows: seed.length,
      valid_rows: seed.length - flagged,
      flagged_rows: flagged,
      error_rows: 0,
      mode: 'replace',
      is_active: true,
      is_demo: true,
      notes: 'Data contoh untuk evaluasi. Upload file asli di menu Pengaturan untuk menggantinya.',
    },
  ];
}

function newSnapshotId(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6);
  return `snap-${stamp}-${rand}`;
}

export type RestoreResult = { ok: true } | { ok: false; reason: string };

class PdamDataService {
  private wilayah: WilayahAcuan[] = [];
  private pelanggan: Pelanggan[] = [];
  private snapshots: UploadSnapshot[] = [];
  private activeSnapshotId = '';
  private archivedIds = new Set<string>();
  private listeners = new Set<() => void>();
  private version = 0;

  constructor() {
    this.init();
  }

  private init() {
    try {
      const storedWilayah = localStorage.getItem(STORAGE_KEYS.WILAYAH);
      this.wilayah = storedWilayah ? JSON.parse(storedWilayah) : [...DEFAULT_WILAYAH_LIST];

      let migrated = false;
      const storedPelanggan = localStorage.getItem(STORAGE_KEYS.PELANGGAN);
      if (storedPelanggan) {
        this.pelanggan = JSON.parse(storedPelanggan);
        // Schema migration only — never touch coordinates or other real data.
        for (const p of this.pelanggan) {
          if (!p.kode_kecamatan) {
            p.kode_kecamatan = p.kode_pelanggan?.slice(0, 2) || '07';
            migrated = true;
          }
          if (!Array.isArray(p.flag_reasons)) {
            p.flag_reasons = [];
            migrated = true;
          }
          if (refreshAnomaly(p)) migrated = true;
        }
        if (detectColocationAnomalies(this.pelanggan)) migrated = true;
      } else {
        this.pelanggan = generateSeedPelanggan();
      }

      const storedSnapshots = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
      this.snapshots = storedSnapshots ? JSON.parse(storedSnapshots) : buildInitialSnapshots(this.pelanggan);
      this.snapshots = this.snapshots.map((s) => (LEGACY_DEMO_IDS.has(s.id) ? { ...s, is_demo: true } : s));

      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SNAPSHOT_ID);
      this.activeSnapshotId =
        (activeId && this.snapshots.some((s) => s.id === activeId) ? activeId : '') ||
        this.snapshots.find((s) => s.is_active)?.id ||
        this.snapshots[0]?.id ||
        '';

      this.scanArchives();

      if (migrated) {
        this.safePersist(STORAGE_KEYS.PELANGGAN, this.pelanggan);
        const activeSnap = this.snapshots.find((s) => s.id === this.activeSnapshotId);
        if (activeSnap) {
          const flagged = this.pelanggan.filter((p) => p.is_flagged).length;
          activeSnap.flagged_rows = flagged;
          activeSnap.valid_rows = this.pelanggan.length - flagged;
          this.persistSnapshotMeta();
        }
      }

      if (!storedWilayah) this.safePersist(STORAGE_KEYS.WILAYAH, this.wilayah);
      if (!storedPelanggan) this.safePersist(STORAGE_KEYS.PELANGGAN, this.pelanggan);
      if (!storedSnapshots) this.persistSnapshotMeta();

      // Make sure the active dataset is archived so it can be restored later.
      if (this.activeSnapshotId && !this.archivedIds.has(this.activeSnapshotId)) {
        this.tryArchive(this.activeSnapshotId, this.pelanggan);
      }
    } catch (err) {
      console.error('Error initializing PdamDataService:', err);
      this.wilayah = [...DEFAULT_WILAYAH_LIST];
      this.pelanggan = generateSeedPelanggan();
      this.snapshots = buildInitialSnapshots(this.pelanggan);
      this.activeSnapshotId = this.snapshots[0]?.id || '';
    }
  }

  // ── Subscription (useSyncExternalStore compatible) ──
  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getVersion = (): number => this.version;

  private notify() {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }

  // ── Persistence helpers ──
  private safePersist(key: string, value: unknown): boolean {
    try {
      writeStorage(key, value);
      return true;
    } catch (err) {
      console.error(`Gagal menyimpan ${key}:`, err);
      return false;
    }
  }

  private persistSnapshotMeta() {
    this.safePersist(STORAGE_KEYS.SNAPSHOTS, this.snapshots);
    this.safePersist(STORAGE_KEYS.ACTIVE_SNAPSHOT_ID, this.activeSnapshotId);
  }

  private scanArchives() {
    this.archivedIds.clear();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEYS.ARCHIVE_PREFIX)) {
        this.archivedIds.add(key.slice(STORAGE_KEYS.ARCHIVE_PREFIX.length));
      }
    }
  }

  private archiveKey(id: string) {
    return STORAGE_KEYS.ARCHIVE_PREFIX + id;
  }

  private removeArchive(id: string) {
    localStorage.removeItem(this.archiveKey(id));
    this.archivedIds.delete(id);
  }

  /** Oldest non-active archives first. */
  private prunableArchiveIds(): string[] {
    return this.snapshots
      .filter((s) => this.archivedIds.has(s.id) && s.id !== this.activeSnapshotId)
      .sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at))
      .map((s) => s.id);
  }

  private enforceArchiveLimit() {
    const prunable = this.prunableArchiveIds();
    while (this.archivedIds.size > MAX_ARCHIVES && prunable.length) {
      this.removeArchive(prunable.shift()!);
    }
  }

  /** Writes with automatic pruning of old archives on quota errors. */
  private writeWithPruning(key: string, value: unknown) {
    const prunable = this.prunableArchiveIds();
    for (;;) {
      try {
        writeStorage(key, value);
        return;
      } catch (err) {
        if (!(err instanceof StorageQuotaError) || prunable.length === 0) throw err;
        this.removeArchive(prunable.shift()!);
      }
    }
  }

  private tryArchive(id: string, data: Pelanggan[]): boolean {
    try {
      this.writeWithPruning(this.archiveKey(id), data);
      this.archivedIds.add(id);
      return true;
    } catch (err) {
      console.warn('Arsip snapshot tidak dapat disimpan:', err);
      return false;
    }
  }

  // ── Public API ──
  public resetAllData() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    Array.from(this.archivedIds).forEach((id) => this.removeArchive(id));
    this.wilayah = [...DEFAULT_WILAYAH_LIST];
    this.pelanggan = generateSeedPelanggan();
    this.snapshots = buildInitialSnapshots(this.pelanggan);
    this.activeSnapshotId = this.snapshots[0]?.id || '';
    this.safePersist(STORAGE_KEYS.WILAYAH, this.wilayah);
    this.safePersist(STORAGE_KEYS.PELANGGAN, this.pelanggan);
    this.persistSnapshotMeta();
    this.tryArchive(this.activeSnapshotId, this.pelanggan);
    this.notify();
  }

  public getWilayahList(): WilayahAcuan[] {
    const countMap = new Map<string, number>();
    for (const p of this.pelanggan) {
      countMap.set(p.kode_wilayah, (countMap.get(p.kode_wilayah) || 0) + 1);
    }
    return this.wilayah.map((w) => ({ ...w, totalPelanggan: countMap.get(w.kode) || 0 }));
  }

  public getWilayahByKode(kode: string): WilayahAcuan | undefined {
    return this.wilayah.find((w) => w.kode === kode);
  }

  public updateWilayahColor(kode: string, warna: string) {
    this.wilayah = this.wilayah.map((w) => (w.kode === kode ? { ...w, warna } : w));
    this.safePersist(STORAGE_KEYS.WILAYAH, this.wilayah);
    this.notify();
  }

  public addWilayah(newWilayah: WilayahAcuan) {
    const existingIndex = this.wilayah.findIndex((w) => w.kode === newWilayah.kode);
    if (existingIndex >= 0) {
      this.wilayah = this.wilayah.map((w, i) => (i === existingIndex ? newWilayah : w));
    } else {
      this.wilayah = [...this.wilayah, newWilayah].sort((a, b) => a.kode.localeCompare(b.kode));
    }
    this.safePersist(STORAGE_KEYS.WILAYAH, this.wilayah);
    this.notify();
  }

  public resetWilayahColors() {
    const defaultColorMap = new Map(DEFAULT_WILAYAH_LIST.map((w) => [w.kode, w.warna]));
    this.wilayah = this.wilayah.map((w) => ({ ...w, warna: defaultColorMap.get(w.kode) || w.warna }));
    this.safePersist(STORAGE_KEYS.WILAYAH, this.wilayah);
    this.notify();
  }

  public getKecamatanList(): KecamatanInfo[] {
    return KECAMATAN_LIST;
  }

  public getPelangganList(): Pelanggan[] {
    return this.pelanggan;
  }

  public getPelangganById(id: string): Pelanggan | undefined {
    return this.pelanggan.find((p) => p.kode_pelanggan === id || p.id === id);
  }

  public getSnapshots(): UploadSnapshot[] {
    return this.snapshots;
  }

  public getActiveSnapshot(): UploadSnapshot | undefined {
    return this.snapshots.find((s) => s.id === this.activeSnapshotId) || this.snapshots[0];
  }

  /** Previous snapshot (by upload time) relative to the active one, for deltas. */
  public getPreviousSnapshot(): UploadSnapshot | undefined {
    const active = this.getActiveSnapshot();
    if (!active) return undefined;
    return this.snapshots
      .filter((s) => s.id !== active.id && s.uploaded_at < active.uploaded_at)
      .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];
  }

  public hasArchive(snapshotId: string): boolean {
    return this.archivedIds.has(snapshotId);
  }

  public restoreSnapshot(snapshotId: string): RestoreResult {
    const target = this.snapshots.find((s) => s.id === snapshotId);
    if (!target) return { ok: false, reason: 'Snapshot tidak ditemukan.' };

    const raw = localStorage.getItem(this.archiveKey(snapshotId));
    if (!raw) return { ok: false, reason: 'Arsip data untuk snapshot ini sudah tidak tersedia.' };

    let data: Pelanggan[];
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, reason: 'Arsip data rusak dan tidak dapat dipulihkan.' };
    }

    try {
      this.writeWithPruning(STORAGE_KEYS.PELANGGAN, data);
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : 'Gagal menyimpan data.' };
    }

    this.pelanggan = data;
    this.snapshots = this.snapshots.map((s) => ({ ...s, is_active: s.id === snapshotId }));
    this.activeSnapshotId = snapshotId;
    this.persistSnapshotMeta();
    this.notify();
    return { ok: true };
  }

  /**
   * Applies validated records. Throws StorageQuotaError if the dataset cannot
   * be persisted — in that case the previous active data stays untouched (PRD S-3).
   */
  public applyUploadedData(
    newRecords: Pelanggan[],
    mode: 'replace' | 'update',
    filename: string,
    uploaderName: string,
    notes = '',
  ): UploadSnapshot {
    let next: Pelanggan[];
    if (mode === 'replace') {
      next = newRecords;
    } else {
      const recordMap = new Map(this.pelanggan.map((p) => [p.kode_pelanggan, p]));
      newRecords.forEach((p) => recordMap.set(p.kode_pelanggan, p));
      next = Array.from(recordMap.values());
    }

    // Refresh spatial & colocation anomalies across the combined dataset
    for (const p of next) {
      refreshAnomaly(p);
    }
    detectColocationAnomalies(next);

    // Persist first; only mutate in-memory state once storage succeeded.
    this.writeWithPruning(STORAGE_KEYS.PELANGGAN, next);

    const now = new Date();
    const id = newSnapshotId(now);
    const flaggedCount = next.filter((r) => r.is_flagged).length;

    const snapshot: UploadSnapshot = {
      id,
      filename,
      uploaded_at: now.toISOString(),
      uploader_name: uploaderName,
      uploader_role: 'Admin Data',
      total_rows: next.length,
      valid_rows: next.length - flaggedCount,
      flagged_rows: flaggedCount,
      error_rows: 0,
      mode,
      is_active: true,
      notes:
        notes ||
        (mode === 'replace'
          ? `Ganti total (${newRecords.length} baris dari file).`
          : `Perbarui per ID (${newRecords.length} baris dari file).`),
    };

    this.pelanggan = next;
    this.snapshots = [snapshot, ...this.snapshots.map((s) => ({ ...s, is_active: false }))];
    this.activeSnapshotId = id;
    this.persistSnapshotMeta();
    this.tryArchive(id, next);
    this.enforceArchiveLimit();
    this.notify();
    return snapshot;
  }

  public async generateTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
    const XLSX = await import('xlsx');
    const templateRows = [
      {
        NO_PELAN: '070100861',
        NAMA: 'ISMAIL',
        ALAMAT: 'KR DALAM BT',
        urjlw: '2B',
        urjlwp: 'RUMAH TANGGA A',
        urstat_smb: 'Aktif',
        longitude: 116.2406,
        latitude: -8.75218,
      },
      {
        NO_PELAN: '070100863',
        NAMA: 'MQ WIRANTAKE',
        ALAMAT: 'KR DALAM BT',
        urjlw: '2B',
        urjlwp: 'RUMAH TANGGA A',
        urstat_smb: 'Aktif',
        longitude: 116.2406,
        latitude: -8.75218,
      },
      {
        NO_PELAN: '070400003',
        NAMA: 'LALU MUHAMMAD RIDWAN',
        ALAMAT: 'BONDER',
        urjlw: '3A',
        urjlwp: 'NIAGA KECIL',
        urstat_smb: 'Aktif',
        longitude: 116.20514,
        latitude: -8.77531,
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    // Keep NO_PELAN as text format so leading zero (0) is preserved
    templateRows.forEach((_, i) => {
      const cell = worksheet[XLSX.utils.encode_cell({ r: i + 1, c: 0 })];
      if (cell) cell.t = 's';
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Pelanggan');
    XLSX.writeFile(
      workbook,
      format === 'csv' ? 'Template_Data_Pelanggan_PDAM_Tiara.csv' : 'Template_Data_Pelanggan_PDAM_Tiara.xlsx',
      { bookType: format },
    );
  }

  public async exportPelanggan(
    data: Pelanggan[],
    filenamePrefix = 'Data_Pelanggan_PDAM_Tiara',
    options: { includePII: boolean } = { includePII: false },
  ) {
    const XLSX = await import('xlsx');
    const s = sanitizeSpreadsheetCell;
    const exportRows = data.map((p) => ({
      'Kode Pelanggan': p.kode_pelanggan,
      ...(options.includePII ? { 'Nama Pelanggan': s(p.nama_pelanggan), Alamat: s(p.alamat) } : {}),
      'Kode Kecamatan': p.kode_kecamatan,
      'Kode Wilayah': p.kode_wilayah,
      'Nama Wilayah': s(p.nama_wilayah),
      Golongan: p.golongan,
      'Status Sambungan': p.status_sambungan,
      ...(options.includePII ? { Latitude: p.latitude, Longitude: p.longitude } : {}),
      'Kualitas Data': p.is_flagged ? 'Perlu verifikasi' : 'Valid',
      'Anomali Spasial': s(p.spatial_anomaly || '-'),
      'Anomali Koordinat Ganda': s(p.colocation_anomaly || '-'),
      'Catatan Flag': s(p.flag_reasons.join('; ') || '-'),
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Pelanggan');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${filenamePrefix}_${dateStr}.xlsx`);
  }

  /**
   * Ekspor Laporan Audit Mutu Data & Anomali Multi-Sheet (.xlsx)
   * Menyajikan Ringkasan Eksekutif, Daftar Anomali Temuan (diprioritaskan di awal),
   * dan Semua Data Pelanggan.
   */
  public async exportAuditReport(
    data: Pelanggan[],
    kecamatanFilter: string,
    options: { includePII: boolean } = { includePII: false },
  ) {
    const XLSX = await import('xlsx');
    const s = sanitizeSpreadsheetCell;

    const kecNama = kecamatanFilter === 'all' ? 'Semua Kecamatan' : kecamatanName(kecamatanFilter);
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Filter anomali vs valid
    const anomalyRecords = data.filter((p) => p.is_flagged || p.spatial_anomaly || p.colocation_anomaly);
    const validRecords = data.filter((p) => !p.is_flagged && !p.spatial_anomaly && !p.colocation_anomaly);

    const spatialCount = data.filter((p) => Boolean(p.spatial_anomaly)).length;
    const colocationCount = data.filter((p) => Boolean(p.colocation_anomaly)).length;
    const bothCount = data.filter((p) => Boolean(p.spatial_anomaly && p.colocation_anomaly)).length;
    const otherFlagCount = anomalyRecords.length - (spatialCount + colocationCount - bothCount);

    // Urutkan anomali: Anomali Batas Spasial paling atas, lalu Titik Dobel, lalu lainnya
    const sortedAnomalies = [...anomalyRecords].sort((a, b) => {
      const score = (p: Pelanggan) => (p.spatial_anomaly ? 3 : p.colocation_anomaly ? 2 : 1);
      return score(b) - score(a);
    });

    // ── SHEET 1: RINGKASAN AUDIT ──
    const summaryRows = [
      { Parameter: 'JUDUL LAPORAN', Keterangan: 'LAPORAN AUDIT MUTU DATA & ANOMALI SPASIAL PELANGGAN' },
      { Parameter: 'INSTANSI', Keterangan: 'PDAM TIRTA ARDHIA RINJANI (KAB. LOMBOK TENGAH)' },
      { Parameter: 'Waktu Cetak Dokumen', Keterangan: `${dateStr} pukul ${timeStr} WITA` },
      { Parameter: 'Cakupan Wilayah / Kecamatan', Keterangan: kecNama },
      { Parameter: 'Total Pelanggan Terdaftar', Keterangan: `${data.length} pelanggan` },
      { Parameter: 'Data Bersih & Valid', Keterangan: `${validRecords.length} pelanggan (${data.length ? ((validRecords.length / data.length) * 100).toFixed(1) : 0}%)` },
      { Parameter: 'Total Data Bermasalah / Perlu Verifikasi', Keterangan: `${anomalyRecords.length} pelanggan (${data.length ? ((anomalyRecords.length / data.length) * 100).toFixed(1) : 0}%)` },
      { Parameter: '--- RINCIAN TEMUAN ANOMALI ---', Keterangan: '---------------------------------------------------' },
      { Parameter: '1. Anomali Batas Spasial (Lintas Kecamatan)', Keterangan: `${spatialCount} pelanggan` },
      { Parameter: '2. Titik Dobel Beda Wilayah (Multi-Wilayah)', Keterangan: `${colocationCount} pelanggan` },
      { Parameter: '3. Data Bertanda / Perlu Verifikasi Lainnya', Keterangan: `${Math.max(0, otherFlagCount)} pelanggan` },
      { Parameter: '--- DISTRIBUSI SAMBUNGAN ---', Keterangan: '---------------------------------------------------' },
      { Parameter: 'Sambungan Aktif', Keterangan: `${data.filter((p) => p.status_sambungan === 'Aktif').length} pelanggan` },
      { Parameter: 'Sambungan Nonaktif', Keterangan: `${data.filter((p) => p.status_sambungan === 'Nonaktif').length} pelanggan` },
      { Parameter: 'Sambungan Putus / Cabut', Keterangan: `${data.filter((p) => p.status_sambungan === 'Putus').length} pelanggan` },
    ];

    // ── SHEET 2: DAFTAR ANOMALI & TEMUAN (PRIORITAS AUDITOR / HUBLANG) ──
    const anomalyRows = sortedAnomalies.map((p, idx) => {
      let jenisAnomali = 'Perlu Verifikasi';
      let rekomendasi = 'Verifikasi berkas fisik dan konfirmasi data pelanggan.';
      if (p.spatial_anomaly && p.colocation_anomaly) {
        jenisAnomali = 'Batas Spasial & Titik Dobel';
        rekomendasi = 'Koreksi kode kecamatan ke unit terdekat dan cek nomor meter ganda di lapangan.';
      } else if (p.spatial_anomaly) {
        jenisAnomali = 'Anomali Batas Spasial (Lintas Kecamatan)';
        rekomendasi = 'Koreksi kode kecamatan pelanggan ke unit cabang terdekat dengan koordinat fisik GPS.';
      } else if (p.colocation_anomaly) {
        jenisAnomali = 'Titik Koordinat Ganda (Multi-Wilayah)';
        rekomendasi = 'Cek meteran fisik ganda di lokasi atau lakukan re-tagging koordinat GPS surveyor.';
      }

      return {
        'No.': idx + 1,
        'Kode Pelanggan': p.kode_pelanggan,
        ...(options.includePII ? { 'Nama Pelanggan': s(p.nama_pelanggan), Alamat: s(p.alamat) } : {}),
        'Kode Kecamatan': p.kode_kecamatan,
        'Kode Wilayah': p.kode_wilayah,
        'Nama Wilayah': s(p.nama_wilayah),
        Golongan: p.golongan,
        'Status Sambungan': p.status_sambungan,
        ...(options.includePII ? { Latitude: p.latitude, Longitude: p.longitude } : {}),
        'Kategori Anomali': jenisAnomali,
        'Temuan Anomali Batas': s(p.spatial_anomaly || '-'),
        'Temuan Titik Dobel': s(p.colocation_anomaly || '-'),
        'Rekomendasi Tindak Lanjut': rekomendasi,
      };
    });

    // ── SHEET 3: SEMUA DATA PELANGGAN ──
    const allRows = data.map((p, idx) => ({
      'No.': idx + 1,
      'Kode Pelanggan': p.kode_pelanggan,
      ...(options.includePII ? { 'Nama Pelanggan': s(p.nama_pelanggan), Alamat: s(p.alamat) } : {}),
      'Kode Kecamatan': p.kode_kecamatan,
      'Kode Wilayah': p.kode_wilayah,
      'Nama Wilayah': s(p.nama_wilayah),
      Golongan: p.golongan,
      'Status Sambungan': p.status_sambungan,
      ...(options.includePII ? { Latitude: p.latitude, Longitude: p.longitude } : {}),
      'Status Mutu': p.spatial_anomaly ? 'Anomali Batas' : p.colocation_anomaly ? 'Titik Dobel' : p.is_flagged ? 'Perlu Verifikasi' : 'Valid',
      'Anomali Spasial': s(p.spatial_anomaly || '-'),
      'Titik Dobel': s(p.colocation_anomaly || '-'),
      'Catatan': s(p.flag_reasons.join('; ') || '-'),
    }));

    const workbook = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Ringkasan_Audit');

    const wsAnomalies = XLSX.utils.json_to_sheet(
      anomalyRows.length > 0 ? anomalyRows : [{ 'Keterangan': 'Tidak ada anomali atau data bertanda pada filter ini.' }]
    );
    // Format cell Kode Pelanggan ke teks agar angka 0 di depan (07...) tidak hilang
    anomalyRows.forEach((_, i) => {
      const cell = wsAnomalies[XLSX.utils.encode_cell({ r: i + 1, c: 1 })];
      if (cell) cell.t = 's';
    });
    XLSX.utils.book_append_sheet(workbook, wsAnomalies, 'Daftar_Anomali_Temuan');

    const wsAll = XLSX.utils.json_to_sheet(allRows);
    allRows.forEach((_, i) => {
      const cell = wsAll[XLSX.utils.encode_cell({ r: i + 1, c: 1 })];
      if (cell) cell.t = 's';
    });
    XLSX.utils.book_append_sheet(workbook, wsAll, 'Semua_Data_Pelanggan');

    const filePrefix = `Laporan_Audit_PDAM_${kecNama.replace(/\s+/g, '_')}_${now.toISOString().slice(0, 10)}`;
    XLSX.writeFile(workbook, `${filePrefix}.xlsx`);
  }

  /**
   * Ekspor seluruh database lokal (Wilayah, Pelanggan, Snapshots) ke file JSON
   * untuk sinkronisasi / backup antar perangkat.
   */
  public exportDatabaseBackup(): void {
    const backupData = {
      app: 'PDAM Tirta Ardhia Rinjani Tracker',
      version: 1,
      exported_at: new Date().toISOString(),
      wilayah: this.wilayah,
      pelanggan: this.pelanggan,
      snapshots: this.snapshots,
      activeSnapshotId: this.activeSnapshotId,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Database_PDAM_Tiara_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Pulihkan database lokal dari file JSON backup.
   */
  public restoreDatabaseBackup(jsonString: string): { ok: boolean; count?: number; reason?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.pelanggan)) {
        return { ok: false, reason: 'Format file backup tidak valid (properti pelanggan tidak ditemukan).' };
      }

      this.pelanggan = data.pelanggan;
      if (Array.isArray(data.wilayah) && data.wilayah.length > 0) {
        this.wilayah = data.wilayah;
        this.safePersist(STORAGE_KEYS.WILAYAH, this.wilayah);
      }
      if (Array.isArray(data.snapshots)) {
        this.snapshots = data.snapshots;
        this.persistSnapshotMeta();
      }
      if (data.activeSnapshotId) {
        this.activeSnapshotId = data.activeSnapshotId;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SNAPSHOT_ID, data.activeSnapshotId);
      }

      // Recompute anomalies across imported data
      for (const p of this.pelanggan) {
        refreshAnomaly(p);
      }
      detectColocationAnomalies(this.pelanggan);

      this.writeWithPruning(STORAGE_KEYS.PELANGGAN, this.pelanggan);
      this.notify();
      return { ok: true, count: this.pelanggan.length };
    } catch (err: any) {
      return { ok: false, reason: err.message || 'Gagal membaca file JSON backup.' };
    }
  }
}

export const pdamService = new PdamDataService();
