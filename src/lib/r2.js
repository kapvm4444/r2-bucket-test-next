// lib/r2.js
import { S3Client } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto", // R2 doesn't use regions, but SDK requires this
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
