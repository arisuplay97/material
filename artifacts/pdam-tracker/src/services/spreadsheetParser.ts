import type * as XLSXTypes from 'xlsx';

export interface SheetSummary {
  name: string;
  rows: number;
  inheritedHeaders?: boolean;
  fileName?: string;
}

export interface ParsedSpreadsheetResult {
  rows: Record<string, unknown>[];
  sheets: SheetSummary[];
}

const KNOWN_HEADER_KEYS = new Set([
  'kode_pelanggan',
  'id_pelanggan',
  'kode',
  'no_pelanggan',
  'no_pelan',
  'no_pel',
  'nosamb',
  'no_sambungan',
  'nama_pelanggan',
  'nama',
  'customer_name',
  'alamat',
  'address',
  'latitude',
  'lat',
  'y',
  'longitude',
  'lng',
  'long',
  'x',
  'urjlw',
  'golongan',
  'gol',
  'tarif',
  'urjlwp',
  'uraian_golongan',
  'kategori_tarif',
  'status_sambungan',
  'status',
  'urstat_sm',
  'urstat_smb',
  'stat_smb',
  'status_smb',
  'kode_wilayah',
  'nomor_meter',
  'tanggal_pasang',
]);

function normalizeCellHeader(val: unknown): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-.]+/g, '_');
}

function isLikelyHeaderRow(cells: unknown[]): boolean {
  let matchCount = 0;
  for (const c of cells) {
    const clean = normalizeCellHeader(c);
    if (clean && KNOWN_HEADER_KEYS.has(clean)) {
      matchCount++;
    }
  }
  return matchCount >= 2;
}

function isLikelyDataRow(cells: unknown[]): boolean {
  let hasCustomerId = false;
  let hasLat = false;
  let hasLng = false;

  for (const c of cells) {
    const s = String(c ?? '').trim();
    if (!s) continue;
    if (/^\d{8,9}$/.test(s)) {
      hasCustomerId = true;
    }
    const num = parseFloat(s.replace(',', '.'));
    if (Number.isFinite(num)) {
      if (num <= -8.0 && num >= -9.5) hasLat = true;
      if (num >= 115.5 && num <= 117.0) hasLng = true;
    }
  }

  return hasCustomerId || (hasLat && hasLng);
}

function isRowEmpty(cells: unknown[]): boolean {
  return cells.every((c) => String(c ?? '').trim() === '');
}

function isSummaryFooterRow(cells: unknown[]): boolean {
  const firstNonEmpty = cells.find((c) => String(c ?? '').trim() !== '');
  if (!firstNonEmpty) return false;
  const firstStr = String(firstNonEmpty).trim();
  const looksLikeLabel =
    /^(total|jumlah|grand\s*total|sub\s*total|rekapitulasi)\b[:\s-]*$/i.test(firstStr) ||
    /^(total|jumlah|grand\s*total|sub\s*total)\s+(pelanggan|data|rek|sambungan|akhir)/i.test(firstStr);

  return looksLikeLabel && !isLikelyDataRow(cells) && !isLikelyHeaderRow(cells);
}

function buildHeaderKeys(rawCells: unknown[]): string[] {
  const used = new Set<string>();
  let emptyCounter = 0;
  return rawCells.map((cell) => {
    const trimmed = String(cell ?? '').trim();
    if (!trimmed) {
      const base = emptyCounter === 0 ? '__EMPTY' : `__EMPTY_${emptyCounter}`;
      emptyCounter++;
      used.add(base);
      return base;
    }
    if (!used.has(trimmed)) {
      used.add(trimmed);
      return trimmed;
    }
    let suffix = 1;
    while (used.has(`${trimmed}_${suffix}`)) {
      suffix++;
    }
    const unique = `${trimmed}_${suffix}`;
    used.add(unique);
    return unique;
  });
}

function inferHeadersFromDataRows(sampleRows: unknown[][]): string[] | null {
  if (sampleRows.length === 0) return null;
  const maxCols = Math.max(...sampleRows.map((r) => r.length));
  const assigned = new Array<string>(maxCols).fill('');
  const taken = new Set<string>();

  const colValues = (col: number) =>
    sampleRows.map((r) => String(r[col] ?? '').trim()).filter((v) => v !== '');

  const ratioMatch = (vals: string[], predicate: (v: string) => boolean) =>
    vals.length > 0 && vals.filter(predicate).length >= Math.ceil(vals.length * 0.7);

  for (let col = 0; col < maxCols; col++) {
    const vals = colValues(col);
    if (vals.length === 0) continue;

    if (!taken.has('NO_PELAN') && ratioMatch(vals, (v) => /^\d{8,9}$/.test(v))) {
      assigned[col] = 'NO_PELAN';
      taken.add('NO_PELAN');
      continue;
    }

    if (
      !taken.has('longitude') &&
      ratioMatch(vals, (v) => {
        const n = parseFloat(v.replace(',', '.'));
        return Number.isFinite(n) && n >= 115.0 && n <= 117.5;
      })
    ) {
      assigned[col] = 'longitude';
      taken.add('longitude');
      continue;
    }

    if (
      !taken.has('latitude') &&
      ratioMatch(vals, (v) => {
        const n = parseFloat(v.replace(',', '.'));
        return Number.isFinite(n) && n <= -7.5 && n >= -9.8;
      })
    ) {
      assigned[col] = 'latitude';
      taken.add('latitude');
      continue;
    }

    if (
      !taken.has('urstat_smb') &&
      ratioMatch(vals, (v) => /^(aktif|nonaktif|non-aktif|tutup|segel|putus|cabut|bongkar)$/i.test(v))
    ) {
      assigned[col] = 'urstat_smb';
      taken.add('urstat_smb');
      continue;
    }

    if (!taken.has('urjlwp') && vals.some((v) => /rumah\s*tangga|niaga|sosial|instansi|industri/i.test(v))) {
      assigned[col] = 'urjlwp';
      taken.add('urjlwp');
      continue;
    }

    if (
      !taken.has('urjlw') &&
      ratioMatch(vals, (v) => /^(1[A-Z]|2[A-Z]|3[A-Z]|4[A-Z]|R[12]|B[12]|S|I)$/i.test(v))
    ) {
      assigned[col] = 'urjlw';
      taken.add('urjlw');
      continue;
    }
  }

  if (!taken.has('NO_PELAN')) return null;

  for (let col = 0; col < maxCols; col++) {
    if (assigned[col]) continue;
    const vals = colValues(col);
    if (vals.length === 0) continue;
    if (ratioMatch(vals, (v) => /^(1[A-Z]|2[A-Z]|3[A-Z]|4[A-Z]|R[12]|B[12]|S|I)$/i.test(v))) {
      continue;
    }
    if (!taken.has('NAMA')) {
      assigned[col] = 'NAMA';
      taken.add('NAMA');
    } else if (!taken.has('ALAMAT')) {
      assigned[col] = 'ALAMAT';
      taken.add('ALAMAT');
      break;
    }
  }

  return assigned.map((name, idx) => name || `__EMPTY_${idx}`);
}

