// Multi-tenant SaaS Isolation - backend will isolate by organization
import type { CompanyProfile } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { apiGetOne, apiPatch } from '@/api/resources';
import { useMockApi } from '@/lib/http';

// In-memory storage for mock data (simulates backend)
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

export const companyProfileApi = {
  get: async (): Promise<CompanyProfile> => {
    if (useMockApi()) {
      if (!companyProfileData) {
        throw new Error('Company profile not found');
      }
      return Promise.resolve(companyProfileData);
    }
    return apiGetOne<CompanyProfile>('/settings');
  },
  update: async (profile: Partial<CompanyProfile>): Promise<CompanyProfile> => {
    if (useMockApi()) {
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
    return apiPatch<CompanyProfile>('/settings', profile);
  },
};
