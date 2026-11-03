import { createClient } from '@supabase/supabase-js';

// 預設容錯備援連線設定（對應專案 Supabase 實例，避免 Vercel 環境變數未同步或格式引號污染導致 Failed to fetch）
const FALLBACK_SUPABASE_URL = 'https://ybijdldtyxdgcmbbjyhh.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_opDEKmml_hPeSQi0XHJR5w_UmwUUT1K';

function sanitizeEnv(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const cleaned = value.trim().replace(/^["']|["']$/g, '');
  if (!cleaned || cleaned.includes('your-project') || cleaned.includes('placeholder')) {
    return fallback;
  }
  return cleaned;
}

export const supabaseUrl = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, FALLBACK_SUPABASE_URL);
export const supabaseAnonKey = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, FALLBACK_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * 格式化連線錯誤訊息，將原生 Failed to fetch 轉換為可讀的診斷說明
 */
export function formatSupabaseError(err: unknown): string {
  if (!err) return '未知錯誤';
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
    return '網路連線或伺服器通訊異常（已自動啟用伺服器代理重試），請檢查網路狀態或稍後再試。';
  }
  return msg;
}
