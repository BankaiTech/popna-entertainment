/**
 * Upload many cable / internet customers from an Excel (.xlsx) or CSV file (LCO Desk format).
 * Step 1: read the file and ask the server to CHECK it (nothing saved).
 * Step 2: show what will be added / skipped / needs fixing, then import for real.
 * The server matches each row to a plan by name, or by monthly amount, and skips STB numbers it already has.
 */
import { useRef, useState } from 'react';
import { Upload, Download, CheckCircle2, AlertTriangle, SkipForward } from 'lucide-react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import apiClient from '@/lib/apiClient';
import { unwrapApiData } from '@/lib/apiHelpers';
import { parseCsv } from '@/lib/csv';
import { parseXlsx } from '@/lib/xlsx';
import { endpoints } from '@/api/endpoints';
import { useLt } from '@/lib/lt';

export const CUSTOMER_TEMPLATE_URL = '/templates/customers_import_template.csv';

/** CSV column → server field. Several spellings are accepted for each. */
const COLUMNS: Record<string, string[]> = {
  customer_code: ['customer no', 'customer code', 'customer id', 's.no', 'sno', 'can', 'caf'],
  name: ['name', 'customer name'],
  mobile: ['mobile', 'phone', 'mobile number'],
  stb_number: ['stb number', 'stb', 'stb no', 'vc number', 'vc no', 'box number', 'smart card'],
  provider: ['provider', 'connection type', 'mso'],
  plan: ['plan', 'package', 'pack'],
  monthly_amount: ['monthly amount', 'amount', 'rate', 'monthly'],
  area_name: ['area', 'street', 'area / street'],
  address_line1: ['address', 'address line 1', 'door no'],
  city: ['city', 'town', 'village'],
  pincode: ['pincode', 'pin'],
  notes: ['notes', 'remarks', 'note'],
  status: ['status'],
  sms_language: ['sms language', 'language'],
  // User IDs of the field staff who collect from this customer: "7" or "7, 8". Empty = all field staff.
  collector_ids: ['collector ids', 'collector id', 'collectors', 'collector', 'emp id', 'employee id', 'collected by'],
};

type ServerRow = Record<string, string>;
interface Report {
  dry_run: boolean;
  created: number;
  skipped: { row: number; name: string; reason: string }[];
  errors: { row: number; name: string; error: string }[];
}

/** "STB_Number", "stb-number", " STB  Number " -> "stb number" */
const headerKey = (h: string) => h.trim().toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');

/** Which server field a column heading means (its own field name works too, e.g. stb_number). */
function fieldFor(header: string): string | undefined {
  const key = headerKey(header);
  return Object.keys(COLUMNS).find((f) => COLUMNS[f].includes(key) || headerKey(f) === key);
}

/** Headings in the file that match nothing: shown to the owner so no column is lost silently. */
export function unusedColumns(headers: string[]): string[] {
  return headers.filter((h) => h.trim() && !fieldFor(h));
}

function toServerRows(rows: Record<string, string>[], headers: string[]): ServerRow[] {
  const lookup: Record<string, string> = {};
  for (const h of headers) {
    const field = fieldFor(h);
    if (field) lookup[h] = field;
  }
  return rows.map((r) => {
    const out: ServerRow = {};
    for (const [h, field] of Object.entries(lookup)) if (r[h]) out[field] = r[h];
    if (out.sms_language) {
      const v = out.sms_language.toLowerCase();
      out.sms_language = v.startsWith('ta') || v === 'தமிழ்' ? 'ta' : v.startsWith('en') ? 'en' : '';
    }
    return out;
  }).filter((r) => Object.keys(r).length > 0);
}

