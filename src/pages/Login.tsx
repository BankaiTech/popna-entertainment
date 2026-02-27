import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Lock, User } from 'lucide-react';
import FooterCredit from '@/components/FooterCredit';

/**
 * Single login page: username + password.
 * Tries admin/employee/superadmin first; if that fails, tries customer (username as mobile).
 * Redirects to the appropriate dashboard based on role.
 */
const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, customerLogin, isAuthenticated, role, initialize } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated || !role) return;
    if (role === 'customer') {
      navigate('/customer/dashboard', { replace: true });
      return;
    }
    if (role === 'superadmin') {
      navigate('/superadmin/organizations', { replace: true });
      return;
    }
    if (role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    navigate('/admin/customers', { replace: true });
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError(t('login.enterBoth'));
      return;
    }

    setIsLoading(true);

    // 1) Try admin/employee/superadmin login
    const adminSuccess = login(username.trim(), password);
    if (adminSuccess) {
      const userRole = useAuthStore.getState().role;
      setIsLoading(false);
      if (userRole === 'customer') {
        navigate('/customer/dashboard', { replace: true });
      } else if (userRole === 'superadmin') {
        navigate('/superadmin/organizations', { replace: true });
      } else if (userRole === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/admin/customers', { replace: true });
      }
      return;
    }

    // 2) Try customer login (username can be mobile number)
    try {
      const result = await customerLogin(username.trim(), password);
      if (result.success) {
        navigate('/customer/dashboard', { replace: true });
      } else {
        setError(result.message || t('login.invalid'));
      }
    } catch {
      setError(t('login.errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('login.title', 'Login')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {t('login.subtitle', 'Enter your username and password. You will be directed to the right dashboard.')}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">{t('login.usernameOrMobile', 'Username or mobile')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    placeholder={t('login.placeholderUsername')}
                    className="pl-10"
                    required
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('login.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder={t('login.placeholderPassword')}
                    className="pl-10"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('login.loggingIn') : t('nav.login')}
              </Button>
              <div className="text-xs text-center text-muted-foreground mt-4">
                <p>{t('login.demoCredentials')}</p>
                <p>{t('login.demoAdmin')}</p>
                <p>{t('login.demoEmployee')}</p>
                <p>{t('login.demoCustomer', 'Customer: use your 10-digit mobile and password')}</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <footer className="shrink-0 py-3 px-4 border-t border-border bg-card">
        <FooterCredit />
      </footer>
    </div>
  );
};

export default Login;
