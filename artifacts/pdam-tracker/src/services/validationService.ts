import { Pelanggan, WilayahAcuan, ValidationErrorItem, ValidationSummary, GolonganTarif, StatusSambungan } from '@/types/pdam';
import { checkSpatialAnomaly, isInBounds, SERVICE_AREA_BOUNDS } from './pdamDataService';
import { GOLONGAN_LIST, GOLONGAN_META, MAX_UPLOAD_BYTES } from '@/lib/constants';
import type { SpreadsheetWorkerResponse } from './spreadsheet.worker';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const ALLOWED_EXTENSIONS = /\.(xlsx|xls|csv)$/i;

export interface ValidationOutput {
  summary: ValidationSummary;
  parsedRecords: Pelanggan[];
}

type RawRow = Record<string, unknown>;

function parseInWorker(buffer: ArrayBuffer): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./spreadsheet.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<SpreadsheetWorkerResponse>) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data.rows);
      else reject(new Error(e.data.error));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('Gagal memproses file.'));
    };
    worker.postMessage(buffer, [buffer]);
  });
}

async function parseOnMainThread(buffer: ArrayBuffer): Promise<RawRow[]> {
  const XLSX = await import('xlsx');
  try {
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true, dense: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<RawRow>(sheet, { raw: false, defval: '' });
  } catch {
    throw new Error('Format file tidak didukung atau file korup. Pastikan file berupa Excel (.xlsx, .xls) atau CSV.');
  }
}

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

