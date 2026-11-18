/**
 * Parses spreadsheet files (all sheets in a workbook) off the main thread
 * so large multi-sheet uploads (up to 20 MB) do not freeze the UI.
 */
import * as XLSX from 'xlsx';
import { parseSpreadsheetBuffer, type SheetSummary } from './spreadsheetParser';

export type SpreadsheetWorkerResponse =
  | { ok: true; rows: Record<string, unknown>[]; sheets: SheetSummary[] }
  | { ok: false; error: string };

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    const { rows, sheets } = parseSpreadsheetBuffer(XLSX, event.data);
    (self as unknown as Worker).postMessage({ ok: true, rows, sheets } satisfies SpreadsheetWorkerResponse);
  } catch (err) {
    const message =
      err instanceof Error && err.message && (err.message.includes('Sheet') || err.message.includes('header'))
        ? err.message
        : 'Format file tidak didukung atau file korup. Pastikan file berupa Excel (.xlsx, .xls) atau CSV.';
    (self as unknown as Worker).postMessage({
      ok: false,
      error: message,
    } satisfies SpreadsheetWorkerResponse);
  }
};
