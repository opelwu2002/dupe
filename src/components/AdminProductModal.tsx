'use client';

import React, { useState, useEffect } from 'react';
import ImageUploader5 from '@/components/ImageUploader5';
import {
  BUYER_CANCEL_RULE_OPTIONS,
  calculateTaxBreakdown,
  decodeDescriptionAndMeta,
  encodeDescriptionWithMeta,
  FULFILLMENT_TYPE_OPTIONS,
  FulfillmentType,
  INVOICE_CAPABILITY_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  InvoiceCapability,
  LEAD_TIME_OPTIONS,
  NEGOTIABLE_OPTIONS,
  PAYMENT_TERM_OPTIONS,
  PaymentTermType,
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  ProductMeta,
  PURCHASE_LIMIT_OPTIONS,
  SHIPPING_FEE_OPTIONS,
  SHORTAGE_POLICY_OPTIONS,
  TaxMode,
  WARRANTY_OPTIONS,
} from '@/lib/productMeta';

const DELIVERY_METHOD_OPTIONS = [
  '店到店（7-11 / 全家）',
  '面交當面點交',
  '黑貓／郵局宅配',
  '日本空運直郵／集運',
  '賣家自訂物流',
];

const TAX_MODE_OPTIONS: Array<{ value: TaxMode; label: string; desc: string }> = [
  {
    value: 'tax_included',
    label: '輸入價為「含稅價」（內含5%營業稅）',
    desc: '系統自動反推未稅價與5%稅額',
  },
  {
    value: 'tax_excluded',
    label: '輸入價為「未稅價」（發票外加5%）',
    desc: '系統自動加計5%營業稅算出含稅價',
  },
  {
    value: 'tax_free',
    label: '個人賣家／免稅直購價（不另加稅）',
    desc: '個人二手讓渡或代購，含稅與未稅同價',
  },
];

interface StoreOption {
  id: string;
  name: string;
}

interface VariantItem {
  id?: string;
  name: string;
  price: number;
  stock: number;
}

export interface AdminEditableProduct {
  id: string;
  store_id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  status: string;
  product_variants: VariantItem[];
}

