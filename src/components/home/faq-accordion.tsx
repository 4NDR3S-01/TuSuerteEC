"use client";

import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: ReadonlyArray<FaqItem>;
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <article
            key={item.question}
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] transition-transform hover:-translate-y-1 hover:shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]"
          >
            <button
              type="button"
              onClick={() => toggleItem(index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-[color:var(--foreground)] sm:text-base">
                {item.question}
              </span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--border)] text-xs transition-transform ${
                  isOpen ? "rotate-45" : ""
                }`}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            <div
              className={`grid overflow-hidden px-5 transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
                {item.answer}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
