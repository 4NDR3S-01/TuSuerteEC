import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: 'global' });

    if (error) {
      if (error.message?.toLowerCase().includes('auth session missing')) {
        // No había sesión activa; tratamos como éxito
        return NextResponse.json({ success: true });
      }

      console.error('Error clearing server session:', error);
      return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in sign-out route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
