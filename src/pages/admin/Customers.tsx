import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import CustomerSheet from '@/components/CustomerSheet';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import type { Customer, Provider, CustomerStatus } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';
import { generateCustomerPassword, cn } from '@/lib/utils';

const AdminCustomers = () => {
  const { customers, loading, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } = useStore();
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

  const { initialize } = useStore();

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await fetchCustomers();
    };
    loadData();
  }, [fetchCustomers, initialize]);

  // Reset Payment Status filter when Connection Type is not GTPL
  useEffect(() => {
    if (connectionFilter !== 'GTPL') {
      setPaymentStatusFilter('All');
    }
  }, [connectionFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.mobile.includes(searchQuery);
      const matchesStatus = statusFilter === 'All' || customer.status === statusFilter;
      const matchesConnection =
        connectionFilter === 'All' || customer.connectionType === connectionFilter;
      const matchesPayment =
        connectionFilter !== 'GTPL'
          ? true
          : paymentStatusFilter === 'All'
            ? true
            : paymentStatusFilter === 'paid'
              ? customer.paymentStatus === 'paid'
              : customer.paymentStatus === 'not_paid';
      return matchesSearch && matchesStatus && matchesConnection && matchesPayment;
    });
  }, [customers, searchQuery, statusFilter, connectionFilter, paymentStatusFilter]);

  const handleAdd = () => {
    // Security check: Only Admin can add customers; Employee must not see button
    if (isEmployee) {
      alert('You do not have permission to add customers.');
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
        alert('You do not have permission to edit customer details.');
      } else {
        alert('You do not have permission to add customers.');
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

  /** GTPL only. Admin and Employee can update only payment fields (paymentStatus, paymentDescription, paymentUpdatedAt). No role check — payment-only updates are always allowed. */
  const handleUpdatePayment = async (
    customerId: number,
    data: { paymentStatus: 'paid' | 'not_paid'; paymentDescription: string; paymentUpdatedAt: string }
  ) => {
    const updated = await updateCustomer(customerId, data);
    if (updated) setEditingCustomer(updated);
  };

  const statuses: CustomerStatus[] = ['Active', 'Inactive'];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage your customer database</p>
        </div>
        {/* Only show Add Customer button for Admin role */}
        {!isEmployee && (
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Data Grid */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
            <CardTitle className="text-base">Customer List ({filteredCustomers.length})</CardTitle>
          </div>
          {/* Filters in Header */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${connectionFilter === 'GTPL' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or mobile..."
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
              <option value="All">All Status</option>
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
              <option value="All">All Connections</option>
              <option value="GTPL">{getConnectionTypeLabel('GTPL')} (Cable)</option>
              {['BSNL', 'Railwire', 'Krishiinet'].map((provider) => (
                <option key={provider} value={provider}>
                  {getConnectionTypeLabel(provider as Provider)} (Internet)
                </option>
              ))}
            </Select>
            {connectionFilter === 'GTPL' && (
              <Select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as 'All' | 'paid' | 'not_paid')}
                className="h-9 text-sm"
              >
                <option value="All">All</option>
                <option value="paid">Paid</option>
                <option value="not_paid">Not Paid</option>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No customers found matching your criteria.
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
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">ID</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Name</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Mobile</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Connection Type</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Package</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer, idx) => (
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
                          <td className="px-3 py-2 text-sm flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                customer.status === 'Active'
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
                                  title="Edit"
                                >
                                  <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(customer.id)}
                                  className="p-1 hover:bg-destructive/10 rounded transition-colors"
                                  title="Delete"
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
                {filteredCustomers.map((customer) => (
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
                        <p className="text-xs text-muted-foreground mt-1">ID: {customer.id}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          customer.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {customer.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Mobile: </span>
                        <span className="font-medium">{customer.mobile}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Connection: </span>
                        <span className="font-medium">{getConnectionTypeLabel(customer.connectionType)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Package: </span>
                        <span className="font-medium">{customer.package || 'N/A'}</span>
                      </div>
                    </div>

                    {!isEmployee && (
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(customer.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Sheet: conditionally mounted when Add or Edit is open */}
      {(isAddCustomerOpen || isSheetOpen) && (
        <CustomerSheet
          isOpen={isAddCustomerOpen || isSheetOpen}
          onClose={handleCloseSheet}
          customer={isAddCustomerOpen ? null : editingCustomer}
          onSave={handleSave}
          onUpdatePayment={handleUpdatePayment}
        />
      )}

      {/* Password Success Dialog — shown once after customer creation */}
      {showPasswordDialog && generatedPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-md flex flex-col overflow-hidden" role="alertdialog" aria-labelledby="password-dialog-title" aria-describedby="password-dialog-desc">
            <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-border">
              <h2 id="password-dialog-title" className="text-lg font-semibold">Customer Created Successfully</h2>
            </div>
            <div id="password-dialog-desc" className="flex-1 px-4 sm:px-5 py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                A password has been automatically generated for this customer.
              </p>
              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Generated Password:</p>
                <p className="text-lg font-mono font-bold text-foreground break-all">{generatedPassword}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Please save this password. It will not be shown again. The customer can use their mobile number and this password to log in.
              </p>
            </div>
            <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-5 py-4 border-t border-border bg-card">
              <Button
                onClick={() => {
                  setShowPasswordDialog(false);
                  setGeneratedPassword(null);
                }}
                className="w-full sm:w-auto"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer — confirmation alert dialog (Admin only) */}
      {customerIdToDelete != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-md flex flex-col overflow-hidden" role="alertdialog" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-desc">
            <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-border">
              <h2 id="delete-dialog-title" className="text-lg font-semibold">Delete Customer</h2>
            </div>
            <p id="delete-dialog-desc" className="flex-1 px-4 sm:px-5 py-4 text-sm text-muted-foreground">
              Are you sure you want to delete this customer? This action cannot be undone.
            </p>
            <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-5 py-4 border-t border-border bg-card">
              <Button variant="outline" onClick={handleDeleteCancel} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} className="w-full sm:w-auto">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
