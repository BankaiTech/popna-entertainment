import { useState, useRef } from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from './ui/Button';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    templateUrl: string;
    templateFileName: string;
    onImport: (rows: Record<string, string>[]) => Promise<void>;
    expectedHeaders: string[];
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
    });
    return { headers, rows };
}

const ImportModal = ({ isOpen, onClose, title, templateUrl, templateFileName, onImport, expectedHeaders }: ImportModalProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setError('');
        setSuccess('');
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const parsed = parseCSV(text);
            if (parsed.headers.length === 0) {
                setError('Invalid CSV file - no data found');
                return;
            }
            setPreview(parsed);
        };
        reader.readAsText(f);
    };

    const handleImport = async () => {
        if (!preview || preview.rows.length === 0) {
            setError('No data to import');
            return;
        }
        setImporting(true);
        setError('');
        try {
            await onImport(preview.rows);
            setSuccess(`Successfully imported ${preview.rows.length} records`);
            setPreview(null);
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreview(null);
        setError('');
        setSuccess('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={handleClose} size="xl" closeOnOverlayClick={!importing}>
            <DialogHeader title={title} onClose={handleClose} />
            <DialogBody className="p-4 sm:p-5">
                <div className="space-y-4">
                    {/* Download Template */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900">Download sample template</p>
                            <p className="text-xs text-blue-700 mt-0.5">
                                Expected columns: {expectedHeaders.join(', ')}
                            </p>
                        </div>
                        <a
                            href={templateUrl}
                            download={templateFileName}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shrink-0"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </a>
                    </div>

                    {/* Upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                            {file ? file.name : 'Choose a CSV file to import'}
                        </p>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="import-csv"
                        />
                        <label
                            htmlFor="import-csv"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 cursor-pointer transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            {file ? 'Change File' : 'Select File'}
                        </label>
                    </div>

                    {/* Preview */}
                    {preview && preview.rows.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b">
                                <p className="text-sm font-medium text-gray-700">
                                    Preview ({preview.rows.length} records)
                                </p>
                            </div>
                            <div className="overflow-x-auto max-h-60">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            {preview.headers.map((h) => (
                                                <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.rows.slice(0, 5).map((row, i) => (
                                            <tr key={i} className="border-t">
                                                {preview.headers.map((h) => (
                                                    <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap">{row[h]}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {preview.rows.length > 5 && (
                                            <tr className="border-t">
                                                <td colSpan={preview.headers.length} className="px-3 py-2 text-center text-gray-500 italic">
                                                    ...and {preview.rows.length - 5} more rows
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">{success}</div>
                    )}
                </div>
            </DialogBody>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={importing}>Cancel</Button>
                <Button onClick={handleImport} disabled={importing || !preview || preview.rows.length === 0}>
                    {importing ? 'Importing...' : `Import ${preview?.rows.length || 0} Records`}
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export default ImportModal;
