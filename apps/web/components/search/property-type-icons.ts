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

/** Shared property-type icons used by the Tipo de propiedad select and category cards. */
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

/** Emprendimientos category / nav — same Lucide Building mark as site navigation. */
export const DEVELOPMENT_CATEGORY_ICON: LucideIcon = Building;
