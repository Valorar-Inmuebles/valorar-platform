import {
  Archive,
  CircleDollarSign,
  FileText,
  Globe,
  Image,
  List,
  Pencil,
  Store,
  type LucideIcon,
} from "lucide-react";
import { PROPERTY_TYPE_ICONS } from "./property-type-icons";

/**
 * Shared Valorar system icons (same Lucide family as property types).
 * Prefer these over ad-hoc SVG copies in apps.
 */
export const SYSTEM_ICONS = {
  house: PROPERTY_TYPE_ICONS.HOUSE,
  document: FileText,
  archive: Archive,
  image: Image,
  list: List,
  publication: Globe,
  price: CircleDollarSign,
  commercial: Store,
  edit: Pencil,
} as const;

export type SystemIconName = keyof typeof SYSTEM_ICONS;

export type DashboardActivityIconType =
  | "property_created"
  | "property_updated"
  | "listing_published"
  | "listing_created"
  | "images_added"
  | "property_archived";

export const DASHBOARD_ACTIVITY_ICONS: Record<
  DashboardActivityIconType,
  LucideIcon
> = {
  property_created: SYSTEM_ICONS.house,
  property_updated: SYSTEM_ICONS.edit,
  listing_published: SYSTEM_ICONS.publication,
  listing_created: SYSTEM_ICONS.document,
  images_added: SYSTEM_ICONS.image,
  property_archived: SYSTEM_ICONS.archive,
};
