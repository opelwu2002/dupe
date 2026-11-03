import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, profile } = body;

    if (!email || !password) {
      return NextResponse.json({ error: '請填寫電子信箱與密碼' }, { status: 400 });
    }

    const serverSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    if (action === 'login') {
      const { data, error } = await serverSupabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        user: data.user,
        session: data.session,
      });
    }

    if (action === 'signup') {
      const { data, error } = await serverSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: profile?.full_name || '',
            id_card_number: profile?.id_card_number || '',
            phone: profile?.phone || '',
            address: profile?.address || '',
            role: 'user',
            status: 'active',
          },
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // 若有回傳 user，同步嘗試寫入 public.profiles 資料表
      if (data.user && profile) {
        const clientForProfile = data.session?.access_token
          ? createClient(supabaseUrl, supabaseAnonKey, {
              global: {
                headers: { Authorization: `Bearer ${data.session.access_token}` },
              },
              auth: { persistSession: false },
            })
          : serverSupabase;

        await clientForProfile.from('profiles').upsert(
          [
            {
              id: data.user.id,
              email,
              full_name: profile.full_name,
              id_card_number: profile.id_card_number,
              phone: profile.phone,
              address: profile.address,
              role: 'user',
              status: 'active',
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'id' }
        );
      }

      return NextResponse.json({
        user: data.user,
        session: data.session,
      });
    }

    return NextResponse.json({ error: '不支援的操作類型' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '伺服器認證代理處理失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
