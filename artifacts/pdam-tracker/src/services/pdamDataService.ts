import { Pelanggan, WilayahAcuan, UploadSnapshot, GolonganTarif, StatusSambungan } from '@/types/pdam';
import { sanitizeSpreadsheetCell } from '@/lib/escape';
import { idbGet, idbSet } from './indexedDbStorage';

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
  '05': { minLat: -8.86, maxLat: -8.70, minLng: 116.31, maxLng: 116.46 }, // Praya Timur (Mujur, Ganti, Sengkerang, Marong, Beleka, Kidang)
  '06': { minLat: -8.96, maxLat: -8.75, minLng: 116.265, maxLng: 116.36 }, // Pujut (Tanak Awu, Sengkol, Rembitan)
  '07': { minLat: -8.86, maxLat: -8.705, minLng: 116.12, maxLng: 116.266 }, // Praya Barat (selatan: Selong Belanak/Lolat, utara: Belemong/Penujak, timur: Batujai/Kr. Daye)
  '08': { minLat: -8.67, maxLat: -8.56, minLng: 116.18, maxLng: 116.29 }, // Pringgarata (Sintung, Bagu, Bilebante, Barembeng)
  '09': { minLat: -8.96, maxLat: -8.83, minLng: 116.24, maxLng: 116.36 }, // Kuta (pesisir selatan Pujut/Kuta, Gerupuk, Rambitan)
  '10': { minLat: -8.58, maxLat: -8.45, minLng: 116.26, maxLng: 116.40 }, // Batukliang Utara
  '11': { minLat: -8.765, maxLat: -8.65, minLng: 116.270, maxLng: 116.365 }, // Praya Tengah (Batunyala, Kelebuh, Sasake, Gaong, Rantik)
  '12': { minLat: -8.730, maxLat: -8.62, minLng: 116.16, maxLng: 116.265 }, // Jonggat (Sukarara, Puyung, Ubung, Labulia)
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

