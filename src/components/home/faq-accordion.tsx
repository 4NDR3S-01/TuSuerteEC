import { ChevronDown } from 'lucide-react';

type FaqAccordionProps = {
  items: ReadonlyArray<{ question: string; answer: string }>;
};

/** Preguntas frecuentes con <details> nativo: accesible por teclado y sin JavaScript */
export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/50 [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown className="size-5 shrink-0 text-[color:var(--muted-foreground)] transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-[color:var(--muted-foreground)]">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
