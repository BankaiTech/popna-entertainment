import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, AlertCircle, LogOut } from 'lucide-react';
import type { Complaint } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';
import CustomerComplaintModal from '@/components/CustomerComplaintModal';
import FooterCredit from '@/components/FooterCredit';

const CustomerDashboard = () => {
  const { customerId, logout } = useAuthStore();
  const navigate = useNavigate();
  const { customers, complaints, initialize } = useStore();
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get current customer data
  const currentCustomer = customers.find((c) => c.id === customerId);
  
  // Filter complaints for this customer only
  const myComplaints = complaints.filter((c) => c.customerId === customerId);

  const getStatusLabel = (status: Complaint['status']) => {
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

  const getStatusColor = (status: Complaint['status']) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  if (!currentCustomer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading customer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">My Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Welcome, {currentCustomer.name}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => setIsComplaintModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Complaint
          </Button>
          <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Customer Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>My Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Name</p>
              <p className="font-medium">{currentCustomer.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Mobile</p>
              <p className="font-medium">{currentCustomer.mobile}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Connection Type</p>
              <p className="font-medium">{getConnectionTypeLabel(currentCustomer.connectionType)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Package</p>
              <p className="font-medium">{currentCustomer.package || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  currentCustomer.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {currentCustomer.status}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Complaints Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Complaints</CardTitle>
            <span className="text-sm text-muted-foreground">
              {myComplaints.length} complaint{myComplaints.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {myComplaints.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No complaints yet</p>
              <p className="text-sm mt-2">Click "Add Complaint" to submit a new complaint</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            complaint.status
                          )}`}
                        >
                          {getStatusLabel(complaint.status)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Created: {formatDate(complaint.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {complaint.customerDescription}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Complaint Modal */}
      <CustomerComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        customer={currentCustomer}
      />
      </div>
      {/* Footer credit — sticky at bottom */}
      <footer className="shrink-0 border-t border-border bg-muted/50 py-3 px-4 mt-auto">
        <FooterCredit />
      </footer>
    </div>
  );
};

export default CustomerDashboard;
