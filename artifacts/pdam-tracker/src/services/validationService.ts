import { Pelanggan, WilayahAcuan, ValidationErrorItem, ValidationSummary, GolonganTarif, StatusSambungan } from '@/types/pdam';
import * as XLSX from 'xlsx';
import { checkSpatialAnomaly } from './pdamDataService';

// Area Bounding Box Wajar untuk Kecamatan Praya Barat, Lombok Tengah (WGS84)
const BOUNDS_PRAYA_BARAT = {
  minLat: -8.9500,
  maxLat: -8.6500,
  minLng: 116.1000,
  maxLng: 116.3500,
};

const VALID_GOLONGAN: GolonganTarif[] = ['R1', 'R2', 'B1', 'S', 'I'];
const VALID_STATUS: StatusSambungan[] = ['Aktif', 'Nonaktif', 'Putus'];

export interface ValidationOutput {
  summary: ValidationSummary;
  parsedRecords: Pelanggan[];
}

export class ValidationService {
  public static async parseAndValidateFile(
    file: File,
    wilayahAcuanList: WilayahAcuan[]
  ): Promise<ValidationOutput> {
    const rawData = await this.readRawDataFromFile(file);
    return this.validateRawRows(rawData, wilayahAcuanList);
  }

  private static readRawDataFromFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: false, cellText: false });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Read raw rows with headers
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
            raw: false,
            defval: '',
          });

          resolve(jsonData);
        } catch (err) {
          reject(new Error('Format file tidak didukung atau file korup. Pastikan file berupa Excel (.xlsx, .xls) atau CSV.'));
        }
      };

      reader.onerror = () => reject(new Error('Gagal membaca file dari disk.'));
      reader.readAsArrayBuffer(file);
    });
  }

  public static validateRawRows(
    rows: any[],
    wilayahAcuanList: WilayahAcuan[]
  ): ValidationOutput {
    const errors: ValidationErrorItem[] = [];
    const warnings: ValidationErrorItem[] = [];
    const parsedRecords: Pelanggan[] = [];
    const seenIds = new Set<string>();

    const wilayahMap = new Map<string, WilayahAcuan>(wilayahAcuanList.map(w => [w.kode, w]));

    if (!rows || rows.length === 0) {
      errors.push({
        rowNumber: 0,
        field: 'file',
        value: null,
        message: 'File tidak memuat data baris pelanggan (kosong).',
        severity: 'error',
      });

      return {
        summary: {
          totalRows: 0,
          validCount: 0,
          flaggedCount: 0,
          errorCount: 1,
          canProceed: false,
          errors,
          warnings,
        },
        parsedRecords: [],
      };
    }

    rows.forEach((row, index) => {
      const rowNum = index + 2; // Row number in spreadsheet (accounting for 1-based index & header)
      let rowHasFatalError = false;

      // Normalize object keys: trim, lowercase, replace spaces/hyphens with underscores
      const normalizedRow: Record<string, any> = {};
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim().toLowerCase().replace(/[\s\-\.]+/g, '_');
        normalizedRow[cleanKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
      });

      // ── 1. Kode Pelanggan (Wajib, tepat 9 digit angka KKWWxxxxx) ──
      const rawKode = normalizedRow['kode_pelanggan'] || normalizedRow['id_pelanggan'] || normalizedRow['kode'] || normalizedRow['no_pelanggan'] || '';
      const kodePelanggan = String(rawKode).trim();

      if (!kodePelanggan) {
        errors.push({
          rowNumber: rowNum,
          field: 'kode_pelanggan',
          value: rawKode,
          message: 'Kode pelanggan wajib diisi dan tidak boleh kosong.',
          severity: 'error',
        });
        rowHasFatalError = true;
      } else if (!/^\d{9}$/.test(kodePelanggan)) {
        errors.push({
          rowNumber: rowNum,
          field: 'kode_pelanggan',
          value: kodePelanggan,
          message: `Kode pelanggan harus tepat 9 digit angka (format KKWWxxxxx). Ditemukan "${kodePelanggan}" (${kodePelanggan.length} karakter).`,
          severity: 'error',
        });
        rowHasFatalError = true;
      } else if (seenIds.has(kodePelanggan)) {
        errors.push({
          rowNumber: rowNum,
          field: 'kode_pelanggan',
          value: kodePelanggan,
          message: `Duplikasi kode pelanggan "${kodePelanggan}". Setiap ID pelanggan harus unik.`,
          severity: 'error',
        });
        rowHasFatalError = true;
      } else {
        seenIds.add(kodePelanggan);
      }

      // ── 2. Wilayah Acuan (4 digit pertama KKWW) ──
      const kodeKecamatan = kodePelanggan ? kodePelanggan.slice(0, 2) : '07';
      const kodeWilayah = kodePelanggan ? kodePelanggan.slice(0, 4) : '';
      const wilayahMatch = wilayahMap.get(kodeWilayah);

      if (kodePelanggan && /^\d{9}$/.test(kodePelanggan) && !wilayahMatch) {
        errors.push({
          rowNumber: rowNum,
          field: 'kode_wilayah',
          value: kodeWilayah,
          message: `Kode wilayah "${kodeWilayah}" (4 digit awalan kode) tidak terdaftar pada tabel acuan wilayah Kecamatan ${kodeKecamatan}.`,
          severity: 'error',
        });
        rowHasFatalError = true;
      }

      // ── 3. Nama Pelanggan (Wajib) ──
      const namaPelanggan = String(normalizedRow['nama_pelanggan'] || normalizedRow['nama'] || normalizedRow['customer_name'] || '').trim();
      if (!namaPelanggan) {
        errors.push({
          rowNumber: rowNum,
          field: 'nama_pelanggan',
          value: namaPelanggan,
          message: 'Nama pelanggan tidak boleh kosong.',
          severity: 'error',
        });
        rowHasFatalError = true;
      }

      // ── 4. Alamat (Opsional, fallback to Wilayah) ──
      const alamat = String(normalizedRow['alamat'] || normalizedRow['address'] || `Ds. ${wilayahMatch?.nama || 'Praya Barat'}`).trim();

      // ── 5. Koordinat Latitude & Longitude (Wajib, Desimal WGS84) ──
      const rawLat = normalizedRow['latitude'] || normalizedRow['lat'] || normalizedRow['y'];
      const rawLng = normalizedRow['longitude'] || normalizedRow['lng'] || normalizedRow['long'] || normalizedRow['x'];

      let lat = parseFloat(String(rawLat).replace(',', '.'));
      let lng = parseFloat(String(rawLng).replace(',', '.'));

      const flagReasons: string[] = [];
      let isFlagged = false;

      // Check inverted lat/lng if user accidentally inverted coordinates
      if (lat > 100 && lng < 0) {
        const temp = lat;
        lat = lng;
        lng = temp;
        warnings.push({
          rowNumber: rowNum,
          field: 'koordinat',
          value: `${rawLat}, ${rawLng}`,
          message: 'Koordinat Latitude dan Longitude terbalik, sistem otomatis membalik posisi.',
          severity: 'warning',
        });
        isFlagged = true;
        flagReasons.push('Koordinat sempat terbalik (diperbaiki otomatis)');
      }

      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        errors.push({
          rowNumber: rowNum,
          field: 'koordinat',
          value: `${rawLat}, ${rawLng}`,
          message: 'Koordinat Latitude atau Longitude tidak valid (wajib berupa angka desimal WGS84).',
          severity: 'error',
        });
        rowHasFatalError = true;
      } else {
        // Spatial bounds check for Praya Barat
        if (
          lat < BOUNDS_PRAYA_BARAT.minLat ||
          lat > BOUNDS_PRAYA_BARAT.maxLat ||
          lng < BOUNDS_PRAYA_BARAT.minLng ||
          lng > BOUNDS_PRAYA_BARAT.maxLng
        ) {
          warnings.push({
            rowNumber: rowNum,
            field: 'koordinat_spasial',
            value: `${lat}, ${lng}`,
            message: `Titik koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)}) berada di luar batas layanan wajar Kecamatan Praya Barat.`,
            severity: 'warning',
          });
          isFlagged = true;
          flagReasons.push('Koordinat di luar rentang batas wajar Praya Barat');
        }
      }

      // ── 6. Golongan Tarif ──
      const rawGolongan = String(normalizedRow['golongan'] || normalizedRow['gol'] || normalizedRow['tarif'] || 'R1').toUpperCase().trim();
      const golongan: GolonganTarif = VALID_GOLONGAN.includes(rawGolongan as any) ? (rawGolongan as GolonganTarif) : 'R1';
      if (!VALID_GOLONGAN.includes(rawGolongan as any) && rawGolongan) {
        warnings.push({
          rowNumber: rowNum,
          field: 'golongan',
          value: rawGolongan,
          message: `Golongan "${rawGolongan}" tidak baku. Disesuaikan otomatis ke R1.`,
          severity: 'warning',
        });
        isFlagged = true;
        flagReasons.push(`Golongan '${rawGolongan}' tidak baku`);
      }

      // ── 7. Status Sambungan ──
      const rawStatus = String(normalizedRow['status_sambungan'] || normalizedRow['status'] || 'Aktif').trim();
      let status: StatusSambungan = 'Aktif';
      if (/non/i.test(rawStatus) || /tutup/i.test(rawStatus) || /segel/i.test(rawStatus)) {
        status = 'Nonaktif';
      } else if (/putus/i.test(rawStatus) || /bongkar/i.test(rawStatus)) {
        status = 'Putus';
      } else {
        status = 'Aktif';
      }

      // ── Push record if no fatal error ──
      if (!rowHasFatalError) {
        const record: Pelanggan = {
          id: kodePelanggan,
          kode_pelanggan: kodePelanggan,
          nama_pelanggan: namaPelanggan,
          alamat,
          kode_kecamatan: kodeKecamatan,
          kode_wilayah: kodeWilayah,
          nama_wilayah: wilayahMatch?.nama || 'Wilayah ' + kodeWilayah,
          golongan,
          status_sambungan: status,
          latitude: lat,
          longitude: lng,
          is_flagged: isFlagged,
          flag_reasons: flagReasons,
          spatial_anomaly: null,
          nomor_meter: normalizedRow['nomor_meter'] || `WM-${kodeWilayah}-${kodePelanggan.slice(4)}`,
          tanggal_pasang: normalizedRow['tanggal_pasang'] || new Date().toISOString().slice(0, 10),
        };

        const anomaly = checkSpatialAnomaly(record);
        if (anomaly) {
          record.spatial_anomaly = anomaly;
          record.is_flagged = true;
          if (!record.flag_reasons.includes(anomaly)) {
            record.flag_reasons.push(anomaly);
          }
        }

        parsedRecords.push(record);
      }
    });

    const fatalErrorCount = errors.length;
    const canProceed = fatalErrorCount === 0;

    return {
      summary: {
        totalRows: rows.length,
        validCount: parsedRecords.length,
        flaggedCount: parsedRecords.filter(p => p.is_flagged).length,
        errorCount: fatalErrorCount,
        canProceed,
        errors,
        warnings,
      },
      parsedRecords,
    };
  }
}
