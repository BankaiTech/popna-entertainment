import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Wifi, Radio, Globe, Satellite, Zap, Shield, Clock, Package, Building2 } from 'lucide-react';

const iconMap: Record<string, any> = {
  Zap,
  Clock,
  Shield,
  Wifi,
  Radio,
  Globe,
  Satellite,
  Package,
  Building2,
};

const HomePage = () => {
  const { websiteSettings, products, fetchWebsiteSettings, fetchActiveProducts, loading } = useStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchWebsiteSettings();
        await fetchActiveProducts();
      } catch (error) {
        console.error('Error loading homepage data:', error);
      }
    };
    loadData();
  }, [fetchWebsiteSettings, fetchActiveProducts]);

  // Always render content - use fallbacks if data not loaded yet
  // Components will show mock data or defaults if API hasn't loaded

  // Multi-tenant ready — all content from settings
  const heroTitle = websiteSettings?.heroTitle || 'Welcome to Our Service';
  const heroSubtitle = websiteSettings?.heroSubtitle || 'Cable & Internet Services';
  const heroDescription = websiteSettings?.heroDescription || 'Choose the right plan for your home or business.';
  const highlightSectionTitle = websiteSettings?.highlightSectionTitle || 'Our Services';
  const highlightCards = websiteSettings?.highlightCards || [];

  // Dynamic product grouping - Multi-tenant ready (with safety checks)
  const cableProducts = Array.isArray(products) ? products.filter((p) => p.productType === 'cable' && p.isActive) : [];
  const internetProducts = Array.isArray(products) ? products.filter((p) => p.productType === 'internet' && p.isActive) : [];

  const getProductIcon = (productType: string) => {
    return productType === 'cable' ? Radio : Wifi;
  };

  const getProductGradient = (index: number) => {
    const gradients = [
      'from-blue-500 to-cyan-500',
      'from-orange-500 to-red-500',
      'from-green-500 to-emerald-500',
      'from-purple-500 to-pink-500',
      'from-indigo-500 to-blue-500',
      'from-pink-500 to-rose-500',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      {/* Hero Section - Dynamic from Settings */}
      <div className="text-center mb-8 sm:mb-16 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 gradient-text text-foreground">
          {heroTitle}
        </h1>
        <p className="text-xl sm:text-2xl text-gray-700 mb-4 sm:mb-8 font-medium">
          {heroSubtitle}
        </p>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          {heroDescription}
        </p>
      </div>

      {/* Cable Services - Dynamic from Products */}
      {cableProducts.length > 0 && (
        <section className="mb-10 sm:mb-16 animate-slide-up">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
            Cable Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {cableProducts.map((product, index) => {
              const Icon = getProductIcon(product.productType);
              const gradient = getProductGradient(index);
              return (
                <Link key={product.id} to={`/cable/${product.name.toLowerCase()}`} className="group">
                  <Card className="hover:shadow-xl transition-all duration-300 h-full overflow-hidden hover:-translate-y-1">
                    <div className={`h-2 bg-gradient-to-r ${gradient}`}></div>
                    <CardHeader>
                      <div className="flex items-center justify-center mb-4">
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      <CardTitle className="text-center text-xl">{product.name} Cable</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center text-base">
                        View plans and pricing for {product.name}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Internet Services - Dynamic from Products */}
      {internetProducts.length > 0 && (
        <section className="mb-8 sm:mb-16 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-secondary-500 to-secondary-600 rounded-full"></div>
            Internet Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {internetProducts.map((product, index) => {
              const Icon = getProductIcon(product.productType);
              const gradient = getProductGradient(index + cableProducts.length);
              return (
                <Link key={product.id} to={`/internet/${product.name.toLowerCase()}`} className="group" style={{ animationDelay: `${0.1 + index * 0.1}s` }}>
                  <Card className="hover:shadow-xl transition-all duration-300 h-full overflow-hidden hover:-translate-y-1">
                    <div className={`h-2 bg-gradient-to-r ${gradient}`}></div>
                    <CardHeader>
                      <div className="flex items-center justify-center mb-4">
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      <CardTitle className="text-center text-xl">{product.name} Internet</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center text-base">
                        View plans and pricing for {product.name}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Highlight Cards - Dynamic from Settings */}
      {highlightCards.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 text-center">
            {highlightSectionTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlightCards.map((card, index) => {
              const Icon = iconMap[card.icon] || Zap;
              const gradients = [
                { border: 'from-blue-500 to-cyan-500', bg: 'from-blue-500 to-cyan-500' },
                { border: 'from-green-500 to-emerald-500', bg: 'from-green-500 to-emerald-500' },
                { border: 'from-purple-500 to-pink-500', bg: 'from-purple-500 to-pink-500' },
              ];
              const gradient = gradients[index % gradients.length];
              
              return (
                <Card key={index} className="overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className={`h-1 bg-gradient-to-r ${gradient.border}`}></div>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient.bg} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {card.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback message when no content */}
      {cableProducts.length === 0 && internetProducts.length === 0 && highlightCards.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No services available at the moment. Please check back later.</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
