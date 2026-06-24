import { Icon, type IconProps } from "./icon";

/** Placeholder — implement full path in future iteration */
export function WhatsappIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21a9 9 0 1 0-7.7-13.6L3 21l3.7-1.2A9 9 0 0 0 12 21Z" />
      <path d="M9.5 10.5c.3.6 1.2 2 2.4 2.5 1 .4 1.5.3 2-.2" />
    </Icon>
  );
}
