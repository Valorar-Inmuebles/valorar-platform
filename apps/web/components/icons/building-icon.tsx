import { Icon, type IconProps } from "./icon";

/** Placeholder — implement full path in future iteration */
export function BuildingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6" y="3" width="12" height="18" rx="1" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
    </Icon>
  );
}
