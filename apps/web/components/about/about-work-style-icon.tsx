import { Icon, type IconProps } from "@/components/icons";
import type { AboutWorkStyleIconName } from "@/lib/about/about-content";

type AboutWorkStyleIconProps = IconProps & {
  name: AboutWorkStyleIconName;
};

export function AboutWorkStyleIcon({ name, ...props }: AboutWorkStyleIconProps) {
  switch (name) {
    case "experience":
      return (
        <Icon {...props}>
          <path d="M12 3v18" />
          <path d="M5 7h14" />
          <path d="M7 7 5 21h4l1.5-6" />
          <path d="M17 7 19 21h-4l-1.5-6" />
        </Icon>
      );
    case "personal":
      return (
        <Icon {...props}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="8" r="4" />
        </Icon>
      );
    case "integral":
      return (
        <Icon {...props}>
          <path d="M4 20V8l8-4 8 4v12" />
          <path d="M9 20v-6h6v6" />
          <path d="M9 10h6" />
        </Icon>
      );
    case "trust":
      return (
        <Icon {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </Icon>
      );
  }
}
