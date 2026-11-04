import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, SUPABASE_URL } from '@/lib/supabase';
import {
  DEFAULT_CONTACT_PAGE_CONFIG,
  DEFAULT_PORTAL_CONFIG,
  FeedbackTicket,
  INITIAL_FEEDBACK_TICKETS,
  PortalConfig,
} from '@/lib/portalConfig';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Opel@6404200116';
const BUCKET_NAME = 'product-images';
const CMS_CONFIG_PATH = 'cms/portal_config.json';
const FEEDBACK_STORAGE_PATH = 'cms/feedback_tickets.json';

async function ensureBucketExists(adminSb: ReturnType<typeof getServiceSupabase>) {
  const { data: buckets } = await adminSb.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === BUCKET_NAME);
  if (!exists) {
    await adminSb.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880,
    });
  }
}

async function loadPortalConfigFromStorage(
  adminSb: ReturnType<typeof getServiceSupabase>
): Promise<PortalConfig> {
  try {
    const { data, error } = await adminSb.storage.from(BUCKET_NAME).download(CMS_CONFIG_PATH);
    if (error || !data) return DEFAULT_PORTAL_CONFIG;
    const text = await data.text();
    const parsed = JSON.parse(text);
    return {
      ...DEFAULT_PORTAL_CONFIG,
      ...parsed,
      heroCampaigns: Array.isArray(parsed.heroCampaigns)
        ? parsed.heroCampaigns
        : DEFAULT_PORTAL_CONFIG.heroCampaigns,
      floors: Array.isArray(parsed.floors) ? parsed.floors : DEFAULT_PORTAL_CONFIG.floors,
      hotKeywords: Array.isArray(parsed.hotKeywords)
        ? parsed.hotKeywords
        : DEFAULT_PORTAL_CONFIG.hotKeywords,
      contactPage: parsed.contactPage
        ? {
            ...DEFAULT_CONTACT_PAGE_CONFIG,
            ...parsed.contactPage,
            faqs: Array.isArray(parsed.contactPage.faqs)
              ? parsed.contactPage.faqs
              : DEFAULT_CONTACT_PAGE_CONFIG.faqs,
          }
        : DEFAULT_CONTACT_PAGE_CONFIG,
    };
  } catch {
    return DEFAULT_PORTAL_CONFIG;
  }
}

async function loadFeedbackTicketsFromStorage(
  adminSb: ReturnType<typeof getServiceSupabase>
): Promise<FeedbackTicket[]> {
  try {
    const { data, error } = await adminSb.storage.from(BUCKET_NAME).download(FEEDBACK_STORAGE_PATH);
    if (error || !data) return INITIAL_FEEDBACK_TICKETS;
    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : INITIAL_FEEDBACK_TICKETS;
  } catch {
    return INITIAL_FEEDBACK_TICKETS;
  }
}

