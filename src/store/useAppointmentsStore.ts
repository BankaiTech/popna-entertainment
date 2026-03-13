import { create } from 'zustand';
import type { Appointment, AppointmentStatus } from '@/models/types';
import { appointmentsApi } from '@/api/appointments';

interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  fetchAppointments: () => Promise<void>;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<void>;
  updateAppointment: (id: number, data: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: number) => Promise<void>;
  updateStatus: (id: number, status: AppointmentStatus) => Promise<void>;
}

export const useAppointmentsStore = create<AppointmentState>((set) => ({
  appointments: [],
  loading: false,
  error: null,

  fetchAppointments: async () => {
    set({ loading: true, error: null });
    try {
      const appointments = await appointmentsApi.getAll();
      set({ appointments, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addAppointment: async (appointment) => {
    set({ loading: true, error: null });
    try {
      await appointmentsApi.create(appointment);
      const appointments = await appointmentsApi.getAll();
      set({ appointments, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateAppointment: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await appointmentsApi.update(id, data);
      const appointments = await appointmentsApi.getAll();
      set({ appointments, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  deleteAppointment: async (id) => {
    set({ loading: true, error: null });
    try {
      await appointmentsApi.delete(id);
      const appointments = await appointmentsApi.getAll();
      set({ appointments, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      await appointmentsApi.updateStatus(id, status);
      const appointments = await appointmentsApi.getAll();
      set({ appointments, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));

