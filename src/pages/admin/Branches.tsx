import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardHeading, CardToolbar } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { branchesApi } from '@/api/branches';
import type { Branch } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { Plus, Search, MapPin, Edit, Trash2, Phone, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type DialogTab = 'info' | 'address';

const AdminBranches = () => {
    const { t } = useTranslation();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Form state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [activeTab, setActiveTab] = useState<DialogTab>('info');
    const [formName, setFormName] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formGstin, setFormGstin] = useState('');
    const [formActive, setFormActive] = useState(true);
    const [formAddressLine1, setFormAddressLine1] = useState('');
    const [formAddressLine2, setFormAddressLine2] = useState('');
    const [formCity, setFormCity] = useState('');
    const [formState, setFormState] = useState('');
    const [formCountry, setFormCountry] = useState('India');
    const [formPincode, setFormPincode] = useState('');
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // Delete
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const loadBranches = async () => {
        setLoading(true);
        try {
            const list = await branchesApi.getAll();
            setBranches(list);
        } catch {
            setBranches([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadBranches(); }, []);

    const filteredBranches = useMemo(() => {
        if (!searchQuery.trim()) return branches;
        const q = searchQuery.toLowerCase();
        return branches.filter((b) =>
            b.name.toLowerCase().includes(q) ||
            b.city?.toLowerCase().includes(q) ||
            b.addressLine1?.toLowerCase().includes(q) ||
            b.phone?.includes(q) ||
            b.gstin?.toLowerCase().includes(q)
        );
    }, [branches, searchQuery]);

    const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);
    const paginatedBranches = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredBranches.slice(start, start + itemsPerPage);
    }, [filteredBranches, currentPage, itemsPerPage]);

    const getBranchDisplayAddress = (b: Branch) => {
        const parts = [b.addressLine1, b.city, b.state].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : b.address || '-';
    };

    const handleOpenAdd = () => {
        setEditingBranch(null);
        setActiveTab('info');
        setFormName('');
        setFormPhone('');
        setFormGstin('');
        setFormActive(true);
        setFormAddressLine1('');
        setFormAddressLine2('');
        setFormCity('');
        setFormState('');
        setFormCountry('India');
        setFormPincode('');
        setFormError('');
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setActiveTab('info');
        setFormName(branch.name);
        setFormPhone(branch.phone || '');
        setFormGstin(branch.gstin || '');
        setFormActive(branch.isActive);
        setFormAddressLine1(branch.addressLine1 || '');
        setFormAddressLine2(branch.addressLine2 || '');
        setFormCity(branch.city || '');
        setFormState(branch.state || '');
        setFormCountry(branch.country || 'India');
        setFormPincode(branch.pincode || '');
        setFormError('');
        setIsDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        const name = formName.trim();
        if (!name) { setFormError(t('branches.nameRequired', 'Branch name is required')); return; }

        const payload = {
            name,
            phone: formPhone.trim(),
            gstin: formGstin.trim(),
            isActive: formActive,
            addressLine1: formAddressLine1.trim(),
            addressLine2: formAddressLine2.trim(),
            city: formCity.trim(),
            state: formState.trim(),
            country: formCountry.trim(),
            pincode: formPincode.trim(),
            // Build legacy address string for backward compat
            address: [formAddressLine1.trim(), formCity.trim(), formState.trim()].filter(Boolean).join(', '),
        };

        setSaving(true);
        try {
            if (editingBranch) {
                await branchesApi.update(editingBranch.id, payload);
            } else {
                await branchesApi.create({ organizationId: MOCK_ORGANIZATION_ID, ...payload });
            }
            await loadBranches();
            setIsDialogOpen(false);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : t('branches.saveFailed', 'Failed to save branch'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteId === null) return;
        await branchesApi.delete(deleteId);
        await loadBranches();
        setDeleteId(null);
    };

    const formatDate = (s: string) =>
        new Date(s).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl font-bold text-foreground mb-0.5">{t('branches.title', 'Branches')}</h1>
                    <p className="text-xs text-muted-foreground">{t('branches.subtitle', 'Manage your business branches and locations')}</p>
                </div>
                <Button onClick={handleOpenAdd} className="w-full sm:w-auto" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('branches.addBranch', 'Add Branch')}
                </Button>
            </div>

            <Card>
                <CardHeader className="py-2.5 px-3 sm:px-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <CardHeading className="p-0 w-full md:w-auto">
                        <div className="relative w-full min-w-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input placeholder={t('branches.searchPlaceholder', 'Search branches...')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm w-full" />
                        </div>
                    </CardHeading>
                    <CardToolbar className="text-sm text-muted-foreground">
                        {branches.length} {t(branches.length === 1 ? 'branches.count_one' : 'branches.count_other', branches.length === 1 ? 'branch' : 'branches')}
                    </CardToolbar>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="text-center py-12">{t('common.loading', 'Loading...')}</div>
                    ) : filteredBranches.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">{t('branches.noBranchesFound', 'No branches found')}</div>
                    ) : (
                        <>
                            {/* Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-border bg-muted/30">
                                            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-14">{t('branches.colId', 'ID')}</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t('common.name', 'Name')}</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t('branches.colAddress', 'Address')}</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-36">{t('branches.colGstin', 'GSTIN')}</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('common.mobile', 'Phone')}</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('common.status', 'Status')}</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('branches.colCreated', 'Created')}</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('common.actions', 'Actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedBranches.map((b, idx) => (
                                            <tr key={b.id} className={cn("border-b border-border hover:bg-muted/50 transition-colors", idx % 2 === 0 ? 'bg-white' : 'bg-muted/20')}>
                                                <td className="px-3 py-2 text-sm text-gray-600">{b.id}</td>
                                                <td className="px-3 py-2 text-sm font-medium text-foreground">{b.name}</td>
                                                <td className="px-3 py-2 text-sm text-gray-600">{getBranchDisplayAddress(b)}</td>
                                                <td className="px-3 py-2 text-sm text-gray-600 font-mono">{b.gstin || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-600">{b.phone || '-'}</td>
                                                <td className="px-3 py-2">
                                                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", b.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                                                        {b.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-600">{formatDate(b.createdAt)}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleOpenEdit(b)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Edit className="w-4 h-4" /></button>
                                                        <button onClick={() => setDeleteId(b.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile */}
                            <div className="md:hidden space-y-3 p-3">
                                {paginatedBranches.map((b) => (
                                    <div key={b.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <span className="font-medium text-foreground">{b.name}</span>
                                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", b.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                                                {b.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                            </span>
                                        </div>
                                        <div className="text-sm flex items-start gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                            <span className="text-gray-600">{getBranchDisplayAddress(b)}</span>
                                        </div>
                                        {b.gstin && (
                                            <div className="text-sm text-gray-600 font-mono">{t('branches.colGstin', 'GSTIN')}: {b.gstin}</div>
                                        )}
                                        {b.phone && (
                                            <div className="text-sm flex items-center gap-1">
                                                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                <span className="text-gray-600">{b.phone}</span>
                                            </div>
                                        )}
                                        <div className="text-xs text-muted-foreground">{t('branches.colCreated', 'Created')}: {formatDate(b.createdAt)}</div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(b)} className="flex-1">
                                                <Edit className="w-3.5 h-3.5 mr-1" /> {t('common.edit', 'Edit')}
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setDeleteId(b.id)} className="text-red-600 hover:bg-red-50">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
                {filteredBranches.length > itemsPerPage && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filteredBranches.length} />
                )}
            </Card>

            {/* Add/Edit Dialog */}
            {isDialogOpen && (
                <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
                    <DialogHeader title={editingBranch ? t('branches.dialogEditTitle', 'Edit Branch') : t('branches.dialogAddTitle', 'Add Branch')} onClose={() => setIsDialogOpen(false)} />

                    {/* Tabs */}
                    <div className="flex border-b border-border shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab('info')}
                            className={cn(
                                'flex-1 px-6 py-3 text-sm font-medium transition-colors',
                                activeTab === 'info'
                                    ? 'border-b-2 border-primary text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {t('branches.tabInfo', 'Information')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('address')}
                            className={cn(
                                'flex-1 px-6 py-3 text-sm font-medium transition-colors',
                                activeTab === 'address'
                                    ? 'border-b-2 border-primary text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {t('branches.tabAddress', 'Address')}
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
                        <DialogBody>
                            {/* Info Tab */}
                            {activeTab === 'info' && (
                                <div className="px-4 sm:px-6 py-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('branches.labelName', 'Branch Name')} <span className="text-destructive">*</span></label>
                                        <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('branches.namePlaceholder', 'e.g. North Branch')} required disabled={saving} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('common.mobile', 'Phone')}</label>
                                        <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder={t('branches.phonePlaceholder', 'Phone number')} disabled={saving} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('branches.labelGstin', 'GSTIN')}</label>
                                        <Input value={formGstin} onChange={(e) => setFormGstin(e.target.value.toUpperCase())} placeholder={t('branches.gstinPlaceholder', 'e.g. 27AABCU9603R1ZM')} maxLength={15} disabled={saving} className="font-mono" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium">{t('common.status', 'Status')}:</label>
                                        <button type="button" onClick={() => setFormActive(!formActive)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors", formActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                                            {formActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            {formActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Address Tab */}
                            {activeTab === 'address' && (
                                <div className="px-4 sm:px-6 py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('branches.addressLine1', 'Address Line 1')}</label>
                                            <Input value={formAddressLine1} onChange={(e) => setFormAddressLine1(e.target.value)} placeholder={t('branches.addressLine1Placeholder', 'Street address')} disabled={saving} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('branches.addressLine2', 'Address Line 2')}</label>
                                            <Input value={formAddressLine2} onChange={(e) => setFormAddressLine2(e.target.value)} placeholder={t('branches.addressLine2Placeholder', 'Area, landmark')} disabled={saving} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('branches.city', 'City')}</label>
                                            <Input value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder={t('branches.cityPlaceholder', 'City')} disabled={saving} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('branches.state', 'State')}</label>
                                            <Input value={formState} onChange={(e) => setFormState(e.target.value)} placeholder={t('branches.statePlaceholder', 'State')} disabled={saving} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('branches.country', 'Country')}</label>
                                            <Input value={formCountry} onChange={(e) => setFormCountry(e.target.value)} placeholder={t('branches.countryPlaceholder', 'Country')} disabled={saving} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('branches.pincode', 'Pincode')}</label>
                                            <Input value={formPincode} onChange={(e) => setFormPincode(e.target.value)} placeholder={t('branches.pincodePlaceholder', 'Pincode')} disabled={saving} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {formError && (
                                <div className="mx-4 sm:mx-6 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">{formError}</div>
                            )}
                        </DialogBody>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto" disabled={saving}>{t('common.cancel', 'Cancel')}</Button>
                            <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                                {saving ? t('common.saving', 'Saving...') : editingBranch ? t('common.update', 'Update') : t('common.save', 'Save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Dialog>
            )}

            {/* Delete Confirmation */}
            {deleteId !== null && (
                <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
                    <DialogHeader title={t('branches.dialogDeleteTitle', 'Delete Branch')} onClose={() => setDeleteId(null)} />
                    <DialogBody>
                        <p className="px-4 sm:px-5 py-4 text-sm text-muted-foreground">
                            {t('branches.deleteConfirm', 'Are you sure you want to delete this branch? This action cannot be undone.')}
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)} className="w-full sm:w-auto">{t('common.cancel', 'Cancel')}</Button>
                        <Button variant="destructive" onClick={handleDelete} className="w-full sm:w-auto">{t('common.delete', 'Delete')}</Button>
                    </DialogFooter>
                </Dialog>
            )}
        </div>
    );
};

export default AdminBranches;
