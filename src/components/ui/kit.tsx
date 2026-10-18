import * as React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Botones                                                                    */
/* -------------------------------------------------------------------------- */

export const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ring)] disabled:pointer-events-none disabled:opacity-55 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-[0_8px_20px_-8px_rgba(249,115,22,0.6)] hover:bg-[color:var(--accent-hover)] hover:-translate-y-0.5 active:translate-y-0',
        secondary:
          'border border-[color:var(--border-strong)] bg-[color:var(--card)] text-[color:var(--foreground)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]',
        ghost: 'text-[color:var(--foreground)] hover:bg-[color:var(--muted)]',
        brand: 'bg-[color:var(--brand)] text-[color:var(--brand-foreground)] hover:opacity-90',
        danger: 'bg-[color:var(--danger)] text-white hover:opacity-90',
        onDark: 'border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20',
        // Botón secundario sobre las superficies de la portada; se adapta al tema
        hero: 'border border-[color:var(--hero-border)] bg-[color:var(--hero-panel)] text-[color:var(--hero-fg)] backdrop-blur hover:border-[color:var(--accent)]',
      },
      size: {
        sm: 'h-9 px-3 text-sm [&_svg]:size-4',
        md: 'h-11 px-5 text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-5',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonStyleProps = VariantProps<typeof buttonStyles>;

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleProps>(
  ({ className, variant, size, block, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonStyles({ variant, size, block }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export function ButtonLink({
  className,
  variant,
  size,
  block,
  href,
  ...props
}: React.ComponentProps<typeof Link> & ButtonStyleProps) {
  return <Link href={href} className={cn(buttonStyles({ variant, size, block }), className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Superficies                                                                */
/* -------------------------------------------------------------------------- */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-[var(--shadow-card)]', className)}
      {...props}
    />
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  as: Heading = 'h2',
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', align === 'center' && 'items-center text-center sm:flex-col sm:items-center')}>
      <div className={cn('max-w-2xl space-y-2', align === 'center' && 'mx-auto')}>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">{eyebrow}</p>}
        <Heading className="text-2xl font-bold text-[color:var(--foreground)] sm:text-3xl">{title}</Heading>
        {description && <p className="text-sm text-[color:var(--muted-foreground)] sm:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--card)] px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[color:var(--muted)] text-[color:var(--muted-foreground)]">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-semibold text-[color:var(--foreground)]">{title}</p>
      {description && <p className="max-w-md text-sm text-[color:var(--muted-foreground)]">{description}</p>}
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Insignias                                                                  */
/* -------------------------------------------------------------------------- */

const badgeStyles = cva('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold [&_svg]:size-3.5', {
  variants: {
    tone: {
      neutral: 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)]',
      accent: 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]',
      success: 'bg-[color:var(--success-soft)] text-[color:var(--success)]',
      warning: 'bg-[color:var(--warning-soft)] text-[color:var(--warning)]',
      danger: 'bg-[color:var(--danger-soft)] text-[color:var(--danger)]',
      info: 'bg-[color:var(--info-soft)] text-[color:var(--info)]',
      onDark: 'bg-white/12 text-white ring-1 ring-white/20',
      hero: 'bg-[color:var(--hero-panel)] text-[color:var(--hero-fg)] ring-1 ring-[color:var(--hero-border)]',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeStyles>['tone']>;

export function Badge({ tone, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={cn(badgeStyles({ tone }), className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Formularios                                                                */
/* -------------------------------------------------------------------------- */

export const inputStyles =
  'w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition-shadow placeholder:text-[color:var(--muted-foreground)]/70 focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:opacity-60 aria-[invalid=true]:border-[color:var(--danger)]';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputStyles, className)} {...props} />
));
Input.displayName = 'Input';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-[color:var(--foreground)]">
        {label}
        {required && <span className="text-[color:var(--danger)]" aria-hidden> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-[color:var(--danger)]">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-[color:var(--muted-foreground)]">{hint}</p>
      )}
    </div>
  );
}

export function Notice({
  tone = 'info',
  icon: Icon,
  title,
  children,
  className,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  icon?: LucideIcon;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'border-[color:var(--info)]/25 bg-[color:var(--info-soft)] text-[color:var(--info)]',
    success: 'border-[color:var(--success)]/25 bg-[color:var(--success-soft)] text-[color:var(--success)]',
    warning: 'border-[color:var(--warning)]/25 bg-[color:var(--warning-soft)] text-[color:var(--warning)]',
    danger: 'border-[color:var(--danger)]/25 bg-[color:var(--danger-soft)] text-[color:var(--danger)]',
    neutral: 'border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--foreground)]',
  };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border p-4 text-sm', tones[tone], className)}>
      {Icon && <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />}
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-[color:var(--foreground)]/85">{children}</div>}
      </div>
    </div>
  );
}
