import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  MINI_PNG,
  makeTempDir,
  writeFolder,
} from '../__fixtures__/temp-source';
import { CABA_PROVINCE_SEARCH_ALIASES } from '../catalog/caba-geo-catalog';
import type { OfflineGeoCatalog } from '../catalog/caba-geo-catalog';
import { runAudit } from '../cli/run-audit';
import { runDryRun } from '../cli/run-dry-run';
import { inspectFolder } from '../discovery/discover-source';
import { SOURCE_OVERRIDES } from '../overrides/source-overrides';
import { sha256Json } from './fingerprint';
import { planDevelopment } from './plan-development';

describe('planDevelopment', () => {
  it('normalizes approved titles, source ids and sortOrder', () => {
    const root = makeTempDir();
    const falcon = writeFolder(root, '002 - Ramon Falcon 1691', {
      '001.png': MINI_PNG,
      'info.txt':
        'Ramón Falcón 1691\nEdificio en construcción.\nBarrio de Caballito.\n',
    });
    const plan = planDevelopment(inspectFolder(falcon));
    expect(plan.title).toBe('Ramón Falcón 1691');
    expect(plan.sourceId).toBe('002');
    expect(plan.internalCode).toBe('DEV-002');
    expect(plan.sortOrder).toBe(2);
    expect(plan.slug).toBe('ramon-falcon-1691');
    expect(plan.persistTypologies).toBe(false);
    expect(plan.priceFrom).toBeNull();
    expect(plan.currency).toBeNull();
  });

  it('assigns sortOrder 1 and 16 from folder ordinals', () => {
    const root = makeTempDir();
    const first = writeFolder(root, '001 - Agrelo 4066', {
      '001.png': MINI_PNG,
      'info.txt':
        'Agrelo 4066\nEdificio en construcción.\nBarrio de Almagro.\n',
    });
    const last = writeFolder(root, '016 - Aranguren 2443', {
      '001.png': MINI_PNG,
      'info.txt': 'Aranguren 2443\nAño de Entrega : 2014\n',
    });
    expect(planDevelopment(inspectFolder(first)).sortOrder).toBe(1);
    expect(planDevelopment(inspectFolder(last)).sortOrder).toBe(16);
  });

  it('keeps 010 without a TXT title and still uses the folder name', () => {
    const root = makeTempDir();
    const folder = writeFolder(root, '010 - Arengreen 618', {
      '001.png': MINI_PNG,
      'info.txt': 'EDIFICIO TERMINADO!!!\nSEMIPISOS de 1 1/2 AMB DIVISBLES.\n',
    });
    const plan = planDevelopment(inspectFolder(folder));
    expect(plan.title).toBe('Arengreen 618');
    expect(
      plan.warnings.some((issue) => issue.code === 'MISSING_TITLE_IN_TXT'),
    ).toBe(true);
  });

  it('plans 013 as a development with Floresta, COMPLETED and a unit-like warning', () => {
    const root = makeTempDir();
    const folder = writeFolder(root, '013 - Dolores 226', {
      '001.png': MINI_PNG,
      'info.txt':
        '1 1/2 AMBIENTES tipo PH a ESTRENAR con balcón y orientación Oeste, 2° por escalera.\n',
    });
    const plan = planDevelopment(inspectFolder(folder));
    expect(plan.sourceId).toBe('013');
    expect(plan.entityType).toBe('development');
    expect(plan.title).toBe('Dolores 226');
    expect(plan.location.localityName).toBe('Floresta');
    expect(plan.location.localitySlug).toBe('floresta');
    expect(plan.location.provinceName).toBe('Capital Federal');
    expect(plan.status).toBe('COMPLETED');
    expect(plan.warnings.some((issue) => issue.code === 'UNIT_LIKE_COPY')).toBe(
      true,
    );
    expect(
      plan.blockers.some((issue) => issue.code === 'UNRESOLVED_LOCALITY'),
    ).toBe(false);
    expect(plan.planStatus).not.toBe('blocked');
  });

  it('does not plan typology writes even when typologies are detected', () => {
    const root = makeTempDir();
    const folder = writeFolder(root, '001 - Agrelo 4066', {
      '001.png': MINI_PNG,
      'info.txt':
        'Agrelo 4066\nEdificio en construcción.\nBarrio de Almagro.\nUnidades de 1, 2 y 3 ambientes.\n',
    });
    const plan = planDevelopment(inspectFolder(folder));
    expect(plan.detectedTypologies.length).toBeGreaterThan(0);
    expect(plan.persistTypologies).toBe(false);
  });

  it('produces a deterministic fingerprint from content, not filesystem order', () => {
    const payload = { sourceId: '001', title: 'Agrelo 4066' };
    expect(sha256Json(payload)).toBe(
      sha256Json({ title: 'Agrelo 4066', sourceId: '001' }),
    );
  });
});

