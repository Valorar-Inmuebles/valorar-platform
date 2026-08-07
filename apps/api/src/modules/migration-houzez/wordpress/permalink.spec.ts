import { reconstructOldUrl } from './permalink';

describe('reconstructOldUrl', () => {
  it('rebuilds dated permalink when structure and date are present', () => {
    const result = reconstructOldUrl({
      site: {
        home: 'https://valorarinmuebles.com.ar',
        siteurl: 'https://valorarinmuebles.com.ar',
        permalinkStructure: '/%year%/%monthnum%/%day%/%postname%/',
        blogname: 'Valorar Inmuebles',
      },
      slug: 'jose-marti-1100',
      postDate: '2018-05-12 15:30:00',
    });
    expect(result.status).toBe('verified');
    expect(result.oldUrl).toBe(
      'https://valorarinmuebles.com.ar/2018/05/12/jose-marti-1100/',
    );
  });

  it('marks unverified when date tokens required but date missing', () => {
    const result = reconstructOldUrl({
      site: {
        home: 'https://valorarinmuebles.com.ar',
        siteurl: 'https://valorarinmuebles.com.ar',
        permalinkStructure: '/%year%/%monthnum%/%day%/%postname%/',
        blogname: null,
      },
      slug: 'jose-marti-1100',
      postDate: null,
    });
    expect(result.status).toBe('unverified');
    expect(result.oldUrl).toBeNull();
    expect(result.oldSlug).toBe('jose-marti-1100');
  });

  it('does not invent URL for unsupported tokens', () => {
    const result = reconstructOldUrl({
      site: {
        home: 'https://example.com',
        siteurl: 'https://example.com',
        permalinkStructure: '/%category%/%postname%/',
        blogname: null,
      },
      slug: 'x',
      postDate: '2020-01-01 00:00:00',
    });
    expect(result.status).toBe('unverified');
    expect(result.oldUrl).toBeNull();
  });
});
