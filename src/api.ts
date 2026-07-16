import axios, { type AxiosError } from 'axios';

export interface ConsentFormSummary {
  id: string;
  date: string | null;
  customerName: string;
  mobileNumber: string;
  amountPayable: string | null;
  submittedAt: string;
}

export interface ConsentFormDetail extends ConsentFormSummary {
  fatherSpouseName: string | null;
  address: string | null;
  emailId: string | null;
  serviceDescription: string | null;
  modeOfPayment: string | null;
  transactionRef: string | null;
  paymentDate: string | null;
  place: string | null;
  contentHash: string | null;
  submitterIp: string | null;
  signatureUrl: string | null;
  aadhaarFront: string | null;
  aadhaarBack: string | null;
  panCard: string | null;
  paymentProof: string | null;
}

export interface SubmitFormPayload {
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
  signature: string;
  aadhaarFront: string;
  aadhaarBack: string;
  panCard: string;
  paymentProof: string;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** API root including `/api` (e.g. https://api.consent.pmigov.com/api). */
export const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

const http = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: string }>) => {
    const status = err.response?.status ?? 0;
    const message =
      err.response?.data?.error ??
      (status ? `Request failed (${status})` : err.message || 'Network error');
    return Promise.reject(new ApiError(message, status));
  },
);

export function submitForm(payload: SubmitFormPayload): Promise<{ id: string }> {
  return http.post('/forms', payload).then((r) => r.data);
}

export function listForms(): Promise<ConsentFormSummary[]> {
  return http.get('/forms').then((r) => r.data);
}

export function getForm(id: string): Promise<ConsentFormDetail> {
  return http.get(`/forms/${id}`).then((r) => r.data);
}

export function deleteForm(id: string): Promise<{ ok: boolean }> {
  return http.delete(`/forms/${id}`).then((r) => r.data);
}

export function adminLogin(password: string): Promise<{ ok: boolean }> {
  return http.post('/admin/login', { password }).then((r) => r.data);
}

export function adminLogout(): Promise<{ ok: boolean }> {
  return http.post('/admin/logout').then((r) => r.data);
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}