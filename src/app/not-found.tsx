'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Home, Search, Ticket } from 'lucide-react';

// Posiciones fijas para los tickets flotantes (evita hydration mismatch)
const TICKET_POSITIONS = [
  { left: 15, top: 20 },
  { left: 75, top: 15 },
  { left: 85, top: 60 },
  { left: 10, top: 75 },
  { left: 60, top: 80 },
  { left: 40, top: 30 },
];

export default function NotFound() {
  const [mounted, setMounted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / globalThis.innerWidth) * 20 - 10,
        y: (e.clientY / globalThis.innerHeight) * 20 - 10,
      });
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    return () => globalThis.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[color:var(--background)] via-[color:var(--background)] to-[color:var(--muted)] flex items-center justify-center px-4 py-8 sm:py-12">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 -left-10 sm:-left-20 w-48 h-48 sm:w-96 sm:h-96 rounded-full bg-[color:var(--accent)]/10 blur-3xl animate-pulse"
          style={{
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        />
        <div 
          className="absolute bottom-1/4 -right-10 sm:-right-20 w-48 h-48 sm:w-96 sm:h-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse"
          style={{
            transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px)`,
            transition: 'transform 0.3s ease-out',
            animationDelay: '1s',
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-64 sm:h-64 rounded-full bg-purple-500/10 blur-3xl animate-pulse"
          style={{
            transform: `translate(calc(-50% + ${mousePosition.x * 0.5}px), calc(-50% + ${mousePosition.y * 0.5}px))`,
            transition: 'transform 0.3s ease-out',
            animationDelay: '2s',
          }}
        />
      </div>

      {/* Floating tickets decoration - oculto en móvil para mejor rendimiento */}
      <div className="hidden sm:block absolute inset-0 overflow-hidden pointer-events-none">
        {TICKET_POSITIONS.map((pos, i) => (
          <div
            key={`ticket-${pos.left}-${pos.top}`}
            className="absolute animate-float opacity-20"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i}s`,
            }}
          >
            <Ticket 
              className="text-[color:var(--accent)] rotate-12" 
              size={32 + i * 8}
            />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div 
        className={`relative z-10 text-center space-y-6 sm:space-y-8 max-w-2xl w-full transition-all duration-1000 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* 404 Number with gradient */}
        <div className="relative">
          <h1 
            className="text-[8rem] sm:text-[12rem] md:text-[16rem] font-extrabold leading-none bg-clip-text text-transparent bg-gradient-to-br from-[color:var(--accent)] via-orange-500 to-pink-500 animate-gradient-x"
            style={{
              WebkitBackgroundClip: 'text',
              backgroundSize: '200% 200%',
            }}
          >
            404
          </h1>
          
          {/* Glowing effect */}
          <div className="absolute inset-0 blur-2xl sm:blur-3xl opacity-20 sm:opacity-30 bg-gradient-to-br from-[color:var(--accent)] via-orange-500 to-pink-500 -z-10" />
        </div>

        {/* Message */}
        <div className="space-y-3 sm:space-y-4 px-4">
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-[color:var(--foreground)]">
            ¡Oops! Página no encontrada
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-[color:var(--muted-foreground)] max-w-md mx-auto">
            La página que buscas no existe o fue movida. No te preocupes, te ayudamos a encontrar tu camino de vuelta.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4">
          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            Volver al inicio
          </Link>
          
          <Link
            href="/ayuda"
            className="group inline-flex items-center justify-center gap-2 border-2 border-[color:var(--border)] bg-[color:var(--background)]/80 backdrop-blur-sm text-[color:var(--foreground)] px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base hover:border-[color:var(--accent)] hover:bg-[color:var(--accent)]/5 transition-all duration-300 hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" />
            Centro de ayuda
          </Link>
        </div>

        {/* Quick links */}
        <div className="pt-6 sm:pt-8 border-t border-[color:var(--border)]/50 px-4">
          <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)] mb-3 sm:mb-4">
            O prueba estos enlaces populares:
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
            {[
              { href: '/app', label: 'Mi Dashboard', icon: '📊' },
              { href: '/app/sorteos', label: 'Sorteos Activos', icon: '🎯' },
              { href: '/app/boletos', label: 'Mis Boletos', icon: '🎫' },
              { href: '/sobre-nosotros', label: 'Nosotros', icon: '👋' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[color:var(--card)] border border-[color:var(--border)] text-xs sm:text-sm text-[color:var(--foreground)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent)]/5 transition-all duration-200 active:scale-95"
              >
                <span className="text-sm sm:text-base">{link.icon}</span>
                <span className="whitespace-nowrap">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Fun fact */}
        <div className="pt-4 sm:pt-6 px-4">
          <div className="inline-block px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-[color:var(--accent)]/10 border border-[color:var(--accent)]/20">
            <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)]">
              💡 <span className="font-semibold text-[color:var(--foreground)]">Dato curioso:</span> El error 404 se originó en el CERN en 1992
            </p>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
