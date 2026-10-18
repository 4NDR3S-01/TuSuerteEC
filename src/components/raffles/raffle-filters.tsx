import { Search } from 'lucide-react';
import { ENTRY_MODES, PRIZE_CATEGORIES } from '../../lib/raffle/labels';
import { Button, inputStyles } from '../ui/kit';

type Props = {
  action: string;
  values: { q?: string; category?: string; mode?: string; sort?: string };
};

/** Buscador y filtros como formulario GET: funciona sin JavaScript y la URL se puede compartir */
export function RaffleFilters({ action, values }: Props) {
  return (
    <form action={action} method="get" role="search" className="grid gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-[var(--shadow-card)] md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
      <label className="relative">
        <span className="sr-only">Buscar sorteo</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" aria-hidden />
        <input name="q" defaultValue={values.q} placeholder="Buscar por premio o sorteo" className={`${inputStyles} pl-10`} maxLength={80} />
      </label>
      <label>
        <span className="sr-only">Categoría</span>
        <select name="category" defaultValue={values.category ?? ''} className={inputStyles}>
          <option value="">Todas las categorías</option>
          {Object.entries(PRIZE_CATEGORIES).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Modalidad</span>
        <select name="mode" defaultValue={values.mode ?? ''} className={inputStyles}>
          <option value="">Todas las modalidades</option>
          {Object.entries(ENTRY_MODES).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Ordenar</span>
        <select name="sort" defaultValue={values.sort ?? 'closing'} className={inputStyles}>
          <option value="closing">Cierran primero</option>
          <option value="newest">Más recientes</option>
          <option value="price_asc">Menor precio</option>
          <option value="price_desc">Mayor precio</option>
        </select>
      </label>
      <Button type="submit" className="h-[46px]">Filtrar</Button>
    </form>
  );
}
