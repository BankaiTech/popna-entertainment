import type { Appointment } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useAuthStore } from '@/store/useAuthStore';
import { getIndustryAppointments } from './industryMockData';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const now = new Date().toISOString();

// ISP appointments (org_001) – kept for backward compat
const ispAppointments: Appointment[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, customerId: 1, customerName: 'Rajesh Kumar', customerMobile: '9876543210', serviceType: 'Site Survey', staffAssigned: 'Tech1', scheduledAt: '2026-03-18T10:00:00.000Z', duration: 30, status: 'scheduled', notes: 'New connection survey', createdAt: now },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, customerId: 2, customerName: 'Naresh', customerMobile: '9876543211', serviceType: 'Router Installation', scheduledAt: '2026-03-18T14:00:00.000Z', duration: 60, status: 'confirmed', createdAt: now },
  { id: 3, organizationId: MOCK_ORGANIZATION_ID, customerId: 1, customerName: 'Rajesh Kumar', customerMobile: '9876543210', serviceType: 'Follow-up', staffAssigned: 'Tech1', scheduledAt: '2026-03-17T09:00:00.000Z', duration: 45, status: 'completed', createdAt: now },
];

let appointmentsData: Appointment[] = [...ispAppointments, ...getIndustryAppointments()];
let nextId = Math.max(0, ...appointmentsData.map((a) => a.id)) + 1;

export const appointmentsApi = {
  getAll: async (): Promise<Appointment[]> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve(appointmentsData.filter((a) => a.organizationId === orgId));
  },
  getById: async (id: number): Promise<Appointment> => {
    const item = appointmentsData.find((a) => a.id === id);
    if (!item) throw new Error('Appointment not found');
    return Promise.resolve(item);
  },
  create: async (appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
    const newAppointment: Appointment = {
      ...appointment,
      organizationId: appointment.organizationId ?? getCurrentOrgId(),
      id: nextId++,
      createdAt: new Date().toISOString(),
    };
    appointmentsData.push(newAppointment);
    return Promise.resolve(newAppointment);
  },
  update: async (id: number, appointment: Partial<Appointment>): Promise<Appointment> => {
    const index = appointmentsData.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Appointment not found');
    appointmentsData[index] = { ...appointmentsData[index], ...appointment };
    return Promise.resolve(appointmentsData[index]);
  },
  delete: async (id: number): Promise<void> => {
    const index = appointmentsData.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Appointment not found');
    appointmentsData.splice(index, 1);
    return Promise.resolve();
  },
};
