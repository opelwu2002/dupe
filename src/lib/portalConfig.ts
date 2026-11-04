export type QuickFilterMode = 'all' | 'in_stock' | 'preorder_proxy' | 'invoice_only';

export interface HeroCampaignItem {
  id: string;
  tabTitle: string;           // 輪播底部頁籤短標題
  badge: string;              // 左上角膠囊標籤
  title: string;              // 活動主標題
  subtitle: string;           // 活動副標題說明
  image: string;              // 活動圖片 URL (上傳圖床網址或外部連結)
  ctaText: string;            // 按鈕文字
  filterMode: QuickFilterMode;// 點擊後篩選模式
  customUrl?: string;         // 選填：若填寫則點擊跳轉指定網址
  status: 'active' | 'paused';// 啟用或暫停
  scheduleEnabled: boolean;   // 是否啟用時間排程
  startAt: string;            // 排程開始時間 (ISO 或 datetime-local 字串)
  endAt: string;              // 排程結束時間
}

export interface FloorConfigItem {
  id: string;
  floorNum: string;           // 例：1F, 2F, 3F, 4F
  title: string;              // 樓層主標題
  subtitle: string;           // 樓層副標題
  accentColor: string;        // 樓層代表色 (#7F0019, #222222, #4A463F)
  hotTags: string[];          // 左側「大家都在找」關鍵字
  bannerTitle: string;        // 中欄視覺卡標題
  bannerDesc: string;         // 中欄視覺卡說明
  bannerImg: string;          // 中欄視覺卡圖片 (支援上傳或外部網址)
  bottomPills: string[];      // 底部快篩膠囊
  matchCategories: string[];  // 綁定顯示之商品分類
  status: 'active' | 'paused';// 啟用或暫停
  scheduleEnabled: boolean;   // 是否啟用樓層檔期排程
  startAt: string;
  endAt: string;
}

export interface HotKeywordItem {
  id: string;
  label: string;
  keyword?: string;
  filterMode?: QuickFilterMode;
}

export interface PortalConfig {
  updatedAt: string;
  antiFraudTitle: string;
  antiFraudText: string;
  featuredStoreId: string;        // 空字串代表自動選第一家啟用賣場
  defaultShowDemoProducts: boolean;
  hotKeywords: HotKeywordItem[];
  heroCampaigns: HeroCampaignItem[];
  floors: FloorConfigItem[];
}

export type ScheduleState = 'active' | 'paused' | 'scheduled' | 'expired';

