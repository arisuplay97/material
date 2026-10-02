import { Pelanggan, WilayahAcuan, UploadSnapshot, GolonganTarif, StatusSambungan } from '@/types/pdam';
import * as XLSX from 'xlsx';

// ── Bounding box kasar per kecamatan untuk deteksi anomali spasial ──
export const KECAMATAN_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
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
};

// ── Spatial anomaly check: does the coordinate sit inside its kecamatan's bounds? ──
export function checkSpatialAnomaly(pelanggan: Pelanggan): string | null {
  const kodeKec = pelanggan.kode_kecamatan;
  const bounds = KECAMATAN_BOUNDS[kodeKec];
  if (!bounds) return null; // unknown kecamatan, skip check

  const { latitude, longitude } = pelanggan;
  if (
    latitude < bounds.minLat || latitude > bounds.maxLat ||
    longitude < bounds.minLng || longitude > bounds.maxLng
  ) {
    // Try to find which kecamatan the coordinate actually falls in
    let foundKec: string | null = null;
    for (const [kec, b] of Object.entries(KECAMATAN_BOUNDS)) {
      if (
        latitude >= b.minLat && latitude <= b.maxLat &&
        longitude >= b.minLng && longitude <= b.maxLng
      ) {
        foundKec = kec;
        break;
      }
    }
    const kecNama = KECAMATAN_LIST.find(k => k.kode === kodeKec)?.nama || kodeKec;
    if (foundKec) {
      const foundNama = KECAMATAN_LIST.find(k => k.kode === foundKec)?.nama || foundKec;
      return `Kode pelanggan Kec. ${kecNama} (${kodeKec}) tapi koordinat berada di area Kec. ${foundNama} (${foundKec})`;
    }
    return `Koordinat di luar batas wajar Kec. ${kecNama} (${kodeKec})`;
  }
  return null;
}

// ── Realistic seed customer generator for Praya Barat ──
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

      // Intentionally place ~3% of customers at coordinates that drift into another kecamatan
      // to demonstrate the spatial anomaly detection
      const isSpatialAnomaly = counter % 31 === 0;
      if (isSpatialAnomaly) {
        // Shift latitude northward so it falls into Kec. 12 (Jonggat) or 01 (Praya) bounds
        lat = Number((-8.68 + (Math.sin(counter) * 0.03)).toFixed(6));
        lng = Number((116.22 + (Math.cos(counter) * 0.04)).toFixed(6));
      }

      const isFlagged = counter % 29 === 0 || counter % 47 === 0;
      const flagReasons: string[] = [];
      if (isFlagged) {
        if (counter % 29 === 0) flagReasons.push('Koordinat perlu verifikasi lapangan');
        if (counter % 47 === 0) flagReasons.push('Nama pemakai berbeda dengan arsip');
      }

      // Check spatial anomaly
      const tempPelanggan: Pelanggan = {
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
        is_flagged: isFlagged || isSpatialAnomaly,
        flag_reasons: flagReasons,
        spatial_anomaly: null,
        nomor_meter: `WM-${wilayah.kode}-${String(1000 + i)}`,
        tanggal_pasang: `202${(counter % 4) + 2}-0${(i % 9) + 1}-1${(i % 8) + 1}`,
      };

      const anomaly = checkSpatialAnomaly(tempPelanggan);
      if (anomaly) {
        tempPelanggan.spatial_anomaly = anomaly;
        tempPelanggan.is_flagged = true;
        if (!tempPelanggan.flag_reasons.includes(anomaly)) {
          tempPelanggan.flag_reasons.push(anomaly);
        }
      }

      pelangganList.push(tempPelanggan);
      counter++;
    }
  });

  return pelangganList;
}

