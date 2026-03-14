// Contacts Module - Unified: Customers + Suppliers + Import
// Customers tab now has full features from the standalone Customers page
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useContactsStore } from '@/store/useContactsStore';
import { Card, CardContent, CardHeader, CardHeading, CardToolbar } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import CustomerSheet from '@/components/CustomerSheet';
import PaymentCollectionModal from '@/components/PaymentCollectionModal';
import SupplierModal from '@/components/SupplierModal';
import ImportModal from '@/components/ImportModal';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Plus, Edit, Trash2, Upload, Search, Users, Truck, Download, MessageSquare } from 'lucide-react';
import type { Customer, Supplier, Provider, CustomerStatus, PaymentMethod } from '@/models/types';
import { cn, formatCurrencyINR } from '@/lib/utils';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';
import { generateCustomerPassword } from '@/lib/utils';
import { organizationsApi } from '@/api/organizations';
import { showError, showSuccess, showInfo } from '@/utils/toast';

type ContactTab = 'customers' | 'suppliers' | 'import';

const Contacts = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<ContactTab>('customers');

    // Auth
    const { role } = useAuthStore();
    const isEmployee = role === 'employee';

    // Customer state
    const { customers, loading, fetchCustomers, addCustomer, updateCustomer, deleteCustomer, products, fetchProducts, initialize } = useStore();
    const [showCustomerSheet, setShowCustomerSheet] = useState(false);
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

    // Customer filters
    const [customerSearch, setCustomerSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'All'>('Active');
    const [connectionFilter, setConnectionFilter] = useState<Provider | 'All'>('All');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<'All' | 'paid' | 'not_paid'>('not_paid');
    const [customerPage, setCustomerPage] = useState(1);
    const customerPageSize = 10;

    // Supplier state
    const { suppliers, fetchSuppliers, addSupplier, updateSupplier, deleteSupplier, importSuppliers } = useContactsStore();
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [supplierSearch, setSupplierSearch] = useState('');

    // Import state
    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            await initialize();
            await fetchProducts();
            await fetchCustomers();
            await fetchSuppliers();
        };
        loadData();
    }, [initialize, fetchProducts, fetchCustomers, fetchSuppliers]);

    // ─── Customer Filtering ───
    const filteredCustomers = useMemo(() => {
        return customers.filter((customer) => {
            if (isEmployee) {
                if (customer.status !== 'Active' || customer.paymentStatus !== 'not_paid') return false;
            }
            const matchesSearch =
                customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                customer.mobile.includes(customerSearch);
            const matchesStatus = statusFilter === 'All' || customer.status === statusFilter;
            const matchesConnection = connectionFilter === 'All' || customer.connectionType === connectionFilter;
            const matchesPayment =
                paymentStatusFilter === 'All'
                    ? true
                    : paymentStatusFilter === 'paid'
                        ? customer.paymentStatus === 'paid'
                        : customer.paymentStatus === 'not_paid';
            return matchesSearch && matchesStatus && matchesConnection && matchesPayment;
        });
    }, [customers, customerSearch, statusFilter, connectionFilter, paymentStatusFilter, isEmployee]);

    const totalCustomerPages = Math.ceil(filteredCustomers.length / customerPageSize);
    const paginatedCustomers = useMemo(() => {
        const start = (customerPage - 1) * customerPageSize;
        return filteredCustomers.slice(start, start + customerPageSize);
    }, [filteredCustomers, customerPage, customerPageSize]);

    useEffect(() => { setCustomerPage(1); }, [customerSearch, statusFilter, connectionFilter, paymentStatusFilter]);

    // ─── Customer Handlers ───
    const handleAddCustomer = () => {
        if (isEmployee) {
            showError(t('customers.noPermissionAdd', 'You do not have permission to add customers.'));
            return;
        }
        setShowCustomerSheet(false);
        setEditingCustomer(null);
        setIsAddCustomerOpen(true);
    };

    const handleEditCustomer = (customer: Customer) => {
        if (isEmployee) return;
        setIsAddCustomerOpen(false);
        setEditingCustomer(customer);
        setShowCustomerSheet(true);
    };

    const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'> | Partial<Customer>) => {
        if (isEmployee) {
            showError(editingCustomer
                ? t('customers.noPermissionEdit', 'You do not have permission to edit customer details.')
                : t('customers.noPermissionAdd', 'You do not have permission to add customers.'));
            return;
        }
        if (editingCustomer) {
            await updateCustomer(editingCustomer.id, customerData);
            setIsAddCustomerOpen(false);
            setShowCustomerSheet(false);
            setEditingCustomer(null);
        } else {
            const password = generateCustomerPassword(
                (customerData as Omit<Customer, 'id' | 'createdAt'>).name,
                (customerData as Omit<Customer, 'id' | 'createdAt'>).mobile
            );
            const customerWithPassword = {
                ...(customerData as Omit<Customer, 'id' | 'createdAt'>),
                password,
            };
            await addCustomer(customerWithPassword);
            setGeneratedPassword(password);
            setShowPasswordDialog(true);
            setIsAddCustomerOpen(false);
            setShowCustomerSheet(false);
            setEditingCustomer(null);
        }
    };

    const handleCloseSheet = () => {
        setIsAddCustomerOpen(false);
        setShowCustomerSheet(false);
        setEditingCustomer(null);
    };

    const handleDeleteCustomerConfirm = async () => {
        if (deleteConfirmId !== null) {
            await deleteCustomer(deleteConfirmId);
            await fetchCustomers();
            setDeleteConfirmId(null);
        }
    };

    const handleUpdatePayment = async (
        customerId: number,
        data: { paymentStatus: 'paid' | 'not_paid'; paymentDescription: string; paymentUpdatedAt: string; paymentMethod?: PaymentMethod; collectedAmount?: number; balanceAmount?: number; collectedByUsername?: string }
    ) => {
        const updated = await updateCustomer(customerId, data);
        if (updated) setEditingCustomer(updated);
        if (data.paymentStatus === 'paid') {
            const renewed = await organizationsApi.renewSubscription(MOCK_ORGANIZATION_ID);
            if (renewed) {
                showSuccess(t('payment.subscriptionRenewed', 'Subscription renewed! Valid until: {{date}}', { date: renewed.subscriptionEnd }));
            }
        }
    };

    const statuses: CustomerStatus[] = ['Active', 'Inactive'];

    // Excel Download
    const handleDownloadExcel = () => {
        const headers = [
            t('customers.id', 'ID'), t('customers.name', 'Name'), t('customers.mobile', 'Mobile'),
            t('customers.email', 'Email'), t('customers.connectionType', 'Connection Type'),
            t('customers.package', 'Package'), t('customers.stbNo', 'STB No'),
            t('customers.canCaf', 'CAN/CAF'), t('customers.cin', 'CIN'),
            t('customers.area', 'Area'), t('customers.status', 'Status'),
            t('customers.paymentStatus', 'Payment Status'), t('customers.addressLine1', 'Address Line 1'),
            t('customers.addressLine2', 'Address Line 2'), t('customers.city', 'City'),
            t('customers.state', 'State'), t('customers.country', 'Country'),
            t('customers.gstin', 'GSTIN'), t('customers.description', 'Description'),
        ];
        const rows = filteredCustomers.map((c) => [
            c.id, c.name, c.mobile, c.email || '',
            getConnectionTypeLabel(c.connectionType, products), c.package || '',
            c.stbNumber || '', c.canCafId || '', c.cin || '', c.area || '',
            c.status === 'Active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive'),
            c.paymentStatus === 'paid' ? t('customers.paid', 'Paid') : t('customers.unpaid', 'Unpaid'),
            c.address?.line1 || '', c.address?.line2 || '', c.address?.city || '',
            c.address?.state || '', c.address?.country || '', c.gstin || '', c.description || '',
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map((row) =>
                row.map((cell) => {
                    const s = String(cell);
                    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
                }).join(',')
            ),
        ].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `customers_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ─── Supplier Filtering ───
    const filteredSuppliers = useMemo(() => {
        if (!supplierSearch.trim()) return suppliers;
        const q = supplierSearch.toLowerCase();
        return suppliers.filter((s) =>
            s.name.toLowerCase().includes(q) || s.mobile.includes(q) || s.email?.toLowerCase().includes(q)
        );
    }, [suppliers, supplierSearch]);

    // Supplier handlers
    const handleAddSupplier = async (data: Omit<Supplier, 'id' | 'createdAt'>) => {
        await addSupplier(data);
    };
    const handleUpdateSupplier = async (id: number, data: Partial<Supplier>) => {
        await updateSupplier(id, data);
    };
    const handleDeleteSupplier = async (id: number) => {
        if (confirm(t('contacts.deleteSupplierConfirm', 'Are you sure you want to delete this supplier?'))) {
            await deleteSupplier(id);
        }
    };

    // Import handler
    const handleImportContacts = async (rows: Record<string, string>[]) => {
        const supplierRows = rows.filter((r) => r['Type']?.toLowerCase() === 'supplier');
        const customerRows = rows.filter((r) => r['Type']?.toLowerCase() !== 'supplier');

        if (supplierRows.length > 0) {
            const suppliersToImport: Omit<Supplier, 'id' | 'createdAt'>[] = supplierRows.map((r) => ({
                organizationId: MOCK_ORGANIZATION_ID,
                name: r['Name'] || '',
                mobile: r['Mobile'] || '',
                email: r['Email'] || undefined,
                taxNumber: r['Tax Number'] || undefined,
                openingBalance: r['Opening Balance'] ? Number(r['Opening Balance']) : undefined,
                address: {
                    line1: r['Address Line 1'] || '',
                    city: r['City'] || '',
                    state: r['State'] || '',
                    country: r['Country'] || '',
                    pincode: r['Pincode'] || '',
                },
            }));
            await importSuppliers(suppliersToImport);
        }

        if (customerRows.length > 0) {
            for (const r of customerRows) {
                await addCustomer({
                    organizationId: MOCK_ORGANIZATION_ID,
                    name: r['Name'] || '',
                    email: r['Email'] || '',
                    mobile: r['Mobile'] || '',
                    connectionType: '',
                    package: '',
                    status: 'Active',
                    address: {
                        line1: r['Address Line 1'] || '',
                        line2: '',
                        city: r['City'] || '',
                        state: r['State'] || '',
                        country: r['Country'] || '',
                    },
                });
            }
            await fetchCustomers();
        }
    };

    const tabs = [
        { id: 'customers' as const, label: t('contacts.customers', 'Customers'), icon: Users, count: customers.length },
        { id: 'suppliers' as const, label: t('contacts.suppliers', 'Suppliers'), icon: Truck, count: suppliers.length },
        { id: 'import' as const, label: t('contacts.import', 'Import'), icon: Upload, count: undefined },
    ];

    return (
        <div className="space-y-3">
            {/* Tabs + Action buttons in one row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200">
                <div className="flex flex-wrap gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
                                    activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={cn(
                                        'px-2 py-0.5 text-xs rounded-full',
                                        activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                    )}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                {/* Tab-level action buttons */}
                <div className="flex gap-2 pb-2 sm:pb-0 px-1 sm:px-0">
                    {activeTab === 'customers' && !isEmployee && (
                        <>
                            <Button onClick={() => {
                                const pendingCustomers = customers.filter(c => c.paymentStatus === 'not_paid' && c.status === 'Active');
                                showInfo(t('dashboard.smsMock', 'Mock SMS: would send renewal reminder to {{count}} cable customers.', { count: pendingCustomers.length }));
                            }} variant="outline" size="xs">
                                <MessageSquare className="w-3.5 h-3.5" />
                                SMS
                            </Button>
                            <Button onClick={handleDownloadExcel} variant="outline" size="xs" disabled={filteredCustomers.length === 0}>
                                <Download className="w-3.5 h-3.5" />
                                {t('customers.downloadExcel', 'Export')}
                            </Button>
                            <Button onClick={handleAddCustomer} size="xs">
                                <Plus className="w-3.5 h-3.5" />
                                {t('customers.addCustomer', 'Add')}
                            </Button>
                        </>
                    )}
                    {activeTab === 'suppliers' && (
                        <Button onClick={() => { setEditingSupplier(null); setShowSupplierModal(true); }} size="xs">
                            <Plus className="w-3.5 h-3.5" />
                            {t('contacts.addSupplier', 'Add')}
                        </Button>
                    )}
                </div>
            </div>

            {activeTab === 'customers' && (
                <div className="space-y-3">
                    {/* Data Grid */}
                    <Card>
                        <CardHeader className="py-2.5 px-3 sm:px-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <CardHeading className="p-0 w-full md:w-auto md:min-w-0 shrink-0">
                                <div className="relative w-full min-w-0">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none shrink-0" />
                                    <Input
                                        placeholder={t('customers.searchPlaceholder', 'Search by name or mobile...')}
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                        className="pl-9 h-9 text-sm w-full min-w-0"
                                    />
                                </div>
                            </CardHeading>
                            <CardToolbar className="flex flex-col gap-2 w-full min-w-0 sm:flex-row sm:items-center sm:gap-3 sm:w-auto">
                                {!isEmployee && (
                                    <Select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'All')}
                                        className="h-9 text-sm w-full min-w-0 sm:min-w-[200px] sm:flex-initial"
                                    >
                                        <option value="All">{t('customers.allStatus', 'All Status')}</option>
                                        {statuses.map((status) => (
                                            <option key={status} value={status}>
                                                {status === 'Active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                                <Select
                                    value={connectionFilter}
                                    onChange={(e) => setConnectionFilter(e.target.value as Provider | 'All')}
                                    className="h-9 text-sm w-full min-w-0 sm:min-w-[200px] sm:flex-initial"
                                >
                                    <option value="All">{t('customers.allConnections', 'All Categories')}</option>
                                    {Array.isArray(products) && products.length > 0 ? (
                                        products.map((product) => (
                                            <option key={product.id} value={product.name}>
                                                {product.name}
                                            </option>
                                        ))
                                    ) : null}
                                </Select>
                                {!isEmployee && (
                                    <Select
                                        value={paymentStatusFilter}
                                        onChange={(e) => setPaymentStatusFilter(e.target.value as 'All' | 'paid' | 'not_paid')}
                                        className="h-9 text-sm w-full min-w-0 sm:min-w-[200px] sm:flex-initial"
                                    >
                                        <option value="All">{t('customers.allPayment', 'All Payment')}</option>
                                        <option value="not_paid">{t('customers.unpaid', 'Unpaid')}</option>
                                        <option value="paid">{t('customers.paid', 'Paid')}</option>
                                    </Select>
                                )}
                            </CardToolbar>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="text-center py-12">{t('common.loading', 'Loading...')}</div>
                            ) : filteredCustomers.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    {t('customers.noResults', 'No records found matching your criteria.')}
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b-2 border-border bg-muted/30">
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-14">{t('common.id', 'ID')}</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('common.name', 'Name')}</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('common.mobile', 'Mobile')}</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('common.category', 'Category')}</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('common.planItem', 'Plan / Item')}</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('common.deviceId', 'Device ID')}</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('common.refNo', 'Ref No')}</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('common.taxId', 'Tax ID')}</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('common.area', 'Area')}</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-20">{t('customers.creditLimit', 'Credit Limit')}</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-20">{t('customers.loyaltyPoints', 'Loyalty')}</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('common.payment', 'Payment')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedCustomers.map((customer, idx) => (
                                                    <tr
                                                        key={customer.id}
                                                        className={cn(
                                                            "border-b border-border hover:bg-muted/50 transition-colors",
                                                            idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-muted/20'
                                                        )}
                                                    >
                                                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.id}</td>
                                                        <td className="px-3 py-2">
                                                            {isEmployee ? (
                                                                <span className="text-sm font-medium text-foreground">{customer.name}</span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleEditCustomer(customer)}
                                                                    className="text-sm font-medium text-primary hover:underline"
                                                                >
                                                                    {customer.name}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.mobile}</td>
                                                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{getConnectionTypeLabel(customer.connectionType)}</td>
                                                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.package}</td>
                                                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.stbNumber || '-'}</td>
                                                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.canCafId || '-'}</td>
                                                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.cin || '-'}</td>
                                                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.area || '-'}</td>
                                                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.creditLimit != null ? formatCurrencyINR(customer.creditLimit) : '-'}</td>
                                                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.loyaltyPoints != null ? customer.loyaltyPoints : '-'}</td>
                                                        <td className="px-3 py-2 text-sm">
                                                            {customer.paymentStatus !== 'paid' ? (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setPaymentCustomer(customer); }}
                                                                    className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer transition-colors"
                                                                    title={t('customers.clickToCollect', 'Click to collect payment')}
                                                                >
                                                                    {t('customers.unpaid', 'Unpaid')}
                                                                </button>
                                                            ) : (
                                                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                                    {t('customers.paid', 'Paid')}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Card View */}
                                    <div className="md:hidden space-y-3 p-3">
                                        {paginatedCustomers.map((customer) => (
                                            <div key={customer.id} className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        {isEmployee ? (
                                                            <span className="text-base font-semibold text-foreground">{customer.name}</span>
                                                        ) : (
                                                            <button onClick={() => handleEditCustomer(customer)} className="text-base font-semibold text-primary hover:underline text-left">
                                                                {customer.name}
                                                            </button>
                                                        )}
                                                        <p className="text-xs text-muted-foreground mt-1">{t('customers.id', 'ID')}: {customer.id}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">{t('customers.mobile', 'Mobile')}: </span>
                                                        <span className="font-medium">{customer.mobile}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">{t('customers.connectionType', 'Connection')}: </span>
                                                        <span className="font-medium">{getConnectionTypeLabel(customer.connectionType)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">{t('customers.package', 'Package')}: </span>
                                                        <span className="font-medium">{customer.package || t('common.na', 'N/A')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">{t('customers.stbNo', 'STB No')}: </span>
                                                        <span className="font-medium">{customer.stbNumber || t('common.na', 'N/A')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">{t('customers.paymentStatus', 'Payment')}: </span>
                                                        {customer.paymentStatus !== 'paid' ? (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setPaymentCustomer(customer); }}
                                                                className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer transition-colors"
                                                            >
                                                                {t('customers.unpaid', 'Unpaid')}
                                                            </button>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                                {t('customers.paid', 'Paid')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                        {filteredCustomers.length > customerPageSize && (
                            <Pagination
                                currentPage={customerPage}
                                totalPages={totalCustomerPages}
                                onPageChange={setCustomerPage}
                                itemsPerPage={customerPageSize}
                                totalItems={filteredCustomers.length}
                            />
                        )}
                    </Card>
                </div>
            )}

            {/* ═══════════ SUPPLIERS TAB ═══════════ */}
            {activeTab === 'suppliers' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div className="relative flex-1 w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input className="pl-9" value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} placeholder={t('contacts.searchSuppliers', 'Search suppliers...')} />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {/* Desktop table */}
                        <table className="w-full text-sm hidden md:table">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('common.name', 'Name')}</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('contacts.supplierContact', 'Contact')}</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('common.mobile', 'Mobile')}</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('contacts.supplierTaxNo', 'Tax No.')}</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('contacts.supplierBalance', 'Balance')}</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t('common.actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map((supplier) => (
                                    <tr key={supplier.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">{supplier.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{supplier.contactPerson || '-'}</td>
                                        <td className="px-4 py-3 text-gray-600">{supplier.mobile}</td>
                                        <td className="px-4 py-3 text-gray-600">{supplier.taxNumber || '-'}</td>
                                        <td className="px-4 py-3 text-gray-600">₹{(supplier.openingBalance || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => { setEditingSupplier(supplier); setShowSupplierModal(true); }} className="p-1.5 hover:bg-blue-50 rounded text-blue-600">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteSupplier(supplier.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSuppliers.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">{t('contacts.noSuppliersFound', 'No suppliers found')}</td></tr>
                                )}
                            </tbody>
                        </table>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3">
                            {filteredSuppliers.map((supplier) => (
                                <div key={supplier.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <span className="font-medium text-foreground">{supplier.name}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditingSupplier(supplier); setShowSupplierModal(true); }} className="p-1.5 hover:bg-blue-50 rounded text-blue-600">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteSupplier(supplier.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-sm space-y-1">
                                        <div><span className="text-muted-foreground">{t('common.mobile', 'Mobile')}: </span><span>{supplier.mobile}</span></div>
                                        {supplier.contactPerson && <div><span className="text-muted-foreground">{t('contacts.supplierContact', 'Contact')}: </span><span>{supplier.contactPerson}</span></div>}
                                        {supplier.taxNumber && <div><span className="text-muted-foreground">{t('contacts.supplierTaxNo', 'Tax No')}: </span><span>{supplier.taxNumber}</span></div>}
                                        <div><span className="text-muted-foreground">{t('contacts.supplierBalance', 'Balance')}: </span><span>₹{(supplier.openingBalance || 0).toLocaleString()}</span></div>
                                    </div>
                                </div>
                            ))}
                            {filteredSuppliers.length === 0 && (
                                <div className="text-center py-8 text-gray-500">{t('contacts.noSuppliersFound', 'No suppliers found')}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ IMPORT TAB ═══════════ */}
            {activeTab === 'import' && (
                <Card>
                    <CardContent className="p-6 sm:p-8 text-center space-y-4">
                        <Upload className="w-12 h-12 mx-auto text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900">{t('contacts.importTitle', 'Import Contacts')}</h3>
                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                            {t('contacts.importDesc', 'Import customers and suppliers from a CSV file. Download the sample template to get the correct format.')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <a
                                href="/templates/contacts_template.csv"
                                download="contacts_template.csv"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                {t('contacts.downloadTemplate', 'Download Template')}
                            </a>
                            <Button onClick={() => setShowImportModal(true)}>
                                <Upload className="w-4 h-4 mr-2" /> {t('contacts.importCsv', 'Import CSV')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══════════ MODALS ═══════════ */}

            {/* Supplier Modal */}
            <SupplierModal
                isOpen={showSupplierModal}
                onClose={() => { setShowSupplierModal(false); setEditingSupplier(null); }}
                onSave={handleAddSupplier}
                onUpdate={handleUpdateSupplier}
                editingSupplier={editingSupplier}
            />

            {/* Import Modal */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                title={t('contacts.importTitle', 'Import Contacts')}
                templateUrl="/templates/contacts_template.csv"
                templateFileName="contacts_template.csv"
                onImport={handleImportContacts}
                expectedHeaders={['Name', 'Email', 'Mobile', 'Type', 'Address Line 1', 'City', 'State', 'Country']}
            />

            {/* Customer Sheet: Add or Edit */}
            {(isAddCustomerOpen || showCustomerSheet) && (
                <CustomerSheet
                    isOpen={isAddCustomerOpen || showCustomerSheet}
                    onClose={handleCloseSheet}
                    customer={isAddCustomerOpen ? null : editingCustomer}
                    onSave={handleSaveCustomer}
                />
            )}

            {/* Payment Collection Modal */}
            {paymentCustomer && (
                <PaymentCollectionModal
                    isOpen={!!paymentCustomer}
                    onClose={() => setPaymentCustomer(null)}
                    customer={paymentCustomer}
                    onSubmit={handleUpdatePayment}
                />
            )}

            {/* Password Success Dialog */}
            {showPasswordDialog && generatedPassword && (
                <Dialog open={showPasswordDialog} onClose={() => { setShowPasswordDialog(false); setGeneratedPassword(null); }}>
                    <DialogHeader title={t('customers.customerCreated', 'Customer Created Successfully')} onClose={() => { setShowPasswordDialog(false); setGeneratedPassword(null); }} />
                    <DialogBody>
                        <div className="px-4 sm:px-5 py-4 space-y-3">
                            <p className="text-sm text-muted-foreground">
                                {t('customers.passwordGenerated', 'A password has been automatically generated for this customer.')}
                            </p>
                            <div className="bg-muted rounded-lg p-4 border border-border">
                                <p className="text-xs font-medium text-muted-foreground mb-2">{t('customers.generatedPassword', 'Generated Password')}:</p>
                                <p className="text-lg font-mono font-bold text-foreground break-all">{generatedPassword}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('customers.passwordNote', 'Please save this password. It will not be shown again.')}
                            </p>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button onClick={() => { setShowPasswordDialog(false); setGeneratedPassword(null); }} className="w-full sm:w-auto">
                            {t('common.ok', 'OK')}
                        </Button>
                    </DialogFooter>
                </Dialog>
            )}

            {/* Delete Customer Confirmation */}
            {deleteConfirmId !== null && (
                <Dialog open={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)}>
                    <DialogHeader title={t('customers.deleteCustomer', 'Delete Customer')} onClose={() => setDeleteConfirmId(null)} />
                    <DialogBody>
                        <p className="px-4 sm:px-5 py-4 text-sm text-muted-foreground">
                            {t('customers.deleteConfirm', 'Are you sure you want to delete this customer? This action cannot be undone.')}
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="w-full sm:w-auto">
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteCustomerConfirm} className="w-full sm:w-auto">
                            {t('common.delete', 'Delete')}
                        </Button>
                    </DialogFooter>
                </Dialog>
            )}
        </div>
    );
};

export default Contacts;
