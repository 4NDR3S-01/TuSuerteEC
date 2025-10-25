import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { access_token, refresh_token } = await request.json();
    
    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    
    // Establecer la sesión en el servidor
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error('Error setting session:', error);
      return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in set-session API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}