export default function CustomerImportDialog({ open, onClose, onImported }: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const tr = useLt();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ServerRow[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Report | null>(null);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [noDevice, setNoDevice] = useState(false);

  const reset = () => {
    setFileName(''); setRows([]); setReport(null); setError(''); setDone(null); setIgnored([]); setNoDevice(false);
    if (fileRef.current) fileRef.current.value = '';
  };
  const close = () => { if (!busy) { reset(); onClose(); } };

  const send = async (serverRows: ServerRow[], dryRun: boolean): Promise<Report> =>
    unwrapApiData<Report>(await apiClient.post(`${endpoints.contacts}/import`, { rows: serverRows, dry_run: dryRun }));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    reset();
    setFileName(f.name);
    const isXlsx = /\.xlsx$/i.test(f.name);
    (async () => {
      let parsed: { headers: string[]; rows: Record<string, string>[] };
      try {
        parsed = isXlsx ? await parseXlsx(f) : parseCsv(await f.text());
      } catch {
        setError(tr('Could not read this file. Save it again as .xlsx or CSV UTF-8.'));
        return;
      }
      const { headers, rows: raw } = parsed;
      const mapped = toServerRows(raw, headers);
      setIgnored(unusedColumns(headers));
      setNoDevice(!headers.some((h) => fieldFor(h) === 'stb_number'));
      if (!headers.some((h) => fieldFor(h) === 'name') || mapped.length === 0) {
        setError(tr('This file has no Name column or no rows. Use the template.'));
        return;
      }
      setRows(mapped);
      setBusy(true);
      try {
        setReport(await send(mapped, true));
      } catch (err) {
        setError(err instanceof Error ? err.message : tr('Could not check the file'));
      } finally {
        setBusy(false);
      }
    })();
  };

  const doImport = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await send(rows, false);
      setDone(result);
      setReport(null);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Import failed'));
    } finally {
      setBusy(false);
    }
  };

  const shown = done ?? report;

  return (
    <Dialog open={open} onClose={close} size="xl" closeOnOverlayClick={!busy}>
      <DialogHeader title={tr('Import customers')} onClose={close} />
      <DialogBody className="p-4 sm:p-5 space-y-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-3 text-sm space-y-2">
          <p className="text-blue-900 dark:text-blue-200">
            {tr('Columns: Name, Mobile, STB Number, Plan or Monthly Amount, Area, Notes. Mobile is optional.')}
          </p>
          <p className="text-blue-800/80 dark:text-blue-300/80 text-xs">
            {tr('Collector IDs: user ID of the staff who collects (see Users), e.g. 7 or 7, 8. Leave empty to show the customer to all staff.')}
          </p>
          <p className="text-blue-800/80 dark:text-blue-300/80 text-xs">
            {tr('Create your plans first (Settings > Providers & Plans). A row with only an amount gets the plan with that price. Customers whose STB number is already added are skipped.')}
          </p>
          <a href={CUSTOMER_TEMPLATE_URL} download className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-medium">
            <Download className="w-4 h-4" />{tr('Download template')}
          </a>
        </div>

        {!done && (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:bg-muted/40">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">{fileName || tr('Choose Excel or CSV file')}</span>
            <span className="text-xs text-muted-foreground">{tr('Excel (.xlsx) or CSV UTF-8')}</span>
            <input ref={fileRef} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={onFile} disabled={busy} />
          </label>
        )}

        {busy && <p className="text-sm text-muted-foreground text-center">{report ? tr('Importing...') : tr('Checking the file...')}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {report && !done && (ignored.length > 0 || noDevice) && (
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200 space-y-1">
            {ignored.length > 0 && (
              <p>{tr('These columns are not used: {{cols}}. Rename them like the template if they matter.', { cols: ignored.join(', ') })}</p>
            )}
            {noDevice && (
              <p>{tr('No STB number column. Uploading this file again may add the same customers twice.')}</p>
            )}
          </div>
        )}

        {shown && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                <p className="text-xl font-bold">{shown.created}</p>
                <p className="text-xs text-muted-foreground">{done ? tr('Added') : tr('Will be added')}</p>
              </div>
              <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-3">
                <SkipForward className="w-5 h-5 text-gray-500 mx-auto" />
                <p className="text-xl font-bold">{shown.skipped.length}</p>
                <p className="text-xs text-muted-foreground">{tr('Already added')}</p>
              </div>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto" />
                <p className="text-xl font-bold">{shown.errors.length}</p>
                <p className="text-xs text-muted-foreground">{tr('Need fixing')}</p>
              </div>
            </div>

            {shown.errors.length > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 max-h-56 overflow-y-auto">
                <p className="px-3 py-2 text-sm font-medium bg-amber-50 dark:bg-amber-900/20 sticky top-0">
                  {tr('These rows will not be imported. Fix them in the file and upload again.')}
                </p>
                <ul className="divide-y divide-border text-sm">
                  {shown.errors.map((e) => (
                    <li key={e.row} className="px-3 py-2">
                      <span className="font-mono text-xs text-muted-foreground mr-2">#{e.row + 1}</span>
                      <span className="font-medium">{e.name || '-'}</span>
                      <p className="text-xs text-red-600 break-words">{e.error}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {done && <p className="text-sm text-green-700 dark:text-green-400">{tr('Import finished.')}</p>}
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={close} disabled={busy}>{done ? tr('Close') : tr('Cancel')}</Button>
        {report && !done && (
          <Button onClick={doImport} disabled={busy || report.created === 0}>
            {tr('Import {{count}} customers', { count: report.created })}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
