'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ShopeeBatchMigrator from '@/components/ShopeeBatchMigrator';
import AdminProductModal from '@/components/AdminProductModal';
import {
  decodeDescriptionAndMeta,
  calculateTaxBreakdown,
  FULFILLMENT_TYPE_OPTIONS,
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
  const [activeTab, setActiveTab] = useState<'products' | 'batch' | 'store' | 'profile'>(
    'products'
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 會員實名資料（買家與賣家通用）
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

  // 賣場商品列表與編輯彈窗狀態
  const [myProducts, setMyProducts] = useState<ProductItem[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

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

    // 檢查網址是否有指定 tab 參數
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get('tab');

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

        if (
          requestedTab === 'batch' ||
          requestedTab === 'store' ||
          requestedTab === 'profile' ||
          requestedTab === 'products'
        ) {
          setActiveTab(requestedTab);
        }
      } else {
        // 若尚未建立賣場，預設先開啟賣場設定或個人資料
        if (requestedTab === 'profile') {
          setActiveTab('profile');
        } else {
          setActiveTab('store');
        }
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadSellerData();
  }, [loadSellerData]);

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
      setMessage('✓ 賣場設定已成功儲存並同步至前台！現在您可以新增商品或使用蝦皮批次搬家工具。');
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
      setMessage('✓ 實名會員資料已更新（作為買家購物或作為賣家售物皆同步生效）！');
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

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[#666666]">
        載入賣家與會員中心資料中...
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-[#E6E3DC] gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#7F0019] text-white rounded-sm">
              買家／賣家雙棲實名中心
            </span>
            <h1 className="text-lg font-bold text-[#222222]">
              賣家管理中心・{storeName || '尚未開立賣場（目前為純買家模式）'}
            </h1>
          </div>
          <p className="text-xs text-[#666666] mt-1">
            實名認證會員：{fullName || email}（證號：{idCardNumber || '已登錄'}）｜您可隨時返回首頁作為買家購物，或於此管理專屬賣場與商品
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="px-3.5 py-2 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5] text-[#222222] text-xs font-medium rounded-sm"
            href="/"
          >
            ← 返回首頁逛街購物
          </Link>
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className="px-3.5 py-2 border border-[#7F0019] bg-[#FAF9F5] hover:bg-white text-[#7F0019] text-xs font-bold rounded-sm"
          >
            📦 蝦皮商品批次搬家
          </button>
          <Link
            className="px-4 py-2 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-bold rounded-sm"
            href="/dashboard/products/new"
          >
            + 新增單筆商品
          </Link>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-3 text-xs bg-white border border-[#7F0019] text-[#7F0019] font-medium rounded-sm">
          {message}
        </div>
      )}

      {/* 四大核心管理分頁 */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-[#E6E3DC]">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-[#7F0019] text-[#7F0019]'
              : 'border-transparent text-[#666666] hover:text-[#222222]'
          }`}
        >
          1. 我的商品管理 ({myProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('batch')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'batch'
              ? 'border-[#7F0019] text-[#7F0019]'
              : 'border-transparent text-[#666666] hover:text-[#222222]'
          }`}
        >
          2. 蝦皮商品批次搬家工具
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('store')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'store'
              ? 'border-[#7F0019] text-[#7F0019]'
              : 'border-transparent text-[#666666] hover:text-[#222222]'
          }`}
        >
          3. 賣場基本設定
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-[#7F0019] text-[#7F0019]'
              : 'border-transparent text-[#666666] hover:text-[#222222]'
          }`}
        >
          4. 實名會員資料（買賣家通用）
        </button>
      </div>

      {/* 分頁 1：我的商品管理 */}
      {activeTab === 'products' && (
        <div className="bg-white border border-[#E6E3DC] rounded-sm p-6">
          {!storeId ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm font-medium text-[#222222]">
                您目前為「純買家模式」，尚未開立賣場
              </p>
              <p className="text-xs text-[#666666]">
                若您也想在嘟屁免費刊登商品或從蝦皮搬家，請先建立您的專屬賣場名稱與聯絡方式。
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('store')}
                className="px-4 py-2 bg-[#7F0019] text-white text-xs font-bold rounded-sm"
              >
                立即免費開立我的賣場
              </button>
            </div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-sm text-[#666666]">目前賣場尚無商品</p>
              <div className="flex justify-center space-x-3">
                <Link
                  className="inline-block px-4 py-2 bg-[#7F0019] text-white text-xs font-bold rounded-sm"
                  href="/dashboard/products/new"
                >
                  + 刊登第一件商品
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveTab('batch')}
                  className="px-4 py-2 border border-[#222222] bg-[#FAF9F5] text-[#222222] text-xs font-bold rounded-sm"
                >
                  使用蝦皮商品批次搬家
                </button>
              </div>
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
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222] rounded-sm">
                            {fulfillObj?.badge || '現貨'}
                          </span>
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
                            onClick={() => setEditingProduct(p)}
                            className="px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5] font-bold"
                          >
                            編輯
                          </button>
                          {p.status === 'published' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleProductStatusToggle(p, 'sold_out')}
                                className="px-2 py-1 border border-[#E6E3DC] bg-white text-amber-800"
                              >
                                標記缺貨/完售
                              </button>
                              <button
                                type="button"
                                onClick={() => handleProductStatusToggle(p, 'archived')}
                                className="px-2 py-1 border border-[#E6E3DC] bg-white text-[#666666]"
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

      {/* ★ 分頁 2：蝦皮商品批次搬家工具（專供賣家於前台自己的賣場使用） */}
      {activeTab === 'batch' && (
        <div>
          {!storeId ? (
            <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 text-center space-y-3">
              <p className="text-sm font-bold text-[#222222]">
                請先設定您的賣場名稱，即可啟用「蝦皮商品批次搬家工具」
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('store')}
                className="px-4 py-2 bg-[#7F0019] text-white text-xs font-bold rounded-sm"
              >
                前往設定賣場名稱
              </button>
            </div>
          ) : (
            <ShopeeBatchMigrator
              onImportSuccess={() => {
                loadSellerData();
                setActiveTab('products');
              }}
              storeId={storeId}
              storeName={storeName}
            />
          )}
        </div>
      )}

      {/* 分頁 3：賣場基本設定 */}
      {activeTab === 'store' && (
        <div className="bg-white border border-[#E6E3DC] rounded-sm p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-[#222222] mb-1">賣場基本資料與交易聯絡設定</h2>
          <p className="text-xs text-[#666666] mb-4">
            開啟賣場完全免費且 0% 抽成；設定完成後，您即可刊登商品或使用「蝦皮商品批次搬家工具」。
          </p>
          <form onSubmit={handleSaveStore} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">賣場名稱 *</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                placeholder="例：日貨小判"
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
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  公開聯繫電話
                </label>
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
              className="px-6 py-2.5 bg-[#7F0019] text-white text-xs font-bold rounded-sm"
            >
              {saving ? '儲存中...' : '儲存賣場設定'}
            </button>
          </form>
        </div>
      )}

      {/* 分頁 4：實名會員資料（買賣家通用） */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-[#E6E3DC] rounded-sm p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-[#222222] mb-1">
            個人實名認證資料維護（買家購物 ／ 賣家售物通用）
          </h2>
          <p className="text-xs text-[#666666] mb-4">
            您的實名資料同時作為「買家採購／預購登記保障」與「賣家開立賣場實名備查」之用，受平台加密保護。
          </p>
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
              className="px-6 py-2.5 bg-[#7F0019] text-white text-xs font-bold rounded-sm"
            >
              {saving ? '更新中...' : '更新實名認證資料'}
            </button>
          </form>
        </div>
      )}

      {/* 賣家商品編輯彈窗（共用完整款式標頭與含未稅對照之 AdminProductModal） */}
      {editingProduct && storeId && (
        <AdminProductModal
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setMessage('✓ 商品資訊、款式規格與含未稅價位已更新並同步至前台！');
            loadSellerData();
          }}
          product={editingProduct}
          stores={[{ id: storeId, name: storeName || '我的賣場' }]}
        />
      )}
    </main>
  );
}
