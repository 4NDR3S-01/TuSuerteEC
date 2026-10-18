"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { FaqAccordion } from "../home/faq-accordion";
import { inputStyles } from "../ui/kit";

type Props = {
  entries: ReadonlyArray<{ question: string; answer: string }>;
};

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function FaqSearch({ entries }: Readonly<Props>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query).trim();
    if (!q) return entries;
    return entries.filter((entry) => normalize(entry.question).includes(q) || normalize(entry.answer).includes(q));
  }, [entries, query]);

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Buscar en las preguntas frecuentes</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca por ejemplo: pago, ganador, contraseña"
          className={`${inputStyles} pl-10`}
        />
      </label>
      <p className="text-sm text-[color:var(--muted-foreground)]" aria-live="polite">
        {filtered.length === 0 ? "No encontramos preguntas con esas palabras." : `${filtered.length} pregunta(s)`}
      </p>
      {filtered.length > 0 && <FaqAccordion items={filtered} />}
    </div>
  );
}
