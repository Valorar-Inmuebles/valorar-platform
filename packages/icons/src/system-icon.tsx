import type { LucideProps } from "lucide-react";
import {
  DASHBOARD_ACTIVITY_ICONS,
  SYSTEM_ICONS,
  type DashboardActivityIconType,
  type SystemIconName,
} from "./system-icons";

export type SystemIconProps = LucideProps & {
  name: SystemIconName;
};

export function SystemIcon({ name, ...props }: SystemIconProps) {
  const Icon = SYSTEM_ICONS[name];
  return <Icon aria-hidden {...props} />;
}

export type ActivityIconProps = LucideProps & {
  type: DashboardActivityIconType;
};

export function ActivityIcon({ type, ...props }: ActivityIconProps) {
  const Icon = DASHBOARD_ACTIVITY_ICONS[type] ?? SYSTEM_ICONS.edit;
  return <Icon aria-hidden {...props} />;
}