export function evaluateScheduleState(item: {
  status: 'active' | 'paused';
  scheduleEnabled?: boolean;
  startAt?: string;
  endAt?: string;
}): { state: ScheduleState; label: string; isVisibleOnFrontend: boolean } {
  if (item.status === 'paused') {
    return { state: 'paused', label: '⏸ 已暫停', isVisibleOnFrontend: false };
  }
  if (!item.scheduleEnabled) {
    return { state: 'active', label: '🟢 常駐進行中', isVisibleOnFrontend: true };
  }

  const now = Date.now();
  const startMs = item.startAt ? new Date(item.startAt).getTime() : null;
  const endMs = item.endAt ? new Date(item.endAt).getTime() : null;

  if (startMs && !isNaN(startMs) && now < startMs) {
    return { state: 'scheduled', label: '⏳ 排程未開始', isVisibleOnFrontend: false };
  }
  if (endMs && !isNaN(endMs) && now > endMs) {
    return { state: 'expired', label: '⚪ 已到期下檔', isVisibleOnFrontend: false };
  }
  return { state: 'active', label: '🟢 排程進行中', isVisibleOnFrontend: true };
}

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  updatedAt: new Date().toISOString(),
  antiFraudTitle: '提高警覺防詐騙・安心實名點交',
  antiFraudText: '本平台採實名制登錄，絕不會以電話通知分期設定錯誤或要求操作 ATM。',
  featuredStoreId: '',
  defaultShowDemoProducts: true,
  hotKeywords: [
    { id: 'hk-1', label: '手提購物袋', keyword: '手提' },
    { id: 'hk-2', label: '可開三聯發票', filterMode: 'invoice_only' },
    { id: 'hk-3', label: '日本連線代購', filterMode: 'preorder_proxy' },
    { id: 'hk-4', label: '現貨秒出', filterMode: 'in_stock' },
    { id: 'hk-5', label: '日貨小判', keyword: '日貨小判' },
    { id: 'hk-6', label: '商務筆電', keyword: '筆電' },
    { id: 'hk-7', label: '天然原石', keyword: '原石' },
  ],
  heroCampaigns: [
    {
      id: 'camp-1',
      tabTitle: '零抽成・純粹直購',
      badge: 'DUPE P2P 拍賣革命',
      title: '0% 平台成交抽成・讓利回歸買賣雙方',
      subtitle: '告別高昂平台手續費與強制廣告綁架，賣家直開實價、買家直接聯繫點交。',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
      ctaText: '瀏覽現貨直購品',
      filterMode: 'in_stock',
      customUrl: '',
      status: 'active',
      scheduleEnabled: false,
      startAt: '',
      endAt: '',
    },
    {
      id: 'camp-2',
      tabTitle: '日本代購・未買到退費',
      badge: 'PRE-ORDER & PROXY SHIELD',
      title: '預購／日本連線代購・沒買到 100% 退費取消保障',
      subtitle: '透明標示收單截止日、預計抵台時間與「現場缺貨／官方砍單無條件取消退費」承諾。',
      image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=80',
      ctaText: '探索預購與代購專區',
      filterMode: 'preorder_proxy',
      customUrl: '',
      status: 'active',
      scheduleEnabled: false,
      startAt: '',
      endAt: '',
    },
    {
      id: 'camp-3',
      tabTitle: '企業採購・三聯發票',
      badge: 'B2B & TAX TRANSPARENCY',
      title: '全站含稅／未稅價格透明・支援二聯與三聯式發票',
      subtitle: '無論個人自用（二聯式）或公司行號報帳扣抵（三聯式 8 碼統編），一鍵產生採購洽詢單。',
      image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&q=80',
      ctaText: '篩選可開發票商品',
      filterMode: 'invoice_only',
      customUrl: '',
      status: 'active',
      scheduleEnabled: false,
      startAt: '',
      endAt: '',
    },
    {
      id: 'camp-4',
      tabTitle: '實名認證・防幽靈機制',
      badge: 'REAL-NAME VERIFIED',
      title: '全站買賣家實名制登錄・杜絕幽靈詐騙帳號',
      subtitle: '強制驗證真實姓名、身分證字號、行動電話與聯絡地址，安心約定超商或捷運面交。',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
      ctaText: '瀏覽全站實名商品',
      filterMode: 'all',
      customUrl: '',
      status: 'active',
      scheduleEnabled: false,
      startAt: '',
      endAt: '',
    },
    {
      id: 'camp-5',
      tabTitle: '器物雅石・二手良物',
      badge: 'VINTAGE & STONE COLLECTION',
      title: '惜物循環・二手精品、3C筆電與天然雅石收藏',
      subtitle: '支援 5 張實拍細節照片上傳，清楚揭露物況等級與當面驗貨地點。',
      image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&q=80',
      ctaText: '查看全站精選好物',
      filterMode: 'all',
      customUrl: '',
      status: 'active',
      scheduleEnabled: false,
      startAt: '',
      endAt: '',
    },
  ],
  floors: [
    {
      id: 'floor-1',
      floorNum: '1F',
      title: '精品服飾・生活良物館',
      subtitle: '專櫃精品包袋、無印風衣著與居家溫潤器物',
      accentColor: '#7F0019',
      hotTags: ['手提托特包', 'A4通勤包', '無染色帆布', '美濃燒陶器', '二聯/三聯發票', '雙北面交'],
      bannerTitle: '質樸衣著與日常器物',
      bannerDesc: '精選海內外專櫃包袋與手作生活器皿，全館透明標示含稅與未稅價格。',
      bannerImg: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
      bottomPills: ['托特包', '真皮肩背包', '白瓷茶具', '亞麻收納籃', '木質立架', '專櫃正品'],
      matchCategories: ['精品／服飾鞋包', '居家生活／無印良物', '其他精選好物'],
      status: 'active',
      scheduleEnabled: false,
      startAt: '',
      endAt: '',
    },
    {
      id: 'floor-2',
      floorNum: '2F',
      title: '日本連線・動漫周邊・預購代購館',
      subtitle: '東京展場連線、限定立牌趴娃、較長備貨預購（沒買到保證 100% 全額退費取消）',
      accentColor: '#222222',
      hotTags: ['咒術迴戰', '五條悟/夏油傑', '原宿限定代購', '免預付買到再付', '沒買到全額退', '同人誌畫集'],
      bannerTitle: '日本連線代購・零風險保障',
      bannerDesc: '支援「先登記買到再付」與「沒買到 24 小時全額無息退費」，徹底解決預購與代購砍單糾紛。',
      bannerImg: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
      bottomPills: ['日本展覽代購', '壓克力立牌', '趴娃/指娃', '痛包配件', '預購免訂金', '官方周邊'],
      matchCategories: ['日貨／動漫周邊／展覽代購', '書籍／文具小物', '美妝保養／個人清潔'],
      status: 'active',
      scheduleEnabled: false,
      startAt: '',
      endAt: '',
    },
    {
      id: 'floor-3',
      floorNum: '3F',
      title: '3C數位・原石雅石・收藏孤品館',
      subtitle: '日本製輕薄商務筆電、UMPC、花蓮天然玉髓雅石與企業統編報帳設備',
      accentColor: '#4A463F',
      hotTags: ['商務筆電', '三聯式統編報帳', '台灣豐田玉', '立霧溪白玉髓', '當面驗機點交', '收藏老件'],
      bannerTitle: '高單價 3C 與天然雅石收藏',
      bannerDesc: '支援企業採購開立三聯式統一發票報帳，高單價品項可約定捷運站當面點交驗貨。',
      bannerImg: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
      bottomPills: ['日本製筆電', 'UMPC掌機', '花蓮白玉髓', '蛇紋石/藍石英', '檜木擺件', '可開三聯發票'],
      matchCategories: ['3C數位／筆電家電', '古董／原石雅石收藏'],
      status: 'active',
      scheduleEnabled: false,
      startAt: '',
      endAt: '',
    },
  ],
};
