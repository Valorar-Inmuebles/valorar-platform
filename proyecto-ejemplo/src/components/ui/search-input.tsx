import type { InputHTMLAttributes } from "react";
import { IconSearch } from "@/components/ui/icons";

export type SearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  containerClassName?: string;
};

export function SearchInput({
  className = "",
  containerClassName = "",
  ...props
}: SearchInputProps) {
  return (
    <div
      className={`group relative flex min-w-0 flex-1 max-w-lg items-center ${containerClassName}`}
    >
      <IconSearch className="pointer-events-none absolute left-3.5 size-4 text-zinc-400 transition-colors duration-200 group-focus-within:text-zinc-500" />
      <input
        type="search"
        className={`h-10 w-full rounded-xl border border-transparent bg-zinc-100/80 py-2 pl-10 pr-4 text-sm font-medium text-zinc-900 shadow-inner shadow-zinc-900/[0.03] outline-none transition-all duration-200 placeholder:font-normal placeholder:text-zinc-400 hover:bg-zinc-100 focus:border-indigo-200/80 focus:bg-white focus:shadow-md focus:shadow-zinc-900/[0.04] focus:ring-4 focus:ring-indigo-500/10 ${className}`}
        {...props}
      />
    </div>
  );
}
