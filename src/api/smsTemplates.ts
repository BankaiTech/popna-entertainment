import type { SmsTemplate, SmsApiConfig, SmsLanguage } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useAuthStore } from '@/store/useAuthStore';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const EN_DEFAULT = `Dear Customer {#var#},

{#var#}

Thank you for your continued support.

Regards,
{#var#}`;

const TA_DEFAULT = `அன்புள்ள வாடிக்கையாளர் {#var#},

{#var#}

உங்கள் தொடர்ந்து வழங்கும் ஆதரவிற்கு நன்றி.

அன்புடன்,
{#var#}`;

function makeDefaultTemplates(orgId: string): SmsTemplate[] {
  const now = new Date().toISOString();
  const langs: Array<{ lang: SmsLanguage; content: string }> = [
    { lang: 'en', content: EN_DEFAULT },
    { lang: 'hi', content: EN_DEFAULT },
    { lang: 'ta', content: TA_DEFAULT },
    { lang: 'te', content: EN_DEFAULT },
    { lang: 'kn', content: EN_DEFAULT },
    { lang: 'ml', content: EN_DEFAULT },
  ];
  return langs.map(({ lang, content }) => ({
    id: `${orgId}-default-${lang}`,
    organizationId: orgId,
    name: 'Payment Reminder',
    language: lang,
    content,
    variableHints: 'Customer Name, Message, Business Name',
    isDefault: true,
    updatedAt: now,
  }));
}

// In-memory store: templates keyed by orgId
const templateStore: Map<string, SmsTemplate[]> = new Map();
const apiConfigStore: Map<string, SmsApiConfig> = new Map();

function getOrgTemplates(orgId: string): SmsTemplate[] {
  if (!templateStore.has(orgId)) {
    templateStore.set(orgId, makeDefaultTemplates(orgId));
  }
  return templateStore.get(orgId)!;
}

export const smsTemplatesApi = {
  getAll: async (): Promise<SmsTemplate[]> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve([...getOrgTemplates(orgId)]);
  },
  save: async (template: SmsTemplate): Promise<SmsTemplate> => {
    const orgId = getCurrentOrgId();
    const list = getOrgTemplates(orgId);
    const idx = list.findIndex((t) => t.id === template.id);
    const updated = { ...template, organizationId: orgId, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    templateStore.set(orgId, list);
    return Promise.resolve(updated);
  },
  delete: async (id: string): Promise<void> => {
    const orgId = getCurrentOrgId();
    const list = getOrgTemplates(orgId).filter((t) => t.id !== id);
    templateStore.set(orgId, list);
    return Promise.resolve();
  },
  resetToDefault: async (language: SmsLanguage): Promise<SmsTemplate> => {
    const orgId = getCurrentOrgId();
    const defaults = makeDefaultTemplates(orgId);
    const def = defaults.find((t) => t.language === language)!;
    const list = getOrgTemplates(orgId);
    const idx = list.findIndex((t) => t.language === language && t.isDefault);
    if (idx >= 0) {
      list[idx] = def;
    } else {
      list.push(def);
    }
    templateStore.set(orgId, list);
    return Promise.resolve(def);
  },
  getApiConfig: async (): Promise<SmsApiConfig | null> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve(apiConfigStore.get(orgId) ?? null);
  },
  saveApiConfig: async (config: Omit<SmsApiConfig, 'organizationId'>): Promise<SmsApiConfig> => {
    const orgId = getCurrentOrgId();
    const saved: SmsApiConfig = { ...config, organizationId: orgId };
    apiConfigStore.set(orgId, saved);
    return Promise.resolve(saved);
  },
};
