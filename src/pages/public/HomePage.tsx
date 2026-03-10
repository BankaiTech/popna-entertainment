import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import Button from '@/components/ui/Button';
import {
  ShoppingCart, FileText, Package, Users, MessageSquare, Building2,
  Globe, Cloud, BarChart3, Shield, ArrowRight, Mail,
  Zap, Star, CheckCircle2,
} from 'lucide-react';

/* ── Feature & benefit definitions (no colors - monochrome) ── */
const features = [
  { icon: ShoppingCart, titleKey: 'home.features.pos', descKey: 'home.features.posDesc' },
  { icon: FileText, titleKey: 'home.features.invoicing', descKey: 'home.features.invoicingDesc' },
  { icon: Package, titleKey: 'home.features.inventory', descKey: 'home.features.inventoryDesc' },
  { icon: Users, titleKey: 'home.features.contacts', descKey: 'home.features.contactsDesc' },
  { icon: MessageSquare, titleKey: 'home.features.complaints', descKey: 'home.features.complaintsDesc' },
  { icon: Building2, titleKey: 'home.features.branches', descKey: 'home.features.branchesDesc' },
];

const benefits = [
  { icon: Globe, titleKey: 'home.benefits.multiLang', descKey: 'home.benefits.multiLangDesc' },
  { icon: Cloud, titleKey: 'home.benefits.cloud', descKey: 'home.benefits.cloudDesc' },
  { icon: BarChart3, titleKey: 'home.benefits.analytics', descKey: 'home.benefits.analyticsDesc' },
  { icon: Shield, titleKey: 'home.benefits.secure', descKey: 'home.benefits.secureDesc' },
];

/* ── Scroll-triggered reveal hook ── */
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
      { threshold: 0.08 }
    );
    el.querySelectorAll('.scroll-reveal').forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}

