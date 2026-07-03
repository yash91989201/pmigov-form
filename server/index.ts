import './env.ts';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { pool, migrate } from './db.ts';
import {
  ensureBucket,
  putBuffer,
  decodeDataUrl,
  getObject,
  removeObjects,
  presignGet,
} from './storage.ts';
import { cacheGet, cacheSet, cacheDelPrefix } from './cache.ts';
import { hashSubmission, type HashableFields } from './integrity.ts';
import { buildFormPdf, type PdfImage } from './pdf.ts';
import { checkPassword, setSessionCookie, clearSessionCookie, requireAdmin } from './auth.ts';

const PORT = Number(process.env.PORT ?? 4000);
// How long a presigned image URL stays valid. Kept short since these are
// unauthenticated bearer links to sensitive identity documents; the admin
// views the image immediately after the URL is minted.
const PRESIGN_EXPIRY = Number(process.env.PRESIGN_EXPIRY ?? 600);
// Cache presigned URLs for a bit less than their lifetime, so a URL served from
// cache always has a comfortable validity window left when the browser opens it.
const PRESIGN_CACHE_TTL = Math.max(PRESIGN_EXPIRY - 120, 60);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');

const app = express();
// Honor X-Forwarded-For so req.ip reflects the real client behind a proxy.
app.set('trust proxy', true);
// Signature + Aadhaar images arrive as base64 data URLs in the JSON body.
app.use(express.json({ limit: '30mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/admin/login', (req, res) => {
  if (!checkPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  setSessionCookie(res);
  res.json({ ok: true });
});

app.post('/api/admin/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/admin/me', requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

interface SubmitBody {
  date?: string;
  customerName?: string;
  fatherSpouseName?: string;
  address?: string;
  mobileNumber?: string;
  emailId?: string;
  serviceDescription?: string;
  amountPayable?: string;
  modeOfPayment?: string;
  transactionRef?: string;
  paymentDate?: string;
  place?: string;
  signature?: string;
  aadhaarFront?: string | null;
  aadhaarBack?: string | null;
}

const REQUIRED_FIELDS: [keyof SubmitBody, string][] = [
  ['date', 'Date'],
  ['customerName', 'Customer name'],
  ['fatherSpouseName', "Father's/Spouse's name"],
  ['address', 'Address'],
  ['mobileNumber', 'Mobile number'],
  ['emailId', 'Email ID'],
  ['serviceDescription', 'Service description'],
  ['amountPayable', 'Amount payable'],
  ['modeOfPayment', 'Mode of payment'],
  ['transactionRef', 'Transaction reference no.'],
  ['paymentDate', 'Date of payment'],
  ['place', 'Place'],
  ['signature', 'Digital signature'],
  ['aadhaarFront', 'Aadhaar card (front)'],
  ['aadhaarBack', 'Aadhaar card (back)'],
];

app.post('/api/forms', async (req, res) => {
  const body = req.body as SubmitBody;

  const missing = REQUIRED_FIELDS.filter(
    ([key]) => !String(body[key] ?? '').trim(),
  ).map(([, label]) => label);
  if (missing.length > 0) {
    return res
      .status(400)
      .json({ error: `All fields are mandatory. Missing: ${missing.join(', ')}.` });
  }

  const id = randomUUID();
  const storedKeys: string[] = [];

  try {
    // Decode once so we hash the exact bytes we store.
    const signature = decodeDataUrl(body.signature!);
    const aadhaarFront = decodeDataUrl(body.aadhaarFront!);
    const aadhaarBack = decodeDataUrl(body.aadhaarBack!);

    // The exact values that get persisted — hashed in this same shape so the
    // integrity check is reproducible from the stored row.
    const fields: HashableFields = {
      date: body.date ?? '',
      customerName: body.customerName!.trim(),
      fatherSpouseName: body.fatherSpouseName ?? '',
      address: body.address ?? '',
      mobileNumber: body.mobileNumber!.trim(),
      emailId: body.emailId ?? '',
      serviceDescription: body.serviceDescription ?? '',
      amountPayable: body.amountPayable ?? '',
      modeOfPayment: body.modeOfPayment ?? '',
      transactionRef: body.transactionRef ?? '',
      paymentDate: body.paymentDate ?? '',
      place: body.place ?? '',
    };
    const contentHash = hashSubmission(fields, {
      signature: signature.buffer,
      aadhaarFront: aadhaarFront.buffer,
      aadhaarBack: aadhaarBack.buffer,
    });

    const signatureKey = await putBuffer(`forms/${id}/signature.png`, signature.buffer, signature.contentType);
    storedKeys.push(signatureKey);

    const aadhaarFrontKey = await putBuffer(`forms/${id}/aadhaar-front`, aadhaarFront.buffer, aadhaarFront.contentType);
    storedKeys.push(aadhaarFrontKey);

    const aadhaarBackKey = await putBuffer(`forms/${id}/aadhaar-back`, aadhaarBack.buffer, aadhaarBack.contentType);
    storedKeys.push(aadhaarBackKey);

    await pool.query(
      `INSERT INTO consent_forms (
        id, date, customer_name, father_spouse_name, address, mobile_number,
        email_id, service_description, amount_payable, mode_of_payment,
        transaction_ref, payment_date, place,
        signature_key, aadhaar_front_key, aadhaar_back_key,
        content_hash, submitter_ip
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        id,
        fields.date,
        fields.customerName,
        fields.fatherSpouseName,
        fields.address,
        fields.mobileNumber,
        fields.emailId,
        fields.serviceDescription,
        fields.amountPayable,
        fields.modeOfPayment,
        fields.transactionRef,
        fields.paymentDate,
        fields.place,
        signatureKey,
        aadhaarFrontKey,
        aadhaarBackKey,
        contentHash,
        req.ip ?? null,
      ],
    );

    res.status(201).json({ id, contentHash });
  } catch (err) {
    // Don't leave orphaned images behind if the insert fails.
    await removeObjects(storedKeys).catch(() => {});
    console.error('Failed to save form:', err);
    const message = err instanceof Error ? err.message : 'Failed to save form.';
    res.status(500).json({ error: message });
  }
});

app.get('/api/forms', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, date, customer_name, mobile_number, amount_payable, submitted_at
       FROM consent_forms ORDER BY submitted_at DESC`,
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        date: r.date,
        customerName: r.customer_name,
        mobileNumber: r.mobile_number,
        amountPayable: r.amount_payable,
        submittedAt: r.submitted_at,
      })),
    );
  } catch (err) {
    console.error('Failed to list forms:', err);
    res.status(500).json({ error: 'Failed to load forms.' });
  }
});

app.get('/api/forms/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM consent_forms WHERE id = $1`, [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Form not found.' });
    }
    const r = rows[0];
    const fileUrl = (key: string | null) => (key ? `/api/files/${key}` : null);
    res.json({
      id: r.id,
      date: r.date,
      customerName: r.customer_name,
      fatherSpouseName: r.father_spouse_name,
      address: r.address,
      mobileNumber: r.mobile_number,
      emailId: r.email_id,
      serviceDescription: r.service_description,
      amountPayable: r.amount_payable,
      modeOfPayment: r.mode_of_payment,
      transactionRef: r.transaction_ref,
      paymentDate: r.payment_date,
      place: r.place,
      submittedAt: r.submitted_at,
      contentHash: r.content_hash,
      submitterIp: r.submitter_ip,
      signatureUrl: fileUrl(r.signature_key),
      aadhaarFront: fileUrl(r.aadhaar_front_key),
      aadhaarBack: fileUrl(r.aadhaar_back_key),
    });
  } catch (err) {
    console.error('Failed to load form:', err);
    res.status(500).json({ error: 'Failed to load form.' });
  }
});

