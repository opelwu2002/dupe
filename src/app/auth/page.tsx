'use client';

import React, { useState } from 'react';
import { supabase, formatSupabaseError } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

/**
 * 台灣身分證字號 / 新舊式外來人口統一證號（居留證）格式與檢查碼校驗
 */
function validateTaiwanIdCard(rawId: string): { valid: boolean; reason?: string } {
  const id = rawId.trim().toUpperCase();
  // 支援本國身分證 (1碼英文 + [1,2] + 8碼數字) 或 新式居留證 (1碼英文 + [8,9] + 8碼數字) 或 舊式居留證 (2碼英文 + 8碼數字)
  const basicRegex = /^[A-Z][1289]\d{8}$|^[A-Z][A-Z]\d{8}$/;
  if (!basicRegex.test(id)) {
    return {
      valid: false,
      reason: '身分證或居留證格式不符（需為 1 碼英文字母開頭加上 9 碼字元，共 10 碼）',
    };
  }

  const letterMap: Record<string, number> = {
    A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34,
    J: 18, K: 19, L: 20, M: 21, N: 22, O: 35, P: 23, Q: 24, R: 25,
    S: 26, T: 27, U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33,
  };

  const firstVal = letterMap[id[0]];
  if (!firstVal) return { valid: false, reason: '首字英文字母無效' };

  const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];
  const digits: number[] = [Math.floor(firstVal / 10), firstVal % 10];

  const secondChar = id[1];
  if (/[A-Z]/.test(secondChar)) {
    digits.push((letterMap[secondChar] || 10) % 10);
  } else {
    digits.push(Number(secondChar));
  }

  for (let i = 2; i < 10; i++) {
    digits.push(Number(id[i]));
  }

  const sum = digits.reduce((acc, d, idx) => acc + d * weights[idx], 0);
  if (sum % 10 !== 0) {
    return {
      valid: false,
      reason: '身分證字號 / 居留證號檢查碼驗證未通過，請確認輸入是否正確（防幽靈實名檢核）',
    };
  }

  return { valid: true };
}

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);

  // 認證與實名制欄位
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const saveLocalRealNameProfile = (profileRecord: Record<string, unknown>) => {
    try {
      const existing = JSON.parse(localStorage.getItem('dupe_realname_profiles') || '[]');
      const filtered = existing.filter((p: { email?: string; id?: string }) => p.email !== profileRecord.email && p.id !== profileRecord.id);
      localStorage.setItem('dupe_realname_profiles', JSON.stringify([profileRecord, ...filtered]));
    } catch {
      // ignore storage errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      if (isLogin) {
        // 1. 優先嘗試 Direct Supabase Auth 登入，失敗時自動切換至 /api/auth 伺服器代理
        let loginError: string | null = null;
        let loggedInUser = null;

        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            loginError = error.message;
          } else {
            loggedInUser = data.user;
          }
        } catch (fetchErr) {
          // 瀏覽器發生 Failed to fetch，自動改走 Next.js Route Handler 代理
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', email, password }),
          });
          const result = await res.json();
          if (!res.ok || result.error) {
            loginError = result.error || formatSupabaseError(fetchErr);
          } else if (result.session) {
            await supabase.auth.setSession({
              access_token: result.session.access_token,
              refresh_token: result.session.refresh_token,
            });
            loggedInUser = result.user;
          }
        }

        if (loginError || !loggedInUser) {
          setMessage(`登入失敗：${loginError || '請確認帳號密碼是否正確'}`);
        } else {
          setIsSuccess(true);
          router.push('/dashboard/store');
          router.refresh();
        }
      } else {
        // 實名制欄位檢核
        if (!fullName.trim() || fullName.trim().length < 2) {
          setMessage('註冊失敗：請填寫真實中文或英文全名（至少 2 個字元）');
          setLoading(false);
          return;
        }

        const idCheck = validateTaiwanIdCard(idCardNumber);
        if (!idCheck.valid) {
          setMessage(`註冊失敗：${idCheck.reason}`);
          setLoading(false);
          return;
        }

        const cleanPhone = phone.trim();
        if (!/^09\d{2}-?\d{3}-?\d{3}$|^\+?\d{8,15}$/.test(cleanPhone)) {
          setMessage('註冊失敗：請輸入有效的行動電話號碼（例如：0912-345-678 或 0912345678）');
          setLoading(false);
          return;
        }

        if (!address.trim() || address.trim().length < 6) {
          setMessage('註冊失敗：請填寫完整現居地址或聯絡地址（至少包含縣市與路段門牌）');
          setLoading(false);
          return;
        }

        const normalizedIdCard = idCardNumber.trim().toUpperCase();
        const profileData = {
          full_name: fullName.trim(),
          id_card_number: normalizedIdCard,
          phone: cleanPhone,
          address: address.trim(),
        };

        let signUpError: string | null = null;
        let createdUserId: string | null = null;

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                ...profileData,
                role: 'user',
                status: 'active',
              },
            },
          });

          if (error) {
            signUpError = error.message;
          } else if (data.user) {
            createdUserId = data.user.id;
            // 同步寫入 public.profiles 資料表
            await supabase.from('profiles').upsert(
              [
                {
                  id: data.user.id,
                  email,
                  ...profileData,
                  role: 'user',
                  status: 'active',
                  updated_at: new Date().toISOString(),
                },
              ],
              { onConflict: 'id' }
            );
          }
        } catch (fetchErr) {
          // 若瀏覽器端發生 Failed to fetch，自動透過伺服器端 /api/auth 代理完成註冊與實名資料寫入
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'signup',
              email,
              password,
              profile: profileData,
            }),
          });
          const result = await res.json();
          if (!res.ok || result.error) {
            signUpError = result.error || formatSupabaseError(fetchErr);
          } else {
            createdUserId = result.user?.id || `local-${Date.now()}`;
            if (result.session) {
              await supabase.auth.setSession({
                access_token: result.session.access_token,
                refresh_token: result.session.refresh_token,
              });
            }
          }
        }

        if (signUpError) {
          setMessage(`註冊失敗：${signUpError}`);
        } else {
          // 同步備份至本地實名緩存，確保管理員後台即使在未執行 SQL 遷移前也能即時調閱
          saveLocalRealNameProfile({
            id: createdUserId || `user-${Date.now()}`,
            email,
            ...profileData,
            role: 'user',
            status: 'active',
            notes: '前台實名驗證註冊',
            created_at: new Date().toISOString(),
          });

          setIsSuccess(true);
          setMessage('實名制帳號註冊成功！您的實名資料已建檔完成，若有啟用信箱驗證請至信箱確認，或直接切換至登入頁面。');
        }
      }
    } catch (unexpectedErr) {
      setMessage(`系統連線異常：${formatSupabaseError(unexpectedErr)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 shadow-sm">
        <div className="text-center mb-6">
          <span className="inline-block px-2.5 py-0.5 text-[11px] bg-[#FAF9F5] border border-[#E6E3DC] text-[#7F0019] font-medium mb-2">
            防幽靈實名制認證系統
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[#222222] mb-1">
            {isLogin ? '會員登入' : '實名制會員註冊'}
          </h1>
          <p className="text-xs text-[#666666]">
            嘟屁平台・零抽成極簡點對點拍賣社群
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-3.5 text-xs border rounded-sm leading-relaxed ${
              isSuccess
                ? 'bg-[#FAF9F5] border-[#222222] text-[#222222]'
                : 'bg-[#FAF9F5] border-[#7F0019] text-[#7F0019]'
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#222222] mb-1">
              電子信箱（登入帳號） <span className="text-[#7F0019]">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="example@mail.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#222222] mb-1">
              登入密碼 <span className="text-[#7F0019]">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="請設定至少 6 位字元密碼"
            />
          </div>

          {!isLogin && (
            <>
              <div className="pt-2 border-t border-[#E6E3DC]">
                <p className="text-[11px] font-medium text-[#7F0019] mb-3">
                  以下實名欄位為買賣安全與防詐備查必填，平台嚴格保密，僅供依法調閱：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#222222] mb-1">
                      真實姓名 <span className="text-[#7F0019]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                      placeholder="請填寫身分證件真實姓名"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#222222] mb-1">
                      身分證字號 / 居留證號 <span className="text-[#7F0019]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={idCardNumber}
                      onChange={(e) => setIdCardNumber(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-sm uppercase border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                      placeholder="例：A123456789"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  行動電話（聯絡電話） <span className="text-[#7F0019]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                  placeholder="例：0912-345-678"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  現居地址 / 聯絡地址 <span className="text-[#7F0019]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                  placeholder="請填寫完整縣市、鄉鎮市區與街道門牌號碼"
                />
              </div>
            </>
          )}

          <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm text-[11px] text-[#666666] leading-relaxed">
            依據法規與拍賣資訊安全指引，本平台採實名資料註冊；若有涉及詐欺或交易糾紛，實名資訊將依法配合司法與警政單位調查調閱。
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium tracking-wider rounded-sm transition-colors disabled:opacity-50"
          >
            {loading ? '系統驗證處理中...' : isLogin ? '立即登入' : '完成實名驗證並註冊'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E6E3DC] flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage(null);
            }}
            className="text-xs text-[#222222] hover:text-[#7F0019] underline underline-offset-4 font-medium"
          >
            {isLogin ? '尚未建立帳號？前往實名制註冊' : '已有帳號？返回直接登入'}
          </button>

          <a
            href="/admin/login"
            className="text-[11px] text-[#666666] hover:text-[#222222]"
          >
            管理員後台入口 →
          </a>
        </div>
      </div>

      <div className="mt-6 p-4 bg-white border border-[#E6E3DC] rounded-sm text-[11px] text-[#666666] leading-relaxed">
        免責聲明：本平台（Dupe 嘟屁）僅提供去中心化商品資訊刊登與 P2P 媒合展示看板，不介入買賣雙方實質交易、金流收付與商品交付流程，亦不承擔任何買賣履約保證與物之瑕疵擔保責任。
      </div>
    </main>
  );
}
