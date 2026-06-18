import { Icon, type IconProps } from "./icon";

/** Placeholder — implement full path in future iteration */
export function ApartmentIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
    </Icon>
  );
}
