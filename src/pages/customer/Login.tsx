import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { User } from 'lucide-react';
import FooterCredit from '@/components/FooterCredit';

const CustomerLogin = () => {
  const { t } = useTranslation();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { customerLogin } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!mobile.trim()) {
      setError(t('login.enterMobile'));
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      setError(t('login.validMobile'));
      return;
    }

    if (!password.trim()) {
      setError(t('login.enterPassword'));
      return;
    }

    setIsLoading(true);

    try {
      // Replace with secure auth & hashing later
      const result = await customerLogin(mobile, password);

      if (result.success) {
        navigate('/customer/dashboard');
      } else {
        setError(result.message || t('login.invalidCredentials'));
      }
    } catch (err) {
      setError(t('login.errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <User className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">{t('login.customerTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {t('login.customerSubtitle')}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('login.mobileNumber')} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder={t('login.placeholderMobile')}
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setError('');
                  }}
                  className="text-lg"
                  maxLength={10}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('login.registeredMobile')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('login.password')} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="text-lg"
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('login.loggingIn') : t('nav.login')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <footer className="shrink-0 py-3 px-4 border-t border-border">
        <FooterCredit />
      </footer>
    </div>
  );
};

export default CustomerLogin;
