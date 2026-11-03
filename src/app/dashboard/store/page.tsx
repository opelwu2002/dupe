'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageUploader5 from '@/components/ImageUploader5';
import {
  decodeDescriptionAndMeta,
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

interface VariantItem {
  id?: string;
  name: string;
  price: number;
  stock: number;
}

interface ProductItem {
  id: string;
  store_id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  status: string;
  created_at: string;
  product_variants: VariantItem[];
}

export default function SellerCenterPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'products' | 'store' | 'profile'>('products');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 會員實名資料
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [lineId, setLineId] = useState('');

  // 賣場資料
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [contactLine, setContactLine] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [meetupLocation, setMeetupLocation] = useState('');
  const [shippingNote, setShippingNote] = useState('');

  // 賣場商品列表與編輯狀態
  const [myProducts, setMyProducts] = useState<ProductItem[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editCategory, setEditCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [editCondition, setEditCondition] = useState(PRODUCT_CONDITIONS[0]);
  const [editBrand, setEditBrand] = useState('');
  const [editCleanDesc, setEditCleanDesc] = useState('');
  const [editHasMultiSpec, setEditHasMultiSpec] = useState(false);
  const [editSingleStock, setEditSingleStock] = useState(1);
  const [editDeliveryMethods, setEditDeliveryMethods] = useState<string[]>([
    '店到店（7-11 / 全家）',
    '面交當面點交',
  ]);

  // 編輯視窗：預購 / 代購 / 沒買到取消與退費狀態
  const [editFulfillmentType, setEditFulfillmentType] = useState<FulfillmentType>('in_stock');
  const [editOrderCutoffDate, setEditOrderCutoffDate] = useState('');
  const [editEstimatedArrival, setEditEstimatedArrival] = useState('');
  const [editPaymentTerm, setEditPaymentTerm] = useState<PaymentTermType>('full_upfront');
  const [editDepositPercent, setEditDepositPercent] = useState<number>(30);
  const [editShortagePolicy, setEditShortagePolicy] = useState(SHORTAGE_POLICY_OPTIONS[0]);
  const [editBuyerCancelRule, setEditBuyerCancelRule] = useState(BUYER_CANCEL_RULE_OPTIONS[0]);
  const [editPurchaseLimit, setEditPurchaseLimit] = useState(PURCHASE_LIMIT_OPTIONS[0]);

  // 編輯視窗：稅務與發票狀態
  const [editTaxMode, setEditTaxMode] = useState<TaxMode>('tax_included');
  const [editInvoiceCapability, setEditInvoiceCapability] = useState<InvoiceCapability>('none');
  const [editInvoiceTypes, setEditInvoiceTypes] = useState<string[]>([
    INVOICE_TYPE_OPTIONS[0],
    INVOICE_TYPE_OPTIONS[1],
  ]);
  const [editNegotiable, setEditNegotiable] = useState(NEGOTIABLE_OPTIONS[0]);
  const [editShippingFeeRule, setEditShippingFeeRule] = useState(SHIPPING_FEE_OPTIONS[0]);
  const [editLeadTime, setEditLeadTime] = useState(LEAD_TIME_OPTIONS[0]);
  const [editWarranty, setEditWarranty] = useState(WARRANTY_OPTIONS[0]);

  const loadSellerData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    setUserId(user.id);
    setEmail(user.email || '');
    const meta = user.user_metadata || {};
    setFullName(meta.full_name || '');
    setIdCardNumber(meta.id_card_number || '');
    setPhone(meta.phone || '');
    setAddress(meta.address || '');
    setLineId(meta.line_id || '');

    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fetch_all_data' }),
    });
    const result = await res.json();
    if (result.ok) {
      const userStore = result.stores.find((s: { user_id: string }) => s.user_id === user.id);
      if (userStore) {
        setStoreId(userStore.id);
        setStoreName(userStore.name || '');
        setStoreDesc(userStore.description || '');
        setContactLine(userStore.contact_line || '');
        setContactPhone(userStore.contact_phone || '');
        setMeetupLocation(userStore.meetup_location || '');
        setShippingNote(userStore.custom_shipping_note || '');

        const storeProds = result.products.filter(
          (p: { store_id: string }) => p.store_id === userStore.id
        );
        setMyProducts(storeProds);
      } else {
        setActiveTab('store');
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadSellerData();
  }, [loadSellerData]);

  const openEditModal = (p: ProductItem) => {
    const { cleanDescription, meta } = decodeDescriptionAndMeta(p.description, p.product_variants);
    const normalizedVariants =
      p.product_variants && p.product_variants.length > 0
        ? p.product_variants.map((v) => ({
            ...v,
            name: v.name === '__SINGLE__' ? '標準款式' : v.name,
          }))
        : [{ name: '款式一', price: p.price, stock: 1 }];

    setEditingProduct({
      ...p,
      images: Array.isArray(p.images) ? p.images.slice(0, 5) : [],
      product_variants: normalizedVariants,
    });
    setEditCleanDesc(cleanDescription);
    setEditCategory(meta.category);
    setEditCondition(meta.condition);
    setEditBrand(meta.brand);
    setEditHasMultiSpec(meta.hasMultiSpec);
    setEditSingleStock(meta.stock);
    setEditDeliveryMethods(meta.deliveryMethods);

    setEditFulfillmentType(meta.fulfillmentType);
    setEditOrderCutoffDate(meta.orderCutoffDate);
    setEditEstimatedArrival(meta.estimatedArrival);
    setEditPaymentTerm(meta.paymentTerm);
    setEditDepositPercent(meta.depositPercent);
    setEditShortagePolicy(meta.shortagePolicy);
    setEditBuyerCancelRule(meta.buyerCancelRule);
    setEditPurchaseLimit(meta.purchaseLimit);

    setEditTaxMode(meta.taxMode);
    setEditInvoiceCapability(meta.invoiceCapability);
    setEditInvoiceTypes(meta.invoiceTypes);
    setEditNegotiable(meta.negotiable);
    setEditShippingFeeRule(meta.shippingFeeRule);
    setEditLeadTime(meta.leadTime);
    setEditWarranty(meta.warranty);
  };

  const toggleEditInvoiceType = (t: string) => {
    if (editInvoiceTypes.includes(t)) {
      if (editInvoiceTypes.length <= 1) return;
      setEditInvoiceTypes(editInvoiceTypes.filter((x) => x !== t));
    } else {
      setEditInvoiceTypes([...editInvoiceTypes, t]);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_store',
        payload: {
          id: storeId,
          user_id: userId,
          name: storeName,
          description: storeDesc,
          contact_line: contactLine,
          contact_phone: contactPhone,
          meetup_location: meetupLocation,
          custom_shipping_note: shippingNote,
          is_active: true,
        },
      }),
    });
    const result = await res.json();
    if (result.ok) {
      setStoreId(result.store.id);
      setMessage('賣場設定已成功儲存並同步至前台！');
      loadSellerData();
    } else {
      setMessage(`儲存失敗：${result.error}`);
    }
    setSaving(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_user',
        payload: {
          user_id: userId,
          email,
          full_name: fullName,
          id_card_number: idCardNumber,
          phone,
          address,
          line_id: lineId,
        },
      }),
    });
    const result = await res.json();
    if (result.ok) {
      setMessage('實名會員資料已更新並同步至後台！');
      await supabase.auth.refreshSession();
    } else {
      setMessage(`更新失敗：${result.error}`);
    }
    setSaving(false);
  };

  const handleProductStatusToggle = async (prod: ProductItem, newStatus: string) => {
    const { meta } = decodeDescriptionAndMeta(prod.description, prod.product_variants);
    await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_product',
        payload: {
          id: prod.id,
          store_id: prod.store_id,
          title: prod.title,
          description: prod.description,
          price: prod.price,
          images: prod.images,
          status: newStatus,
          has_multi_spec: meta.hasMultiSpec,
          single_stock: meta.stock,
          variants: prod.product_variants,
        },
      }),
    });
    loadSellerData();
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('確定要永久刪除此商品嗎？')) return;
    await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_product', payload: { id } }),
    });
    loadSellerData();
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);

    const computedMainPrice = editHasMultiSpec
      ? Math.min(...(editingProduct.product_variants || []).map((v) => Number(v.price) || 0))
      : Number(editingProduct.price) || 0;

    const encodedDescription = encodeDescriptionWithMeta(editCleanDesc, {
      category: editCategory,
      condition: editCondition,
      brand: editBrand.trim(),
      hasMultiSpec: editHasMultiSpec,
      stock: editHasMultiSpec
        ? (editingProduct.product_variants || []).reduce(
            (acc, v) => acc + (Number(v.stock) || 0),
            0
          )
        : Number(editSingleStock) || 1,
      deliveryMethods: editDeliveryMethods,
      taxMode: editTaxMode,
      invoiceCapability: editInvoiceCapability,
      invoiceTypes: editInvoiceCapability === 'invoice' ? editInvoiceTypes : [],
      fulfillmentType: editFulfillmentType,
      orderCutoffDate: editOrderCutoffDate.trim(),
      estimatedArrival: editEstimatedArrival.trim(),
      paymentTerm: editPaymentTerm,
      depositPercent: Number(editDepositPercent) || 30,
      shortagePolicy: editShortagePolicy,
      buyerCancelRule: editBuyerCancelRule,
      purchaseLimit: editPurchaseLimit,
      negotiable: editNegotiable,
      shippingFeeRule: editShippingFeeRule,
      leadTime: editLeadTime,
      warranty: editWarranty,
    });

    await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_product',
        payload: {
          id: editingProduct.id,
          store_id: editingProduct.store_id,
          title: editingProduct.title,
          description: encodedDescription,
          price: computedMainPrice,
          images: editingProduct.images,
          status: editingProduct.status,
          has_multi_spec: editHasMultiSpec,
          single_stock: editSingleStock,
          variants: editHasMultiSpec ? editingProduct.product_variants : [],
        },
      }),
    });
    setEditingProduct(null);
    setSaving(false);
    setMessage('商品規格、預購/代購沒買到取消條款、含稅/未稅價位與發票設定已同步更新至前台！');
    loadSellerData();
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-[#666666]">載入賣家中心資料中...</div>;
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-[#E6E3DC] gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#222222]">
            賣家管理中心・{storeName || '請先建立您的專屬賣場'}
          </h1>
          <p className="text-xs text-[#666666]">
            實名認證會員：{fullName || email}（證號：{idCardNumber || '已登錄'}）
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            className="px-4 py-2 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium rounded-sm"
            href="/dashboard/products/new"
          >
            + 新增刊登商品
          </Link>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-3 text-xs bg-white border border-[#7F0019] text-[#7F0019] rounded-sm">
          {message}
        </div>
      )}

      <div className="flex space-x-2 mb-6 border-b border-[#E6E3DC]">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-[#7F0019] text-[#7F0019]'
              : 'border-transparent text-[#666666] hover:text-[#222222]'
          }`}
        >
          我的商品管理 ({myProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('store')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'store'
              ? 'border-[#7F0019] text-[#7F0019]'
              : 'border-transparent text-[#666666] hover:text-[#222222]'
          }`}
        >
          賣場基本設定
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-[#7F0019] text-[#7F0019]'
              : 'border-transparent text-[#666666] hover:text-[#222222]'
          }`}
        >
          實名會員資料
        </button>
      </div>

      {activeTab === 'products' && (
        <div className="bg-white border border-[#E6E3DC] rounded-sm p-6">
          {!storeId ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm font-medium text-[#222222]">您尚未設定賣場名稱與聯絡方式</p>
              <button
                type="button"
                onClick={() => setActiveTab('store')}
                className="px-4 py-2 bg-[#7F0019] text-white text-xs rounded-sm"
              >
                立即前往設定賣場
              </button>
            </div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-sm text-[#666666]">目前賣場尚無商品</p>
              <Link
                className="inline-block px-4 py-2 bg-[#7F0019] text-white text-xs rounded-sm"
                href="/dashboard/products/new"
              >
                + 立即刊登第一件商品
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E6E3DC] text-[#666666] bg-[#FAF9F5]">
                    <th className="p-3">商品資訊</th>
                    <th className="p-3">供貨型態 / 發票</th>
                    <th className="p-3">含稅價 / 未稅價</th>
                    <th className="p-3">款式規格與庫存</th>
                    <th className="p-3">狀態</th>
                    <th className="p-3 text-right">管理操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E3DC]">
                  {myProducts.map((p) => {
                    const { cleanDescription, meta } = decodeDescriptionAndMeta(
                      p.description,
                      p.product_variants
                    );
                    const taxInfo = calculateTaxBreakdown(p.price, meta.taxMode);
                    const fulfillObj = FULFILLMENT_TYPE_OPTIONS.find(
                      (f) => f.value === meta.fulfillmentType
                    );
                    return (
                      <tr key={p.id} className="hover:bg-[#FAF9F5]/60">
                        <td className="p-3 flex items-center space-x-3">
                          <div className="relative w-12 h-12 bg-[#FAF9F5] border border-[#E6E3DC] flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {p.images?.[0] ? (
                              <img
                                src={p.images[0]}
                                alt={p.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-[#666666]">無圖</span>
                            )}
                            {p.images?.length > 1 && (
                              <span className="absolute bottom-0 right-0 px-1 bg-black/70 text-white text-[9px]">
                                {p.images.length}張
                              </span>
                            )}
                          </div>
                          <div>
                            <Link
                              className="font-bold text-[#222222] hover:text-[#7F0019]"
                              href={`/products/${p.id}`}
                            >
                              {p.title}
                            </Link>
                            <div className="text-[11px] text-[#666666] line-clamp-1">
                              {cleanDescription}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-sm ${
                              meta.fulfillmentType === 'in_stock'
                                ? 'bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222]'
                                : 'bg-[#7F0019] text-white'
                            }`}
                          >
                            {fulfillObj?.badge || '現貨'}
                          </span>
                          {meta.estimatedArrival && (
                            <div className="text-[10px] text-[#666666]">
                              到貨：{meta.estimatedArrival}
                            </div>
                          )}
                          <div className="text-[10px] text-[#7F0019]">
                            {meta.invoiceCapability === 'invoice'
                              ? '可開統一發票(二/三聯)'
                              : meta.invoiceCapability === 'receipt'
                              ? '可開免用發票收據'
                              : '無發票'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-[#7F0019]">
                            含稅 NT$ {taxInfo.taxIncludedPrice.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-[#666666]">
                            未稅 NT$ {taxInfo.taxExcludedPrice.toLocaleString()}
                          </div>
                        </td>
                        <td className="p-3">
                          {meta.hasMultiSpec ? (
                            p.product_variants?.map((v, idx) => (
                              <div key={idx} className="text-[11px] text-[#222222]">
                                {v.name}：${v.price.toLocaleString()} (庫存 {v.stock})
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-[#222222]">
                              單一商品（數量 {meta.stock} 件）
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 text-[11px] rounded-sm ${
                              p.status === 'published'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : p.status === 'sold_out'
                                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-300'
                            }`}
                          >
                            {p.status === 'published'
                              ? '上架接單中'
                              : p.status === 'sold_out'
                              ? '完售 / 缺貨流單'
                              : '已下架'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5] font-medium"
                          >
                            編輯
                          </button>
                          {p.status === 'published' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleProductStatusToggle(p, 'sold_out')}
                                className="px-2 py-1 border border-[#E6E3DC] bg-white text-amber-800 hover:bg-amber-50"
                                title="標記為完售或代購未買到缺貨"
                              >
                                標記缺貨/完售
                              </button>
                              <button
                                type="button"
                                onClick={() => handleProductStatusToggle(p, 'archived')}
                                className="px-2 py-1 border border-[#E6E3DC] bg-white text-[#666666] hover:text-[#222222]"
                              >
                                下架
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleProductStatusToggle(p, 'published')}
                              className="px-2 py-1 border border-[#7F0019] text-[#7F0019] bg-white"
                            >
                              重新上架
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            className="px-2 py-1 text-[#7F0019] hover:underline"
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'store' && (
        <div className="bg-white border border-[#E6E3DC] rounded-sm p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-[#222222] mb-4">賣場基本資料與交易聯絡設定</h2>
          <form onSubmit={handleSaveStore} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">賣場名稱 *</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">賣場簡介</label>
              <textarea
                rows={3}
                value={storeDesc}
                onChange={(e) => setStoreDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  公開聯繫 LINE ID
                </label>
                <input
                  type="text"
                  value={contactLine}
                  onChange={(e) => setContactLine(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">公開聯繫電話</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">預設面交地點</label>
              <input
                type="text"
                value={meetupLocation}
                onChange={(e) => setMeetupLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">
                自訂交付 / 寄送說明
              </label>
              <input
                type="text"
                value={shippingNote}
                onChange={(e) => setShippingNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#7F0019] text-white text-xs font-medium rounded-sm"
            >
              {saving ? '儲存中...' : '儲存賣場設定'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white border border-[#E6E3DC] rounded-sm p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-[#222222] mb-4">個人實名認證資料維護</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">真實姓名 *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  身分證字號 / 居留證號 *
                </label>
                <input
                  type="text"
                  required
                  value={idCardNumber}
                  onChange={(e) => setIdCardNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">行動電話 *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">LINE ID</label>
                <input
                  type="text"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">
                現居 / 戶籍聯絡地址 *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#7F0019] text-white text-xs font-medium rounded-sm"
            >
              {saving ? '更新中...' : '更新實名認證資料'}
            </button>
          </form>
        </div>
      )}

      {/* 完整升級版：編輯商品彈窗（含預購/代購沒買到取消退費機制、多規格明確標頭、含未稅對照、發票設定） */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-3xl rounded-sm p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[#E6E3DC] mb-4">
              <h3 className="text-base font-bold text-[#222222]">
                編輯商品：{editingProduct.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-[#666666] hover:text-[#222222]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-5 text-xs">
              <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm">
                <ImageUploader5
                  images={editingProduct.images || []}
                  onChange={(newImgs) =>
                    setEditingProduct({ ...editingProduct, images: newImgs })
                  }
                  maxImages={5}
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-1">商品名稱 *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.title}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">商品分類</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">新舊物況</label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    {PRODUCT_CONDITIONS.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">品牌 / 來源</label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
              </div>

              {/* 供貨型態（現貨 / 預購 / 連線代購 / 團購）與沒買到取消保障 */}
              <div className="border-t border-[#E6E3DC] pt-4 space-y-3">
                <label className="block font-bold text-[#222222]">
                  供貨型態（現貨／預購／海外代購）與「沒買到／缺貨砍單」取消退費機制
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {FULFILLMENT_TYPE_OPTIONS.map((opt) => {
                    const active = editFulfillmentType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditFulfillmentType(opt.value)}
                        className={`p-2 text-center border rounded-sm font-medium ${
                          active
                            ? 'border-[#7F0019] bg-[#7F0019] text-white'
                            : 'border-[#E6E3DC] bg-white text-[#222222]'
                        }`}
                      >
                        {opt.badge}
                      </button>
                    );
                  })}
                </div>

                {editFulfillmentType !== 'in_stock' && (
                  <div className="p-4 bg-[#FAF9F5] border-2 border-[#7F0019]/40 rounded-sm space-y-3">
                    <div className="font-bold text-[#7F0019]">
                      ⏳ 預購／代購等待期、訂金與「沒買到／缺貨」取消退費設定
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-medium text-[#222222] mb-1">
                          收單／採購截止日
                        </label>
                        <input
                          type="text"
                          value={editOrderCutoffDate}
                          onChange={(e) => setEditOrderCutoffDate(e.target.value)}
                          placeholder="例：11/30 或 額滿為止"
                          className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-[#222222] mb-1">
                          預計到貨／發售期間 *
                        </label>
                        <input
                          type="text"
                          required
                          value={editEstimatedArrival}
                          onChange={(e) => setEditEstimatedArrival(e.target.value)}
                          placeholder="例：預計 12 月下旬抵台"
                          className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-[#222222] mb-1">
                          單人限購／配額限制
                        </label>
                        <select
                          value={editPurchaseLimit}
                          onChange={(e) => setEditPurchaseLimit(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-white"
                        >
                          {PURCHASE_LIMIT_OPTIONS.map((lim) => (
                            <option key={lim} value={lim}>
                              {lim}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-[#222222] mb-1">
                          收款與訂金模式
                        </label>
                        <select
                          value={editPaymentTerm}
                          onChange={(e) => setEditPaymentTerm(e.target.value as PaymentTermType)}
                          className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-white font-medium"
                        >
                          {PAYMENT_TERM_OPTIONS.map((pt) => (
                            <option key={pt.value} value={pt.value}>
                              {pt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {editPaymentTerm === 'deposit_balance' && (
                        <div>
                          <label className="block font-medium text-[#222222] mb-1">
                            訂金比例（試算：訂金 $
                            {calculateDepositBreakdown(
                              editingProduct.price,
                              editDepositPercent
                            ).depositAmount.toLocaleString()}
                            ）
                          </label>
                          <select
                            value={editDepositPercent}
                            onChange={(e) => setEditDepositPercent(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-white font-bold text-[#7F0019]"
                          >
                            {[10, 20, 30, 50, 70, 80].map((pct) => (
                              <option key={pct} value={pct}>
                                預付 {pct}% 訂金 ＋ 到貨付 {100 - pct}% 尾款
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold text-[#7F0019] mb-1">
                        ★ 當「預購／代購沒買到、現場缺貨或官方砍單」時之訂單取消與退費承諾
                      </label>
                      <select
                        value={editShortagePolicy}
                        onChange={(e) => setEditShortagePolicy(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-white font-medium"
                      >
                        {SHORTAGE_POLICY_OPTIONS.map((sp) => (
                          <option key={sp} value={sp}>
                            {sp}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-[#222222] mb-1">
                        買家取消與防棄單規範
                      </label>
                      <select
                        value={editBuyerCancelRule}
                        onChange={(e) => setEditBuyerCancelRule(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-white"
                      >
                        {BUYER_CANCEL_RULE_OPTIONS.map((bc) => (
                          <option key={bc} value={bc}>
                            {bc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 價格、稅務基準與多規格設定 */}
              <div className="border-t border-[#E6E3DC] pt-4 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="font-bold text-[#222222]">價格、含稅/未稅基準與規格模式</span>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditHasMultiSpec(false)}
                      className={`px-3 py-1 rounded-sm ${
                        !editHasMultiSpec
                          ? 'bg-[#7F0019] text-white font-medium'
                          : 'border border-[#E6E3DC] text-[#666666]'
                      }`}
                    >
                      單一商品
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditHasMultiSpec(true)}
                      className={`px-3 py-1 rounded-sm ${
                        editHasMultiSpec
                          ? 'bg-[#7F0019] text-white font-medium'
                          : 'border border-[#E6E3DC] text-[#666666]'
                      }`}
                    >
                      多規格款式
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'tax_included', label: '所填價位為「含稅價」(內含5%)' },
                    { id: 'tax_excluded', label: '所填價位為「未稅價」(外加5%)' },
                    { id: 'tax_free', label: '個人二手／免稅 (含未稅同價)' },
                  ].map((tm) => (
                    <button
                      key={tm.id}
                      type="button"
                      onClick={() => setEditTaxMode(tm.id as TaxMode)}
                      className={`p-2 border rounded-sm text-left ${
                        editTaxMode === tm.id
                          ? 'border-[#7F0019] bg-[#FAF9F5] text-[#7F0019] font-bold'
                          : 'border-[#E6E3DC] bg-white text-[#666666]'
                      }`}
                    >
                      {editTaxMode === tm.id ? '● ' : '○ '}
                      {tm.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#222222] font-medium mb-1">
                      主售價 (NT$ -{' '}
                      {editTaxMode === 'tax_included'
                        ? '含稅'
                        : editTaxMode === 'tax_excluded'
                        ? '未稅'
                        : '免稅'}
                      )
                    </label>
                    <input
                      type="number"
                      required
                      value={editingProduct.price}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          price: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 font-bold border border-[#E6E3DC] bg-[#FAF9F5]"
                    />
                  </div>
                  {!editHasMultiSpec && (
                    <div>
                      <label className="block text-[#222222] font-medium mb-1">庫存數量</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editSingleStock}
                        onChange={(e) => setEditSingleStock(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[#222222] font-medium mb-1">狀態</label>
                    <select
                      value={editingProduct.status}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                    >
                      <option value="published">上架接單中 (published)</option>
                      <option value="sold_out">完售／代購未買到流單 (sold_out)</option>
                      <option value="archived">已下架 (archived)</option>
                    </select>
                  </div>
                </div>

                {editHasMultiSpec && (
                  <div className="p-3.5 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#222222]">多規格款式設定</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduct({
                            ...editingProduct,
                            product_variants: [
                              ...(editingProduct.product_variants || []),
                              { name: '新款式', price: editingProduct.price, stock: 1 },
                            ],
                          })
                        }
                        className="px-2.5 py-1 bg-[#7F0019] text-white text-xs rounded-sm"
                      >
                        + 新增款式
                      </button>
                    </div>

                    <div className="grid grid-cols-12 gap-2 px-2 py-1.5 bg-[#E6E3DC]/60 font-bold text-[#222222] rounded-sm">
                      <div className="col-span-5">款式名稱</div>
                      <div className="col-span-4">
                        價位 (NT$ -{' '}
                        {editTaxMode === 'tax_included'
                          ? '含稅'
                          : editTaxMode === 'tax_excluded'
                          ? '未稅'
                          : '免稅'}
                        )
                      </div>
                      <div className="col-span-2">庫存數量</div>
                      <div className="col-span-1 text-center">操作</div>
                    </div>

                    {(editingProduct.product_variants || []).map((v, idx) => {
                      const vTax = calculateTaxBreakdown(v.price, editTaxMode);
                      return (
                        <div
                          key={idx}
                          className="p-2 bg-white border border-[#E6E3DC] rounded-sm space-y-1"
                        >
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <input
                              type="text"
                              required
                              value={v.name === '__SINGLE__' ? '款式一' : v.name}
                              onChange={(e) => {
                                const next = [...editingProduct.product_variants];
                                next[idx] = { ...next[idx], name: e.target.value };
                                setEditingProduct({ ...editingProduct, product_variants: next });
                              }}
                              className="col-span-5 px-2.5 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
                              placeholder="請輸入款式名稱"
                            />
                            <input
                              type="number"
                              required
                              value={v.price}
                              onChange={(e) => {
                                const next = [...editingProduct.product_variants];
                                next[idx] = { ...next[idx], price: Number(e.target.value) };
                                setEditingProduct({ ...editingProduct, product_variants: next });
                              }}
                              className="col-span-4 px-2.5 py-1.5 font-bold border border-[#E6E3DC] bg-[#FAF9F5]"
                              placeholder="價位"
                            />
                            <input
                              type="number"
                              required
                              value={v.stock}
                              onChange={(e) => {
                                const next = [...editingProduct.product_variants];
                                next[idx] = { ...next[idx], stock: Number(e.target.value) };
                                setEditingProduct({ ...editingProduct, product_variants: next });
                              }}
                              className="col-span-2 px-2.5 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
                              placeholder="庫存數量"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editingProduct.product_variants.length <= 1) return;
                                setEditingProduct({
                                  ...editingProduct,
                                  product_variants: editingProduct.product_variants.filter(
                                    (_, i) => i !== idx
                                  ),
                                });
                              }}
                              className="col-span-1 text-center text-[#7F0019] font-bold"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="text-[11px] text-[#666666] flex justify-between px-1">
                            <span>款式「{v.name}」含未稅對照：</span>
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
              </div>

              {/* 發票開立設定 */}
              <div className="border-t border-[#E6E3DC] pt-4 space-y-3">
                <label className="block font-bold text-[#222222]">
                  發票開立與報帳憑證設定（二聯式對個人／三聯式對公司）
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {INVOICE_CAPABILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditInvoiceCapability(opt.value)}
                      className={`p-2.5 text-left border rounded-sm ${
                        editInvoiceCapability === opt.value
                          ? 'border-[#7F0019] bg-[#FAF9F5] text-[#7F0019] font-bold'
                          : 'border-[#E6E3DC] bg-white text-[#222222]'
                      }`}
                    >
                      <div>{opt.label}</div>
                      <div className="text-[10px] text-[#666666] font-normal">{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {editInvoiceCapability === 'invoice' && (
                  <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-2">
                    <div className="text-[11px] font-bold text-[#7F0019]">
                      勾選可提供給買家的發票格式：
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {INVOICE_TYPE_OPTIONS.map((t) => {
                        const checked = editInvoiceTypes.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleEditInvoiceType(t)}
                            className={`px-2.5 py-1 border rounded-sm ${
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
              </div>

              {/* 交易條件與保固 */}
              <div className="border-t border-[#E6E3DC] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">議價空間</label>
                  <select
                    value={editNegotiable}
                    onChange={(e) => setEditNegotiable(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    {NEGOTIABLE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">運費負擔方式</label>
                  <select
                    value={editShippingFeeRule}
                    onChange={(e) => setEditShippingFeeRule(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    {SHIPPING_FEE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">出貨時效</label>
                  <select
                    value={editLeadTime}
                    onChange={(e) => setEditLeadTime(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    {LEAD_TIME_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">售後保固</label>
                  <select
                    value={editWarranty}
                    onChange={(e) => setEditWarranty(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
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
                <label className="block font-bold text-[#222222] mb-1">詳細商品描述</label>
                <textarea
                  rows={4}
                  value={editCleanDesc}
                  onChange={(e) => setEditCleanDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E6E3DC]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-[#E6E3DC]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#7F0019] text-white font-medium"
                >
                  {saving ? '儲存同步中...' : '儲存變更並同步前台'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
