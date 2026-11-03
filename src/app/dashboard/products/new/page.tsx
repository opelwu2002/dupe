'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(300);
  const [imageUrl, setImageUrl] = useState('');
  const [variants, setVariants] = useState([{ name: '標準規格', price: 300, stock: 1 }]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkStore() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      const res = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch_all_data' }),
      });
      const result = await res.json();
      const userStore = result.stores?.find((s: { user_id: string }) => s.user_id === user.id);

      if (!userStore) {
        alert('請先建立賣場基本設定後，再進行商品刊登。');
        router.push('/dashboard/store');
        return;
      }
      setStoreId(userStore.id);
      setLoading(false);
    }
    checkStore();
  }, [router]);

  const addVariantRow = () => {
    setVariants([...variants, { name: '', price, stock: 1 }]);
  };

  const removeVariantRow = (idx: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setPublishing(true);
    setMessage(null);

    const imagesArray = imageUrl
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_product',
        payload: {
          store_id: storeId,
          title,
          description,
          price,
          images: imagesArray,
          status: 'published',
          variants,
        },
      }),
    });

    const result = await res.json();
    if (!result.ok) {
      setMessage(`商品刊登失敗：${result.error}`);
      setPublishing(false);
      return;
    }

    router.push(`/products/${result.product_id}`);
    router.refresh();
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-[#666666]">驗證賣場權限中...</div>;
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 shadow-sm">
        <h1 className="text-lg font-bold text-[#222222] mb-1">刊登銷售品項</h1>
        <p className="text-xs text-[#666666] mb-6">
          純資訊刊登・0 刊登費・0 抽成・支援多規格庫存管理
        </p>

        {message && (
          <div className="mb-6 p-3 text-xs bg-[#FAF9F5] border border-[#7F0019] text-[#7F0019] rounded-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#222222] mb-1">商品名稱 *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
              placeholder="例：無染色純棉帆布托特包"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#222222] mb-1">主售價 (NT$) *</label>
            <input
              type="number"
              required
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#222222] mb-1">
              外部圖片 URL（每行一筆網址）
            </label>
            <textarea
              rows={2}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <div className="border-t border-b border-[#E6E3DC] py-4 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-[#222222]">商品規格與庫存設定</label>
              <button
                type="button"
                onClick={addVariantRow}
                className="text-xs text-[#7F0019] font-medium hover:underline"
              >
                + 新增一組規格
              </button>
            </div>
            {variants.map((v, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  required
                  placeholder="規格名稱"
                  value={v.name}
                  onChange={(e) => {
                    const next = [...variants];
                    next[idx].name = e.target.value;
                    setVariants(next);
                  }}
                  className="col-span-5 px-2.5 py-1.5 text-xs border border-[#E6E3DC] bg-[#FAF9F5]"
                />
                <input
                  type="number"
                  required
                  placeholder="價格"
                  value={v.price}
                  onChange={(e) => {
                    const next = [...variants];
                    next[idx].price = Number(e.target.value);
                    setVariants(next);
                  }}
                  className="col-span-3 px-2.5 py-1.5 text-xs border border-[#E6E3DC] bg-[#FAF9F5]"
                />
                <input
                  type="number"
                  required
                  placeholder="庫存"
                  value={v.stock}
                  onChange={(e) => {
                    const next = [...variants];
                    next[idx].stock = Number(e.target.value);
                    setVariants(next);
                  }}
                  className="col-span-3 px-2.5 py-1.5 text-xs border border-[#E6E3DC] bg-[#FAF9F5]"
                />
                <button
                  type="button"
                  onClick={() => removeVariantRow(idx)}
                  className="col-span-1 text-center text-xs text-[#666666] hover:text-[#7F0019]"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#222222] mb-1">詳細說明與物況</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
              placeholder="請詳述尺寸、新舊狀況、交易注意事項..."
            />
          </div>

          <button
            type="submit"
            disabled={publishing}
            className="w-full py-2.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium tracking-wider rounded-sm transition-colors"
          >
            {publishing ? '發布中...' : '確認刊登並公開至看板'}
          </button>
        </form>
      </div>
    </main>
  );
}
