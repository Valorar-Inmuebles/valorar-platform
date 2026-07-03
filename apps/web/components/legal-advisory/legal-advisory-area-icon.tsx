import { Icon, type IconProps } from "@/components/icons";
import type { LegalAdvisoryAreaIconName } from "@/lib/legal-advisory/legal-advisory-content";

type LegalAdvisoryAreaIconProps = IconProps & {
  name: LegalAdvisoryAreaIconName;
};

export function LegalAdvisoryAreaIcon({
  name,
  ...props
}: LegalAdvisoryAreaIconProps) {
  switch (name) {
    case "real-estate":
      return (
        <Icon {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
          <path d="M9 20v-6h6v6" />
        </Icon>
      );
    case "succession":
      return (
        <Icon {...props}>
          <path d="M12 3v18" />
          <path d="M5 7h14" />
          <path d="M7 7 5 21h4l1.5-6" />
          <path d="M17 7 19 21h-4l-1.5-6" />
        </Icon>
      );
    case "corporate":
      return (
        <Icon {...props}>
          <path d="M4 20V8l8-4 8 4v12" />
          <path d="M9 20v-6h6v6" />
          <path d="M9 10h6" />
          <path d="M9 14h6" />
        </Icon>
      );
    case "intellectual-property":
      return (
        <Icon {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </Icon>
      );
  }
}
