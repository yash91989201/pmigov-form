import { Client } from 'minio';
import type { Readable } from 'stream';

export const BUCKET = process.env.S3_BUCKET ?? 'pmigov-forms';

const ACCESS_KEY = process.env.S3_ACCESS_KEY ?? 'pmigov';
const SECRET_KEY = process.env.S3_SECRET_KEY ?? 'pmigov-secret';
// Pinned so the client never makes a GetBucketLocation call — presigning would
// otherwise try to reach the (server-unreachable) public endpoint and fail.
const REGION = process.env.S3_REGION ?? 'us-east-1';

// Internal client — used for all server-side object I/O (put/get/stat/remove).
// In Docker this reaches MinIO over the private network (e.g. minio:9000).
export const s3 = new Client({
  endPoint: process.env.S3_ENDPOINT ?? 'localhost',
  port: Number(process.env.S3_PORT ?? 9000),
  useSSL: process.env.S3_USE_SSL === 'true',
  accessKey: ACCESS_KEY,
  secretKey: SECRET_KEY,
  region: REGION,
});

// Public client — used ONLY to sign presigned GET URLs that the browser will
// open directly. It must point at a browser-reachable endpoint (e.g.
// http://localhost:9002 in dev, or a public MinIO domain in prod), which is not
// the same host the server uses internally. Signing is pure crypto (no network
// call), so this client works even though the server can't reach the endpoint.
const s3Public = (() => {
  const publicUrl = process.env.S3_PUBLIC_ENDPOINT;
  if (!publicUrl) return s3; // Local dev where server and browser share the endpoint.
  const u = new URL(publicUrl);
  return new Client({
    endPoint: u.hostname,
    port: u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80,
    useSSL: u.protocol === 'https:',
    accessKey: ACCESS_KEY,
    secretKey: SECRET_KEY,
    region: REGION,
  });
})();

/** Signs a short-lived presigned GET URL the browser can open directly. */
export function presignGet(key: string, expirySeconds: number): Promise<string> {
  return s3Public.presignedGetObject(BUCKET, key, expirySeconds);
}

export async function ensureBucket() {
  const exists = await s3.bucketExists(BUCKET);
  if (!exists) {
    // Object Lock can ONLY be enabled at bucket creation (it also turns on
    // versioning). Existing buckets can't be retrofitted with a lock.
    await s3.makeBucket(BUCKET, REGION, { ObjectLocking: true });
  }

  // Versioning keeps prior versions of every object, so an overwritten or
  // "deleted" Aadhaar/signature image can always be recovered — tampering
  // can't destroy the original bytes. Idempotent; works on existing buckets.
  try {
    await s3.setBucketVersioning(BUCKET, { Status: 'Enabled' });
  } catch (err) {
    console.warn('Could not enable bucket versioning:', (err as Error).message);
  }

  // Default GOVERNANCE retention locks each version against permanent deletion
  // for the window below. Only valid on a lock-enabled (freshly created) bucket.
  try {
    await s3.setObjectLockConfig(BUCKET, {
      mode: 'GOVERNANCE',
      unit: 'Years',
      validity: 5,
    } as never);
  } catch {
    console.warn(
      `Object Lock is not active on "${BUCKET}" (a lock requires a freshly created bucket). ` +
        'Versioning still protects against overwrites/deletes; recreate the bucket for a hard lock.',
    );
  }
}

const DATA_URL_RE = /^data:(image\/[a-z+.-]+);base64,(.+)$/s;

/** Decodes a base64 image data URL into raw bytes + its content type. */
export function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid image data: expected a base64 image data URL');
  }
  const [, contentType, base64] = match;
  return { buffer: Buffer.from(base64, 'base64'), contentType };
}

/** Stores raw bytes as an object. Returns the object key. */
export async function putBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
  await s3.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return key;
}

/** Decodes a base64 data URL and stores it as an object. Returns the object key. */
export async function putDataUrl(key: string, dataUrl: string): Promise<string> {
  const { buffer, contentType } = decodeDataUrl(dataUrl);
  return putBuffer(key, buffer, contentType);
}

/** Reads an object fully into a buffer. */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const { stream } = await getObject(key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export async function getObject(
  key: string,
): Promise<{ stream: Readable; contentType: string; size: number }> {
  const stat = await s3.statObject(BUCKET, key);
  const stream = await s3.getObject(BUCKET, key);
  return {
    stream,
    contentType: stat.metaData?.['content-type'] ?? 'application/octet-stream',
    size: stat.size,
  };
}

export async function removeObjects(keys: (string | null)[]) {
  const present = keys.filter((k): k is string => Boolean(k));
  if (present.length > 0) {
    await s3.removeObjects(BUCKET, present);
  }
}
