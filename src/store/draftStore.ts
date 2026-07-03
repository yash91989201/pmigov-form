import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface DraftFormData {
  date: string;
  customerName: string;
  fatherSpouseName: string;
  address: string;
  mobileNumber: string;
  emailId: string;
  serviceDescription: string;
  amountPayable: string;
  modeOfPayment: string;
  transactionRef: string;
  paymentDate: string;
  place: string;
  signatureUrl: string | null;
  agreed: boolean;
}

const EMPTY_FORM: DraftFormData = {
  date: '',
  customerName: '',
  fatherSpouseName: '',
  address: '',
  mobileNumber: '',
  emailId: '',
  serviceDescription: '',
  amountPayable: '',
  modeOfPayment: 'Cash',
  transactionRef: '',
  paymentDate: '',
  place: '',
  signatureUrl: null,
  agreed: false,
};

interface DraftState {
  formData: DraftFormData;
  aadhaarFront: string | null;
  aadhaarBack: string | null;
  setField: (patch: Partial<DraftFormData>) => void;
  setAadhaar: (side: 'front' | 'back', value: string | null) => void;
  reset: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      formData: EMPTY_FORM,
      aadhaarFront: null,
      aadhaarBack: null,
      setField: (patch) => set((s) => ({ formData: { ...s.formData, ...patch } })),
      setAadhaar: (side, value) =>
        set(side === 'front' ? { aadhaarFront: value } : { aadhaarBack: value }),
      reset: () => set({ formData: EMPTY_FORM, aadhaarFront: null, aadhaarBack: null }),
    }),
    {
      name: 'pmigov-consent-draft',
      storage: createJSONStorage(() => localStorage),
      // Only persist the data — actions are recreated on load.
      partialize: (s) => ({
        formData: s.formData,
        aadhaarFront: s.aadhaarFront,
        aadhaarBack: s.aadhaarBack,
      }),
    },
  ),
);

/** True when the current draft has any user-entered content worth restoring. */
export function isDraftDirty(state: Pick<DraftState, 'formData' | 'aadhaarFront' | 'aadhaarBack'>): boolean {
  if (state.aadhaarFront || state.aadhaarBack) return true;
  return (Object.keys(state.formData) as (keyof DraftFormData)[]).some((key) => {
    const value = state.formData[key];
    if (key === 'modeOfPayment') return value !== 'Cash';
    if (key === 'agreed') return value === true;
    return value !== '' && value !== null;
  });
}
