// Connection Requests - Shows only "New" requests with clickable badge to add customer
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { connectionRequestsApi } from '@/api/connectionRequests';
import { useStore } from '@/store/useStore';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { cn } from '@/lib/utils';
import { Search, Info } from 'lucide-react';
import CustomerSheet from '@/components/CustomerSheet';
import type { ConnectionRequest } from '@/models/types';
import { showError } from '@/utils/toast';

const ConnectionRequests = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ConnectionRequest | null>(null);
  const itemsPerPage = 10;

  const { addCustomer, products, fetchProducts } = useStore();

  useEffect(() => {
    loadRequests();
    fetchProducts();
  }, [fetchProducts]);

  const handleAddCustomer = (customerData: any) => {
    // Add customer and mark request as converted
    addCustomer(customerData);
    if (selectedRequest) {
      handleStatusUpdate(selectedRequest.id, 'Converted');
    }
    setIsCustomerSheetOpen(false);
    setSelectedRequest(null);
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const allRequests = await connectionRequestsApi.getAll();
      setRequests(allRequests);
    } catch (error) {
      console.error('Error loading connection requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: 'Converted') => {
    try {
      await connectionRequestsApi.updateStatus(id, newStatus);
      await loadRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      showError(t('connectionRequests.updateError', 'Failed to update status. Please try again.'));
    }
  };


  const handleNewBadgeClick = (request: ConnectionRequest) => {
    setSelectedRequest(request);
    setIsCustomerSheetOpen(true);
  };

  // Filter to show only "New" requests
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const isNew = request.status === 'New';
      const matchesSearch =
        searchQuery === '' ||
        request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.mobile.includes(searchQuery);
      const matchesCategory = categoryFilter === 'All' || request.productName === categoryFilter;
      return isNew && matchesSearch && matchesCategory;
    });
  }, [requests, searchQuery, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-3">
      <Card className="border border-border bg-card shadow-soft rounded-card">
        <CardHeader className="border-b border-border bg-gray-50 py-3">
          {/* Search + Category filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-auto sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('connectionRequests.searchPlaceholder', 'Search by name or mobile...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs w-full sm:w-50"
              />
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 text-xs w-full sm:w-auto sm:min-w-[160px]"
            >
              <option value="All">{t('complaints.allCategories', 'All Categories')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0" style={{ overflow: 'visible' }}>
          {loading ? (
            <div className="p-8 text-center text-gray-600">{t('connectionRequests.loading', 'Loading requests...')}</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-600">{t('connectionRequests.empty', 'No connection requests found.')}</div>
          ) : (
            <>
              {/* Desktop Table View - Status shows "New" badge with info icon */}
              <div className="hidden md:block">
                <div className="min-w-full">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-border bg-muted/30">
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('connectionRequests.colId', 'ID')}</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('connectionRequests.colCustomerName', 'Customer Name')}</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('connectionRequests.colMobile', 'Mobile')}</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('connectionRequests.colPlanName', 'Plan Name')}</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('connectionRequests.colProductName', 'Product Name')}</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('connectionRequests.colRequestedDate', 'Requested Date')}</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('connectionRequests.colStatus', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRequests.map((request, idx) => (
                        <tr
                          key={request.id}
                          className={cn(
                            "border-b border-border hover:bg-muted/50 transition-colors",
                            idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                          )}
                        >
                          <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{request.id}</td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{request.name}</td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{request.mobile}</td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{request.planName}</td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{getProviderDisplayName(request.productName)}</td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{formatDate(request.createdAt)}</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => handleNewBadgeClick(request)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                              title={t('connectionRequests.addCustomerTooltip', 'Click to add customer')}
                            >
                              {t('connectionRequests.statusNew', 'New')}
                              <Info className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-4">
                {paginatedRequests.map((request) => (
                  <Card key={request.id} className="border border-border">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{request.name}</p>
                          <p className="text-sm text-gray-600">{t('connectionRequests.colId', 'ID')}: {request.id}</p>
                        </div>
                        <button
                          onClick={() => handleNewBadgeClick(request)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                          title={t('connectionRequests.addCustomerTooltip', 'Click to add customer')}
                        >
                          {t('connectionRequests.statusNew', 'New')}
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-600">{t('connectionRequests.colMobile', 'Mobile')}:</span> {request.mobile}</p>
                        <p><span className="text-gray-600">{t('connectionRequests.colEmail', 'Email')}:</span> {request.email || '-'}</p>
                        <p><span className="text-gray-600">{t('connectionRequests.colPlanName', 'Plan')}:</span> {request.planName}</p>
                        <p><span className="text-gray-600">{t('connectionRequests.colProductName', 'Product')}:</span> {getProviderDisplayName(request.productName)}</p>
                        <p><span className="text-gray-600">{t('connectionRequests.colRequestedDate', 'Date')}:</span> {formatDate(request.createdAt)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-border p-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredRequests.length}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* CustomerSheet Dialog */}
      <CustomerSheet
        isOpen={isCustomerSheetOpen}
        onClose={() => {
          setIsCustomerSheetOpen(false);
          setSelectedRequest(null);
        }}
        customer={null}
        onSave={handleAddCustomer}
        prefillData={
          selectedRequest
            ? {
              name: selectedRequest.name,
              email: selectedRequest.email || '',
              mobile: selectedRequest.mobile,
              connectionType: selectedRequest.productName as any,
              package: selectedRequest.planName,
            }
            : undefined
        }
      />
    </div>
  );
};

export default ConnectionRequests;
