import type { Appointment } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { activitiesResource } from '@/api/resources';
import { useMockApi } from '@/lib/http';
import { useAuthStore } from '@/store/useAuthStore';
import { getIndustryAppointments } from './industryMockData';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const now = new Date().toISOString();

const ispAppointments: Appointment[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, customerId: 1, customerName: 'Rajesh Kumar', customerMobile: '9876543210', serviceType: 'Site Survey', staffAssigned: 'Tech1', scheduledAt: '2026-03-18T10:00:00.000Z', duration: 30, status: 'scheduled', notes: 'New connection survey', createdAt: now },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, customerId: 2, customerName: 'Naresh', customerMobile: '9876543211', serviceType: 'Router Installation', scheduledAt: '2026-03-18T14:00:00.000Z', duration: 60, status: 'confirmed', createdAt: now },
  { id: 3, organizationId: MOCK_ORGANIZATION_ID, customerId: 1, customerName: 'Rajesh Kumar', customerMobile: '9876543210', serviceType: 'Follow-up', staffAssigned: 'Tech1', scheduledAt: '2026-03-17T09:00:00.000Z', duration: 45, status: 'completed', createdAt: now },
];

let appointmentsData: Appointment[] = [...ispAppointments, ...getIndustryAppointments()];
let nextId = Math.max(0, ...appointmentsData.map((a) => a.id)) + 1;

export const appointmentsApi = {
  getAll: async (): Promise<Appointment[]> => {
    if (useMockApi()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(appointmentsData.filter((a) => a.organizationId === orgId));
    }
    return activitiesResource.list<Appointment>('appointment');
  },
  getById: async (id: number): Promise<Appointment> => {
    if (useMockApi()) {
      const item = appointmentsData.find((a) => a.id === id);
      if (!item) throw new Error('Appointment not found');
      return Promise.resolve(item);
    }
    return activitiesResource.get<Appointment>(id);
  },
  create: async (appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
    if (useMockApi()) {
      const newAppointment: Appointment = {
        ...appointment,
        organizationId: appointment.organizationId ?? getCurrentOrgId(),
        id: nextId++,
        createdAt: new Date().toISOString(),
      };
      appointmentsData.push(newAppointment);
      return Promise.resolve(newAppointment);
    }
    return activitiesResource.create<Appointment>({ kind: 'appointment', ...appointment });
  },
  update: async (id: number, appointment: Partial<Appointment>): Promise<Appointment> => {
    if (useMockApi()) {
      const index = appointmentsData.findIndex((a) => a.id === id);
      if (index === -1) throw new Error('Appointment not found');
      appointmentsData[index] = { ...appointmentsData[index], ...appointment };
      return Promise.resolve(appointmentsData[index]);
    }
    return activitiesResource.update<Appointment>(id, { ...appointment });
  },
  delete: async (id: number): Promise<void> => {
    if (useMockApi()) {
      const index = appointmentsData.findIndex((a) => a.id === id);
      if (index === -1) throw new Error('Appointment not found');
      appointmentsData.splice(index, 1);
      return Promise.resolve();
    }
    await activitiesResource.remove(id);
  },
};
