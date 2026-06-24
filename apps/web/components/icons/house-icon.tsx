import { Icon, type IconProps } from "./icon";

/** Placeholder — implement full path in future iteration */
export function HouseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9 20v-6h6v6" />
    </Icon>
  );
}
