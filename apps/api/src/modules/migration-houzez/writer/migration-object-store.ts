/**
 * Injectable object-store boundary for Houzez import.
 * Production wiring may wrap S3/R2; tests use {@link InMemoryMigrationObjectStore}.
 * Never call real R2 from unit tests.
 */

export type PutObjectResult = {
  /** True when this call wrote bytes. False when a preexisting object was left untouched. */
  wrote: boolean;
  preexisting: boolean;
};

export type MigrationObjectStore = {
  objectExists(key: string): Promise<boolean>;
  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<PutObjectResult>;
  deleteObject(key: string): Promise<void>;
  getPublicUrl(key: string): string;
};

export type InMemoryObjectRecord = {
  body: Buffer;
  contentType: string;
};

/**
 * Fake store for local tests. Tracks keys created by {@link putObject} when
 * `wrote=true` so compensation can mirror production semantics.
 */
export class InMemoryMigrationObjectStore implements MigrationObjectStore {
  readonly objects = new Map<string, InMemoryObjectRecord>();
  readonly deletedKeys: string[] = [];
  failPutOnKey: string | null = null;
  failDeleteOnKey: string | null = null;
  publicUrlBase = 'https://example.test/media';

  objectExists(key: string): Promise<boolean> {
    return Promise.resolve(this.objects.has(key));
  }

  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<PutObjectResult> {
    if (this.failPutOnKey === input.key) {
      return Promise.reject(
        new Error(`Simulated upload failure for key=${input.key}`),
      );
    }
    const preexisting = this.objects.has(input.key);
    if (preexisting) {
      // Retry-safe: leave preexisting object; do not mark as wrote by this execution.
      return Promise.resolve({ wrote: false, preexisting: true });
    }
    this.objects.set(input.key, {
      body: Buffer.from(input.body),
      contentType: input.contentType,
    });
    return Promise.resolve({ wrote: true, preexisting: false });
  }

  deleteObject(key: string): Promise<void> {
    if (this.failDeleteOnKey === key) {
      return Promise.reject(
        new Error(`Simulated delete failure for key=${key}`),
      );
    }
    this.objects.delete(key);
    this.deletedKeys.push(key);
    return Promise.resolve();
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrlBase.replace(/\/$/, '')}/${key}`;
  }

  /** Seed a preexisting object (e.g. leftover from a prior failed compensation). */
  seedPreexisting(
    key: string,
    body: Buffer = Buffer.from('preexisting'),
  ): void {
    this.objects.set(key, { body, contentType: 'application/octet-stream' });
  }
}
