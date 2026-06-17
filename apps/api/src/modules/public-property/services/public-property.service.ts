import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PropertyImage,
  PropertyListing,
  PropertyListingType,
  PropertyPrice,
} from '../../../../generated/prisma/client';
import {
  FeaturedPublicPropertiesQueryDto,
  ListPublicPropertiesQueryDto,
} from '../dto/public-property-query.dto';
import {
  PublicCoverImageDto,
  PublicPropertyCardDto,
  PublicPropertyDetailDto,
  PublicPropertyFeatureDto,
  PublicPropertyImageDto,
  PublicPropertyListResponseDto,
  PublicPropertyListingDto,
  PublicPropertyPrimaryPriceDto,
} from '../dto/public-property-response.dto';
import {
  PublicPropertyDetailRecord,
  PublicPropertyListRecord,
  PublicPropertyRepository,
  FeaturedListingRecord,
} from '../repositories/public-property.repository';

const LISTING_TYPE_PRIORITY: PropertyListingType[] = [
  PropertyListingType.SALE,
  PropertyListingType.RENT,
  PropertyListingType.TEMPORARY_RENT,
];

type PublishableListing = PropertyListing & {
  prices: PropertyPrice[];
};

@Injectable()
export class PublicPropertyService {
  constructor(
    private readonly publicPropertyRepository: PublicPropertyRepository,
  ) {}

  async findAll(
    query: ListPublicPropertiesQueryDto,
  ): Promise<PublicPropertyListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [properties, total] =
      await this.publicPropertyRepository.findManyPublic(
        query.tenantId,
        {
          listingType: query.listingType,
          propertyType: query.propertyType,
          city: query.city,
          neighborhood: query.neighborhood,
          priceMin: query.priceMin,
          priceMax: query.priceMax,
          currency: query.currency,
          bedrooms: query.bedrooms,
          bathrooms: query.bathrooms,
        },
        { page, limit },
      );

    const data = properties
      .map((property) => this.toCardDto(property, query.listingType))
      .filter((card): card is PublicPropertyCardDto => card !== null);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findFeatured(
    query: FeaturedPublicPropertiesQueryDto,
  ): Promise<PublicPropertyCardDto[]> {
    const limit = query.limit ?? 10;

    const listings = await this.publicPropertyRepository.findFeaturedPublic(
      query.tenantId,
      limit,
    );

    return listings
      .map((listing) => this.featuredListingToCardDto(listing))
      .filter((card): card is PublicPropertyCardDto => card !== null);
  }

  async findBySlug(
    slug: string,
    tenantId: string,
    listingType?: PropertyListingType,
  ): Promise<PublicPropertyDetailDto> {
    const property = await this.publicPropertyRepository.findBySlugPublic(
      tenantId,
      slug,
    );

    if (!property) {
      throw new NotFoundException(
        `Public property with slug "${slug}" not found`,
      );
    }

    return this.toDetailDto(property, listingType);
  }

  private toCardDto(
    property: PublicPropertyListRecord,
    preferredListingType?: PropertyListingType,
  ): PublicPropertyCardDto | null {
    const listing = this.selectPublishableListing(
      property.listings,
      preferredListingType,
    );
    const coverImage = property.images[0];
    const primaryPrice = listing?.prices[0];

    if (!listing || !coverImage || !primaryPrice) {
      return null;
    }

    return {
      id: property.id,
      slug: property.slug,
      title: property.title,
      description: property.description,
      propertyType: property.propertyType,
      city: property.city,
      neighborhood: property.neighborhood,
      coverImage: this.toCoverImageDto(coverImage),
      price: Number(primaryPrice.amount),
      currency: primaryPrice.currency,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      totalArea: property.totalArea != null ? Number(property.totalArea) : null,
      listingType: listing.listingType,
    };
  }

  private featuredListingToCardDto(
    listing: FeaturedListingRecord,
  ): PublicPropertyCardDto | null {
    const property = listing.property;
    const coverImage = property.images[0];
    const primaryPrice = listing.prices[0];

    if (!coverImage || !primaryPrice) {
      return null;
    }

    return {
      id: property.id,
      slug: property.slug,
      title: property.title,
      description: property.description,
      propertyType: property.propertyType,
      city: property.city,
      neighborhood: property.neighborhood,
      coverImage: this.toCoverImageDto(coverImage),
      price: Number(primaryPrice.amount),
      currency: primaryPrice.currency,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      totalArea: property.totalArea != null ? Number(property.totalArea) : null,
      listingType: listing.listingType,
    };
  }

