import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  DumpStreamReader,
  splitSqlTuples,
  unquoteSqlValue,
  parseInsertColumns,
  extractValuesClause,
} from './dump-stream-reader';
import { HOUZEZ_SQL_FRAGMENTS } from '../constants';

describe('DumpStreamReader SQL tuple parsing', () => {
  it('parses simple tuples', () => {
    const rows = splitSqlTuples("(1,'a',NULL), (2,'b','c')");
    expect(rows).toEqual([
      ['1', 'a', null],
      ['2', 'b', 'c'],
    ]);
  });

  it('keeps commas inside quoted strings', () => {
    const rows = splitSqlTuples("(1,'hello, world',2)");
    expect(rows[0]).toEqual(['1', 'hello, world', '2']);
  });

  it('handles escaped quotes and doubled quotes', () => {
    expect(unquoteSqlValue("'O''Hara'")).toBe("O'Hara");
    const rows = splitSqlTuples("(1,'a\\'b',2)");
    expect(rows[0]?.[1]).toContain('b');
  });

  it('handles parentheses inside strings', () => {
    const rows = splitSqlTuples("(1,'fn(x,y)',2)");
    expect(rows[0]).toEqual(['1', 'fn(x,y)', '2']);
  });

  it('extracts columns and values from INSERT', () => {
    const sql =
      "INSERT INTO `val_posts` (`ID`,`post_title`) VALUES (1,'Hi'),(2,'Bye');";
    expect(parseInsertColumns(sql)).toEqual(['ID', 'post_title']);
    const values = extractValuesClause(sql);
    expect(values).toBeTruthy();
    expect(splitSqlTuples(values!).length).toBe(2);
  });

  it('parses serialized-looking meta values without splitting on commas wrongly', () => {
    const serialized = 'a:1:{i:0;s:4:"test";}';
    const rows = splitSqlTuples(`(10,5312,'fave_x','${serialized}')`);
    expect(rows[0]?.[3]).toContain('a:1:');
  });
});

describe('DumpStreamReader cross-fragment continuity', () => {
  it('strips leading SQL comments before detecting INSERT', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-dump-'));
    try {
      for (const name of HOUZEZ_SQL_FRAGMENTS) {
        fs.writeFileSync(path.join(dir, name), '-- empty\n;\n', 'utf8');
      }
      fs.writeFileSync(
        path.join(dir, 'valorar-houzez-006.sql'),
        [
          '--',
          '-- Volcado de datos para la tabla `val_options`',
          '--',
          '',
          'INSERT INTO `val_options` (`option_id`, `option_name`, `option_value`, `autoload`) VALUES',
          "(1, 'siteurl', 'https://example.test', 'yes');",
          '',
        ].join('\n'),
        'utf8',
      );
      const reader = new DumpStreamReader(dir);
      const keys: string[] = [];
      await reader.forEachInsert(['val_options'], (_t, _c, row) => {
        if (row[1]) keys.push(row[1]);
      });
      expect(keys).toEqual(['siteurl']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejoins INSERT VALUES split across consecutive dump parts', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-dump-'));
    try {
      for (const name of HOUZEZ_SQL_FRAGMENTS) {
        // Terminate comment-only stubs so they do not glue onto later INSERTs
        fs.writeFileSync(
          path.join(dir, name),
          '-- empty fragment\n;\n',
          'utf8',
        );
      }
      // Split mid-statement across 005 → 006 (same pattern as real dump)
      fs.writeFileSync(
        path.join(dir, 'valorar-houzez-005.sql'),
        "INSERT INTO `val_options` (`option_id`, `option_name`, `option_value`, `autoload`) VALUES\n(1, 'siteurl', 'https://example.test', 'yes'),\n",
        'utf8',
      );
      fs.writeFileSync(
        path.join(dir, 'valorar-houzez-006.sql'),
        "(2, 'home', 'https://example.test', 'yes'),\n(3, 'permalink_structure', '/%year%/%monthnum%/%day%/%postname%/', 'yes');\n",
        'utf8',
      );

      const reader = new DumpStreamReader(dir);
      const keys: string[] = [];
      await reader.forEachInsert(['val_options'], (_t, _c, row) => {
        if (row[1]) keys.push(row[1]);
      });
      expect(keys).toEqual(['siteurl', 'home', 'permalink_structure']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
