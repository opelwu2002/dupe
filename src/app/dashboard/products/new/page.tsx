'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import ImageUploader5 from '@/components/ImageUploader5';
import {
  encodeDescriptionWithMeta,
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
} from '@/lib/productMeta';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');

  // 基本欄位
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [condition, setCondition] = useState(PRODUCT_CONDITIONS[0]);
  const [brand, setBrand] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  // 規格與價格模式（預設為「單一規格商品」，不強迫顯示多餘規格按鈕）
  const [hasMultiSpec, setHasMultiSpec] = useState(false);
  const [price, setPrice] = useState<number>(300);
  const [singleStock, setSingleStock] = useState<number>(1);
  const [variants, setVariants] = useState([
    { name: '黑色款', price: 300, stock: 1 },
    { name: '米白款', price: 300, stock: 1 },
  ]);

  // 支援交易方式
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>(['店到店（7-11 / 全家）', '面交當面點交']);
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
      setStoreName(userStore.name);
      setLoading(false);
    }
    checkStore();
  }, [router]);

  const toggleDeliveryMethod = (method: string) => {
    if (deliveryMethods.includes(method)) {
      if (deliveryMethods.length === 1) return; // 至少保留一種
      setDeliveryMethods(deliveryMethods.filter((m) => m !== method));
    } else {
      setDeliveryMethods([...deliveryMethods, method]);
    }
  };

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

    const mainPrice = hasMultiSpec
      ? Math.min(...variants.map((v) => Number(v.price) || 0))
      : Number(price) || 0;

    const encodedDescription = encodeDescriptionWithMeta(description, {
      category,
      condition,
      brand: brand.trim(),
      hasMultiSpec,
      stock: hasMultiSpec
        ? variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0)
        : Number(singleStock) || 1,
      deliveryMethods,
    });

    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_product',
        payload: {
          store_id: storeId,
          title: title.trim(),
          description: encodedDescription,
          price: mainPrice,
          images,
          status: 'published',
          has_multi_spec: hasMultiSpec,
          single_stock: singleStock,
          variants: hasMultiSpec ? variants : [],
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
    return <div className="p-12 text-center text-xs text-[#666666]">載入刊登工作台中...</div>;
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 shadow-sm">
        <div className="border-b border-[#E6E3DC] pb-4 mb-6 flex justify-between items-end">
          <div>
            <span className="text-[11px] text-[#7F0019] font-medium">賣場：{storeName}</span>
            <h1 className="text-xl font-bold text-[#222222] mt-0.5">刊登全新 / 二手銷售品項</h1>
            <p className="text-xs text-[#666666] mt-1">
              支援最多 5 張實拍照片上傳・自由切換單一二手品或多規格款式・0 平台抽成
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-3 text-xs bg-[#FAF9F5] border border-[#7F0019] text-[#7F0019] rounded-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 區塊 1：5張圖片上傳與網址管理 */}
          <section className="p-5 bg-[#FAF9F5]/60 border border-[#E6E3DC] rounded-sm">
            <ImageUploader5 images={images} maxImages={5} onChange={setImages} />
          </section>

          {/* 區塊 2：商品名稱、分類、二手物況與來源 */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
              商品基本資訊與物況
            </h2>

            <div>
              <label className="block text-xs font-medium text-[#222222] mb-1">
                商品標題名稱 <span className="text-[#7F0019]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                placeholder="例：【日本帶回】極簡真皮大容量手提托特包（附防塵袋）"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  商品分類 <span className="text-[#7F0019]">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  新舊物況 <span className="text-[#7F0019]">*</span>
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white"
                >
                  {PRODUCT_CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  品牌 / 購入來源（選填）
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white"
                  placeholder="例：日本東京專櫃購入"
                />
              </div>
            </div>
          </section>

          {/* 區塊 3：價格、庫存與規格模式 */}
          <section className="space-y-4 border-t border-[#E6E3DC] pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
                售價與商品規格設定
              </h2>
              <div className="flex items-center space-x-2 bg-[#FAF9F5] p-1 border border-[#E6E3DC] rounded-sm text-xs">
                <button
                  type="button"
                  onClick={() => setHasMultiSpec(false)}
                  className={`px-3 py-1 rounded-sm transition-colors ${
                    !hasMultiSpec
                      ? 'bg-[#7F0019] text-white font-medium'
                      : 'text-[#666666] hover:text-[#222222]'
                  }`}
                >
                  單一商品（無多規格）
                </button>
                <button
                  type="button"
                  onClick={() => setHasMultiSpec(true)}
                  className={`px-3 py-1 rounded-sm transition-colors ${
                    hasMultiSpec
                      ? 'bg-[#7F0019] text-white font-medium'
                      : 'text-[#666666] hover:text-[#222222]'
                  }`}
                >
                  多規格款式（如顏色/尺寸）
                </button>
              </div>
            </div>

            {!hasMultiSpec ? (
              <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    商品直購售價 (NT$) <span className="text-[#7F0019]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-bold border border-[#E6E3DC] rounded-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    可售庫存數量（件） <span className="text-[#7F0019]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={singleStock}
                    onChange={(e) => setSingleStock(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-white"
                  />
                </div>
                <p className="sm:col-span-2 text-[11px] text-[#666666]">
                  ✓ 目前為「單一商品」模式：前台商品頁將直接顯示售價與剩餘件數，不會出現多餘的「選擇規格：標準規格」按鈕。
                </p>
              </div>
            ) : (
              <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-[#222222]">
                    設定不同款式選項（例如：黑色、白色、大號、小號）
                  </span>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="text-xs text-[#7F0019] font-medium hover:underline"
                  >
                    + 新增一組款式規格
                  </button>
                </div>
                <div className="grid grid-cols-12 gap-2 text-[11px] text-[#666666] px-1">
                  <div className="col-span-5">款式 / 規格名稱</div>
                  <div className="col-span-3">對應售價 (NT$)</div>
                  <div className="col-span-3">庫存數量</div>
                  <div className="col-span-1 text-center">移除</div>
                </div>
                {variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      required
                      placeholder="例：焦糖棕 / M號"
                      value={v.name}
                      onChange={(e) => {
                        const next = [...variants];
                        next[idx].name = e.target.value;
                        setVariants(next);
                      }}
                      className="col-span-5 px-2.5 py-1.5 text-xs border border-[#E6E3DC] bg-white"
                    />
                    <input
                      type="number"
                      required
                      min={0}
                      value={v.price}
                      onChange={(e) => {
                        const next = [...variants];
                        next[idx].price = Number(e.target.value);
                        setVariants(next);
                      }}
                      className="col-span-3 px-2.5 py-1.5 text-xs border border-[#E6E3DC] bg-white"
                    />
                    <input
                      type="number"
                      required
                      min={0}
                      value={v.stock}
                      onChange={(e) => {
                        const next = [...variants];
                        next[idx].stock = Number(e.target.value);
                        setVariants(next);
                      }}
                      className="col-span-3 px-2.5 py-1.5 text-xs border border-[#E6E3DC] bg-white"
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
            )}
          </section>

          {/* 區塊 4：交易方式與詳細物況描述 */}
          <section className="space-y-4 border-t border-[#E6E3DC] pt-6">
            <h2 className="text-sm font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
              交付方式與詳細物況說明
            </h2>

            <div>
              <label className="block text-xs font-medium text-[#222222] mb-2">
                本品項支援之交付管道（可複選）
              </label>
              <div className="flex flex-wrap gap-2">
                {['店到店（7-11 / 全家）', '郵寄 / 宅配寄送', '面交當面點交'].map((method) => {
                  const active = deliveryMethods.includes(method);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => toggleDeliveryMethod(method)}
                      className={`px-3 py-1.5 text-xs border rounded-sm transition-colors ${
                        active
                          ? 'border-[#7F0019] bg-[#FAF9F5] text-[#7F0019] font-medium'
                          : 'border-[#E6E3DC] bg-white text-[#666666]'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#222222] mb-1">
                詳細說明與二手物況備註 <span className="text-[#7F0019]">*</span>
              </label>
              <textarea
                rows={6}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                placeholder="請詳述尺寸規格、購買時間、二手保存狀況（有無刮痕或配件）、寄送運費說明..."
              />
            </div>
          </section>

          <div className="pt-2">
            <button
              type="submit"
              disabled={publishing}
              className="w-full py-3 bg-[#7F0019] hover:bg-[#660014] text-white text-sm font-medium tracking-wider rounded-sm transition-colors disabled:opacity-50"
            >
              {publishing ? '正在發布商品至看板...' : '確認刊登並公開至看板'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
