// Multi-tenant SaaS Isolation - backend will isolate by organization
import type { CompanyProfile } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { endpoints } from './endpoints';

let companyProfileData: CompanyProfile | null = {
  id: 1,
  organizationId: MOCK_ORGANIZATION_ID,
  companyName: 'BankaiTech',
  gstin: '29ABCDE1234F1Z5',
  addressLine1: '123 Business Street',
  addressLine2: 'Suite 100',
  city: 'Bangalore',
  state: 'Karnataka',
  country: 'India',
  pincode: '560001',
  contactNumber: '+91 9876543210',
  email: 'contact@Popna.com',
  updatedAt: new Date().toISOString(),
};

function mapCompanyProfile(raw: Record<string, unknown>): CompanyProfile {
  const p = toCamelCase<Record<string, unknown>>(raw);
  return {
    id: Number(p.id ?? 1),
    organizationId: String(p.organizationId ?? MOCK_ORGANIZATION_ID),
    companyName: String(p.companyName ?? ''),
    gstin: String(p.gstin ?? ''),
    addressLine1: String(p.addressLine1 ?? ''),
    addressLine2: p.addressLine2 != null ? String(p.addressLine2) : undefined,
    city: String(p.city ?? ''),
    state: String(p.state ?? ''),
    country: String(p.country ?? 'India'),
    pincode: String(p.pincode ?? ''),
    contactNumber: String(p.contactNumber ?? ''),
    email: String(p.email ?? ''),
    updatedAt: String(p.updatedAt ?? new Date().toISOString()),
  };
}

export const companyProfileApi = {
  get: async (): Promise<CompanyProfile> => {
    if (isMockMode()) {
      if (!companyProfileData) throw new Error('Company profile not found');
      return Promise.resolve(companyProfileData);
    }
    const response = await apiClient.get(endpoints.settings);
    return mapCompanyProfile(unwrapApiData<Record<string, unknown>>(response));
  },
  update: async (profile: Partial<CompanyProfile>): Promise<CompanyProfile> => {
    if (isMockMode()) {
      if (!companyProfileData) {
        companyProfileData = {
          id: 1,
          organizationId: MOCK_ORGANIZATION_ID,
          companyName: '',
          gstin: '',
          addressLine1: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
          contactNumber: '',
          email: '',
          updatedAt: new Date().toISOString(),
          ...profile,
        };
      } else {
        companyProfileData = {
          ...companyProfileData,
          ...profile,
          updatedAt: new Date().toISOString(),
        };
      }
      return Promise.resolve(companyProfileData);
    }
    const response = await apiClient.patch(endpoints.settings, toSnakeCase(profile as Record<string, unknown>));
    return mapCompanyProfile(unwrapApiData<Record<string, unknown>>(response));
  },
};
