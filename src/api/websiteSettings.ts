// Multi-tenant SaaS Isolation - backend will isolate by organization
// SaaS Ready - Admin Full Control: website settings configurable per organization
import type { WebsiteSettings } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

// In-memory storage for mock data (simulates backend)
let websiteSettingsData: WebsiteSettings | null = {
  id: 1,
  organizationId: MOCK_ORGANIZATION_ID,
  heroTitle: 'Welcome to BankaiTech',
  heroSubtitle: 'Cable & Internet Services',
  heroDescription: 'Choose the right plan for your home or business.',
  heroImage: undefined,
  highlightSectionTitle: 'Our Services',
  highlightCards: [
    {
      title: 'High Speed',
      description: 'Experience blazing fast internet speeds with our premium plans',
      icon: 'Zap',
    },
    {
      title: '24/7 Support',
      description: 'Our dedicated support team is available round the clock to assist you',
      icon: 'Clock',
    },
    {
      title: 'Easy Installation',
      description: 'Quick and hassle-free installation process with minimal downtime',
      icon: 'Shield',
    },
  ],
  ctaButtonText: 'Get Started',
  ctaButtonLink: '/contact',
  updatedAt: new Date().toISOString(),
};

export const websiteSettingsApi = {
  get: async (): Promise<WebsiteSettings> => {
    // Replace with real API call later
    if (!websiteSettingsData) {
      throw new Error('Website settings not found');
    }
    return Promise.resolve(websiteSettingsData);
  },
  update: async (settings: Partial<WebsiteSettings>): Promise<WebsiteSettings> => {
    // Replace with real API call later
    if (!websiteSettingsData) {
      websiteSettingsData = {
        id: 1,
        organizationId: MOCK_ORGANIZATION_ID,
        heroTitle: '',
        heroSubtitle: '',
        heroDescription: '',
        highlightSectionTitle: '',
        highlightCards: [],
        ctaButtonText: '',
        ctaButtonLink: '',
        updatedAt: new Date().toISOString(),
        ...settings,
      };
    } else {
      websiteSettingsData = {
        ...websiteSettingsData,
        ...settings,
        updatedAt: new Date().toISOString(),
      };
    }
    return Promise.resolve(websiteSettingsData);
  },
};
