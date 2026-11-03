'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export interface ProfileRecord {
  id: string;
  email: string;
  full_name: string;
  id_card_number: string;
  phone: string;
  address: string;
  role: 'user' | 'seller' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface StoreRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  contact_line?: string;
  contact_phone?: string;
  meetup_location?: string;
  custom_shipping_note?: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductRecord {
  id: string;
  store_id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  status: 'draft' | 'published' | 'sold_out' | 'archived';
  created_at: string;
  stores?: {
    name: string;
  } | null;
}

type AdminTab = 'members' | 'stores' | 'products' | 'audit';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  const [loading, setLoading] = useState(true);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // 資料集
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<
    { time: string; action: string; detail: string }[]
  >([
    {
      time: new Date().toLocaleString('zh-TW'),
      action: '系統初始化',
      detail: '管理員進入蝦皮式營運管理中心，啟動實名制與賣場監控模組。',
    },
  ]);

  // 搜尋與篩選狀態
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>('all');
  const [storeSearch, setStoreSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // 會員新增 / 編輯彈窗狀態
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ProfileRecord | null>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formIdCard, setFormIdCard] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formRole, setFormRole] = useState<'user' | 'seller' | 'admin'>('user');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended' | 'pending'>('active');
  const [formNotes, setFormNotes] = useState('');

  // 商品售價修改彈窗狀態
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [newProductPrice, setNewProductPrice] = useState<number>(0);

  const appendLog = (action: string, detail: string) => {
    setAuditLogs((prev) => [
      { time: new Date().toLocaleString('zh-TW'), action, detail },
      ...prev,
    ]);
  };

  const getAdminHeaders = () => {
    const token =
      typeof window !== 'undefined' ? sessionStorage.getItem('dupe_admin_token') || '' : '';
    return {
      'Content-Type': 'application/json',
      'x-admin-token': token,
    };
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ action: 'fetch_all' }),
      });

      if (res.status === 403 || res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();

      // 合併資料庫 Profiles 與瀏覽器本地實名緩存（防呆備援）
      let localProfiles: ProfileRecord[] = [];
      try {
        localProfiles = JSON.parse(localStorage.getItem('dupe_realname_profiles') || '[]');
      } catch {
        localProfiles = [];
      }

      const dbProfiles: ProfileRecord[] = data.profiles || [];
      const mergedMap = new Map<string, ProfileRecord>();
      localProfiles.forEach((p) => mergedMap.set(p.email || p.id, p));
      dbProfiles.forEach((p) => mergedMap.set(p.email || p.id, p));

      setProfiles(Array.from(mergedMap.values()));
      setStores(data.stores || []);
      setProducts(data.products || []);
    } catch {
      setStatusBanner('讀取遠端資料庫時發生異常，已載入本地快取紀錄。');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleLogout = async () => {
    await fetch('/api/admin', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ action: 'admin_logout' }),
    });
    sessionStorage.removeItem('dupe_admin_token');
    sessionStorage.removeItem('dupe_admin_user');
    router.push('/admin/login');
  };

  // 開啟新增會員彈窗
  const openCreateMemberModal = () => {
    setEditingMember(null);
    setFormEmail('');
    setFormPassword('Dupe@123456');
    setFormFullName('');
    setFormIdCard('');
    setFormPhone('');
    setFormAddress('');
    setFormRole('user');
    setFormStatus('active');
    setFormNotes('');
    setIsMemberModalOpen(true);
  };

  // 開啟編輯會員彈窗
  const openEditMemberModal = (member: ProfileRecord) => {
    setEditingMember(member);
    setFormEmail(member.email);
    setFormPassword('');
    setFormFullName(member.full_name);
    setFormIdCard(member.id_card_number);
    setFormPhone(member.phone);
    setFormAddress(member.address);
    setFormRole(member.role || 'user');
    setFormStatus(member.status || 'active');
    setFormNotes(member.notes || '');
    setIsMemberModalOpen(true);
  };

  // 儲存新增或編輯之會員資料
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);

    const payload = {
      id: editingMember?.id,
      email: formEmail.trim(),
      password: formPassword || undefined,
      full_name: formFullName.trim(),
      id_card_number: formIdCard.trim().toUpperCase(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      role: formRole,
      status: formStatus,
      notes: formNotes.trim(),
    };

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ action: 'upsert_profile', payload }),
    });
    const result = await res.json();

    const updatedRecord: ProfileRecord = result.profile || {
      id: editingMember?.id || `manual-${Date.now()}`,
      email: payload.email,
      full_name: payload.full_name,
      id_card_number: payload.id_card_number,
      phone: payload.phone,
      address: payload.address,
      role: payload.role,
      status: payload.status,
      notes: payload.notes,
      created_at: editingMember?.created_at || new Date().toISOString(),
    };

    // 同步更新前端列表與本地實名備援庫
    setProfiles((prev) => {
      const others = prev.filter(
        (p) => p.id !== updatedRecord.id && p.email !== updatedRecord.email
      );
      return [updatedRecord, ...others];
    });

    try {
      const localList: ProfileRecord[] = JSON.parse(
        localStorage.getItem('dupe_realname_profiles') || '[]'
      );
      const others = localList.filter(
        (p) => p.id !== updatedRecord.id && p.email !== updatedRecord.email
      );
      localStorage.setItem(
        'dupe_realname_profiles',
        JSON.stringify([updatedRecord, ...others])
      );
    } catch {
      // ignore
    }

    appendLog(
      editingMember ? '編輯實名會員' : '人工新增會員',
      `管理員儲存會員「${payload.full_name}（${payload.id_card_number}）」，狀態設為：${payload.status}`
    );
    setStatusBanner(
      res.ok
        ? `已成功儲存會員「${payload.full_name}」的實名檔案！`
        : `已儲存至管理中心快取（請確認 Supabase 已執行最新 SQL Migration：${result.error || ''}）`
    );
    setIsMemberModalOpen(false);
  };

  // 一鍵切換會員停權/啟用
  const handleToggleMemberStatus = async (member: ProfileRecord) => {
    const nextStatus = member.status === 'active' ? 'suspended' : 'active';
    await fetch('/api/admin', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({
        action: 'upsert_profile',
        payload: { ...member, status: nextStatus },
      }),
    });

    setProfiles((prev) =>
      prev.map((p) => (p.id === member.id ? { ...p, status: nextStatus } : p))
    );
    appendLog(
      '變更會員狀態',
      `會員「${member.full_name} (${member.id_card_number})」狀態變更為 ${
        nextStatus === 'active' ? '正常啟用' : '停權凍結'
      }`
    );
    setStatusBanner(
      `已將會員「${member.full_name}」狀態變更為：${
        nextStatus === 'active' ? '正常啟用' : '停權凍結'
      }`
    );
  };

  // 一鍵啟用/關閉賣場
  const handleToggleStore = async (store: StoreRecord) => {
    const nextActive = !store.is_active;
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({
        action: 'toggle_store',
        payload: { id: store.id, is_active: nextActive },
      }),
    });

    if (res.ok) {
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, is_active: nextActive } : s))
      );
      appendLog(
        '賣場權限變更',
        `賣場「${store.name}」狀態切換為：${nextActive ? '啟用公開' : '強制關閉'}`
      );
      setStatusBanner(`賣場「${store.name}」已${nextActive ? '啟用' : '關閉'}！`);
    }
  };

  // 商品強制下架或重新上架
  const handleToggleProductStatus = async (prod: ProductRecord) => {
    const nextStatus = prod.status === 'published' ? 'archived' : 'published';
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({
        action: 'update_product',
        payload: { id: prod.id, status: nextStatus },
      }),
    });

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, status: nextStatus } : p))
      );
      appendLog(
        '商品狀態管控',
        `商品「${prod.title}」狀態變更為：${nextStatus === 'published' ? '公開上架' : '強制下架'}`
      );
      setStatusBanner(
        `商品「${prod.title}」已${nextStatus === 'published' ? '恢復上架' : '強制下架'}！`
      );
    }
  };

  // 商品變更售價
  const handleSaveProductPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({
        action: 'update_product',
        payload: { id: editingProduct.id, price: newProductPrice },
      }),
    });

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id ? { ...p, price: newProductPrice } : p
        )
      );
      appendLog(
        '變更商品售價',
        `商品「${editingProduct.title}」售價調整為 NT$ ${newProductPrice}`
      );
      setStatusBanner(`已更新「${editingProduct.title}」售價為 NT$ ${newProductPrice.toLocaleString()}`);
      setEditingProduct(null);
    }
  };

  // 刪除違規商品
  const handleDeleteProduct = async (prod: ProductRecord) => {
    if (!window.confirm(`確定要永久刪除違規商品「${prod.title}」嗎？此操作無法復原。`)) {
      return;
    }

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({
        action: 'delete_product',
        payload: { id: prod.id },
      }),
    });

    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
      appendLog('刪除違規商品', `已永久移除商品「${prod.title} (ID: ${prod.id})」`);
      setStatusBanner(`已刪除違規商品「${prod.title}」`);
    }
  };

  // 警政／法務調閱一鍵匯出 CSV
  const handleExportLegalCSV = () => {
    const headers = [
      '會員ID',
      '真實姓名',
      '身分證字號/居留證號',
      '行動電話',
      '電子信箱',
      '聯絡/戶籍地址',
      '角色權限',
      '帳號狀態',
      '管理員備註',
      '註冊時間',
    ];
    const rows = profiles.map((p) => [
      p.id,
      p.full_name,
      p.id_card_number,
      p.phone,
      p.email,
      `"${(p.address || '').replace(/"/g, '""')}"`,
      p.role,
      p.status,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
      p.created_at,
    ]);

    const storeHeaders = [
      '賣場ID',
      '所屬會員ID',
      '賣場名稱',
      'LINE_ID',
      '聯絡電話',
      '面交地點',
      '寄送說明',
      '狀態',
      '開立時間',
    ];
    const storeRows = stores.map((s) => [
      s.id,
      s.user_id,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      s.contact_line || '',
      s.contact_phone || '',
      `"${(s.meetup_location || '').replace(/"/g, '""')}"`,
      `"${(s.custom_shipping_note || '').replace(/"/g, '""')}"`,
      s.is_active ? '啟用中' : '已關閉',
      s.created_at,
    ]);

    const csvContent =
      '\uFEFF' +
      '【第一部分：實名制會員警政調閱清冊】\n' +
      headers.join(',') +
      '\n' +
      rows.map((r) => r.join(',')).join('\n') +
      '\n\n【第二部分：全站賣場與聯絡管道清冊】\n' +
      storeHeaders.join(',') +
      '\n' +
      storeRows.map((r) => r.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dupe_legal_investigation_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    appendLog(
      '警政法務匯出',
      `匯出全站實名會員 (${profiles.length} 筆) 與賣場清冊 (${stores.length} 筆) CSV 報表`
    );
    setStatusBanner('已產生並下載「警政／法務調閱實名清冊 CSV 檔案」！');
  };

  // 篩選後清單
  const filteredProfiles = profiles.filter((p) => {
    const matchStatus = memberStatusFilter === 'all' || p.status === memberStatusFilter;
    const q = memberSearch.trim().toLowerCase();
    if (!q) return matchStatus;
    return (
      matchStatus &&
      ((p.full_name || '').toLowerCase().includes(q) ||
        (p.id_card_number || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q))
    );
  });

  const filteredStores = stores.filter((s) => {
    const q = storeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.contact_line || '').toLowerCase().includes(q) ||
      (s.contact_phone || '').toLowerCase().includes(q) ||
      (s.meetup_location || '').toLowerCase().includes(q)
    );
  });

  const filteredProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.stores?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#222222] flex flex-col md:flex-row">
      {/* 左側蝦皮賣家/管理中心風格導覽列（MUJI 低彩度配色） */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-[#E6E3DC] shrink-0 flex flex-col justify-between">
        <div>
          <div className="p-5 border-b border-[#E6E3DC]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-[#7F0019] uppercase">
                DUPE ADMIN
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222]">
                最高權限
              </span>
            </div>
            <h2 className="text-base font-bold text-[#222222] mt-1">
              蝦皮式營運管理後台
            </h2>
            <p className="text-[11px] text-[#666666] mt-0.5">
              實名防幽靈・全站賣場與商品稽核
            </p>
          </div>

          <nav className="p-3 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`w-full text-left px-3.5 py-2.5 text-xs rounded-sm transition-colors flex items-center justify-between ${
                activeTab === 'members'
                  ? 'bg-[#7F0019] text-white font-medium'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>1. 會員管理中心（實名制）</span>
              <span className="text-[10px] opacity-80">{profiles.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stores')}
              className={`w-full text-left px-3.5 py-2.5 text-xs rounded-sm transition-colors flex items-center justify-between ${
                activeTab === 'stores'
                  ? 'bg-[#7F0019] text-white font-medium'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>2. 賣場與賣家審查</span>
              <span className="text-[10px] opacity-80">{stores.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`w-full text-left px-3.5 py-2.5 text-xs rounded-sm transition-colors flex items-center justify-between ${
                activeTab === 'products'
                  ? 'bg-[#7F0019] text-white font-medium'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>3. 商品刊登管理</span>
              <span className="text-[10px] opacity-80">{products.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`w-full text-left px-3.5 py-2.5 text-xs rounded-sm transition-colors flex items-center justify-between ${
                activeTab === 'audit'
                  ? 'bg-[#7F0019] text-white font-medium'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>4. 系統與警政調閱記錄</span>
              <span className="text-[10px] opacity-80">匯出</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-[#E6E3DC] space-y-2 bg-[#FAF9F5]">
          <button
            type="button"
            onClick={fetchAllData}
            className="w-full py-2 text-xs border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5] text-[#222222] rounded-sm"
          >
            ↻ 重新同步全站資料
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 text-xs border border-[#7F0019] text-[#7F0019] hover:bg-[#7F0019] hover:text-white rounded-sm transition-colors"
          >
            登出管理員帳號
          </button>
        </div>
      </aside>

      {/* 右側主工作區 */}
      <div className="flex-1 p-6 md:p-8 overflow-x-auto">
        {/* 頂部數據指標卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm">
            <div className="text-[11px] text-[#666666]">實名註冊會員數</div>
            <div className="text-2xl font-bold text-[#222222] mt-1">{profiles.length}</div>
            <div className="text-[10px] text-[#666666] mt-1">
              正常：{profiles.filter((p) => p.status === 'active').length} / 停權：
              {profiles.filter((p) => p.status === 'suspended').length}
            </div>
          </div>

          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm">
            <div className="text-[11px] text-[#666666]">已開立賣場總數</div>
            <div className="text-2xl font-bold text-[#222222] mt-1">{stores.length}</div>
            <div className="text-[10px] text-[#666666] mt-1">
              啟用中：{stores.filter((s) => s.is_active).length} 家
            </div>
          </div>

          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm">
            <div className="text-[11px] text-[#666666]">全站刊登商品數</div>
            <div className="text-2xl font-bold text-[#222222] mt-1">{products.length}</div>
            <div className="text-[10px] text-[#666666] mt-1">
              公開上架中：{products.filter((p) => p.status === 'published').length} 件
            </div>
          </div>

          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm flex flex-col justify-between">
            <div className="text-[11px] text-[#666666]">警政／法務實名調閱</div>
            <button
              type="button"
              onClick={handleExportLegalCSV}
              className="mt-2 py-2 px-3 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium rounded-sm transition-colors"
            >
              ⬇ 一鍵匯出調閱清冊 CSV
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className="mb-6 p-3.5 bg-white border border-[#7F0019] text-xs text-[#7F0019] rounded-sm flex items-center justify-between">
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-[#666666] hover:text-[#222222] ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-[#E6E3DC] p-12 text-center text-xs text-[#666666]">
            正在載入全站實名會員、賣場與商品資料庫...
          </div>
        ) : (
          <>
            {/* 1. 會員管理中心 */}
            {activeTab === 'members' && (
              <section className="bg-white border border-[#E6E3DC] rounded-sm p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E3DC] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#222222]">
                      會員管理中心（防幽靈實名制清冊）
                    </h2>
                    <p className="text-xs text-[#666666] mt-0.5">
                      支援依「真實姓名」、「身分證字號」、「行動電話」即時檢索與人工建檔
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openCreateMemberModal}
                    className="px-4 py-2 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium rounded-sm transition-colors shrink-0"
                  >
                    + 新增實名會員（人工建檔）
                  </button>
                </div>

                {/* 搜尋與狀態過濾器 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="搜尋真實姓名、身分證字號、行動電話或 Email..."
                      className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                    />
                  </div>
                  <div>
                    <select
                      value={memberStatusFilter}
                      onChange={(e) => setMemberStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                    >
                      <option value="all">全部帳號狀態</option>
                      <option value="active">正常啟用 (active)</option>
                      <option value="suspended">停權凍結 (suspended)</option>
                      <option value="pending">待審核 (pending)</option>
                    </select>
                  </div>
                </div>

                {/* 會員資料表格 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E6E3DC] bg-[#FAF9F5] text-[#666666]">
                        <th className="py-2.5 px-3 font-medium">真實姓名</th>
                        <th className="py-2.5 px-3 font-medium">身分證 / 居留證</th>
                        <th className="py-2.5 px-3 font-medium">聯絡電話</th>
                        <th className="py-2.5 px-3 font-medium">Email / 現居地址</th>
                        <th className="py-2.5 px-3 font-medium">狀態</th>
                        <th className="py-2.5 px-3 font-medium">註冊時間</th>
                        <th className="py-2.5 px-3 font-medium text-right">管理操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E3DC]">
                      {filteredProfiles.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-[#666666]">
                            查無符合條件之實名會員紀錄（點擊右上角「+ 新增實名會員」可直接人工建檔）
                          </td>
                        </tr>
                      ) : (
                        filteredProfiles.map((member) => (
                          <tr key={member.id} className="hover:bg-[#FAF9F5]">
                            <td className="py-3 px-3 font-medium text-[#222222]">
                              {member.full_name}
                              {member.notes && (
                                <div className="text-[10px] text-[#7F0019] mt-0.5">
                                  備註：{member.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-[#222222]">
                              {member.id_card_number}
                            </td>
                            <td className="py-3 px-3 text-[#222222]">{member.phone}</td>
                            <td className="py-3 px-3">
                              <div className="text-[#222222]">{member.email}</div>
                              <div className="text-[11px] text-[#666666]">{member.address}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 text-[10px] border rounded-sm ${
                                  member.status === 'active'
                                    ? 'border-[#E6E3DC] bg-[#FAF9F5] text-[#222222]'
                                    : 'border-[#7F0019] bg-white text-[#7F0019] font-medium'
                                }`}
                              >
                                {member.status === 'active'
                                  ? '正常'
                                  : member.status === 'suspended'
                                  ? '停權凍結'
                                  : '待審核'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-[#666666]">
                              {new Date(member.created_at).toLocaleDateString('zh-TW')}
                            </td>
                            <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openEditMemberModal(member)}
                                className="px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5] text-[#222222] rounded-sm"
                              >
                                編輯 / 備註
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleMemberStatus(member)}
                                className="px-2.5 py-1 border border-[#7F0019] text-[#7F0019] hover:bg-[#7F0019] hover:text-white rounded-sm transition-colors"
                              >
                                {member.status === 'active' ? '停權凍結' : '解除停權'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 2. 賣場與賣家審查 */}
            {activeTab === 'stores' && (
              <section className="bg-white border border-[#E6E3DC] rounded-sm p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E3DC] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#222222]">
                      賣場與賣家權限審查
                    </h2>
                    <p className="text-xs text-[#666666] mt-0.5">
                      檢視全站賣場 LINE ID、聯絡電話、面交地點，並支援一鍵啟用或關閉賣場權限
                    </p>
                  </div>
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="搜尋賣場名稱、LINE ID、電話或面交地點..."
                    className="w-full sm:w-72 px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E6E3DC] bg-[#FAF9F5] text-[#666666]">
                        <th className="py-2.5 px-3 font-medium">賣場名稱</th>
                        <th className="py-2.5 px-3 font-medium">LINE ID / 電話</th>
                        <th className="py-2.5 px-3 font-medium">面交地點 / 寄送說明</th>
                        <th className="py-2.5 px-3 font-medium">開立時間</th>
                        <th className="py-2.5 px-3 font-medium">賣場狀態</th>
                        <th className="py-2.5 px-3 font-medium text-right">權限管控</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E3DC]">
                      {filteredStores.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#666666]">
                            目前尚無符合條件之賣場資料
                          </td>
                        </tr>
                      ) : (
                        filteredStores.map((store) => (
                          <tr key={store.id} className="hover:bg-[#FAF9F5]">
                            <td className="py-3 px-3 font-medium text-[#222222]">
                              <div>{store.name}</div>
                              <div className="text-[10px] text-[#666666] font-mono">
                                UID: {store.user_id.slice(0, 8)}...
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div>LINE: {store.contact_line || '未填寫'}</div>
                              <div className="text-[#666666]">
                                電話: {store.contact_phone || '未填寫'}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div>面交：{store.meetup_location || '未設定'}</div>
                              <div className="text-[11px] text-[#666666]">
                                寄送：{store.custom_shipping_note || '未設定'}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-[#666666]">
                              {new Date(store.created_at).toLocaleDateString('zh-TW')}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 text-[10px] border rounded-sm ${
                                  store.is_active
                                    ? 'border-[#E6E3DC] bg-[#FAF9F5] text-[#222222]'
                                    : 'border-[#7F0019] bg-white text-[#7F0019] font-medium'
                                }`}
                              >
                                {store.is_active ? '公開啟用' : '已關閉'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleToggleStore(store)}
                                className={`px-3 py-1 text-xs border rounded-sm transition-colors ${
                                  store.is_active
                                    ? 'border-[#7F0019] text-[#7F0019] hover:bg-[#7F0019] hover:text-white'
                                    : 'border-[#222222] bg-[#222222] text-white hover:opacity-90'
                                }`}
                              >
                                {store.is_active ? '關閉賣場權限' : '啟用賣場權限'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 3. 商品刊登管理 */}
            {activeTab === 'products' && (
              <section className="bg-white border border-[#E6E3DC] rounded-sm p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E3DC] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#222222]">
                      全站商品刊登管理（與前台即時同步）
                    </h2>
                    <p className="text-xs text-[#666666] mt-0.5">
                      支援強制下架違規商品、修改商品售價與永久刪除商品
                    </p>
                  </div>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="搜尋商品名稱或賣場名稱..."
                    className="w-full sm:w-72 px-3 py-2 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E6E3DC] bg-[#FAF9F5] text-[#666666]">
                        <th className="py-2.5 px-3 font-medium">商品資訊</th>
                        <th className="py-2.5 px-3 font-medium">所屬賣場</th>
                        <th className="py-2.5 px-3 font-medium">售價 (NT$)</th>
                        <th className="py-2.5 px-3 font-medium">狀態</th>
                        <th className="py-2.5 px-3 font-medium">上架日期</th>
                        <th className="py-2.5 px-3 font-medium text-right">管理操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E3DC]">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#666666]">
                            目前尚無符合條件之商品紀錄
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((prod) => (
                          <tr key={prod.id} className="hover:bg-[#FAF9F5]">
                            <td className="py-3 px-3">
                              <div className="font-medium text-[#222222]">{prod.title}</div>
                              <Link
                                href={`/products/${prod.id}`}
                                className="text-[10px] text-[#7F0019] underline"
                              >
                                查看前台商品頁 →
                              </Link>
                            </td>
                            <td className="py-3 px-3 text-[#666666]">
                              {prod.stores?.name || '個人賣場'}
                            </td>
                            <td className="py-3 px-3 font-bold text-[#222222]">
                              NT$ {prod.price.toLocaleString()}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 text-[10px] border rounded-sm ${
                                  prod.status === 'published'
                                    ? 'border-[#E6E3DC] bg-[#FAF9F5] text-[#222222]'
                                    : 'border-[#7F0019] bg-white text-[#7F0019] font-medium'
                                }`}
                              >
                                {prod.status === 'published' ? '上架中' : '已下架'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-[#666666]">
                              {new Date(prod.created_at).toLocaleDateString('zh-TW')}
                            </td>
                            <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(prod);
                                  setNewProductPrice(prod.price);
                                }}
                                className="px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5] text-[#222222] rounded-sm"
                              >
                                變更售價
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleProductStatus(prod)}
                                className="px-2.5 py-1 border border-[#E6E3DC] bg-[#FAF9F5] hover:bg-white text-[#222222] rounded-sm"
                              >
                                {prod.status === 'published' ? '強制下架' : '重新上架'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(prod)}
                                className="px-2.5 py-1 border border-[#7F0019] text-[#7F0019] hover:bg-[#7F0019] hover:text-white rounded-sm transition-colors"
                              >
                                刪除
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 4. 系統與警政調閱記錄 */}
            {activeTab === 'audit' && (
              <section className="bg-white border border-[#E6E3DC] rounded-sm p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E3DC] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#222222]">
                      警政／法務調閱中心與稽核紀錄
                    </h2>
                    <p className="text-xs text-[#666666] mt-0.5">
                      一鍵匯出完整實名制會員（真實姓名、身分證字號、電話、地址）與賣場關聯清冊，供司法與警政單位協查
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportLegalCSV}
                    className="px-4 py-2.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium rounded-sm transition-colors shrink-0"
                  >
                    ⬇ 匯出完整實名會員與賣場 CSV 報表
                  </button>
                </div>

                <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-2">
                  <div className="text-xs font-bold text-[#222222]">
                    防幽靈實名制與警政協查說明
                  </div>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    本後台所有實名註冊會員皆經過台灣身分證字號／居留證號權重檢查碼驗證，並強制留存真實姓名、行動電話與現居地址。當買賣雙方發生消費爭議或疑似詐欺案件時，管理員可透過上方「匯出完整實名會員與賣場 CSV 報表」快速提供司法機關調閱。
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#222222] mb-3">
                    近期後台管理與調閱操作軌跡
                  </h3>
                  <div className="border border-[#E6E3DC] rounded-sm divide-y divide-[#E6E3DC]">
                    {auditLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAF9F5]"
                      >
                        <div>
                          <span className="inline-block px-2 py-0.5 text-[10px] bg-[#FAF9F5] border border-[#E6E3DC] text-[#7F0019] font-medium mr-2">
                            {log.action}
                          </span>
                          <span className="text-[#222222]">{log.detail}</span>
                        </div>
                        <span className="text-[11px] text-[#666666] shrink-0">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* 底部強制法律免責宣告 */}
        <div className="mt-8 p-4 bg-white border border-[#E6E3DC] rounded-sm text-[11px] text-[#666666] leading-relaxed">
          免責聲明：本平台（Dupe 嘟屁）僅提供去中心化商品資訊刊登與 P2P 媒合展示看板，不介入買賣雙方實質交易、金流收付與商品交付流程，亦不承擔任何買賣履約保證與物之瑕疵擔保責任。
        </div>
      </div>

      {/* 新增 / 編輯實名會員彈窗 */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-lg rounded-sm p-6 shadow-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E3DC] mb-4">
              <h3 className="text-sm font-bold text-[#222222]">
                {editingMember ? `編輯實名會員：${editingMember.full_name}` : '新增實名會員（人工建檔）'}
              </h3>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="text-[#666666] hover:text-[#222222]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">電子信箱 *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                  />
                </div>
                {!editingMember && (
                  <div>
                    <label className="block font-medium text-[#222222] mb-1">初始密碼 *</label>
                    <input
                      type="text"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">真實姓名 *</label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    身分證字號 / 居留證號 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formIdCard}
                    onChange={(e) => setFormIdCard(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 uppercase border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">行動電話 *</label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">現居 / 聯絡地址 *</label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">系統角色</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as 'user' | 'seller' | 'admin')}
                    className="w-full px-3 py-2 border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                  >
                    <option value="user">一般會員 (user)</option>
                    <option value="seller">實名賣家 (seller)</option>
                    <option value="admin">管理員 (admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">帳號狀態</label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as 'active' | 'suspended' | 'pending')
                    }
                    className="w-full px-3 py-2 border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                  >
                    <option value="active">正常啟用 (active)</option>
                    <option value="suspended">停權凍結 (suspended)</option>
                    <option value="pending">待審核 (pending)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">管理員內部備註</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="可記錄實名核對結果、檢舉紀錄或特殊備註..."
                  className="w-full px-3 py-2 border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E6E3DC]">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 border border-[#E6E3DC] bg-white text-[#222222] rounded-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7F0019] hover:bg-[#660014] text-white font-medium rounded-sm"
                >
                  儲存會員資料
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 修改商品售價彈窗 */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-sm rounded-sm p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#222222] mb-2">
              調整商品售價
            </h3>
            <p className="text-xs text-[#666666] mb-4 line-clamp-1">
              {editingProduct.title}
            </p>
            <form onSubmit={handleSaveProductPrice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  新售價 (NT$)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3 py-1.5 text-xs border border-[#E6E3DC] bg-white text-[#222222] rounded-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#7F0019] text-white rounded-sm"
                >
                  確認修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
