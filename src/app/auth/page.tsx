'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [lineId, setLineId] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validateTwId = (id: string) => {
    const cleaned = id.trim().toUpperCase();
    return /^[A-Z][1289]\d{8}$/.test(cleaned) || /^[A-Z]{2}\d{8}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMsg(`登入失敗：${error.message}`);
          setLoading(false);
          return;
        }
        if (data.user?.user_metadata?.status === 'suspended') {
          await supabase.auth.signOut();
          setErrorMsg('此帳號因違反平台規範或涉及交易糾紛，已被管理員停權凍結。');
          setLoading(false);
          return;
        }
        // 重要優化：會員登入後直接進入平台首頁（可立即作為買家選購商品，或點擊頂部「賣家中心」管理賣場）
        router.push('/');
        router.refresh();
      } else {
        if (!validateTwId(idCardNumber)) {
          setErrorMsg('身分證字號或居留證號格式不正確（請輸入 1 碼英文字母加 9 碼數字）');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register_user',
            payload: {
              email,
              password,
              full_name: fullName,
              id_card_number: idCardNumber,
              phone,
              address,
              line_id: lineId,
            },
          }),
        });

        const result = await res.json();
        if (!result.ok) {
          setErrorMsg(`註冊失敗：${result.error}`);
          setLoading(false);
          return;
        }

        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (!loginErr) {
          router.push('/');
          router.refresh();
        } else {
          setSuccessMsg('實名註冊已完成！請直接點擊下方登入。');
          setIsLogin(true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '網路連線異常';
      setErrorMsg(`處理失敗：${msg}`);
    }
    setLoading(false);
  };

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 shadow-sm">
        <h1 className="text-xl font-bold text-center tracking-tight text-[#222222] mb-1">
          {isLogin ? '實名會員登入（買家／賣家通用）' : '註冊實名會員帳號（可購物亦可免費開賣場）'}
        </h1>
        <p className="text-xs text-center text-[#666666] mb-6">
          嘟屁 DUPE・登入後直達拍賣首頁・一組實名帳號同時享有買家採購保障與賣家零抽成開館權限
        </p>

        {errorMsg && (
          <div className="mb-5 p-3 text-xs bg-[#FAF9F5] border border-[#7F0019] text-[#7F0019] rounded-sm">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 text-xs bg-[#FAF9F5] border border-emerald-700 text-emerald-800 rounded-sm">
            {successMsg}
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
            <div className="pt-3 border-t border-[#E6E3DC] space-y-4">
              <p className="text-[11px] font-medium text-[#7F0019]">
                以下實名欄位為防止幽靈帳號與交易安全必填，無論作為買家購物或作為賣家開館皆受保障：
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    真實姓名 <span className="text-[#7F0019]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white"
                    placeholder="請填寫真實姓名"
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
                    className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white uppercase"
                    placeholder="例：A123456789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    行動電話（聯絡電話） <span className="text-[#7F0019]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white"
                    placeholder="例：0912345678"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    LINE ID（買賣聯繫選填）
                  </label>
                  <input
                    type="text"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white"
                    placeholder="選填，方便買賣聯繫"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  現居地址 / 戶籍聯絡地址 <span className="text-[#7F0019]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white"
                  placeholder="請填寫完整縣市、鄉鎮市區與門牌地址"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium tracking-wider rounded-sm transition-colors disabled:opacity-50"
          >
            {loading ? '系統處理中...' : isLogin ? '登入並前往拍賣首頁' : '完成實名註冊並進入首頁'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E6E3DC] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="text-[#222222] font-medium hover:text-[#7F0019] underline underline-offset-4"
          >
            {isLogin ? '尚未建立帳號？點此實名註冊' : '已有帳號？返回直接登入'}
          </button>
          <Link className="text-[#666666] hover:text-[#222222]" href="/admin">
            管理員後台入口 →
          </Link>
        </div>
      </div>
    </main>
  );
}
