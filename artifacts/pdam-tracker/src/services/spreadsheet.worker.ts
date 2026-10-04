/**
 * Parses spreadsheet files off the main thread so large uploads (PRD: up to
 * 20 MB) do not freeze the UI.
 */
import * as XLSX from 'xlsx';

export type SpreadsheetWorkerResponse =
  | { ok: true; rows: Record<string, unknown>[] }
  | { ok: false; error: string };

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    const workbook = XLSX.read(new Uint8Array(event.data), { type: 'array', cellDates: true, dense: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error('Sheet pertama tidak ditemukan.');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { raw: false, defval: '' });
    (self as unknown as Worker).postMessage({ ok: true, rows } satisfies SpreadsheetWorkerResponse);
  } catch {
    (self as unknown as Worker).postMessage({
      ok: false,
      error: 'Format file tidak didukung atau file korup. Pastikan file berupa Excel (.xlsx, .xls) atau CSV.',
    } satisfies SpreadsheetWorkerResponse);
  }
};