// ── Default Snapshot Records ──
const INITIAL_SNAPSHOTS: UploadSnapshot[] = [
  {
    id: 'snap-2026-10-01-1400',
    filename: 'Data_Pelanggan_Praya_Barat_Okt2026_Rev2.xlsx',
    uploaded_at: '2026-10-01T14:00:00+08:00',
    uploader_name: 'Muh Sofiyan Hawari',
    uploader_role: 'Bidang IT',
    total_rows: 642,
    valid_rows: 620,
    flagged_rows: 22,
    error_rows: 0,
    mode: 'replace',
    is_active: true,
    notes: 'Snapshot rilis resmi validasi tahap pilot Kecamatan 07 Praya Barat.',
  },
  {
    id: 'snap-2026-09-18-1030',
    filename: 'Data_Pelanggan_Praya_Barat_Sept2026_Draf.xlsx',
    uploaded_at: '2026-09-18T10:30:00+08:00',
    uploader_name: 'Tim Perapian Data IT',
    uploader_role: 'Verifikator',
    total_rows: 610,
    valid_rows: 575,
    flagged_rows: 35,
    error_rows: 0,
    mode: 'replace',
    is_active: false,
    notes: 'Snapshot pra-perapian koordinat GPS wilayah Kateng dan Bonder.',
  },
];

