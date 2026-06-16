"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { apiClient } from "@/lib/api-client";

/**
 * LocationField — debounced free-text city typeahead backed by the
 * backend's `/search-locations` endpoint.
 *
 * Mirrors the visual + interaction model of ComboboxField in
 * profile-field.tsx (Label + Input + absolutely-positioned listbox of
 * <button role="option"> rows, same tokens), but the option source is
 * ASYNC: each keystroke (after a 300ms debounce) queries
 * `/search-locations?q=<query>` which returns the canonical
 * `long_friendly` strings ("Adrian, Missouri, United States").
 *
 * Picking a result calls `onSelect(longFriendly)`. The caller PATCHes
 * `location` with that exact string via useProfile().update — identical
 * to the country step — and the backend resolves person.coordinates +
 * location_short_friendly + location_long_friendly + country from it.
 *
 * Selection is intentionally NOT required: the field is a precision
 * refinement on top of the coordinates the country step already set.
 */
export function LocationField({
  id,
  label,
  description,
  placeholder = "Type your city or town",
  value,
  onSelect,
}: {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  /** The currently selected long_friendly string, shown when unfocused. */
  value?: string;
  onSelect: (longFriendly: string) => void;
}) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // While focused, the input shows the live query; otherwise it shows the
  // selected long_friendly string (or empty, so the placeholder shows).
  const inputValue = open ? query : value ?? "";

  // Debounced fetch. A bare query (<2 chars) clears results without a
  // round-trip; /search-locations trigram matching needs a few letters
  // to be useful and we avoid hammering the endpoint on the first
  // keystroke. The `cancelled` guard drops out-of-order responses so a
  // slow early request can't overwrite a fast later one.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      // Clearing stale results when the query is too short to search.
      // This is effect-driven sync against the query input, not a
      // cascading-render smell; the rule's generic warning doesn't apply.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    // Show the spinner immediately while the debounce window elapses; the
    // actual fetch + result write happen inside the debounced callback.
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await apiClient.get<string[]>(
          `/search-locations?q=${encodeURIComponent(q)}`,
        );
        if (!cancelled) setResults(res);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const pick = (longFriendly: string) => {
    onSelect(longFriendly);
    close();
  };

  const showList = open && query.trim().length >= 2;

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <Label htmlFor={id} className="text-meta text-(--ink)">
        {label}
      </Label>

      <div className="relative">
        <Input
          id={id}
          size="lg"
          tone="default"
          role="combobox"
          autoComplete="off"
          aria-expanded={showList}
          aria-controls={showList ? listboxId : undefined}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={inputValue}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          onBlur={(e) => {
            // Only close if focus left our container, so clicking an
            // option doesn't dismiss the list before its click fires.
            const next = e.relatedTarget as Node | null;
            if (!next || !containerRef.current?.contains(next)) {
              close();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className={loading ? "pr-11" : undefined}
        />

        {loading ? (
          <Loader2
            className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-(--ink-3)"
            aria-hidden
          />
        ) : null}

        {showList ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-border bg-(--card) py-1 shadow-lg"
          >
            {results.length === 0 ? (
              <p className="px-4 py-3 text-meta text-(--ink-3)">
                {loading ? "Searching…" : "No places match"}
              </p>
            ) : (
              results.map((place) => {
                const active = place === value;
                return (
                  <button
                    key={place}
                    type="button"
                    role="option"
                    aria-selected={active ? "true" : "false"}
                    // mousedown fires BEFORE the input's blur —
                    // preventDefault keeps the input focused so the pick
                    // path completes before the list closes.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(place)}
                    className={
                      active
                        ? "block w-full px-4 py-3 text-left text-body font-medium text-lime hover:bg-foreground/5"
                        : "block w-full px-4 py-3 text-left text-body text-(--ink) hover:bg-foreground/5"
                    }
                  >
                    {place}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      {description ? (
        <span className="text-caption text-(--ink-3)">{description}</span>
      ) : null}
    </div>
  );
}
