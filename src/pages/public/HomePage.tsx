import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Wifi, Radio, Globe, Satellite, Zap, Shield, Clock } from 'lucide-react';

const HomePage = () => {
  const cableService = {
    name: 'GTPL Cable',
    path: '/cable/gtpl',
    icon: Radio,
    color: 'text-blue-600',
    bgGradient: 'from-blue-500 to-cyan-500',
    description: 'Cable broadband — plans and pricing for GTPL Cable (do not mix with internet providers).',
  };
  const internetServices = [
    { name: 'BSNL Internet', path: '/internet/bsnl', icon: Wifi, color: 'text-orange-600', bgGradient: 'from-orange-500 to-red-500' },
    { name: 'Railwire Internet', path: '/internet/railwire', icon: Globe, color: 'text-green-600', bgGradient: 'from-green-500 to-emerald-500' },
    { name: 'Krishiinet Internet', path: '/internet/krishiinet', icon: Satellite, color: 'text-purple-600', bgGradient: 'from-purple-500 to-pink-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="text-center mb-8 sm:mb-16 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 gradient-text">
          Welcome to BankaiTech
        </h1>
        <p className="text-xl sm:text-2xl text-gray-700 mb-4 sm:mb-8 font-medium">
          Cable &amp; Internet Services
        </p>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          Cable services and internet connections from trusted providers. Choose the right plan for your home or business.
        </p>
      </div>

      {/* Cable Service — GTPL only; separate from Internet */}
      <section className="mb-10 sm:mb-16 animate-slide-up">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <div className="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
          Cable Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Link to={cableService.path} className="group">
            <Card className="hover:shadow-xl transition-all duration-300 h-full overflow-hidden hover:-translate-y-1">
              <div className={`h-2 bg-gradient-to-r ${cableService.bgGradient}`}></div>
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${cableService.bgGradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <cableService.icon className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-center text-xl">{cableService.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  {cableService.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Internet Services — BSNL, Railwire, Krishiinet; do NOT mix with GTPL */}
      <section className="mb-8 sm:mb-16 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <div className="w-1 h-8 bg-gradient-to-b from-secondary-500 to-secondary-600 rounded-full"></div>
          Internet Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {internetServices.map((provider, index) => {
            const Icon = provider.icon;
            return (
              <Link key={provider.name} to={provider.path} className="group" style={{ animationDelay: `${0.1 + index * 0.1}s` }}>
                <Card className="hover:shadow-xl transition-all duration-300 h-full overflow-hidden hover:-translate-y-1">
                  <div className={`h-2 bg-gradient-to-r ${provider.bgGradient}`}></div>
                  <CardHeader>
                    <div className="flex items-center justify-center mb-4">
                      <div className={`p-4 rounded-2xl bg-gradient-to-br ${provider.bgGradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-center text-xl">{provider.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-base">
                      View plans and pricing for {provider.name}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-lg">High Speed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Experience blazing fast internet speeds with our premium plans
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-md group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-lg">24/7 Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Our dedicated support team is available round the clock to assist you
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-md group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-lg">Easy Installation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Quick and hassle-free installation process with minimal downtime
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
