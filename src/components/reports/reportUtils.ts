/** Build CSV string from array of objects and trigger download */
export function downloadCSV(
  rows: Record<string, string | number>[],
  filename: string,
  columns?: { key: string; label: string }[]
): void {
  if (rows.length === 0) {
    const headers = columns?.map((c) => c.label) ?? Object.keys(rows[0] ?? {});
    const csv = headers.join(',') + '\n';
    triggerDownload(csv, filename);
    return;
  }
  const keys = columns ? columns.map((c) => c.key) : Object.keys(rows[0]);
  const headers = columns ? columns.map((c) => c.label) : keys;
  const lines = [headers.join(','), ...rows.map((r) => keys.map((k) => escapeCsv(r[k])).join(','))];
  const csv = lines.join('\n');
  triggerDownload(csv, filename);
}

function escapeCsv(val: string | number): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function triggerDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ReportFilters {
  fromDate: string;
  toDate: string;
  branchId: string; // '' = all
}

export function filterByDateRange<T>(
  items: T[],
  getDate: (item: T) => string,
  fromDate: string,
  toDate: string
): T[] {
  if (!fromDate && !toDate) return items;
  return items.filter((item) => {
    const d = new Date(getDate(item));
    if (Number.isNaN(d.getTime())) return false;
    if (fromDate && d < new Date(fromDate)) return false;
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  });
}
