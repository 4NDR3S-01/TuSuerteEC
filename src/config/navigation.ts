export const PUBLIC_NAV_ITEMS = [
  { href: "/sorteos", label: "Sorteos" },
  { href: "/resultados", label: "Resultados" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#planes", label: "Planes" },
  { href: "/ayuda", label: "Ayuda" },
] as const;

export type PublicNavItem = (typeof PUBLIC_NAV_ITEMS)[number];

export const LEGAL_NAV_ITEMS = [
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/bases", label: "Bases generales de los sorteos" },
  { href: "/privacidad", label: "Política de privacidad" },
  { href: "/reembolsos", label: "Política de reembolsos" },
] as const;
