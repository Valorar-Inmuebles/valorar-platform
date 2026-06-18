import { Icon, type IconProps } from "./icon";

export function BedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 7v11M3 7h18v11M3 7V5a2 2 0 0 1 2-2h3M21 7V5a2 2 0 0 0-2-2h-3" />
      <path d="M7 11h4M13 11h4" />
    </Icon>
  );
}
