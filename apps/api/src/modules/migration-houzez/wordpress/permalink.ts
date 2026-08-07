import type { WordpressSiteOptions } from '../types';

export type OldUrlReconstruction = {
  status: 'verified' | 'unverified' | 'unavailable';
  oldSlug: string | null;
  postDate: string | null;
  oldUrl: string | null;
  components: Record<string, string | null>;
  notes: string[];
};

/**
 * Reconstruct historical public URL from WordPress options + post fields.
 * Does not invent a URL when permalink tokens cannot be resolved safely.
 */
export function reconstructOldUrl(input: {
  site: WordpressSiteOptions;
  slug: string | null | undefined;
  postDate: string | null | undefined;
}): OldUrlReconstruction {
  const notes: string[] = [];
  const slug = input.slug?.trim() || null;
  const postDate = input.postDate?.trim() || null;
  const home = trimSlash(input.site.home);
  const siteurl = trimSlash(input.site.siteurl);
  const base = home || siteurl;
  const structure = input.site.permalinkStructure?.trim() || null;

  const components: Record<string, string | null> = {
    home: input.site.home,
    siteurl: input.site.siteurl,
    permalink_structure: structure,
    post_name: slug,
    post_date: postDate,
  };

  if (!slug) {
    notes.push('Missing post_name/slug; cannot build oldUrl.');
    return {
      status: 'unavailable',
      oldSlug: null,
      postDate,
      oldUrl: null,
      components,
      notes,
    };
  }

  if (!base) {
    notes.push('Missing home/siteurl; oldUrl left unverified.');
    return {
      status: 'unverified',
      oldSlug: slug,
      postDate,
      oldUrl: null,
      components,
      notes,
    };
  }

  if (!structure) {
    notes.push(
      'permalink_structure empty; WordPress may use plain ?p=ID links.',
    );
    return {
      status: 'unverified',
      oldSlug: slug,
      postDate,
      oldUrl: null,
      components,
      notes,
    };
  }

  const dateParts = parseWpDate(postDate);
  if (structureIncludesDateTokens(structure) && !dateParts) {
    notes.push(
      `permalink_structure "${structure}" requires post_date tokens but post_date is missing/invalid.`,
    );
    return {
      status: 'unverified',
      oldSlug: slug,
      postDate,
      oldUrl: null,
      components,
      notes,
    };
  }

  if (structureIncludesUnsupportedTokens(structure)) {
    notes.push(
      `permalink_structure contains unsupported tokens for deterministic rebuild: ${structure}`,
    );
    return {
      status: 'unverified',
      oldSlug: slug,
      postDate,
      oldUrl: null,
      components,
      notes,
    };
  }

  let pathPart = structure;
  pathPart = pathPart.replaceAll('%year%', dateParts?.year ?? '');
  pathPart = pathPart.replaceAll('%monthnum%', dateParts?.month ?? '');
  pathPart = pathPart.replaceAll('%day%', dateParts?.day ?? '');
  pathPart = pathPart.replaceAll('%postname%', slug);
  pathPart = pathPart.replaceAll('%category%', ''); // unsupported → already guarded
  pathPart = pathPart.replace(/^\/+/, '').replace(/\/+$/, '');

  const oldUrl = `${base}/${pathPart}/`;
  notes.push(
    `Rebuilt from permalink_structure="${structure}" and base="${base}".`,
  );

  return {
    status: 'verified',
    oldSlug: slug,
    postDate,
    oldUrl,
    components: {
      ...components,
      year: dateParts?.year ?? null,
      monthnum: dateParts?.month ?? null,
      day: dateParts?.day ?? null,
    },
    notes,
  };
}

function trimSlash(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.replace(/\/+$/, '');
}

function parseWpDate(
  postDate: string | null | undefined,
): { year: string; month: string; day: string } | null {
  if (!postDate) return null;
  // MySQL datetime: YYYY-MM-DD HH:MM:SS
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(postDate);
  if (!m) return null;
  return { year: m[1], month: m[2], day: m[3] };
}

function structureIncludesDateTokens(structure: string): boolean {
  return /%(year|monthnum|day)%/.test(structure);
}

function structureIncludesUnsupportedTokens(structure: string): boolean {
  const supported = new Set([
    '%year%',
    '%monthnum%',
    '%day%',
    '%hour%',
    '%minute%',
    '%second%',
    '%postname%',
    '%post_id%',
  ]);
  const tokens = structure.match(/%[a-z0-9_]+%/gi) ?? [];
  return tokens.some((t) => {
    if (t === '%category%' || t === '%author%' || t === '%tag%') return true;
    // hour/minute/second/post_id could be supported later; treat as unsupported for certainty
    if (
      t === '%hour%' ||
      t === '%minute%' ||
      t === '%second%' ||
      t === '%post_id%'
    )
      return true;
    return (
      !supported.has(t) &&
      t !== '%year%' &&
      t !== '%monthnum%' &&
      t !== '%day%' &&
      t !== '%postname%'
    );
  });
}
