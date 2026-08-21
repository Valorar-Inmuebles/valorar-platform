import { parseFolderName, compareOrdinal } from './folder-name';

describe('parseFolderName', () => {
  it('derives the public name by stripping the ordinal prefix', () => {
    expect(parseFolderName('001 - Agrelo 4066')).toEqual({
      ordinal: 1,
      sourceId: '001',
      publicName: 'Agrelo 4066',
    });
  });

  it('does not keep the ordinal in the public name', () => {
    const parsed = parseFolderName('016 - Aranguren 2443');
    expect(parsed?.publicName).toBe('Aranguren 2443');
    expect(parsed?.publicName.includes('016')).toBe(false);
  });

  it('sorts folders numerically, not lexicographically', () => {
    const names = [
      '010 - Arengreen 618',
      '002 - Ramon Falcon 1691',
      '001 - Agrelo 4066',
    ];
    const sorted = names
      .map((name) => parseFolderName(name)!)
      .sort((left, right) => compareOrdinal(left.ordinal, right.ordinal))
      .map((item) => item.sourceId);
    expect(sorted).toEqual(['001', '002', '010']);
  });

  it('rejects folders that do not match the pattern', () => {
    expect(parseFolderName('Agrelo 4066')).toBeNull();
  });
});
