import { create } from 'zustand';
import type { Appointment } from '@/models/types';
import { appointmentsApi } from '@/api/appointments';
import { asyncOnce } from '@/lib/asyncOnce';

const APPT_LIST_KEY = 'appointments:list';

interface AppointmentsState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  fetchAppointments: () => Promise<void>;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<void>;
  updateAppointment: (id: number, appointment: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: number) => Promise<void>;
}

export const useAppointmentsStore = create<AppointmentsState>((set) => ({
  appointments: [],
  loading: false,
  error: null,

  fetchAppointments: async () => {
    return asyncOnce(APPT_LIST_KEY, async () => {
      set({ loading: true, error: null });
      try {
        const appointments = await appointmentsApi.getAll();
        set({ appointments, loading: false });
      } catch (e) {
        set({ error: (e as Error).message, loading: false });
      }
    });
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

  updateAppointment: async (id, appointment) => {
    set({ loading: true, error: null });
    try {
      await appointmentsApi.update(id, appointment);
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
}));
