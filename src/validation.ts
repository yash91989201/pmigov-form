import type { DraftFormData } from './store/draftStore';

export type FieldErrors = Partial<Record<string, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Name: starts with a letter, then letters/spaces/dots/hyphens/apostrophes.
const NAME_RE = /^[A-Za-z][A-Za-z\s.'-]*$/;

const isBlank = (v: unknown) => !String(v ?? '').trim();

export interface Country {
  name: string;
  dial: string; // e.g. '+91'
  flag: string; // emoji
  /** Valid national-number digit lengths; omit for a generic 6–14 check. */
  nsn?: number[];
}

// Curated list (India first as the default), covering common NRI destinations.
export const COUNTRIES: Country[] = [
  { name: 'India', dial: '+91', flag: '🇮🇳', nsn: [10] },
  { name: 'United States', dial: '+1', flag: '🇺🇸', nsn: [10] },
  { name: 'United Kingdom', dial: '+44', flag: '🇬🇧', nsn: [10] },
  { name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪', nsn: [9] },
  { name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦', nsn: [9] },
  { name: 'Qatar', dial: '+974', flag: '🇶🇦', nsn: [8] },
  { name: 'Kuwait', dial: '+965', flag: '🇰🇼', nsn: [8] },
  { name: 'Oman', dial: '+968', flag: '🇴🇲', nsn: [8] },
  { name: 'Singapore', dial: '+65', flag: '🇸🇬', nsn: [8] },
  { name: 'Malaysia', dial: '+60', flag: '🇲🇾', nsn: [9, 10] },
  { name: 'Australia', dial: '+61', flag: '🇦🇺', nsn: [9] },
  { name: 'Canada', dial: '+1', flag: '🇨🇦', nsn: [10] },
  { name: 'Nepal', dial: '+977', flag: '🇳🇵', nsn: [10] },
  { name: 'Bangladesh', dial: '+880', flag: '🇧🇩', nsn: [10] },
  { name: 'Pakistan', dial: '+92', flag: '🇵🇰', nsn: [10] },
  { name: 'Sri Lanka', dial: '+94', flag: '🇱🇰', nsn: [9] },
  { name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { name: 'France', dial: '+33', flag: '🇫🇷', nsn: [9] },
  { name: 'Other', dial: '+', flag: '🌐' },
];

export const DEFAULT_DIAL = '+91';

/** Normalizes an Indian mobile to its 10 significant digits (drops +91 / 0 / spaces). */
export function normalizeMobile(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

/** Validates a national mobile number against the selected country's rules. */
export function validateMobile(dial: string, national: string): string | null {
  if (isBlank(national)) return 'Mobile number is required.';
  const country = COUNTRIES.find((c) => c.dial === dial);
  // India: strict — 10 digits starting 6-9 (tolerant of a pasted +91/0 prefix).
  if (dial === '+91') {
    return /^[6-9]\d{9}$/.test(normalizeMobile(national))
      ? null
      : 'Enter a valid 10-digit Indian mobile number.';
  }
  const digits = national.replace(/\D/g, '');
  if (country?.nsn && !country.nsn.includes(digits.length)) {
    return `Enter a valid ${country.name} mobile number.`;
  }
  if (digits.length < 6 || digits.length > 14) return 'Enter a valid mobile number.';
  return null;
}

/** True if a YYYY-MM-DD date string is after today (local). */
function isFutureDate(value: string): boolean {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d.getTime() > today.getTime();
}

/**
 * Validates the whole form and returns a map of field name -> error message.
 * An empty object means the form is valid. Field names match the input `name`
 * attributes (plus `aadhaarFront`, `aadhaarBack`, `paymentProof`, `signature`, `agreed`).
 */
export function validateForm(
  data: DraftFormData,
  aadhaarFront: string | null,
  aadhaarBack: string | null,
  panCard: string | null,
  paymentProof: string | null,
): FieldErrors {
  const e: FieldErrors = {};

  if (isBlank(data.date)) e.date = 'Date is required.';
  else if (isFutureDate(data.date)) e.date = 'Date cannot be in the future.';

  if (isBlank(data.customerName)) e.customerName = 'Customer name is required.';
  else if (data.customerName.trim().length < 2) e.customerName = 'Enter the full name.';
  else if (!NAME_RE.test(data.customerName.trim())) e.customerName = 'Name should contain letters only.';

  if (isBlank(data.fatherSpouseName)) e.fatherSpouseName = "Father's/Spouse's name is required.";
  else if (!NAME_RE.test(data.fatherSpouseName.trim())) e.fatherSpouseName = 'Name should contain letters only.';

  if (isBlank(data.address)) e.address = 'Address is required.';
  else if (data.address.trim().length < 5) e.address = 'Enter the complete address.';

  const mobileErr = validateMobile(data.countryCode ?? DEFAULT_DIAL, data.mobileNumber);
  if (mobileErr) e.mobileNumber = mobileErr;

  if (isBlank(data.emailId)) e.emailId = 'Email ID is required.';
  else if (!EMAIL_RE.test(data.emailId.trim())) e.emailId = 'Enter a valid email address.';

  if (isBlank(data.serviceDescription)) e.serviceDescription = 'Certification is required.';

  if (isBlank(data.amountPayable)) e.amountPayable = 'Amount payable is required.';
  else {
    const n = Number(data.amountPayable);
    if (!Number.isFinite(n) || n <= 0) e.amountPayable = 'Enter an amount greater than 0.';
    else if (n > 10_000_000) e.amountPayable = 'Amount looks too large — please check.';
  }

  if (isBlank(data.modeOfPayment)) e.modeOfPayment = 'Select a mode of payment.';

  if (isBlank(data.transactionRef)) e.transactionRef = 'Transaction reference no. is required.';

  if (isBlank(data.paymentDate)) e.paymentDate = 'Date of payment is required.';
  else if (isFutureDate(data.paymentDate)) e.paymentDate = 'Payment date cannot be in the future.';

  if (isBlank(data.place)) e.place = 'Place is required.';
  else if (data.place.trim().length < 2) e.place = 'Enter a valid place.';

  if (!aadhaarFront) e.aadhaarFront = 'Upload the front of the Aadhaar card.';
  if (!aadhaarBack) e.aadhaarBack = 'Upload the back of the Aadhaar card.';
  if (!panCard) e.panCard = 'Upload the PAN card.';
  if (!paymentProof) e.paymentProof = 'Upload payment proof.';
  if (!data.signatureUrl) e.signature = 'Your signature is required.';
  if (!data.agreed) e.agreed = 'You must agree to the declaration to proceed.';

  return e;
}

// Order used to focus/scroll to the first invalid field on submit.
export const FIELD_ORDER = [
  'date',
  'customerName',
  'fatherSpouseName',
  'address',
  'mobileNumber',
  'emailId',
  'aadhaarFront',
  'aadhaarBack',
  'panCard',
  'serviceDescription',
  'amountPayable',
  'modeOfPayment',
  'transactionRef',
  'paymentDate',
  'paymentProof',
  'place',
  'signature',
  'agreed',
];
