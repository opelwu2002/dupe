'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  decodeDescriptionAndMeta,
  calculateTaxBreakdown,
  encodeDescriptionWithMeta,
  FULFILLMENT_TYPE_OPTIONS,
  PRODUCT_CATEGORIES,
} from '@/lib/productMeta';
import {
  PortalConfig,
  DEFAULT_PORTAL_CONFIG,
  evaluateScheduleState,
  QuickFilterMode,
} from '@/lib/portalConfig';

export interface PortalProductItem {
  id: string;
  store_id?: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  status?: string;
  created_at?: string;
  isDemo?: boolean;
  product_variants?: Array<{ name: string; price: number; stock: number }>;
  stores: {
    id?: string;
    name: string;
    meetup_location: string;
    description?: string;
    contact_line?: string;
    custom_shipping_note?: string;
  } | null;
}

export interface PortalStoreItem {
  id: string;
  name: string;
  description: string;
  contact_line: string;
  contact_phone: string;
  meetup_location: string;
  custom_shipping_note: string;
}

interface HomePortalClientProps {
  initialProducts: PortalProductItem[];
  initialStores: PortalStoreItem[];
  initialPortalConfig?: PortalConfig;
}

const SHOWCASE_DEMO_PRODUCTS: PortalProductItem[] = [
  {
    id: 'demo-proxy-jjk',
    title: '【日本原宿展場代購】咒術迴戰 五條悟／夏油傑 高透壓克力立牌（沒買到全額退費）',
    price: 680,
    images: ['https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80'],
    isDemo: true,
    description: encodeDescriptionWithMeta('日本東京展場連線代購，現場若完售沒買到於 24 小時內全額退費取消。', {
      category: '日貨／動漫周邊／展覽代購',
      condition: '全新代購／預購品 (Pre-order / Proxy)',
      brand: '日本東京展場限定',
      hasMultiSpec: true,
      stock: 10,
      deliveryMethods: ['店到店（7-11 / 全家）', '面交當面點交'],
      taxMode: 'tax_free',
      invoiceCapability: 'none',
      invoiceTypes: [],
      fulfillmentType: 'proxy',
      orderCutoffDate: '11/25 23:59',
      estimatedArrival: '預計 12 月上旬抵台',
      paymentTerm: 'pay_after_secured',
      depositPercent: 30,
      shortagePolicy: '免預付登記制：採購當下若現場完售沒買到，賣家直接通知取消該筆登記，買賣雙方互不負賠償責任',
      buyerCancelRule: '收單前可免費取消',
      purchaseLimit: '每人每款限購 2 件',
      negotiable: '不二價（一口價）',
      shippingFeeRule: '買方負擔運費（依實支計）',
      leadTime: '日本連線／海外代購（採購後約 7～14 個工作天抵台寄出）',
      warranty: '全新專櫃／日本官方正品代購保證（未買到全額退費）',
    }),
    stores: {
      name: '秋葉原連線代購社',
      meetup_location: '台北捷運忠孝復興站',
      custom_shipping_note: '7-11 店到店或台北面交',
    },
  },
  {
    id: 'demo-bag-muji',
    title: '【日本專櫃現貨】極簡有機棉防潑水肩背托特包・通勤筆電收納袋',
    price: 1280,
    images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80'],
    isDemo: true,
    description: encodeDescriptionWithMeta('厚磅有機帆布製作，內附 14 吋筆電緩衝夾層。', {
      category: '精品／服飾鞋包',
      condition: '全新未拆 (New)',
      brand: 'MUJI Labo 選品',
      hasMultiSpec: false,
      stock: 5,
      deliveryMethods: ['店到店（7-11 / 全家）', '面交當面點交'],
      taxMode: 'tax_included',
      invoiceCapability: 'invoice',
      invoiceTypes: ['二聯式發票（對個人／自然人買家）', '三聯式發票（對公司行號／附統一編號與抬頭）'],
      fulfillmentType: 'in_stock',
      orderCutoffDate: '',
      estimatedArrival: '',
      paymentTerm: 'full_upfront',
      depositPercent: 30,
      shortagePolicy: '',
      buyerCancelRule: '',
      purchaseLimit: '不限購',
      negotiable: '多件合購可議價',
      shippingFeeRule: '賣方負擔（本商品免運費）',
      leadTime: '現貨（24～48小時內寄出）',
      warranty: '全新專櫃／官方正品保證',
    }),
    stores: {
      name: '原質日常工作室',
      meetup_location: '台北市松山區捷運松山站',
      custom_shipping_note: '全館免運店到店',
    },
  },
  {
    id: 'demo-3c-umpc',
    title: '【企業可報帳・附三聯發票】日本製輕薄行動商務筆電 / 行動工作站（近全新盒裝完整）',
    price: 18500,
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80'],
    isDemo: true,
    description: encodeDescriptionWithMeta('公司汰換備機，外觀 95 成新，可開立三聯式統一發票供企業報帳扣抵。', {
      category: '3C數位／筆電家電',
      condition: '近全新・僅拆檢 (Like New)',
      brand: '日本商務機種',
      hasMultiSpec: false,
      stock: 2,
      deliveryMethods: ['郵寄 / 宅配寄送', '面交當面點交'],
      taxMode: 'tax_included',
      invoiceCapability: 'invoice',
      invoiceTypes: ['二聯式發票（對個人／自然人買家）', '三聯式發票（對公司行號／附統一編號與抬頭）'],
      fulfillmentType: 'in_stock',
      orderCutoffDate: '',
      estimatedArrival: '',
      paymentTerm: 'cod_or_meetup',
      depositPercent: 30,
      shortagePolicy: '',
      buyerCancelRule: '',
      purchaseLimit: '不限購',
      negotiable: '誠可小議（歡迎私訊討論）',
      shippingFeeRule: '面交免運／寄送由買方自理',
      leadTime: '現貨（24～48小時內寄出）',
      warranty: '賣家個人保固 7 天（非人為機能故障可退）',
    }),
    stores: {
      name: '松北數位整備室',
      meetup_location: '台北市中山區南京復興站',
      custom_shipping_note: '建議高單價3C當面點交測試',
    },
  },
  {
    id: 'demo-stone-hualien',
    title: '【花蓮立霧溪天然原石】收藏級台灣白玉髓／豐田玉雅石擺件（附實木底座）',
    price: 4200,
    images: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80'],
    isDemo: true,
    description: encodeDescriptionWithMeta('天然無酸洗原石，溫潤透光，適合書房案頭擺設。', {
      category: '古董／原石雅石收藏',
      condition: '歲月老件／收藏品 (Vintage)',
      brand: '花蓮天然溪石',
      hasMultiSpec: false,
      stock: 1,
      deliveryMethods: ['郵寄 / 宅配寄送', '面交當面點交'],
      taxMode: 'tax_free',
      invoiceCapability: 'personal_declaration',
      invoiceTypes: [],
      fulfillmentType: 'in_stock',
      orderCutoffDate: '',
      estimatedArrival: '',
      paymentTerm: 'cod_or_meetup',
      depositPercent: 30,
      shortagePolicy: '',
      buyerCancelRule: '',
      purchaseLimit: '限量孤品／最後現貨（售完即止）',
      negotiable: '誠可小議（歡迎私訊討論）',
      shippingFeeRule: '賣方負擔（本商品免運費）',
      leadTime: '現貨（24～48小時內寄出）',
      warranty: '二手／實品現況點交（售出無退換）',
    }),
    stores: {
      name: '東海岸山海石藝',
      meetup_location: '台北／花蓮皆可約定面交',
      custom_shipping_note: '氣泡布厚實防撞宅配',
    },
  },
  {
    id: 'demo-home-ceramic',
    title: '【日本美濃燒預購】溫潤手作白瓷圓口茶杯與胡桃木托盤組（兩件組）',
    price: 880,
    images: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80'],
    isDemo: true,
    description: encodeDescriptionWithMeta('日本窯場直送預購，若遇窯場缺貨將全額無息退還訂金。', {
      category: '居家生活／無印良物',
      condition: '全新代購／預購品 (Pre-order / Proxy)',
      brand: '日本岐阜美濃燒',
      hasMultiSpec: false,
      stock: 8,
      deliveryMethods: ['店到店（7-11 / 全家）', '郵寄 / 宅配寄送'],
      taxMode: 'tax_included',
      invoiceCapability: 'receipt',
      invoiceTypes: [],
      fulfillmentType: 'preorder',
      orderCutoffDate: '11/30',
      estimatedArrival: '預計 12 月中旬到貨',
      paymentTerm: 'deposit_balance',
      depositPercent: 30,
      shortagePolicy: '沒買到／缺貨／官方砍單：賣家主動通知取消訂單，並於 24 小時內 100% 全額無息退還已付款項（不扣跨行手續費）',
      buyerCancelRule: '收單前可免費取消',
      purchaseLimit: '不限購',
      negotiable: '不二價（一口價）',
      shippingFeeRule: '買方負擔運費（依實支計）',
      leadTime: '預購較長備貨（依官方發售／預計到貨月份依序寄出）',
      warranty: '全新專櫃／官方正品保證',
    }),
    stores: {
      name: '山林器物舍',
      meetup_location: '台北市大安區捷運忠孝新生站',
      custom_shipping_note: '易碎品雙層防撞包裝',
    },
  },
];

