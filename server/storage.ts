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
  if (!(await s3.bucketExists(BUCKET))) {
    await s3.makeBucket(BUCKET);
  }
}

const DATA_URL_RE = /^data:(image\/[a-z+.-]+);base64,(.+)$/s;

/** Decodes a base64 data URL and stores it as an object. Returns the object key. */
export async function putDataUrl(key: string, dataUrl: string): Promise<string> {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid image data: expected a base64 image data URL');
  }
  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  await s3.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return key;
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
