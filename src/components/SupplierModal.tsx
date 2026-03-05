import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from './ui/Button';
import Input from './ui/Input';
import { Plus, Trash2 } from 'lucide-react';
import type { Supplier, Address } from '@/models/types';

interface SupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
    onUpdate?: (id: number, supplier: Partial<Supplier>) => Promise<void>;
    editingSupplier?: Supplier | null;
}

const SupplierModal = ({ isOpen, onClose, onSave, onUpdate, editingSupplier }: SupplierModalProps) => {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '', contactPerson: '', mobile: '', email: '', taxNumber: '',
        openingBalance: 0,
        address: { line1: '', line2: '', city: '', state: '', country: '', pincode: '', gstin: '' } as Address,
        additionalAddresses: [] as Address[],
    });

    useEffect(() => {
        if (editingSupplier) {
            setFormData({
                name: editingSupplier.name,
                contactPerson: editingSupplier.contactPerson || '',
                mobile: editingSupplier.mobile,
                email: editingSupplier.email || '',
                taxNumber: editingSupplier.taxNumber || '',
                openingBalance: editingSupplier.openingBalance || 0,
                address: {
                    line1: editingSupplier.address?.line1 || '',
                    line2: editingSupplier.address?.line2 || '',
                    city: editingSupplier.address?.city || '',
                    state: editingSupplier.address?.state || '',
                    country: editingSupplier.address?.country || '',
                    pincode: editingSupplier.address?.pincode || '',
                    gstin: (editingSupplier.address as Address)?.gstin || '',
                },
                additionalAddresses: editingSupplier.additionalAddresses || [],
            });
        } else {
            setFormData({
                name: '', contactPerson: '', mobile: '', email: '', taxNumber: '',
                openingBalance: 0,
                address: { line1: '', line2: '', city: '', state: '', country: '', pincode: '', gstin: '' },
                additionalAddresses: [],
            });
        }
        setError('');
    }, [editingSupplier, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.mobile.trim()) {
            setError('Name and mobile are required');
            return;
        }
        setSaving(true);
        try {
            const supplierData = {
                ...formData,
                organizationId: editingSupplier?.organizationId || '',
            };
            if (editingSupplier && onUpdate) {
                await onUpdate(editingSupplier.id, supplierData);
            } else {
                await onSave(supplierData);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} size="lg" closeOnOverlayClick={!saving}>
            <DialogHeader
                title={editingSupplier ? t('contacts.editSupplier', 'Edit Supplier') : t('contacts.addSupplier', 'Add Supplier')}
                onClose={onClose}
            />
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <DialogBody className="p-4 sm:p-5">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-foreground">
                                    Name <span className="text-destructive">*</span>
                                </label>
                                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Supplier name" required disabled={saving} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-foreground">Contact Person</label>
                                <Input value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} placeholder="Contact person" disabled={saving} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-foreground">
                                    Mobile <span className="text-destructive">*</span>
                                </label>
                                <Input value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} placeholder="Mobile number" required disabled={saving} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-foreground">Email</label>
                                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email" disabled={saving} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-foreground">Tax Number (GSTIN)</label>
                                <Input value={formData.taxNumber} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} placeholder="GSTIN / Tax Number" disabled={saving} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-foreground">Opening Balance</label>
                                <Input type="number" value={formData.openingBalance || ''} onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })} placeholder="0.00" disabled={saving} />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-foreground">Address</h3>
                                {!!editingSupplier && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="xs"
                                        onClick={() =>
                                            setFormData({
                                                ...formData,
                                                additionalAddresses: [
                                                    ...formData.additionalAddresses,
                                                    { line1: '', line2: '', city: '', state: '', country: '', pincode: '', gstin: '' },
                                                ],
                                            })
                                        }
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                                        Add Address
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Input value={formData.address.line1} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, line1: e.target.value } })} placeholder="Address Line 1" disabled={saving} />
                                <Input value={formData.address.line2} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, line2: e.target.value } })} placeholder="Address Line 2" disabled={saving} />
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <Input value={formData.address.city} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })} placeholder="City" disabled={saving} />
                                    <Input value={formData.address.state} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })} placeholder="State" disabled={saving} />
                                    <Input value={formData.address.pincode} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, pincode: e.target.value } })} placeholder="Pincode" disabled={saving} />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <Input value={formData.address.country} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })} placeholder="Country" disabled={saving} />
                                </div>
                            </div>
                        </div>

                        {!editingSupplier && (
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-border">
                                You can add multiple addresses after creating the supplier. (Edit mode only)
                            </p>
                        )}

                        {!!editingSupplier && formData.additionalAddresses.map((addr, index) => (
                            <div key={index} className="p-4 border border-border rounded-lg bg-muted/20 relative mt-4">
                                <div className="absolute top-2 right-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newAddresses = [...formData.additionalAddresses];
                                            newAddresses.splice(index, 1);
                                            setFormData({ ...formData, additionalAddresses: newAddresses });
                                        }}
                                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Address {index + 2}</h4>
                                <div className="space-y-3">
                                    <Input value={addr.line1} onChange={(e) => { const newAddresses = [...formData.additionalAddresses]; newAddresses[index].line1 = e.target.value; setFormData({ ...formData, additionalAddresses: newAddresses }); }} placeholder="Address Line 1" disabled={saving} />
                                    <Input value={addr.line2} onChange={(e) => { const newAddresses = [...formData.additionalAddresses]; newAddresses[index].line2 = e.target.value; setFormData({ ...formData, additionalAddresses: newAddresses }); }} placeholder="Address Line 2" disabled={saving} />
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <Input value={addr.city} onChange={(e) => { const newAddresses = [...formData.additionalAddresses]; newAddresses[index].city = e.target.value; setFormData({ ...formData, additionalAddresses: newAddresses }); }} placeholder="City" disabled={saving} />
                                        <Input value={addr.state} onChange={(e) => { const newAddresses = [...formData.additionalAddresses]; newAddresses[index].state = e.target.value; setFormData({ ...formData, additionalAddresses: newAddresses }); }} placeholder="State" disabled={saving} />
                                        <Input value={addr.pincode || ''} onChange={(e) => { const newAddresses = [...formData.additionalAddresses]; newAddresses[index].pincode = e.target.value; setFormData({ ...formData, additionalAddresses: newAddresses }); }} placeholder="Pincode" disabled={saving} />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <Input value={addr.country} onChange={(e) => { const newAddresses = [...formData.additionalAddresses]; newAddresses[index].country = e.target.value; setFormData({ ...formData, additionalAddresses: newAddresses }); }} placeholder="Country" disabled={saving} />
                                        <Input value={addr.gstin || ''} onChange={(e) => { const newAddresses = [...formData.additionalAddresses]; newAddresses[index].gstin = e.target.value; setFormData({ ...formData, additionalAddresses: newAddresses }); }} placeholder="GSTIN" disabled={saving} />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">{error}</div>
                        )}
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
};

export default SupplierModal;
