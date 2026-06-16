export type StorageObjectRef = {
  bucket: string;
  key: string;
};

export type StoredObject = {
  content: Uint8Array;
  contentType: string | null;
  contentLength: number | null;
};

export type PutObjectInput = {
  bucket: string;
  key: string;
  body: Uint8Array | Buffer | string;
  contentType?: string;
};
