import { Pelanggan, WilayahAcuan, UploadSnapshot, GolonganTarif, StatusSambungan } from '@/types/pdam';
import { sanitizeSpreadsheetCell } from '@/lib/escape';

type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

// ── Bounding box kasar per kecamatan untuk deteksi anomali spasial ──
// NOTE: kotak-kotak ini saling tumpang tindih. Ganti dengan poligon resmi
// (Geoportal BIG/BPS) + uji point-in-polygon pada fase backend.
export const KECAMATAN_BOUNDS: Record<string, Bounds> = {
  '01': { minLat: -8.75, maxLat: -8.60, minLng: 116.20, maxLng: 116.35 }, // Praya
  '02': { minLat: -8.70, maxLat: -8.55, minLng: 116.25, maxLng: 116.40 }, // Batukliang
  '03': { minLat: -8.72, maxLat: -8.58, minLng: 116.30, maxLng: 116.45 }, // Kopang
  '04': { minLat: -8.80, maxLat: -8.68, minLng: 116.25, maxLng: 116.38 }, // Janapria
  '05': { minLat: -8.82, maxLat: -8.70, minLng: 116.30, maxLng: 116.45 }, // Praya Timur
  '06': { minLat: -8.95, maxLat: -8.80, minLng: 116.20, maxLng: 116.40 }, // Pujut
  '07': { minLat: -8.90, maxLat: -8.70, minLng: 116.10, maxLng: 116.30 }, // Praya Barat
  '08': { minLat: -8.68, maxLat: -8.55, minLng: 116.20, maxLng: 116.35 }, // Pringgarata
  '09': { minLat: -8.95, maxLat: -8.85, minLng: 116.15, maxLng: 116.35 }, // Kuta
  '10': { minLat: -8.62, maxLat: -8.48, minLng: 116.28, maxLng: 116.42 }, // Batukliang Utara
  '11': { minLat: -8.78, maxLat: -8.68, minLng: 116.23, maxLng: 116.35 }, // Praya Tengah
  '12': { minLat: -8.73, maxLat: -8.60, minLng: 116.18, maxLng: 116.30 }, // Jonggat
  '13': { minLat: -8.88, maxLat: -8.76, minLng: 116.08, maxLng: 116.22 }, // Praya Barat Daya
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
  if (isInBounds(latitude, longitude, bounds)) return null;

  // Boxes overlap, so pick the containing kecamatan whose center is nearest
  // instead of the first match.
  let foundKec: string | null = null;
  let bestDist = Infinity;
  for (const [kec, b] of Object.entries(KECAMATAN_BOUNDS)) {
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
function refreshAnomaly(p: Pelanggan): boolean {
  const next = checkSpatialAnomaly(p);
  if (next === p.spatial_anomaly) return false;
  const reasons = (p.flag_reasons || []).filter((r) => r !== p.spatial_anomaly);
  if (next) reasons.push(next);
  p.flag_reasons = reasons;
  p.spatial_anomaly = next;
  p.is_flagged = reasons.length > 0;
  return true;
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
        nomor_meter: `WM-${wilayah.kode}-${String(1000 + i)}`,
        tanggal_pasang: `202${(counter % 4) + 2}-0${(i % 9) + 1}-1${(i % 8) + 1}`,
      };

      refreshAnomaly(record);
      pelangganList.push(record);
      counter++;
    }
  });

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

      const storedPelanggan = localStorage.getItem(STORAGE_KEYS.PELANGGAN);
      if (storedPelanggan) {
        this.pelanggan = JSON.parse(storedPelanggan);
        // Schema migration only — never touch coordinates or other real data.
        let migrated = false;
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
        if (migrated) this.safePersist(STORAGE_KEYS.PELANGGAN, this.pelanggan);
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
      'Catatan Flag': s(p.flag_reasons.join('; ') || '-'),
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Pelanggan');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${filenamePrefix}_${dateStr}.xlsx`);
  }
}

export const pdamService = new PdamDataService();
