import { getAnsesBucketName } from "./s3-config";
import { objectStorage } from "./object-storage";

export const ansesStorage = {
  async getFile(key: string): Promise<{
    content: ArrayBuffer;
    contentType: string | null;
  }> {
    const bucket = getAnsesBucketName();
    const stored = await objectStorage.getObjectBytes(bucket, key);

    return {
      content: stored.content.buffer.slice(
        stored.content.byteOffset,
        stored.content.byteOffset + stored.content.byteLength,
      ) as ArrayBuffer,
      contentType: stored.contentType,
    };
  },

  async getText(key: string): Promise<string> {
    return objectStorage.getObjectText(getAnsesBucketName(), key);
  },
};
