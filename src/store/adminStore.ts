import { create } from 'zustand';
import {
  listForms,
  deleteForm,
  adminLogin,
  adminLogout,
  getForm,
  ApiError,
  type ConsentFormSummary,
  type ConsentFormDetail,
} from '../api';

interface AdminState {
  forms: ConsentFormSummary[];
  authed: boolean;
  loading: boolean;
  error: string | null;
  /** Cache of fetched form details, so View → Back → View doesn't refetch. */
  formCache: Record<string, ConsentFormDetail>;

  fetchForms: () => Promise<void>;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  loadForm: (id: string) => Promise<ConsentFormDetail>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  forms: [],
  authed: false,
  loading: true,
  error: null,
  formCache: {},

  fetchForms: async () => {
    set({ loading: true });
    try {
      const forms = await listForms();
      set({ forms, authed: true, error: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set({ authed: false, error: null });
      } else {
        console.error(err);
        set({ error: 'Failed to load forms. Check the server or network.' });
      }
    } finally {
      set({ loading: false });
    }
  },

  login: async (password: string) => {
    // Throws on failure so the login form can surface the message.
    await adminLogin(password);
    await get().fetchForms();
  },

  logout: async () => {
    try {
      await adminLogout();
    } catch (err) {
      console.error(err);
    }
    set({ authed: false, forms: [], formCache: {} });
  },

  remove: async (id: string) => {
    await deleteForm(id);
    set((s) => {
      const formCache = { ...s.formCache };
      delete formCache[id];
      return { forms: s.forms.filter((f) => f.id !== id), formCache };
    });
  },

  loadForm: async (id: string) => {
    const cached = get().formCache[id];
    if (cached) return cached;
    const data = await getForm(id); // Throws ApiError — caller handles 401, etc.
    set((s) => ({ formCache: { ...s.formCache, [id]: data } }));
    return data;
  },
}));
