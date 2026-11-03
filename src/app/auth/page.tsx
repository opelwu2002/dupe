'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(`登入失敗：${error.message}`);
      } else {
        router.push('/dashboard/store');
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(`註冊失敗：${error.message}`);
      } else {
        setMessage('註冊成功！若有啟用信箱驗證，請至信箱點擊確認信，或直接嘗試登入。');
      }
    }
    setLoading(false);
  };

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 shadow-sm">
        <h1 className="text-xl font-bold text-center tracking-tight text-[#222222] mb-2">
          {isLogin ? '會員登入' : '註冊賣家帳號'}
        </h1>
        <p className="text-xs text-center text-[#666666] mb-8">
          嘟屁平台・零抽成極簡拍賣社群
        </p>

        {message && (
          <div className="mb-6 p-3 text-xs bg-[#FAF9F5] border border-[#E6E3DC] text-[#7F0019] rounded-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#666666] mb-1">電子信箱</label>
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
            <label className="block text-xs font-medium text-[#666666] mb-1">密碼</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="至少 6 位字元"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium tracking-wider rounded-sm transition-colors disabled:opacity-50"
          >
            {loading ? '處理中...' : isLogin ? '立即登入' : '確認註冊'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E6E3DC] text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage(null);
            }}
            className="text-xs text-[#666666] hover:text-[#222222] underline underline-offset-4"
          >
            {isLogin ? '尚未建立帳號？前往註冊' : '已有帳號？直接登入'}
          </button>
        </div>
      </div>
    </main>
  );
}
