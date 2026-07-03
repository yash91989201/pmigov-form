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
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const http = axios.create({
  baseURL: '/api',
  withCredentials: true, // send the admin session cookie
  headers: { 'Content-Type': 'application/json' },
});

// Normalize every axios failure into an ApiError, preferring the server's
// `{ error }` message, so callers can keep checking `err.status`.
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
