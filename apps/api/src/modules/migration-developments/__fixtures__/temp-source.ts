import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const MINI_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

export function makeTempDir(prefix = 'dev-mig-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function writeFolder(
  root: string,
  folderName: string,
  files: Record<string, string | Buffer>,
): string {
  const folderPath = path.join(root, folderName);
  fs.mkdirSync(folderPath, { recursive: true });
  for (const [filename, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(folderPath, filename), contents);
  }
  return folderPath;
}
