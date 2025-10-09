export const PUBLIC_NAV_ITEMS = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#sorteos", label: "Sorteos" },
  { href: "/#planes", label: "Planes" },
  { href: "/#ganadores", label: "Ganadores" },
  { href: "/#ayuda", label: "Ayuda" },
  { href: "/#sobre-nosotros", label: "Sobre nosotros" },
] as const;

export type PublicNavItem = (typeof PUBLIC_NAV_ITEMS)[number];