function rowArrayToRecord(
  cells: unknown[],
  headers: string[],
  sheetName: string,
  excelRow: number
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const len = Math.max(headers.length, cells.length);
  for (let col = 0; col < len; col++) {
    const val = col < cells.length ? cells[col] : '';
    const key = col < headers.length ? headers[col] : `__EXTRA_${col}`;
    if (key.startsWith('__EMPTY') && String(val ?? '').trim() === '') continue;
    obj[key] = val === undefined || val === null ? '' : val;
  }
  obj._sheet_name = sheetName;
  obj._sheet_row = excelRow;
  return obj;
}

/**
 * Parses ALL sheets in an Excel (.xlsx / .xls) or CSV workbook.
 * Supports workbooks where all 13 kecamatans live in separate tabs (Sheet1..Sheet13),
 * and gracefully inherits column headers from Sheet1 or infers headerless columns.
 */
export function parseSpreadsheetBuffer(
  XLSX: typeof XLSXTypes,
  buffer: ArrayBuffer
): ParsedSpreadsheetResult {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true, dense: true });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Sheet tidak ditemukan di dalam file.');
  }

  const allRows: Record<string, unknown>[] = [];
  const sheets: SheetSummary[] = [];
  let templateHeaders: string[] | null = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
    if (!matrix || matrix.length === 0) continue;

    let firstNonEmptyIdx = -1;
    for (let i = 0; i < matrix.length; i++) {
      if (!isRowEmpty(matrix[i])) {
        firstNonEmptyIdx = i;
        break;
      }
    }
    if (firstNonEmptyIdx === -1) continue;

    let headerRowIdx = -1;
    const scanLimit = Math.min(firstNonEmptyIdx + 6, matrix.length);
    for (let i = firstNonEmptyIdx; i < scanLimit; i++) {
      if (!isRowEmpty(matrix[i]) && isLikelyHeaderRow(matrix[i])) {
        headerRowIdx = i;
        break;
      }
    }

    let headers: string[];
    let dataStartIdx: number;
    let inheritedHeaders = false;

    if (headerRowIdx !== -1) {
      headers = buildHeaderKeys(matrix[headerRowIdx]);
      if (!templateHeaders) templateHeaders = headers;
      dataStartIdx = headerRowIdx + 1;
    } else if (!isLikelyDataRow(matrix[firstNonEmptyIdx])) {
      headers = buildHeaderKeys(matrix[firstNonEmptyIdx]);
      if (!templateHeaders) templateHeaders = headers;
      dataStartIdx = firstNonEmptyIdx + 1;
    } else if (templateHeaders) {
      headers = templateHeaders;
      dataStartIdx = firstNonEmptyIdx;
      inheritedHeaders = true;
    } else {
      const sampleRows: unknown[][] = [];
      for (let i = firstNonEmptyIdx; i < matrix.length && sampleRows.length < 50; i++) {
        if (!isRowEmpty(matrix[i])) sampleRows.push(matrix[i]);
      }
      const inferred = inferHeadersFromDataRows(sampleRows);
      if (inferred) {
        headers = inferred;
        templateHeaders = inferred;
        dataStartIdx = firstNonEmptyIdx;
        inheritedHeaders = true;
      } else {
        throw new Error(
          `Baris header kolom (NO_PELAN, NAMA, latitude, longitude, dll.) tidak ditemukan pada "${sheetName}". Pastikan baris pertama berisi judul kolom.`
        );
      }
    }

    let sheetRowCount = 0;
    for (let rIdx = dataStartIdx; rIdx < matrix.length; rIdx++) {
      const cells = matrix[rIdx];
      if (!cells || isRowEmpty(cells)) continue;
      if (isLikelyHeaderRow(cells) && !isLikelyDataRow(cells)) continue;
      if (isSummaryFooterRow(cells)) continue;

      allRows.push(rowArrayToRecord(cells, headers, sheetName, rIdx + 1));
      sheetRowCount++;
    }

    if (sheetRowCount > 0) {
      sheets.push({
        name: sheetName,
        rows: sheetRowCount,
        inheritedHeaders,
      });
    }
  }

  if (allRows.length === 0) {
    throw new Error('File tidak memuat data baris pelanggan di semua sheet (kosong).');
  }

  return { rows: allRows, sheets };
}