describe('audit and dry-run isolation', () => {
  it('does not write to database or storage', () => {
    const root = makeTempDir();
    writeFolder(root, '001 - Agrelo 4066', {
      '001.png': MINI_PNG,
      'info.txt':
        'Agrelo 4066\nEdificio en construcción.\nBarrio de Almagro.\n',
    });

    const audit = runAudit(root);
    const dryRun = runDryRun(root);
    expect(audit.writes).toEqual({ database: false, storage: false });
    expect(dryRun.writes).toEqual({ database: false, storage: false });
    expect(audit.folderCount).toBe(1);
    expect(dryRun.developments[0]?.coverImage?.filename).toBe('001.png');
  });

  it('does not import prisma or s3 in the read-only CLI modules', () => {
    const files = [
      'cli/run-audit.ts',
      'cli/run-dry-run.ts',
      'planning/plan-development.ts',
      'discovery/discover-source.ts',
      'catalog/resolve-geo.ts',
      'catalog/caba-geo-catalog.ts',
    ];
    for (const relative of files) {
      const source = fs.readFileSync(
        path.join(__dirname, '..', relative),
        'utf8',
      );
      expect(source).not.toMatch(
        /PrismaClient|S3Client|PutObjectCommand|prisma\./,
      );
    }
  });
});

const APPROVED_BATCH: Array<{
  sourceId: string;
  folder: string;
  title: string;
  locality: string;
  slug: string;
  status: 'IN_PIT' | 'UNDER_CONSTRUCTION' | 'COMPLETED';
  txt: string;
}> = [
  {
    sourceId: '001',
    folder: '001 - Agrelo 4066',
    title: 'Agrelo 4066',
    locality: 'Almagro',
    slug: 'agrelo-4066',
    status: 'UNDER_CONSTRUCTION',
    txt: 'Agrelo 4066\nEdificio en construcción.\nBarrio de Almagro.\n',
  },
  {
    sourceId: '002',
    folder: '002 - Ramon Falcon 1691',
    title: 'Ramón Falcón 1691',
    locality: 'Caballito',
    slug: 'ramon-falcon-1691',
    status: 'UNDER_CONSTRUCTION',
    txt: 'Ramón Falcón 1691\nEdificio en construcción.\nBarrio de Caballito.\n',
  },
  {
    sourceId: '003',
    folder: '003 - Bonifacio 2700',
    title: 'Bonifacio 2700',
    locality: 'Flores',
    slug: 'bonifacio-2700',
    status: 'IN_PIT',
    txt: 'Bonifacio 2700\nLANZAMIENTO EN POZO!!!\nNuevo Flores.\n',
  },
  {
    sourceId: '004',
    folder: '004 - Bonifacio 1950',
    title: 'Bonifacio 1950',
    locality: 'Flores',
    slug: 'bonifacio-1950',
    status: 'IN_PIT',
    txt: 'Bonifacio 1950\nLANZAMIENTO EN POZO!!!\nEntrega estimada Enero / Febrero 2023.\n',
  },
  {
    sourceId: '005',
    folder: '005 - Bonifacio 593',
    title: 'Bonifacio 593',
    locality: 'Caballito',
    slug: 'bonifacio-593',
    status: 'UNDER_CONSTRUCTION',
    txt: 'Bonifacio 593\nEdificio en construcción.\nEntrega estimada 2021.\n',
  },
  {
    sourceId: '006',
    folder: '006 - Pedernera 289',
    title: 'Pedernera 289',
    locality: 'Flores',
    slug: 'pedernera-289',
    status: 'UNDER_CONSTRUCTION',
    txt: 'Pedernera 289\nEdificio en construcción.\nEntrega estimada 2022.\n',
  },
  {
    sourceId: '007',
    folder: '007 - Lautaro 412',
    title: 'Lautaro 412',
    locality: 'Flores',
    slug: 'lautaro-412',
    status: 'UNDER_CONSTRUCTION',
    txt: 'Lautaro 412\nEdificio en construcción.\nBarrio de Flores.\nEntrega estimada JUNIO del 2021.\n',
  },
  {
    sourceId: '008',
    folder: '008 - Varela 39',
    title: 'Varela 39',
    locality: 'Flores',
    slug: 'varela-39',
    status: 'COMPLETED',
    txt: 'Varela 39\nEdificio Terminado.\n',
  },
  {
    sourceId: '009',
    folder: '009 - Rafaela 4993',
    title: 'Rafaela 4993',
    locality: 'Villa Luro',
    slug: 'rafaela-4993',
    status: 'COMPLETED',
    txt: 'Rafaela 4993\nEdificio Terminado.\n',
  },
  {
    sourceId: '010',
    folder: '010 - Arengreen 618',
    title: 'Arengreen 618',
    locality: 'Caballito',
    slug: 'arengreen-618',
    status: 'COMPLETED',
    txt: 'EDIFICIO TERMINADO!!!\nSEMIPISOS de 1 1/2 AMB DIVISBLES.\nBarrio de Caballito.\n',
  },
  {
    sourceId: '011',
    folder: '011 - Bonifacio 1940',
    title: 'Bonifacio 1940',
    locality: 'Flores',
    slug: 'bonifacio-1940',
    status: 'COMPLETED',
    txt: 'Bonifacio 1940\nEn lo mejor del barrio de Flores.\n',
  },
  {
    sourceId: '012',
    folder: '012 - Lautaro 582',
    title: 'Lautaro 582',
    locality: 'Flores',
    slug: 'lautaro-582',
    status: 'COMPLETED',
    txt: 'Lautaro 582\nObra en desarrollo.\nTodas las unidades al frente con balcón.\nTodas las unidades al frente con balcón.\n',
  },
  {
    sourceId: '013',
    folder: '013 - Dolores 226',
    title: 'Dolores 226',
    locality: 'Floresta',
    slug: 'dolores-226',
    status: 'COMPLETED',
    txt: '1 1/2 AMBIENTES tipo PH a ESTRENAR, 2° por escalera.\n',
  },
  {
    sourceId: '014',
    folder: '014 - Los incas 5109',
    title: 'Los Incas 5109',
    locality: 'Villa Urquiza',
    slug: 'los-incas-5109',
    status: 'COMPLETED',
    txt: 'Los Incas 5109\nAño de Entrega : 2016\n',
  },
  {
    sourceId: '015',
    folder: '015 - Camacua 372',
    title: 'Camacuá 372',
    locality: 'Flores',
    slug: 'camacua-372',
    status: 'COMPLETED',
    txt: 'Camacua 372\nAño de Entrega : 2015\nUn proyecto en lo mejor de Flores.\n',
  },
  {
    sourceId: '016',
    folder: '016 - Aranguren 2443',
    title: 'Aranguren 2443',
    locality: 'Flores',
    slug: 'aranguren-2443',
    status: 'COMPLETED',
    txt: 'Aranguren 2443\nAño de Entrega : 2014\n',
  },
];

