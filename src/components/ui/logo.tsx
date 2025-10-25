import Image from 'next/image';
import Link from 'next/link';

type LogoProps = {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
};

const sizes = {
  sm: {
    icon: 24,
    text: 'text-base',
  },
  md: {
    icon: 32,
    text: 'text-lg',
  },
  lg: {
    icon: 40,
    text: 'text-xl',
  },
};

export function Logo({ href = '/', size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeConfig = sizes[size];
  
  const logoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-shrink-0">
        <Image
          src="/favicon.ico"
          alt="TuSuerte"
          width={sizeConfig.icon}
          height={sizeConfig.icon}
          className="rounded-lg"
          priority
        />
      </div>
      {showText && (
        <span className={`font-bold tracking-tight ${sizeConfig.text}`}>
          {/* <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent dark:from-orange-400 dark:to-orange-500">
            Tu
          </span> */}
          <span className="text-[color:var(--foreground)]">TuSuerte</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition-opacity hover:opacity-80">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
