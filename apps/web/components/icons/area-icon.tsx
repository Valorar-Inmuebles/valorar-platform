import { Icon, type IconProps } from "./icon";

export function AreaIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M3 9h18M9 3v18" />
    </Icon>
  );
}