async function loadImage(key: string | null): Promise<PdfImage | null> {
  if (!key) return null;
  try {
    const { stream, contentType } = await getObject(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return { buffer: Buffer.concat(chunks), contentType };
  } catch (err) {
    console.error('Failed to load image', key, err);
    return null;
  }
}

app.get('/api/forms/:id/pdf', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM consent_forms WHERE id = $1`, [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Form not found.' });
    }
    const r = rows[0];

    const [signature, aadhaarFront, aadhaarBack] = await Promise.all([
      loadImage(r.signature_key),
      loadImage(r.aadhaar_front_key),
      loadImage(r.aadhaar_back_key),
    ]);

    const doc = buildFormPdf(
      {
        date: r.date,
        customerName: r.customer_name,
        fatherSpouseName: r.father_spouse_name,
        address: r.address,
        mobileNumber: r.mobile_number,
        emailId: r.email_id,
        serviceDescription: r.service_description,
        amountPayable: r.amount_payable,
        modeOfPayment: r.mode_of_payment,
        transactionRef: r.transaction_ref,
        paymentDate: r.payment_date,
        place: r.place,
      },
      { signature, aadhaarFront, aadhaarBack },
      { contentHash: r.content_hash, submittedAt: r.submitted_at },
    );

    const safeName = (r.customer_name || 'Form').replace(/[^\w-]+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PMI_Consent_${safeName}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
});

app.delete('/api/forms/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM consent_forms WHERE id = $1
       RETURNING signature_key, aadhaar_front_key, aadhaar_back_key`,
      [req.params.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Form not found.' });
    }
    const r = rows[0];
    await removeObjects([r.signature_key, r.aadhaar_front_key, r.aadhaar_back_key]).catch(
      (err) => console.error('Failed to remove objects for form', req.params.id, err),
    );
    // Evict any cached presigned URLs for this form's objects.
    await cacheDelPrefix(`presign:forms/${req.params.id}/`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete form:', err);
    res.status(500).json({ error: 'Failed to delete form.' });
  }
});

// Admin-gated redirect to a short-lived presigned URL. The auth check happens
// here on every request; the browser then loads the bytes straight from MinIO,
// keeping large image transfers off the Node process. Presigned URLs are cached
// in Redis so repeated views don't re-sign on every request.
app.get('/api/files/*', requireAdmin, async (req, res) => {
  const key = (req.params as Record<string, string>)[0];
  // Only serve objects that belong to form submissions.
  if (!key?.startsWith('forms/') || key.includes('..')) {
    return res.status(400).json({ error: 'Invalid file key.' });
  }
  try {
    const cacheKey = `presign:${key}`;
    let url = await cacheGet(cacheKey);
    if (!url) {
      url = await presignGet(key, PRESIGN_EXPIRY);
      await cacheSet(cacheKey, url, PRESIGN_CACHE_TTL);
    }
    // Don't let the browser cache the redirect itself — the target expires.
    res.setHeader('Cache-Control', 'private, no-store');
    res.redirect(302, url);
  } catch (err) {
    console.error('Failed to presign file', key, err);
    res.status(404).json({ error: 'File not found.' });
  }
});

// Serve the built frontend (production container). In dev, Vite serves it and
// proxies /api here instead.
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Not found.' });
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

async function waitFor(name: string, fn: () => Promise<void>, attempts = 15) {
  for (let i = 1; ; i++) {
    try {
      await fn();
      return;
    } catch (err) {
      if (i === attempts) throw err;
      console.log(`Waiting for ${name} (attempt ${i}/${attempts})...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  await waitFor('postgres', migrate);
  await waitFor('minio', ensureBucket);
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
