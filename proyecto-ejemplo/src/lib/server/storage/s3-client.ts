import { S3Client } from "@aws-sdk/client-s3";

import { getS3Config } from "./s3-config";

type Client = S3Client;

declare global {
  // eslint-disable-next-line no-var
  var __jurilexiaS3Client: Client | undefined;
}

function createS3Client(): Client {
  const config = getS3Config();

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  });
}

export function getS3Client(): Client {
  if (!globalThis.__jurilexiaS3Client) {
    globalThis.__jurilexiaS3Client = createS3Client();
  }
  return globalThis.__jurilexiaS3Client;
}
