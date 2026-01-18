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

const AdminCustomers = () => {
  const { customers, loading, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const { role } = useAuthStore();
  const isEmployee = role === 'employee';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'All'>('All');
  const [connectionFilter, setConnectionFilter] = useState<Provider | 'All'>('All');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { initialize } = useStore();

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await fetchCustomers();
    };
    loadData();
  }, [fetchCustomers, initialize]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.mobile.includes(searchQuery);
      const matchesStatus = statusFilter === 'All' || customer.status === statusFilter;
      const matchesConnection =
        connectionFilter === 'All' || customer.connectionType === connectionFilter;
      return matchesSearch && matchesStatus && matchesConnection;
    });
  }, [customers, searchQuery, statusFilter, connectionFilter]);

  const handleAdd = () => {
    // Security check: Employees cannot add customers
    if (isEmployee) {
      alert('You do not have permission to add customers.');
      return;
    }
    setEditingCustomer(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (customer: Customer) => {
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
    } else {
      await addCustomer(customerData as Omit<Customer, 'id' | 'createdAt'>);
    }
    setIsSheetOpen(false);
    setEditingCustomer(null);
  };

  const handleDelete = async (id: number) => {
    // Security check: Employees cannot delete customers
    if (isEmployee) {
      alert('You do not have permission to delete customers.');
      return;
    }
    if (confirm('Are you sure you want to delete this customer?')) {
      await deleteCustomer(id);
    }
  };

  const providers: Provider[] = ['GTPL', 'BSNL', 'Railwire', 'Krishiinet'];
  const statuses: CustomerStatus[] = ['Active', 'Inactive'];

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Customers</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your customer database</p>
        </div>
        {/* Only show Add Customer button for Admin role */}
        {!isEmployee && (
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'All')}
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
            >
              <option value="All">All Connections</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Customer List ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <div className="grid grid-cols-6 gap-4 p-4 bg-muted rounded-md mb-2 font-medium text-sm text-muted-foreground">
                    <div>ID</div>
                    <div>Name</div>
                    <div>Mobile</div>
                    <div>Connection Type</div>
                    <div>Package</div>
                    <div>Status</div>
                  </div>

                  {/* Rows */}
                  <div className="space-y-2">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="grid grid-cols-6 gap-4 p-4 bg-card border border-border rounded-md hover:shadow-md transition-shadow items-center"
                      >
                        <div className="text-sm">{customer.id}</div>
                        <div>
                          {isEmployee ? (
                            <span className="text-sm font-medium">{customer.name}</span>
                          ) : (
                            <button
                              onClick={() => handleEdit(customer)}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {customer.name}
                            </button>
                          )}
                        </div>
                        <div className="text-sm">{customer.mobile}</div>
                        <div className="text-sm">{getConnectionTypeLabel(customer.connectionType)}</div>
                        <div className="text-sm">{customer.package}</div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                                <Edit className="w-4 h-4 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => handleDelete(customer.id)}
                                className="p-1 hover:bg-destructive/10 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
                        {isEmployee ? (
                          <h3 className="text-base font-semibold text-foreground">{customer.name}</h3>
                        ) : (
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-base font-semibold text-primary hover:underline text-left"
                          >
                            {customer.name}
                          </button>
                        )}
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
                          onClick={() => handleDelete(customer.id)}
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

      {/* Customer Sheet Modal */}
      <CustomerSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
        onSave={handleSave}
      />
    </div>
  );
};

export default AdminCustomers;
