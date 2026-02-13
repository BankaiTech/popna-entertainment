import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { connectionRequestsApi } from '@/api/connectionRequests';
import { cn } from '@/lib/utils';
import type { ConnectionRequest, ConnectionRequestStatus } from '@/models/types';

const ConnectionRequests = () => {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ConnectionRequestStatus | 'All'>('All');
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
      alert('Failed to update status. Please try again.');
    }
  };

  // Filter requests by status
  const filteredRequests = statusFilter === 'All' 
    ? requests 
    : requests.filter((r) => r.status === statusFilter);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadgeColor = (status: ConnectionRequestStatus) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Contacted':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Converted':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Connection Requests</h1>
          <p className="text-sm text-gray-600 mt-1">Manage customer plan requests</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ConnectionRequestStatus | 'All');
              setCurrentPage(1);
            }}
            className="w-full sm:w-48"
          >
            <option value="All">All Status</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Converted">Converted</option>
          </Select>
        </div>
      </div>

      <Card className="border border-border bg-card shadow-soft">
        <CardHeader className="border-b border-border bg-gray-50">
          <CardTitle className="text-lg font-semibold text-foreground">Connection Requests</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Total: {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-600">Loading requests...</div>
          ) : paginatedRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No connection requests found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-xs font-semibold uppercase tracking-wider text-foreground px-4 py-3 text-left">
                        ID
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-foreground px-4 py-3 text-left">
                        Customer Name
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-foreground px-4 py-3 text-left">
                        Mobile
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-foreground px-4 py-3 text-left">
                        Email
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-foreground px-4 py-3 text-left">
                        Plan Name
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-foreground px-4 py-3 text-left">
                        Product Name
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-foreground px-4 py-3 text-left">
                        Requested Date
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-foreground px-4 py-3 text-left">
                        Status
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-foreground px-4 py-3 text-left">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedRequests.map((request) => (
                      <tr
                        key={request.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">{request.id}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{request.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{request.mobile}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{request.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{request.planName}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{request.productName}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{formatDate(request.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                              getStatusBadgeColor(request.status)
                            )}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {request.status !== 'Contacted' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(request.id, 'Contacted')}
                                className="text-xs"
                              >
                                Mark Contacted
                              </Button>
                            )}
                            {request.status !== 'Converted' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(request.id, 'Converted')}
                                className="text-xs"
                              >
                                Mark Converted
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
