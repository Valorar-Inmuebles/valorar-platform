export type PutObjectResult = {
  wrote: boolean;
  preexisting: boolean;
};

export type HeadObjectMeta = {
  exists: boolean;
  contentType: string | null;
  contentLength: number | null;
  metadata: Record<string, string>;
};

export type MigrationObjectStore = {
  objectExists(key: string): Promise<boolean>;
  headObject(key: string): Promise<HeadObjectMeta>;
  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<PutObjectResult>;
  getPublicUrl(key: string): string;
  ping(): Promise<boolean>;
};

export type InMemoryObjectRecord = {
  body: Buffer;
  contentType: string;
  metadata: Record<string, string>;
};

export class InMemoryMigrationObjectStore implements MigrationObjectStore {
  readonly objects = new Map<string, InMemoryObjectRecord>();
  publicUrlBase = 'https://example.test/media';
  pingOk = true;
  failPutOnKey: string | null = null;

  objectExists(key: string): Promise<boolean> {
    return Promise.resolve(this.objects.has(key));
  }

  headObject(key: string): Promise<HeadObjectMeta> {
    const obj = this.objects.get(key);
    if (!obj) {
      return Promise.resolve({
        exists: false,
        contentType: null,
        contentLength: null,
        metadata: {},
      });
    }
    return Promise.resolve({
      exists: true,
      contentType: obj.contentType,
      contentLength: obj.body.length,
      metadata: { ...obj.metadata },
    });
  }

  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<PutObjectResult> {
    if (this.failPutOnKey === input.key) {
      return Promise.reject(
        new Error(`Simulated upload failure for key=${input.key}`),
      );
    }
    if (this.objects.has(input.key)) {
      return Promise.resolve({ wrote: false, preexisting: true });
    }
    this.objects.set(input.key, {
      body: Buffer.from(input.body),
      contentType: input.contentType,
      metadata: { ...(input.metadata ?? {}) },
    });
    return Promise.resolve({ wrote: true, preexisting: false });
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrlBase.replace(/\/$/, '')}/${key}`;
  }

  ping(): Promise<boolean> {
    return Promise.resolve(this.pingOk);
  }

  seedPreexisting(
    key: string,
    body: Buffer,
    contentType: string,
    metadata: Record<string, string> = {},
  ): void {
    this.objects.set(key, { body, contentType, metadata });
  }
}
