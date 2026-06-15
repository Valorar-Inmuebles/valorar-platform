export class StorageObjectNotFoundError extends Error {
  constructor(key: string, bucket: string) {
    super(`Archivo no encontrado: ${bucket}/${key}`);
    this.name = "StorageObjectNotFoundError";
  }
}

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigError";
  }
}
