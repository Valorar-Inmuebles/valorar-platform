import { describe, expect, it } from 'vitest';
import {
  evaluatePropertyAttention,
  propertyRecentlyArchivedThreshold,
  type PropertyAttentionFacts,
} from './property-attention';

const now = new Date('2026-10-07T12:00:00.000Z');
const complete: PropertyAttentionFacts = {
  isActive: true,
  updatedAt: now,
  description: 'x'.repeat(40),
  imageCount: 1,
  listingCount: 1,
  featureCount: 1,
  isAnyPublishable: true,
  hasActiveListingWithoutPrimaryPrice: false,
};

describe('Property attention predicates', () => {
  it.each([
    [null, true],
    ['', true],
    [' \t\n\u00a0', true],
    ['x'.repeat(39), true],
    ['x'.repeat(40), false],
    [` \n${'x'.repeat(39)}\u00a0`, true],
    [`\u00a0${'x'.repeat(40)}\n`, false],
    ['😀'.repeat(20), false],
  ] as const)(
    'preserves trim/UTF-16 length for description %j',
    (description, expected) => {
      expect(
        evaluatePropertyAttention({ ...complete, description }, now)[
          'without-description'
        ],
      ).toBe(expected);
    },
  );

  it('distinguishes no commercialization from pending publication', () => {
    expect(
      evaluatePropertyAttention(
        { ...complete, listingCount: 0, isAnyPublishable: false },
        now,
      ),
    ).toMatchObject({
      'without-commercialization': true,
      'pending-publication': false,
      'without-price': false,
    });
    expect(
      evaluatePropertyAttention({ ...complete, isAnyPublishable: false }, now),
    ).toMatchObject({
      'without-commercialization': false,
      'pending-publication': true,
    });
  });

  it('can require attention on one operation even while another is published', () => {
    expect(
      evaluatePropertyAttention(
        {
          ...complete,
          listingCount: 2,
          hasActiveListingWithoutPrimaryPrice: true,
        },
        now,
      ),
    ).toMatchObject({
      'pending-publication': false,
      'without-price': true,
    });
  });

  it('counts missing images and assignments independently of publication', () => {
    expect(
      evaluatePropertyAttention(
        {
          ...complete,
          imageCount: 0,
          featureCount: 0,
          isAnyPublishable: false,
        },
        now,
      ),
    ).toMatchObject({
      'without-images': true,
      'without-features': true,
      'pending-publication': true,
    });
    expect(
      evaluatePropertyAttention(
        { ...complete, imageCount: 1, isAnyPublishable: false },
        now,
      )['without-images'],
    ).toBe(false);
  });

  it('archived properties only qualify for recently archived', () => {
    expect(
      evaluatePropertyAttention(
        {
          ...complete,
          isActive: false,
          description: null,
          imageCount: 0,
          listingCount: 0,
          featureCount: 0,
          isAnyPublishable: false,
          hasActiveListingWithoutPrimaryPrice: true,
        },
        now,
      ),
    ).toEqual({
      'without-images': false,
      'without-commercialization': false,
      'without-description': false,
      'without-features': false,
      'pending-publication': false,
      'without-price': false,
      'recently-archived': true,
    });
  });

  it('keeps the inclusive calendar threshold, no upper bound, and an immutable clock', () => {
    const localNow = new Date(2026, 9, 7, 12, 30);
    const original = localNow.getTime();
    const threshold = propertyRecentlyArchivedThreshold(localNow);
    expect(threshold).toEqual(new Date(2026, 8, 7, 12, 30));
    for (const [updatedAt, expected] of [
      [new Date(threshold.getTime() - 1), false],
      [threshold, true],
      [new Date(localNow.getTime() + 1), true],
    ] as const) {
      expect(
        evaluatePropertyAttention(
          { ...complete, isActive: false, updatedAt },
          localNow,
        )['recently-archived'],
      ).toBe(expected);
    }
    expect(evaluatePropertyAttention(complete, now)['recently-archived']).toBe(
      false,
    );
    expect(localNow.getTime()).toBe(original);
  });
});
