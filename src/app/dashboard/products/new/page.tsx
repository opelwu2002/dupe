'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import ImageUploader5 from '@/components/ImageUploader5';
import {
  encodeDescriptionWithMeta,
  calculateTaxBreakdown,
  TaxMode,
  InvoiceCapability,
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  INVOICE_CAPABILITY_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  NEGOTIABLE_OPTIONS,
  SHIPPING_FEE_OPTIONS,
  LEAD_TIME_OPTIONS,
  WARRANTY_OPTIONS,
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

  // 價格、稅務與多規格模式
  const [taxMode, setTaxMode] = useState<TaxMode>('tax_included');
  const [hasMultiSpec, setHasMultiSpec] = useState(false);
  const [price, setPrice] = useState<number>(3000);
  const [singleStock, setSingleStock] = useState<number>(1);
  const [variants, setVariants] = useState([
    { name: 'A4 Size', price: 30000, stock: 1 },
    { name: 'B4 Size', price: 27000, stock: 1 },
  ]);

  // 發票開立設定
  const [invoiceCapability, setInvoiceCapability] = useState<InvoiceCapability>('invoice');
  const [invoiceTypes, setInvoiceTypes] = useState<string[]>([
    '二聯式發票（對個人／自然人買家）',
    '三聯式發票（對公司行號／附統一編號與抬頭）',
  ]);

  // 周全交易條件
  const [negotiable, setNegotiable] = useState(NEGOTIABLE_OPTIONS[0]);
  const [shippingFeeRule, setShippingFeeRule] = useState(SHIPPING_FEE_OPTIONS[0]);
  const [leadTime, setLeadTime] = useState(LEAD_TIME_OPTIONS[0]);
  const [warranty, setWarranty] = useState(WARRANTY_OPTIONS[0]);
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>([
    '店到店（7-11 / 全家）',
    '面交當面點交',
  ]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkStore() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  const toggleArrayItem = (
    list: string[],
    setList: (v: string[]) => void,
    item: string,
    minOne = true
  ) => {
    if (list.includes(item)) {
      if (minOne && list.length <= 1) return;
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
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
      taxMode,
      invoiceCapability,
      invoiceTypes: invoiceCapability === 'invoice' ? invoiceTypes : [],
      negotiable,
      shippingFeeRule,
      leadTime,
      warranty,
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

  const singleTaxInfo = calculateTaxBreakdown(price, taxMode);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 shadow-sm">
        <div className="border-b border-[#E6E3DC] pb-4 mb-6 flex justify-between items-end">
          <div>
            <span className="text-[11px] text-[#7F0019] font-medium">賣場：{storeName}</span>
            <h1 className="text-xl font-bold text-[#222222] mt-0.5">
              刊登銷售品項（專業稅務與多規格工作台）
            </h1>
            <p className="text-xs text-[#666666] mt-1">
              支援 5 張實拍照片上傳・含稅/未稅即時換算・主動標示二聯式(個人)/三聯式(公司)發票資訊
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
              一、商品基本資訊與物況
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
                placeholder="例：【日本直送】真皮手提托特包（A4/B4 雙尺寸可選）"
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
                  className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
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
                  className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
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
                  className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                  placeholder="例：日本專櫃購入 / 台灣公司貨"
                />
              </div>
            </div>
          </section>

          {/* 區塊 3：價格、含稅/未稅基準與多規格款式設定 */}
          <section className="space-y-4 border-t border-[#E6E3DC] pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
                二、價位（含稅／未稅標示）、規格款式與庫存設定
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
                  單一商品
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
                  多規格款式
                </button>
              </div>
            </div>

            {/* 含稅 / 未稅計價基準選擇 */}
            <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-2">
              <label className="block text-xs font-bold text-[#222222]">
                設定商品價位之稅務基準（系統將自動為買家同步標示「含稅價」與「未稅價」）
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setTaxMode('tax_included')}
                  className={`p-2.5 text-left border rounded-sm text-xs transition-colors ${
                    taxMode === 'tax_included'
                      ? 'border-[#7F0019] bg-white text-[#7F0019] font-bold'
                      : 'border-[#E6E3DC] bg-white text-[#222222]'
                  }`}
                >
                  <div>● 所填價位為「含稅價」</div>
                  <div className="text-[10px] text-[#666666] font-normal mt-0.5">
                    自動反推標示未稅價 (÷1.05)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTaxMode('tax_excluded')}
                  className={`p-2.5 text-left border rounded-sm text-xs transition-colors ${
                    taxMode === 'tax_excluded'
                      ? 'border-[#7F0019] bg-white text-[#7F0019] font-bold'
                      : 'border-[#E6E3DC] bg-white text-[#222222]'
                  }`}
                >
                  <div>● 所填價位為「未稅價」</div>
                  <div className="text-[10px] text-[#666666] font-normal mt-0.5">
                    自動加計標示 5% 含稅價 (×1.05)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTaxMode('tax_free')}
                  className={`p-2.5 text-left border rounded-sm text-xs transition-colors ${
                    taxMode === 'tax_free'
                      ? 'border-[#7F0019] bg-white text-[#7F0019] font-bold'
                      : 'border-[#E6E3DC] bg-white text-[#222222]'
                  }`}
                >
                  <div>● 個人二手／免徵營業稅</div>
                  <div className="text-[10px] text-[#666666] font-normal mt-0.5">
                    未稅與含稅同價，不另加收 5%
                  </div>
                </button>
              </div>
            </div>

            {!hasMultiSpec ? (
              <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#222222] mb-1">
                      商品價位 (NT$ -{' '}
                      {taxMode === 'tax_included'
                        ? '含稅'
                        : taxMode === 'tax_excluded'
                        ? '未稅'
                        : '免稅直購'}
                      ) <span className="text-[#7F0019]">*</span>
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
                    <label className="block text-xs font-bold text-[#222222] mb-1">
                      庫存數量（件） <span className="text-[#7F0019]">*</span>
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
                </div>
                <div className="p-2.5 bg-white border border-[#E6E3DC] text-xs flex flex-wrap justify-between items-center gap-2">
                  <span className="text-[#666666]">前台即時標示預覽：</span>
                  <span className="font-bold text-[#222222]">
                    含稅價：NT$ {singleTaxInfo.taxIncludedPrice.toLocaleString()} ｜ 未稅價：NT${' '}
                    {singleTaxInfo.taxExcludedPrice.toLocaleString()}
                    {singleTaxInfo.taxAmount > 0 &&
                      `（5% 營業稅額：NT$ ${singleTaxInfo.taxAmount.toLocaleString()}）`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#E6E3DC]">
                  <div>
                    <span className="text-xs font-bold text-[#222222]">多規格款式設定</span>
                    <span className="ml-2 text-[11px] text-[#666666]">
                      （清楚標示款式名稱、含稅/未稅價位與庫存數量）
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="px-2.5 py-1 bg-[#7F0019] text-white text-xs font-medium rounded-sm hover:bg-[#660014]"
                  >
                    + 新增款式
                  </button>
                </div>

                {/* 明確欄位標頭 */}
                <div className="grid grid-cols-12 gap-2 px-2 py-1.5 bg-[#E6E3DC]/50 text-xs font-bold text-[#222222] rounded-sm">
                  <div className="col-span-5">款式名稱 *</div>
                  <div className="col-span-4">
                    價位 (NT$ -{' '}
                    {taxMode === 'tax_included'
                      ? '填含稅'
                      : taxMode === 'tax_excluded'
                      ? '填未稅'
                      : '直購價'}
                    ) *
                  </div>
                  <div className="col-span-2">庫存數量 *</div>
                  <div className="col-span-1 text-center">操作</div>
                </div>

                {variants.map((v, idx) => {
                  const vTax = calculateTaxBreakdown(v.price, taxMode);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 bg-white border border-[#E6E3DC] rounded-sm space-y-1.5"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <input
                            type="text"
                            required
                            placeholder="例：A4 Size / 黑色款"
                            value={v.name}
                            onChange={(e) => {
                              const next = [...variants];
                              next[idx].name = e.target.value;
                              setVariants(next);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="number"
                            required
                            min={0}
                            placeholder="輸入價位"
                            value={v.price}
                            onChange={(e) => {
                              const next = [...variants];
                              next[idx].price = Number(e.target.value);
                              setVariants(next);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs font-bold border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            required
                            min={0}
                            placeholder="庫存"
                            value={v.stock}
                            onChange={(e) => {
                              const next = [...variants];
                              next[idx].stock = Number(e.target.value);
                              setVariants(next);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeVariantRow(idx)}
                            className="text-xs text-[#666666] hover:text-[#7F0019] font-bold"
                            title="刪除此款式"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#666666] flex justify-between px-1">
                        <span>款式 {idx + 1} 稅務價格換算：</span>
                        <span className="font-medium text-[#222222]">
                          含稅 NT$ {vTax.taxIncludedPrice.toLocaleString()} ／ 未稅 NT${' '}
                          {vTax.taxExcludedPrice.toLocaleString()}
                          {vTax.taxAmount > 0 && `（稅額 $${vTax.taxAmount.toLocaleString()}）`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 區塊 4：發票與報帳憑證設定（二聯式對個人／三聯式對公司） */}
          <section className="space-y-4 border-t border-[#E6E3DC] pt-6">
            <h2 className="text-sm font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
              三、發票開立與稅務報帳憑證設定（主動揭露予買家）
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INVOICE_CAPABILITY_OPTIONS.map((opt) => {
                const active = invoiceCapability === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setInvoiceCapability(opt.value)}
                    className={`p-3.5 text-left border rounded-sm transition-colors ${
                      active
                        ? 'border-[#7F0019] bg-[#FAF9F5] ring-1 ring-[#7F0019]'
                        : 'border-[#E6E3DC] bg-white hover:bg-[#FAF9F5]/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#222222] flex items-center justify-between">
                      <span>{opt.label}</span>
                      {active && <span className="text-[#7F0019]">✓ 已選用</span>}
                    </div>
                    <p className="text-[11px] text-[#666666] mt-1 leading-relaxed">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            {invoiceCapability === 'invoice' && (
              <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-2.5">
                <label className="block text-xs font-bold text-[#7F0019]">
                  請勾選支援開立之統一發票類別（可複選，買家可於商品頁預填公司抬頭與 8 碼統編）：
                </label>
                <div className="flex flex-wrap gap-2">
                  {INVOICE_TYPE_OPTIONS.map((t) => {
                    const checked = invoiceTypes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleArrayItem(invoiceTypes, setInvoiceTypes, t, true)}
                        className={`px-3 py-1.5 text-xs border rounded-sm transition-colors ${
                          checked
                            ? 'border-[#7F0019] bg-white text-[#7F0019] font-bold'
                            : 'border-[#E6E3DC] bg-white text-[#666666]'
                        }`}
                      >
                        {checked ? '☑ ' : '☐ '}
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* 區塊 5：周全交易條件、運費規則與售後保固 */}
          <section className="space-y-4 border-t border-[#E6E3DC] pt-6">
            <h2 className="text-sm font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
              四、交易條件、運費負擔、出貨時效與售後保固
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">議價空間設定</label>
                <select
                  value={negotiable}
                  onChange={(e) => setNegotiable(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                >
                  {NEGOTIABLE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">運費負擔方式</label>
                <select
                  value={shippingFeeRule}
                  onChange={(e) => setShippingFeeRule(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                >
                  {SHIPPING_FEE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">預估備貨與出貨時效</label>
                <select
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                >
                  {LEAD_TIME_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">售後與保固說明</label>
                <select
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                >
                  {WARRANTY_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                      onClick={() =>
                        toggleArrayItem(deliveryMethods, setDeliveryMethods, method, true)
                      }
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
                詳細商品說明與物況備註 <span className="text-[#7F0019]">*</span>
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