  private toDetailDto(
    property: PublicPropertyDetailRecord,
    preferredListingType?: PropertyListingType,
  ): PublicPropertyDetailDto {
    const listing = this.selectPublishableListing(
      property.listings,
      preferredListingType,
    );
    const coverImage = property.images.find((image) => image.isCover);
    const primaryPrice = listing?.prices[0];

    if (!listing || !coverImage || !primaryPrice) {
      throw new NotFoundException(
        `Public property with slug "${property.slug}" is not publishable`,
      );
    }

    const primaryPriceDto = this.toPrimaryPriceDto(primaryPrice);
    const availableListingTypes = this.resolveAvailableListingTypes(property);

    return {
      id: property.id,
      slug: property.slug,
      title: property.title,
      description: property.description,
      propertyType: property.propertyType,
      city: property.city,
      neighborhood: property.neighborhood,
      province: property.province,
      country: property.country,
      latitude: property.latitude != null ? Number(property.latitude) : null,
      longitude: property.longitude != null ? Number(property.longitude) : null,
      condition: property.condition,
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      halfBathrooms: property.halfBathrooms,
      parkingSpaces: property.parkingSpaces,
      totalArea: property.totalArea != null ? Number(property.totalArea) : null,
      coveredArea:
        property.coveredArea != null ? Number(property.coveredArea) : null,
      uncoveredArea:
        property.uncoveredArea != null ? Number(property.uncoveredArea) : null,
      lotFront: property.lotFront != null ? Number(property.lotFront) : null,
      lotDepth: property.lotDepth != null ? Number(property.lotDepth) : null,
      yearBuilt: property.yearBuilt,
      orientation: property.orientation,
      layout: property.layout,
      brightness: property.brightness,
      coverImage: this.toCoverImageDto(coverImage),
      price: primaryPriceDto,
      listingType: listing.listingType,
      listing: this.toListingDto(listing, primaryPrice),
      gallery: property.images.map(this.toGalleryImageDto),
      features: property.featureAssignments
        .filter((assignment) => assignment.feature.isActive)
        .map(this.toFeatureDto),
      availableListingTypes,
    };
  }

  private resolveAvailableListingTypes(
    property: PublicPropertyDetailRecord,
  ): PropertyListingType[] {
    const hasCover = property.images.some((image) => image.isCover);

    if (!property.isActive || !hasCover) {
      return [];
    }

    const availableListingTypes: PropertyListingType[] = [];

    for (const listingType of LISTING_TYPE_PRIORITY) {
      const listing = property.listings.find(
        (entry) => entry.listingType === listingType && entry.prices.length > 0,
      );

      if (listing) {
        availableListingTypes.push(listingType);
      }
    }

    return availableListingTypes;
  }

  private selectPublishableListing(
    listings: PublishableListing[],
    preferredListingType?: PropertyListingType,
  ): PublishableListing | null {
    const publishable = listings.filter((listing) => listing.prices.length > 0);

    if (publishable.length === 0) {
      return null;
    }

    if (preferredListingType) {
      const preferred = publishable.find(
        (listing) => listing.listingType === preferredListingType,
      );

      return preferred ?? null;
    }

    for (const listingType of LISTING_TYPE_PRIORITY) {
      const match = publishable.find(
        (listing) => listing.listingType === listingType,
      );

      if (match) {
        return match;
      }
    }

    return publishable[0] ?? null;
  }

  private toCoverImageDto(image: PropertyImage): PublicCoverImageDto {
    return {
      url: image.url,
      storageKey: image.storageKey,
      altText: image.altText,
    };
  }

  private toGalleryImageDto(image: PropertyImage): PublicPropertyImageDto {
    return {
      id: image.id,
      url: image.url,
      storageKey: image.storageKey,
      altText: image.altText,
      sortOrder: image.sortOrder,
      isCover: image.isCover,
    };
  }

  private toPrimaryPriceDto(
    price: PropertyPrice,
  ): PublicPropertyPrimaryPriceDto {
    return {
      amount: Number(price.amount),
      currency: price.currency,
      label: price.label,
    };
  }

  private toListingDto(
    listing: PublishableListing,
    primaryPrice: PropertyPrice,
  ): PublicPropertyListingDto {
    return {
      id: listing.id,
      listingType: listing.listingType,
      isFeatured: listing.isFeatured,
      publishedAt: listing.publishedAt,
      expensesAmount:
        listing.expensesAmount != null ? Number(listing.expensesAmount) : null,
      expensesCurrency: listing.expensesCurrency,
      primaryPrice: this.toPrimaryPriceDto(primaryPrice),
    };
  }

  private toFeatureDto(
    assignment: PublicPropertyDetailRecord['featureAssignments'][number],
  ): PublicPropertyFeatureDto {
    return {
      id: assignment.feature.id,
      name: assignment.feature.name,
      slug: assignment.feature.slug,
      category: assignment.feature.category,
      value: assignment.value,
    };
  }
}
