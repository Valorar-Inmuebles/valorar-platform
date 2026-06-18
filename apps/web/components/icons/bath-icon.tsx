import { Icon, type IconProps } from "./icon";

export function BathIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1Z" />
      <path d="M6 12V5a2 2 0 0 1 2-2h1" />
      <path d="M4 19v2M20 19v2" />
    </Icon>
  );
}
