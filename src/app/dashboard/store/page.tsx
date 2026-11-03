'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  // 賣場商品列表
  const [myProducts, setMyProducts] = useState<ProductItem[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  const loadSellerData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
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
    await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_product',
        payload: {
          id: editingProduct.id,
          store_id: editingProduct.store_id,
          title: editingProduct.title,
          description: editingProduct.description,
          price: editingProduct.price,
          images: editingProduct.images,
          status: editingProduct.status,
          variants: editingProduct.product_variants,
        },
      }),
    });
    setEditingProduct(null);
    setSaving(false);
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
          <Link className="px-4 py-2 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium rounded-sm" href="/dashboard/products/new">
            + 新增刊登商品
          </Link>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-3 text-xs bg-white border border-[#7F0019] text-[#7F0019] rounded-sm">
          {message}
        </div>
      )}

      {/* 導覽分頁 */}
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

      {/* 分頁 1：商品管理 */}
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
              <Link className="inline-block px-4 py-2 bg-[#7F0019] text-white text-xs rounded-sm" href="/dashboard/products/new">
                + 立即刊登第一件商品
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E6E3DC] text-[#666666] bg-[#FAF9F5]">
                    <th className="p-3">商品資訊</th>
                    <th className="p-3">售價</th>
                    <th className="p-3">規格與庫存</th>
                    <th className="p-3">狀態</th>
                    <th className="p-3 text-right">管理操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E3DC]">
                  {myProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF9F5]/60">
                      <td className="p-3 flex items-center space-x-3">
                        <div className="w-12 h-12 bg-[#FAF9F5] border border-[#E6E3DC] flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-[#666666]">無圖</span>
                          )}
                        </div>
                        <div>
                          <Link className="font-medium text-[#222222] hover:text-[#7F0019]" href={`/products/${p.id}`}>
                            {p.title}
                          </Link>
                          <div className="text-[11px] text-[#666666] line-clamp-1">{p.description}</div>
                        </div>
                      </td>
                      <td className="p-3 font-medium">NT$ {p.price.toLocaleString()}</td>
                      <td className="p-3">
                        {p.product_variants?.map((v, idx) => (
                          <div key={idx} className="text-[11px] text-[#666666]">
                            {v.name}：庫存 {v.stock}
                          </div>
                        ))}
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
                            ? '上架中'
                            : p.status === 'sold_out'
                            ? '已售完'
                            : '已下架'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="px-2 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5]"
                        >
                          編輯
                        </button>
                        {p.status === 'published' ? (
                          <button
                            type="button"
                            onClick={() => handleProductStatusToggle(p, 'archived')}
                            className="px-2 py-1 border border-[#E6E3DC] bg-white text-[#666666] hover:text-[#222222]"
                          >
                            下架
                          </button>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 分頁 2：賣場設定 */}
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
                placeholder="例：原質日常工作室"
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
                <label className="block text-xs font-medium text-[#666666] mb-1">公開聯繫 LINE ID</label>
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
                placeholder="例：台北市松山區捷運松山站"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">自訂交付 / 寄送說明</label>
              <input
                type="text"
                value={shippingNote}
                onChange={(e) => setShippingNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                placeholder="例：7-11 店到店運費 60 元，或雙北面交"
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

      {/* 分頁 3：實名會員資料 */}
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
                <label className="block text-xs font-medium text-[#666666] mb-1">身分證字號 / 居留證號 *</label>
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
              <label className="block text-xs font-medium text-[#666666] mb-1">現居 / 戶籍聯絡地址 *</label>
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

      {/* 編輯商品彈窗 */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-lg rounded-sm p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-[#222222] mb-4">編輯商品：{editingProduct.title}</h3>
            <form onSubmit={handleSaveProductEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#666666] mb-1">商品名稱</label>
                <input
                  type="text"
                  required
                  value={editingProduct.title}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#666666] mb-1">售價 (NT$)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block text-[#666666] mb-1">狀態</label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    <option value="published">上架中 (published)</option>
                    <option value="sold_out">已售完 (sold_out)</option>
                    <option value="archived">已下架 (archived)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[#666666] mb-1">圖片網址</label>
                <input
                  type="text"
                  value={editingProduct.images?.[0] || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      images: e.target.value ? [e.target.value] : [],
                    })
                  }
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>
              <div>
                <label className="block text-[#666666] mb-1">商品描述</label>
                <textarea
                  rows={3}
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
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
                <button type="submit" className="px-4 py-2 bg-[#7F0019] text-white">
                  儲存變更
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