interface AdminProductModalProps {
  open?: boolean;
  editingProduct?: AdminEditableProduct | null;
  product?: AdminEditableProduct | null;
  stores: StoreOption[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}

export default function AdminProductModal({
  open = true,
  editingProduct: propEditingProduct,
  product: propProduct,
  stores,
  onClose,
  onSaved,
}: AdminProductModalProps) {
  const editingProduct = propEditingProduct !== undefined ? propEditingProduct : propProduct || null;
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(350);
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState('published');
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [condition, setCondition] = useState<string>(PRODUCT_CONDITIONS[0]);
  const [brand, setBrand] = useState('');
  const [cleanDesc, setCleanDesc] = useState('');

  const [hasMultiSpec, setHasMultiSpec] = useState(false);
  const [singleStock, setSingleStock] = useState(1);
  const [variants, setVariants] = useState<VariantItem[]>([
    { name: '標準款式', price: 350, stock: 1 },
  ]);

  const [taxMode, setTaxMode] = useState<TaxMode>('tax_included');
  const [invoiceCapability, setInvoiceCapability] = useState<InvoiceCapability>('invoice');
  const [invoiceTypes, setInvoiceTypes] = useState<string[]>([
    INVOICE_TYPE_OPTIONS[0],
    INVOICE_TYPE_OPTIONS[1],
  ]);

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('in_stock');
  const [orderCutoffDate, setOrderCutoffDate] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [paymentTerm, setPaymentTerm] = useState<PaymentTermType>('full_upfront');
  const [depositPercent, setDepositPercent] = useState(30);
  const [shortagePolicy, setShortagePolicy] = useState<string>(SHORTAGE_POLICY_OPTIONS[0]);
  const [buyerCancelRule, setBuyerCancelRule] = useState<string>(BUYER_CANCEL_RULE_OPTIONS[0]);
  const [purchaseLimit, setPurchaseLimit] = useState<string>(PURCHASE_LIMIT_OPTIONS[0]);

  const [negotiable, setNegotiable] = useState<string>(NEGOTIABLE_OPTIONS[0]);
  const [shippingFeeRule, setShippingFeeRule] = useState<string>(SHIPPING_FEE_OPTIONS[0]);
  const [leadTime, setLeadTime] = useState<string>(LEAD_TIME_OPTIONS[0]);
  const [warranty, setWarranty] = useState<string>(WARRANTY_OPTIONS[0]);
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>([
    '店到店（7-11 / 全家）',
    '面交當面點交',
  ]);

  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      const rawVars = editingProduct.product_variants || [];
      const { meta, cleanDescription } = decodeDescriptionAndMeta(
        editingProduct.description || '',
        rawVars
      );

      setStoreId(editingProduct.store_id || stores[0]?.id || '');
      setTitle(editingProduct.title);
      setPrice(editingProduct.price);
      setImages((editingProduct.images || []).slice(0, 5));
      setStatus(editingProduct.status || 'published');
      setCategory(meta.category);
      setCondition(meta.condition);
      setBrand(meta.brand);
      setCleanDesc(cleanDescription);
      setHasMultiSpec(meta.hasMultiSpec);
      setSingleStock(rawVars[0]?.stock ?? meta.stock ?? 1);
      setVariants(
        !meta.hasMultiSpec || rawVars.length === 0
          ? [
              { name: 'A4 Size', price: editingProduct.price || 30000, stock: rawVars[0]?.stock ?? 1 },
              { name: 'B4 Size', price: 27000, stock: 1 },
            ]
          : rawVars.map((v) => ({
              name: v.name === '__SINGLE__' ? '標準款式' : v.name,
              price: v.price,
              stock: v.stock,
            }))
      );
      setTaxMode(meta.taxMode);
      setInvoiceCapability(meta.invoiceCapability);
      setInvoiceTypes(
        meta.invoiceTypes && meta.invoiceTypes.length > 0
          ? meta.invoiceTypes
          : [INVOICE_TYPE_OPTIONS[0], INVOICE_TYPE_OPTIONS[1]]
      );
      setFulfillmentType(meta.fulfillmentType);
      setOrderCutoffDate(meta.orderCutoffDate);
      setEstimatedArrival(meta.estimatedArrival);
      setPaymentTerm(meta.paymentTerm);
      setDepositPercent(meta.depositPercent);
      setShortagePolicy(meta.shortagePolicy);
      setBuyerCancelRule(meta.buyerCancelRule);
      setPurchaseLimit(meta.purchaseLimit);
      setNegotiable(meta.negotiable);
      setShippingFeeRule(meta.shippingFeeRule);
      setLeadTime(meta.leadTime);
      setWarranty(meta.warranty);
      setDeliveryMethods(meta.deliveryMethods);
    } else {
      setStoreId(stores[0]?.id || '');
      setTitle('');
      setPrice(350);
      setImages([]);
      setStatus('published');
      setCategory(PRODUCT_CATEGORIES[0]);
      setCondition(PRODUCT_CONDITIONS[0]);
      setBrand('');
      setCleanDesc('');
      setHasMultiSpec(false);
      setSingleStock(5);
      setVariants([{ name: '標準款式', price: 350, stock: 5 }]);
      setTaxMode('tax_included');
      setInvoiceCapability('invoice');
      setInvoiceTypes([INVOICE_TYPE_OPTIONS[0], INVOICE_TYPE_OPTIONS[1]]);
      setFulfillmentType('in_stock');
      setOrderCutoffDate('');
      setEstimatedArrival('');
      setPaymentTerm('full_upfront');
      setDepositPercent(30);
      setShortagePolicy(SHORTAGE_POLICY_OPTIONS[0]);
      setBuyerCancelRule(BUYER_CANCEL_RULE_OPTIONS[0]);
      setPurchaseLimit(PURCHASE_LIMIT_OPTIONS[0]);
      setNegotiable(NEGOTIABLE_OPTIONS[0]);
      setShippingFeeRule(SHIPPING_FEE_OPTIONS[0]);
      setLeadTime(LEAD_TIME_OPTIONS[0]);
      setWarranty(WARRANTY_OPTIONS[0]);
      setDeliveryMethods(['店到店（7-11 / 全家）', '面交當面點交']);
    }
  }, [open, editingProduct, stores]);

  if (!open) return null;

  const isPreorderOrProxy = fulfillmentType !== 'in_stock';
  const mainTaxBreakdown = calculateTaxBreakdown(price, taxMode);

  const toggleInvoiceType = (t: string) => {
    if (invoiceTypes.includes(t)) {
      if (invoiceTypes.length <= 1) return;
      setInvoiceTypes(invoiceTypes.filter((x) => x !== t));
    } else {
      setInvoiceTypes([...invoiceTypes, t]);
    }
  };

  const toggleDelivery = (method: string) => {
    if (deliveryMethods.includes(method)) {
      if (deliveryMethods.length <= 1) return;
      setDeliveryMethods(deliveryMethods.filter((m) => m !== method));
    } else {
      setDeliveryMethods([...deliveryMethods, method]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const totalStock = hasMultiSpec
      ? variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0)
      : Number(singleStock) || 1;

    const meta: ProductMeta = {
      category,
      condition,
      brand: brand.trim(),
      hasMultiSpec,
      stock: totalStock,
      deliveryMethods,
      taxMode,
      invoiceCapability,
      invoiceTypes,
      fulfillmentType,
      orderCutoffDate,
      estimatedArrival,
      paymentTerm,
      depositPercent,
      shortagePolicy,
      buyerCancelRule,
      purchaseLimit,
      negotiable,
      shippingFeeRule,
      leadTime,
      warranty,
    };
    const encodedDescription = encodeDescriptionWithMeta(cleanDesc, meta);
    const effectivePrice = hasMultiSpec ? Number(variants[0]?.price || price) : Number(price);

    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_product',
        payload: {
          id: editingProduct?.id || null,
          store_id: storeId,
          title,
          description: encodedDescription,
          price: effectivePrice,
          images: images.slice(0, 5),
          status,
          has_multi_spec: hasMultiSpec,
          single_stock: singleStock,
          variants: hasMultiSpec ? variants : [],
        },
      }),
    });
    const result = await res.json();
    setSaving(false);
    if (result.ok) {
      onSaved(
        editingProduct
          ? '商品、多規格款式與含未稅發票設定已同步更新至前台！'
          : '新商品已成功上架至前台！'
      );
      onClose();
    } else {
      alert(`商品儲存失敗：${result.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#E6E3DC] w-full max-w-3xl rounded-sm p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-[#E6E3DC] mb-4">
          <div>
            <h3 className="text-base font-bold text-[#222222]">
              {editingProduct
                ? '編輯商品・多規格含稅/未稅與預購代購設定'
                : '後台直接上架商品（全功能規格工作台）'}
            </h3>
            <p className="text-[11px] text-[#666666] mt-0.5">
              支援 5 張實拍照片上傳、明確四欄規格標頭、含稅／未稅即時試算、二聯／三聯發票與預購沒買到退費設定
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#666666] hover:text-[#222222]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* 所屬賣場與上架狀態 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm">
            <div className="sm:col-span-2">
              <label className="block font-bold mb-1 text-[#222222]">指派所屬賣場 *</label>
              <select
                required
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1 text-[#222222]">商品狀態</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
              >
                <option value="published">上架銷售中 (published)</option>
                <option value="sold_out">已售完 / 缺貨流單 (sold_out)</option>
                <option value="archived">暫時下架隱藏 (archived)</option>
              </select>
            </div>
          </div>

          {/* 5 張照片管理 */}
          <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm">
            <label className="block font-bold text-[#222222] mb-2">
              商品實拍照片管理（最多 5 張：支援電腦上傳或貼上圖片網址）
            </label>
            <ImageUploader5 images={images} onChange={setImages} />
          </div>

          {/* 標題與分類 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold mb-1">商品標題 *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">商品分類</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">新舊狀況</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
              >
                {PRODUCT_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">品牌 / 產地 / 作者</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
              />
            </div>
          </div>

          {/* 預購／代購／現貨供應設定 */}
          <div className="p-4 bg-[#FAF9F5] border-2 border-[#222222]/20 rounded-sm space-y-3">
            <div className="font-bold text-[#222222]">
              供貨型態與「預購／代購沒買到退費取消」設定
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {FULFILLMENT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFulfillmentType(opt.value)}
                  className={`p-2 text-left border rounded-sm ${
                    fulfillmentType === opt.value
                      ? 'border-[#7F0019] bg-white text-[#7F0019] font-bold'
                      : 'border-[#E6E3DC] bg-white text-[#222222]'
                  }`}
                >
                  <div>{opt.badge}</div>
                  <div className="text-[10px] text-[#666666] mt-0.5 line-clamp-1">{opt.desc}</div>
                </button>
              ))}
            </div>

            {isPreorderOrProxy && (
              <div className="p-3 bg-white border border-[#7F0019]/30 rounded-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">收單／結單截止時間</label>
                    <input
                      type="text"
                      value={orderCutoffDate}
                      onChange={(e) => setOrderCutoffDate(e.target.value)}
                      placeholder="例：11/20 23:59 結單"
                      className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">預計採買／抵台出貨時程</label>
                    <input
                      type="text"
                      value={estimatedArrival}
                      onChange={(e) => setEstimatedArrival(e.target.value)}
                      placeholder="例：預計 12 月上旬抵台寄出"
                      className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">收款與訂金模式</label>
                    <select
                      value={paymentTerm}
                      onChange={(e) => setPaymentTerm(e.target.value as PaymentTermType)}
                      className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
                    >
                      {PAYMENT_TERM_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#7F0019] mb-1">
                      ★ 萬一沒買到／缺貨／砍單之退費取消機制
                    </label>
                    <select
                      value={shortagePolicy}
                      onChange={(e) => setShortagePolicy(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#7F0019] bg-[#FAF9F5] font-medium"
                    >
                      {SHORTAGE_POLICY_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-1">買家結單前後取消規範</label>
                  <select
                    value={buyerCancelRule}
                    onChange={(e) => setBuyerCancelRule(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    {BUYER_CANCEL_RULE_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ★ 定價、含稅/未稅與多規格款式（含明確四欄標頭） */}
          <div className="p-4 bg-[#FAF9F5] border-2 border-[#7F0019]/30 rounded-sm space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="font-bold text-[#222222]">
                定價、含稅／未稅設定與規格款式（強制欄位標頭與稅額對照）
              </span>
              <div className="flex border border-[#E6E3DC] rounded-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setHasMultiSpec(false)}
                  className={`px-3 py-1 font-medium ${
                    !hasMultiSpec ? 'bg-[#7F0019] text-white' : 'bg-white text-[#666666]'
                  }`}
                >
                  單一規格商品
                </button>
                <button
                  type="button"
                  onClick={() => setHasMultiSpec(true)}
                  className={`px-3 py-1 font-medium ${
                    hasMultiSpec ? 'bg-[#7F0019] text-white' : 'bg-white text-[#666666]'
                  }`}
                >
                  多規格／多款式
                </button>
              </div>
            </div>

            {/* 營業稅計價模式 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TAX_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTaxMode(opt.value)}
                  className={`p-2 text-left border rounded-sm ${
                    taxMode === opt.value
                      ? 'border-[#7F0019] bg-white text-[#7F0019] font-bold'
                      : 'border-[#E6E3DC] bg-white text-[#222222]'
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="text-[10px] text-[#666666]">{opt.desc}</div>
                </button>
              ))}
            </div>

            {!hasMultiSpec ? (
              <div className="space-y-2 bg-white p-3.5 border border-[#E6E3DC] rounded-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">
                      單一商品價位 (NT$ -{' '}
                      {taxMode === 'tax_excluded'
                        ? '未稅價'
                        : taxMode === 'tax_included'
                        ? '含稅價'
                        : '免稅價'}
                      ) *
                    </label>
                    <input
                      type="number"
                      required
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#7F0019] bg-[#FAF9F5] font-bold text-[#7F0019]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">可售庫存數量 *</label>
                    <input
                      type="number"
                      required
                      value={singleStock}
                      onChange={(e) => setSingleStock(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-[#E6E3DC] flex flex-wrap gap-4 text-[11px]">
                  <span>
                    含稅總價：
                    <strong className="text-[#7F0019]">
                      NT$ {mainTaxBreakdown.taxIncludedPrice.toLocaleString()}
                    </strong>
                  </span>
                  <span>
                    未稅淨價：
                    <strong>NT$ {mainTaxBreakdown.taxExcludedPrice.toLocaleString()}</strong>
                  </span>
                  <span>
                    5% 營業稅額：
                    <strong>NT$ {mainTaxBreakdown.taxAmount.toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 bg-white p-3.5 border border-[#E6E3DC] rounded-sm">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#222222]">多規格款式清單</span>
                  <button
                    type="button"
                    onClick={() =>
                      setVariants([...variants, { name: '', price: price || 350, stock: 1 }])
                    }
                    className="px-2.5 py-1 bg-[#7F0019] text-white rounded-sm font-medium"
                  >
                    + 新增一個規格款式
                  </button>
                </div>

                {/* ★ 強制顯示之四欄標頭 */}
                <div className="grid grid-cols-12 gap-2 px-2 py-1.5 bg-[#222222] text-white font-bold rounded-sm text-[11px]">
                  <div className="col-span-5">款式名稱</div>
                  <div className="col-span-3">
                    價位 (NT$ - {taxMode === 'tax_excluded' ? '未稅' : '含稅'})
                  </div>
                  <div className="col-span-2">庫存數量</div>
                  <div className="col-span-2 text-center">操作</div>
                </div>

                {variants.map((v, idx) => {
                  const rowTax = calculateTaxBreakdown(v.price, taxMode);
                  return (
                    <div
                      key={idx}
                      className="p-2 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1.5"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <input
                            type="text"
                            required
                            placeholder="例：A4 Size / 黑色 M 號"
                            value={v.name}
                            onChange={(e) => {
                              const next = [...variants];
                              next[idx].name = e.target.value;
                              setVariants(next);
                            }}
                            className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            required
                            placeholder="價位"
                            value={v.price}
                            onChange={(e) => {
                              const next = [...variants];
                              next[idx].price = Number(e.target.value);
                              setVariants(next);
                              if (idx === 0) setPrice(Number(e.target.value));
                            }}
                            className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-white font-bold text-[#7F0019]"
                          />
                        </div>
                        <div className="col-span-2">
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
                            className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-white"
                          />
                        </div>
                        <div className="col-span-2 text-center">
                          <button
                            type="button"
                            disabled={variants.length <= 1}
                            onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                            className="px-2 py-1 text-[#7F0019] border border-[#E6E3DC] bg-white rounded-sm disabled:opacity-30"
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#666666] pl-1 flex flex-wrap justify-between gap-2">
                        <span>款式「{v.name || `款式 #${idx + 1}`}」含未稅對照：</span>
                        <span className="font-medium text-[#222222]">
                          含稅 NT$ {rowTax.taxIncludedPrice.toLocaleString()} ｜ 未稅 NT${' '}
                          {rowTax.taxExcludedPrice.toLocaleString()}
                          {rowTax.taxAmount > 0 && `（稅額 $${rowTax.taxAmount.toLocaleString()}）`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 發票與統編能力設定 */}
            <div className="p-3 bg-white border border-[#E6E3DC] rounded-sm space-y-2.5">
              <div className="font-bold text-[#222222]">統一發票／收據與公司統編報帳設定</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INVOICE_CAPABILITY_OPTIONS.map((cap) => (
                  <button
                    key={cap.value}
                    type="button"
                    onClick={() => setInvoiceCapability(cap.value)}
                    className={`p-2 text-left border rounded-sm ${
                      invoiceCapability === cap.value
                        ? 'border-[#7F0019] bg-[#FAF9F5] text-[#7F0019] font-bold'
                        : 'border-[#E6E3DC] bg-white text-[#222222]'
                    }`}
                  >
                    <div>{cap.label}</div>
                    <div className="text-[10px] text-[#666666]">{cap.desc}</div>
                  </button>
                ))}
              </div>
              {invoiceCapability === 'invoice' && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {INVOICE_TYPE_OPTIONS.map((inv) => {
                    const active = invoiceTypes.includes(inv);
                    return (
                      <button
                        key={inv}
                        type="button"
                        onClick={() => toggleInvoiceType(inv)}
                        className={`px-2.5 py-1 border rounded-sm ${
                          active
                            ? 'border-[#7F0019] bg-[#7F0019] text-white font-medium'
                            : 'border-[#E6E3DC] bg-[#FAF9F5] text-[#666666]'
                        }`}
                      >
                        {active ? '☑ ' : '☐ '}
                        {inv}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 運費、備貨與交易方式 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">運費負擔與免運門檻</label>
              <select
                value={shippingFeeRule}
                onChange={(e) => setShippingFeeRule(e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
              >
                {SHIPPING_FEE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">備貨與出貨時效</label>
              <select
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
              >
                {LEAD_TIME_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1.5">支援點交與寄送方式：</label>
            <div className="flex flex-wrap gap-1.5">
              {DELIVERY_METHOD_OPTIONS.map((m) => {
                const checked = deliveryMethods.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleDelivery(m)}
                    className={`px-2.5 py-1 border rounded-sm ${
                      checked
                        ? 'border-[#7F0019] bg-[#FAF9F5] text-[#7F0019] font-medium'
                        : 'border-[#E6E3DC] text-[#666666]'
                    }`}
                  >
                    {checked ? '✓ ' : '+ '}
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">商品詳細說明</label>
            <textarea
              rows={4}
              value={cleanDesc}
              onChange={(e) => setCleanDesc(e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-[#E6E3DC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E6E3DC]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#7F0019] text-white font-bold"
            >
              {saving ? '儲存同步中...' : '儲存商品設定並同步前台'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
