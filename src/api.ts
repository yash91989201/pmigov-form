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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error response; keep the default message
    }
    throw new ApiError(message, res.status);
  }
  return res.json();
}

export function submitForm(payload: SubmitFormPayload): Promise<{ id: string }> {
  return request('/api/forms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function listForms(): Promise<ConsentFormSummary[]> {
  return request('/api/forms');
}

export function getForm(id: string): Promise<ConsentFormDetail> {
  return request(`/api/forms/${id}`);
}

export function deleteForm(id: string): Promise<{ ok: boolean }> {
  return request(`/api/forms/${id}`, { method: 'DELETE' });
}

export function adminLogin(password: string): Promise<{ ok: boolean }> {
  return request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

export function adminLogout(): Promise<{ ok: boolean }> {
  return request('/api/admin/logout', { method: 'POST' });
}
