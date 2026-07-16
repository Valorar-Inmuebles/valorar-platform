import {
  BriefcaseBusiness,
  Building,
  Building2,
  CarFront,
  Factory,
  Home,
  House,
  Map,
  MoreHorizontal,
  Store,
  Trees,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { PropertyType } from "@repo/shared-types";

/**
 * Official Valorar property-type icons.
 * Same marks used by the public "Tipo de propiedad" selector.
 */
export const PROPERTY_TYPE_ICONS: Record<PropertyType, LucideIcon> = {
  HOUSE: House,
  APARTMENT: Building2,
  PH: Home,
  OFFICE: BriefcaseBusiness,
  COMMERCIAL: Store,
  LAND: Map,
  GARAGE: CarFront,
  WAREHOUSE: Warehouse,
  FIELD: Trees,
  COUNTRY_HOUSE: Home,
  INDUSTRIAL: Factory,
  OTHER: MoreHorizontal,
};

/** Emprendimientos — same Lucide Building mark as public web navigation. */
export const DEVELOPMENT_ICON: LucideIcon = Building;

/** @deprecated Prefer DEVELOPMENT_ICON */
export const DEVELOPMENT_CATEGORY_ICON = DEVELOPMENT_ICON;
