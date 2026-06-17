import { describe, expect, it } from 'vitest';
import {
  evaluateActivationChecklist,
  evaluateListingPublishability,
  evaluatePropertyPublishability,
} from './evaluate-publication-checks';

const completeInput = {
  propertyIsActive: true,
  imageCount: 3,
  hasCoverImage: true,
  listingStatus: 'ACTIVE',
  hasPrimaryPrice: true,
};

describe('evaluatePropertyPublishability', () => {
  it('returns publishable when property-level checks pass', () => {
    const result = evaluatePropertyPublishability({
      propertyIsActive: true,
      imageCount: 2,
      hasCoverImage: true,
    });

    expect(result.isPublishable).toBe(true);
    expect(result.progress).toBe(100);
    expect(result.missing).toEqual([]);
    expect(result.checks).toHaveLength(3);
  });

  it('flags missing image', () => {
    const result = evaluatePropertyPublishability({
      propertyIsActive: true,
      imageCount: 0,
      hasCoverImage: false,
    });

    expect(result.isPublishable).toBe(false);
    expect(result.missing).toContain('has-image');
    expect(result.missing).toContain('cover-image');
  });

  it('flags missing cover when images exist', () => {
    const result = evaluatePropertyPublishability({
      propertyIsActive: true,
      imageCount: 1,
      hasCoverImage: false,
    });

    expect(result.isPublishable).toBe(false);
    expect(result.missing).toEqual(['cover-image']);
  });
});

describe('evaluateListingPublishability', () => {
  it('returns publishable when all visibility checks pass', () => {
    const result = evaluateListingPublishability(completeInput);

    expect(result.isPublishable).toBe(true);
    expect(result.progress).toBe(100);
    expect(result.missing).toEqual([]);
    expect(result.checks).toHaveLength(5);
  });

  it('flags missing primary price', () => {
    const result = evaluateListingPublishability({
      ...completeInput,
      hasPrimaryPrice: false,
    });

    expect(result.isPublishable).toBe(false);
    expect(result.missing).toEqual(['primary-price']);
    expect(result.checks.find((c) => c.key === 'primary-price')?.message).toBe(
      'Definí un precio principal',
    );
  });

  it('flags inactive listing for visibility', () => {
    const result = evaluateListingPublishability({
      ...completeInput,
      listingStatus: 'DRAFT',
    });

    expect(result.isPublishable).toBe(false);
    expect(result.missing).toContain('listing-active');
  });
});

describe('evaluateActivationChecklist', () => {
  it('passes when activation requirements are met', () => {
    const result = evaluateActivationChecklist({
      ...completeInput,
      listingStatus: 'DRAFT',
    });

    expect(result.isPublishable).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.checks.map((c) => c.key)).not.toContain('listing-active');
  });

  it('fails activation without cover and primary price', () => {
    const result = evaluateActivationChecklist({
      propertyIsActive: true,
      imageCount: 0,
      hasCoverImage: false,
      listingStatus: 'DRAFT',
      hasPrimaryPrice: false,
    });

    expect(result.isPublishable).toBe(false);
    expect(result.missing).toEqual([
      'has-image',
      'cover-image',
      'primary-price',
    ]);
  });
});
