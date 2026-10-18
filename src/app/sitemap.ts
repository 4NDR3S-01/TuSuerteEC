import type { MetadataRoute } from 'next';
import { SITE } from '../config/site';
import { prisma } from '../lib/db';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = ['', '/sorteos', '/resultados', '/ayuda', '/sobre-nosotros', '/terminos', '/bases', '/privacidad', '/reembolsos'].map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: 'weekly' as const,
  }));

  const raffles = await prisma.raffles.findMany({
    where: { status: { in: ['active', 'closed', 'drawn', 'completed'] } },
    select: { id: true, status: true, updated_at: true },
    take: 500,
    orderBy: { updated_at: 'desc' },
  });

  return [
    ...staticPages,
    ...raffles.map((raffle) => ({
      url: `${SITE.url}/${raffle.status === 'active' ? 'sorteos' : 'resultados'}/${raffle.id}`,
      lastModified: raffle.updated_at,
    })),
  ];
}
