import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./lib/cn";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-xl border border-gray-200 bg-white", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return (
    <h2
      className={cn(
        "text-md font-semibold tracking-tight text-gray-900",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeaderActions({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>{children}</div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardList({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("divide-y divide-gray-200", className)} {...props}>
      {children}
    </div>
  );
}

export function CardListItem({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-5 py-2.5 text-sm text-gray-900 transition-colors duration-100 hover:bg-gray-50",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
