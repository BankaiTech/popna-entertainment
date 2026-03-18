import { create } from 'zustand';
import { smsTemplatesApi } from '@/api/smsTemplates';
import type { SmsTemplate, SmsApiConfig, SmsLanguage } from '@/models/types';

interface SmsTemplatesState {
  templates: SmsTemplate[];
  apiConfig: SmsApiConfig | null;
  loading: boolean;
  fetchTemplates: () => Promise<void>;
  saveTemplate: (template: SmsTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  resetToDefault: (language: SmsLanguage) => Promise<void>;
  fetchApiConfig: () => Promise<void>;
  saveApiConfig: (config: Omit<SmsApiConfig, 'organizationId'>) => Promise<void>;
}

export const useSmsTemplatesStore = create<SmsTemplatesState>((set) => ({
  templates: [],
  apiConfig: null,
  loading: false,

  fetchTemplates: async () => {
    set({ loading: true });
    try {
      const templates = await smsTemplatesApi.getAll();
      set({ templates, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  saveTemplate: async (template) => {
    const saved = await smsTemplatesApi.save(template);
    set((state) => {
      const idx = state.templates.findIndex((t) => t.id === saved.id);
      if (idx >= 0) {
        const next = [...state.templates];
        next[idx] = saved;
        return { templates: next };
      }
      return { templates: [...state.templates, saved] };
    });
  },

  deleteTemplate: async (id) => {
    await smsTemplatesApi.delete(id);
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
  },

  resetToDefault: async (language) => {
    const def = await smsTemplatesApi.resetToDefault(language);
    set((state) => {
      const idx = state.templates.findIndex((t) => t.language === language && t.isDefault);
      if (idx >= 0) {
        const next = [...state.templates];
        next[idx] = def;
        return { templates: next };
      }
      return { templates: [...state.templates, def] };
    });
  },

  fetchApiConfig: async () => {
    const apiConfig = await smsTemplatesApi.getApiConfig();
    set({ apiConfig });
  },

  saveApiConfig: async (config) => {
    const saved = await smsTemplatesApi.saveApiConfig(config);
    set({ apiConfig: saved });
  },
}));
