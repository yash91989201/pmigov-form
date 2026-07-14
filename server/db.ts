import { Pool } from 'pg';

const OWNER_URL =
  process.env.DATABASE_URL ?? 'postgres://pmigov:pmigov@localhost:5432/pmigov';
// Least-privilege role the request handlers connect as. Created during migrate.
const APP_DB_USER = process.env.APP_DB_USER ?? 'pmigov_app';
const APP_DB_PASSWORD = process.env.APP_DB_PASSWORD ?? 'pmigov-app-secret';

function deriveAppUrl(ownerUrl: string): string {
  const u = new URL(ownerUrl);
  u.username = APP_DB_USER;
  u.password = APP_DB_PASSWORD;
  return u.toString();
}

// Owner connection — used ONLY for migrations (DDL, role/grant setup).
export const adminPool = new Pool({ connectionString: OWNER_URL });

// The pool the request handlers use. It authenticates as a role that can
// SELECT/INSERT/DELETE but NOT UPDATE, so a submitted record's fields can never
// be silently edited through the app. Lazy — first connects after migrate() has
// created the role.
export const pool = new Pool({ connectionString: deriveAppUrl(OWNER_URL) });

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
    pan_card_key TEXT,
    content_hash TEXT,
    submitter_ip TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS consent_forms_submitted_at_idx
    ON consent_forms (submitted_at DESC);
  ALTER TABLE consent_forms ADD COLUMN IF NOT EXISTS content_hash TEXT;
  ALTER TABLE consent_forms ADD COLUMN IF NOT EXISTS submitter_ip TEXT;
  ALTER TABLE consent_forms ADD COLUMN IF NOT EXISTS pan_card_key TEXT;

  -- Append-only change log: records every UPDATE/DELETE on consent_forms with
  -- the old/new row, the DB role that did it, and when.
  CREATE TABLE IF NOT EXISTS consent_forms_audit (
    audit_id BIGSERIAL PRIMARY KEY,
    form_id UUID,
    action TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    old_row JSONB,
    new_row JSONB
  );

  -- SECURITY DEFINER so the log is written with the owner's rights regardless
  -- of which (limited) role triggered the change, and can't be bypassed.
  CREATE OR REPLACE FUNCTION consent_forms_audit_fn() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER AS $fn$
  BEGIN
    INSERT INTO consent_forms_audit (form_id, action, changed_by, old_row, new_row)
    VALUES (
      COALESCE(OLD.id, NEW.id),
      TG_OP,
      -- session_user, not current_user: inside a SECURITY DEFINER function
      -- current_user is the owner, so we'd lose the real actor's identity.
      session_user,
      to_jsonb(OLD),
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    RETURN COALESCE(NEW, OLD);
  END;
  $fn$;

  DROP TRIGGER IF EXISTS consent_forms_audit_trg ON consent_forms;
  CREATE TRIGGER consent_forms_audit_trg
    AFTER UPDATE OR DELETE ON consent_forms
    FOR EACH ROW EXECUTE FUNCTION consent_forms_audit_fn();
`;

/** SQL that provisions the least-privilege app role and its grants. */
function grantsSql(dbName: string): string {
  const escPw = APP_DB_PASSWORD.replace(/'/g, "''");
  return `
    DO $do$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_DB_USER}') THEN
        CREATE ROLE ${APP_DB_USER} LOGIN PASSWORD '${escPw}';
      ELSE
        ALTER ROLE ${APP_DB_USER} WITH LOGIN PASSWORD '${escPw}';
      END IF;
    END
    $do$;
    GRANT CONNECT ON DATABASE "${dbName}" TO ${APP_DB_USER};
    GRANT USAGE ON SCHEMA public TO ${APP_DB_USER};
    -- Deliberately NO UPDATE and NO access to the audit table.
    REVOKE ALL ON consent_forms FROM ${APP_DB_USER};
    GRANT SELECT, INSERT, DELETE ON consent_forms TO ${APP_DB_USER};
    REVOKE ALL ON consent_forms_audit FROM ${APP_DB_USER};
  `;
}

export async function migrate() {
  await adminPool.query(SCHEMA);
  const dbName = new URL(OWNER_URL).pathname.replace(/^\//, '') || 'pmigov';
  await adminPool.query(grantsSql(dbName));
}