class PdamDataService {
  private wilayah: WilayahAcuan[] = [];
  private pelanggan: Pelanggan[] = [];
  private snapshots: UploadSnapshot[] = [];
  private activeSnapshotId: string = '';
  private listeners: (() => void)[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const storedWilayah = localStorage.getItem(STORAGE_KEYS.WILAYAH);
      if (storedWilayah) {
        this.wilayah = JSON.parse(storedWilayah);
      } else {
        this.wilayah = [...DEFAULT_WILAYAH_LIST];
        this.saveWilayah();
      }

      const storedPelanggan = localStorage.getItem(STORAGE_KEYS.PELANGGAN);
      if (storedPelanggan) {
        this.pelanggan = JSON.parse(storedPelanggan);
        let updated = false;
        this.pelanggan.forEach(p => {
          if (!p.kode_kecamatan) {
            p.kode_kecamatan = '07';
            updated = true;
          }
          const anomaly = checkSpatialAnomaly(p);
          if (anomaly && p.spatial_anomaly !== anomaly) {
            p.spatial_anomaly = anomaly;
            p.is_flagged = true;
            if (!p.flag_reasons.includes(anomaly)) {
              p.flag_reasons.push(anomaly);
            }
            updated = true;
          }
        });

        // If existing stored data had no spatial anomaly yet, seed a few records for demonstration
        const hasAnomaly = this.pelanggan.some(p => Boolean(p.spatial_anomaly));
        if (!hasAnomaly && this.pelanggan.length > 25) {
          for (let i = 5; i < this.pelanggan.length; i += 28) {
            const p = this.pelanggan[i];
            p.latitude = Number((-8.675 + (Math.sin(i) * 0.025)).toFixed(6));
            p.longitude = Number((116.23 + (Math.cos(i) * 0.03)).toFixed(6));
            const anomaly = checkSpatialAnomaly(p);
            if (anomaly) {
              p.spatial_anomaly = anomaly;
              p.is_flagged = true;
              if (!p.flag_reasons.includes(anomaly)) {
                p.flag_reasons.push(anomaly);
              }
            }
          }
          updated = true;
        }

        if (updated) {
          this.savePelanggan();
        }
      } else {
        this.pelanggan = generateSeedPelanggan();
        this.savePelanggan();
      }

      const storedSnapshots = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
      if (storedSnapshots) {
        this.snapshots = JSON.parse(storedSnapshots);
      } else {
        this.snapshots = [...INITIAL_SNAPSHOTS];
        this.saveSnapshots();
      }

      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SNAPSHOT_ID);
      this.activeSnapshotId = activeId || this.snapshots.find(s => s.is_active)?.id || this.snapshots[0]?.id || '';
    } catch (err) {
      console.error('Error initializing PdamDataService:', err);
      this.wilayah = [...DEFAULT_WILAYAH_LIST];
      this.pelanggan = generateSeedPelanggan();
      this.snapshots = [...INITIAL_SNAPSHOTS];
      this.activeSnapshotId = this.snapshots[0]?.id || '';
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify() { this.listeners.forEach(fn => fn()); }

  private saveWilayah() {
    localStorage.setItem(STORAGE_KEYS.WILAYAH, JSON.stringify(this.wilayah));
    this.notify();
  }
  private savePelanggan() {
    localStorage.setItem(STORAGE_KEYS.PELANGGAN, JSON.stringify(this.pelanggan));
    this.notify();
  }
  private saveSnapshots() {
    localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(this.snapshots));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SNAPSHOT_ID, this.activeSnapshotId);
    this.notify();
  }

  // Force regenerate seed data (useful after schema changes)
  public resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.WILAYAH);
    localStorage.removeItem(STORAGE_KEYS.PELANGGAN);
    localStorage.removeItem(STORAGE_KEYS.SNAPSHOTS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SNAPSHOT_ID);
    this.wilayah = [...DEFAULT_WILAYAH_LIST];
    this.pelanggan = generateSeedPelanggan();
    this.snapshots = [...INITIAL_SNAPSHOTS];
    this.activeSnapshotId = this.snapshots[0]?.id || '';
    this.saveWilayah();
    this.savePelanggan();
    this.saveSnapshots();
  }

  public getWilayahList(): WilayahAcuan[] {
    const countMap = new Map<string, number>();
    this.pelanggan.forEach(p => {
      countMap.set(p.kode_wilayah, (countMap.get(p.kode_wilayah) || 0) + 1);
    });
    return this.wilayah.map(w => ({ ...w, totalPelanggan: countMap.get(w.kode) || 0 }));
  }

  public getWilayahByKode(kode: string): WilayahAcuan | undefined {
    return this.wilayah.find(w => w.kode === kode);
  }

  public updateWilayahColor(kode: string, warna: string) {
    this.wilayah = this.wilayah.map(w => (w.kode === kode ? { ...w, warna } : w));
    this.saveWilayah();
  }

  public addWilayah(newWilayah: WilayahAcuan) {
    const existingIndex = this.wilayah.findIndex(w => w.kode === newWilayah.kode);
    if (existingIndex >= 0) { this.wilayah[existingIndex] = newWilayah; }
    else { this.wilayah.push(newWilayah); }
    this.saveWilayah();
  }

  public resetWilayahColors() {
    const defaultColorMap = new Map(DEFAULT_WILAYAH_LIST.map(w => [w.kode, w.warna]));
    this.wilayah = this.wilayah.map(w => ({ ...w, warna: defaultColorMap.get(w.kode) || w.warna }));
    this.saveWilayah();
  }

  public getKecamatanList(): KecamatanInfo[] {
    return KECAMATAN_LIST;
  }

  public getPelangganList(): Pelanggan[] { return this.pelanggan; }

  public getPelangganByKecamatan(kodeKecamatan: string): Pelanggan[] {
    if (!kodeKecamatan || kodeKecamatan === 'all') return this.pelanggan;
    return this.pelanggan.filter(p => p.kode_kecamatan === kodeKecamatan);
  }

  public getWilayahByKecamatan(kodeKecamatan: string): WilayahAcuan[] {
    if (!kodeKecamatan || kodeKecamatan === 'all') return this.getWilayahList();
    return this.getWilayahList().filter(w => w.kodeKecamatan === kodeKecamatan);
  }

  public getPelangganById(id: string): Pelanggan | undefined {
    return this.pelanggan.find(p => p.kode_pelanggan === id || p.id === id);
  }

  public getSnapshots(): UploadSnapshot[] { return this.snapshots; }

  public getActiveSnapshot(): UploadSnapshot | undefined {
    return this.snapshots.find(s => s.id === this.activeSnapshotId) || this.snapshots[0];
  }

  public restoreSnapshot(snapshotId: string): boolean {
    const target = this.snapshots.find(s => s.id === snapshotId);
    if (!target) return false;
    this.snapshots = this.snapshots.map(s => ({ ...s, is_active: s.id === snapshotId }));
    this.activeSnapshotId = snapshotId;
    this.saveSnapshots();
    return true;
  }

  public applyUploadedData(
    newRecords: Pelanggan[], mode: 'replace' | 'update',
    filename: string, uploaderName: string = 'Muh Sofiyan Hawari', notes: string = ''
  ): UploadSnapshot {
    if (mode === 'replace') { this.pelanggan = newRecords; }
    else {
      const recordMap = new Map(this.pelanggan.map(p => [p.kode_pelanggan, p]));
      newRecords.forEach(p => { recordMap.set(p.kode_pelanggan, p); });
      this.pelanggan = Array.from(recordMap.values());
    }
    this.savePelanggan();

    const flaggedCount = newRecords.filter(r => r.is_flagged).length;
    const now = new Date();
    const newSnapshotId = `snap-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    this.snapshots = this.snapshots.map(s => ({ ...s, is_active: false }));

    const newSnapshot: UploadSnapshot = {
      id: newSnapshotId, filename, uploaded_at: now.toISOString(),
      uploader_name: uploaderName, uploader_role: 'Bidang IT',
      total_rows: newRecords.length, valid_rows: newRecords.length - flaggedCount,
      flagged_rows: flaggedCount, error_rows: 0, mode, is_active: true,
      notes: notes || `Upload via Settingan (${mode === 'replace' ? 'Ganti Total' : 'Update ID'}).`,
    };
    this.snapshots.unshift(newSnapshot);
    this.activeSnapshotId = newSnapshotId;
    this.saveSnapshots();
    return newSnapshot;
  }

  public generateTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
    const templateRows = [
      { kode_pelanggan: '070100001', nama_pelanggan: 'Ahmad Zulkifli', alamat: 'Dusun Karang Anyar RT 01 RW 01, Ds. Karang Dalam', golongan: 'R1', status_sambungan: 'Aktif', latitude: -8.789254, longitude: 116.219812 },
      { kode_pelanggan: '070200002', nama_pelanggan: 'Baiq Nurul Aini', alamat: 'Dusun Dasan Baru RT 02 RW 01, Ds. Kateng', golongan: 'R2', status_sambungan: 'Aktif', latitude: -8.825120, longitude: 116.195230 },
      { kode_pelanggan: '070400003', nama_pelanggan: 'Lalu Muhammad Ridwan', alamat: 'Dusun Reak RT 03 RW 02, Ds. Bonder', golongan: 'B1', status_sambungan: 'Nonaktif', latitude: -8.775310, longitude: 116.205140 },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Pelanggan_PDAM');
    if (format === 'csv') {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url;
      link.setAttribute('download', 'Template_Data_Pelanggan_PDAM_Tiara.csv');
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } else {
      XLSX.writeFile(workbook, 'Template_Data_Pelanggan_PDAM_Tiara.xlsx');
    }
  }

  public exportPelanggan(data: Pelanggan[], filenamePrefix: string = 'Data_Pelanggan_PDAM_Tiara') {
    const exportRows = data.map(p => ({
      'Kode Pelanggan': p.kode_pelanggan, 'Nama Pelanggan': p.nama_pelanggan, 'Alamat': p.alamat,
      'Kode Kecamatan': p.kode_kecamatan, 'Kode Wilayah': p.kode_wilayah, 'Nama Wilayah': p.nama_wilayah,
      'Golongan': p.golongan, 'Status Sambungan': p.status_sambungan,
      'Latitude': p.latitude, 'Longitude': p.longitude,
      'Kualitas Data': p.is_flagged ? `Bertanda` : 'Valid',
      'Anomali Spasial': p.spatial_anomaly || '-',
      'Catatan Flag': p.flag_reasons.join('; ') || '-',
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Pelanggan');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${filenamePrefix}_${dateStr}.xlsx`);
  }
}

export const pdamService = new PdamDataService();
