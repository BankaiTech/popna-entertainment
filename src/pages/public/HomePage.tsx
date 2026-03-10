import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import Button from '@/components/ui/Button';
import {
  ShoppingCart, FileText, Package, Users, MessageSquare, Building2,
  Globe, Cloud, BarChart3, Shield, ArrowRight, Phone, Mail, MapPin,
} from 'lucide-react';

/* ── Feature & benefit definitions ── */
const features = [
  { icon: ShoppingCart, titleKey: 'home.features.pos', descKey: 'home.features.posDesc', gradient: 'from-blue-500 to-cyan-500' },
  { icon: FileText, titleKey: 'home.features.invoicing', descKey: 'home.features.invoicingDesc', gradient: 'from-orange-500 to-red-500' },
  { icon: Package, titleKey: 'home.features.inventory', descKey: 'home.features.inventoryDesc', gradient: 'from-green-500 to-emerald-500' },
  { icon: Users, titleKey: 'home.features.contacts', descKey: 'home.features.contactsDesc', gradient: 'from-purple-500 to-pink-500' },
  { icon: MessageSquare, titleKey: 'home.features.complaints', descKey: 'home.features.complaintsDesc', gradient: 'from-amber-500 to-orange-500' },
  { icon: Building2, titleKey: 'home.features.branches', descKey: 'home.features.branchesDesc', gradient: 'from-indigo-500 to-blue-500' },
];

const benefits = [
  { icon: Globe, titleKey: 'home.benefits.multiLang', descKey: 'home.benefits.multiLangDesc', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { icon: Cloud, titleKey: 'home.benefits.cloud', descKey: 'home.benefits.cloudDesc', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  { icon: BarChart3, titleKey: 'home.benefits.analytics', descKey: 'home.benefits.analyticsDesc', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { icon: Shield, titleKey: 'home.benefits.secure', descKey: 'home.benefits.secureDesc', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
];

/* ── Scroll-triggered fade-in hook ── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    // Observe all direct children that have the reveal class
    el.querySelectorAll('.scroll-reveal').forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}

const HomePage = () => {
  const { t } = useTranslation();
  const { companyProfile, fetchActiveProducts, fetchCompanyProfile } = useStore();
  const featuresRef = useScrollReveal();
  const benefitsRef = useScrollReveal();

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchActiveProducts();
        await fetchCompanyProfile();
      } catch (error) {
        console.error('Error loading homepage data:', error);
      }
    };
    loadData();
  }, [fetchActiveProducts, fetchCompanyProfile]);

  const companyPhone = companyProfile?.contactNumber || '';
  const companyEmail = companyProfile?.email || '';
  const companyAddress = companyProfile
    ? `${companyProfile.addressLine1}${companyProfile.addressLine2 ? `, ${companyProfile.addressLine2}` : ''}, ${companyProfile.city}, ${companyProfile.state} ${companyProfile.pincode}`
    : '';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* ════ Hero Section ════ */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 dark:from-blue-900 dark:via-purple-900 dark:to-indigo-950">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400/5 rounded-full blur-3xl animate-float" />
        </div>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />

        <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight animate-fade-in-up">
            {t('home.hero.defaultTitle')}
          </h1>
          <p className="text-lg sm:text-xl text-white/80 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {t('home.hero.defaultSubtitle')}
          </p>
          <p className="text-base text-white/60 mb-8 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {t('home.hero.defaultDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/login">
              <Button size="lg" className="bg-white !text-blue-700 hover:bg-gray-100 dark:bg-white dark:!text-blue-700 dark:hover:bg-gray-200 inline-flex items-center gap-2 w-full sm:w-auto justify-center">
                {t('home.hero.cta')}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border-white/30 !text-white hover:bg-white/10 dark:border-white/30 dark:!text-white dark:hover:bg-white/10 w-full sm:w-auto justify-center">
                {t('home.hero.learnMore', 'Learn More')}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ════ Features Section ════ */}
      <section id="features" className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={featuresRef}>
          <div className="text-center mb-16 scroll-reveal opacity-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t('home.features.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.titleKey}
                  className="scroll-reveal opacity-0 group p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl dark:hover:shadow-black/30 hover:-translate-y-1 transition-all duration-300"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t(feature.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════ Why Choose Us / Benefits ════ */}
      <section id="about" className="py-16 sm:py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={benefitsRef}>
          <div className="text-center mb-16 scroll-reveal opacity-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t('home.benefits.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('home.benefits.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.titleKey}
                  className="scroll-reveal opacity-0 text-center p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className={`w-14 h-14 ${benefit.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`w-7 h-7 ${benefit.color}`} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    {t(benefit.titleKey)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t(benefit.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════ CTA Banner ════ */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-300/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            {t('home.cta.title')}
          </h2>
          <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
            {t('home.cta.subtitle')}
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-white !text-blue-700 hover:bg-gray-100 dark:bg-white dark:!text-blue-700 dark:hover:bg-gray-200 inline-flex items-center gap-2">
              {t('home.cta.button')}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ════ Contact Section ════ */}
      <section id="contact" className="py-16 sm:py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">{t('home.contact.title')}</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">{t('home.contact.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('home.contact.phone')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{companyPhone}</p>
            </div>

            <div className="text-center p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('home.contact.email')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{companyEmail}</p>
            </div>

            <div className="text-center p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('home.contact.address')}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{companyAddress}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
