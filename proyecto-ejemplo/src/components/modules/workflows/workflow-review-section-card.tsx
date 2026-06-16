"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContextIcon, type ContextIconTone } from "@/components/ui/context-icon";
import { Icon } from "@/components/ui/icons";

type Props = {
  title: string;
  meta?: string;
  tone: ContextIconTone;
  icon: ReactNode;
  stepIndex: number;
  readonly?: boolean;
  onEditStep: (stepIndex: number) => void;
  children?: ReactNode;
};

export function WorkflowReviewSectionCard({
  title,
  meta,
  tone,
  icon,
  stepIndex,
  readonly = false,
  onEditStep,
  children,
}: Props) {
  return (
    <Card flat className="overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-2.5">
        <ContextIcon tone={tone} size="sm">
          {icon}
        </ContextIcon>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium leading-snug text-zinc-900">
              {title}
              {meta ? (
                <span className="font-normal text-zinc-500"> {meta}</span>
              ) : null}
            </p>
            {!readonly ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2 text-zinc-500 hover:text-zinc-800"
                leftIcon={<Icon.Edit className="size-3.5" />}
                onClick={() => onEditStep(stepIndex)}
              >
                Editar
              </Button>
            ) : null}
          </div>

          {children ? <div className="mt-1.5">{children}</div> : null}
        </div>
      </div>
    </Card>
  );
}
