"use client";

import React, { useMemo, useState } from "react";

type Entry = {
  id: string;
  question: string;
  answer: string;
};

type Props = {
  entries: ReadonlyArray<Entry>;
};

export default function FaqSearch({ entries }: Readonly<Props>) {
  const [query, setQuery] = useState("");

  const normalized = (s: string) => s.toLowerCase();

  const filtered = useMemo(() => {
    const q = normalized(query).trim();
    if (!q) return entries;
    return entries.filter((e) => {
      return (
        normalized(e.question).includes(q) ||
        normalized(e.answer).includes(q)
      );
    });
  }, [entries, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca en preguntas frecuentes..."
          className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
          aria-label="Buscar en preguntas frecuentes"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm text-[color:var(--muted-foreground)]">
            No se encontraron resultados para «{query}». Intenta con otras palabras.
          </div>
        ) : (
          filtered.map((item) => (
            <details
              key={item.id}
              id={item.id}
              className="group rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4"
              aria-labelledby={`${item.id}-label`}
            >
              <summary
                id={`${item.id}-label`}
                className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold transition-colors group-open:text-[color:var(--accent)]"
              >
                <span>{item.question}</span>
                <span
                  className="ml-auto text-xl text-[color:var(--muted-foreground)] transition-transform group-open:rotate-180"
                  aria-hidden
                >
                  ▼
                </span>
              </summary>
              <div className="mt-3 border-t border-[color:var(--border)] pt-3 text-sm text-[color:var(--muted-foreground)]">
                {item.answer}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
