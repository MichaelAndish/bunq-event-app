import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { config } from '../config'

function buildClient(): S3Client {
  return new S3Client({
    region: config.STORAGE_REGION,
    ...(config.STORAGE_ENDPOINT ? { endpoint: config.STORAGE_ENDPOINT } : {}),
    forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId:     config.STORAGE_ACCESS_KEY,
      secretAccessKey: config.STORAGE_SECRET_KEY,
    },
  })
}

export const s3 = buildClient()

// Run once at startup — creates the bucket and makes it publicly readable.
// Safe to call repeatedly; HeadBucket is a no-op if the bucket already exists.
export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: config.STORAGE_BUCKET }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: config.STORAGE_BUCKET }))

    await s3.send(new PutBucketPolicyCommand({
      Bucket: config.STORAGE_BUCKET,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Sid:       'PublicRead',
          Effect:    'Allow',
          Principal: '*',
          Action:    ['s3:GetObject'],
          Resource:  [`arn:aws:s3:::${config.STORAGE_BUCKET}/*`],
        }],
      }),
    }))

    console.log(`✅  Storage bucket "${config.STORAGE_BUCKET}" created and set to public-read`)
  }
}

// Uploads a file buffer and returns its public URL.
// key: path inside the bucket, e.g. "venues/2024-01-abc.jpg"
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