describe('approved batch locality and status', () => {
  it('assigns the 16 approved localities, statuses and editorial order', () => {
    const root = makeTempDir();
    const now = new Date('2026-08-21');
    for (const row of APPROVED_BATCH) {
      writeFolder(root, row.folder, {
        '001.png': MINI_PNG,
        'info.txt': row.txt,
      });
    }

    const report = runDryRun(root, { now });
    expect(report.developments.map((item) => item.sourceId)).toEqual(
      APPROVED_BATCH.map((row) => row.sourceId),
    );
    expect(report.blockedCount).toBe(0);
    expect(report.missingCatalogEntries).toEqual([]);
    expect(report.writes).toEqual({ database: false, storage: false });

    for (const row of APPROVED_BATCH) {
      const plan = report.developments.find(
        (item) => item.sourceId === row.sourceId,
      );
      expect(plan).toBeDefined();
      expect(plan?.title).toBe(row.title);
      expect(plan?.slug).toBe(row.slug);
      expect(plan?.sortOrder).toBe(Number.parseInt(row.sourceId, 10));
      expect(plan?.status).toBe(row.status);
      expect(plan?.entityType).toBe('development');
      expect(plan?.location.provinceName).toBe('Capital Federal');
      expect(plan?.location.provinceSlug).toBe('capital-federal');
      expect(plan?.location.localityName).toBe(row.locality);
      expect(plan?.location.provinceId).toBeNull();
      expect(plan?.location.localityId).toBeNull();
      expect(plan?.coverImage?.altText).toBe(row.title);
      expect(JSON.stringify(plan)).not.toMatch(/"entityType":"property"/i);
      expect(plan).not.toHaveProperty('propertyId');
    }
  });

  it('keeps non-blocking STALE warnings only on 004-007', () => {
    const root = makeTempDir();
    const now = new Date('2026-08-21');
    for (const row of APPROVED_BATCH.filter((item) =>
      ['004', '005', '006', '007'].includes(item.sourceId),
    )) {
      writeFolder(root, row.folder, {
        '001.png': MINI_PNG,
        'info.txt': row.txt,
      });
    }
    const report = runDryRun(root, { now });
    for (const plan of report.developments) {
      expect(
        plan.warnings.some(
          (issue) =>
            issue.code === 'STALE_DEVELOPMENT_STATUS' && !issue.blocking,
        ),
      ).toBe(true);
      expect(plan.planStatus).not.toBe('blocked');
    }
  });

  it('overrides 012 from UNDER_CONSTRUCTION to COMPLETED', () => {
    const root = makeTempDir();
    const folder = writeFolder(root, '012 - Lautaro 582', {
      '001.png': MINI_PNG,
      'info.txt':
        'Lautaro 582\nObra en desarrollo.\nTodas las unidades al frente con balcón.\n',
    });
    const plan = planDevelopment(inspectFolder(folder));
    expect(plan.status).toBe('COMPLETED');
    const warning = plan.warnings.find(
      (issue) => issue.code === 'SOURCE_STATUS_OVERRIDDEN',
    );
    expect(warning?.blocking).toBe(false);
    expect(warning?.message).toContain('UNDER_CONSTRUCTION');
    expect(warning?.message).toContain('COMPLETED');
    expect(SOURCE_OVERRIDES['012']?.statusReason).toBeDefined();
  });

  it('marks 011 and 014-016 COMPLETED without UNKNOWN_DEVELOPMENT_STATUS', () => {
    const root = makeTempDir();
    for (const row of APPROVED_BATCH.filter((item) =>
      ['011', '014', '015', '016'].includes(item.sourceId),
    )) {
      writeFolder(root, row.folder, {
        '001.png': MINI_PNG,
        'info.txt': row.txt,
      });
    }
    const report = runDryRun(root);
    for (const plan of report.developments) {
      expect(plan.status).toBe('COMPLETED');
      expect(
        plan.warnings.some(
          (issue) => issue.code === 'UNKNOWN_DEVELOPMENT_STATUS',
        ),
      ).toBe(false);
    }
  });

  it('normalizes Camacuá 372 title, slug and alt text', () => {
    const root = makeTempDir();
    const folder = writeFolder(root, '015 - Camacua 372', {
      '001.png': MINI_PNG,
      'info.txt':
        'Camacua 372\nAño de Entrega : 2015\nUn proyecto en lo mejor de Flores.\n',
    });
    const plan = planDevelopment(inspectFolder(folder));
    expect(plan.title).toBe('Camacuá 372');
    expect(plan.slug).toBe('camacua-372');
    expect(plan.coverImage?.altText).toBe('Camacuá 372');
    expect(plan.gallery.every((image) => image.altText === 'Camacuá 372')).toBe(
      true,
    );
    expect(plan.location.localityName).toBe('Flores');
  });
});

