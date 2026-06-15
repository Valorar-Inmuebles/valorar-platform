"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { searchClientes } from "@/lib/api/cliente.api";
import { SearchInput } from "@/components/ui/search-input";

const MIN_QUERY = 2;
const SEARCH_DEBOUNCE_MS = 300;

export type AnsesClienteResult = {
  id: string;
  label: string;
};

type AnsesClienteSearchProps = {
  onSelect: (cliente: AnsesClienteResult) => void;
  containerClassName?: string;
  placeholder?: string;
};

export function AnsesClienteSearch({
  onSelect,
  containerClassName = "max-w-xl",
  placeholder = "Buscar cliente por nombre o apellido",
}: AnsesClienteSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnsesClienteResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSearchRef = useRef(false);
  const searchRequestIdRef = useRef(0);

  const trimmedQuery = query.trim();
  const isQueryActive = trimmedQuery.length >= MIN_QUERY;

  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < MIN_QUERY) {
      setResults([]);
      setShowDropdown(false);
      setHasSearched(false);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    setSearching(true);
    setShowDropdown(true);
    try {
      const rows = await searchClientes(q);
      if (requestId !== searchRequestIdRef.current) return;
      setResults(rows);
      setShowDropdown(true);
    } catch {
      if (requestId !== searchRequestIdRef.current) return;
      setResults([]);
      setShowDropdown(true);
    } finally {
      if (requestId !== searchRequestIdRef.current) return;
      setSearching(false);
      setHasSearched(true);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (skipSearchRef.current) {
      return;
    }

    if (!isQueryActive) {
      setResults([]);
      setShowDropdown(false);
      setHasSearched(false);
      return;
    }

    setHasSearched(false);
    setShowDropdown(true);

    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isQueryActive, runSearch]);

  const isLoadingPanel = searching || !hasSearched;
  const showPanel = showDropdown && isQueryActive;

  function handleSelect(cliente: AnsesClienteResult) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchRequestIdRef.current += 1;
    skipSearchRef.current = true;
    setQuery(cliente.label);
    setShowDropdown(false);
    setResults([]);
    setSearching(false);
    setHasSearched(false);
    onSelect(cliente);
  }

  return (
    <div className={`relative ${containerClassName}`}>
      <SearchInput
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          skipSearchRef.current = false;
          setQuery(e.target.value);
        }}
        onFocus={() => {
          if (isQueryActive) setShowDropdown(true);
        }}
        onBlur={() => {
          setTimeout(() => setShowDropdown(false), 150);
        }}
        autoComplete="off"
        aria-expanded={showPanel}
        aria-haspopup="listbox"
        aria-autocomplete="list"
      />

      {showPanel && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-zinc-200/90 bg-white/95 py-1.5 shadow-xl shadow-zinc-900/[0.08] ring-1 ring-zinc-900/[0.04] backdrop-blur-md"
        >
          {isLoadingPanel && (
            <p className="px-3 py-2 text-sm text-zinc-400">Buscando clientes…</p>
          )}

          {!isLoadingPanel && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-zinc-400">
              No se encontraron clientes.
            </p>
          )}

          {!isLoadingPanel &&
            results.map((cliente) => (
              <div
                key={cliente.id}
                role="option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(cliente);
                }}
                className="mx-1 cursor-pointer select-none rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors duration-100 hover:bg-zinc-50 hover:text-zinc-900"
              >
                <span className="truncate">{cliente.label}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
