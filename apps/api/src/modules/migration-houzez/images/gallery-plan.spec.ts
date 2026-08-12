import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildGalleryPlan } from './gallery-plan';
import type { WordpressAttachmentRaw, WordpressPropertyRaw } from '../types';

describe('gallery plan', () => {
  it('preserves order, cover flag, hashes, and blocks over-limit', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-gal-'));
    const files = ['a.jpg', 'b.jpg', 'c.jpg'];
    for (const f of files) {
      fs.writeFileSync(path.join(tmp, f), `content-${f}`);
    }

    const attachments = new Map<number, WordpressAttachmentRaw>([
      [
        10,
        {
          id: 10,
          parentId: 1,
          mimeType: 'image/jpeg',
          title: 'a',
          attachedFile: 'a.jpg',
          width: 100,
          height: 80,
          filesize: 10,
        },
      ],
      [
        11,
        {
          id: 11,
          parentId: 1,
          mimeType: 'image/jpeg',
          title: 'b',
          attachedFile: 'b.jpg',
          width: 100,
          height: 80,
          filesize: 10,
        },
      ],
      [
        12,
        {
          id: 12,
          parentId: 1,
          mimeType: 'image/jpeg',
          title: 'c',
          attachedFile: 'c.jpg',
          width: 100,
          height: 80,
          filesize: 10,
        },
      ],
    ]);

    const property: WordpressPropertyRaw = {
      id: 1,
      status: 'publish',
      slug: 'x',
      title: 'x',
      content: null,
      postDate: null,
      authorId: null,
      taxonomies: {},
      meta: {},
      galleryAttachmentIds: [11, 10, 12],
      thumbnailId: 10,
    };

    const plan = buildGalleryPlan({
      property,
      attachments,
      uploadsDir: tmp,
      computeHash: true,
    });

    expect(plan.images.map((i) => i.attachmentId)).toEqual([11, 10, 12]);
    expect(plan.images.find((i) => i.attachmentId === 10)?.isCover).toBe(true);
    expect(plan.coverInGallery).toBe(true);
    expect(plan.coverPrepended).toBe(false);
    expect(plan.allOriginalsExist).toBe(true);
    expect(plan.images[0]?.sha256).toHaveLength(64);
    expect(plan.exceedsImageLimit).toBe(false);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('detects cover outside gallery and prepends it as warning (not blocker)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-gal-cover-'));
    fs.writeFileSync(path.join(tmp, 'cover.jpg'), 'cover');
    fs.writeFileSync(path.join(tmp, 'a.jpg'), 'a');
    const attachments = new Map<number, WordpressAttachmentRaw>([
      [
        99,
        {
          id: 99,
          parentId: 1,
          mimeType: 'image/jpeg',
          title: 'cover',
          attachedFile: 'cover.jpg',
          width: 10,
          height: 10,
          filesize: 5,
        },
      ],
      [
        11,
        {
          id: 11,
          parentId: 1,
          mimeType: 'image/jpeg',
          title: 'a',
          attachedFile: 'a.jpg',
          width: 10,
          height: 10,
          filesize: 1,
        },
      ],
    ]);
    const property: WordpressPropertyRaw = {
      id: 5312,
      status: 'publish',
      slug: 'x',
      title: 'x',
      content: null,
      postDate: null,
      authorId: null,
      taxonomies: {},
      meta: {},
      galleryAttachmentIds: [11],
      thumbnailId: 99,
    };
    const plan = buildGalleryPlan({
      property,
      attachments,
      uploadsDir: tmp,
      computeHash: false,
    });
    expect(plan.coverInGallery).toBe(false);
    expect(plan.coverPrepended).toBe(true);
    expect(plan.images.map((i) => i.attachmentId)).toEqual([99, 11]);
    expect(plan.images[0]?.isCover).toBe(true);
    expect(plan.galleryCount).toBe(1);
    expect(plan.uniqueCount).toBe(2);
    expect(plan.warnings.some((w) => w.code === 'COVER_NOT_IN_GALLERY')).toBe(
      true,
    );
    expect(
      plan.warnings.some((w) => w.code === 'GALLERY_FINAL_COUNT_DIFF'),
    ).toBe(true);
    expect(plan.blockers.some((b) => b.code === 'COVER_NOT_IN_GALLERY')).toBe(
      false,
    );
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('dedupes by hash and never drops cover', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-gal-hash-'));
    fs.writeFileSync(path.join(tmp, 'same.jpg'), 'identical-bytes');
    fs.writeFileSync(path.join(tmp, 'other.jpg'), 'other-bytes');
    const attachments = new Map<number, WordpressAttachmentRaw>([
      [
        1,
        {
          id: 1,
          parentId: 1,
          mimeType: 'image/jpeg',
          title: 'a',
          attachedFile: 'same.jpg',
          width: 1,
          height: 1,
          filesize: 1,
        },
      ],
      [
        2,
        {
          id: 2,
          parentId: 1,
          mimeType: 'image/jpeg',
          title: 'dup',
          attachedFile: 'same.jpg',
          width: 1,
          height: 1,
          filesize: 1,
        },
      ],
      [
        3,
        {
          id: 3,
          parentId: 1,
          mimeType: 'image/jpeg',
          title: 'b',
          attachedFile: 'other.jpg',
          width: 1,
          height: 1,
          filesize: 1,
        },
      ],
    ]);
    const property: WordpressPropertyRaw = {
      id: 1,
      status: 'publish',
      slug: 'x',
      title: 'x',
      content: null,
      postDate: null,
      authorId: null,
      taxonomies: {},
      meta: {},
      galleryAttachmentIds: [1, 2, 3],
      thumbnailId: 1,
    };
    const plan = buildGalleryPlan({
      property,
      attachments,
      uploadsDir: tmp,
      computeHash: true,
    });
    expect(plan.images.map((i) => i.attachmentId)).toEqual([1, 3]);
    expect(plan.images.find((i) => i.attachmentId === 1)?.isCover).toBe(true);
    expect(plan.warnings.some((w) => w.code === 'HASH_DEDUPE')).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('allows gallery of 33 under migration limit 60', () => {
    const ids = Array.from({ length: 33 }, (_, i) => i + 1);
    const attachments = new Map<number, WordpressAttachmentRaw>();
    for (const id of ids) {
      attachments.set(id, {
        id,
        parentId: 1,
        mimeType: 'image/jpeg',
        title: null,
        attachedFile: null,
        width: null,
        height: null,
        filesize: null,
      });
    }
    const property: WordpressPropertyRaw = {
      id: 12559,
      status: 'publish',
      slug: 'x',
      title: 'x',
      content: null,
      postDate: null,
      authorId: null,
      taxonomies: {},
      meta: {},
      galleryAttachmentIds: ids,
      thumbnailId: 1,
    };
    const plan = buildGalleryPlan({
      property,
      attachments,
      uploadsDir: os.tmpdir(),
      computeHash: false,
    });
    expect(plan.exceedsImageLimit).toBe(false);
    expect(plan.imageLimit).toBe(60);
    expect(plan.blockers.some((b) => b.code === 'GALLERY_EXCEEDS_LIMIT')).toBe(
      false,
    );
  });

  it('allows gallery of 40 under migration limit 60', () => {
    const ids = Array.from({ length: 40 }, (_, i) => i + 1);
    const attachments = new Map<number, WordpressAttachmentRaw>();
    for (const id of ids) {
      attachments.set(id, {
        id,
        parentId: 1,
        mimeType: 'image/jpeg',
        title: null,
        attachedFile: null,
        width: null,
        height: null,
        filesize: null,
      });
    }
    const property: WordpressPropertyRaw = {
      id: 11928,
      status: 'publish',
      slug: 'x',
      title: 'x',
      content: null,
      postDate: null,
      authorId: null,
      taxonomies: {},
      meta: {},
      galleryAttachmentIds: ids,
      thumbnailId: 1,
    };
    const plan = buildGalleryPlan({
      property,
      attachments,
      uploadsDir: os.tmpdir(),
      computeHash: false,
    });
    expect(plan.exceedsImageLimit).toBe(false);
    expect(plan.images).toHaveLength(40);
  });

  it('emits explicit blocker when gallery exceeds migration limit 60', () => {
    const ids = Array.from({ length: 61 }, (_, i) => i + 1);
    const attachments = new Map<number, WordpressAttachmentRaw>();
    for (const id of ids) {
      attachments.set(id, {
        id,
        parentId: 1,
        mimeType: 'image/jpeg',
        title: null,
        attachedFile: null,
        width: null,
        height: null,
        filesize: null,
      });
    }
    const property: WordpressPropertyRaw = {
      id: 99999,
      status: 'publish',
      slug: 'x',
      title: 'x',
      content: null,
      postDate: null,
      authorId: null,
      taxonomies: {},
      meta: {},
      galleryAttachmentIds: ids,
      thumbnailId: 1,
    };
    const plan = buildGalleryPlan({
      property,
      attachments,
      uploadsDir: os.tmpdir(),
      computeHash: false,
    });
    expect(plan.exceedsImageLimit).toBe(true);
    expect(plan.imageLimit).toBe(60);
    expect(plan.blockers.some((b) => b.code === 'GALLERY_EXCEEDS_LIMIT')).toBe(
      true,
    );
  });
});