async function saveFeedbackTicketsToStorage(
  adminSb: ReturnType<typeof getServiceSupabase>,
  tickets: FeedbackTicket[]
) {
  await ensureBucketExists(adminSb);
  const jsonBuffer = Buffer.from(JSON.stringify(tickets, null, 2), 'utf-8');
  await adminSb.storage.from(BUCKET_NAME).upload(FEEDBACK_STORAGE_PATH, jsonBuffer, {
    contentType: 'application/json',
    upsert: true,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const adminSb = getServiceSupabase();

    // 0. 圖片上傳至 Supabase Storage
    if (action === 'upload_image') {
      const { base64, ext = 'jpg', contentType = 'image/jpeg' } = payload;
      if (!base64) {
        return NextResponse.json({ ok: false, error: '未收到圖片資料' }, { status: 400 });
      }

      await ensureBucketExists(adminSb);
      const fileBuffer = Buffer.from(base64, 'base64');
      const fileName = `items/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadErr } = await adminSb.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadErr) {
        return NextResponse.json({ ok: false, error: uploadErr.message }, { status: 400 });
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
      return NextResponse.json({ ok: true, url: publicUrl });
    }

    // 0-B. 讀取首頁與活動排程設定 (CMS)
    if (action === 'get_portal_config') {
      const config = await loadPortalConfigFromStorage(adminSb);
      return NextResponse.json({ ok: true, portalConfig: config });
    }

    // 0-C. 儲存首頁與活動排程設定 (CMS)
    if (action === 'save_portal_config') {
      await ensureBucketExists(adminSb);
      const updatedConfig: PortalConfig = {
        ...DEFAULT_PORTAL_CONFIG,
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      const jsonBuffer = Buffer.from(JSON.stringify(updatedConfig, null, 2), 'utf-8');
      const { error: saveErr } = await adminSb.storage
        .from(BUCKET_NAME)
        .upload(CMS_CONFIG_PATH, jsonBuffer, {
          contentType: 'application/json',
          upsert: true,
        });

      if (saveErr) {
        return NextResponse.json({ ok: false, error: saveErr.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, portalConfig: updatedConfig });
    }

    // 0-D. 讀取「與我們聯絡」設定與公開留言板列表
    if (action === 'get_contact_and_feedback') {
      const config = await loadPortalConfigFromStorage(adminSb);
      const tickets = await loadFeedbackTicketsFromStorage(adminSb);
      return NextResponse.json({
        ok: true,
        contactPage: config.contactPage || DEFAULT_CONTACT_PAGE_CONFIG,
        feedbackTickets: tickets,
      });
    }

    // 0-E. 前台訪客／會員提交聯絡我們或意見反映留言
    if (action === 'submit_feedback') {
      const {
        name,
        email,
        phone = '',
        category = '一般平台諮詢',
        subject,
        content,
        isPublic = true,
      } = payload;

      if (!name || !email || !subject || !content) {
        return NextResponse.json(
          { ok: false, error: '請填寫稱呼、聯絡信箱、主旨與反映內容' },
          { status: 400 }
        );
      }

      const currentTickets = await loadFeedbackTicketsFromStorage(adminSb);
      const newTicket: FeedbackTicket = {
        id: `fb-${Date.now()}`,
        name: String(name).trim(),
        email: String(email).trim(),
        phone: String(phone || '').trim(),
        category,
        subject: String(subject).trim(),
        content: String(content).trim(),
        isPublic: Boolean(isPublic),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const nextTickets = [newTicket, ...currentTickets];
      await saveFeedbackTicketsToStorage(adminSb, nextTickets);
      return NextResponse.json({ ok: true, ticket: newTicket, feedbackTickets: nextTickets });
    }

    // 0-F. 後台管理員回覆或更新留言狀態
    if (action === 'reply_feedback') {
      const { id, adminReply, isPublic, status } = payload;
      const currentTickets = await loadFeedbackTicketsFromStorage(adminSb);
      const nextTickets = currentTickets.map((t) => {
        if (t.id !== id) return t;
        const hasReply = typeof adminReply === 'string' && adminReply.trim().length > 0;
        return {
          ...t,
          adminReply: typeof adminReply === 'string' ? adminReply.trim() : t.adminReply,
          isPublic: typeof isPublic === 'boolean' ? isPublic : t.isPublic,
          status: status || (hasReply ? 'replied' : 'pending'),
          repliedAt: hasReply ? new Date().toISOString() : t.repliedAt,
        };
      });
      await saveFeedbackTicketsToStorage(adminSb, nextTickets);
      return NextResponse.json({ ok: true, feedbackTickets: nextTickets });
    }

    // 0-G. 後台管理員刪除留言
    if (action === 'delete_feedback') {
      const { id } = payload;
      const currentTickets = await loadFeedbackTicketsFromStorage(adminSb);
      const nextTickets = currentTickets.filter((t) => t.id !== id);
      await saveFeedbackTicketsToStorage(adminSb, nextTickets);
      return NextResponse.json({ ok: true, feedbackTickets: nextTickets });
    }

    // 1. 管理員帳號密碼驗證
    if (action === 'admin_login') {
      if (payload.username === ADMIN_USER && payload.password === ADMIN_PASS) {
        return NextResponse.json({ ok: true, token: 'dupe_admin_verified_token_2026' });
      }
      return NextResponse.json({ ok: false, error: '管理員帳號或密碼錯誤' }, { status: 401 });
    }

    // 2. 前台/後台 實名制會員註冊與新增
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

    // 3. 更新會員實名資料
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

    // 5. 取得全站同步資料（含首頁 CMS 設定）
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

      const portalConfig = await loadPortalConfigFromStorage(adminSb);
      const feedbackTickets = await loadFeedbackTicketsFromStorage(adminSb);

      return NextResponse.json({
        ok: true,
        members,
        stores: stores || [],
        products: products || [],
        portalConfig,
        feedbackTickets,
      });
    }

    // 6. 建立或更新賣場
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

    // 8. 新增或更新商品與規格
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
        has_multi_spec = false,
        single_stock = 1,
      } = payload;

      const numericPrice = Number(price) || 0;
      const safeImages = Array.isArray(images) ? images.slice(0, 5) : [];

      const productRecord = {
        store_id,
        title,
        description: description || '',
        price: numericPrice,
        images: safeImages,
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

      let validVariants;
      if (!has_multi_spec) {
        const fallbackStock =
          Number(single_stock) >= 0
            ? Number(single_stock)
            : variants?.[0]?.stock !== undefined
            ? Number(variants[0].stock)
            : 1;
        validVariants = [
          {
            product_id: productId,
            name: '__SINGLE__',
            price: numericPrice,
            stock: fallbackStock,
          },
        ];
      } else {
        validVariants =
          variants.length > 0
            ? variants.map((v: { name: string; price: number; stock: number }) => ({
                product_id: productId,
                name: v.name && v.name !== '__SINGLE__' ? v.name : '款式一',
                price: Number(v.price) >= 0 ? Number(v.price) : numericPrice,
                stock: Number(v.stock) >= 0 ? Number(v.stock) : 1,
              }))
            : [
                {
                  product_id: productId,
                  name: '__SINGLE__',
                  price: numericPrice,
                  stock: 1,
                },
              ];
      }

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
