'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SingleImageUploader from '@/components/SingleImageUploader';
import AdminProductModal from '@/components/AdminProductModal';
import AdminContactSection from '@/components/AdminContactSection';
import { PRODUCT_CATEGORIES } from '@/lib/productMeta';
import {
  PortalConfig,
  DEFAULT_PORTAL_CONFIG,
  HeroCampaignItem,
  FloorConfigItem,
  HotKeywordItem,
  QuickFilterMode,
  evaluateScheduleState,
  FeedbackTicket,
  INITIAL_FEEDBACK_TICKETS,
} from '@/lib/portalConfig';

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
    'cms' | 'overview' | 'members' | 'stores' | 'products' | 'batch' | 'police' | 'contact'
  >('cms');

  const [cmsSubTab, setCmsSubTab] = useState<'campaigns' | 'floors' | 'settings'>('campaigns');

  const [members, setMembers] = useState<Member[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [portalConfig, setPortalConfig] = useState<PortalConfig>(DEFAULT_PORTAL_CONFIG);
  const [feedbackTickets, setFeedbackTickets] = useState<FeedbackTicket[]>(
    INITIAL_FEEDBACK_TICKETS
  );
  const [loading, setLoading] = useState(false);
  const [savingCms, setSavingCms] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 搜尋與篩選狀態
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('all');
  const [storeSearch, setStoreSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');

  // 彈窗狀態：新增/編輯首頁輪播活動 (Hero Campaign)
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [editingCampaignIdx, setEditingCampaignIdx] = useState<number | null>(null);
  const [cForm, setCForm] = useState<HeroCampaignItem>({
    id: '',
    tabTitle: '',
    badge: '',
    title: '',
    subtitle: '',
    image: '',
    ctaText: '立即查看',
    filterMode: 'all',
    customUrl: '',
    status: 'active',
    scheduleEnabled: false,
    startAt: '',
    endAt: '',
  });

  // 彈窗狀態：新增/編輯百貨樓層 (Floor)
  const [floorModalOpen, setFloorModalOpen] = useState(false);
  const [editingFloorIdx, setEditingFloorIdx] = useState<number | null>(null);
  const [fForm, setFForm] = useState<{
    id: string;
    floorNum: string;
    title: string;
    subtitle: string;
    accentColor: string;
    hotTagsStr: string;
    bannerTitle: string;
    bannerDesc: string;
    bannerImg: string;
    bottomPillsStr: string;
    matchCategories: string[];
    status: 'active' | 'paused';
    scheduleEnabled: boolean;
    startAt: string;
    endAt: string;
  }>({
    id: '',
    floorNum: '4F',
    title: '',
    subtitle: '',
    accentColor: '#7F0019',
    hotTagsStr: '',
    bannerTitle: '',
    bannerDesc: '',
    bannerImg: '',
    bottomPillsStr: '',
    matchCategories: [PRODUCT_CATEGORIES[0]],
    status: 'active',
    scheduleEnabled: false,
    startAt: '',
    endAt: '',
  });

  // 新增熱搜關鍵字輸入狀態
  const [newKwLabel, setNewKwLabel] = useState('');
  const [newKwValue, setNewKwValue] = useState('');

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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
        if (data.portalConfig) {
          setPortalConfig(data.portalConfig);
        }
        if (data.feedbackTickets) {
          setFeedbackTickets(data.feedbackTickets);
        }
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

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  // 儲存並同步首頁 CMS 設定至雲端
  const persistPortalConfig = async (
    nextConfig: PortalConfig,
    successMsg = '首頁版面與活動排程已同步更新至前台！'
  ) => {
    setSavingCms(true);
    setPortalConfig(nextConfig);
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_portal_config',
        payload: nextConfig,
      }),
    });
    const result = await res.json();
    setSavingCms(false);
    if (result.ok) {
      showToast(successMsg);
    } else {
      alert(`首頁設定儲存失敗：${result.error}`);
    }
  };

  // --- 首頁主視覺輪播活動 (Hero Campaigns) 操作 ---
  const openCreateCampaign = () => {
    setEditingCampaignIdx(null);
    setCForm({
      id: `camp-${Date.now()}`,
      tabTitle: '新檔期活動',
      badge: 'LIMITED CAMPAIGN',
      title: '',
      subtitle: '',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
      ctaText: '立即查看活動品項',
      filterMode: 'all',
      customUrl: '',
      status: 'active',
      scheduleEnabled: false,
      startAt: '',
      endAt: '',
    });
    setCampaignModalOpen(true);
  };

  const openEditCampaign = (idx: number) => {
    const target = portalConfig.heroCampaigns[idx];
    if (!target) return;
    setEditingCampaignIdx(idx);
    setCForm({ ...target });
    setCampaignModalOpen(true);
  };

  const handleSaveCampaignModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = [...(portalConfig.heroCampaigns || [])];
    if (editingCampaignIdx !== null) {
      list[editingCampaignIdx] = cForm;
    } else {
      list.push(cForm);
    }
    setCampaignModalOpen(false);
    await persistPortalConfig(
      { ...portalConfig, heroCampaigns: list },
      editingCampaignIdx !== null ? '活動內容與排程已更新！' : '已新增首頁輪播活動並同步前台！'
    );
  };

  const handleToggleCampaignStatus = async (idx: number) => {
    const list = [...portalConfig.heroCampaigns];
    list[idx] = {
      ...list[idx],
      status: list[idx].status === 'active' ? 'paused' : 'active',
    };
    await persistPortalConfig(
      { ...portalConfig, heroCampaigns: list },
      list[idx].status === 'active' ? '活動已恢復啟用上架！' : '活動已暫停（前台立即隱藏）！'
    );
  };

  const handleMoveCampaign = async (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= portalConfig.heroCampaigns.length) return;
    const list = [...portalConfig.heroCampaigns];
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    await persistPortalConfig({ ...portalConfig, heroCampaigns: list }, '活動輪播順序已調整！');
  };

  const handleDeleteCampaign = async (idx: number) => {
    if (portalConfig.heroCampaigns.length <= 1) {
      alert('首頁至少需保留 1 檔主視覺活動（若不顯示可改用「暫停」或編輯替換）。');
      return;
    }
    if (!confirm(`確定要刪除活動「${portalConfig.heroCampaigns[idx].title}」嗎？`)) return;
    const list = portalConfig.heroCampaigns.filter((_, i) => i !== idx);
    await persistPortalConfig({ ...portalConfig, heroCampaigns: list }, '活動已刪除！');
  };

  // --- 百貨樓層主題館 (Floors) 操作 ---
  const openCreateFloor = () => {
    setEditingFloorIdx(null);
    const nextNum = `${(portalConfig.floors?.length || 3) + 1}F`;
    setFForm({
      id: `floor-${Date.now()}`,
      floorNum: nextNum,
      title: '主題特企專館',
      subtitle: '精選主題好物與實名認證賣家直營',
      accentColor: '#7F0019',
      hotTagsStr: '熱門選品, 限量現貨, 二聯/三聯發票, 雙北面交',
      bannerTitle: '主題策展精選',
      bannerDesc: '全館透明標示含稅與未稅價格，支援直接聯繫賣家約定交易。',
      bannerImg: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
      bottomPillsStr: '精選單品, 現貨秒出, 免運優惠, 企業報帳',
      matchCategories: [PRODUCT_CATEGORIES[0]],
      status: 'active',
      scheduleEnabled: false,
      startAt: '',
      endAt: '',
    });
    setFloorModalOpen(true);
  };

  const openEditFloor = (idx: number) => {
    const fl = portalConfig.floors[idx];
    if (!fl) return;
    setEditingFloorIdx(idx);
    setFForm({
      id: fl.id,
      floorNum: fl.floorNum,
      title: fl.title,
      subtitle: fl.subtitle,
      accentColor: fl.accentColor || '#7F0019',
      hotTagsStr: (fl.hotTags || []).join(', '),
      bannerTitle: fl.bannerTitle,
      bannerDesc: fl.bannerDesc,
      bannerImg: fl.bannerImg,
      bottomPillsStr: (fl.bottomPills || []).join(', '),
      matchCategories: fl.matchCategories || [PRODUCT_CATEGORIES[0]],
      status: fl.status || 'active',
      scheduleEnabled: Boolean(fl.scheduleEnabled),
      startAt: fl.startAt || '',
      endAt: fl.endAt || '',
    });
    setFloorModalOpen(true);
  };

  const handleSaveFloorModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const newFloor: FloorConfigItem = {
      id: fForm.id,
      floorNum: fForm.floorNum.trim(),
      title: fForm.title.trim(),
      subtitle: fForm.subtitle.trim(),
      accentColor: fForm.accentColor,
      hotTags: fForm.hotTagsStr
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean),
      bannerTitle: fForm.bannerTitle.trim(),
      bannerDesc: fForm.bannerDesc.trim(),
      bannerImg: fForm.bannerImg.trim(),
      bottomPills: fForm.bottomPillsStr
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean),
      matchCategories: fForm.matchCategories,
      status: fForm.status,
      scheduleEnabled: fForm.scheduleEnabled,
      startAt: fForm.startAt,
      endAt: fForm.endAt,
    };

    const list = [...(portalConfig.floors || [])];
    if (editingFloorIdx !== null) {
      list[editingFloorIdx] = newFloor;
    } else {
      list.push(newFloor);
    }
    setFloorModalOpen(false);
    await persistPortalConfig(
      { ...portalConfig, floors: list },
      editingFloorIdx !== null ? '百貨樓層設定已更新！' : '已新增百貨樓層並同步前台！'
    );
  };

  const handleToggleFloorStatus = async (idx: number) => {
    const list = [...portalConfig.floors];
    list[idx] = {
      ...list[idx],
      status: list[idx].status === 'active' ? 'paused' : 'active',
    };
    await persistPortalConfig(
      { ...portalConfig, floors: list },
      list[idx].status === 'active' ? '樓層已啟用顯示！' : '樓層已暫停隱藏！'
    );
  };

  const handleMoveFloor = async (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= portalConfig.floors.length) return;
    const list = [...portalConfig.floors];
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    await persistPortalConfig({ ...portalConfig, floors: list }, '樓層順序已更新！');
  };

  const handleDeleteFloor = async (idx: number) => {
    if (
      !confirm(
        `確定要刪除「${portalConfig.floors[idx].floorNum} ${portalConfig.floors[idx].title}」嗎？`
      )
    )
      return;
    const list = portalConfig.floors.filter((_, i) => i !== idx);
    await persistPortalConfig({ ...portalConfig, floors: list }, '樓層已刪除！');
  };

  // --- 熱搜詞與全站公告設定 ---
  const handleAddHotKeyword = async () => {
    if (!newKwLabel.trim()) return;
    const nextKw: HotKeywordItem = {
      id: `hk-${Date.now()}`,
      label: newKwLabel.trim(),
      keyword: newKwValue.trim() || newKwLabel.trim(),
    };
    const nextList = [...(portalConfig.hotKeywords || []), nextKw];
    setNewKwLabel('');
    setNewKwValue('');
    await persistPortalConfig({ ...portalConfig, hotKeywords: nextList }, '已新增熱門搜尋關鍵字！');
  };

  const handleRemoveHotKeyword = async (id: string) => {
    const nextList = (portalConfig.hotKeywords || []).filter((k) => k.id !== id);
    await persistPortalConfig({ ...portalConfig, hotKeywords: nextList }, '已移除熱門搜尋關鍵字！');
  };

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
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductModalOpen(true);
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
            variants: [{ name: '__SINGLE__', price, stock }],
          },
        }),
      });
      count++;
    }
    showToast(`成功批次匯入 ${count} 件商品並同步至前台！`);
    fetchAllData();
    setActiveTab('products');
  };

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
            <h1 className="text-lg font-bold text-[#222222] mt-2">
              嘟屁 DUPE・全站營運與首頁管理後台
            </h1>
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
            <h2 className="text-base font-bold text-[#222222] mt-1">蝦皮／樂天級管理後台</h2>
            <p className="text-[11px] text-[#666666]">首頁活動排程・實名防幽靈・全站稽核</p>
          </div>

          <nav className="space-y-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('cms')}
              className={`w-full text-left px-3 py-2.5 rounded-sm font-bold flex justify-between items-center ${
                activeTab === 'cms'
                  ? 'bg-[#7F0019] text-white'
                  : 'text-[#7F0019] bg-[#FAF9F5] hover:bg-[#E6E3DC]/40'
              }`}
            >
              <span>★ 首頁與活動排程管理</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded-sm">CMS</span>
            </button>
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
              onClick={() => setActiveTab('police')}
              className={`w-full text-left px-3 py-2.5 rounded-sm font-medium flex justify-between ${
                activeTab === 'police'
                  ? 'bg-[#7F0019] text-white'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>4. 警政與司法調閱中心</span>
              <span>匯出</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              className={`w-full text-left px-3 py-2.5 rounded-sm font-medium flex justify-between ${
                activeTab === 'contact'
                  ? 'bg-[#7F0019] text-white'
                  : 'text-[#222222] hover:bg-[#FAF9F5]'
              }`}
            >
              <span>5. 與我們聯絡與留言管理</span>
              <span>{feedbackTickets.length}</span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-[#E6E3DC] space-y-2">
          <Link
            href="/"
            target="_blank"
            className="block w-full py-2 text-center text-xs bg-[#222222] text-white rounded-sm hover:bg-[#7F0019]"
          >
            ↗ 開新分頁預覽前台首頁
          </Link>
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
          <div className="p-3 bg-white border-l-4 border-[#7F0019] shadow-sm text-xs font-bold text-[#222222] flex justify-between items-center">
            <span>✓ {notice}</span>
            <Link href="/" target="_blank" className="text-[#7F0019] underline">
              立即查看首頁成果 ↗
            </Link>
          </div>
        )}

        {/* 頂部數據指標 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm">
            <div className="text-xs text-[#666666]">首頁輪播活動檔數</div>
            <div className="text-2xl font-bold text-[#7F0019] mt-1">
              {portalConfig.heroCampaigns?.length || 0}
            </div>
            <div className="text-[11px] text-[#666666] mt-1">
              生效顯示中：
              {
                (portalConfig.heroCampaigns || []).filter(
                  (c) => evaluateScheduleState(c).isVisibleOnFrontend
                ).length
              }{' '}
              檔
            </div>
          </div>
          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm">
            <div className="text-xs text-[#666666]">首頁百貨樓層數</div>
            <div className="text-2xl font-bold text-[#222222] mt-1">
              {portalConfig.floors?.length || 0} 層
            </div>
            <div className="text-[11px] text-[#666666] mt-1">
              啟用中：
              {
                (portalConfig.floors || []).filter(
                  (f) => evaluateScheduleState(f).isVisibleOnFrontend
                ).length
              }{' '}
              層
            </div>
          </div>
          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm">
            <div className="text-xs text-[#666666]">實名註冊會員數</div>
            <div className="text-2xl font-bold text-[#222222] mt-1">{members.length}</div>
            <div className="text-[11px] text-[#666666] mt-1">
              正常：{members.filter((m) => m.status === 'active').length} / 停權：
              {members.filter((m) => m.status === 'suspended').length}
            </div>
          </div>
          <div className="bg-white border border-[#E6E3DC] p-4 rounded-sm">
            <div className="text-xs text-[#666666]">全站賣場 / 商品數</div>
            <div className="text-2xl font-bold text-[#222222] mt-1">
              {stores.length} 店 / {products.length} 品
            </div>
            <div className="text-[11px] text-[#666666] mt-1">
              公開上架：{products.filter((p) => p.status === 'published').length} 件
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

        {/* ★ 核心新增：首頁版面與活動排程管理中心 (CMS) */}
        {activeTab === 'cms' && (
          <div className="bg-white border border-[#E6E3DC] p-6 rounded-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E3DC] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#222222]">
                  首頁版面、主題樓層與活動排程管理中心
                </h3>
                <p className="text-xs text-[#666666] mt-0.5">
                  支援新增、刪除、暫停、編輯、排序首頁輪播與百貨樓層，可上傳活動圖片或引用圖片網址，並設定上下檔時間排程。
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('確定要將首頁所有活動與樓層還原為系統預設值嗎？')) {
                      persistPortalConfig(DEFAULT_PORTAL_CONFIG, '已還原為系統預設首頁版面！');
                    }
                  }}
                  className="px-3 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5] text-xs text-[#666666] hover:text-[#222222] rounded-sm"
                >
                  還原預設版面
                </button>
              </div>
            </div>

            {/* CMS 子分頁切換 */}
            <div className="flex flex-wrap gap-2 border-b border-[#E6E3DC] pb-3 text-xs">
              <button
                type="button"
                onClick={() => setCmsSubTab('campaigns')}
                className={`px-4 py-2 rounded-sm font-bold transition-colors ${
                  cmsSubTab === 'campaigns'
                    ? 'bg-[#7F0019] text-white'
                    : 'bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222]'
                }`}
              >
                A. 首頁主視覺輪播與活動排程 ({portalConfig.heroCampaigns?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setCmsSubTab('floors')}
                className={`px-4 py-2 rounded-sm font-bold transition-colors ${
                  cmsSubTab === 'floors'
                    ? 'bg-[#7F0019] text-white'
                    : 'bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222]'
                }`}
              >
                B. 百貨樓層主題館管理 1F~NF ({portalConfig.floors?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setCmsSubTab('settings')}
                className={`px-4 py-2 rounded-sm font-bold transition-colors ${
                  cmsSubTab === 'settings'
                    ? 'bg-[#7F0019] text-white'
                    : 'bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222]'
                }`}
              >
                C. 熱門搜尋詞、防詐公告與注目賣場設定
              </button>
            </div>

            {/* 子分頁 A：主視覺輪播與活動排程管理 */}
            {cmsSubTab === 'campaigns' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-[#666666]">
                    提示：前台首頁僅會自動輪播狀態為「🟢 進行中」之活動；您可隨時新增檔期、暫停活動或設定未來的排程區間。
                  </div>
                  <button
                    type="button"
                    onClick={openCreateCampaign}
                    className="px-4 py-2 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-bold rounded-sm"
                  >
                    + 新增輪播活動橫幅
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E6E3DC] bg-[#FAF9F5] text-[#666666]">
                        <th className="p-3">順序</th>
                        <th className="p-3">活動橫幅預覽 / 頁籤名</th>
                        <th className="p-3">主標題 / 副標題</th>
                        <th className="p-3">活動排程時間</th>
                        <th className="p-3">目前狀態</th>
                        <th className="p-3 text-right">管理操作 (編輯/暫停/排序/刪除)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E3DC]">
                      {(portalConfig.heroCampaigns || []).map((camp, idx) => {
                        const sched = evaluateScheduleState(camp);
                        return (
                          <tr key={camp.id} className="hover:bg-[#FAF9F5]/60">
                            <td className="p-3 font-bold text-[#666666]">#{idx + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-24 h-14 bg-[#222222] border border-[#E6E3DC] rounded-sm overflow-hidden flex-shrink-0">
                                  {camp.image && (
                                    <img
                                      src={camp.image}
                                      alt={camp.tabTitle}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
                                <div>
                                  <span className="px-1.5 py-0.5 text-[10px] bg-[#7F0019] text-white rounded-sm">
                                    {camp.badge}
                                  </span>
                                  <div className="font-bold text-[#222222] mt-1">
                                    頁籤：{camp.tabTitle}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 max-w-xs">
                              <div className="font-bold text-[#222222] line-clamp-1">
                                {camp.title}
                              </div>
                              <div className="text-[11px] text-[#666666] line-clamp-2 mt-0.5">
                                {camp.subtitle}
                              </div>
                            </td>
                            <td className="p-3 text-[11px]">
                              {camp.scheduleEnabled ? (
                                <div className="space-y-0.5">
                                  <div>起：{camp.startAt ? camp.startAt.replace('T', ' ') : '即時'}</div>
                                  <div>迄：{camp.endAt ? camp.endAt.replace('T', ' ') : '無期限'}</div>
                                </div>
                              ) : (
                                <span className="text-[#666666]">常駐不限期</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 text-[11px] font-bold rounded-sm ${
                                  sched.isVisibleOnFrontend
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : sched.state === 'scheduled'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                                }`}
                              >
                                {sched.label}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveCampaign(idx, -1)}
                                className="px-2 py-1 border border-[#E6E3DC] bg-white disabled:opacity-30"
                                title="上移"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === portalConfig.heroCampaigns.length - 1}
                                onClick={() => handleMoveCampaign(idx, 1)}
                                className="px-2 py-1 border border-[#E6E3DC] bg-white disabled:opacity-30"
                                title="下移"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditCampaign(idx)}
                                className="px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5] font-bold text-[#222222]"
                              >
                                編輯 / 排程
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleCampaignStatus(idx)}
                                className={`px-2.5 py-1 border font-medium ${
                                  camp.status === 'active'
                                    ? 'border-amber-600 text-amber-800 bg-amber-50'
                                    : 'border-emerald-600 text-emerald-800 bg-emerald-50'
                                }`}
                              >
                                {camp.status === 'active' ? '暫停' : '啟用'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCampaign(idx)}
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
              </div>
            )}

            {/* 子分頁 B：百貨樓層主題館管理 */}
            {cmsSubTab === 'floors' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-[#666666]">
                    可自由新增百貨樓層（如 4F、5F）、更換樓層中欄主題海報圖、編輯左側「大家都在找」與底部快篩膠囊。
                  </div>
                  <button
                    type="button"
                    onClick={openCreateFloor}
                    className="px-4 py-2 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-bold rounded-sm"
                  >
                    + 新增百貨樓層專館
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E6E3DC] bg-[#FAF9F5] text-[#666666]">
                        <th className="p-3">樓層</th>
                        <th className="p-3">中欄海報 / 樓層名稱</th>
                        <th className="p-3">大家都在找 / 綁定分類</th>
                        <th className="p-3">排程 / 狀態</th>
                        <th className="p-3 text-right">管理操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E3DC]">
                      {(portalConfig.floors || []).map((fl, idx) => {
                        const sched = evaluateScheduleState(fl);
                        return (
                          <tr key={fl.id} className="hover:bg-[#FAF9F5]/60">
                            <td className="p-3">
                              <span
                                className="px-2.5 py-1 text-xs font-bold text-white rounded-sm"
                                style={{ backgroundColor: fl.accentColor || '#7F0019' }}
                              >
                                {fl.floorNum}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-16 h-16 bg-[#222222] border border-[#E6E3DC] rounded-sm overflow-hidden flex-shrink-0">
                                  {fl.bannerImg && (
                                    <img
                                      src={fl.bannerImg}
                                      alt={fl.title}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-[#222222]">{fl.title}</div>
                                  <div className="text-[11px] text-[#666666]">{fl.subtitle}</div>
                                  <div className="text-[11px] text-[#7F0019] mt-0.5">
                                    視覺卡：{fl.bannerTitle}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-[11px] text-[#222222]">
                                熱門詞：{(fl.hotTags || []).join('、')}
                              </div>
                              <div className="text-[11px] text-[#666666] mt-1">
                                綁定分類：{(fl.matchCategories || []).join(' / ')}
                              </div>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 text-[11px] font-bold rounded-sm ${
                                  sched.isVisibleOnFrontend
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                                }`}
                              >
                                {sched.label}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveFloor(idx, -1)}
                                className="px-2 py-1 border border-[#E6E3DC] bg-white disabled:opacity-30"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === portalConfig.floors.length - 1}
                                onClick={() => handleMoveFloor(idx, 1)}
                                className="px-2 py-1 border border-[#E6E3DC] bg-white disabled:opacity-30"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditFloor(idx)}
                                className="px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5] font-bold"
                              >
                                編輯樓層
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleFloorStatus(idx)}
                                className="px-2.5 py-1 border border-[#E6E3DC] bg-white"
                              >
                                {fl.status === 'active' ? '暫停' : '啟用'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFloor(idx)}
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
              </div>
            )}

            {/* 子分頁 C：熱門搜尋詞、防詐公告與注目賣場設定 */}
            {cmsSubTab === 'settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-4">
                  <h4 className="font-bold text-sm text-[#222222]">
                    1. 頂部防詐提醒／全站公告與注目賣場設定
                  </h4>
                  <div>
                    <label className="block font-medium mb-1">防詐提醒／置頂公告標題</label>
                    <input
                      type="text"
                      value={portalConfig.antiFraudTitle}
                      onChange={(e) =>
                        setPortalConfig({ ...portalConfig, antiFraudTitle: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">防詐提醒／置頂公告內容</label>
                    <textarea
                      rows={2}
                      value={portalConfig.antiFraudText}
                      onChange={(e) =>
                        setPortalConfig({ ...portalConfig, antiFraudText: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">指定首頁「注目實名認證賣場」</label>
                    <select
                      value={portalConfig.featuredStoreId || ''}
                      onChange={(e) =>
                        setPortalConfig({ ...portalConfig, featuredStoreId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
                    >
                      <option value="">
                        自動選取最新實名賣場（預設：{stores[0]?.name || '日貨小判'}）
                      </option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}（{s.meetup_location || '實名店鋪'}）
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={portalConfig.defaultShowDemoProducts}
                      onChange={(e) =>
                        setPortalConfig({
                          ...portalConfig,
                          defaultShowDemoProducts: e.target.checked,
                        })
                      }
                      className="accent-[#7F0019]"
                    />
                    <span className="font-medium text-[#222222]">
                      首頁預設勾選「併同顯示平台策展範例商品」
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={savingCms}
                    onClick={() => persistPortalConfig(portalConfig, '公告與注目賣場設定已更新！')}
                    className="px-5 py-2 bg-[#7F0019] text-white font-bold rounded-sm"
                  >
                    {savingCms ? '儲存中...' : '儲存公告與賣場設定'}
                  </button>
                </div>

                <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-4">
                  <h4 className="font-bold text-sm text-[#222222]">
                    2. 搜尋框下方「熱門搜尋關鍵字」管理
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKwLabel}
                      onChange={(e) => setNewKwLabel(e.target.value)}
                      placeholder="顯示名稱（例：冬日大衣）"
                      className="flex-1 px-2.5 py-1.5 border border-[#E6E3DC] bg-white"
                    />
                    <input
                      type="text"
                      value={newKwValue}
                      onChange={(e) => setNewKwValue(e.target.value)}
                      placeholder="搜尋詞（留空則同上）"
                      className="flex-1 px-2.5 py-1.5 border border-[#E6E3DC] bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddHotKeyword}
                      className="px-3 py-1.5 bg-[#7F0019] text-white font-bold rounded-sm whitespace-nowrap"
                    >
                      + 新增熱搜詞
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {(portalConfig.hotKeywords || []).map((kw) => (
                      <div
                        key={kw.id}
                        className="px-3 py-1.5 bg-white border border-[#E6E3DC] rounded-sm flex items-center space-x-2"
                      >
                        <span className="font-medium text-[#222222]">{kw.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHotKeyword(kw.id)}
                          className="text-[#7F0019] font-bold hover:underline"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 0. 總覽儀表板 */}
        {activeTab === 'overview' && (
          <div className="bg-white border border-[#E6E3DC] p-6 rounded-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-[#222222]">全站快速營運控制台</h3>
              <p className="text-xs text-[#666666]">
                前臺與後臺資料庫 100% 即時連動，您可在此管理首頁活動排程、人工開戶、代建賣場與商品稽核。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border border-[#E6E3DC] bg-[#FAF9F5] space-y-2">
                <div className="text-xs font-bold text-[#7F0019]">首頁活動與樓層排程</div>
                <p className="text-[11px] text-[#666666]">
                  新增或暫停首頁輪播橫幅、上傳活動圖片、設定檔期排程與百貨樓層。
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('cms')}
                  className="px-3 py-1.5 bg-[#7F0019] text-white text-xs rounded-sm"
                >
                  前往首頁活動管理
                </button>
              </div>
              <div className="p-4 border border-[#E6E3DC] bg-[#FAF9F5] space-y-2">
                <div className="text-xs font-bold text-[#222222]">步驟 1：管理實名會員</div>
                <p className="text-[11px] text-[#666666]">
                  強制登錄真實姓名、身分證字號、行動電話與現居地址，防止幽靈詐騙帳號。
                </p>
                <button
                  type="button"
                  onClick={openCreateMember}
                  className="px-3 py-1.5 bg-[#222222] text-white text-xs rounded-sm"
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
                  className="px-3 py-1.5 bg-[#222222] text-white text-xs rounded-sm"
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
                  className="px-3 py-1.5 bg-[#222222] text-white text-xs rounded-sm"
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
                  {filteredMembers.map((m) => (
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
                        {m.notes && <div className="text-[10px] text-[#7F0019] mt-1">{m.notes}</div>}
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
                  ))}
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
                  {filteredStores.map((s) => {
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
                  })}
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
                <option value="sold_out">已售完/流單 (sold_out)</option>
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
                  {filteredProducts.map((p) => (
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
                          <Link
                            href={`/products/${p.id}`}
                            target="_blank"
                            className="font-bold text-[#222222] hover:text-[#7F0019]"
                          >
                            {p.title} ↗
                          </Link>
                        </div>
                      </td>
                      <td className="p-3">{p.stores?.name || '未知賣場'}</td>
                      <td className="p-3 font-bold">NT$ {p.price.toLocaleString()}</td>
                      <td className="p-3">
                        {p.product_variants?.map((v, i) => (
                          <div key={i} className="text-[11px] text-[#666666]">
                            {v.name === '__SINGLE__' ? '單一商品' : v.name} (NT${v.price} / 庫存:
                            {v.stock})
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. 警政與司法調閱中心 */}
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

        {/* 5. 與我們聯絡與留言管理 */}
        {activeTab === 'contact' && (
          <AdminContactSection
            feedbackTickets={feedbackTickets}
            onSavePortalConfig={persistPortalConfig}
            portalConfig={portalConfig}
            savingCms={savingCms}
            setFeedbackTickets={setFeedbackTickets}
            setPortalConfig={setPortalConfig}
            showToast={showToast}
          />
        )}
      </main>

      {/* ★ 彈窗 A：新增 / 編輯首頁輪播活動與排程 (Hero Campaign Modal) */}
      {campaignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-2xl rounded-sm p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[#E6E3DC] mb-4">
              <h3 className="text-base font-bold text-[#222222]">
                {editingCampaignIdx !== null ? '編輯首頁輪播活動與排程' : '新增首頁輪播活動與排程'}
              </h3>
              <button
                type="button"
                onClick={() => setCampaignModalOpen(false)}
                className="text-[#666666] hover:text-[#222222]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCampaignModal} className="space-y-4 text-xs">
              <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm">
                <SingleImageUploader
                  imageUrl={cForm.image}
                  label="活動主視覺圖片（支援直接上傳圖片檔案，或貼上外部圖片連結） *"
                  onChange={(url) => setCForm({ ...cForm, image: url })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">底部切換頁籤名稱 (短標題) *</label>
                  <input
                    type="text"
                    required
                    value={cForm.tabTitle}
                    onChange={(e) => setCForm({ ...cForm, tabTitle: e.target.value })}
                    placeholder="例：雙11日貨免運 / 企業發票專區"
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">左上角膠囊小標 (Badge) *</label>
                  <input
                    type="text"
                    required
                    value={cForm.badge}
                    onChange={(e) => setCForm({ ...cForm, badge: e.target.value })}
                    placeholder="例：SPECIAL CAMPAIGN"
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">活動主標題 *</label>
                <input
                  type="text"
                  required
                  value={cForm.title}
                  onChange={(e) => setCForm({ ...cForm, title: e.target.value })}
                  placeholder="例：秋冬日本連線代購祭・沒買到 100% 無息全額退費"
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">活動副標題說明 *</label>
                <textarea
                  rows={2}
                  required
                  value={cForm.subtitle}
                  onChange={(e) => setCForm({ ...cForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">按鈕文字</label>
                  <input
                    type="text"
                    value={cForm.ctaText}
                    onChange={(e) => setCForm({ ...cForm, ctaText: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">點擊後篩選模式</label>
                  <select
                    value={cForm.filterMode}
                    onChange={(e) =>
                      setCForm({ ...cForm, filterMode: e.target.value as QuickFilterMode })
                    }
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    <option value="all">瀏覽全部商品</option>
                    <option value="in_stock">篩選：現貨供應</option>
                    <option value="preorder_proxy">篩選：預購／日本代購</option>
                    <option value="invoice_only">篩選：可開發票／收據</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">或指定跳轉連結 (選填)</label>
                  <input
                    type="text"
                    value={cForm.customUrl || ''}
                    onChange={(e) => setCForm({ ...cForm, customUrl: e.target.value })}
                    placeholder="例：/products/xxx"
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
              </div>

              {/* 活動狀態與時間排程 */}
              <div className="p-4 bg-[#FAF9F5] border-2 border-[#7F0019]/30 rounded-sm space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="font-bold text-[#7F0019]">⏰ 活動狀態與上下檔時間排程設定</span>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cForm.status === 'active'}
                        onChange={(e) =>
                          setCForm({ ...cForm, status: e.target.checked ? 'active' : 'paused' })
                        }
                        className="accent-[#7F0019]"
                      />
                      <span className="font-bold">啟用此活動（取消勾選即暫停隱藏）</span>
                    </label>
                  </div>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={cForm.scheduleEnabled}
                    onChange={(e) => setCForm({ ...cForm, scheduleEnabled: e.target.checked })}
                    className="accent-[#7F0019]"
                  />
                  <span>啟用指定時間排程（僅在開始時間與結束時間之間自動於首頁上架）</span>
                </label>

                {cForm.scheduleEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-medium mb-1">預計上檔開始時間</label>
                      <input
                        type="datetime-local"
                        value={cForm.startAt}
                        onChange={(e) => setCForm({ ...cForm, startAt: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#E6E3DC] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">預計下檔結束時間</label>
                      <input
                        type="datetime-local"
                        value={cForm.endAt}
                        onChange={(e) => setCForm({ ...cForm, endAt: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#E6E3DC] bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E6E3DC]">
                <button
                  type="button"
                  onClick={() => setCampaignModalOpen(false)}
                  className="px-4 py-2 border border-[#E6E3DC]"
                >
                  取消
                </button>
                <button type="submit" className="px-5 py-2 bg-[#7F0019] text-white font-bold">
                  儲存活動並同步前台
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ★ 彈窗 B：新增 / 編輯百貨樓層專館 (Floor Modal) */}
      {floorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-2xl rounded-sm p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[#E6E3DC] mb-4">
              <h3 className="text-base font-bold text-[#222222]">
                {editingFloorIdx !== null ? '編輯百貨樓層主題館' : '新增百貨樓層主題館'}
              </h3>
              <button
                type="button"
                onClick={() => setFloorModalOpen(false)}
                className="text-[#666666] hover:text-[#222222]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFloorModal} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold mb-1">樓層番號 *</label>
                  <input
                    type="text"
                    required
                    value={fForm.floorNum}
                    onChange={(e) => setFForm({ ...fForm, floorNum: e.target.value })}
                    placeholder="例：1F / 4F"
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1">樓層館別名稱 *</label>
                  <input
                    type="text"
                    required
                    value={fForm.title}
                    onChange={(e) => setFForm({ ...fForm, title: e.target.value })}
                    placeholder="例：精品服飾・生活良物館"
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">樓層主題色</label>
                  <select
                    value={fForm.accentColor}
                    onChange={(e) => setFForm({ ...fForm, accentColor: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  >
                    <option value="#7F0019">無印深紅 (#7F0019)</option>
                    <option value="#222222">炭灰黑 (#222222)</option>
                    <option value="#4A463F">原木深褐 (#4A463F)</option>
                    <option value="#2C4A3E">沉靜森綠 (#2C4A3E)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">樓層副標題說明</label>
                <input
                  type="text"
                  value={fForm.subtitle}
                  onChange={(e) => setFForm({ ...fForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>

              <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-3">
                <SingleImageUploader
                  aspectHint="顯示於樓層中欄之主題海報"
                  imageUrl={fForm.bannerImg}
                  label="樓層中欄主題視覺圖（支援上傳圖片或貼上外部圖片連結） *"
                  onChange={(url) => setFForm({ ...fForm, bannerImg: url })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-bold mb-1">中欄視覺卡標題 *</label>
                    <input
                      type="text"
                      required
                      value={fForm.bannerTitle}
                      onChange={(e) => setFForm({ ...fForm, bannerTitle: e.target.value })}
                      className="w-full px-3 py-1.5 border border-[#E6E3DC] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">中欄視覺卡短述 *</label>
                    <input
                      type="text"
                      required
                      value={fForm.bannerDesc}
                      onChange={(e) => setFForm({ ...fForm, bannerDesc: e.target.value })}
                      className="w-full px-3 py-1.5 border border-[#E6E3DC] bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    左側「大家都在找」熱門詞（以逗號分隔）
                  </label>
                  <input
                    type="text"
                    value={fForm.hotTagsStr}
                    onChange={(e) => setFForm({ ...fForm, hotTagsStr: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    底部「本層快篩」膠囊詞（以逗號分隔）
                  </label>
                  <input
                    type="text"
                    value={fForm.bottomPillsStr}
                    onChange={(e) => setFForm({ ...fForm, bottomPillsStr: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5">
                  勾選本樓層自動展示之商品分類（可複選）：
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_CATEGORIES.map((cat) => {
                    const checked = fForm.matchCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (checked) {
                            if (fForm.matchCategories.length <= 1) return;
                            setFForm({
                              ...fForm,
                              matchCategories: fForm.matchCategories.filter((c) => c !== cat),
                            });
                          } else {
                            setFForm({
                              ...fForm,
                              matchCategories: [...fForm.matchCategories, cat],
                            });
                          }
                        }}
                        className={`px-2.5 py-1 border rounded-sm ${
                          checked
                            ? 'border-[#7F0019] bg-[#FAF9F5] text-[#7F0019] font-bold'
                            : 'border-[#E6E3DC] bg-white text-[#666666]'
                        }`}
                      >
                        {checked ? '☑ ' : '☐ '}
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fForm.status === 'active'}
                      onChange={(e) =>
                        setFForm({ ...fForm, status: e.target.checked ? 'active' : 'paused' })
                      }
                      className="accent-[#7F0019]"
                    />
                    <span className="font-bold">啟用顯示此樓層</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fForm.scheduleEnabled}
                      onChange={(e) => setFForm({ ...fForm, scheduleEnabled: e.target.checked })}
                      className="accent-[#7F0019]"
                    />
                    <span>設定樓層檔期時間排程</span>
                  </label>
                </div>
                {fForm.scheduleEnabled && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <input
                      type="datetime-local"
                      value={fForm.startAt}
                      onChange={(e) => setFForm({ ...fForm, startAt: e.target.value })}
                      className="px-2.5 py-1.5 border border-[#E6E3DC] bg-white"
                    />
                    <input
                      type="datetime-local"
                      value={fForm.endAt}
                      onChange={(e) => setFForm({ ...fForm, endAt: e.target.value })}
                      className="px-2.5 py-1.5 border border-[#E6E3DC] bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E6E3DC]">
                <button
                  type="button"
                  onClick={() => setFloorModalOpen(false)}
                  className="px-4 py-2 border border-[#E6E3DC]"
                >
                  取消
                </button>
                <button type="submit" className="px-5 py-2 bg-[#7F0019] text-white font-bold">
                  儲存樓層並同步前台
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* 彈窗 3：新增 / 編輯商品與規格（升級版獨立元件：含四欄明確標頭與含未稅試算） */}
      <AdminProductModal
        editingProduct={editingProduct}
        onClose={() => setProductModalOpen(false)}
        onSaved={(msg) => {
          showToast(msg);
          fetchAllData();
        }}
        open={productModalOpen}
        stores={stores}
      />
    </div>
  );
}
