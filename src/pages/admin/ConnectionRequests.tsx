import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { connectionRequestsApi } from '@/api/connectionRequests';
import { useStore } from '@/store/useStore';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { cn, generateCustomerPassword } from '@/lib/utils';
import { Search } from 'lucide-react';
import type { ConnectionRequest, ConnectionRequestStatus } from '@/models/types';

const ConnectionRequests = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ConnectionRequestStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    loadRequests();
  }, []);

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

  const handleStatusUpdate = async (id: number, newStatus: ConnectionRequestStatus) => {
    try {
      await connectionRequestsApi.updateStatus(id, newStatus);
      await loadRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(t('connectionRequests.updateError', 'Failed to update status. Please try again.'));
    }
  };

  // Connection auto-converted to customer
  const { addCustomer } = useStore();

  const handleConvert = async (request: ConnectionRequest) => {
    try {
      const password = generateCustomerPassword(request.name, request.mobile);
      await addCustomer({
        organizationId: 'org_001',
        name: request.name,
        email: request.email || '',
        mobile: request.mobile,
        password,
        connectionType: request.productName as any,
        package: request.planName,
        status: 'Active',
        address: { line1: '', line2: '', city: '', state: '', country: '' },
        paymentStatus: 'not_paid',
      });
      await handleStatusUpdate(request.id, 'Converted');
    } catch (error) {
      console.error('Error converting request:', error);
      alert(t('connectionRequests.convertError', 'Failed to convert. Please try again.'));
    }
  };

  // Filter requests by status and search query
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = statusFilter === 'All' || request.status === statusFilter;
      const matchesSearch =
        searchQuery === '' ||
        request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.mobile.includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const getStatusBadgeColor = (status: ConnectionRequestStatus) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Converted':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: ConnectionRequestStatus) => {
    switch (status) {
      case 'New':
        return t('connectionRequests.new', 'New');
      case 'Converted':
        return t('connectionRequests.converted', 'Converted');
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">{t('connectionRequests.title', 'New Connection Requests')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('connectionRequests.subtitle', 'Manage customer plan requests')}</p>
        </div>
      </div>

      <Card className="border border-border bg-card shadow-soft rounded-card">
        <CardHeader className="border-b border-border bg-gray-50">

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="relative w-full sm:w-auto sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('connectionRequests.searchPlaceholder', 'Search by name or mobile...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs w-full sm:w-64"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ConnectionRequestStatus | 'All')}
              className="h-8 text-xs w-full sm:w-auto sm:min-w-[140px]"
            >
              <option value="All">{t('connectionRequests.allStatus', 'All Status')}</option>
              <option value="New">{t('connectionRequests.statusNew', 'New')}</option>
              <option value="Contacted">{t('connectionRequests.statusContacted', 'Contacted')}</option>
              <option value="Converted">{t('connectionRequests.statusConverted', 'Converted')}</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-600">{t('connectionRequests.loading', 'Loading requests...')}</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-600">{t('connectionRequests.empty', 'No connection requests found.')}</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-full">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-border bg-muted/30 sticky top-0 z-10">
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-14">{t('connectionRequests.colId', 'ID')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('connectionRequests.colCustomerName', 'Customer Name')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('connectionRequests.colMobile', 'Mobile')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('connectionRequests.colPlanName', 'Plan Name')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('connectionRequests.colProductName', 'Product Name')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('connectionRequests.colRequestedDate', 'Requested Date')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-20">{t('connectionRequests.colStatus', 'Status')}</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-20">{t('connectionRequests.colActions', 'Actions')}</th>
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
                          <td className="px-3 py-2 text-sm font-normal text-gray-600">{request.id}</td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">{request.name}</td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600">{request.mobile}</td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600">{request.planName}</td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600">{getProviderDisplayName(request.productName)}</td>
                          <td className="px-3 py-2 text-sm font-normal text-gray-600">{formatDate(request.createdAt)}</td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                                getStatusBadgeColor(request.status)
                              )}
                            >
                              {getStatusLabel(request.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {request.status === 'New' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleConvert(request)}
                                  className="text-xs"
                                >
                                  {t('connectionRequests.markConverted', 'Mark Converted')}
                                </Button>
                              )}
                            </div>
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
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                            getStatusBadgeColor(request.status)
                          )}
                        >
                          {getStatusLabel(request.status)}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-600">{t('connectionRequests.colMobile', 'Mobile')}:</span> {request.mobile}</p>
                        <p><span className="text-gray-600">{t('connectionRequests.colEmail', 'Email')}:</span> {request.email || '—'}</p>
                        <p><span className="text-gray-600">{t('connectionRequests.colPlanName', 'Plan')}:</span> {request.planName}</p>
                        <p><span className="text-gray-600">{t('connectionRequests.colProductName', 'Product')}:</span> {getProviderDisplayName(request.productName)}</p>
                        <p><span className="text-gray-600">{t('connectionRequests.colRequestedDate', 'Date')}:</span> {formatDate(request.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        {request.status === 'New' && (
                          <Button
                            size="sm"
                            onClick={() => handleConvert(request)}
                            className="text-xs flex-1"
                          >
                            {t('connectionRequests.markConverted', 'Mark Converted')}
                          </Button>
                        )}
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
    </div>
  );
};

export default ConnectionRequests;
