import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, AlertCircle, Search } from 'lucide-react';
import type { Complaint, ComplaintStatus, Provider } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';
import ComplaintModal from '@/components/ComplaintModal';

const Complaints = () => {
  const { complaints, loading, fetchComplaints, initialize, customers } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'All'>('All');
  const [connectionFilter, setConnectionFilter] = useState<Provider | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await fetchComplaints();
    };
    loadData();
  }, [fetchComplaints, initialize]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      // Search filter - case-insensitive partial match on customer name
      const matchesSearch = searchQuery.trim() === '' || 
        complaint.customerName.toLowerCase().includes(searchQuery.toLowerCase().trim());
      
      // Status filter
      const matchesStatus = statusFilter === 'All' || complaint.status === statusFilter;
      
      // Connection type filter
      const matchesConnection =
        connectionFilter === 'All' || complaint.connectionType === connectionFilter;
      
      return matchesSearch && matchesStatus && matchesConnection;
    });
  }, [complaints, searchQuery, statusFilter, connectionFilter]);

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
        return 'Active';
      case 'on-hold':
        return 'On Hold';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const providers: Provider[] = ['GTPL', 'BSNL', 'Railwire', 'Krishiinet'];
  const statuses: ComplaintStatus[] = ['active', 'on-hold', 'completed'];

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Complaints</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage and track customer complaints</p>
        </div>
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Complaint
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="space-y-4">
            {/* Search Box */}
            <div>
              <label className="block text-sm font-medium mb-2">Search by Customer Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search complaints by customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status Filter</label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ComplaintStatus | 'All')}
                >
                  <option value="All">All Status</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Connection Type Filter</label>
                <Select
                  value={connectionFilter}
                  onChange={(e) => setConnectionFilter(e.target.value as Provider | 'All')}
                >
                  <option value="All">All Connections</option>
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {getConnectionTypeLabel(provider)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complaints Grid */}
      {loading ? (
        <div className="text-center py-12">Loading complaints...</div>
      ) : filteredComplaints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No complaints found matching your criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredComplaints.map((complaint) => (
            <Card
              key={complaint.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleEdit(complaint)}
            >
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-lg">{complaint.customerName}</CardTitle>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      complaint.status
                    )}`}
                  >
                    {getStatusLabel(complaint.status)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>📱 {complaint.mobile}</p>
                  <p>🔌 {getConnectionTypeLabel(complaint.connectionType)}</p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground line-clamp-3 mb-4">
                  {complaint.customerDescription}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(complaint.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
