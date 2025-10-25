import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Devuelve las cookies actuales como el helper de Next
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            // Normalizar cada cookie recibida y llamar a cookieStore.set
            // `cookiesToSet` puede venir en dos formas comunes:
            // 1) { name, value, path, maxAge, sameSite, secure, httpOnly }
            // 2) { name, value, options: { path, maxAge, sameSite, secure, httpOnly } }
            for (const cookie of cookiesToSet) {
              // Si viene envuelta en 'options', desestructurar y mezclar
              const anyCookie: any = cookie;
              const name = anyCookie.name;
              const value = anyCookie.value;

              if (!name) continue;

              const opts = anyCookie.options ? { ...anyCookie.options } : { ...anyCookie };
              // Eliminar propiedades redundantes
              delete opts.name;
              delete opts.value;
              // Construir objeto compatible con cookies().set
              const cookieObj: any = { name, value, ...opts };

              // Next.js cookieStore.set acepta un objeto con shape { name, value, path?, maxAge?, ... }
              cookieStore.set(cookieObj);
            }
          } catch {
            // Si falló, ignorar silenciosamente (ej.: llamado desde un Server Component sin permisos de escritura)
          }
        },
      },
    }
  );
}
