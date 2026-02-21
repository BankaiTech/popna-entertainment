import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Lock, User } from 'lucide-react';
import FooterCredit from '@/components/FooterCredit';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isAuthenticated, role, initialize } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    initialize();
    if (isAuthenticated) {
      // Redirect based on role
      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/admin/customers', { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate, initialize]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError(t('login.enterBoth'));
      return;
    }

    const success = login(username, password);
    if (success) {
      // Redirect based on role
      const userRole = useAuthStore.getState().role;
      if (userRole === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/admin/customers', { replace: true });
      }
    } else {
      setError(t('login.invalid'));
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
            <CardTitle className="text-2xl">{t('login.adminTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {t('login.adminSubtitle')}
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
                <label className="block text-sm font-medium mb-2">{t('login.username')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('login.placeholderUsername')}
                    className="pl-10"
                    required
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
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('login.placeholderPassword')}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {t('nav.login')}
              </Button>
              <div className="text-xs text-center text-muted-foreground mt-4">
                <p>{t('login.demoCredentials')}</p>
                <p>{t('login.demoAdmin')}</p>
                <p>{t('login.demoEmployee')}</p>
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
