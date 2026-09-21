import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Globe,
  Image,
  List,
  Pencil,
  Search,
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
  alert: AlertTriangle,
  building: Building2,
  calendar: CalendarDays,
  check: CheckCircle2,
  clock: Clock3,
  image: Image,
  list: List,
  publication: Globe,
  price: CircleDollarSign,
  search: Search,
  commercial: Store,
  edit: Pencil,
  sort: ArrowUpDown,
  sortAsc: ArrowUp,
  sortDesc: ArrowDown,
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
