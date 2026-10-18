import Link from 'next/link';
import { Clover } from 'lucide-react';

type LogoProps = {
  href?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  /** Texto claro para fondos oscuros */
  inverted?: boolean;
};

const sizes = {
  sm: { box: 'size-7', icon: 'size-4', text: 'text-base' },
  md: { box: 'size-9', icon: 'size-5', text: 'text-lg' },
  lg: { box: 'size-11', icon: 'size-6', text: 'text-xl' },
};

export function Logo({ href = '/', size = 'md', showText = true, className = '', inverted = false }: LogoProps) {
  const sizeConfig = sizes[size];

  const content = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className={`flex ${sizeConfig.box} items-center justify-center rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-[0_6px_16px_-6px_rgba(249,115,22,0.7)]`}>
        <Clover className={sizeConfig.icon} strokeWidth={2.4} aria-hidden />
      </span>
      {showText && (
        <span className={`font-display font-extrabold tracking-tight ${sizeConfig.text} ${inverted ? 'text-white' : 'text-[color:var(--foreground)]'}`}>
          Tu<span className="text-[color:var(--accent)]">Suerte</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="TuSuerte, ir al inicio" className="inline-flex rounded-xl transition-opacity hover:opacity-85">
        {content}
      </Link>
    );
  }

  return content;
}
