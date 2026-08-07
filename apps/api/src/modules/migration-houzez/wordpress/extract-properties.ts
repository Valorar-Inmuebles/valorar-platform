import { DumpStreamReader } from '../sql/dump-stream-reader';
import type {
  WordpressAttachmentRaw,
  WordpressPropertyRaw,
  WordpressSiteOptions,
} from '../types';

const POST = {
  ID: 0,
  author: 1,
  date: 2,
  content: 4,
  title: 5,
  status: 7,
  name: 11,
  parent: 17,
  type: 20,
  mime: 21,
} as const;

export type ExtractedDump = {
  tablePrefix: string;
  properties: Map<number, WordpressPropertyRaw>;
  attachments: Map<number, WordpressAttachmentRaw>;
  siteOptions: WordpressSiteOptions;
  postTypeCounts: Record<string, number>;
};

function emptyProperty(
  id: number,
  status: string,
  slug: string,
  title: string,
  content: string | null,
  postDate: string | null,
  authorId: string | null,
): WordpressPropertyRaw {
  return {
    id,
    status,
    slug,
    title,
    content,
    postDate,
    authorId,
    taxonomies: {},
    meta: {},
    galleryAttachmentIds: [],
    thumbnailId: null,
  };
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function columnIndex(columns: string[] | null): Record<string, number> {
  const idx: Record<string, number> = {};
  if (!columns) return idx;
  columns.forEach((c, i) => {
    idx[c] = i;
  });
  return idx;
}

/**
 * Multi-pass streaming extract (ordered to respect dump table order):
 * 1) posts + options
 * 2) terms + term_taxonomy
 * 3) term_relationships
 * 4) postmeta
 */
export async function extractWordpressDump(
  sourceDir: string,
): Promise<ExtractedDump> {
  const reader = new DumpStreamReader(sourceDir);
  reader.assertFragmentsPresent();

  const properties = new Map<number, WordpressPropertyRaw>();
  const attachments = new Map<number, WordpressAttachmentRaw>();
  const postTypeCounts: Record<string, number> = {};
  const siteOptions: WordpressSiteOptions = {
    home: null,
    siteurl: null,
    permalinkStructure: null,
    blogname: null,
  };
  const termNames = new Map<number, { name: string; slug: string }>();
  const termTax = new Map<number, { termId: number; taxonomy: string }>();

  await reader.forEachInsert(
    ['val_posts', 'val_options'],
    (table, columns, row) => {
      if (table === 'val_options') {
        const idx = columnIndex(columns);
        const key = row[idx.option_name ?? 1] ?? null;
        const value = row[idx.option_value ?? 2] ?? null;
        if (key === 'home') siteOptions.home = value;
        if (key === 'siteurl') siteOptions.siteurl = value;
        if (key === 'permalink_structure')
          siteOptions.permalinkStructure = value;
        if (key === 'blogname') siteOptions.blogname = value;
        return;
      }
      if (row.length < 21) return;
      const id = Number(row[POST.ID]);
      const type = row[POST.type] ?? '';
      bump(postTypeCounts, type || '(empty)');
      if (type === 'property') {
        properties.set(
          id,
          emptyProperty(
            id,
            row[POST.status] ?? '',
            row[POST.name] ?? '',
            row[POST.title] ?? '',
            row[POST.content],
            row[POST.date],
            row[POST.author],
          ),
        );
      } else if (type === 'attachment') {
        attachments.set(id, {
          id,
          parentId: Number(row[POST.parent]) || 0,
          mimeType: row[POST.mime],
          title: row[POST.title],
          attachedFile: null,
          width: null,
          height: null,
          filesize: null,
        });
      }
    },
  );

  await reader.forEachInsert(
    ['val_terms', 'val_term_taxonomy'],
    (table, _c, row) => {
      if (table === 'val_terms') {
        if (row.length < 3) return;
        termNames.set(Number(row[0]), {
          name: String(row[1]),
          slug: String(row[2]),
        });
        return;
      }
      if (row.length < 3) return;
      termTax.set(Number(row[0]), {
        termId: Number(row[1]),
        taxonomy: String(row[2]),
      });
    },
  );

  await reader.forEachInsert(['val_term_relationships'], (_t, _c, row) => {
    if (row.length < 2) return;
    const prop = properties.get(Number(row[0]));
    if (!prop) return;
    const tt = termTax.get(Number(row[1]));
    if (!tt) return;
    const term = termNames.get(tt.termId);
    const label = term ? term.name : `term:${tt.termId}`;
    if (!prop.taxonomies[tt.taxonomy]) prop.taxonomies[tt.taxonomy] = [];
    prop.taxonomies[tt.taxonomy].push(label);
  });

  await reader.forEachInsert(['val_postmeta'], (_t, _c, row) => {
    if (row.length < 4) return;
    const postId = Number(row[1]);
    const key = row[2];
    const value = row[3];
    if (!key) return;

    const attachment = attachments.get(postId);
    if (attachment) {
      if (key === '_wp_attached_file') attachment.attachedFile = value;
      if (key === '_wp_attachment_metadata' && value) {
        const w = /s:5:"width";i:(\d+)/.exec(value);
        const h = /s:6:"height";i:(\d+)/.exec(value);
        const fsMatch = /s:8:"filesize";i:(\d+)/.exec(value);
        if (w) attachment.width = Number(w[1]);
        if (h) attachment.height = Number(h[1]);
        if (fsMatch) attachment.filesize = Number(fsMatch[1]);
      }
      return;
    }

    const prop = properties.get(postId);
    if (!prop) return;
    if (key === '_thumbnail_id' && value) {
      prop.thumbnailId = Number(value);
    } else if (
      key === 'fave_property_images' &&
      value &&
      /^\d+$/.test(String(value).trim())
    ) {
      prop.galleryAttachmentIds.push(Number(String(value).trim()));
    } else {
      prop.meta[key] = value;
    }
  });

  return {
    tablePrefix: 'val_',
    properties,
    attachments,
    siteOptions,
    postTypeCounts,
  };
}
