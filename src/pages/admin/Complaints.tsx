// SaaS Ready — Fully Dynamic Product
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Plus, AlertCircle, Search } from 'lucide-react';
import type { Complaint, ComplaintStatus, Provider } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';
import ComplaintModal from '@/components/ComplaintModal';
import { cn } from '@/lib/utils';

const Complaints = () => {
  const { t } = useTranslation();
  const { role } = useAuthStore();
  const isEmployee = role === 'employee';
  const { complaints, loading, fetchComplaints, initialize, customers, products, fetchProducts } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'All'>('All');
  const [connectionFilter, setConnectionFilter] = useState<Provider | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await fetchProducts();
      await fetchComplaints();
    };
    loadData();
  }, [fetchComplaints, fetchProducts, initialize]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      // Employee view: show ONLY active & on-hold complaints (UI-level filter)
      if (isEmployee && complaint.status === 'completed') return false;

      const matchesSearch = searchQuery.trim() === '' ||
        complaint.customerName.toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchesStatus = statusFilter === 'All' || complaint.status === statusFilter;

      const matchesConnection =
        connectionFilter === 'All' || complaint.connectionType === connectionFilter;

      return matchesSearch && matchesStatus && matchesConnection;
    });
  }, [complaints, searchQuery, statusFilter, connectionFilter, isEmployee]);

  // Pagination logic
  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
  const paginatedComplaints = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredComplaints.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredComplaints, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, connectionFilter]);

  const handleAdd = () => {
    setEditingComplaint(null);
    setIsModalOpen(true);
  };

  const handleEdit = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingComplaint(null);
  };

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: ComplaintStatus) => {
    switch (status) {
      case 'active':
        return t('complaints.active', 'Active');
      case 'on-hold':
        return t('complaints.onHold', 'On Hold');
      case 'completed':
        return t('complaints.completed', 'Completed');
      default:
        return status;
    }
  };

  const statuses: ComplaintStatus[] = ['active', 'on-hold', 'completed'];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground mb-1">{t('complaints.title', 'Complaints')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('complaints.subtitle', 'Manage and track customer complaints')}</p>
        </div>
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          {t('complaints.addComplaint', 'Add Complaint')}
        </Button>
      </div>

      {/* Data Grid */}
      <Card>
        <CardHeader className="py-3">
          {/* Filters in Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder={t('complaints.searchPlaceholder', 'Search by customer name...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm w-50"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ComplaintStatus | 'All')}
              className="h-9 text-sm"
            >
              <option value="All">{t('complaints.allStatus', 'All Status')}</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </Select>
            <Select
              value={connectionFilter}
              onChange={(e) => setConnectionFilter(e.target.value as Provider | 'All')}
              className="h-9 text-sm"
            >
              <option value="All">{t('complaints.allConnections', 'All Connections')}</option>
              {Array.isArray(products) && products.length > 0 ? (
                products.map((product) => (
                  <option key={product.id} value={product.name}>
                    {getConnectionTypeLabel(product.name, products)} ({product.productType === 'cable' ? t('common.cable', 'Cable') : t('common.internet', 'Internet')})
                  </option>
                ))
              ) : null}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">{t('common.loading', 'Loading...')}</div>
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('complaints.noResults', 'No complaints found matching your criteria.')}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-14">{t('complaints.id', 'ID')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground min-w-[10rem]">{t('complaints.customer', 'Customer')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('complaints.mobile', 'Mobile')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('complaints.connection', 'Connection')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground min-w-[8rem]">{t('complaints.description', 'Description')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('complaints.status', 'Status')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('complaints.created', 'Created')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedComplaints.map((complaint, idx) => (
                      <tr
                        key={complaint.id}
                        onClick={() => handleEdit(complaint)}
                        className={cn(
                          "border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
                          idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                        )}
                      >
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{complaint.id}</td>
                        <td className="px-3 py-2 text-sm font-medium text-primary hover:underline">{complaint.customerName}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{complaint.mobile}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{getConnectionTypeLabel(complaint.connectionType)}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground max-w-xs truncate">{complaint.customerDescription}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              complaint.status
                            )}`}
                          >
                            {getStatusLabel(complaint.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{new Date(complaint.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-3">
                {paginatedComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleEdit(complaint)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-base font-semibold text-primary">{complaint.customerName}</p>
                        <p className="text-xs text-muted-foreground mt-1">ID: {complaint.id}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          complaint.status
                        )}`}
                      >
                        {getStatusLabel(complaint.status)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('complaints.mobile', 'Mobile')}: </span>
                        <span className="font-medium">{complaint.mobile}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('complaints.connection', 'Connection')}: </span>
                        <span className="font-medium">{getConnectionTypeLabel(complaint.connectionType)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('complaints.description', 'Description')}: </span>
                        <span className="font-medium">{complaint.customerDescription}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('complaints.created', 'Created')}: </span>
                        <span className="font-medium">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
        {filteredComplaints.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredComplaints.length}
          />
        )}
      </Card>

      {/* Complaint Modal */}
      <ComplaintModal
        isOpen={isModalOpen}
        onClose={handleClose}
        complaint={editingComplaint}
        customers={customers}
      />
    </div>
  );
};

export default Complaints;