const HomePage = () => {
  const { t } = useTranslation();
  const { fetchActiveProducts, fetchCompanyProfile } = useStore();
  const featuresRef = useScrollReveal();
  const benefitsRef = useScrollReveal();
  const contactRef = useScrollReveal();

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

  const stats = [
    { value: '6', label: t('home.stats.languages', '6 Languages') },
    { value: '100%', label: t('home.stats.cloud', 'Cloud-Based') },
    { value: 'GST', label: t('home.stats.gst', 'GST Ready') },
    { value: '24/7', label: t('home.stats.support', 'Always On') },
  ];

  return (
    /* Root: white in light, true-black in dark */
    <div className="min-h-screen bg-white ">

      {/* ════ Hero - black background both modes ════ */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-black">
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Soft white radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-white/4 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          {/* Badge pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-white/85 text-xs sm:text-sm font-medium mb-6 sm:mb-8 animate-fade-in-up">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70 shrink-0" />
            <span className="truncate max-w-[240px] sm:max-w-none">
              {t('home.hero.badge', 'Complete Business Management Platform')}
            </span>
          </div>

          <h1
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-4 sm:mb-6 leading-[1.07] tracking-tight animate-fade-in-up"
            style={{ animationDelay: '0.05s' }}
          >
            {t('home.hero.defaultTitle')}
          </h1>

          <p
            className="text-lg sm:text-2xl text-white/70 mb-3 sm:mb-4 font-light animate-fade-in-up"
            style={{ animationDelay: '0.12s' }}
          >
            {t('home.hero.defaultSubtitle')}
          </p>

          <p
            className="text-sm sm:text-lg text-white/45 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '0.18s' }}
          >
            {t('home.hero.defaultDescription')}
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in-up px-2 sm:px-0"
            style={{ animationDelay: '0.24s' }}
          >
            <Link to="/login" className="w-full sm:w-auto flex justify-center">
              <Button
                size="lg"
                className="bg-white !text-black hover:bg-gray-100 shadow-xl shadow-black/40 inline-flex items-center gap-2 w-full sm:w-[200px] h-[52px] justify-center font-bold px-8 text-base"
              >
                {t('home.hero.cta')}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto flex justify-center">
              <span className="inline-flex items-center justify-center w-full sm:w-[200px] h-[52px] gap-2 px-8 text-base font-semibold rounded-lg border-2 border-white/60 text-white hover:bg-white/10 transition-all duration-200 cursor-pointer">
                {t('home.hero.learnMore', 'Learn More')}
              </span>
            </a>
          </div>

          {/* Stats row */}
          <div
            className="mt-10 sm:mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1 px-3 sm:px-4 py-3 rounded-2xl bg-white/6 border border-white/10"
              >
                <span className="text-xl sm:text-3xl font-extrabold text-white">{stat.value}</span>
                <span className="text-xs text-white/50 text-center leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider - fills gap between hero black and features white/dark */}
        <div className="absolute bottom-0 left-0 right-0 leading-none">
          <svg
            viewBox="0 0 1440 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full block text-white translate-y-[1px]"
            preserveAspectRatio="none"
          >
            <path d="M0 60L1440 60L1440 30C1080 60 360 0 0 30L0 60Z" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* ════ Features Section ════ */}
      <section id="features" className="py-16 sm:py-28 bg-white ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={featuresRef}>
          <div className="text-center mb-10 sm:mb-16 scroll-reveal opacity-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 text-black text-xs font-semibold uppercase tracking-wider mb-4 border border-black/10 ">
              <Star className="w-3.5 h-3.5" />
              {t('home.features.title')}
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-black mb-4 tracking-tight">
              {t('home.features.title')}
            </h2>
            <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.titleKey}
                  className="scroll-reveal opacity-0 group relative p-5 sm:p-7 bg-gray-50 rounded-2xl border border-gray-200 hover:bg-white :bg-white/8 hover:shadow-xl :shadow-black/60 hover:border-black/20 :border-white/20 hover:-translate-y-1 transition-all duration-300 cursor-default overflow-hidden"
                  style={{ animationDelay: `${idx * 0.07}s` }}
                >
                  {/* Hover top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-black opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-black flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white " />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-black mb-2">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {t(feature.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════ Benefits / Why Choose Us ════ */}
      <section id="benefits" className="py-16 sm:py-28 bg-gray-50 ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={benefitsRef}>
          <div className="text-center mb-10 sm:mb-16 scroll-reveal opacity-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 text-black text-xs font-semibold uppercase tracking-wider mb-4 border border-black/10 ">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('home.benefits.title')}
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-black mb-4 tracking-tight">
              {t('home.benefits.title')}
            </h2>
            <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">
              {t('home.benefits.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.titleKey}
                  className="scroll-reveal opacity-0 group text-center p-5 sm:p-7 rounded-2xl bg-white border border-gray-200 hover:shadow-lg :shadow-black/40 hover:border-black/20 :border-white/20 transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white " />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-black mb-1 sm:mb-2">
                    {t(benefit.titleKey)}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    {t(benefit.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════ CTA Banner ════ */}
      <section className="py-16 sm:py-24 relative overflow-hidden bg-black">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 sm:mb-5 tracking-tight">
            {t('home.cta.title')}
          </h2>
          <p className="text-base sm:text-xl text-white/60 mb-8 sm:mb-10 max-w-xl mx-auto">
            {t('home.cta.subtitle')}
          </p>
          <Link to="/login">
            <Button
              size="lg"
              className="bg-white !text-black hover:bg-gray-100 shadow-2xl shadow-black/40 inline-flex items-center gap-2 px-8 py-3 text-base font-bold"
            >
              {t('home.cta.button')}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ════ About & Contact Section ════ */}
      <section id="about" className="py-16 sm:py-24 bg-white ">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" ref={contactRef}>
          <div className="scroll-reveal opacity-0">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black mb-6 tracking-tight">
              {t('home.about.heading', 'About Popna')}
            </h2>
            <p className="text-lg sm:text-2xl text-gray-700 font-medium mb-12">
              {t('home.about.description', 'Popna is an application software designed to take your business to the next level.')}
            </p>

            <div className="inline-flex flex-col items-center w-full max-w-md p-8 sm:p-12 rounded-3xl bg-gray-50 border border-gray-200 shadow-xl shadow-gray-200/50 group hover:border-black/20 :border-white/20 transition-all duration-300">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Mail className="w-8 h-8 text-white " />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-black mb-3">
                {t('home.contact.getInTouch', 'Get in Touch')}
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-6 text-center max-w-sm">
                {t('home.contact.emailPrompt', 'Have questions or need support? Drop us an email and we\'ll get back to you.')}
              </p>
              <a
                href="mailto:bankai.tech12@gmail.com"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-black text-white hover:bg-gray-800 :bg-gray-100 font-semibold transition-colors text-sm sm:text-base"
              >
                bankai.tech12@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
