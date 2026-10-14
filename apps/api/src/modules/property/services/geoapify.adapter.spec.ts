import { GeoapifyAdapter } from './geoapify.adapter';

const key = 'private-test-key';
const valid = (overrides: Record<string, unknown> = {}) => ({
  formatted: 'Calle 10, Rosario, Argentina',
  lat: -32.956123456,
  lon: -60.64,
  country_code: 'ar',
  result_type: 'building',
  housenumber: '10',
  rank: { match_type: 'full_match' },
  bbox: { lat1: -32.96, lat2: -32.95, lon1: -60.65, lon2: -60.63 },
  ...overrides,
});
function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

describe('Geoapify adapter (no network)', () => {
  const adapter = new GeoapifyAdapter();
  const original = process.env.GEOAPIFY_API_KEY;
  beforeEach(() => {
    process.env.GEOAPIFY_API_KEY = key;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.GEOAPIFY_API_KEY;
    else process.env.GEOAPIFY_API_KEY = original;
    jest.restoreAllMocks();
  });
  it('keeps the key server-side, applies Argentina filter, normalizes up to five candidates and bounds', async () => {
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      response({
        results: [
          valid(),
          valid({ result_type: 'street' }),
          valid({ result_type: 'suburb' }),
          valid({ result_type: 'city' }),
          valid(),
          valid(),
        ],
      }),
    );
    const result = await adapter.search('Calle 10, Rosario, Argentina', '10');
    const url = new URL(fetch.mock.calls[0][0] as string);
    expect(url.hostname).toBe('api.geoapify.com');
    expect(url.searchParams.get('filter')).toBe('countrycode:ar');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(result.candidates).toHaveLength(5);
    expect(result.candidates[0]).toMatchObject({
      granularity: 'ADDRESS',
      bounds: { south: -32.96, west: -60.65, north: -32.95, east: -60.63 },
    });
    expect(result.candidates[1]).toMatchObject({
      granularity: 'STREET',
      warnings: ['Ubicación aproximada de la calle; verificá la altura.'],
    });
    expect(result.candidates[2].granularity).toBe('NEIGHBORHOOD');
    expect(result.candidates[3].granularity).toBe('LOCALITY');
    expect(JSON.stringify(result)).not.toContain(key);
  });
  it('omits malformed, out-of-country and non-finite points; returns no results', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      response({
        results: [
          valid({ country_code: 'uy' }),
          valid({ lat: 91 }),
          valid({ formatted: '' }),
          valid({ lon: '0' }),
        ],
      }),
    );
    expect(await adapter.search('Calle 10')).toEqual({
      status: 'NO_RESULTS',
      candidates: [],
    });
  });
  it('fails closed without a key and never fetches', async () => {
    delete process.env.GEOAPIFY_API_KEY;
    const fetch = jest.spyOn(global, 'fetch');
    await expect(adapter.search('Calle 10')).rejects.toMatchObject({
      status: 503,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([429, 500])(
    'sanitizes provider HTTP %s and never logs or leaks credentials',
    async (status) => {
      const log = jest.spyOn(console, 'error').mockImplementation(() => {});
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(response({ message: `secret ${key}` }, status));
      let error: unknown;
      try {
        await adapter.search('Calle 10');
      } catch (caught) {
        error = caught;
      }
      expect(error).toMatchObject({ status: status === 429 ? 429 : 503 });
      expect(JSON.stringify(error)).not.toContain(key);
      expect(log).not.toHaveBeenCalled();
    },
  );
  it.each([
    new Error(`https://api.geoapify.com/?apiKey=${key}`),
    Object.assign(new Error('timeout'), { name: 'TimeoutError' }),
  ])('sanitizes network/timeout errors', async (providerError) => {
    jest.spyOn(global, 'fetch').mockRejectedValue(providerError);
    let error: unknown;
    try {
      await adapter.search('Calle 10');
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ status: 503 });
    expect(JSON.stringify(error)).not.toContain(key);
  });
  it.each([
    response({ invalid: true }),
    response({ results: [valid()], padding: 'x'.repeat(70_000) }),
  ])('rejects malformed or oversized payload', async (providerResponse) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(providerResponse);
    await expect(adapter.search('Calle 10')).rejects.toMatchObject({
      status: 503,
    });
  });
});
