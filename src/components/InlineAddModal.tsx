import { useState } from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

interface InlineFieldOption {
    value: string;
    label: string;
}

interface InlineAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fields: { name: string; label: string; type?: string; placeholder?: string; required?: boolean; options?: InlineFieldOption[] }[];
    onSave: (data: Record<string, string>) => Promise<void>;
}

const InlineAddModal = ({ isOpen, onClose, title, fields, onSave }: InlineAddModalProps) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const missingRequired = fields.filter((f) => f.required && !formData[f.name]?.trim());
        if (missingRequired.length) {
            setError(`${missingRequired.map((f) => f.label).join(', ')} required`);
            return;
        }
        setSaving(true);
        try {
            await onSave(formData);
            setFormData({});
            setError('');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} size="sm" closeOnOverlayClick={!saving}>
            <DialogHeader title={title} onClose={onClose} />
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <DialogBody className="p-4">
                    <div className="space-y-3">
                        {fields.map((field) => (
                            <div key={field.name}>
                                <label className="block text-sm font-medium mb-1 text-foreground">
                                    {field.label} {field.required && <span className="text-destructive">*</span>}
                                </label>
                                {field.type === 'select' && field.options ? (
                                    <Select
                                        value={formData[field.name] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                        disabled={saving}
                                    >
                                        <option value="">{field.placeholder || `Select ${field.label}`}</option>
                                        {field.options.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </Select>
                                ) : (
                                    <Input
                                        type={field.type || 'text'}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                        placeholder={field.placeholder || field.label}
                                        disabled={saving}
                                    />
                                )}
                            </div>
                        ))}
                        {error && (
                            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">{error}</div>
                        )}
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={saving} size="sm">Cancel</Button>
                    <Button type="submit" disabled={saving} size="sm">{saving ? 'Saving...' : 'Add'}</Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
};

export default InlineAddModal;