describe('missing catalog entries', () => {
  it('blocks and reports a locality absent from the offline catalog', () => {
    const catalog: OfflineGeoCatalog = {
      provinces: [
        {
          name: 'Capital Federal',
          slug: 'capital-federal',
          search: 'capitalfederal',
          isoCode: 'AR-C',
          aliases: CABA_PROVINCE_SEARCH_ALIASES,
          localities: [{ name: 'Almagro', slug: 'almagro', search: 'almagro' }],
        },
      ],
    };
    const root = makeTempDir();
    writeFolder(root, '001 - Agrelo 4066', {
      '001.png': MINI_PNG,
      'info.txt':
        'Agrelo 4066\nBarrio de Almagro.\nEdificio en construcción.\n',
    });
    writeFolder(root, '004 - Bonifacio 1950', {
      '001.png': MINI_PNG,
      'info.txt': 'Bonifacio 1950\nLANZAMIENTO EN POZO!!!\n',
    });
    const report = runDryRun(root, { geoCatalog: catalog });
    expect(report.writes).toEqual({ database: false, storage: false });
    expect(report.blockedCount).toBe(1);
    expect(report.missingCatalogEntries).toEqual([
      expect.objectContaining({
        model: 'Locality',
        requiredName: 'Flores',
        provinceName: 'Capital Federal',
        provinceSlug: 'capital-federal',
        sourceIds: ['004'],
      }),
    ]);
    const ready = report.developments.find((item) => item.sourceId === '001');
    expect(ready?.planStatus).not.toBe('blocked');
  });
});