// ── Acuan Wilayah Resmi PDAM Sesuai Database & PRD ──
export const DEFAULT_WILAYAH_LIST: WilayahAcuan[] = [
    // ── 81 Acuan Wilayah / Dekadi Resmi Kecamatan 01 (Praya) ──
  { kode: '0101', nama: 'SUDIRMAN', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#E11D48', centerLat: -8.7073, centerLng: 116.281, totalPelanggan: 474 },
  { kode: '0102', nama: 'KR. LEBAH', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#2563EB', centerLat: -8.7036, centerLng: 116.2842, totalPelanggan: 373 },
  { kode: '0103', nama: 'PASAR LAMA', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#059669', centerLat: -8.6979, centerLng: 116.284, totalPelanggan: 18 },
  { kode: '0104', nama: 'KR. BULAYAK', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#D97706', centerLat: -8.6922, centerLng: 116.2791, totalPelanggan: 120 },
  { kode: '0105', nama: 'GURU BANGKOL', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#7C3AED', centerLat: -8.6888, centerLng: 116.2698, totalPelanggan: 39 },
  { kode: '0106', nama: 'H. AGUS SALIM', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#DB2777', centerLat: -8.6898, centerLng: 116.258, totalPelanggan: 22 },
  { kode: '0107', nama: 'BASUKI RAHMAT', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#0891B2', centerLat: -8.6962, centerLng: 116.2468, totalPelanggan: 996 },
  { kode: '0108', nama: 'KALI SADE', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#4F46E5', centerLat: -8.7073, centerLng: 116.269, totalPelanggan: 98 },
  { kode: '0109', nama: 'TAMPENG', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#EA580C', centerLat: -8.7111, centerLng: 116.2659, totalPelanggan: 75 },
  { kode: '0110', nama: 'BOGAK', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#16A34A', centerLat: -8.7168, centerLng: 116.2661, totalPelanggan: 464 },
  { kode: '0111', nama: 'KPR. HANKAM', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#9333EA', centerLat: -8.7225, centerLng: 116.2711, totalPelanggan: 111 },
  { kode: '0112', nama: 'RENTENG', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#0284C7', centerLat: -8.7258, centerLng: 116.2804, totalPelanggan: 539 },
  { kode: '0114', nama: 'GAJAH MADA', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#CA8A04', centerLat: -8.7247, centerLng: 116.2921, totalPelanggan: 196 },
  { kode: '0115', nama: 'TG. LOPAN', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#0D9488', centerLat: -8.7182, centerLng: 116.3033, totalPelanggan: 637 },
  { kode: '0116', nama: 'SERENGAT', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#DC2626', centerLat: -8.7072, centerLng: 116.281, totalPelanggan: 236 },
  { kode: '0117', nama: 'YOS SUDARSO', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#65A30D', centerLat: -8.7035, centerLng: 116.2841, totalPelanggan: 208 },
  { kode: '0118', nama: 'SUMBAWA', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#64748B', centerLat: -8.6978, centerLng: 116.2838, totalPelanggan: 7 },
  { kode: '0119', nama: 'IMAM BONJOL', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#B45309', centerLat: -8.6921, centerLng: 116.2788, totalPelanggan: 194 },
  { kode: '0120', nama: 'SOBIRIN', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#C026D3', centerLat: -8.6889, centerLng: 116.2694, totalPelanggan: 63 },
  { kode: '0121', nama: 'LENENG', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#1D4ED8', centerLat: -8.69, centerLng: 116.2577, totalPelanggan: 1245 },
  { kode: '0122', nama: 'MELUR', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#10B981', centerLat: -8.6966, centerLng: 116.2466, totalPelanggan: 137 },
  { kode: '0123', nama: 'MAWAR', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#BE123C', centerLat: -8.7074, centerLng: 116.269, totalPelanggan: 11 },
  { kode: '0124', nama: 'RINJANI', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#047857', centerLat: -8.7112, centerLng: 116.2659, totalPelanggan: 768 },
  { kode: '0125', nama: 'AHMAD YANI', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#F59E0B', centerLat: -8.7169, centerLng: 116.2663, totalPelanggan: 131 },
  { kode: '0126', nama: 'MOH. YAMIN', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#3B82F6', centerLat: -8.7225, centerLng: 116.2714, totalPelanggan: 18 },
  { kode: '0127', nama: 'TIMUR LAPANGAN', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#8B5CF6', centerLat: -8.7257, centerLng: 116.2807, totalPelanggan: 14 },
  { kode: '0128', nama: 'KOMP. R. BARU', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#EC4899', centerLat: -8.7244, centerLng: 116.2925, totalPelanggan: 301 },
  { kode: '0129', nama: 'KOMP. BERMIS', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#14B8A6', centerLat: -8.7178, centerLng: 116.3035, totalPelanggan: 323 },
  { kode: '0130', nama: 'TENGARI BARU', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#F97316', centerLat: -8.7071, centerLng: 116.281, totalPelanggan: 24 },
  { kode: '0131', nama: 'LENDANG APE', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#6366F1', centerLat: -8.7033, centerLng: 116.284, totalPelanggan: 216 },
  { kode: '0132', nama: 'GANG UTARA RSU', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#06B6D4', centerLat: -8.6977, centerLng: 116.2836, totalPelanggan: 44 },
  { kode: '0133', nama: 'PENGAMES', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#84CC16', centerLat: -8.6921, centerLng: 116.2785, totalPelanggan: 61 },
  { kode: '0134', nama: 'TANGGAK', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#E11D48', centerLat: -8.689, centerLng: 116.2691, totalPelanggan: 606 },
  { kode: '0135', nama: 'BALUNGADANG', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#2563EB', centerLat: -8.6903, centerLng: 116.2573, totalPelanggan: 129 },
  { kode: '0138', nama: 'KRANT UMUM', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#059669', centerLat: -8.697, centerLng: 116.2464, totalPelanggan: 19 },
  { kode: '0139', nama: 'ST. LAMA', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#D97706', centerLat: -8.7075, centerLng: 116.269, totalPelanggan: 38 },
  { kode: '0140', nama: 'DIPONEGORO', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#7C3AED', centerLat: -8.7113, centerLng: 116.266, totalPelanggan: 176 },
  { kode: '0141', nama: 'GANG BKIA', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#DB2777', centerLat: -8.717, centerLng: 116.2665, totalPelanggan: 13 },
  { kode: '0142', nama: 'UNTUNG SURAPATI', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#0891B2', centerLat: -8.7226, centerLng: 116.2717, totalPelanggan: 54 },
  { kode: '0143', nama: 'WR. SUPRATMAN', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#4F46E5', centerLat: -8.7256, centerLng: 116.2811, totalPelanggan: 98 },
  { kode: '0145', nama: 'GELONDONG', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#EA580C', centerLat: -8.7242, centerLng: 116.2928, totalPelanggan: 364 },
  { kode: '0146', nama: 'BUKAL MALANG', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#16A34A', centerLat: -8.7174, centerLng: 116.3037, totalPelanggan: 130 },
  { kode: '0147', nama: 'SENTOSA', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#9333EA', centerLat: -8.707, centerLng: 116.281, totalPelanggan: 52 },
  { kode: '0148', nama: 'MERANG BARU', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#0284C7', centerLat: -8.7032, centerLng: 116.2839, totalPelanggan: 40 },
  { kode: '0149', nama: 'BTN SRIGANGGE', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#CA8A04', centerLat: -8.6975, centerLng: 116.2834, totalPelanggan: 362 },
  { kode: '0150', nama: 'JAGO', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#0D9488', centerLat: -8.692, centerLng: 116.2782, totalPelanggan: 325 },
  { kode: '0151', nama: 'BEBIE', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#DC2626', centerLat: -8.689, centerLng: 116.2687, totalPelanggan: 276 },
  { kode: '0152', nama: 'TELAGAWARU-PANTI', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#65A30D', centerLat: -8.6905, centerLng: 116.257, totalPelanggan: 65 },
  { kode: '0153', nama: 'BUNSALAK', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#64748B', centerLat: -8.6974, centerLng: 116.2462, totalPelanggan: 15 },
  { kode: '0154', nama: 'MOJE-BUNDUE', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#B45309', centerLat: -8.7076, centerLng: 116.269, totalPelanggan: 161 },
  { kode: '0155', nama: 'MANDALIKA-WAKUL', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#C026D3', centerLat: -8.7114, centerLng: 116.2661, totalPelanggan: 284 },
  { kode: '0156', nama: 'GERANTUK', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#1D4ED8', centerLat: -8.7171, centerLng: 116.2667, totalPelanggan: 115 },
  { kode: '0157', nama: 'GERUNUNG', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#10B981', centerLat: -8.7226, centerLng: 116.272, totalPelanggan: 485 },
  { kode: '0158', nama: 'BUNGANTAPEN-NYERNYEM', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#BE123C', centerLat: -8.7255, centerLng: 116.2815, totalPelanggan: 60 },
  { kode: '0159', nama: 'KETEJER', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#047857', centerLat: -8.7239, centerLng: 116.2932, totalPelanggan: 92 },
  { kode: '0160', nama: 'PENABAN', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#F59E0B', centerLat: -8.717, centerLng: 116.3039, totalPelanggan: 104 },
  { kode: '0161', nama: 'AIK MUAL', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#3B82F6', centerLat: -8.707, centerLng: 116.281, totalPelanggan: 60 },
  { kode: '0162', nama: 'AMEN', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#8B5CF6', centerLat: -8.7031, centerLng: 116.2839, totalPelanggan: 4 },
  { kode: '0163', nama: 'DARUL PALAH / KEMULAH', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#EC4899', centerLat: -8.6974, centerLng: 116.2832, totalPelanggan: 35 },
  { kode: '0164', nama: 'JURING-LENENG', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#14B8A6', centerLat: -8.692, centerLng: 116.2778, totalPelanggan: 151 },
  { kode: '0165', nama: 'GONJAK', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#F97316', centerLat: -8.6891, centerLng: 116.2683, totalPelanggan: 215 },
  { kode: '0166', nama: 'BIDIN - UJAN RINTIS', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#6366F1', centerLat: -8.6908, centerLng: 116.2567, totalPelanggan: 246 },
  { kode: '0168', nama: 'WAKAN HANDAYANI', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#06B6D4', centerLat: -8.6978, centerLng: 116.246, totalPelanggan: 281 },
  { kode: '0169', nama: 'BUNUT BAOK', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#84CC16', centerLat: -8.7077, centerLng: 116.269, totalPelanggan: 444 },
  { kode: '0170', nama: 'ABIAN TUBUH', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#E11D48', centerLat: -8.7116, centerLng: 116.2662, totalPelanggan: 47 },
  { kode: '0171', nama: 'BEGAK', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#2563EB', centerLat: -8.7172, centerLng: 116.2669, totalPelanggan: 36 },
  { kode: '0172', nama: 'TIWUASEM', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#059669', centerLat: -8.7226, centerLng: 116.2723, totalPelanggan: 174 },
  { kode: '0173', nama: 'KWANGRUNDUN', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#D97706', centerLat: -8.7254, centerLng: 116.2818, totalPelanggan: 276 },
  { kode: '0174', nama: 'SELEBI', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#7C3AED', centerLat: -8.7237, centerLng: 116.2935, totalPelanggan: 152 },
  { kode: '0175', nama: 'RANGAH/BALERE', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#DB2777', centerLat: -8.7166, centerLng: 116.3041, totalPelanggan: 100 },
  { kode: '0176', nama: 'MANGGONG-MEKARDAMAI', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#0891B2', centerLat: -8.7069, centerLng: 116.281, totalPelanggan: 44 },
  { kode: '0177', nama: 'BRANGSAK', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#4F46E5', centerLat: -8.703, centerLng: 116.2838, totalPelanggan: 152 },
  { kode: '0178', nama: 'BATU NGULIK', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#EA580C', centerLat: -8.6973, centerLng: 116.283, totalPelanggan: 165 },
  { kode: '0179', nama: 'NUMPENG', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#16A34A', centerLat: -8.6919, centerLng: 116.2775, totalPelanggan: 93 },
  { kode: '0180', nama: 'LENDANG BATAH 2', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#9333EA', centerLat: -8.6892, centerLng: 116.268, totalPelanggan: 60 },
  { kode: '0181', nama: 'PONDOK SONKAR 2', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#0284C7', centerLat: -8.691, centerLng: 116.2563, totalPelanggan: 65 },
  { kode: '0182', nama: 'RUNTAK 2', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#CA8A04', centerLat: -8.6982, centerLng: 116.2458, totalPelanggan: 35 },
  { kode: '0183', nama: 'SUNDIL 2', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#0D9488', centerLat: -8.7078, centerLng: 116.269, totalPelanggan: 49 },
  { kode: '0184', nama: 'MERTAK TOMBOK 2', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#DC2626', centerLat: -8.7117, centerLng: 116.2663, totalPelanggan: 27 },
  { kode: '0185', nama: 'KU POS BODAK 2', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#65A30D', centerLat: -8.7173, centerLng: 116.2671, totalPelanggan: 11 },
  { kode: '0186', nama: 'BODAK 2', kodeKecamatan: '01', namaKecamatan: 'Praya', warna: '#64748B', centerLat: -8.7227, centerLng: 116.2726, totalPelanggan: 1114 },

  // ── 20 Acuan Wilayah Resmi Kecamatan 07 (Praya Barat) Sesuai PRD v1.2 ──
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
  // ── Acuan Wilayah Kecamatan 10 (Batukliang Utara) ──
  { kode: '1001', nama: 'Teratak / Batukliang Utara 01', kodeKecamatan: '10', namaKecamatan: 'Batukliang Utara', warna: '#0284C7', centerLat: -8.5150, centerLng: 116.3300 },
  { kode: '1002', nama: 'Lantan / Batukliang Utara 02', kodeKecamatan: '10', namaKecamatan: 'Batukliang Utara', warna: '#10B981', centerLat: -8.5250, centerLng: 116.3450 },
  // ── 11 Acuan Wilayah / Dekadi Resmi Kecamatan 13 (Praya Barat Daya) ──
  { kode: '1301', nama: 'PELAMBIK', kodeKecamatan: '13', namaKecamatan: 'Praya Barat Daya', warna: '#2563EB', centerLat: -8.7750, centerLng: 116.1250 },
  { kode: '1302', nama: 'TANGGONG', kodeKecamatan: '13', namaKecamatan: 'Praya Barat Daya', warna: '#059669', centerLat: -8.7850, centerLng: 116.1350 },
  { kode: '1303', nama: 'UNGGA', kodeKecamatan: '13', namaKecamatan: 'Praya Barat Daya', warna: '#D97706', centerLat: -8.7650, centerLng: 116.1450 },
  { kode: '1304', nama: 'MENGELOK', kodeKecamatan: '13', namaKecamatan: 'Praya Barat Daya', warna: '#7C3AED', centerLat: -8.7950, centerLng: 116.1150 },
  { kode: '1305', nama: 'BALE BUWUH', kodeKecamatan: '13', namaKecamatan: 'Praya Barat Daya', warna: '#DB2777', centerLat: -8.7800, centerLng: 116.1550 },
  { kode: '1306', nama: 'PERMAS', kodeKecamatan: '13', namaKecamatan: 'Praya Barat Daya', warna: '#0891B2', centerLat: -8.8100, centerLng: 116.1200 },
  { kode: '1307', nama: 'BL. LUAH', kodeKecamatan: '13', namaKecamatan: 'Praya Barat Daya', warna: '#4F46E5', centerLat: -8.8250, centerLng: 116.1300 },
  { kode: '1308', nama: 'BUAL', kodeKecamatan: '13', namaKecamatan: 'Praya Barat Daya', warna: '#EA580C', centerLat: -8.8050, centerLng: 116.1400 },
  { kode: '1309', nama: 'TENARU', kodeKecamatan: '13', namaKecamatan: 'Praya Barat Daya', warna: '#16A34A', centerLat: -8.7900, centerLng: 116.1500 },
  { kode: '1310', nama: 'BT. BEDUK', kodeKecamatan: '13', namaKecamatan: 'Praya Barat Daya', warna: '#9333EA', centerLat: -8.8150, centerLng: 116.1600 },
  { kode: '1311', nama: 'KRAN UMUM', kodeKecamatan: '13', namaKecamatan: 'Praya Barat Daya', warna: '#0284C7', centerLat: -8.7700, centerLng: 116.1300 },
  // ── 31 Acuan Wilayah / Dekadi Resmi Kecamatan 03 (Kopang) ──
  { kode: '0301', nama: 'JELOJOK', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#E11D48', centerLat: -8.6320, centerLng: 116.3650 },
  { kode: '0302', nama: 'KOMP BTN', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#2563EB', centerLat: -8.6280, centerLng: 116.3720 },
  { kode: '0303', nama: 'BARAT MESJID', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#059669', centerLat: -8.6350, centerLng: 116.3680 },
  { kode: '0304', nama: 'GUBUK ALANG', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#D97706', centerLat: -8.6400, centerLng: 116.3620 },
  { kode: '0305', nama: 'KOMP PEDALAMAN', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#7C3AED', centerLat: -8.6250, centerLng: 116.3750 },
  { kode: '0306', nama: 'SEMPUR', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#DB2777', centerLat: -8.6450, centerLng: 116.3580 },
  { kode: '0307', nama: 'KAMP BAJOK', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#0891B2', centerLat: -8.6300, centerLng: 116.3800 },
  { kode: '0308', nama: 'PULEMBANG', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#4F46E5', centerLat: -8.6380, centerLng: 116.3740 },
  { kode: '0309', nama: 'KAMP PENGOMPAN', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#EA580C', centerLat: -8.6220, centerLng: 116.3660 },
  { kode: '0310', nama: 'MONTES', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#16A34A', centerLat: -8.6480, centerLng: 116.3690 },
  { kode: '0311', nama: 'KARANG ANYAR', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#9333EA', centerLat: -8.6340, centerLng: 116.3850 },
  { kode: '0312', nama: 'PERESAK', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#0284C7', centerLat: -8.6180, centerLng: 116.3710 },
  { kode: '0313', nama: 'DESA NGOROK', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#CA8A04', centerLat: -8.6520, centerLng: 116.3630 },
  { kode: '0314', nama: 'DESA BEBUAK', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#0D9488', centerLat: -8.6150, centerLng: 116.3780 },
  { kode: '0315', nama: 'JURIT', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#DC2626', centerLat: -8.6550, centerLng: 116.3770 },
  { kode: '0316', nama: 'LENDANG ARE', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#65A30D', centerLat: -8.6290, centerLng: 116.3890 },
  { kode: '0317', nama: 'MT GAMANG', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#64748B', centerLat: -8.6600, centerLng: 116.3550 },
  { kode: '0318', nama: 'DARMAJI', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#B45309', centerLat: -8.6420, centerLng: 116.3920 },
  { kode: '0319', nama: 'PENGKORES', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#C026D3', centerLat: -8.6260, centerLng: 116.3600 },
  { kode: '0320', nama: 'KMP IWAN', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#1D4ED8', centerLat: -8.6470, centerLng: 116.3820 },
  { kode: '0321', nama: 'PENDAGIH', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#10B981', centerLat: -8.6360, centerLng: 116.3960 },
  { kode: '0322', nama: 'MENTINGGO', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#BE123C', centerLat: -8.6500, centerLng: 116.3730 },
  { kode: '0323', nama: 'PESENG', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#047857', centerLat: -8.6630, centerLng: 116.3680 },
  // Catatan: 0324 dikosongkan sesuai instruksi
  { kode: '0325', nama: 'MT BULUK', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#F59E0B', centerLat: -8.6210, centerLng: 116.3830 },
  { kode: '0326', nama: 'PENIMPUH', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#3B82F6', centerLat: -8.6440, centerLng: 116.3980 },
  { kode: '0327', nama: 'EMBUNGBANG', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#8B5CF6', centerLat: -8.6570, centerLng: 116.3880 },
  { kode: '0328', nama: 'LINGKUNG', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#EC4899', centerLat: -8.6330, centerLng: 116.3530 },
  { kode: '0329', nama: 'BORE', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#14B8A6', centerLat: -8.6490, centerLng: 116.3610 },
  { kode: '0330', nama: 'SEMPARU', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#F97316', centerLat: -8.6170, centerLng: 116.3650 },
  { kode: '0331', nama: 'DASAN BARU', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#6366F1', centerLat: -8.6270, centerLng: 116.3930 },
  { kode: '0332', nama: 'MUNCAN', kodeKecamatan: '03', namaKecamatan: 'Kopang', warna: '#06B6D4', centerLat: -8.6530, centerLng: 116.3950 },
  // ── 53 Acuan Wilayah / Dekadi Resmi Kecamatan 02 (Batukliang) ──
  { kode: '0201', nama: 'SENGKOL/MANTANG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#E11D48', centerLat: -8.6180, centerLng: 116.3120, totalPelanggan: 512 },
  { kode: '0202', nama: 'PEDALAMAN', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#2563EB', centerLat: -8.6220, centerLng: 116.3160, totalPelanggan: 48 },
  { kode: '0203', nama: 'JANTUK', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#059669', centerLat: -8.6250, centerLng: 116.3080, totalPelanggan: 160 },
  { kode: '0204', nama: 'GB BARU', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#D97706', centerLat: -8.6140, centerLng: 116.3090, totalPelanggan: 115 },
  { kode: '0205', nama: 'RAJU MAS', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#7C3AED', centerLat: -8.6100, centerLng: 116.3150, totalPelanggan: 71 },
  { kode: '0206', nama: 'SEGANTENG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#DB2777', centerLat: -8.6280, centerLng: 116.3140, totalPelanggan: 64 },
  { kode: '0207', nama: 'BARA BALI', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#0891B2', centerLat: -8.6320, centerLng: 116.3050, totalPelanggan: 365 },
  { kode: '0208', nama: 'CERET', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#4F46E5', centerLat: -8.6350, centerLng: 116.3100, totalPelanggan: 36 },
  { kode: '0209', nama: 'OTAK DESA', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#EA580C', centerLat: -8.6150, centerLng: 116.3220, totalPelanggan: 211 },
  { kode: '0210', nama: 'DAYE MESJID', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#16A34A', centerLat: -8.6200, centerLng: 116.3250, totalPelanggan: 56 },
  { kode: '0211', nama: 'GB EMBUNG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#9333EA', centerLat: -8.6270, centerLng: 116.3210, totalPelanggan: 60 },
  { kode: '0212', nama: 'KRANT UMUM Batukliang', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#0284C7', centerLat: -8.6170, centerLng: 116.3180, totalPelanggan: 11 },
  { kode: '0213', nama: 'PAGUTAN', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#CA8A04', centerLat: -8.6250, centerLng: 116.3000, totalPelanggan: 245 },
  { kode: '0214', nama: 'PONDOK PANDE', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#475569', centerLat: -8.6300, centerLng: 116.2980, totalPelanggan: 79 },
  { kode: '0217', nama: 'TOJANG BERENG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#0D9488', centerLat: -8.6380, centerLng: 116.3030, totalPelanggan: 4 },
  { kode: '0218', nama: 'MERTAK PAOK', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#DC2626', centerLat: -8.6410, centerLng: 116.3120, totalPelanggan: 119 },
  { kode: '0219', nama: 'REPOK PUYUNG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#65A30D', centerLat: -8.6450, centerLng: 116.3080, totalPelanggan: 133 },
  { kode: '0220', nama: 'KEMBANG KERANG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#64748B', centerLat: -8.6230, centerLng: 116.3310, totalPelanggan: 180 },
  { kode: '0221', nama: 'AIK DAREK', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#B45309', centerLat: -8.6150, centerLng: 116.3350, totalPelanggan: 130 },
  { kode: '0223', nama: 'GUNUNG JAE', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#C026D3', centerLat: -8.6080, centerLng: 116.3380, totalPelanggan: 34 },
  { kode: '0224', nama: 'LENDANG TAMPEL', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#1D4ED8', centerLat: -8.6120, centerLng: 116.3420, totalPelanggan: 152 },
  { kode: '0225', nama: 'GERANTUNG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#10B981', centerLat: -8.6190, centerLng: 116.3450, totalPelanggan: 26 },
  { kode: '0226', nama: 'REPUK PERINE', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#BE123C', centerLat: -8.6260, centerLng: 116.3410, totalPelanggan: 30 },
  { kode: '0227', nama: 'BEBANTE', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#047857', centerLat: -8.6330, centerLng: 116.3370, totalPelanggan: 14 },
  { kode: '0228', nama: 'PANCOR DAO', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#F59E0B', centerLat: -8.6390, centerLng: 116.3340, totalPelanggan: 8 },
  { kode: '0229', nama: 'DASAN CERMEN', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#3B82F6', centerLat: -8.6440, centerLng: 116.3300, totalPelanggan: 1 },
  { kode: '0230', nama: 'CEMPAKA PUTIH', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#8B5CF6', centerLat: -8.6480, centerLng: 116.3260, totalPelanggan: 5 },
  { kode: '0231', nama: 'SURABAYA', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#EC4899', centerLat: -8.6200, centerLng: 116.2900, totalPelanggan: 150 },
  { kode: '0232', nama: 'TOJAK', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#14B8A6', centerLat: -8.6350, centerLng: 116.2950, totalPelanggan: 277 },
  { kode: '0233', nama: 'KEBUN NYIUR BARABALI', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#F97316', centerLat: -8.6360, centerLng: 116.3020, totalPelanggan: 71 },
  { kode: '0235', nama: 'LENDANG DODE', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#6366F1', centerLat: -8.6050, centerLng: 116.3050, totalPelanggan: 121 },
  { kode: '0236', nama: 'KELANJUH', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#06B6D4', centerLat: -8.6020, centerLng: 116.3120, totalPelanggan: 128 },
  { kode: '0237', nama: 'SELEBUNG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#E11D48', centerLat: -8.6050, centerLng: 116.3200, totalPelanggan: 242 },
  { kode: '0238', nama: 'LD. KEKAH', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#2563EB', centerLat: -8.5980, centerLng: 116.3150, totalPelanggan: 111 },
  { kode: '0239', nama: 'TOJONG OJONG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#059669', centerLat: -8.6010, centerLng: 116.3270, totalPelanggan: 287 },
  { kode: '0240', nama: 'KEBUN KARET', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#D97706', centerLat: -8.5950, centerLng: 116.3220, totalPelanggan: 65 },
  { kode: '0241', nama: 'LENDANG PAOK', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#7C3AED', centerLat: -8.5920, centerLng: 116.3280, totalPelanggan: 150 },
  { kode: '0246', nama: 'BEBER', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#DB2777', centerLat: -8.6400, centerLng: 116.3250, totalPelanggan: 171 },
  { kode: '0247', nama: 'PAOK KUNING', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#0891B2', centerLat: -8.6460, centerLng: 116.3210, totalPelanggan: 56 },
  { kode: '0248', nama: 'LEKONG EMPAT', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#4F46E5', centerLat: -8.6520, centerLng: 116.3180, totalPelanggan: 55 },
  { kode: '0249', nama: 'SUBAHNALE', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#EA580C', centerLat: -8.6550, centerLng: 116.3250, totalPelanggan: 23 },
  { kode: '0250', nama: 'PAJANGAN', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#16A34A', centerLat: -8.6500, centerLng: 116.3320, totalPelanggan: 69 },
  { kode: '0251', nama: 'DASAN BARU', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#9333EA', centerLat: -8.6420, centerLng: 116.3390, totalPelanggan: 3 },
  { kode: '0252', nama: 'AIK GERING', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#0284C7', centerLat: -8.6360, centerLng: 116.3450, totalPelanggan: 135 },
  { kode: '0253', nama: 'BATU LAJANG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#CA8A04', centerLat: -8.6300, centerLng: 116.3500, totalPelanggan: 48 },
  { kode: '0254', nama: 'TAMPAK SIRING', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#475569', centerLat: -8.6000, centerLng: 116.3400, totalPelanggan: 265 },
  { kode: '0255', nama: 'JERANJANG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#0D9488', centerLat: -8.5960, centerLng: 116.3460, totalPelanggan: 35 },
  { kode: '0256', nama: 'DASAN BARU TAMPAK SIRING', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#DC2626', centerLat: -8.6040, centerLng: 116.3480, totalPelanggan: 114 },
  { kode: '0261', nama: 'ANTAK-ANTAK', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#65A30D', centerLat: -8.5880, centerLng: 116.3350, totalPelanggan: 2 },
  { kode: '0270', nama: 'BENENG', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#64748B', centerLat: -8.5850, centerLng: 116.3100, totalPelanggan: 174 },
  { kode: '0271', nama: 'BUJAK', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#B45309', centerLat: -8.5900, centerLng: 116.3200, totalPelanggan: 157 },
  { kode: '0272', nama: 'CELEGAH', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#C026D3', centerLat: -8.5820, centerLng: 116.3180, totalPelanggan: 109 },
  { kode: '0274', nama: 'RIRIS', kodeKecamatan: '02', namaKecamatan: 'Batukliang', warna: '#1D4ED8', centerLat: -8.5780, centerLng: 116.3250, totalPelanggan: 109 },
  // ── 22 Acuan Wilayah / Dekadi Resmi Kecamatan 04 (Janapria) ──
  { kode: '0401', nama: 'PENDEM', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#E11D48', centerLat: -8.6850, centerLng: 116.4150, totalPelanggan: 407 },
  { kode: '0402', nama: 'JANAPRIA', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#2563EB', centerLat: -8.6980, centerLng: 116.4120, totalPelanggan: 194 },
  { kode: '0403', nama: 'SABA', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#059669', centerLat: -8.7050, centerLng: 116.3950, totalPelanggan: 326 },
  { kode: '0404', nama: 'LOANG MAKA', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#D97706', centerLat: -8.6750, centerLng: 116.3850, totalPelanggan: 394 },
  { kode: '0405', nama: 'DURIAN', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#7C3AED', centerLat: -8.7150, centerLng: 116.4250, totalPelanggan: 226 },
  { kode: '0406', nama: 'KRANT WARGA', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#DB2777', centerLat: -8.6920, centerLng: 116.4080, totalPelanggan: 4 },
  { kode: '0408', nama: 'DASAN TINGGI', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#0891B2', centerLat: -8.6880, centerLng: 116.3980, totalPelanggan: 84 },
  { kode: '0409', nama: 'JURING', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#4F46E5', centerLat: -8.6820, centerLng: 116.4220, totalPelanggan: 104 },
  { kode: '0410', nama: 'JELITONG', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#EA580C', centerLat: -8.6780, centerLng: 116.4120, totalPelanggan: 115 },
  { kode: '0411', nama: 'SADAH', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#16A34A', centerLat: -8.7120, centerLng: 116.4380, totalPelanggan: 9 },
  { kode: '0412', nama: 'PONDOK REMPUNG', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#9333EA', centerLat: -8.7020, centerLng: 116.4280, totalPelanggan: 110 },
  { kode: '0413', nama: 'BILE TAWAH', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#0284C7', centerLat: -8.6900, centerLng: 116.4350, totalPelanggan: 117 },
  { kode: '0414', nama: 'SIWI', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#CA8A04', centerLat: -8.6950, centerLng: 116.4420, totalPelanggan: 103 },
  { kode: '0415', nama: 'LIWUNG', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#475569', centerLat: -8.7080, centerLng: 116.4180, totalPelanggan: 66 },
  { kode: '0416', nama: 'BERORE', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#0D9488', centerLat: -8.7220, centerLng: 116.4150, totalPelanggan: 20 },
  { kode: '0417', nama: 'TONJONG', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#DC2626', centerLat: -8.7180, centerLng: 116.4020, totalPelanggan: 37 },
  { kode: '0418', nama: 'PENAMBONG', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#65A30D', centerLat: -8.7280, centerLng: 116.3980, totalPelanggan: 29 },
  { kode: '0419', nama: 'NUNANG', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#64748B', centerLat: -8.7320, centerLng: 116.4120, totalPelanggan: 42 },
  { kode: '0420', nama: 'LINGKOK TERES', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#B45309', centerLat: -8.7250, centerLng: 116.4050, totalPelanggan: 110 },
  { kode: '0421', nama: 'PRAKO', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#C026D3', centerLat: -8.6800, centerLng: 116.4450, totalPelanggan: 101 },
  { kode: '0422', nama: 'PEMANTEK BAT DAYE', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#1D4ED8', centerLat: -8.6720, centerLng: 116.4320, totalPelanggan: 153 },
  { kode: '0423', nama: 'BAKAN JANAPRIA', kodeKecamatan: '04', namaKecamatan: 'Janapria', warna: '#10B981', centerLat: -8.7200, centerLng: 116.3800, totalPelanggan: 65 },
  // ── 17 Acuan Wilayah / Dekadi Resmi Kecamatan 06 (Pujut) ──
  { kode: '0601', nama: 'SENGKOL SELATAN', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#E11D48', centerLat: -8.8800, centerLng: 116.3050, totalPelanggan: 193 },
  { kode: '0602', nama: 'SENGKOL', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#2563EB', centerLat: -8.8650, centerLng: 116.3080, totalPelanggan: 808 },
  { kode: '0603', nama: 'KAWO', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#059669', centerLat: -8.8100, centerLng: 116.2900, totalPelanggan: 229 },
  { kode: '0604', nama: 'BALE ALONG', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#D97706', centerLat: -8.8720, centerLng: 116.3120, totalPelanggan: 35 },
  { kode: '0605', nama: 'GB DAREK', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#7C3AED', centerLat: -8.8550, centerLng: 116.2980, totalPelanggan: 107 },
  { kode: '0606', nama: 'DAYEN KUBUR', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#DB2777', centerLat: -8.8580, centerLng: 116.3050, totalPelanggan: 74 },
  { kode: '0607', nama: 'KR JANGKONG', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#0891B2', centerLat: -8.8620, centerLng: 116.3150, totalPelanggan: 71 },
  { kode: '0608', nama: 'BALE MONTONG', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#4F46E5', centerLat: -8.8500, centerLng: 116.3150, totalPelanggan: 337 },
  { kode: '0609', nama: 'PENGADANG', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#EA580C', centerLat: -8.8350, centerLng: 116.3300, totalPelanggan: 223 },
  { kode: '0610', nama: 'KMP SEDO', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#16A34A', centerLat: -8.8420, centerLng: 116.3220, totalPelanggan: 102 },
  { kode: '0611', nama: 'SENGKOL BARAT', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#9333EA', centerLat: -8.8680, centerLng: 116.2950, totalPelanggan: 29 },
  { kode: '0612', nama: 'BGK PENYILUK', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#0284C7', centerLat: -8.8750, centerLng: 116.3180, totalPelanggan: 21 },
  { kode: '0613', nama: 'KP SELAK', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#CA8A04', centerLat: -8.8850, centerLng: 116.3120, totalPelanggan: 47 },
  { kode: '0614', nama: 'KRANT UMUM', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#475569', centerLat: -8.8600, centerLng: 116.3100, totalPelanggan: 15 },
  { kode: '0615', nama: 'KETARE', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#0D9488', centerLat: -8.7800, centerLng: 116.3000, totalPelanggan: 500 },
  { kode: '0616', nama: 'TANAK AWU', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#DC2626', centerLat: -8.7650, centerLng: 116.2850, totalPelanggan: 423 },
  { kode: '0617', nama: 'TERUWAI', kodeKecamatan: '06', namaKecamatan: 'Pujut', warna: '#65A30D', centerLat: -8.9100, centerLng: 116.3350, totalPelanggan: 529 },
  // ── 5 Acuan Wilayah / Dekadi Resmi Kecamatan 09 (Kuta) ──
  { kode: '0901', nama: 'GERUPUK', kodeKecamatan: '09', namaKecamatan: 'Kuta', warna: '#E11D48', centerLat: -8.9050, centerLng: 116.3450, totalPelanggan: 284 },
  { kode: '0902', nama: 'KUTA', kodeKecamatan: '09', namaKecamatan: 'Kuta', warna: '#2563EB', centerLat: -8.8950, centerLng: 116.2820, totalPelanggan: 82 },
  { kode: '0903', nama: 'RAMBITAN', kodeKecamatan: '09', namaKecamatan: 'Kuta', warna: '#059669', centerLat: -8.8500, centerLng: 116.2900, totalPelanggan: 533 },
  { kode: '0904', nama: 'KRAN UMUM', kodeKecamatan: '09', namaKecamatan: 'Kuta', warna: '#D97706', centerLat: -8.8920, centerLng: 116.2800, totalPelanggan: 5 },
  { kode: '0905', nama: 'SONGGONG', kodeKecamatan: '09', namaKecamatan: 'Kuta', warna: '#7C3AED', centerLat: -8.8750, centerLng: 116.3250, totalPelanggan: 10 },
  // ── 27 Acuan Wilayah / Dekadi Resmi Kecamatan 11 (Praya Tengah) ──
  { kode: '1101', nama: 'PERUMNAS', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#E11D48', centerLat: -8.7120, centerLng: 116.2950, totalPelanggan: 567 },
  { kode: '1102', nama: 'BATU NYALA', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#2563EB', centerLat: -8.7250, centerLng: 116.3150, totalPelanggan: 309 },
  { kode: '1103', nama: 'LAJUT', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#059669', centerLat: -8.7050, centerLng: 116.3100, totalPelanggan: 860 },
  { kode: '1104', nama: 'SUDIRMAN', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#D97706', centerLat: -8.7100, centerLng: 116.2900, totalPelanggan: 347 },
  { kode: '1106', nama: 'KANDONG', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#7C3AED', centerLat: -8.7180, centerLng: 116.3020, totalPelanggan: 209 },
  { kode: '1107', nama: 'DS. GILIK', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#DB2777', centerLat: -8.7300, centerLng: 116.3200, totalPelanggan: 462 },
  { kode: '1108', nama: 'SEMAYAN', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#0891B2', centerLat: -8.7080, centerLng: 116.2850, totalPelanggan: 703 },
  { kode: '1109', nama: 'TAPON', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#4F46E5', centerLat: -8.7350, centerLng: 116.3250, totalPelanggan: 1 },
  { kode: '1110', nama: 'GERANTUNG PRATENG', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#EA580C', centerLat: -8.7200, centerLng: 116.3300, totalPelanggan: 183 },
  { kode: '1111', nama: 'KEKERE', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#16A34A', centerLat: -8.7220, centerLng: 116.3080, totalPelanggan: 144 },
  { kode: '1112', nama: 'PEKAT', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#9333EA', centerLat: -8.7150, centerLng: 116.3180, totalPelanggan: 49 },
  { kode: '1113', nama: 'JERO BUWUH', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#0284C7', centerLat: -8.7280, centerLng: 116.2980, totalPelanggan: 165 },
  { kode: '1114', nama: 'SASAKE', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#CA8A04', centerLat: -8.7380, centerLng: 116.3050, totalPelanggan: 485 },
  { kode: '1115', nama: 'BATU BANGKE', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#0D9488', centerLat: -8.7420, centerLng: 116.3120, totalPelanggan: 4 },
  { kode: '1116', nama: 'BAGEK RENDE', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#DC2626', centerLat: -8.7190, centerLng: 116.3240, totalPelanggan: 37 },
  { kode: '1117', nama: 'JONTLAK', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#65A30D', centerLat: -8.7020, centerLng: 116.2980, totalPelanggan: 492 },
  { kode: '1118', nama: 'LEBUNG PRATENG', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#64748B', centerLat: -8.7280, centerLng: 116.3320, totalPelanggan: 13 },
  { kode: '1119', nama: 'TEMPAS', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#B45309', centerLat: -8.7320, centerLng: 116.3100, totalPelanggan: 141 },
  { kode: '1120', nama: 'JURANG JALER', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#C026D3', centerLat: -8.7400, centerLng: 116.3200, totalPelanggan: 85 },
  { kode: '1121', nama: 'MERTAK MEN', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#1D4ED8', centerLat: -8.7450, centerLng: 116.3000, totalPelanggan: 41 },
  { kode: '1122', nama: 'PRAI GUNUNG', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#10B981', centerLat: -8.7480, centerLng: 116.3180, totalPelanggan: 26 },
  { kode: '1124', nama: 'NYAMPE', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#BE123C', centerLat: -8.7360, centerLng: 116.3280, totalPelanggan: 80 },
  { kode: '1125', nama: 'TORO', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#047857', centerLat: -8.7420, centerLng: 116.3350, totalPelanggan: 134 },
  { kode: '1126', nama: 'GAONG', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#F59E0B', centerLat: -8.7500, centerLng: 116.3250, totalPelanggan: 84 },
  { kode: '1127', nama: 'ULAR NAGE', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#3B82F6', centerLat: -8.7520, centerLng: 116.3150, totalPelanggan: 45 },
  { kode: '1129', nama: 'RANTIK', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#8B5CF6', centerLat: -8.7550, centerLng: 116.3200, totalPelanggan: 20 },
  { kode: '1130', nama: 'BATU BANGE', kodeKecamatan: '11', namaKecamatan: 'Praya Tengah', warna: '#EC4899', centerLat: -8.7480, centerLng: 116.3080, totalPelanggan: 81 },
  // ── 13 Acuan Wilayah / Dekadi Resmi Kecamatan 12 (Jonggat) ──
  { kode: '1201', nama: 'PUYUNG', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#E11D48', centerLat: -8.6850, centerLng: 116.2450, totalPelanggan: 780 },
  { kode: '1202', nama: 'SUKARARA', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#2563EB', centerLat: -8.7050, centerLng: 116.2250, totalPelanggan: 570 },
  { kode: '1203', nama: 'KRANT UMUM', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#059669', centerLat: -8.6820, centerLng: 116.2400, totalPelanggan: 2 },
  { kode: '1204', nama: 'NYEROT', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#D97706', centerLat: -8.6720, centerLng: 116.2300, totalPelanggan: 195 },
  { kode: '1205', nama: 'UBUNG', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#7C3AED', centerLat: -8.6580, centerLng: 116.2420, totalPelanggan: 162 },
  { kode: '1206', nama: 'BUNJERUK', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#DB2777', centerLat: -8.6650, centerLng: 116.2200, totalPelanggan: 80 },
  { kode: '1207', nama: 'BUNKATE', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#0891B2', centerLat: -8.6780, centerLng: 116.2150, totalPelanggan: 15 },
  { kode: '1208', nama: 'JELANTIK', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#4F46E5', centerLat: -8.6920, centerLng: 116.2350, totalPelanggan: 399 },
  { kode: '1209', nama: 'BATU TULIS', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#EA580C', centerLat: -8.7000, centerLng: 116.2100, totalPelanggan: 149 },
  { kode: '1210', nama: 'LABULIA', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#16A34A', centerLat: -8.7180, centerLng: 116.2050, totalPelanggan: 259 },
  { kode: '1211', nama: 'PERINE', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#9333EA', centerLat: -8.6880, centerLng: 116.2500, totalPelanggan: 153 },
  { kode: '1215', nama: 'JELANTIK UTARA', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#0284C7', centerLat: -8.6890, centerLng: 116.2360, totalPelanggan: 29 },
  { kode: '1216', nama: 'JELANTIK SELATAN', kodeKecamatan: '12', namaKecamatan: 'Jonggat', warna: '#CA8A04', centerLat: -8.6950, centerLng: 116.2340, totalPelanggan: 1 },
  // ── 19 Acuan Wilayah / Dekadi Resmi Kecamatan 08 (Pringgarata) ──
  { kode: '0801', nama: 'PRINGGARATA', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#E11D48', centerLat: -8.6050, centerLng: 116.2450, totalPelanggan: 488 },
  { kode: '0802', nama: 'SALAM SUKUR', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#2563EB', centerLat: -8.6080, centerLng: 116.2500, totalPelanggan: 96 },
  { kode: '0803', nama: 'KR. JANGKONG', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#059669', centerLat: -8.6120, centerLng: 116.2480, totalPelanggan: 40 },
  { kode: '0804', nama: 'SINTUNG', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#D97706', centerLat: -8.5900, centerLng: 116.2350, totalPelanggan: 102 },
  { kode: '0805', nama: 'ARJANGKA', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#7C3AED', centerLat: -8.5950, centerLng: 116.2400, totalPelanggan: 45 },
  { kode: '0806', nama: 'BAGU', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#DB2777', centerLat: -8.6200, centerLng: 116.2300, totalPelanggan: 133 },
  { kode: '0807', nama: 'MEDAS', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#0891B2', centerLat: -8.6150, centerLng: 116.2200, totalPelanggan: 71 },
  { kode: '0808', nama: 'PENGENJEK', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#4F46E5', centerLat: -8.6300, centerLng: 116.2400, totalPelanggan: 265 },
  { kode: '0809', nama: 'KRANT UMUM', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#EA580C', centerLat: -8.6040, centerLng: 116.2420, totalPelanggan: 11 },
  { kode: '0810', nama: 'REPOK SINTUNG', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#16A34A', centerLat: -8.5880, centerLng: 116.2380, totalPelanggan: 69 },
  { kode: '0812', nama: 'BILEBANTE', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#9333EA', centerLat: -8.6100, centerLng: 116.2150, totalPelanggan: 12 },
  { kode: '0813', nama: 'REPOK TUNJANG', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#0284C7', centerLat: -8.6250, centerLng: 116.2500, totalPelanggan: 145 },
  { kode: '0814', nama: 'DASAN BARU', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#CA8A04', centerLat: -8.6180, centerLng: 116.2550, totalPelanggan: 110 },
  { kode: '0815', nama: 'DASAN BARU JABON', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#0D9488', centerLat: -8.6220, centerLng: 116.2580, totalPelanggan: 124 },
  { kode: '0816', nama: 'BANTENG KESELET', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#DC2626', centerLat: -8.6350, centerLng: 116.2350, totalPelanggan: 48 },
  { kode: '0817', nama: 'PRINGGARATA BARAT', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#65A30D', centerLat: -8.6060, centerLng: 116.2380, totalPelanggan: 21 },
  { kode: '0818', nama: 'PRINGGARATA TIMUR', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#64748B', centerLat: -8.6040, centerLng: 116.2520, totalPelanggan: 18 },
  { kode: '0819', nama: 'BAREMBENG', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#B45309', centerLat: -8.6400, centerLng: 116.2450, totalPelanggan: 144 },
  { kode: '0820', nama: 'SISIK', kodeKecamatan: '08', namaKecamatan: 'Pringgarata', warna: '#C026D3', centerLat: -8.6000, centerLng: 116.2600, totalPelanggan: 186 },
  // ── 20 Acuan Wilayah / Dekadi Resmi Kecamatan 05 (Praya Timur) ──
  { kode: '0503', nama: 'MUJUR', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#E11D48', centerLat: -8.7650, centerLng: 116.3750, totalPelanggan: 891 },
  { kode: '0504', nama: 'GANTI', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#2563EB', centerLat: -8.7850, centerLng: 116.3850, totalPelanggan: 702 },
  { kode: '0505', nama: 'SENGKERANG', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#059669', centerLat: -8.7800, centerLng: 116.4150, totalPelanggan: 287 },
  { kode: '0506', nama: 'SEMOYANG', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#D97706', centerLat: -8.7250, centerLng: 116.3950, totalPelanggan: 294 },
  { kode: '0507', nama: 'MARONG', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#7C3AED', centerLat: -8.8050, centerLng: 116.3800, totalPelanggan: 577 },
  { kode: '0508', nama: 'KRANT UMUM', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#DB2777', centerLat: -8.7630, centerLng: 116.3720, totalPelanggan: 20 },
  { kode: '0509', nama: 'BELEKA', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#0891B2', centerLat: -8.7350, centerLng: 116.3650, totalPelanggan: 194 },
  { kode: '0510', nama: 'BELEKE TIMUR', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#4F46E5', centerLat: -8.7380, centerLng: 116.3750, totalPelanggan: 1 },
  { kode: '0512', nama: 'SENAYAN', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#EA580C', centerLat: -8.7750, centerLng: 116.3900, totalPelanggan: 73 },
  { kode: '0513', nama: 'PERLUASAN', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#16A34A', centerLat: -8.7680, centerLng: 116.3800, totalPelanggan: 31 },
  { kode: '0514', nama: 'OROK-OROK', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#9333EA', centerLat: -8.7550, centerLng: 116.3900, totalPelanggan: 97 },
  { kode: '0515', nama: 'TEMBUKU-DAHA', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#0284C7', centerLat: -8.7700, centerLng: 116.4050, totalPelanggan: 54 },
  { kode: '0516', nama: 'MANGGU-SANTONG', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#CA8A04', centerLat: -8.7600, centerLng: 116.4100, totalPelanggan: 10 },
  { kode: '0517', nama: 'BT.RINTANG', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#0D9488', centerLat: -8.7900, centerLng: 116.3750, totalPelanggan: 73 },
  { kode: '0518', nama: 'MENSEH-KULEM', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#DC2626', centerLat: -8.7950, centerLng: 116.3950, totalPelanggan: 75 },
  { kode: '0519', nama: 'NYANTREN+PENYABUKAN', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#65A30D', centerLat: -8.8000, centerLng: 116.4100, totalPelanggan: 115 },
  { kode: '0520', nama: 'KR PAYUNG+MOTOR', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#64748B', centerLat: -8.8100, centerLng: 116.3900, totalPelanggan: 69 },
  { kode: '0521', nama: 'RANGAH KONDOK', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#B45309', centerLat: -8.8150, centerLng: 116.4050, totalPelanggan: 74 },
  { kode: '0522', nama: 'PENGENDONG-PRATIM', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#C026D3', centerLat: -8.8200, centerLng: 116.3750, totalPelanggan: 238 },
  { kode: '0525', nama: 'KIDANG', kodeKecamatan: '05', namaKecamatan: 'Praya Timur', warna: '#1D4ED8', centerLat: -8.8350, centerLng: 116.3850, totalPelanggan: 596 },
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
      if (storedWilayah) {
        const parsed: WilayahAcuan[] = JSON.parse(storedWilayah);
        const existingCodes = new Set(parsed.map((w) => w.kode));
        const missing = DEFAULT_WILAYAH_LIST.filter((w) => !existingCodes.has(w.kode));
        let updated = missing.length > 0;

        const defaultMap = new Map(DEFAULT_WILAYAH_LIST.map((w) => [w.kode, w]));
        parsed.forEach((w) => {
          const def = defaultMap.get(w.kode);
          if (def && (w.nama === w.kode || !w.nama || w.nama.startsWith('Wilayah ' + w.kode))) {
            w.nama = def.nama;
            w.namaKecamatan = def.namaKecamatan;
            w.kodeKecamatan = def.kodeKecamatan;
            if (def.totalPelanggan && !w.totalPelanggan) {
              w.totalPelanggan = def.totalPelanggan;
            }
            updated = true;
          }
        });

        if (updated) {
          this.wilayah = [...parsed, ...missing].sort((a, b) => a.kode.localeCompare(b.kode));
          this.safePersist(STORAGE_KEYS.WILAYAH, this.wilayah);
        } else {
          this.wilayah = parsed;
        }
      } else {
        this.wilayah = [...DEFAULT_WILAYAH_LIST];
      }

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

      // Muat dataset dari IndexedDB jika ada (mengatasi limit kuota 5MB localStorage)
      idbGet<Pelanggan[]>('current_pelanggan_dataset').then((saved) => {
        if (saved && Array.isArray(saved) && saved.length > 0) {
          const isDemo = this.snapshots.some((s) => s.id === this.activeSnapshotId && s.is_demo);
          if (saved.length > this.pelanggan.length || isDemo) {
            this.pelanggan = saved;
            this.notify();
          }
        }
      }).catch(() => {});

      // Sinkronkan otomatis ke server Neon Cloud di latar belakang
      setTimeout(() => {
        this.syncFromCloud().catch(() => {});
      }, 50);
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

  public async pushWilayahToCloud(wilayahList: WilayahAcuan[]): Promise<boolean> {
    try {
      let res = await fetch('/api/gis/wilayah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wilayah: wilayahList }),
      });
      if (!res.ok) {
        res = await fetch('/api/wilayah', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wilayah: wilayahList }),
        });
      }
      return res.ok;
    } catch (e) {
      console.warn('Gagal sinkron acuan wilayah ke Neon Cloud:', e);
      return false;
    }
  }

  public updateWilayahColor(kode: string, warna: string) {
    this.wilayah = this.wilayah.map((w) => (w.kode === kode ? { ...w, warna } : w));
    this.safePersist(STORAGE_KEYS.WILAYAH, this.wilayah);
    const updated = this.wilayah.find((w) => w.kode === kode);
    if (updated) this.pushWilayahToCloud([updated]).catch(() => {});
    this.notify();
  }

  public updateWilayahName(kode: string, nama: string) {
    this.wilayah = this.wilayah.map((w) => (w.kode === kode ? { ...w, nama } : w));
    // Also update nama_wilayah in loaded pelanggan
    this.pelanggan = this.pelanggan.map((p) => (p.kode_wilayah === kode ? { ...p, nama_wilayah: nama } : p));
    this.safePersist(STORAGE_KEYS.WILAYAH, this.wilayah);
    this.safePersist(STORAGE_KEYS.PELANGGAN, this.pelanggan);
    const updated = this.wilayah.find((w) => w.kode === kode);
    if (updated) this.pushWilayahToCloud([updated]).catch(() => {});
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
    this.pushWilayahToCloud([newWilayah]).catch(() => {});
    this.notify();
  }

  public resetWilayahColors() {
    const defaultColorMap = new Map(DEFAULT_WILAYAH_LIST.map((w) => [w.kode, w.warna]));
    this.wilayah = this.wilayah.map((w) => ({ ...w, warna: defaultColorMap.get(w.kode) || w.warna }));
    this.safePersist(STORAGE_KEYS.WILAYAH, this.wilayah);
    this.pushWilayahToCloud(this.wilayah).catch(() => {});
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

    // Persist first; try localStorage with pruning, always persist full set to IndexedDB
    try {
      this.writeWithPruning(STORAGE_KEYS.PELANGGAN, next);
    } catch (e) {
      console.warn('localStorage quota reached, dataset preserved in IndexedDB:', e);
    }
    idbSet('current_pelanggan_dataset', next).catch(() => {});

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
    idbSet(`archive_${id}`, next).catch(() => {});
    this.enforceArchiveLimit();
    this.notify();

    // Otomatis simpan ke database Neon Cloud di latar belakang agar tersinkron ke semua perangkat lain
    this.pushToCloud(next, mode).catch((err) => {
      console.warn('Gagal sinkron data upload ke Neon Cloud:', err);
    });

    return snapshot;
  }

  /**
   * Sinkronisasi data pelanggan dari PostgreSQL / Neon Cloud secara realtime.
   * Dipanggil otomatis saat aplikasi dibuka di perangkat mana pun.
   */
  public async syncFromCloud(force = false): Promise<{ ok: boolean; count: number; message?: string }> {
    try {
      // Sync Acuan Wilayah dari Neon Cloud agar nama wilayah tersimpan di semua perangkat otomatis
      try {
        let wRes = await fetch(`/api/gis/wilayah?t=${Date.now()}`);
        if (!wRes.ok) wRes = await fetch(`/api/wilayah?t=${Date.now()}`);
        if (wRes.ok) {
          const wData = await wRes.json();
          if (wData && wData.ok && Array.isArray(wData.wilayah) && wData.wilayah.length > 0) {
            const cloudMap = new Map<string, WilayahAcuan>(wData.wilayah.map((w: WilayahAcuan) => [w.kode, w]));
            const localMap = new Map<string, WilayahAcuan>(this.wilayah.map((w) => [w.kode, w]));
            for (const [kode, cloudW] of cloudMap.entries()) {
              localMap.set(kode, cloudW);
            }
            this.wilayah = Array.from(localMap.values()).sort((a, b) => a.kode.localeCompare(b.kode));
            this.safePersist(STORAGE_KEYS.WILAYAH, this.wilayah);
            this.notify();
          }
        }
      } catch (wErr) {
        console.warn('Gagal sinkron acuan wilayah dari Neon Cloud:', wErr);
      }

      let res = await fetch(`/api/gis/pelanggan?t=${Date.now()}`);
      if (!res.ok) {
        res = await fetch(`/api/pelanggan?t=${Date.now()}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data && data.ok && Array.isArray(data.pelanggan)) {
        if (data.pelanggan.length > 0) {
          const isCurrentDemo = this.snapshots.some((s) => s.id === this.activeSnapshotId && s.is_demo);
          const countDiffers = data.pelanggan.length !== this.pelanggan.length;

          if (force || isCurrentDemo || countDiffers) {
            this.pelanggan = data.pelanggan;
            this.safePersist(STORAGE_KEYS.PELANGGAN, this.pelanggan);
            idbSet('current_pelanggan_dataset', this.pelanggan).catch(() => {});

            const now = new Date();
            const cloudSnapId = 'cloud-sync-' + now.toISOString().slice(0, 10);
            const flaggedCount = this.pelanggan.filter((p) => p.is_flagged).length;

            const cloudSnap: UploadSnapshot = {
              id: cloudSnapId,
              filename: 'Database_Neon_Cloud.pgsql',
              uploaded_at: now.toISOString(),
              uploader_name: 'Neon Cloud Database',
              uploader_role: 'PostgreSQL Server',
              total_rows: this.pelanggan.length,
              valid_rows: this.pelanggan.length - flaggedCount,
              flagged_rows: flaggedCount,
              error_rows: 0,
              mode: 'replace',
              is_active: true,
              notes: `Sinkronisasi realtime dari server database Neon Cloud (${this.pelanggan.length} pelanggan).`,
            };

            this.snapshots = [cloudSnap, ...this.snapshots.filter((s) => s.id !== cloudSnapId).map((s) => ({ ...s, is_active: false }))];
            this.activeSnapshotId = cloudSnapId;
            this.persistSnapshotMeta();
            this.tryArchive(cloudSnapId, this.pelanggan);
            idbSet(`archive_${cloudSnapId}`, this.pelanggan).catch(() => {});
            this.notify();

            return { 
              ok: true, 
              count: data.pelanggan.length, 
              message: `Berhasil memuat ${data.pelanggan.length} data pelanggan dari database Neon Cloud!` 
            };
          }
          return { ok: true, count: data.pelanggan.length, message: 'Data pelanggan sudah sinkron dengan server.' };
        } else {
          // Neon Cloud masih 0 baris, tapi jika lokal punya data asli bukan demo, kirim ke Neon Cloud
          const isCurrentDemo = this.snapshots.some((s) => s.id === this.activeSnapshotId && s.is_demo);
          if (!isCurrentDemo && this.pelanggan.length > 0) {
            this.pushToCloud(this.pelanggan, 'replace').catch(() => {});
          }
        }
      } else if (data && data.ok === false) {
        let msg = data.error || 'Server database cloud sedang tidak tersedia.';
        if (msg.includes('402') || msg.toLowerCase().includes('quota')) {
          msg = 'Database Neon Cloud melampaui batas kuota gratis (HTTP 402 Quota Exceeded). Data di server Neon belum tersimpan. Silakan upload file Excel langsung di PC ini atau reset kuota Neon.';
        }
        return {
          ok: false,
          count: this.pelanggan.length,
          message: msg,
        };
      }
      return { ok: true, count: this.pelanggan.length };
    } catch (err: any) {
      console.warn('Gagal sinkron data pelanggan dari Neon Cloud:', err.message);
      return { ok: false, count: this.pelanggan.length, message: err.message };
    }
  }

  /**
   * Mengirim data pelanggan ke database Neon Cloud server secara bertahap (chunked)
   * agar aman dari batas ukuran request (4.5MB) dan timeout serverless Vercel.
   */
  public async pushToCloud(
    customers: Pelanggan[],
    mode: 'replace' | 'update' = 'replace',
    onProgress?: (sent: number, total: number) => void
  ): Promise<{ ok: boolean; count?: number; message?: string; error?: string }> {
    if (!customers || customers.length === 0) {
      return { ok: true, count: 0, message: 'Tidak ada data pelanggan yang dikirim.' };
    }

    try {
      const BATCH_SIZE = 500;
      let totalSaved = 0;
      const total = customers.length;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = customers.slice(i, i + BATCH_SIZE);
        // Mode 'replace' hanya dijalankan pada batch pertama (i === 0) jika dipilih.
        // Batch berikutnya (i > 0) harus selalu 'update' (upsert) agar tidak menghapus batch sebelumnya!
        const currentMode = (i === 0 && mode === 'replace') ? 'replace' : 'update';

        let res = await fetch('/api/gis/pelanggan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customers: chunk, mode: currentMode }),
        });
        if (!res.ok) {
          res = await fetch('/api/pelanggan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customers: chunk, mode: currentMode }),
          });
        }

        const data = await res.json().catch(() => null);
        if (!res.ok || (data && data.ok === false)) {
          let msg = data?.error || `HTTP ${res.status}`;
          if (msg.includes('402') || msg.toLowerCase().includes('quota')) {
            msg = 'Database Neon Cloud melampaui batas kuota gratis (402 Quota Exceeded).';
          }
          return { ok: false, error: `Gagal pada baris ${i + 1}-${i + chunk.length}: ${msg}` };
        }

        totalSaved += (data?.savedCount || chunk.length);
        if (onProgress) {
          onProgress(Math.min(i + chunk.length, total), total);
        }
      }

      return {
        ok: true,
        count: totalSaved,
        message: `Berhasil menyimpan ${totalSaved.toLocaleString('id-ID')} titik pelanggan ke database Neon Cloud! Semua perangkat langsung tersinkronkan.`,
      };
    } catch (err: any) {
      console.error('Gagal mengirim pelanggan ke Neon Cloud:', err);
      return { ok: false, error: err.message };
    }
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
