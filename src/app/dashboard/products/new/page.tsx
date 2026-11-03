'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import ImageUploader5 from '@/components/ImageUploader5';
import {
  encodeDescriptionWithMeta,
  calculateTaxBreakdown,
  calculateDepositBreakdown,
  TaxMode,
  InvoiceCapability,
  FulfillmentType,
  PaymentTermType,
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  FULFILLMENT_TYPE_OPTIONS,
  PAYMENT_TERM_OPTIONS,
  SHORTAGE_POLICY_OPTIONS,
  BUYER_CANCEL_RULE_OPTIONS,
  PURCHASE_LIMIT_OPTIONS,
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

  // 銷售型態：現貨 / 預購 / 代購 / 團購 / 客製
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('in_stock');
  const [orderCutoffDate, setOrderCutoffDate] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [paymentTerm, setPaymentTerm] = useState<PaymentTermType>('full_upfront');
  const [depositPercent, setDepositPercent] = useState<number>(30);
  const [shortagePolicy, setShortagePolicy] = useState(SHORTAGE_POLICY_OPTIONS[0]);
  const [buyerCancelRule, setBuyerCancelRule] = useState(BUYER_CANCEL_RULE_OPTIONS[0]);
  const [purchaseLimit, setPurchaseLimit] = useState(PURCHASE_LIMIT_OPTIONS[0]);

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
    INVOICE_TYPE_OPTIONS[0],
    INVOICE_TYPE_OPTIONS[1],
  ]);

  // 交易條件
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

  // 切換銷售型態時自動聯動合適的預設出貨時效與付款方式
  const handleFulfillmentChange = (type: FulfillmentType) => {
    setFulfillmentType(type);
    if (type === 'proxy') {
      setCondition('全新代購／預購品 (Pre-order / Proxy)');
      setPaymentTerm('pay_after_secured');
      setShortagePolicy(SHORTAGE_POLICY_OPTIONS[1]);
      setLeadTime(LEAD_TIME_OPTIONS[2]);
      setWarranty(WARRANTY_OPTIONS[1]);
    } else if (type === 'preorder') {
      setCondition('全新代購／預購品 (Pre-order / Proxy)');
      setPaymentTerm('deposit_balance');
      setShortagePolicy(SHORTAGE_POLICY_OPTIONS[0]);
      setLeadTime(LEAD_TIME_OPTIONS[3]);
    } else if (type === 'group_buy') {
      setPaymentTerm('deposit_balance');
      setShortagePolicy(SHORTAGE_POLICY_OPTIONS[4]);
    } else if (type === 'in_stock') {
      setLeadTime(LEAD_TIME_OPTIONS[0]);
    }
  };

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
      fulfillmentType,
      orderCutoffDate: orderCutoffDate.trim(),
      estimatedArrival: estimatedArrival.trim(),
      paymentTerm,
      depositPercent: Number(depositPercent) || 30,
      shortagePolicy,
      buyerCancelRule,
      purchaseLimit,
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
  const depositInfo = calculateDepositBreakdown(
    singleTaxInfo.taxIncludedPrice,
    depositPercent
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 shadow-sm">
        <div className="border-b border-[#E6E3DC] pb-4 mb-6 flex justify-between items-end">
          <div>
            <span className="text-[11px] text-[#7F0019] font-medium">賣場：{storeName}</span>
            <h1 className="text-xl font-bold text-[#222222] mt-0.5">
              刊登銷售品項（支援現貨／預購／日本代購與缺貨取消退費保障）
            </h1>
            <p className="text-xs text-[#666666] mt-1">
              支援 5 張照片上傳・含稅/未稅即時換算・二聯/三聯發票・預購與代購沒買到自動取消退費條款
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
                placeholder="例：【日本展場限定代購】咒術迴戰 五條悟 壓克力立牌（沒買到全額退費）"
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
                  品牌 / 採購來源（選填）
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                  placeholder="例：東京原宿店／日本官網預購"
                />
              </div>
            </div>
          </section>

          {/* 區塊 3：銷售型態（現貨 / 預購 / 日本代購 / 團購）與沒買到取消保障 */}
          <section className="space-y-4 border-t border-[#E6E3DC] pt-6">
            <h2 className="text-sm font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
              二、供貨型態（現貨／預購／連線代購）、等待期與「沒買到／缺貨取消」保障設定
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {FULFILLMENT_TYPE_OPTIONS.map((opt) => {
                const active = fulfillmentType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleFulfillmentChange(opt.value)}
                    className={`p-3 text-left border rounded-sm transition-colors ${
                      active
                        ? 'border-[#7F0019] bg-[#FAF9F5] ring-1 ring-[#7F0019]'
                        : 'border-[#E6E3DC] bg-white hover:bg-[#FAF9F5]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#222222]">
                      <span>{opt.label}</span>
                      {active && <span className="text-[#7F0019]">✓</span>}
                    </div>
                    <p className="text-[11px] text-[#666666] mt-1 leading-relaxed">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* 當選擇預購、代購、團購或客製化時，展開專屬控管面板 */}
            {fulfillmentType !== 'in_stock' && (
              <div className="p-5 bg-[#FAF9F5] border-2 border-[#7F0019]/40 rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#E6E3DC] pb-2">
                  <span className="text-xs font-bold text-[#7F0019]">
                    ⏳ 預購／代購專屬設定：等待期、訂金模式與「沒買到／缺貨砍單」取消條款
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#222222] mb-1">
                      收單／採購截止時間
                    </label>
                    <input
                      type="text"
                      value={orderCutoffDate}
                      onChange={(e) => setOrderCutoffDate(e.target.value)}
                      placeholder="例：2026/11/20 23:59 或 額滿為止"
                      className="w-full px-3 py-2 text-xs border border-[#E6E3DC] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#222222] mb-1">
                      預計到貨／發售寄出期間 <span className="text-[#7F0019]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={estimatedArrival}
                      onChange={(e) => setEstimatedArrival(e.target.value)}
                      placeholder="例：預計 2026年12月下旬抵台寄出"
                      className="w-full px-3 py-2 text-xs border border-[#E6E3DC] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#222222] mb-1">
                      單人限購／配額限制
                    </label>
                    <select
                      value={purchaseLimit}
                      onChange={(e) => setPurchaseLimit(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E6E3DC] bg-white"
                    >
                      {PURCHASE_LIMIT_OPTIONS.map((lim) => (
                        <option key={lim} value={lim}>
                          {lim}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 付款與訂金模式 */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#222222]">
                    預購／代購之收款與訂金模式（防範未買到退款困擾或買家棄單）
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PAYMENT_TERM_OPTIONS.map((pt) => {
                      const active = paymentTerm === pt.value;
                      return (
                        <button
                          key={pt.value}
                          type="button"
                          onClick={() => setPaymentTerm(pt.value)}
                          className={`p-3 text-left border rounded-sm text-xs ${
                            active
                              ? 'border-[#7F0019] bg-white text-[#7F0019] font-bold'
                              : 'border-[#E6E3DC] bg-white text-[#222222]'
                          }`}
                        >
                          <div>
                            {active ? '● ' : '○ '}
                            {pt.label}
                          </div>
                          <div className="text-[10px] text-[#666666] font-normal mt-0.5">
                            {pt.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {paymentTerm === 'deposit_balance' && (
                    <div className="p-3 bg-white border border-[#E6E3DC] rounded-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#222222]">設定預收訂金比例：</span>
                        <select
                          value={depositPercent}
                          onChange={(e) => setDepositPercent(Number(e.target.value))}
                          className="px-2.5 py-1 border border-[#E6E3DC] bg-[#FAF9F5] font-bold text-[#7F0019]"
                        >
                          {[10, 20, 30, 50, 70, 80].map((pct) => (
                            <option key={pct} value={pct}>
                              預付 {pct}% 訂金（到貨付 {100 - pct}% 尾款）
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="text-[#666666]">
                        以含稅價試算：訂金{' '}
                        <strong className="text-[#7F0019]">
                          NT$ {depositInfo.depositAmount.toLocaleString()}
                        </strong>{' '}
                        ＋ 到貨尾款{' '}
                        <strong className="text-[#222222]">
                          NT$ {depositInfo.balanceAmount.toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* 沒買到 / 缺貨砍單之取消與退費政策 */}
                <div className="space-y-3 pt-2 border-t border-[#E6E3DC]">
                  <div>
                    <label className="block text-xs font-bold text-[#7F0019] mb-1">
                      ★ 當「預購／代購沒買到、現場缺貨或官方砍單」時之訂單取消與退費機制
                    </label>
                    <select
                      value={shortagePolicy}
                      onChange={(e) => setShortagePolicy(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E6E3DC] bg-white font-medium text-[#222222]"
                    >
                      {SHORTAGE_POLICY_OPTIONS.map((sp) => (
                        <option key={sp} value={sp}>
                          {sp}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#222222] mb-1">
                      買家取消與等待期防棄單約定
                    </label>
                    <select
                      value={buyerCancelRule}
                      onChange={(e) => setBuyerCancelRule(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E6E3DC] bg-white text-[#222222]"
                    >
                      {BUYER_CANCEL_RULE_OPTIONS.map((bc) => (
                        <option key={bc} value={bc}>
                          {bc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 區塊 4：價格、含稅/未稅基準與多規格款式設定 */}
          <section className="space-y-4 border-t border-[#E6E3DC] pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
                三、價位（含稅／未稅標示）、規格款式與庫存／可接單配額
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
                      {fulfillmentType === 'in_stock'
                        ? '現貨庫存數量（件）'
                        : '預計可接單／代購名額（件）'}{' '}
                      <span className="text-[#7F0019]">*</span>
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
                      （清楚標示款式名稱、含稅/未稅價位與庫存／可代購數量）
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
                            placeholder="例：A4 Size / 五條悟款"
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
                            placeholder="數量"
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
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#666666] flex justify-between px-1">
                        <span>款式「{v.name || `款式 ${idx + 1}`}」含未稅對照：</span>
                        <span className="font-medium text-[#222222]">
                          含稅 NT$ {vTax.taxIncludedPrice.toLocaleString()} ｜ 未稅 NT${' '}
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

          {/* 區塊 5：發票與報帳憑證設定 */}
          <section className="space-y-4 border-t border-[#E6E3DC] pt-6">
            <h2 className="text-sm font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
              四、發票開立與稅務報帳憑證設定（二聯式對個人／三聯式對公司）
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
                  勾選可提供給買家的發票格式（可複選）：
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

          {/* 區塊 6：交易條件、運費負擔、出貨時效與售後保固 */}
          <section className="space-y-4 border-t border-[#E6E3DC] pt-6">
            <h2 className="text-sm font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
              五、交易條件、運費負擔、出貨時效與售後保固
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">議價空間</label>
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
                <label className="block text-xs font-medium text-[#222222] mb-1">出貨時效</label>
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
                <label className="block text-xs font-medium text-[#222222] mb-1">售後保固</label>
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
                詳細商品說明與預購／代購注意事項 <span className="text-[#7F0019]">*</span>
              </label>
              <textarea
                rows={6}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                placeholder="請詳述尺寸規格、預購或代購時程、沒買到時之通知與退費方式..."
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
