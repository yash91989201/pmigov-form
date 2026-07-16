import { createHash } from 'crypto';

// The exact field values that get hashed, in a fixed order. Both the submit
// handler (from the request) and the verify endpoint (from the DB row) build
// this same shape so the hash is reproducible.
export interface HashableFields {
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
}

const FIELD_ORDER: (keyof HashableFields)[] = [
  'date',
  'customerName',
  'fatherSpouseName',
  'address',
  'mobileNumber',
  'emailId',
  'serviceDescription',
  'amountPayable',
  'modeOfPayment',
  'transactionRef',
  'paymentDate',
  'place',
];

/**
 * Computes a tamper-evidence digest binding the form fields to the exact image
 * bytes (signature + both Aadhaar sides). Any later change to a field OR an
 * image produces a different hash, so the stored record can be proven intact.
 *
 * Versioned prefix + length-prefixed segments avoid ambiguity between fields.
 */
export function hashSubmission(
  fields: HashableFields,
  images: { signature: Buffer; aadhaarFront: Buffer; aadhaarBack: Buffer; panCard: Buffer; paymentProof: Buffer },
): string {
  const h = createHash('sha256');
  h.update('pmigov-consent-v3\n');
  for (const key of FIELD_ORDER) {
    const value = fields[key] ?? '';
    h.update(`${key}:${Buffer.byteLength(value)}:`);
    h.update(value);
    h.update('\n');
  }
  for (const [name, buf] of [
    ['signature', images.signature],
    ['aadhaarFront', images.aadhaarFront],
    ['aadhaarBack', images.aadhaarBack],
    ['panCard', images.panCard],
    ['paymentProof', images.paymentProof],
  ] as const) {
    h.update(`${name}:${buf.length}:`);
    h.update(buf);
  }
  return h.digest('hex');
}
