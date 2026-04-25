import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { config } from '../config'

function buildClient(): S3Client {
  return new S3Client({
    region: config.STORAGE_REGION,
    // Only set endpoint for local MinIO — omit for real AWS S3
    ...(config.STORAGE_ENDPOINT ? { endpoint: config.STORAGE_ENDPOINT } : {}),
    forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId:     config.STORAGE_ACCESS_KEY,
      secretAccessKey: config.STORAGE_SECRET_KEY,
    },
  })
}

export const s3 = buildClient()

/**
 * Validates that the configured S3/MinIO bucket is reachable at startup.
 *
 * In production: the bucket is pre-created by infra/bootstrap.sh with
 * Block Public Access enabled. We do NOT attempt to create it here —
 * that would fail with AccessDenied on AWS S3 with public-access blocked,
 * and would be a security risk if it somehow succeeded.
 *
 * In local dev: MinIO auto-creates buckets when docker-compose runs
 * the mc createbucket step, so HeadBucket will pass after a few seconds.
 */
export async function ensureBucket(): Promise<void> {
  await s3.send(new HeadBucketCommand({ Bucket: config.STORAGE_BUCKET }))
  console.log(`✅  Storage bucket "${config.STORAGE_BUCKET}" is reachable`)
}

/**
 * Uploads a file buffer and returns its public URL.
 * The URL is constructed from STORAGE_PUBLIC_URL — in production this
 * should point to a CloudFront distribution in front of the S3 bucket,
 * not the bucket URL directly.
 *
 * Example key: "uploads/2024-01-15-<uuid>.jpg"
 */
export async function uploadFile(
  body: Buffer | Uint8Array,
  contentType: string,
  prefix = 'uploads',
): Promise<string> {
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin'
  const key = `${prefix}/${new Date().toISOString().slice(0, 10)}-${randomUUID()}.${ext}`

  await s3.send(new PutObjectCommand({
    Bucket:      config.STORAGE_BUCKET,
    Key:         key,
    Body:        body,
    ContentType: contentType,
  }))

  return `${config.STORAGE_PUBLIC_URL}/${key}`
}
