import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { InfiniteCarousel } from '@/components/ui/InfiniteCarousel';
import Button from '@/components/ui/Button';
import { Wifi, Radio, Phone, Mail, MapPin, ArrowRight } from 'lucide-react';
import popnaHomeImage from '@/assets/images/popna-home.png';

const HomePage = () => {
  const { websiteSettings, products, companyProfile, fetchWebsiteSettings, fetchActiveProducts, fetchCompanyProfile } = useStore();
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchWebsiteSettings();
        await fetchActiveProducts();
        await fetchCompanyProfile();
      } catch (error) {
        console.error('Error loading homepage data:', error);
      }
    };
    loadData();
  }, [fetchWebsiteSettings, fetchActiveProducts, fetchCompanyProfile]);

  // Dynamic content from settings
  const heroTitle = websiteSettings?.heroTitle || 'Welcome to Our Service';
  const heroSubtitle = websiteSettings?.heroSubtitle || 'Cable & Internet Services';
  const heroDescription = websiteSettings?.heroDescription || 'Choose the right plan for your home or business.';
  const ctaButtonText = websiteSettings?.ctaButtonText || 'Get Started';

  // API ready — replace mock with real backend
  // Get all active products (for infinite carousel)
  // Carousel automatically adapts to number of products — template-based rendering
  const allActiveProducts = Array.isArray(products) ? products.filter((p) => p.isActive) : [];

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
    ];
    return gradients[index % gradients.length];
  };

  // Company info for contact section
  const companyPhone = companyProfile?.contactNumber || '+91 9876543210';
  const companyEmail = companyProfile?.email || 'info@bankaitech.com';
  const companyAddress = companyProfile
    ? `${companyProfile.addressLine1}${companyProfile.addressLine2 ? `, ${companyProfile.addressLine2}` : ''}, ${companyProfile.city}, ${companyProfile.state} ${companyProfile.pincode}`
    : '123 Business Street, Bangalore, Karnataka 560001';

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              {heroTitle}
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 mb-6 font-medium">
              {heroSubtitle}
            </p>
            <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              {heroDescription}
            </p>
            <a href="#services">
              <Button size="lg" className="inline-flex items-center gap-2">
                {ctaButtonText}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Services Infinite Carousel Section */}
      {allActiveProducts.length > 0 && (
        <section id="services" className="py-16 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Our Services</h2>
              <p className="text-lg text-gray-600">Explore our range of services</p>
            </div>

            {/* Infinite Carousel */}
            <div className="overflow-hidden">
              <InfiniteCarousel speed={30} pauseOnHover={true} showArrows={true}>
                {allActiveProducts.map((product, index) => {
                  const Icon = getProductIcon(product.productType);
                  const gradient = getProductGradient(index);
                  return (
                    <div 
                      key={`${product.id}-${index}`} 
                      className="w-[280px] sm:w-[300px] lg:w-[320px] h-[380px] flex-shrink-0"
                    >
                      <Link
                        to={`/plans?productName=${product.name}`}
                        className="group block h-full"
                      >
                        <Card className="hover:shadow-xl transition-all duration-300 h-full overflow-hidden hover:-translate-y-1 border border-gray-200 flex flex-col">
                          <div className={`h-2 bg-gradient-to-r ${gradient} flex-shrink-0`}></div>
                          <CardHeader className="flex-shrink-0 pb-3">
                            <div className="flex items-center justify-center mb-4 h-16">
                              <div
                                className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                              >
                                <Icon className="w-10 h-10 text-white" />
                              </div>
                            </div>
                            <CardTitle className="text-center text-xl text-gray-900 h-12 flex items-center justify-center">
                              {product.name} {product.productType === 'cable' ? 'Cable' : 'Internet'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col">
                            <CardDescription className="text-center text-sm text-gray-600 line-clamp-3 mb-4 flex-shrink-0 min-h-[60px]">
                              View plans and pricing for {product.name}. Choose the perfect plan for your needs.
                            </CardDescription>
                            <div className="mt-auto pt-4 text-center">
                              <span className="text-primary font-medium group-hover:underline">View Plans →</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  );
                })}
              </InfiniteCarousel>
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: About Text */}
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">About Us</h2>
              <p className="text-lg text-gray-600 mb-4">
                We are a leading provider of cable and internet services, committed to delivering reliable and
                high-speed connectivity to homes and businesses.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                With years of experience in the industry, we offer flexible plans tailored to meet your needs,
                backed by exceptional customer support and cutting-edge technology.
              </p>
              <a href="#services">
                <Button variant="outline" className="inline-flex items-center gap-2">
                  Explore Our Services
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
            
            {/* Right: Image (Desktop) / Top (Mobile) */}
            <div className="order-1 lg:order-2">
              <div className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <img
                  src={popnaHomeImage}
                  alt="Popna Entertainment Home"
                  className="w-full h-auto object-cover aspect-[4/3]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Get In Touch</h2>
            <p className="text-lg text-gray-600">We're here to help you with all your connectivity needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600">{companyPhone}</p>
            </div>

            <div className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">{companyEmail}</p>
            </div>

            <div className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Address</h3>
              <p className="text-gray-600 text-sm">{companyAddress}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
