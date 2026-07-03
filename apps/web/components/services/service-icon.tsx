import { Icon, type IconProps } from "@/components/icons";
import type { ServiceIconName } from "@/lib/services/services-content";

type ServiceIconProps = IconProps & {
  name: ServiceIconName;
};

export function ServiceIcon({ name, ...props }: ServiceIconProps) {
  switch (name) {
    case "rental-admin":
      return (
        <Icon {...props}>
          <path d="M7 3h10v4H7z" />
          <path d="M5 7h14v14H5z" />
          <path d="M9 11h6" />
          <path d="M9 15h4" />
        </Icon>
      );
    case "buy-sell":
      return (
        <Icon {...props}>
          <path d="M3 10.5 7.5 6 12 10.5" />
          <path d="M7.5 6v14" />
          <path d="M21 13.5 16.5 18 12 13.5" />
          <path d="M16.5 18V4" />
        </Icon>
      );
    case "accounting":
      return (
        <Icon {...props}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8" />
          <path d="M8 11h3" />
          <path d="M13 11h3" />
          <path d="M8 15h3" />
          <path d="M13 15h3" />
        </Icon>
      );
    case "legal":
      return (
        <Icon {...props}>
          <path d="M12 3v18" />
          <path d="M5 7h14" />
          <path d="M7 7 5 21h4l1.5-6" />
          <path d="M17 7 19 21h-4l-1.5-6" />
        </Icon>
      );
    case "credit":
      return (
        <Icon {...props}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 15h4" />
        </Icon>
      );
    case "architecture":
      return (
        <Icon {...props}>
          <path d="M4 20h16" />
          <path d="M6 20V9l6-4 6 4v11" />
          <path d="M10 20v-5h4v5" />
          <path d="M9 12h6" />
        </Icon>
      );
    case "consortium":
      return (
        <Icon {...props}>
          <path d="M4 20V8l8-4 8 4v12" />
          <path d="M9 20v-6h6v6" />
          <path d="M9 10h6" />
          <path d="M9 14h6" />
        </Icon>
      );
    case "developers":
      return (
        <Icon {...props}>
          <path d="M4 20h16" />
          <path d="M6 20V10l4-3 4 3v10" />
          <path d="M14 20V8l4-3v15" />
          <path d="M10 13h2" />
        </Icon>
      );
  }
}
