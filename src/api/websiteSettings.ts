// Multi-tenant SaaS Isolation - backend will isolate by organization
import type { WebsiteSettings } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { endpoints } from './endpoints';

let websiteSettingsData: WebsiteSettings | null = {
  id: 1,
  organizationId: MOCK_ORGANIZATION_ID,
  heroTitle: 'Welcome to BankaiTech',
  heroSubtitle: 'Cable & Internet Services',
  heroDescription: 'Choose the right plan for your home or business.',
  heroImage: undefined,
  highlightSectionTitle: 'Our Services',
  highlightCards: [
    { title: 'High Speed', description: 'Experience blazing fast internet speeds with our premium plans', icon: 'Zap' },
    { title: '24/7 Support', description: 'Our dedicated support team is available round the clock to assist you', icon: 'Clock' },
    { title: 'Easy Installation', description: 'Quick and hassle-free installation process with minimal downtime', icon: 'Shield' },
  ],
  ctaButtonText: 'Get Started',
  ctaButtonLink: '/contact',
  updatedAt: new Date().toISOString(),
};

function mapWebsiteSettings(raw: Record<string, unknown>): WebsiteSettings {
  return toCamelCase<WebsiteSettings>(raw);
}

export const websiteSettingsApi = {
  get: async (): Promise<WebsiteSettings> => {
    if (isMockMode()) {
      if (!websiteSettingsData) throw new Error('Website settings not found');
      return Promise.resolve(websiteSettingsData);
    }
    const response = await apiClient.get(endpoints.settingsWebsite);
    return mapWebsiteSettings(unwrapApiData<Record<string, unknown>>(response));
  },
  update: async (settings: Partial<WebsiteSettings>): Promise<WebsiteSettings> => {
    if (isMockMode()) {
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
    }
    const response = await apiClient.patch(endpoints.settingsWebsite, toSnakeCase(settings as Record<string, unknown>));
    return mapWebsiteSettings(unwrapApiData<Record<string, unknown>>(response));
  },
};
