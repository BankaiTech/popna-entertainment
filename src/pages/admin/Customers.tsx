// SaaS Ready — Fully Dynamic Product
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import CustomerSheet from '@/components/CustomerSheet';
import PaymentCollectionModal from '@/components/PaymentCollectionModal';
import { Pagination } from '@/components/ui/Pagination';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import type { Customer, Provider, CustomerStatus, PaymentMethod } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';
import { generateCustomerPassword, cn } from '@/lib/utils';
import { organizationsApi } from '@/api/organizations';

const AdminCustomers = () => {
  const { t } = useTranslation();
  const { customers, loading, fetchCustomers, addCustomer, updateCustomer, deleteCustomer, products, fetchProducts } = useStore();
  const { role } = useAuthStore();
  const isEmployee = role === 'employee';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'All'>('All');
  const [connectionFilter, setConnectionFilter] = useState<Provider | 'All'>('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'All' | 'paid' | 'not_paid'>('All');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerIdToDelete, setCustomerIdToDelete] = useState<number | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { initialize } = useStore();

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await fetchProducts();
      await fetchCustomers();
    };
    loadData();
  }, [fetchCustomers, fetchProducts, initialize]);

  // Payment Collection System — SaaS Ready (universal for all products, no cable-only restriction)

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      // Employee view: show ONLY Inactive customers (UI-level filter, no DB change)
      if (isEmployee && customer.status !== 'Inactive') return false;

      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.mobile.includes(searchQuery);
      const matchesStatus = statusFilter === 'All' || customer.status === statusFilter;
      const matchesConnection =
        connectionFilter === 'All' || customer.connectionType === connectionFilter;
      // Payment filter — universal for ALL product types (SaaS Ready)
      const matchesPayment =
        paymentStatusFilter === 'All'
          ? true
          : paymentStatusFilter === 'paid'
            ? customer.paymentStatus === 'paid'
            : customer.paymentStatus === 'not_paid';
      return matchesSearch && matchesStatus && matchesConnection && matchesPayment;
    });
  }, [customers, searchQuery, statusFilter, connectionFilter, paymentStatusFilter, isEmployee]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, connectionFilter, paymentStatusFilter]);

  const handleAdd = () => {
    // Security check: Only Admin can add customers; Employee must not see button
    if (isEmployee) {
      alert(t('customers.noPermissionAdd', 'You do not have permission to add customers.'));
      return;
    }
    setIsSheetOpen(false);
    setEditingCustomer(null);
    setIsAddCustomerOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setIsAddCustomerOpen(false);
    setEditingCustomer(customer);
    setIsSheetOpen(true);
  };

  const handleSave = async (customerData: Omit<Customer, 'id' | 'createdAt'> | Partial<Customer>) => {
    // Security check: Employees cannot add or edit customers
    if (isEmployee) {
      if (editingCustomer) {
        alert(t('customers.noPermissionEdit', 'You do not have permission to edit customer details.'));
      } else {
        alert(t('customers.noPermissionAdd', 'You do not have permission to add customers.'));
      }
      return;
    }
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, customerData);
      setIsAddCustomerOpen(false);
      setIsSheetOpen(false);
      setEditingCustomer(null);
    } else {
      // Generate password for new customer
      // Replace with secure password generation & hashing later
      const password = generateCustomerPassword(
        (customerData as Omit<Customer, 'id' | 'createdAt'>).name,
        (customerData as Omit<Customer, 'id' | 'createdAt'>).mobile
      );

      // Add password to customer data
      const customerWithPassword = {
        ...(customerData as Omit<Customer, 'id' | 'createdAt'>),
        password,
      };

      await addCustomer(customerWithPassword);

      // Show password dialog once after creation
      setGeneratedPassword(password);
      setShowPasswordDialog(true);

      setIsAddCustomerOpen(false);
      setIsSheetOpen(false);
      setEditingCustomer(null);
    }
  };

  const handleDeleteClick = (id: number) => {
    if (isEmployee) return;
    setCustomerIdToDelete(id);
  };

  const handleDeleteCancel = () => setCustomerIdToDelete(null);

  const handleDeleteConfirm = async () => {
    if (customerIdToDelete == null) return;
    await deleteCustomer(customerIdToDelete);
    setCustomerIdToDelete(null);
  };

  const handleCloseSheet = () => {
    setIsAddCustomerOpen(false);
    setIsSheetOpen(false);
    setEditingCustomer(null);
  };

  // Payment Collection System — SaaS Ready (ALL product types)
  const handleUpdatePayment = async (
    customerId: number,
    data: { paymentStatus: 'paid' | 'not_paid'; paymentDescription: string; paymentUpdatedAt: string; paymentMethod?: PaymentMethod; collectedAmount?: number; balanceAmount?: number }
  ) => {
    const updated = await updateCustomer(customerId, data);
    if (updated) setEditingCustomer(updated);

    // Auto-renew subscription when customer is fully paid
    if (data.paymentStatus === 'paid') {
      const renewed = await organizationsApi.renewSubscription(MOCK_ORGANIZATION_ID);
      if (renewed) {
        alert(
          t('payment.subscriptionRenewed', 'Subscription renewed! Valid until: {{date}}', {
            date: renewed.subscriptionEnd,
          })
        );
      }
    }
  };

  const statuses: CustomerStatus[] = ['Active', 'Inactive'];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground mb-1">{t('customers.title', 'Customers')}</h1>
          <p className="text-sm text-muted-foreground">{t('customers.subtitle', 'Manage your customer database')}</p>
        </div>
        {!isEmployee && (
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {t('customers.addCustomer', 'Add Customer')}
          </Button>
        )}
      </div>

      {/* Data Grid */}
      <Card>
        <CardHeader className="py-3">
          {/* Filters in Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('customers.searchPlaceholder', 'Search by name or mobile...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm w-50"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'All')}
              className="h-9 text-sm"
            >
              <option value="All">{t('customers.allStatus', 'All Status')}</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <Select
              value={connectionFilter}
              onChange={(e) => setConnectionFilter(e.target.value as Provider | 'All')}
              className="h-9 text-sm"
            >
              <option value="All">{t('customers.allConnections', 'All Connections')}</option>
              {Array.isArray(products) && products.length > 0 ? (
                products.map((product) => (
                  <option key={product.id} value={product.name}>
                    {getConnectionTypeLabel(product.name, products)} ({product.productType === 'cable' ? t('common.cable', 'Cable') : t('common.internet', 'Internet')})
                  </option>
                ))
              ) : null}
            </Select>
            <Select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value as 'All' | 'paid' | 'not_paid')}
              className="h-9 text-sm"
            >
              <option value="All">{t('customers.allPayment', 'All Payment')}</option>
              <option value="paid">{t('customers.paid', 'Paid')}</option>
              <option value="not_paid">{t('customers.unpaid', 'Unpaid')}</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">{t('common.loading', 'Loading...')}</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('customers.noResults', 'No customers found matching your criteria.')}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-full">
                  {/* Header */}
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-border bg-muted/30">
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-14">{t('customers.id', 'ID')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('customers.name', 'Name')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('customers.mobile', 'Mobile')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('customers.connectionType', 'Connection Type')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('customers.package', 'Package')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('customers.paymentStatus', 'Payment')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('customers.status', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCustomers.map((customer, idx) => (
                        <tr
                          key={customer.id}
                          className={cn(
                            "border-b border-border hover:bg-muted/50 transition-colors",
                            idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                          )}
                        >
                          <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{customer.id}</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => handleEdit(customer)}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {customer.name}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{customer.mobile}</td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{getConnectionTypeLabel(customer.connectionType)}</td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{customer.package}</td>
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
                          <td className="px-3 py-2 text-sm flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${customer.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}
                            >
                              {customer.status}
                            </span>
                            {!isEmployee && (
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleEdit(customer)}
                                  className="p-1 hover:bg-accent rounded transition-colors"
                                  title={t('common.edit', 'Edit')}
                                >
                                  <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(customer.id)}
                                  className="p-1 hover:bg-destructive/10 rounded transition-colors"
                                  title={t('common.delete', 'Delete')}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {paginatedCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-base font-semibold text-primary hover:underline text-left"
                        >
                          {customer.name}
                        </button>
                        <p className="text-xs text-muted-foreground mt-1">{t('customers.id', 'ID')}: {customer.id}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${customer.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {customer.status}
                      </span>
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
                        <span className="text-muted-foreground">{t('customers.paymentStatus', 'Payment')}: </span>
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
                      </div>
                    </div>

                    {!isEmployee && (
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          <Edit className="w-4 h-4" />
                          {t('common.edit', 'Edit')}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(customer.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t('common.delete', 'Delete')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
        {filteredCustomers.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredCustomers.length}
          />
        )}
      </Card>

      {/* Customer Sheet: Add or Edit only — no payment controls */}
      {(isAddCustomerOpen || isSheetOpen) && (
        <CustomerSheet
          isOpen={isAddCustomerOpen || isSheetOpen}
          onClose={handleCloseSheet}
          customer={isAddCustomerOpen ? null : editingCustomer}
          onSave={handleSave}
        />
      )}

      {/* Payment Collection Modal — separate from edit, opened from Unpaid badge */}
      {paymentCustomer && (
        <PaymentCollectionModal
          isOpen={!!paymentCustomer}
          onClose={() => setPaymentCustomer(null)}
          customer={paymentCustomer}
          onSubmit={handleUpdatePayment}
        />
      )}

      {/* Password Success Dialog — shown once after customer creation */}
      {showPasswordDialog && generatedPassword && (
        <Dialog open={showPasswordDialog} onClose={() => { setShowPasswordDialog(false); setGeneratedPassword(null); }}>
          <DialogHeader title={t('customers.customerCreated', 'Customer Created Successfully')} onClose={() => { setShowPasswordDialog(false); setGeneratedPassword(null); }} />
          <DialogBody>
            <div className="px-4 sm:px-5 py-4 space-y-3" id="password-dialog-desc">
              <p className="text-sm text-muted-foreground">
                {t('customers.passwordGenerated', 'A password has been automatically generated for this customer.')}
              </p>
              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('customers.generatedPassword', 'Generated Password')}:</p>
                <p className="text-lg font-mono font-bold text-foreground break-all">{generatedPassword}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('customers.passwordNote', 'Please save this password. It will not be shown again. The customer can use their mobile number and this password to log in.')}
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

      {/* Delete Customer — confirmation alert dialog (Admin only) */}
      {customerIdToDelete != null && (
        <Dialog open={customerIdToDelete != null} onClose={handleDeleteCancel}>
          <DialogHeader title={t('customers.deleteCustomer', 'Delete Customer')} onClose={handleDeleteCancel} />
          <DialogBody>
            <p id="delete-dialog-desc" className="px-4 sm:px-5 py-4 text-sm text-muted-foreground">
              {t('customers.deleteConfirm', 'Are you sure you want to delete this customer? This action cannot be undone.')}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel} className="w-full sm:w-auto">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} className="w-full sm:w-auto">
              {t('common.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
};

export default AdminCustomers;
