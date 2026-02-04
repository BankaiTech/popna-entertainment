import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Wifi, Zap, Globe, Satellite } from 'lucide-react';

const HomePage = () => {
  const providers = [
    { name: 'GTPL Cable Network', path: '/gtpl', icon: Wifi, color: 'text-blue-600' },
    { name: 'BSNL', path: '/bsnl', icon: Zap, color: 'text-orange-600' },
    { name: 'Railwire', path: '/railwire', icon: Globe, color: 'text-green-600' },
    { name: 'Krishiinet', path: '/krishiinet', icon: Satellite, color: 'text-purple-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      {/* Hero Section */}
      <div className="text-center mb-8 sm:mb-16">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
          Welcome to BankaiTech
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-4 sm:mb-8">
          Your trusted Internet Service Provider
        </p>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          Choose from our range of high-speed internet connections powered by leading providers.
          Fast, reliable, and affordable internet solutions for your home and business.
        </p>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-16">
        {providers.map((provider) => {
          const Icon = provider.icon;
          return (
            <Link key={provider.name} to={provider.path}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-center mb-4">
                    <Icon className={`w-12 h-12 ${provider.color}`} />
                  </div>
                  <CardTitle className="text-center">{provider.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    View plans and pricing for {provider.name} connections
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>High Speed</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Experience blazing fast internet speeds with our premium plans
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>24/7 Support</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Our dedicated support team is available round the clock to assist you
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Easy Installation</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Quick and hassle-free installation process with minimal downtime
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
