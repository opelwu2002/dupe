'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_login',
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || '管理員帳號或密碼驗證失敗');
      } else {
        // 同步寫入 SessionStorage 作為雙重驗證憑證（搭配伺服器端 HttpOnly Cookie）
        sessionStorage.setItem('dupe_admin_token', data.token);
        sessionStorage.setItem('dupe_admin_user', username.trim());
        router.push('/admin');
        router.refresh();
      }
    } catch {
      setErrorMsg('管理中心連線異常，請確認網路狀態');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 shadow-sm">
        <div className="text-center mb-6 pb-4 border-b border-[#E6E3DC]">
          <span className="inline-block px-2.5 py-0.5 text-[11px] bg-[#7F0019] text-white font-medium mb-2 rounded-sm">
            DUPE ADMIN CONSOLE
          </span>
          <h1 className="text-lg font-bold tracking-tight text-[#222222]">
            嘟屁營運管理中心登入
          </h1>
          <p className="text-xs text-[#666666] mt-1">
            實名制會員調閱・賣場權限審查・商品違規稽核
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3 text-xs bg-[#FAF9F5] border border-[#7F0019] text-[#7F0019] rounded-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#222222] mb-1">
              管理員帳號
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="請輸入管理員帳號"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#222222] mb-1">
              管理員密碼
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="請輸入管理員密碼"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium tracking-wider rounded-sm transition-colors disabled:opacity-50"
          >
            {loading ? '驗證權限中...' : '登入營運管理後台'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E6E3DC] text-center">
          <Link href="/" className="text-xs text-[#666666] hover:text-[#222222]">
            ← 返回前台商品看板
          </Link>
        </div>
      </div>

      <div className="mt-6 p-4 bg-white border border-[#E6E3DC] rounded-sm text-[11px] text-[#666666] leading-relaxed">
        免責聲明：本平台（Dupe 嘟屁）僅提供去中心化商品資訊刊登與 P2P 媒合展示看板，不介入買賣雙方實質交易、金流收付與商品交付流程，亦不承擔任何買賣履約保證與物之瑕疵擔保責任。
      </div>
    </main>
  );
}
