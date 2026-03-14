import type { Appointment } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

const now = new Date().toISOString();

let appointmentsData: Appointment[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    customerId: 1,
    customerName: 'John Doe',
    customerMobile: '9876543210',
    serviceType: 'Haircut',
    staffAssigned: 'Jane',
    scheduledAt: '2026-03-10T10:00:00.000Z',
    duration: 30,
    status: 'scheduled',
    notes: 'First visit',
    createdAt: now,
  },
  {
    id: 2,
    organizationId: MOCK_ORGANIZATION_ID,
    customerId: 2,
    customerName: 'Jane Smith',
    customerMobile: '9876543211',
    serviceType: 'Consultation',
    scheduledAt: '2026-03-10T14:00:00.000Z',
    duration: 60,
    status: 'confirmed',
    createdAt: now,
  },
  {
    id: 3,
    organizationId: MOCK_ORGANIZATION_ID,
    customerId: 1,
    customerName: 'John Doe',
    customerMobile: '9876543210',
    serviceType: 'Follow-up',
    staffAssigned: 'Tech1',
    scheduledAt: '2026-03-09T09:00:00.000Z',
    duration: 45,
    status: 'completed',
    createdAt: now,
  },
];

let nextId = 4;

export const appointmentsApi = {
  getAll: async (): Promise<Appointment[]> => {
    return Promise.resolve([...appointmentsData]);
  },
  getById: async (id: number): Promise<Appointment> => {
    const item = appointmentsData.find((a) => a.id === id);
    if (!item) throw new Error('Appointment not found');
    return Promise.resolve(item);
  },
  create: async (appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
    const newAppointment: Appointment = {
      ...appointment,
      organizationId: appointment.organizationId ?? MOCK_ORGANIZATION_ID,
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
