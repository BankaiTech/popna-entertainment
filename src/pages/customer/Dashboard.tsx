import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, AlertCircle, LogOut, FileText, Download } from 'lucide-react';
import type { Complaint, SalesInvoice } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';
import CustomerComplaintModal from '@/components/CustomerComplaintModal';
import FooterCredit from '@/components/FooterCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { salesInvoicesApi } from '@/api/invoices';

const CustomerDashboard = () => {
  const { t } = useTranslation();
  const { customerId, logout } = useAuthStore();
  const navigate = useNavigate();
  const { customers, complaints, initialize } = useStore();
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [myInvoices, setMyInvoices] = useState<SalesInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await initialize();

      // Load customer invoices
      if (customerId) {
        try {
          const allInvoices = await salesInvoicesApi.getAll();
          const customerInvoices = allInvoices.filter((inv) => inv.customerId === customerId);
          setMyInvoices(customerInvoices);
        } catch (error) {
          console.error('Failed to load invoices:', error);
        } finally {
          setLoadingInvoices(false);
        }
      }
    };
    loadData();
  }, [initialize, customerId]);

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

  const getInvoiceStatusColor = (status: SalesInvoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
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

  const handleDownloadInvoice = (invoice: SalesInvoice) => {
    alert(`Downloading invoice ${invoice.invoiceNumber}. PDF generation will be implemented.`);
  };

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  if (!currentCustomer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">{t('customerDashboard.loadingCustomer')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 gradient-text">{t('customerDashboard.title')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t('customerDashboard.welcome')} {currentCustomer.name}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
            <LanguageSwitcher />
            <Button onClick={() => setIsComplaintModalOpen(true)} className="w-full sm:w-auto shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              {t('customerDashboard.addComplaint')}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
              <LogOut className="w-4 h-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>

        {/* Customer Details Card */}
        <Card className="overflow-hidden animate-slide-up">
          <div className="h-1 bg-gradient-to-r from-primary-500 to-secondary-500"></div>
          <CardHeader>
            <CardTitle className="text-xl">{t('customerDashboard.myDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-md transition-all duration-300">
                <p className="text-sm text-muted-foreground mb-2 font-medium">{t('common.name')}</p>
                <p className="font-semibold text-lg">{currentCustomer.name}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-md transition-all duration-300">
                <p className="text-sm text-muted-foreground mb-2 font-medium">{t('common.mobile')}</p>
                <p className="font-semibold text-lg">{currentCustomer.mobile}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-md transition-all duration-300">
                <p className="text-sm text-muted-foreground mb-2 font-medium">{t('customers.connectionType')}</p>
                <p className="font-semibold text-lg">{getConnectionTypeLabel(currentCustomer.connectionType)}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-yellow-50 hover:shadow-md transition-all duration-300">
                <p className="text-sm text-muted-foreground mb-2 font-medium">{t('customers.package')}</p>
                <p className="font-semibold text-lg">{currentCustomer.package || t('customers.packageN/A')}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 hover:shadow-md transition-all duration-300">
                <p className="text-sm text-muted-foreground mb-2 font-medium">{t('common.status')}</p>
                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold inline-block ${currentCustomer.status === 'Active'
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                      : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                    }`}
                >
                  {currentCustomer.status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Invoices Section */}
        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('customerDashboard.myInvoices')}
              </CardTitle>
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
                {t('customerDashboard.invoiceCount', { count: myInvoices.length })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="text-center py-8 text-muted-foreground">{t('customerDashboard.loadingInvoices')}</div>
            ) : myInvoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{t('customerDashboard.noInvoices')}</p>
                <p className="text-sm mt-2">{t('customerDashboard.noInvoicesSub')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myInvoices.map((invoice, index) => (
                  <div
                    key={invoice.id}
                    className="border-2 border-border/50 rounded-xl p-4 hover:shadow-lg hover:border-primary/30 transition-all duration-300 bg-gradient-to-br from-white to-slate-50"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-lg">{invoice.invoiceNumber}</span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getInvoiceStatusColor(
                              invoice.status
                            )}`}
                          >
                            {invoice.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('customerDashboard.plan')} </span>
                            <span className="font-medium">{invoice.planName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('customerDashboard.amount')} </span>
                            <span className="font-bold text-primary">₹{invoice.totalAmount.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('customerDashboard.issueDate')} </span>
                            <span className="font-medium">{formatDate(invoice.issueDate)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('customerDashboard.dueDate')} </span>
                            <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="w-full sm:w-auto"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t('customerDashboard.download')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Complaints Section */}
        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{t('customerDashboard.myComplaints')}</CardTitle>
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
                {t('customerDashboard.complaintCount', { count: myComplaints.length })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {myComplaints.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{t('customerDashboard.noComplaints')}</p>
                <p className="text-sm mt-2">{t('customerDashboard.noComplaintsSub')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myComplaints.map((complaint, index) => (
                  <div
                    key={complaint.id}
                    className="border-2 border-border/50 rounded-2xl p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300 bg-gradient-to-br from-white to-slate-50 animate-scale-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(
                              complaint.status
                            )}`}
                          >
                            {getStatusLabel(complaint.status)}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {t('customerDashboard.created')} {formatDate(complaint.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
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
