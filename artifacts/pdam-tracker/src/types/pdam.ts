export type GolonganTarif = 'R1' | 'R2' | 'B1' | 'S' | 'I';
export type StatusSambungan = 'Aktif' | 'Nonaktif' | 'Putus';

export type UserRole = 'admin' | 'verifikator' | 'pimpinan';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

export interface WilayahAcuan {
  kode: string; // 4 digits KKWW (e.g. "0701")
  nama: string; // e.g. "Karang Dalam"
  kodeKecamatan: string; // "07"
  namaKecamatan: string; // "Praya Barat"
  warna: string; // HEX color, e.g. "#EF4444"
  centerLat: number;
  centerLng: number;
  totalPelanggan?: number;
}

export interface Pelanggan {
  id: string; // kode_pelanggan 9 digits (e.g. "070100042")
  kode_pelanggan: string;
  nama_pelanggan: string;
  alamat: string;
  kode_kecamatan: string; // 2 digits: "07"
  kode_wilayah: string; // 4 digits: "0701"
  nama_wilayah: string;
  golongan: GolonganTarif;
  status_sambungan: StatusSambungan;
  latitude: number;
  longitude: number;
  is_flagged: boolean;
  flag_reasons: string[];
  spatial_anomaly: string | null; // populated when coordinates fall outside kecamatan bounds
  nomor_meter?: string;
  tanggal_pasang?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UploadSnapshot {
  id: string;
  filename: string;
  uploaded_at: string;
  uploader_name: string;
  uploader_role: string;
  total_rows: number;
  valid_rows: number;
  flagged_rows: number;
  error_rows: number;
  mode: 'replace' | 'update';
  is_active: boolean;
  notes?: string;
  /** True for the generated demo dataset (not real customer data). */
  is_demo?: boolean;
}

export interface ValidationErrorItem {
  rowNumber: number;
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationSummary {
  totalRows: number;
  validCount: number;
  flaggedCount: number;
  errorCount: number;
  canProceed: boolean;
  errors: ValidationErrorItem[];
  warnings: ValidationErrorItem[];
}

export interface DashboardFilter {
  kecamatan: string;
  wilayah: string;
  golongan: string;
  status: string;
  quality: string; // 'all' | 'valid' | 'flagged'
  searchQuery: string;
}
