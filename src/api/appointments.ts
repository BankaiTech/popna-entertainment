import type { Appointment, AppointmentStatus } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

const today = new Date();

const getDateTime = (offsetMinutes: number) => {
  const d = new Date(today);
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return d.toISOString();
};

let appointmentsData: Appointment[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    customerId: 1,
    customerName: 'Rajesh Kumar',
    customerMobile: '9876543210',
    serviceType: 'Broadband installation',
    staffAssigned: 'Technician A',
    scheduledAt: getDateTime(60),
    duration: 60,
    status: 'scheduled',
    notes: 'New broadband installation at customer premises.',
    createdAt: getDateTime(-60),
  },
  {
    id: 2,
    organizationId: MOCK_ORGANIZATION_ID,
    customerId: 2,
    customerName: 'Naresh',
    customerMobile: '9876543211',
    serviceType: 'Plan upgrade consultation',
    staffAssigned: 'Sales Exec 1',
    scheduledAt: getDateTime(180),
    duration: 30,
    status: 'confirmed',
    notes: 'Discuss fiber plan upgrade options.',
    createdAt: getDateTime(-120),
  },
];

let nextId = 3;

export const appointmentsApi = {
  getAll: async (): Promise<Appointment[]> => Promise.resolve([...appointmentsData]),

  getById: async (id: number): Promise<Appointment> => {
    const appt = appointmentsData.find((a) => a.id === id);
    if (!appt) throw new Error('Appointment not found');
    return appt;
  },

  create: async (
    appointment: Omit<Appointment, 'id' | 'createdAt'>
  ): Promise<Appointment> => {
    const newAppointment: Appointment = {
      ...appointment,
      organizationId: appointment.organizationId ?? MOCK_ORGANIZATION_ID,
      id: nextId++,
      createdAt: new Date().toISOString(),
    };
    appointmentsData.push(newAppointment);
    return newAppointment;
  },

  update: async (
    id: number,
    data: Partial<Appointment>
  ): Promise<Appointment> => {
    const idx = appointmentsData.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Appointment not found');
    appointmentsData[idx] = { ...appointmentsData[idx], ...data };
    return appointmentsData[idx];
  },

  updateStatus: async (
    id: number,
    status: AppointmentStatus
  ): Promise<Appointment> => {
    return appointmentsApi.update(id, { status });
  },

  delete: async (id: number): Promise<void> => {
    appointmentsData = appointmentsData.filter((a) => a.id !== id);
    return Promise.resolve();
  },
};