export class ValidationService {
  public static async parseAndValidateFile(file: File, wilayahAcuanList: WilayahAcuan[]): Promise<ValidationOutput> {
    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      throw new Error('Jenis file tidak didukung. Gunakan .xlsx, .xls, atau .csv.');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`Ukuran file ${(file.size / 1024 / 1024).toFixed(1)} MB melebihi batas 20 MB.`);
    }
    const buffer = await file.arrayBuffer();
    const rows = typeof Worker !== 'undefined' ? await parseInWorker(buffer) : await parseOnMainThread(buffer);
    return this.validateRawRows(rows, wilayahAcuanList);
  }

  public static validateRawRows(rows: RawRow[], wilayahAcuanList: WilayahAcuan[]): ValidationOutput {
    const errors: ValidationErrorItem[] = [];
    const warnings: ValidationErrorItem[] = [];
    const parsedRecords: Pelanggan[] = [];
    const seenIds = new Set<string>();
    const wilayahMap = new Map<string, WilayahAcuan>(wilayahAcuanList.map((w) => [w.kode, w]));

    if (!rows || rows.length === 0) {
      errors.push({
        rowNumber: 0,
        field: 'file',
        value: null,
        message: 'File tidak memuat data baris pelanggan (kosong).',
        severity: 'error',
      });
      return {
        summary: { totalRows: 0, validCount: 0, flaggedCount: 0, errorCount: 1, canProceed: false, errors, warnings },
        parsedRecords: [],
      };
    }

    const recordRowMap = new Map<string, number>();

    rows.forEach((row, index) => {
      const rowNum = index + 2; // header is row 1
      let rowHasFatalError = false;
      const flagReasons: string[] = [];
      const warn = (field: string, value: unknown, message: string, flag?: string) => {
        warnings.push({ rowNumber: rowNum, field, value, message, severity: 'warning' });
        if (flag) flagReasons.push(flag);
      };
      const fail = (field: string, value: unknown, message: string) => {
        errors.push({ rowNumber: rowNum, field, value, message, severity: 'error' });
        rowHasFatalError = true;
      };

      // Normalize keys into a prototype-less object (blocks prototype pollution).
      const r: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().toLowerCase().replace(/[\s\-.]+/g, '_');
        if (FORBIDDEN_KEYS.has(cleanKey)) continue;
        const value = row[key];
        r[cleanKey] = typeof value === 'string' ? value.trim() : value;
      }

      // ── 1. Kode Pelanggan (wajib, 9 digit KKWWxxxxx) ──
      let kodePelanggan = str(
        r.kode_pelanggan ??
        r.id_pelanggan ??
        r.kode ??
        r.no_pelanggan ??
        r.no_pelan ??
        r.no_pel ??
        r.nosamb ??
        r.no_sambungan
      ).replace(/\s+/g, '');

      if (/^\d{8}$/.test(kodePelanggan)) {
        // Excel stripped the leading zero from a numeric cell (e.g. 70100861 -> 070100861).
        kodePelanggan = `0${kodePelanggan}`;
        warn('kode_pelanggan', kodePelanggan, 'Angka 0 di depan dipulihkan otomatis (terpotong oleh format angka Excel).');
      }

      if (!kodePelanggan) {
        fail('kode_pelanggan', kodePelanggan, 'Kode pelanggan wajib diisi (kolom NO_PELAN / KODE_PELANGGAN).');
      } else if (!/^\d{9}$/.test(kodePelanggan)) {
        fail('kode_pelanggan', kodePelanggan, `Kode pelanggan harus 9 digit angka (KKWWxxxxx). Ditemukan "${kodePelanggan}" (${kodePelanggan.length} karakter).`);
      } else if (seenIds.has(kodePelanggan)) {
        fail('kode_pelanggan', kodePelanggan, `Kode pelanggan "${kodePelanggan}" duplikat.`);
      } else {
        seenIds.add(kodePelanggan);
      }

      // ── 2. Wilayah acuan (4 digit KKWW) ──
      const isValidKode = /^\d{9}$/.test(kodePelanggan);
      const kodeKecamatan = isValidKode ? kodePelanggan.slice(0, 2) : '';
      const kodeWilayah = isValidKode ? kodePelanggan.slice(0, 4) : '';
      const wilayahMatch = wilayahMap.get(kodeWilayah);
      if (isValidKode && !wilayahMatch) {
        fail('kode_wilayah', kodeWilayah, `Kode wilayah "${kodeWilayah}" belum terdaftar di tabel acuan wilayah.`);
      }

      // Optional explicit wilayah column must match the code prefix (PRD §8 rule 5).
      const explicitWilayah = str(r.kode_wilayah);
      if (explicitWilayah && kodeWilayah && explicitWilayah !== kodeWilayah) {
        warn('kode_wilayah', explicitWilayah, `Kolom kode_wilayah "${explicitWilayah}" tidak sama dengan awalan kode pelanggan "${kodeWilayah}".`, 'Wilayah tidak cocok');
      }

      // ── 3. Nama (wajib) ──
      const namaPelanggan = str(r.nama_pelanggan ?? r.nama ?? r.customer_name).slice(0, 200);
      if (!namaPelanggan) fail('nama_pelanggan', namaPelanggan, 'Nama pelanggan wajib diisi.');

      // ── 4. Alamat (opsional) ──
      const alamat = (str(r.alamat ?? r.address) || `Ds. ${wilayahMatch?.nama || '-'}`).slice(0, 300);

      // ── 5. Koordinat (wajib, desimal WGS84) ──
      const rawLat = r.latitude ?? r.lat ?? r.y;
      const rawLng = r.longitude ?? r.lng ?? r.long ?? r.x;
      let lat = parseFloat(str(rawLat).replace(',', '.'));
      let lng = parseFloat(str(rawLng).replace(',', '.'));

      if (lat > 100 && lng < 0) {
        [lat, lng] = [lng, lat];
        warn('koordinat', `${rawLat}, ${rawLng}`, 'Latitude dan longitude tertukar, dibalik otomatis.', 'Koordinat sempat tertukar (diperbaiki otomatis)');
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        fail('koordinat', `${rawLat}, ${rawLng}`, 'Latitude/longitude tidak valid (wajib angka desimal WGS84, bukan 0).');
      } else if (!isInBounds(lat, lng, SERVICE_AREA_BOUNDS)) {
        warn('koordinat', `${lat}, ${lng}`, `Titik (${lat.toFixed(5)}, ${lng.toFixed(5)}) di luar area layanan Pulau Lombok.`, 'Koordinat di luar area layanan');
      }

      // ── 6. Golongan Tarif (prioritaskan kode urjlw & uraian urjlwp dari Excel) ──
      const rawKodeGol = str(r.urjlw ?? r.golongan ?? r.gol ?? r.tarif).toUpperCase();
      const rawUraianGol = str(r.urjlwp ?? r.uraian_golongan ?? r.kategori_tarif);

      // Gunakan kode golongan asli Excel (misal 2B, 2A, 3A, R1, dll.)
      const golongan: GolonganTarif = rawKodeGol || (rawUraianGol ? rawUraianGol : '2B');
      const uraianGolongan = rawUraianGol || (GOLONGAN_META[golongan]?.label || '');

      // ── 7. Status sambungan (dukung urstat_smb seperti Aktif, Tutup, Segel, Putus) ──
      const rawStatus = str(r.status_sambungan ?? r.status ?? r.urstat_smb ?? r.stat_smb ?? r.status_smb);
      let status: StatusSambungan = 'Aktif';
      if (/non|tutup|segel/i.test(rawStatus)) status = 'Nonaktif';
      else if (/putus|cabut|bongkar/i.test(rawStatus)) status = 'Putus';

      if (rowHasFatalError) return;

      const record: Pelanggan = {
        id: kodePelanggan,
        kode_pelanggan: kodePelanggan,
        nama_pelanggan: namaPelanggan,
        alamat,
        kode_kecamatan: kodeKecamatan,
        kode_wilayah: kodeWilayah,
        nama_wilayah: wilayahMatch?.nama || `Wilayah ${kodeWilayah}`,
        golongan,
        uraian_golongan: uraianGolongan,
        status_sambungan: status,
        latitude: lat,
        longitude: lng,
        is_flagged: false,
        flag_reasons: flagReasons,
        spatial_anomaly: null,
        colocation_anomaly: null,
        nomor_meter: str(r.nomor_meter) || `WM-${kodeWilayah}-${kodePelanggan.slice(4)}`,
        tanggal_pasang: str(r.tanggal_pasang) || undefined,
      };

      const anomaly = checkSpatialAnomaly(record);
      if (anomaly) {
        record.spatial_anomaly = anomaly;
        warn('koordinat', `${lat}, ${lng}`, anomaly, anomaly);
      }
      record.is_flagged = record.flag_reasons.length > 0;
      parsedRecords.push(record);
      recordRowMap.set(kodePelanggan, rowNum);
    });

    // ── Post-pass: Deteksi 1 titik koordinat sama tapi wilayah/kecamatan berbeda ──
    const coordMap = new Map<string, Pelanggan[]>();
    for (const record of parsedRecords) {
      if (Number.isFinite(record.latitude) && Number.isFinite(record.longitude)) {
        const coordKey = `${record.latitude.toFixed(5)},${record.longitude.toFixed(5)}`;
        let list = coordMap.get(coordKey);
        if (!list) {
          list = [];
          coordMap.set(coordKey, list);
        }
        list.push(record);
      }
    }

    for (const [, group] of coordMap) {
      if (group.length > 1) {
        const distinctWilayah = Array.from(new Set(group.map((g) => g.kode_wilayah))).filter(Boolean);
        if (distinctWilayah.length > 1) {
          const wilayahNames = Array.from(new Set(group.map((g) => g.nama_wilayah || g.kode_wilayah))).filter(Boolean);
          const warnMsg = `Titik koordinat (${group[0].latitude.toFixed(5)}, ${group[0].longitude.toFixed(5)}) dipakai di ${distinctWilayah.length} wilayah berbeda: ${wilayahNames.join(', ')}`;
          for (const item of group) {
            item.colocation_anomaly = warnMsg;
            if (!item.flag_reasons.includes(warnMsg)) {
              item.flag_reasons.push(warnMsg);
            }
            item.is_flagged = true;
            warnings.push({
              rowNumber: recordRowMap.get(item.kode_pelanggan) || 0,
              field: 'koordinat',
              value: `${item.latitude}, ${item.longitude}`,
              message: `Pelanggan ${item.kode_pelanggan}: ${warnMsg}`,
              severity: 'warning',
            });
          }
        }
      }
    }

    return {
      summary: {
        totalRows: rows.length,
        validCount: parsedRecords.length,
        flaggedCount: parsedRecords.filter((p) => p.is_flagged).length,
        errorCount: errors.length,
        canProceed: errors.length === 0,
        errors,
        warnings,
      },
      parsedRecords,
    };
  }
}
