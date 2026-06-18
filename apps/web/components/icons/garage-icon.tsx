import { Icon, type IconProps } from "./icon";

/** Placeholder — implement full path in future iteration */
export function GarageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 10l9-7 9 7" />
      <rect x="4" y="10" width="16" height="10" rx="1" />
      <path d="M9 15h6v5H9z" />
    </Icon>
  );
}
