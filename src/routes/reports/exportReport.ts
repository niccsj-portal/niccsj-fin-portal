/**
 * Client-side report export helpers (story 7.4). Zero-dependency: CSV is a
 * Blob download and "PDF" uses the browser's native print-to-PDF via a print
 * stylesheet (the approach chosen for consistency with the Sprint 8 End-of-Year
 * PDF path). Kept apart from the pages so the trigger is easy to unit-test.
 */

/** Download a string as a file (used for the CSV export). */
export function downloadTextFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download report CSV with a `text/csv` mime type. */
export function downloadCsv(filename: string, csv: string): void {
  downloadTextFile(filename, csv, 'text/csv;charset=utf-8;');
}

/**
 * Trigger the browser's print dialog (Save as PDF). The `.print-region` /
 * `no-print` classes in the print stylesheet (index.css) isolate the report
 * from the app chrome.
 */
export function printReport(): void {
  window.print();
}