const CATEGORY_SUBTAGS: Record<string, string[]> = {
  '精品／服飾鞋包': ['托特包', '真皮肩背包', '日本女裝'],
  '日貨／動漫周邊／展覽代購': ['咒術迴戰', '趴娃/立牌', '日本連線'],
  '3C數位／筆電家電': ['商務筆電', 'UMPC', '機械鍵盤'],
  '居家生活／無印良物': ['亞麻收納', '美濃燒陶器', '檜木桌燈'],
  '古董／原石雅石收藏': ['白玉髓', '台灣豐田玉', '立霧溪原石'],
  '書籍／文具小物': ['同人誌', '日文畫集', '鋼筆墨水'],
  '美妝保養／個人清潔': ['日本藥妝', '專櫃香氛', '旅用組'],
  '其他精選好物': ['限量孤品', '企業報帳品', '雙北面交'],
};

export default function HomePortalClient({
  initialProducts,
  initialStores,
  initialPortalConfig,
}: HomePortalClientProps) {
  const router = useRouter();
  const [portalConfig, setPortalConfig] = useState<PortalConfig>(
    initialPortalConfig || DEFAULT_PORTAL_CONFIG
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部商品');
  const [quickFilter, setQuickFilter] = useState<QuickFilterMode>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [includeDemoShowcase, setIncludeDemoShowcase] = useState<boolean>(
    initialPortalConfig?.defaultShowDemoProducts ?? true
  );
  const [activeSlide, setActiveSlide] = useState(0);

  const [userInfo, setUserInfo] = useState<{
    name: string;
    email: string;
    idCard: string;
    hasStore: boolean;
    storeName: string;
  } | null>(null);

  // 依據後台設定與當前台灣時間，過濾出正在生效中的輪播活動與樓層
  const activeHeroSlides = useMemo(() => {
    const valid = (portalConfig.heroCampaigns || []).filter(
      (c) => evaluateScheduleState(c).isVisibleOnFrontend
    );
    return valid.length > 0 ? valid : DEFAULT_PORTAL_CONFIG.heroCampaigns.slice(0, 1);
  }, [portalConfig.heroCampaigns]);

  const activeFloors = useMemo(() => {
    return (portalConfig.floors || []).filter(
      (fl) => evaluateScheduleState(fl).isVisibleOnFrontend
    );
  }, [portalConfig.floors]);

  const featuredStore = useMemo(() => {
    if (portalConfig.featuredStoreId) {
      const found = initialStores.find((s) => s.id === portalConfig.featuredStoreId);
      if (found) return found;
    }
    return initialStores[0] || null;
  }, [portalConfig.featuredStoreId, initialStores]);

  useEffect(() => {
    // 確保前端載入時同步最新 CMS 設定
    fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_portal_config' }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.portalConfig) {
          setPortalConfig(res.portalConfig);
          setIncludeDemoShowcase(res.portalConfig.defaultShowDemoProducts ?? true);
        }
      })
      .catch(() => {});

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = user.user_metadata || {};
        const myStore = initialStores.find((s) => s.name && user.id);
        setUserInfo({
          name: meta.full_name || user.email?.split('@')[0] || '實名會員',
          email: user.email || '',
          idCard: meta.id_card_number
            ? `${meta.id_card_number.slice(0, 3)}*****${meta.id_card_number.slice(-2)}`
            : '已實名認證',
          hasStore: Boolean(myStore),
          storeName: myStore?.name || '',
        });
      }
    });
  }, [initialStores]);

  useEffect(() => {
    if (activeSlide >= activeHeroSlides.length) {
      setActiveSlide(0);
    }
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % activeHeroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeHeroSlides.length, activeSlide]);

  const allMergedProducts = useMemo(() => {
    const realItems = initialProducts.map((p) => ({ ...p, isDemo: false }));
    if (!includeDemoShowcase) return realItems;
    return [...realItems, ...SHOWCASE_DEMO_PRODUCTS];
  }, [initialProducts, includeDemoShowcase]);

  const filteredProducts = useMemo(() => {
    return allMergedProducts
      .filter((item) => {
        const { cleanDescription, meta } = decodeDescriptionAndMeta(
          item.description,
          item.product_variants
        );
        if (selectedCategory !== '全部商品' && meta.category !== selectedCategory) {
          return false;
        }
        if (quickFilter === 'in_stock' && meta.fulfillmentType !== 'in_stock') {
          return false;
        }
        if (quickFilter === 'preorder_proxy' && meta.fulfillmentType === 'in_stock') {
          return false;
        }
        if (
          quickFilter === 'invoice_only' &&
          meta.invoiceCapability !== 'invoice' &&
          meta.invoiceCapability !== 'receipt'
        ) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            item.title.toLowerCase().includes(q) ||
            cleanDescription.toLowerCase().includes(q) ||
            (item.stores?.name || '').toLowerCase().includes(q) ||
            meta.category.toLowerCase().includes(q) ||
            (meta.brand || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (!a.isDemo && b.isDemo) return -1;
        if (a.isDemo && !b.isDemo) return 1;
        return 0;
      });
  }, [allMergedProducts, selectedCategory, quickFilter, searchQuery, sortBy]);

  const stats = useMemo(() => {
    let invoiceCount = 0;
    let preorderCount = 0;
    allMergedProducts.forEach((p) => {
      const { meta } = decodeDescriptionAndMeta(p.description, p.product_variants);
      if (meta.invoiceCapability === 'invoice' || meta.invoiceCapability === 'receipt') {
        invoiceCount++;
      }
      if (meta.fulfillmentType !== 'in_stock') {
        preorderCount++;
      }
    });
    return {
      totalReal: initialProducts.length,
      totalDisplay: allMergedProducts.length,
      storeCount: Math.max(1, initialStores.length),
      invoiceCount,
      preorderCount,
    };
  }, [allMergedProducts, initialProducts.length, initialStores.length]);

  const scrollToExplorer = (category?: string, filter?: QuickFilterMode, keyword?: string) => {
    if (category !== undefined) setSelectedCategory(category);
    if (filter !== undefined) setQuickFilter(filter);
    if (keyword !== undefined) setSearchQuery(keyword);
    const el = document.getElementById('dupe-product-explorer');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const renderProductCard = (item: PortalProductItem) => {
    const { meta } = decodeDescriptionAndMeta(item.description, item.product_variants);
    const taxInfo = calculateTaxBreakdown(item.price, meta.taxMode);
    const fulfillObj = FULFILLMENT_TYPE_OPTIONS.find((f) => f.value === meta.fulfillmentType);
    const isPreorderOrProxy = meta.fulfillmentType !== 'in_stock';
    const cardHref = item.isDemo ? '/dashboard/products/new' : `/products/${item.id}`;

    return (
      <Link
        key={item.id}
        href={cardHref}
        className="group bg-white border border-[#E6E3DC] rounded-sm overflow-hidden hover:border-[#7F0019] transition-all flex flex-col justify-between"
      >
        <div>
          <div className="relative aspect-square bg-[#FAF9F5] overflow-hidden flex items-center justify-center border-b border-[#E6E3DC]">
            {item.images && item.images[0] ? (
              <img
                src={item.images[0]}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            ) : (
              <span className="text-xs text-[#666666]">無商品圖片</span>
            )}

            <div className="absolute top-2 left-2 flex flex-wrap gap-1 pr-2">
              {!item.isDemo ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#7F0019] text-white">
                  實名賣家上架
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] bg-black/60 text-white">
                  策展範例
                </span>
              )}
              <span
                className={`px-2 py-0.5 text-[10px] font-bold ${
                  isPreorderOrProxy ? 'bg-amber-800 text-white' : 'bg-[#222222] text-white'
                }`}
              >
                {fulfillObj?.badge || '現貨'}
              </span>
              {meta.invoiceCapability === 'invoice' && (
                <span className="px-2 py-0.5 text-[10px] bg-white/95 border border-[#7F0019] text-[#7F0019] font-bold">
                  可開發票
                </span>
              )}
              {meta.invoiceCapability === 'receipt' && (
                <span className="px-2 py-0.5 text-[10px] bg-white/95 border border-[#222222] text-[#222222] font-medium">
                  可開收據
                </span>
              )}
            </div>

            {isPreorderOrProxy && (
              <div className="absolute bottom-0 inset-x-0 bg-[#7F0019]/90 text-white text-[10px] px-2.5 py-1 flex justify-between items-center">
                <span>⏳ {meta.estimatedArrival || '較長備貨'}</span>
                <span>✓ 沒買到100%退費</span>
              </div>
            )}
          </div>

          <div className="p-3.5 space-y-1.5">
            <div className="text-[11px] text-[#666666] flex justify-between items-center">
              <span className="font-medium text-[#222222] truncate max-w-[55%]">
                {item.stores?.name || '實名認證賣家'}
              </span>
              <span className="truncate max-w-[42%]">
                {item.stores?.meetup_location || '店到店/面交'}
              </span>
            </div>

            <h3 className="text-xs sm:text-sm font-medium text-[#222222] line-clamp-2 leading-snug group-hover:text-[#7F0019] transition-colors min-h-[2.5rem]">
              {item.title}
            </h3>
          </div>
        </div>

        <div className="px-3.5 pb-3.5 pt-2 border-t border-[#E6E3DC]/70 space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm sm:text-base font-bold text-[#7F0019]">
              含稅 NT$ {taxInfo.taxIncludedPrice.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#666666]">
              未稅 ${taxInfo.taxExcludedPrice.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#666666]">
            <span>{meta.condition.split(' ')[0]}</span>
            <span>{meta.shippingFeeRule.includes('免運') ? '★ 免運費' : '運費依約定'}</span>
          </div>
        </div>
      </Link>
    );
  };

  const currentSlide = activeHeroSlides[activeSlide] || activeHeroSlides[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">
      {/* 1. 頂部搜尋列 ＋ 熱門關鍵字 ＋ 防詐騙提醒條 */}
      <section className="bg-white border border-[#E6E3DC] rounded-sm p-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-8 space-y-2">
            <div className="flex">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 text-xs bg-[#FAF9F5] border border-r-0 border-[#E6E3DC] text-[#222222] font-medium focus:outline-none rounded-l-sm"
              >
                <option value="全部商品">全站分類</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.split('／')[0]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="輸入商品關鍵字、品牌、賣場名稱（例：手提購物袋、日貨小判、五條悟、三聯發票）..."
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm border border-[#E6E3DC] bg-white focus:outline-none focus:border-[#7F0019]"
              />
              <button
                type="button"
                onClick={() => scrollToExplorer()}
                className="px-6 py-2.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-bold tracking-wider rounded-r-sm transition-colors"
              >
                搜尋看板
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#666666]">
              <span className="font-bold text-[#222222]">熱門搜尋：</span>
              {(portalConfig.hotKeywords || []).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    if (tag.filterMode) {
                      scrollToExplorer('全部商品', tag.filterMode, '');
                    } else if (tag.keyword) {
                      scrollToExplorer('全部商品', 'all', tag.keyword);
                    } else {
                      scrollToExplorer('全部商品', 'all', tag.label);
                    }
                  }}
                  className="hover:text-[#7F0019] hover:underline"
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm flex items-start space-x-2.5">
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#7F0019] text-white rounded-sm flex-shrink-0 mt-0.5">
                防詐提醒
              </span>
              <div className="text-[11px] text-[#222222] leading-relaxed">
                <div className="font-bold">{portalConfig.antiFraudTitle}</div>
                <p className="text-[#666666] text-[10px] mt-0.5">{portalConfig.antiFraudText}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 首屏三欄式黃金佈局（中間輪播與活動排程完全由後台 CMS 控制） */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-3 bg-white border border-[#E6E3DC] rounded-sm flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-4 py-2.5 bg-[#7F0019] text-white text-xs font-bold tracking-wider flex items-center justify-between">
              <span>☰ 全站商品分類</span>
              <span className="text-[10px] font-normal opacity-90">8 大館別</span>
            </div>
            <ul className="divide-y divide-[#E6E3DC] text-xs">
              {PRODUCT_CATEGORIES.map((cat) => {
                const subTags = CATEGORY_SUBTAGS[cat] || [];
                const isSelected = selectedCategory === cat;
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => scrollToExplorer(cat, 'all')}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-[#FAF9F5] transition-colors flex items-center justify-between ${
                        isSelected ? 'bg-[#FAF9F5] font-bold text-[#7F0019]' : 'text-[#222222]'
                      }`}
                    >
                      <span className="font-medium">{cat.split('／')[0]}</span>
                      <span className="text-[11px] text-[#666666] truncate ml-2">
                        {subTags.slice(0, 2).join('・')}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="p-2.5 bg-[#FAF9F5] border-t border-[#E6E3DC] text-center">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('全部商品');
                setQuickFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] text-[#7F0019] font-medium hover:underline"
            >
              顯示全站所有品項 ({stats.totalDisplay}) →
            </button>
          </div>
        </div>

        {/* 中欄：後台動態主視覺輪播 */}
        <div className="lg:col-span-6 bg-white border border-[#E6E3DC] rounded-sm flex flex-col justify-between overflow-hidden">
          <div className="relative flex-1 min-h-[260px] sm:min-h-[310px] bg-[#222222] overflow-hidden flex items-end">
            {currentSlide && (
              <>
                <img
                  src={currentSlide.image}
                  alt={currentSlide.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-55 transition-all duration-500"
                />
                <div className="relative z-10 p-6 sm:p-8 text-white space-y-2.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent w-full">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-widest bg-[#7F0019] text-white rounded-sm">
                      {currentSlide.badge}
                    </span>
                    {currentSlide.scheduleEnabled && currentSlide.endAt && (
                      <span className="text-[10px] px-2 py-0.5 bg-black/60 border border-white/30 text-amber-200 rounded-sm">
                        活動檔期至 {currentSlide.endAt.replace('T', ' ')}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold leading-snug">
                    {currentSlide.title}
                  </h2>
                  <p className="text-xs text-gray-200 leading-relaxed max-w-lg">
                    {currentSlide.subtitle}
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentSlide.customUrl && currentSlide.customUrl.trim()) {
                          router.push(currentSlide.customUrl.trim());
                        } else {
                          scrollToExplorer('全部商品', currentSlide.filterMode);
                        }
                      }}
                      className="px-4 py-2 bg-white text-[#222222] hover:bg-[#FAF9F5] text-xs font-bold rounded-sm transition-colors"
                    >
                      {currentSlide.ctaText || '立即查看'} →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div
            className="grid divide-x divide-[#E6E3DC] border-t border-[#E6E3DC] bg-[#FAF9F5]"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, activeHeroSlides.length)}, minmax(0, 1fr))`,
            }}
          >
            {activeHeroSlides.map((slide, idx) => {
              const active = activeSlide === idx;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onMouseEnter={() => setActiveSlide(idx)}
                  onClick={() => setActiveSlide(idx)}
                  className={`py-2.5 px-1.5 text-center text-[11px] transition-colors truncate ${
                    active ? 'bg-[#7F0019] text-white font-bold' : 'text-[#222222] hover:bg-white'
                  }`}
                >
                  {slide.tabTitle}
                </button>
              );
            })}
          </div>
        </div>

        {/* 右欄：實名會員狀態與賣家快捷中心 */}
        <div className="lg:col-span-3 bg-white border border-[#E6E3DC] rounded-sm p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 pb-3 border-b border-[#E6E3DC]">
              <div className="w-10 h-10 rounded-sm bg-[#7F0019] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {userInfo ? userInfo.name.slice(0, 1) : 'DU'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#222222] truncate">
                  {userInfo ? `您好，${userInfo.name}` : '歡迎光臨 DUPE 嘟屁'}
                </div>
                <div className="text-[11px] text-[#7F0019] font-medium">
                  {userInfo ? `✓ 實名認證 (${userInfo.idCard})` : '零抽成・實名認證拍賣'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center bg-[#FAF9F5] p-2.5 border border-[#E6E3DC] rounded-sm">
              <div>
                <div className="text-[10px] text-[#666666]">全站展售品項</div>
                <div className="text-sm font-bold text-[#222222]">{stats.totalDisplay} 件</div>
              </div>
              <div>
                <div className="text-[10px] text-[#666666]">可開發票/收據</div>
                <div className="text-sm font-bold text-[#7F0019]">{stats.invoiceCount} 件</div>
              </div>
              <div>
                <div className="text-[10px] text-[#666666]">預購/代購保障</div>
                <div className="text-sm font-bold text-[#222222]">{stats.preorderCount} 件</div>
              </div>
              <div>
                <div className="text-[10px] text-[#666666]">平台成交抽成</div>
                <div className="text-sm font-bold text-emerald-800">0.0%</div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Link
                href="/dashboard/products/new"
                className="block w-full py-2 bg-[#7F0019] hover:bg-[#660014] text-white text-center text-xs font-bold rounded-sm transition-colors"
              >
                + 免費刊登商品（支援5圖上傳）
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/store"
                  className="py-1.5 border border-[#E6E3DC] bg-[#FAF9F5] hover:bg-white text-[#222222] text-center text-xs font-medium rounded-sm"
                >
                  賣家管理中心
                </Link>
                <Link
                  href="/admin"
                  className="py-1.5 border border-[#E6E3DC] bg-[#FAF9F5] hover:bg-white text-[#222222] text-center text-xs font-medium rounded-sm"
                >
                  首頁與營運後台
                </Link>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm text-[11px] space-y-1">
            <div className="font-bold text-[#222222]">★ 嘟屁三大交易準則</div>
            <div className="text-[#666666]">1. 含稅／未稅價格與發票主動揭露</div>
            <div className="text-[#666666]">2. 預購／代購沒買到無條件退費取消</div>
            <div className="text-[#666666]">3. 實名制防幽靈，支援警政調閱</div>
          </div>
        </div>
      </section>

      {/* 3. 四大安心機制快速篩選橫幅 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            badge: 'DIRECT P2P',
            title: '0% 平台零抽成看板',
            desc: '無官方收銀台抽成，買賣雙方直接LINE/電話對接',
            filter: 'all' as const,
          },
          {
            badge: 'REFUND GUARANTEE',
            title: '預購／代購沒買到退費',
            desc: '現場缺貨或官方砍單，保證取消訂單並全額退費',
            filter: 'preorder_proxy' as const,
          },
          {
            badge: 'TAX & INVOICE',
            title: '二聯／三聯發票專區',
            desc: '含稅未稅雙標示，支援個人二聯與企業三聯統編',
            filter: 'invoice_only' as const,
          },
          {
            badge: 'READY TO SHIP',
            title: '在台現貨・當面點交',
            desc: '24～48小時快速出貨或約定捷運站當面驗貨',
            filter: 'in_stock' as const,
          },
        ].map((card, i) => {
          const active = quickFilter === card.filter && card.filter !== 'all';
          return (
            <button
              key={i}
              type="button"
              onClick={() => scrollToExplorer('全部商品', card.filter)}
              className={`p-4 text-left border rounded-sm transition-all ${
                active
                  ? 'bg-[#FAF9F5] border-[#7F0019] ring-1 ring-[#7F0019]'
                  : 'bg-white border-[#E6E3DC] hover:border-[#7F0019]'
              }`}
            >
              <div className="text-[10px] font-bold tracking-wider text-[#7F0019]">
                {card.badge}
              </div>
              <div className="text-sm font-bold text-[#222222] mt-0.5">{card.title}</div>
              <div className="text-[11px] text-[#666666] mt-1">{card.desc}</div>
            </button>
          );
        })}
      </section>

      {/* 4. 注目實名店家推薦 */}
      <section className="bg-white border border-[#E6E3DC] rounded-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E3DC] pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-5 bg-[#7F0019] inline-block" />
            <h2 className="text-base font-bold text-[#222222]">注目實名認證賣場</h2>
            <span className="text-xs text-[#666666]">
              （已完成實名身分證號與聯絡地址登錄之精選店家）
            </span>
          </div>
          <Link href="/dashboard/store" className="text-xs text-[#7F0019] font-medium hover:underline">
            進駐開立我的零抽成賣場 →
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 p-5 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#7F0019] text-white rounded-sm">
                實名認證注目店鋪
              </span>
              <span className="text-[11px] text-[#666666]">0% 抽成直營</span>
            </div>
            <h3 className="text-lg font-bold text-[#222222]">
              {featuredStore?.name || '日貨小判・實名精選賣場'}
            </h3>
            <p className="text-xs text-[#666666] leading-relaxed">
              {featuredStore?.description ||
                '專營日本直送精品包袋、限定周邊與生活器物，全館透明標示含稅與未稅價，支援開立二聯／三聯式發票。'}
            </p>
            <div className="pt-2 border-t border-[#E6E3DC] space-y-1 text-[11px] text-[#222222]">
              <div>
                <span className="text-[#666666]">面交自取：</span>
                {featuredStore?.meetup_location || '台北市松山區小巨蛋3號出口'}
              </div>
              <div>
                <span className="text-[#666666]">交付方式：</span>
                {featuredStore?.custom_shipping_note || '宅配 或 便利商店店到店'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => scrollToExplorer('全部商品', 'all', featuredStore?.name || '')}
              className="w-full py-2 bg-[#222222] hover:bg-[#7F0019] text-white text-xs font-medium rounded-sm transition-colors"
            >
              查看此賣場所有商品
            </button>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {allMergedProducts.slice(0, 3).map((item) => renderProductCard(item))}
          </div>
        </div>
      </section>

      {/* 5. 百貨樓層式主題導覽（完全由後台樓層管理與排程控制） */}
      <div className="space-y-8">
        {activeFloors.map((fl) => {
          const floorItems = allMergedProducts
            .filter((p) => {
              const { meta } = decodeDescriptionAndMeta(p.description, p.product_variants);
              return (fl.matchCategories || []).includes(meta.category);
            })
            .slice(0, 3);

          const displayFloorItems =
            floorItems.length > 0 ? floorItems : allMergedProducts.slice(0, 3);

          return (
            <section
              key={fl.id}
              className="bg-white border border-[#E6E3DC] rounded-sm overflow-hidden shadow-sm"
            >
              <div className="px-5 py-3.5 border-b border-[#E6E3DC] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FAF9F5]/60">
                <div className="flex items-baseline space-x-2.5">
                  <span
                    className="px-2 py-0.5 text-xs font-bold text-white rounded-sm"
                    style={{ backgroundColor: fl.accentColor || '#7F0019' }}
                  >
                    {fl.floorNum}
                  </span>
                  <h2 className="text-base font-bold text-[#222222]">{fl.title}</h2>
                  <span className="text-xs text-[#666666] hidden md:inline">{fl.subtitle}</span>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToExplorer(fl.matchCategories?.[0] || '全部商品', 'all')}
                  className="text-xs text-[#7F0019] font-medium hover:underline"
                >
                  看更多本層商品 →
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div
                  className="lg:col-span-2 p-4 text-white flex flex-col justify-between"
                  style={{ backgroundColor: fl.accentColor || '#7F0019' }}
                >
                  <div>
                    <div className="text-xs font-bold tracking-wider pb-2 mb-3 border-b border-white/20">
                      大家都在找
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                      {(fl.hotTags || []).map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => scrollToExplorer('全部商品', 'all', t)}
                          className="text-left text-xs text-white/90 hover:text-white hover:underline truncate"
                        >
                          ・{t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-white/20 text-[11px] text-white/80">
                    DUPE 嚴選樓層導覽
                  </div>
                </div>

                <div className="lg:col-span-3 relative min-h-[220px] bg-[#222222] flex items-end overflow-hidden border-b lg:border-b-0 lg:border-r border-[#E6E3DC]">
                  <img
                    src={fl.bannerImg}
                    alt={fl.bannerTitle}
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                  <div className="relative z-10 p-5 text-white bg-gradient-to-t from-black/85 via-black/40 to-transparent w-full space-y-1.5">
                    <div className="text-[10px] font-bold tracking-widest uppercase text-amber-200">
                      {fl.floorNum} CURATED ZONE
                    </div>
                    <h3 className="text-base font-bold">{fl.bannerTitle}</h3>
                    <p className="text-[11px] text-gray-200 leading-relaxed">{fl.bannerDesc}</p>
                  </div>
                </div>

                <div className="lg:col-span-7 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FAF9F5]/30">
                  {displayFloorItems.map((item) => renderProductCard(item))}
                </div>
              </div>

              <div className="px-4 py-2.5 bg-[#FAF9F5] border-t border-[#E6E3DC] flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-[#666666] mr-1">本層快篩：</span>
                {(fl.bottomPills || []).map((pill, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToExplorer('全部商品', 'all', pill)}
                    className="px-3 py-1 bg-white border border-[#E6E3DC] hover:border-[#7F0019] hover:text-[#7F0019] text-xs text-[#222222] rounded-sm transition-colors"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* 6. 猜你喜歡・全站即時尋寶區 */}
      <section id="dupe-product-explorer" className="pt-4 space-y-5">
        <div className="bg-white border border-[#E6E3DC] rounded-sm p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6E3DC] pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-5 bg-[#7F0019] inline-block" />
                <h2 className="text-lg font-bold text-[#222222]">猜你喜歡・全站精選刊登看板</h2>
              </div>
              <p className="text-xs text-[#666666] mt-1">
                透明標示現貨／預購代購等待期、沒買到 100% 退費承諾與含稅／未稅發票資訊
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center space-x-1.5 text-xs text-[#666666] bg-[#FAF9F5] px-3 py-1.5 border border-[#E6E3DC] rounded-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDemoShowcase}
                  onChange={(e) => setIncludeDemoShowcase(e.target.checked)}
                  className="accent-[#7F0019]"
                />
                <span>併同顯示平台策展範例（豐富樓層視覺）</span>
              </label>
              <Link
                href="/dashboard/products/new"
                className="px-4 py-1.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-bold rounded-sm"
              >
                + 我要刊登商品
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: '全部品項' },
                { id: 'in_stock', label: '現貨供應' },
                { id: 'preorder_proxy', label: '預購／日本連線代購（沒買到退費）' },
                { id: 'invoice_only', label: '可開發票／收據（企業報帳友善）' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setQuickFilter(tab.id as QuickFilterMode)}
                  className={`px-3 py-1.5 border rounded-sm transition-colors ${
                    quickFilter === tab.id
                      ? 'bg-[#7F0019] border-[#7F0019] text-white font-bold'
                      : 'bg-[#FAF9F5] border-[#E6E3DC] text-[#222222] hover:bg-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              {selectedCategory !== '全部商品' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('全部商品')}
                  className="px-2.5 py-1 bg-[#FAF9F5] border border-[#7F0019] text-[#7F0019] rounded-sm"
                >
                  分類：{selectedCategory.split('／')[0]} ✕
                </button>
              )}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5] text-[#222222] rounded-sm"
              >
                <option value="newest">排序：實名最新上架優先</option>
                <option value="price_asc">排序：價格由低至高</option>
                <option value="price_desc">排序：價格由高至低</option>
              </select>
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-[#E6E3DC] rounded-sm p-12 text-center space-y-3">
            <p className="text-sm text-[#222222] font-medium">查無符合目前篩選條件之商品</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('全部商品');
                setQuickFilter('all');
                setSearchQuery('');
                setIncludeDemoShowcase(true);
              }}
              className="px-4 py-2 bg-[#7F0019] text-white text-xs font-medium rounded-sm"
            >
              重置所有篩選條件
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map((item) => renderProductCard(item))}
          </div>
        )}
      </section>
    </div>
  );
}
