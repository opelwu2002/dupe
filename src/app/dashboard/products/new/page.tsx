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
  const [price, setPrice] = useState<number>(100);
  const [imageUrl, setImageUrl] = useState('');
  const [variantName, setVariantName] = useState('預設規格');
  const [variantStock, setVariantStock] = useState<number>(1);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkStore() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!store) {
        alert('請先建立賣場基本設定後，再進行商品刊登。');
        router.push('/dashboard/store');
        return;
      }
      setStoreId(store.id);
      setLoading(false);
    }
    checkStore();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setPublishing(true);
    setMessage(null);

    const imagesArray = imageUrl.trim() ? [imageUrl.trim()] : [];

    // 1. 建立商品
    const { data: productData, error: productError } = await supabase
      .from('products')
      .insert([
        {
          store_id: storeId,
          title,
          description,
          price,
          images: imagesArray,
          status: 'published',
        },
      ])
      .select()
      .single();

    if (productError || !productData) {
      setMessage(`商品刊登失敗：${productError?.message}`);
      setPublishing(false);
      return;
    }

    // 2. 建立預設規格
    const { error: variantError } = await supabase
      .from('product_variants')
      .insert([
        {
          product_id: productData.id,
          name: variantName,
          price: price,
          stock: variantStock,
        },
      ]);

    if (variantError) {
      setMessage(`規格建立失敗：${variantError.message}`);
    } else {
      router.push(`/products/${productData.id}`);
      router.refresh();
    }
    setPublishing(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-[#666666]">驗證權限中...</div>;
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 shadow-sm">
        <h1 className="text-lg font-bold text-[#222222] mb-1">刊登銷售品項</h1>
        <p className="text-xs text-[#666666] mb-6">
          純資訊刊登・0 刊登費・0 抽成・刊登後買家將直接取得您的聯繫管道。
        </p>

        {message && (
          <div className="mb-6 p-3 text-xs bg-[#FAF9F5] border border-[#E6E3DC] text-[#7F0019] rounded-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#666666] mb-1">商品名稱 *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="例：無染色純棉收納袋"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#666666] mb-1">商品售價 (NT$) *</label>
            <input
              type="number"
              required
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#666666] mb-1">外部圖片 URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="https://... (請輸入公開圖片網址，嚴禁 Base64)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">主要規格名稱</label>
              <input
                type="text"
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">庫存數量</label>
              <input
                type="number"
                min={0}
                value={variantStock}
                onChange={(e) => setVariantStock(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#666666] mb-1">詳細說明與物況</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="說明材質、尺寸、保存狀況..."
            />
          </div>

          <button
            type="submit"
            disabled={publishing}
            className="w-full py-2.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium tracking-wider rounded-sm transition-colors disabled:opacity-50"
          >
            {publishing ? '發布中...' : '確認刊登並公開至看板'}
          </button>
        </form>
      </div>
    </main>
  );
}
