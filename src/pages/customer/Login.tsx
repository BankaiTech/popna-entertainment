import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { User } from 'lucide-react';

const CustomerLogin = () => {
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
      setError('Please enter your mobile number');
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    // Replace with secure auth & hashing later
    const result = customerLogin(mobile, password);

    setIsLoading(false);

    if (result.success) {
      navigate('/customer/dashboard');
    } else {
      setError(result.message || 'Invalid mobile number or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <User className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Customer Login</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Enter your mobile number and password to access your account
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Mobile Number <span className="text-destructive">*</span>
              </label>
              <Input
                type="tel"
                placeholder="9876543210"
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
              <p className="text-xs text-muted-foreground mt-1">
                Enter your registered 10-digit mobile number
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Password <span className="text-destructive">*</span>
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
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerLogin;
