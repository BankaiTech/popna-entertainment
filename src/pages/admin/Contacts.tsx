import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { useContactsStore } from '@/store/useContactsStore';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, Edit, Trash2, Upload, Search, Users, Truck } from 'lucide-react';
import SupplierModal from '@/components/SupplierModal';
import ImportModal from '@/components/ImportModal';
import CustomerSheet from '@/components/CustomerSheet';
import type { Customer, Supplier } from '@/models/types';
import { cn } from '@/lib/utils';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

type ContactTab = 'customers' | 'suppliers' | 'import';

const Contacts = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<ContactTab>('customers');
    const [search, setSearch] = useState('');

    // Customer state (reusing existing store)
    const { customers, fetchCustomers, addCustomer, updateCustomer, deleteCustomer, products, fetchProducts, initialize } = useStore();
    const [showCustomerSheet, setShowCustomerSheet] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    // Supplier state
    const { suppliers, fetchSuppliers, addSupplier, updateSupplier, deleteSupplier, importSuppliers } = useContactsStore();
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

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

    // Filtered data
    const filteredCustomers = useMemo(() => {
        if (!search.trim()) return customers;
        const q = search.toLowerCase();
        return customers.filter((c) =>
            c.name.toLowerCase().includes(q) || c.mobile.includes(q) || c.email?.toLowerCase().includes(q)
        );
    }, [customers, search]);

    const filteredSuppliers = useMemo(() => {
        if (!search.trim()) return suppliers;
        const q = search.toLowerCase();
        return suppliers.filter((s) =>
            s.name.toLowerCase().includes(q) || s.mobile.includes(q) || s.email?.toLowerCase().includes(q)
        );
    }, [suppliers, search]);

    // Supplier handlers
    const handleAddSupplier = async (data: Omit<Supplier, 'id' | 'createdAt'>) => {
        await addSupplier(data);
    };
    const handleUpdateSupplier = async (id: number, data: Partial<Supplier>) => {
        await updateSupplier(id, data);
    };
    const handleDeleteSupplier = async (id: number) => {
        if (confirm('Are you sure you want to delete this supplier?')) {
            await deleteSupplier(id);
        }
    };

    // Customer handlers
    const handleAddCustomer = () => {
        setEditingCustomer(null);
        setShowCustomerSheet(true);
    };
    const handleEditCustomer = (customer: Customer) => {
        setEditingCustomer(customer);
        setShowCustomerSheet(true);
    };

    const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'> | Partial<Customer>) => {
        if (editingCustomer) {
            await updateCustomer(editingCustomer.id, customerData as Partial<Customer>);
        } else {
            await addCustomer(customerData as Omit<Customer, 'id' | 'createdAt'>);
        }
        await fetchCustomers();
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
        { id: 'import' as const, label: t('contacts.import', 'Import Contacts'), icon: Upload, count: undefined },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-foreground">
                        {t('contacts.title', 'Contacts')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t('contacts.subtitle', 'Manage customers, suppliers, and import contacts')}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-gray-200">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setSearch(''); }}
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

            {/* Tab Content */}
            {activeTab === 'customers' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div className="relative flex-1 w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." />
                        </div>
                        <Button onClick={handleAddCustomer} className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Add Customer
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Email</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Mobile</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Status</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{customer.email}</td>
                                        <td className="px-4 py-3 text-gray-600">{customer.mobile}</td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <span className={cn(
                                                'px-2 py-1 text-xs rounded-full font-medium',
                                                customer.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            )}>
                                                {customer.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleEditCustomer(customer)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteConfirmId(customer.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCustomers.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">No customers found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'suppliers' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div className="relative flex-1 w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." />
                        </div>
                        <Button onClick={() => { setEditingSupplier(null); setShowSupplierModal(true); }} className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Add Supplier
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Contact</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Mobile</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Tax No.</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Balance</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map((supplier) => (
                                    <tr key={supplier.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">{supplier.name}</td>
                                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{supplier.contactPerson || '-'}</td>
                                        <td className="px-4 py-3 text-gray-600">{supplier.mobile}</td>
                                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{supplier.taxNumber || '-'}</td>
                                        <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">₹{(supplier.openingBalance || 0).toLocaleString()}</td>
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
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No suppliers found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'import' && (
                <Card>
                    <CardContent className="p-6 sm:p-8 text-center space-y-4">
                        <Upload className="w-12 h-12 mx-auto text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900">Import Contacts</h3>
                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                            Import customers and suppliers from a CSV file. Download the sample template to get the correct format.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <a
                                href="/templates/contacts_template.csv"
                                download="contacts_template.csv"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Download Template
                            </a>
                            <Button onClick={() => setShowImportModal(true)}>
                                <Upload className="w-4 h-4 mr-2" /> Import CSV
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation */}
            {deleteConfirmId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-2">Delete Customer?</h3>
                        <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                            <Button size="sm" onClick={handleDeleteCustomerConfirm} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <SupplierModal
                isOpen={showSupplierModal}
                onClose={() => { setShowSupplierModal(false); setEditingSupplier(null); }}
                onSave={handleAddSupplier}
                onUpdate={handleUpdateSupplier}
                editingSupplier={editingSupplier}
            />

            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                title="Import Contacts"
                templateUrl="/templates/contacts_template.csv"
                templateFileName="contacts_template.csv"
                onImport={handleImportContacts}
                expectedHeaders={['Name', 'Email', 'Mobile', 'Type', 'Address Line 1', 'City', 'State', 'Country']}
            />

            {showCustomerSheet && (
                <CustomerSheet
                    isOpen={showCustomerSheet}
                    onClose={() => { setShowCustomerSheet(false); setEditingCustomer(null); }}
                    onSave={handleSaveCustomer}
                    editingCustomer={editingCustomer}
                    products={products}
                />
            )}
        </div>
    );
};

export default Contacts;
