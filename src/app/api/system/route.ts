import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Opel@6404200116';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const adminSb = getServiceSupabase();

    // 1. 管理員帳號密碼驗證
    if (action === 'admin_login') {
      if (payload.username === ADMIN_USER && payload.password === ADMIN_PASS) {
        return NextResponse.json({ ok: true, token: 'dupe_admin_verified_token_2026' });
      }
      return NextResponse.json({ ok: false, error: '管理員帳號或密碼錯誤' }, { status: 401 });
    }

    // 2. 前台/後台 實名制會員註冊與新增 (免收驗證信直接開通)
    if (action === 'register_user' || action === 'admin_create_user') {
      const {
        email,
        password,
        full_name,
        id_card_number,
        phone,
        address,
        line_id = '',
        role = 'seller',
        status = 'active',
        notes = '',
      } = payload;

      if (!email || !password || !full_name || !id_card_number || !phone || !address) {
        return NextResponse.json({ ok: false, error: '所有實名制欄位皆為必填' }, { status: 400 });
      }

      const { data, error } = await adminSb.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          id_card_number: id_card_number.trim().toUpperCase(),
          phone: phone.trim(),
          address: address.trim(),
          line_id: line_id.trim(),
          role,
          status,
          notes,
          updated_at: new Date().toISOString(),
        },
      });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, user: data.user });
    }

    // 3. 更新會員實名資料 (支援後台編輯所有欄位或前台會員自行更新)
    if (action === 'update_user') {
      const {
        user_id,
        email,
        password,
        full_name,
        id_card_number,
        phone,
        address,
        line_id,
        role,
        status,
        notes,
      } = payload;

      const updateData: Record<string, unknown> = {
        user_metadata: {
          full_name,
          id_card_number: id_card_number?.toUpperCase(),
          phone,
          address,
          line_id: line_id || '',
          role: role || 'seller',
          status: status || 'active',
          notes: notes || '',
          updated_at: new Date().toISOString(),
        },
      };

      if (email) updateData.email = email.trim();
      if (password && password.trim().length >= 6) {
        updateData.password = password.trim();
      }

      const { data, error } = await adminSb.auth.admin.updateUserById(user_id, updateData);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, user: data.user });
    }

    // 4. 刪除會員
    if (action === 'delete_user') {
      const { user_id } = payload;
      const { error } = await adminSb.auth.admin.deleteUser(user_id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    // 5. 取得全站同步資料 (供管理員後台與賣家中心使用)
    if (action === 'fetch_all_data') {
      const { data: usersData, error: usersErr } = await adminSb.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (usersErr) throw usersErr;

      const members = (usersData?.users || []).map((u) => {
        const meta = u.user_metadata || {};
        return {
          id: u.id,
          email: u.email || '',
          full_name: meta.full_name || '未填寫姓名',
          id_card_number: meta.id_card_number || '未填寫證號',
          phone: meta.phone || '未填寫電話',
          address: meta.address || '未填寫地址',
          line_id: meta.line_id || '',
          role: meta.role || 'seller',
          status: meta.status || 'active',
          notes: meta.notes || '',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        };
      });

      const { data: stores } = await adminSb
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: products } = await adminSb
        .from('products')
        .select(`
          *,
          product_variants (*),
          stores (id, name, user_id, contact_line, contact_phone, meetup_location, custom_shipping_note)
        `)
        .order('created_at', { ascending: false });

      return NextResponse.json({
        ok: true,
        members,
        stores: stores || [],
        products: products || [],
      });
    }

    // 6. 建立或更新賣場 (Store Upsert)
    if (action === 'save_store') {
      const {
        id,
        user_id,
        name,
        description,
        contact_line,
        contact_phone,
        meetup_location,
        custom_shipping_note,
        commission_rate = 0,
        is_active = true,
      } = payload;

      const storeRecord = {
        user_id,
        name,
        description: description || '',
        contact_line: contact_line || '',
        contact_phone: contact_phone || '',
        meetup_location: meetup_location || '',
        custom_shipping_note: custom_shipping_note || '',
        commission_rate: Number(commission_rate) || 0,
        is_active: Boolean(is_active),
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { data, error } = await adminSb
          .from('stores')
          .update(storeRecord)
          .eq('id', id)
          .select()
          .single();
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        return NextResponse.json({ ok: true, store: data });
      } else {
        const { data, error } = await adminSb
          .from('stores')
          .insert([storeRecord])
          .select()
          .single();
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        return NextResponse.json({ ok: true, store: data });
      }
    }

    // 7. 刪除賣場
    if (action === 'delete_store') {
      const { id } = payload;
      const { error } = await adminSb.from('stores').delete().eq('id', id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    // 8. 新增或更新商品與規格 (Product & Variants Upsert)
    if (action === 'save_product') {
      const {
        id,
        store_id,
        title,
        description,
        price,
        images,
        status = 'published',
        variants = [],
      } = payload;

      const productRecord = {
        store_id,
        title,
        description: description || '',
        price: Number(price) || 0,
        images: Array.isArray(images) ? images : [],
        status,
        updated_at: new Date().toISOString(),
      };

      let productId = id;

      if (id) {
        const { error } = await adminSb.from('products').update(productRecord).eq('id', id);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        await adminSb.from('product_variants').delete().eq('product_id', id);
      } else {
        const { data, error } = await adminSb
          .from('products')
          .insert([productRecord])
          .select()
          .single();
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        productId = data.id;
      }

      const validVariants =
        variants.length > 0
          ? variants.map((v: { name: string; price: number; stock: number }) => ({
              product_id: productId,
              name: v.name || '預設規格',
              price: Number(v.price) >= 0 ? Number(v.price) : Number(price) || 0,
              stock: Number(v.stock) >= 0 ? Number(v.stock) : 1,
            }))
          : [
              {
                product_id: productId,
                name: '標準規格',
                price: Number(price) || 0,
                stock: 1,
              },
            ];

      await adminSb.from('product_variants').insert(validVariants);

      return NextResponse.json({ ok: true, product_id: productId });
    }

    // 9. 刪除商品
    if (action === 'delete_product') {
      const { id } = payload;
      const { error } = await adminSb.from('products').delete().eq('id', id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: '未知的操作指令' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '伺服器內部錯誤';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
