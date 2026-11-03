'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="border-b border-[#E6E3DC] bg-white sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link className="flex items-baseline space-x-2" href="/">
          <span className="text-xl font-bold tracking-wider text-[#7F0019]">DUPE</span>
          <span className="text-sm font-medium tracking-tight text-[#222222]">嘟屁</span>
        </Link>
        <nav className="flex items-center space-x-4 text-xs">
          <span className="hidden sm:inline-block text-[#666666]">極簡非對稱 P2P 拍賣看板</span>
          <Link
            className="text-[#666666] hover:text-[#222222] transition-colors"
            href="/admin"
          >
            管理後台
          </Link>
          {user ? (
            <div className="flex items-center space-x-3">
              <Link className="px-3 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5] hover:bg-white text-[#222222] rounded-sm transition-colors" href="/dashboard/store">
                賣家中心
              </Link>
              <Link className="px-3 py-1.5 bg-[#7F0019] hover:bg-[#660014] text-white rounded-sm font-medium transition-colors" href="/dashboard/products/new">
                刊登商品
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[#666666] hover:text-[#222222] underline underline-offset-4"
              >
                登出
              </button>
            </div>
          ) : (
            <Link className="px-4 py-1.5 bg-[#7F0019] hover:bg-[#660014] text-white rounded-sm font-medium transition-colors" href="/auth">
              登入 / 註冊
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
