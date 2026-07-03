import { Pool } from 'pg';

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://pmigov:pmigov@localhost:5432/pmigov',
});

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS consent_forms (
    id UUID PRIMARY KEY,
    date TEXT,
    customer_name TEXT NOT NULL,
    father_spouse_name TEXT,
    address TEXT,
    mobile_number TEXT NOT NULL,
    email_id TEXT,
    service_description TEXT,
    amount_payable TEXT,
    mode_of_payment TEXT,
    transaction_ref TEXT,
    payment_date TEXT,
    place TEXT,
    signature_key TEXT,
    aadhaar_front_key TEXT,
    aadhaar_back_key TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS consent_forms_submitted_at_idx
    ON consent_forms (submitted_at DESC);
`;

export async function migrate() {
  await pool.query(SCHEMA);
}
