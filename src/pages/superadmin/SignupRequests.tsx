import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { UserPlus, Trash2, Mail, Phone, Briefcase, Building2 } from 'lucide-react';
import { signupRequestsApi, type SignupRequest } from '@/api/signupRequests';
import { useAuthStore } from '@/store/useAuthStore';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const SignupRequests = () => {
  const { t } = useTranslation();
  const { hasSAPermission } = useAuthStore();
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!hasSAPermission('sa_signup_requests')) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  const loadData = async () => {
    setLoading(true);
    const data = await signupRequestsApi.getAll();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: number) => {
    const deleted = await signupRequestsApi.delete(id);
    if (deleted) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showSuccess(t('superadminDashboard.signupDeleted', 'Signup request removed'));
    } else {
      showError(t('superadminDashboard.signupDeleteFailed', 'Failed to remove signup request'));
    }
  };

  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return requests.slice(start, start + itemsPerPage);
  }, [requests, currentPage]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {t('signupRequests.title', 'Signup Requests')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('signupRequests.subtitle', 'View and manage business signup requests')}
          </p>
        </div>
        <Card className="px-4 py-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase font-semibold">{t('common.total', 'Total')}</span>
          <span className="text-lg font-bold text-foreground"><AnimatedCounter value={requests.length} duration={1000} /></span>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">{t('common.loading', 'Loading...')}</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {t('signupRequests.noRequests', 'No signup requests yet.')}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t('signup.name', 'Name')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t('signup.mobile', 'Mobile')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t('signup.email', 'Email')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t('signup.businessType', 'Business Type')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t('signup.businessName', 'Business Name')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t('common.date', 'Date')}</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.map((req, idx) => (
                      <tr key={req.id} className={cn('border-b border-border hover:bg-muted/20 transition-colors', idx % 2 === 0 ? 'bg-card' : 'bg-muted/5')}>
                        <td className="px-3 py-2 text-sm font-medium text-foreground">{req.name}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{req.mobile}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{req.email}</td>
                        <td className="px-3 py-2 text-sm">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-violet-50 text-violet-700 border-violet-200">
                            {req.businessType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{req.businessName}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(req.createdAt)}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => handleDelete(req.id)} className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={t('common.delete', 'Delete')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-3">
                {paginatedRequests.map((req) => (
                  <div key={req.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{req.name}</p>
                      <button onClick={() => handleDelete(req.id)} className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="w-3 h-3" /> {req.mobile}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="w-3 h-3" /> {req.email}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Briefcase className="w-3 h-3" />
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-violet-50 text-violet-700 border-violet-200">{req.businessType}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="w-3 h-3" /> {req.businessName}</div>
                    <p className="text-[10px] text-muted-foreground">{formatDate(req.createdAt)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
        {requests.length > itemsPerPage && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={requests.length} />
        )}
      </Card>
    </div>
  );
};

export default SignupRequests;
