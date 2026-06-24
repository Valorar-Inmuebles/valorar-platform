import { Icon, type IconProps } from "./icon";

/** Placeholder — implement full path in future iteration */
export function DevelopmentIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20V8l8-5 8 5v12" />
      <path d="M4 20h16M9 20v-6h6v6" />
    </Icon>
  );
}
