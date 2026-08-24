import { detectLocation } from './location';

describe('detectLocation', () => {
  it('resolves an unequivocal barrio de ... hit', () => {
    const result = detectLocation(
      'Edificio en construcción.\nBarrio de Almagro.\n',
    );
    expect(result.location.localityName).toBe('Almagro');
    expect(result.location.status).toBe('resolved');
    expect(result.issues).toHaveLength(0);
  });

  it('does not treat Floresta as Flores or use prefix matching', () => {
    const floresta = detectLocation('Barrio de Floresta.');
    const flores = detectLocation('Barrio de Flores.');
    expect(floresta.location.localityName).toBe('Floresta');
    expect(flores.location.localityName).toBe('Flores');
    expect(detectLocation('Barrio de Flor.').location.status).toBe(
      'unresolved',
    );
  });

  it('blocks when two strong localities are present', () => {
    const result = detectLocation('Barrio de Flores.\nBarrio de Caballito.');
    expect(result.location.status).toBe('ambiguous');
    expect(
      result.issues.some(
        (issue) => issue.code === 'AMBIGUOUS_LOCALITY' && issue.blocking,
      ),
    ).toBe(true);
  });

  it('accepts a locality override before catalog validation', () => {
    const result = detectLocation('Sin barrio explícito.', 'Villa Urquiza');
    expect(result.location.localityName).toBe('Villa Urquiza');
    expect(result.issues).toHaveLength(0);
  });
});
