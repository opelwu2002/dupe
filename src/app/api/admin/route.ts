import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase';

const ADMIN_ACCOUNT = 'admin';
const ADMIN_PASS = 'Opel@6404200116';
const ADMIN_TOKEN = 'dupe_admin_verified_token_2026';

function isAdminAuthorized(req: NextRequest): boolean {
  const cookieToken = req.cookies.get('dupe_admin_session')?.value;
  const headerToken = req.headers.get('x-admin-token');
  return cookieToken === ADMIN_TOKEN || headerToken === ADMIN_TOKEN;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, password, payload } = body;

    // 1. 管理員登入驗證
    if (action === 'admin_login') {
      if (username === ADMIN_ACCOUNT && password === ADMIN_PASS) {
        const res = NextResponse.json({
          success: true,
          token: ADMIN_TOKEN,
          admin: { username: ADMIN_ACCOUNT, role: 'admin' },
        });
        res.cookies.set('dupe_admin_session', ADMIN_TOKEN, {
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 天有效
        });
        return res;
      }
      return NextResponse.json({ error: '管理員帳號或密碼錯誤' }, { status: 401 });
    }

    // 2. 管理員登出
    if (action === 'admin_logout') {
      const res = NextResponse.json({ success: true });
      res.cookies.delete('dupe_admin_session');
      return res;
    }

    // 其餘操作需驗證管理員權杖
    if (!isAdminAuthorized(req)) {
      return NextResponse.json({ error: '未授權的管理員存取，請重新登入後台' }, { status: 403 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 3. 總覽資料讀取
    if (action === 'fetch_all') {
      const [profilesRes, storesRes, productsRes] = await Promise.all([
        db.from('profiles').select('*').order('created_at', { ascending: false }),
        db.from('stores').select('*').order('created_at', { ascending: false }),
        db
          .from('products')
          .select('*, stores(name), product_variants(*)')
          .order('created_at', { ascending: false }),
      ]);

      return NextResponse.json({
        profiles: profilesRes.data || [],
        profilesError: profilesRes.error?.message || null,
        stores: storesRes.data || [],
        storesError: storesRes.error?.message || null,
        products: productsRes.data || [],
        productsError: productsRes.error?.message || null,
      });
    }

    // 4. 更新或新增會員 Profile
    if (action === 'upsert_profile') {
      const { id, email, full_name, id_card_number, phone, address, role, status, notes } = payload;

      // 若無 id（後台人工建檔），先嘗試透過 signUp 建立 Auth User 以滿足外鍵約束
      let targetUserId = id;
      if (!targetUserId) {
        const tempPassword = payload.password || `Dupe@${Math.random().toString(36).slice(-8)}`;
        const { data: authData, error: authErr } = await db.auth.signUp({
          email,
          password: tempPassword,
          options: {
            data: { full_name, id_card_number, phone, address, role: role || 'user' },
          },
        });
        if (authErr && !authData?.user) {
          return NextResponse.json(
            { error: `建立會員認證帳號失敗：${authErr.message}` },
            { status: 400 }
          );
        }
        targetUserId = authData.user?.id;
      }

      const { data, error } = await db
        .from('profiles')
        .upsert(
          [
            {
              id: targetUserId,
              email,
              full_name,
              id_card_number,
              phone,
              address,
              role: role || 'user',
              status: status || 'active',
              notes: notes || '',
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ profile: data });
    }

    // 5. 切換賣場啟用狀態
    if (action === 'toggle_store') {
      const { id, is_active } = payload;
      const { error } = await db
        .from('stores')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    // 6. 管理商品（更新價格、強制下架/重新上架、刪除）
    if (action === 'update_product') {
      const { id, price, status, title } = payload;
      const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof price === 'number') updateFields.price = price;
      if (status) updateFields.status = status;
      if (title) updateFields.title = title;

      const { error } = await db.from('products').update(updateFields).eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_product') {
      const { id } = payload;
      const { error } = await db.from('products').delete().eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知的管理員操作指令' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '後台伺服器處理異常';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
