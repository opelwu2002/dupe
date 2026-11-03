'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Member {
  id: string;
  email: string;
  full_name: string;
  id_card_number: string;
  phone: string;
  address: string;
  line_id: string;
  role: string;
  status: string;
  notes: string;
  created_at: string;
}

interface Store {
  id: string;
  user_id: string;
  name: string;
  description: string;
  contact_line: string;
  contact_phone: string;
  meetup_location: string;
  custom_shipping_note: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

interface Variant {
  id?: string;
  name: string;
  price: number;
  stock: number;
}

interface Product {
  id: string;
  store_id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  status: string;
  created_at: string;
  product_variants: Variant[];
  stores?: {
    id: string;
    name: string;
    user_id: string;
  } | null;
}

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'members' | 'stores' | 'products' | 'batch' | 'police'
  >('members');

  const [members, setMembers] = useState<Member[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 搜尋與篩選狀態
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('all');
  const [storeSearch, setStoreSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');

  // 彈窗狀態：新增/編輯會員
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [mForm, setMForm] = useState({
    email: '',
    password: '',
    full_name: '',
    id_card_number: '',
    phone: '',
    address: '',
    line_id: '',
    role: 'seller',
    status: 'active',
    notes: '',
  });

  // 彈窗狀態：新增/編輯賣場
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [sForm, setSForm] = useState({
    user_id: '',
    name: '',
    description: '',
    contact_line: '',
    contact_phone: '',
    meetup_location: '',
    custom_shipping_note: '',
    commission_rate: 0,
    is_active: true,
  });

  // 彈窗狀態：新增/編輯商品
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pForm, setPForm] = useState({
    store_id: '',
    title: '',
    description: '',
    price: 350,
    imageUrl: '',
    status: 'published',
    variants: [{ name: '預設規格', price: 350, stock: 1 }] as Variant[],
  });

  // 批次匯入文字
  const [batchStoreId, setBatchStoreId] = useState('');
  const [batchText, setBatchText] = useState(
    '無印風亞麻收納籃, 390, 5, https://images.unsplash.com/photo-1544816155-12df9643f363?w=800, 質感居家收納好物\n日式白瓷馬克杯, 250, 10, https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800, 溫潤手感極簡設計'
  );

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch_all_data' }),
      });
      const data = await res.json();
      if (data.ok) {
        setMembers(data.members || []);
        setStores(data.stores || []);
        setProducts(data.products || []);
        if (data.stores?.[0]?.id && !batchStoreId) {
          setBatchStoreId(data.stores[0].id);
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [batchStoreId]);

  useEffect(() => {
    const saved = sessionStorage.getItem('dupe_admin_session');
    if (saved === 'verified') {
      setIsAuthenticated(true);
      fetchAllData();
    }
  }, [fetchAllData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'admin_login',
        payload: { username, password },
      }),
    });
    const result = await res.json();
    if (result.ok) {
      sessionStorage.setItem('dupe_admin_session', 'verified');
      setIsAuthenticated(true);
      fetchAllData();
    } else {
      setLoginError(result.error || '帳號或密碼錯誤');
    }
  };

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  // 會員新增或儲存
  const openCreateMember = () => {
    setEditingMemberId(null);
    setMForm({
      email: '',
      password: '',
      full_name: '',
      id_card_number: '',
      phone: '',
      address: '',
      line_id: '',
      role: 'seller',
      status: 'active',
      notes: '',
    });
    setMemberModalOpen(true);
  };

  const openEditMember = (m: Member) => {
    setEditingMemberId(m.id);
    setMForm({
      email: m.email,
      password: '',
      full_name: m.full_name,
      id_card_number: m.id_card_number,
      phone: m.phone,
      address: m.address,
      line_id: m.line_id || '',
      role: m.role || 'seller',
      status: m.status || 'active',
      notes: m.notes || '',
    });
    setMemberModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingMemberId ? 'update_user' : 'admin_create_user';
    const payload = editingMemberId ? { user_id: editingMemberId, ...mForm } : mForm;

    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
    const result = await res.json();
    if (result.ok) {
      showToast(editingMemberId ? '會員實名資料已更新！' : '已成功新增實名會員！');
      setMemberModalOpen(false);
      fetchAllData();
    } else {
      alert(`操作失敗：${result.error}`);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`確定要永久刪除會員「${name}」及其關聯賣場嗎？`)) return;
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_user', payload: { user_id: id } }),
    });
    const result = await res.json();
    if (result.ok) {
      showToast('會員已刪除');
      fetchAllData();
    }
  };

  // 賣場新增或儲存
  const openCreateStore = () => {
    setEditingStoreId(null);
    setSForm({
      user_id: members[0]?.id || '',
      name: '',
      description: '',
      contact_line: '',
      contact_phone: '',
      meetup_location: '',
      custom_shipping_note: '',
      commission_rate: 0,
      is_active: true,
    });
    setStoreModalOpen(true);
  };

  const openEditStore = (s: Store) => {
    setEditingStoreId(s.id);
    setSForm({
      user_id: s.user_id,
      name: s.name,
      description: s.description || '',
      contact_line: s.contact_line || '',
      contact_phone: s.contact_phone || '',
      meetup_location: s.meetup_location || '',
      custom_shipping_note: s.custom_shipping_note || '',
      commission_rate: s.commission_rate || 0,
      is_active: s.is_active,
    });
    setStoreModalOpen(true);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_store',
        payload: { id: editingStoreId, ...sForm },
      }),
    });
    const result = await res.json();
    if (result.ok) {
      showToast(editingStoreId ? '賣場資料已更新！' : '已成功建立新賣場！');
      setStoreModalOpen(false);
      fetchAllData();
    } else {
      alert(`賣場儲存失敗：${result.error}`);
    }
  };

  const handleDeleteStore = async (id: string, name: string) => {
    if (!confirm(`確定要刪除賣場「${name}」及其所有商品嗎？`)) return;
    await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_store', payload: { id } }),
    });
    showToast('賣場已刪除');
    fetchAllData();
  };

  // 商品新增或儲存
  const openCreateProduct = () => {
    if (stores.length === 0) {
      alert('請先在「賣場與賣家審查」建立至少一個賣場後，再上架商品。');
      return;
    }
    setEditingProductId(null);
    setPForm({
      store_id: stores[0].id,
      title: '',
      description: '',
      price: 350,
      imageUrl: '',
      status: 'published',
      variants: [{ name: '標準規格', price: 350, stock: 5 }],
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setPForm({
      store_id: p.store_id,
      title: p.title,
      description: p.description || '',
      price: p.price,
      imageUrl: (p.images || []).join('\n'),
      status: p.status,
      variants:
        p.product_variants && p.product_variants.length > 0
          ? p.product_variants
          : [{ name: '標準規格', price: p.price, stock: 1 }],
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const images = pForm.imageUrl
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_product',
        payload: {
          id: editingProductId,
          store_id: pForm.store_id,
          title: pForm.title,
          description: pForm.description,
          price: pForm.price,
          images,
          status: pForm.status,
          variants: pForm.variants,
        },
      }),
    });
    const result = await res.json();
    if (result.ok) {
      showToast(editingProductId ? '商品與規格已同步更新至前台！' : '新商品已成功上架至前台！');
      setProductModalOpen(false);
      fetchAllData();
    } else {
      alert(`商品儲存失敗：${result.error}`);
    }
  };

  const handleDeleteProduct = async (id: string, title: string) => {
    if (!confirm(`確定要刪除商品「${title}」嗎？`)) return;
    await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_product', payload: { id } }),
    });
    showToast('商品已刪除');
    fetchAllData();
  };

  // 批次匯入商品
  const handleBatchImport = async () => {
    if (!batchStoreId) {
      alert('請先選擇要匯入的目標賣場');
      return;
    }
    const lines = batchText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let count = 0;
    for (const line of lines) {
      const [title, priceStr, stockStr, imgUrl, desc] = line.split(',').map((s) => s.trim());
      if (!title) continue;
      const price = Number(priceStr) || 100;
      const stock = Number(stockStr) || 1;
      await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_product',
          payload: {
            store_id: batchStoreId,
            title,
            description: desc || '',
            price,
            images: imgUrl ? [imgUrl] : [],
            status: 'published',
            variants: [{ name: '標準規格', price, stock }],
          },
        }),
      });
      count++;
    }
    showToast(`成功批次匯入 ${count} 件商品並同步至前台！`);
    fetchAllData();
    setActiveTab('products');
  };

  // 匯出警政實名調閱 CSV
  const exportPoliceCsv = () => {
    const headers = [
      '會員UUID',
      '真實姓名',
      '身分證字號/居留證',
      '聯絡電話',
      '電子信箱',
      'LINE_ID',
      '現居/戶籍地址',
      '帳號狀態',
      '開立賣場名稱',
      '管理員備註',
      '註冊時間',
    ];
    const rows = members.map((m) => {
      const userStores = stores
        .filter((s) => s.user_id === m.id)
        .map((s) => s.name)
        .join(' / ');
      return [
        m.id,
        m.full_name,
        m.id_card_number,
        m.phone,
        m.email,
        m.line_id,
        `"${(m.address || '').replace(/"/g, '""')}"`,
        m.status,
        `"${userStores || '無'}"`,
        `"${(m.notes || '').replace(/"/g, '""')}"`,
        m.created_at,
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DUPE_警政法務實名調閱總冊_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (!isAuthenticated) {
    return (
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 shadow-sm">
          <div className="text-center mb-6">
            <span className="px-2 py-0.5 text-[10px] bg-[#7F0019] text-white rounded-sm">
              ADMINISTRATION
            </span>
            <h1 className="text-lg font-bold text-[#222222] mt-2">嘟屁 DUPE・蝦皮式營運管理後台</h1>
            <p className="text-xs text-[#666666] mt-1">請輸入最高管理員授權帳密</p>
          </div>
          {loginError && (
            <div className="mb-4 p-3 text-xs bg-[#FAF9F5] border border-[#7F0019] text-[#7F0019]">
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#222222] mb-1">管理員帳號</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] bg-[#FAF9F5]"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#222222] mb-1">管理員密碼</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] bg-[#FAF9F5]"
                placeholder="••••••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium rounded-sm"
            >
              登入營運管理中心
            </button>
          </form>
        </div>
      </main>
    );
  }

  const filteredMembers = members.filter((m) => {
    const matchStatus = memberStatusFilter === 'all' || m.status === memberStatusFilter;
    const q = memberSearch.toLowerCase();
    const matchQuery =
      !q ||
      m.full_name.toLowerCase().includes(q) ||
      m.id_card_number.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.address.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const filteredStores = stores.filter((s) => {
    const q = storeSearch.toLowerCase();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.contact_line || '').toLowerCase().includes(q) ||
      (s.contact_phone || '').toLowerCase().includes(q)
    );
  });

  const filteredProducts = products.filter((p) => {
    const matchStatus = productStatusFilter === 'all' || p.status === productStatusFilter;
    const q = productSearch.toLowerCase();
    return matchStatus && (!q || p.title.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAF9F5]">
      {/* 左側導覽列 */}
      <aside className="w-full md:w-64 bg-white border-r border-[#E6E3DC] flex flex-col justify-between p-4">
        <div className="space-y-6">
          <div className="border-b border-[#E6E3DC] pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-[#7F0019]">DUPE ADMIN</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#FAF9F5] border border-[#E6E3DC]">
                最高權限
              </span>
            </div>
            <h2 className="text-base font-bold text-[#222222] mt-1">蝦皮式營運管理後台</h2>
            <p className="text-[11px] text-[#666666]">實名防幽靈・全站賣場與商品稽核</p>
          </div>

          <nav className="space-y-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3 py-2.5 rounded-sm font-medium flex justify-between ${
                activeTab === 'overview'
                  ? 'bg-[#7F0019] text-white'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>0. 營運總覽儀表板</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`w-full text-left px-3 py-2.5 rounded-sm font-medium flex justify-between ${
                activeTab === 'members'
                  ? 'bg-[#7F0019] text-white'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>1. 會員管理中心 (實名制)</span>
              <span>{members.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stores')}
              className={`w-full text-left px-3 py-2.5 rounded-sm font-medium flex justify-between ${
                activeTab === 'stores'
                  ? 'bg-[#7F0019] text-white'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>2. 賣場與賣家審查</span>
              <span>{stores.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`w-full text-left px-3 py-2.5 rounded-sm font-medium flex justify-between ${
                activeTab === 'products'
                  ? 'bg-[#7F0019] text-white'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>3. 商品與規格管理</span>
              <span>{products.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`w-full text-left px-3 py-2.5 rounded-sm font-medium flex justify-between ${
                activeTab === 'batch'
                  ? 'bg-[#7F0019] text-white'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>4. 蝦皮商品批次搬家</span>
              <span>工具</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('police')}
              className={`w-full text-left px-3 py-2.5 rounded-sm font-medium flex justify-between ${
                activeTab === 'police'
                  ? 'bg-[#7F0019] text-white'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>5. 警政與司法調閱中心</span>
              <span>匯出</span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-[#E6E3DC] space-y-2">
          <button
            type="button"
            onClick={fetchAllData}
            className="w-full py-2 text-xs border border-[#E6E3DC] bg-[#FAF9F5] hover:bg-white text-[#222222]"
          >
            {loading ? '同步中...' : '↻ 重新同步全站資料'}
          </button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('dupe_admin_session');
              setIsAuthenticated(false);
            }}
            className="w-full py-2 text-xs text-[#666666] hover:text-[#7F0019]"
          >
            登出管理後台
          </button>
        </div>
      </aside>

      {/* 右側主畫面 */}
      <main className="flex-1 p-6 space-y-6 overflow-x-auto">
        {notice && (
          <div className="p-3 bg-white border-l-4 border-[#7F0019] shadow-sm text-xs font-medium text-[#222222]">
            ✓ {notice}
          </div>
        )}

        {/* 頂部數據指標 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm">
            <div className="text-xs text-[#666666]">實名註冊會員數</div>
            <div className="text-2xl font-bold text-[#222222] mt-1">{members.length}</div>
            <div className="text-[11px] text-[#666666] mt-1">
              正常：{members.filter((m) => m.status === 'active').length} / 停權：
              {members.filter((m) => m.status === 'suspended').length}
            </div>
          </div>
          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm">
            <div className="text-xs text-[#666666]">已開立賣場總數</div>
            <div className="text-2xl font-bold text-[#222222] mt-1">{stores.length}</div>
            <div className="text-[11px] text-[#666666] mt-1">
              啟用中：{stores.filter((s) => s.is_active).length} 家
            </div>
          </div>
          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm">
            <div className="text-xs text-[#666666]">全站刊登商品數</div>
            <div className="text-2xl font-bold text-[#222222] mt-1">{products.length}</div>
            <div className="text-[11px] text-[#666666] mt-1">
              公開上架中：{products.filter((p) => p.status === 'published').length} 件
            </div>
          </div>
          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm flex flex-col justify-between">
            <div className="text-xs text-[#666666]">警政 / 法務實名調閱</div>
            <button
              type="button"
              onClick={exportPoliceCsv}
              className="mt-2 w-full py-2 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium rounded-sm"
            >
              ⬇ 一鍵匯出調閱清冊 CSV
            </button>
          </div>
        </div>

        {/* 0. 總覽儀表板 */}
        {activeTab === 'overview' && (
          <div className="bg-white border border-[#E6E3DC] p-6 rounded-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-[#222222]">全站快速營運控制台</h3>
              <p className="text-xs text-[#666666]">
                前臺與後臺資料庫 100% 即時連動，您可在此直接執行人工開戶、代建賣場與商品稽核。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-[#E6E3DC] bg-[#FAF9F5] space-y-2">
                <div className="text-xs font-bold text-[#222222]">步驟 1：管理實名會員</div>
                <p className="text-[11px] text-[#666666]">
                  強制登錄真實姓名、身分證字號、行動電話與現居地址，防止幽靈詐騙帳號。
                </p>
                <button
                  type="button"
                  onClick={openCreateMember}
                  className="px-3 py-1.5 bg-[#7F0019] text-white text-xs rounded-sm"
                >
                  + 人工新增實名會員
                </button>
              </div>
              <div className="p-4 border border-[#E6E3DC] bg-[#FAF9F5] space-y-2">
                <div className="text-xs font-bold text-[#222222]">步驟 2：開立與綁定賣場</div>
                <p className="text-[11px] text-[#666666]">
                  為任一實名會員開立專屬賣場，設定 LINE、電話、面交地點與抽成費率。
                </p>
                <button
                  type="button"
                  onClick={openCreateStore}
                  className="px-3 py-1.5 bg-[#7F0019] text-white text-xs rounded-sm"
                >
                  + 後台新增賣場
                </button>
              </div>
              <div className="p-4 border border-[#E6E3DC] bg-[#FAF9F5] space-y-2">
                <div className="text-xs font-bold text-[#222222]">步驟 3：上架與管理商品</div>
                <p className="text-[11px] text-[#666666]">
                  支援多規格、庫存與外部圖床網址，儲存後立即顯示於前台首頁。
                </p>
                <button
                  type="button"
                  onClick={openCreateProduct}
                  className="px-3 py-1.5 bg-[#7F0019] text-white text-xs rounded-sm"
                >
                  + 後台直接上架商品
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1. 實名制會員管理中心 */}
        {activeTab === 'members' && (
          <div className="bg-white border border-[#E6E3DC] p-6 rounded-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-[#222222]">
                  會員管理中心（防幽靈實名制清冊）
                </h3>
                <p className="text-xs text-[#666666]">
                  支援依「真實姓名」、「身分證字號」、「行動電話」、「地址」即時檢索與完整編輯
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateMember}
                className="px-4 py-2 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium rounded-sm"
              >
                + 新增實名會員（人工建檔）
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="搜尋真實姓名、身分證字號、行動電話、地址或 Email..."
                className="sm:col-span-2 px-3 py-2 text-xs border border-[#E6E3DC] bg-[#FAF9F5]"
              />
              <select
                value={memberStatusFilter}
                onChange={(e) => setMemberStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-[#E6E3DC] bg-[#FAF9F5]"
              >
                <option value="all">全部帳號狀態</option>
                <option value="active">正常啟用 (active)</option>
                <option value="suspended">停權凍結 (suspended)</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E6E3DC] bg-[#FAF9F5] text-[#666666]">
                    <th className="p-3">真實姓名</th>
                    <th className="p-3">身分證 / 居留證</th>
                    <th className="p-3">聯絡電話 / LINE</th>
                    <th className="p-3">Email / 現居地址</th>
                    <th className="p-3">狀態 / 備註</th>
                    <th className="p-3">註冊時間</th>
                    <th className="p-3 text-right">管理操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E3DC]">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#666666]">
                        查無符合條件之實名會員紀錄（點擊右上角「+ 新增實名會員」可直接人工建檔）
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-[#FAF9F5]/60">
                        <td className="p-3 font-bold text-[#222222]">{m.full_name}</td>
                        <td className="p-3 font-mono text-[#7F0019] font-medium">
                          {m.id_card_number}
                        </td>
                        <td className="p-3">
                          <div>{m.phone}</div>
                          {m.line_id && (
                            <div className="text-[11px] text-[#666666]">LINE: {m.line_id}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-[#222222]">{m.email}</div>
                          <div className="text-[11px] text-[#666666]">{m.address}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] rounded-sm ${
                              m.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                          >
                            {m.status === 'active' ? '正常' : '已停權'}
                          </span>
                          {m.notes && (
                            <div className="text-[10px] text-[#7F0019] mt-1">{m.notes}</div>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-[#666666]">
                          {new Date(m.created_at).toLocaleDateString('zh-TW')}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => openEditMember(m)}
                            className="px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5] font-medium"
                          >
                            編輯所有資料
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(m.id, m.full_name)}
                            className="px-2 py-1 text-[#7F0019] hover:underline"
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
          </div>
        )}

        {/* 2. 賣場與賣家審查 */}
        {activeTab === 'stores' && (
          <div className="bg-white border border-[#E6E3DC] p-6 rounded-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-[#222222]">賣場與賣家審查中心</h3>
                <p className="text-xs text-[#666666]">
                  檢視所有賣場、對應實名負責人、聯絡方式、面交地點與抽成費率
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateStore}
                className="px-4 py-2 bg-[#7F0019] text-white text-xs font-medium rounded-sm"
              >
                + 新增賣場
              </button>
            </div>

            <input
              type="text"
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              placeholder="搜尋賣場名稱、LINE ID 或聯絡電話..."
              className="w-full px-3 py-2 text-xs border border-[#E6E3DC] bg-[#FAF9F5]"
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E6E3DC] bg-[#FAF9F5] text-[#666666]">
                    <th className="p-3">賣場名稱</th>
                    <th className="p-3">實名負責人</th>
                    <th className="p-3">公開聯絡方式</th>
                    <th className="p-3">面交地點 / 寄送說明</th>
                    <th className="p-3">費率 / 狀態</th>
                    <th className="p-3 text-right">管理操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E3DC]">
                  {filteredStores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#666666]">
                        目前尚無賣場資料
                      </td>
                    </tr>
                  ) : (
                    filteredStores.map((s) => {
                      const owner = members.find((m) => m.id === s.user_id);
                      return (
                        <tr key={s.id} className="hover:bg-[#FAF9F5]/60">
                          <td className="p-3">
                            <div className="font-bold text-[#222222]">{s.name}</div>
                            <div className="text-[11px] text-[#666666]">{s.description}</div>
                          </td>
                          <td className="p-3">
                            {owner ? (
                              <div>
                                <div className="font-medium">{owner.full_name}</div>
                                <div className="text-[11px] font-mono text-[#7F0019]">
                                  {owner.id_card_number}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[#666666]">系統指派</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div>LINE: {s.contact_line || '-'}</div>
                            <div>電話: {s.contact_phone || '-'}</div>
                          </td>
                          <td className="p-3">
                            <div>面交: {s.meetup_location || '-'}</div>
                            <div className="text-[11px] text-[#666666]">
                              寄送: {s.custom_shipping_note || '-'}
                            </div>
                          </td>
                          <td className="p-3">
                            <div>抽成: {(Number(s.commission_rate) * 100).toFixed(1)}%</div>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 text-[10px] rounded-sm ${
                                s.is_active
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              {s.is_active ? '營業中' : '已關閉'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => openEditStore(s)}
                              className="px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5]"
                            >
                              編輯賣場
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStore(s.id, s.name)}
                              className="px-2 py-1 text-[#7F0019] hover:underline"
                            >
                              刪除
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. 商品與規格管理 */}
        {activeTab === 'products' && (
          <div className="bg-white border border-[#E6E3DC] p-6 rounded-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-[#222222]">
                  全站商品與規格管理（與前台即時同步）
                </h3>
                <p className="text-xs text-[#666666]">
                  可由後台直接代客上架、修改售價、管理多規格庫存或強制下架違規商品
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateProduct}
                className="px-4 py-2 bg-[#7F0019] text-white text-xs font-medium rounded-sm"
              >
                + 新增刊登商品
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="搜尋商品名稱..."
                className="sm:col-span-2 px-3 py-2 text-xs border border-[#E6E3DC] bg-[#FAF9F5]"
              />
              <select
                value={productStatusFilter}
                onChange={(e) => setProductStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-[#E6E3DC] bg-[#FAF9F5]"
              >
                <option value="all">全部商品狀態</option>
                <option value="published">上架中 (published)</option>
                <option value="sold_out">已售完 (sold_out)</option>
                <option value="archived">已下架 (archived)</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E6E3DC] bg-[#FAF9F5] text-[#666666]">
                    <th className="p-3">商品圖片 / 名稱</th>
                    <th className="p-3">所屬賣場</th>
                    <th className="p-3">主售價</th>
                    <th className="p-3">規格與庫存明細</th>
                    <th className="p-3">狀態</th>
                    <th className="p-3 text-right">管理操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E3DC]">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#666666]">
                        目前尚無商品資料
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAF9F5]/60">
                        <td className="p-3 flex items-center space-x-3">
                          <div className="w-12 h-12 bg-[#FAF9F5] border border-[#E6E3DC] flex-shrink-0 overflow-hidden flex items-center justify-center">
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
                            <Link className="font-bold text-[#222222] hover:text-[#7F0019]" href={`/products/${p.id}`} target="_blank">
                              {p.title} ↗
                            </Link>
                            <div className="text-[11px] text-[#666666] line-clamp-1">
                              {p.description}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">{p.stores?.name || '未知賣場'}</td>
                        <td className="p-3 font-bold">NT$ {p.price.toLocaleString()}</td>
                        <td className="p-3">
                          {p.product_variants?.map((v, i) => (
                            <div key={i} className="text-[11px] text-[#666666]">
                              {v.name} (NT${v.price} / 庫存:{v.stock})
                            </div>
                          ))}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] rounded-sm ${
                              p.status === 'published'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-300'
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
                            onClick={() => openEditProduct(p)}
                            className="px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5]"
                          >
                            編輯商品
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id, p.title)}
                            className="px-2 py-1 text-[#7F0019] hover:underline"
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
          </div>
        )}

        {/* 4. 蝦皮批次搬家工具 */}
        {activeTab === 'batch' && (
          <div className="bg-white border border-[#E6E3DC] p-6 rounded-sm space-y-4 max-w-3xl">
            <h3 className="text-base font-bold text-[#222222]">蝦皮賣場商品・一鍵批次快速搬家工具</h3>
            <p className="text-xs text-[#666666]">
              每行一筆商品，格式：<code className="text-[#7F0019]">商品名稱, 售價, 庫存, 圖片網址, 商品說明</code>
            </p>
            <div>
              <label className="block text-xs font-medium text-[#222222] mb-1">選擇匯入目標賣場</label>
              <select
                value={batchStoreId}
                onChange={(e) => setBatchStoreId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E6E3DC] bg-[#FAF9F5]"
              >
                <option value="">-- 請選擇賣場 --</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#222222] mb-1">批次商品清單</label>
              <textarea
                rows={6}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                className="w-full p-3 text-xs font-mono border border-[#E6E3DC] bg-[#FAF9F5]"
              />
            </div>
            <button
              type="button"
              onClick={handleBatchImport}
              className="px-6 py-2.5 bg-[#7F0019] text-white text-xs font-medium rounded-sm"
            >
              開始批次匯入並上架至前台
            </button>
          </div>
        )}

        {/* 5. 警政與司法調閱中心 */}
        {activeTab === 'police' && (
          <div className="bg-white border border-[#E6E3DC] p-6 rounded-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-[#222222]">
                  警政 / 司法機關實名資料調閱專區
                </h3>
                <p className="text-xs text-[#666666]">
                  當買家與賣家發生交易糾紛或疑似詐欺案件時，可一鍵匯出完整實名個資、電話、身分證字號與戶籍地址供警方偵辦。
                </p>
              </div>
              <button
                type="button"
                onClick={exportPoliceCsv}
                className="px-4 py-2 bg-[#7F0019] text-white text-xs font-medium rounded-sm"
              >
                ⬇ 匯出完整實名清冊 CSV
              </button>
            </div>
            <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] text-xs space-y-2">
              <div className="font-bold text-[#222222]">調閱欄位包含：</div>
              <p className="text-[#666666]">
                1. 會員系統唯一識別碼 (UUID)、2. 真實姓名、3. 國民身分證字號 / 居留證號、4. 認證行動電話、5. 電子信箱、6. LINE ID、7. 現居 / 戶籍地址、8. 關聯賣場名稱與刊登紀錄、9. 註冊與最後登入時間戳記。
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 彈窗 1：新增 / 編輯實名會員 */}
      {memberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-lg rounded-sm p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#222222] mb-4">
              {editingMemberId ? '編輯會員所有實名資料' : '人工新增實名制會員'}
            </h3>
            <form onSubmit={handleSaveMember} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">電子信箱 (帳號) *</label>
                  <input
                    type="email"
                    required
                    value={mForm.email}
                    onChange={(e) => setMForm({ ...mForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    {editingMemberId ? '重設密碼 (留空則不修改)' : '初始登入密碼 *'}
                  </label>
                  <input
                    type="password"
                    required={!editingMemberId}
                    value={mForm.password}
                    onChange={(e) => setMForm({ ...mForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                    placeholder="至少 6 碼"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">真實姓名 *</label>
                  <input
                    type="text"
                    required
                    value={mForm.full_name}
                    onChange={(e) => setMForm({ ...mForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">身分證字號 / 居留證號 *</label>
                  <input
                    type="text"
                    required
                    value={mForm.id_card_number}
                    onChange={(e) =>
                      setMForm({ ...mForm, id_card_number: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5] uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">聯絡行動電話 *</label>
                  <input
                    type="text"
                    required
                    value={mForm.phone}
                    onChange={(e) => setMForm({ ...mForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">LINE ID</label>
                  <input
                    type="text"
                    value={mForm.line_id}
                    onChange={(e) => setMForm({ ...mForm, line_id: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">現居 / 戶籍聯絡地址 *</label>
                <input
                  type="text"
                  required
                  value={mForm.address}
                  onChange={(e) => setMForm({ ...mForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">帳號狀態</label>
                  <select
                    value={mForm.status}
                    onChange={(e) => setMForm({ ...mForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    <option value="active">正常啟用 (active)</option>
                    <option value="suspended">停權凍結 (suspended)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">身分角色</label>
                  <select
                    value={mForm.role}
                    onChange={(e) => setMForm({ ...mForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    <option value="seller">實名買賣家 (seller)</option>
                    <option value="admin">系統管理員 (admin)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">管理員稽核備註（僅後台可見）</label>
                <textarea
                  rows={2}
                  value={mForm.notes}
                  onChange={(e) => setMForm({ ...mForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  placeholder="可記錄實名查核紀錄、糾紛案號等..."
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-[#E6E3DC]">
                <button
                  type="button"
                  onClick={() => setMemberModalOpen(false)}
                  className="px-4 py-2 border border-[#E6E3DC]"
                >
                  取消
                </button>
                <button type="submit" className="px-5 py-2 bg-[#7F0019] text-white font-medium">
                  儲存會員資料
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 彈窗 2：新增 / 編輯賣場 */}
      {storeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-lg rounded-sm p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#222222] mb-4">
              {editingStoreId ? '編輯賣場設定' : '後台新增賣場'}
            </h3>
            <form onSubmit={handleSaveStore} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">指派所屬實名會員 *</label>
                <select
                  required
                  value={sForm.user_id}
                  onChange={(e) => setSForm({ ...sForm, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                >
                  <option value="">-- 請選擇實名會員 --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.id_card_number} / {m.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">賣場名稱 *</label>
                <input
                  type="text"
                  required
                  value={sForm.name}
                  onChange={(e) => setSForm({ ...sForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">賣場簡介</label>
                <textarea
                  rows={2}
                  value={sForm.description}
                  onChange={(e) => setSForm({ ...sForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">公開 LINE ID</label>
                  <input
                    type="text"
                    value={sForm.contact_line}
                    onChange={(e) => setSForm({ ...sForm, contact_line: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">公開聯絡電話</label>
                  <input
                    type="text"
                    value={sForm.contact_phone}
                    onChange={(e) => setSForm({ ...sForm, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">面交地點</label>
                <input
                  type="text"
                  value={sForm.meetup_location}
                  onChange={(e) => setSForm({ ...sForm, meetup_location: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">寄送與交易說明</label>
                <input
                  type="text"
                  value={sForm.custom_shipping_note}
                  onChange={(e) => setSForm({ ...sForm, custom_shipping_note: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">平台抽成費率 (0 = 免費)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={sForm.commission_rate}
                    onChange={(e) =>
                      setSForm({ ...sForm, commission_rate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">賣場狀態</label>
                  <select
                    value={sForm.is_active ? 'true' : 'false'}
                    onChange={(e) => setSForm({ ...sForm, is_active: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    <option value="true">正常營業</option>
                    <option value="false">停權關閉</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-[#E6E3DC]">
                <button
                  type="button"
                  onClick={() => setStoreModalOpen(false)}
                  className="px-4 py-2 border border-[#E6E3DC]"
                >
                  取消
                </button>
                <button type="submit" className="px-5 py-2 bg-[#7F0019] text-white font-medium">
                  儲存賣場
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 彈窗 3：新增 / 編輯商品與規格 */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-lg rounded-sm p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#222222] mb-4">
              {editingProductId ? '編輯商品與規格' : '後台直接上架商品'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">所屬賣場 *</label>
                <select
                  required
                  value={pForm.store_id}
                  onChange={(e) => setPForm({ ...pForm, store_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">商品標題 *</label>
                <input
                  type="text"
                  required
                  value={pForm.title}
                  onChange={(e) => setPForm({ ...pForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">主售價 (NT$) *</label>
                  <input
                    type="number"
                    required
                    value={pForm.price}
                    onChange={(e) => setPForm({ ...pForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">上架狀態</label>
                  <select
                    value={pForm.status}
                    onChange={(e) => setPForm({ ...pForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    <option value="published">上架中 (published)</option>
                    <option value="sold_out">已售完 (sold_out)</option>
                    <option value="archived">下架隱藏 (archived)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">圖片網址 (每行一筆 URL)</label>
                <textarea
                  rows={2}
                  value={pForm.imageUrl}
                  onChange={(e) => setPForm({ ...pForm, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>
              <div className="border-t border-b border-[#E6E3DC] py-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold">規格與庫存明細</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPForm({
                        ...pForm,
                        variants: [
                          ...pForm.variants,
                          { name: '', price: pForm.price, stock: 1 },
                        ],
                      })
                    }
                    className="text-[#7F0019] hover:underline"
                  >
                    + 新增規格
                  </button>
                </div>
                {pForm.variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="規格名"
                      value={v.name}
                      onChange={(e) => {
                        const next = [...pForm.variants];
                        next[idx].name = e.target.value;
                        setPForm({ ...pForm, variants: next });
                      }}
                      className="col-span-6 px-2 py-1 border border-[#E6E3DC] bg-[#FAF9F5]"
                    />
                    <input
                      type="number"
                      required
                      placeholder="售價"
                      value={v.price}
                      onChange={(e) => {
                        const next = [...pForm.variants];
                        next[idx].price = Number(e.target.value);
                        setPForm({ ...pForm, variants: next });
                      }}
                      className="col-span-3 px-2 py-1 border border-[#E6E3DC] bg-[#FAF9F5]"
                    />
                    <input
                      type="number"
                      required
                      placeholder="庫存"
                      value={v.stock}
                      onChange={(e) => {
                        const next = [...pForm.variants];
                        next[idx].stock = Number(e.target.value);
                        setPForm({ ...pForm, variants: next });
                      }}
                      className="col-span-3 px-2 py-1 border border-[#E6E3DC] bg-[#FAF9F5]"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block font-medium mb-1">商品詳細說明</label>
                <textarea
                  rows={3}
                  value={pForm.description}
                  onChange={(e) => setPForm({ ...pForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-[#E6E3DC]">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 border border-[#E6E3DC]"
                >
                  取消
                </button>
                <button type="submit" className="px-5 py-2 bg-[#7F0019] text-white font-medium">
                  儲存商品並同步前台
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
