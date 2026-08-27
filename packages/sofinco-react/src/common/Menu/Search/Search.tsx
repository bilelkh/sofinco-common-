import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

import Panel from "./Panel";
import Input from "./Input";
import { trackEvent } from "@shared/analytics";

import type { SearchProps, SearchResult } from "./Search.type";
import styles from "./Search.module.css";
import Dialog from "./Dialog";
import { MEDIUM_DOWN_QUERY, useMediaQuery } from "@shared/hooks/useMediaQuery";

/**
 * The JSON view is rendered server-side through React's `renderToString`, which
 * HTML-escapes `&`, `<`, `>` in text. Restore them on the raw response before
 * `JSON.parse` so values (and `href` query strings) stay intact. Decode `&amp;`
 * last to avoid double-decoding.
 */
const decodeEntities = (raw: string): string =>
  raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");

export default function Search({
  action,
  placeholder = "Rechercher",
  allResultsLabel = "Voir tous les résultats",
  allResultsHref,
  suggestions = [],
  results = [],
  searchEndpoint,
  minLetters = 3,
  maxSuggestions = 5,
  className,
}: SearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [liveResults, setLiveResults] = useState<SearchResult[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

    const isMobile = useMediaQuery(MEDIUM_DOWN_QUERY);

  // Live suggestions: debounced fetch of the siteSearchBlock `.json` view.
  const liveEnabled =
    Boolean(searchEndpoint) && query.trim().length >= minLetters;

  useEffect(() => {
    // Below threshold / no endpoint: nothing to fetch. We don't clear `liveResults`
    // here (that would be a synchronous set in an effect) — `effectiveResults` already
    // falls back to the static `results` whenever `liveEnabled` is false.
    if (!searchEndpoint || query.trim().length < minLetters) {
      return;
    }
    let ignore = false;
    const timer = setTimeout(async () => {
      try {
        const url = `${searchEndpoint}?query=${encodeURIComponent(query.trim())}&limit=${maxSuggestions}`;
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
        });
        // The `suggest` view is an HTML view emitting JSON, so the body is wrapped
        // (`<!DOCTYPE html>…`) and React entity-encodes the quotes. Slice the JSON
        // object out (first `{` … last `}`), decode entities, then parse. An
        // error-page / empty body yields no braces → JSON.parse throws → `catch`.
        const body = await response.text();
        const start = body.indexOf("{");
        const end = body.lastIndexOf("}");
        const json = JSON.parse(decodeEntities(body.slice(start, end + 1))) as {
          results?: Array<{
            title?: string;
            description?: string;
            href?: string;
            url?: string;
          }>;
        };
        const normalised: SearchResult[] = (json.results ?? []).map((r) => ({
          title: r.title ?? "",
          description: r.description ?? "",
          href: r.href ?? r.url ?? "#",
        }));
        if (!ignore) setLiveResults(normalised);
      } catch {
        if (!ignore) setLiveResults([]);
      }
    }, 250);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query, searchEndpoint, minLetters, maxSuggestions]);

  const effectiveResults = liveEnabled ? liveResults : results;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const submitHref = allResultsHref ?? action;
  const hasContent = suggestions.length > 0 || effectiveResults.length > 0;
  const isPanelOpen = open && hasContent;

  const fireSearch = (term: string) => {
    trackEvent({ event: "search_event", search_term: term });
  };

  if (isMobile) {
    return (
      <Dialog
        inputProps={{
          placeholder: placeholder,
          action: action,
          query: query,
          inputRef: inputRef,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            setQuery(e.target.value),
          onFocus: () => setOpen(true),
          onClick: () => setOpen(true),
          onSubmit: () => fireSearch(inputRef.current?.value ?? ""),
        }}
      >
        <Panel
          suggestions={suggestions}
          effectiveResults={effectiveResults}
          allResultsLabel={allResultsLabel}
          submitHref={submitHref}
          isOpen={isPanelOpen}
          fireSearch={fireSearch}
          inputRef={inputRef}
          role={isMobile ? "dialog" : "region"}
        />
      </Dialog>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={clsx(
        styles.search,
        isPanelOpen && styles["search--open"],
        className,
      )}
    >
      <Input
        onSubmit={() => fireSearch(inputRef.current?.value ?? "")}
        placeholder={placeholder}
        action={action}
        query={query}
        inputRef={inputRef}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setQuery(e.target.value)
        }
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
      />

      <Panel
        suggestions={suggestions}
        effectiveResults={effectiveResults}
        allResultsLabel={allResultsLabel}
        submitHref={submitHref}
        isOpen={isPanelOpen}
        fireSearch={fireSearch}
        inputRef={inputRef}
        role={isMobile ? "dialog" : "region"}
      />
    </div>
  );
}
