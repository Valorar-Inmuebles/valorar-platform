import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('geo seed UTF-8 integrity', () => {
  it.each(['provincias.sql', 'localidades.sql'])(
    'keeps %s valid UTF-8 without replacement characters',
    (fileName) => {
      const bytes = readFileSync(
        resolve(__dirname, '../../../prisma/seed-data', fileName),
      );
      const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);

      expect(content).not.toContain(String.fromCodePoint(0xfffd));
    },
  );
});
