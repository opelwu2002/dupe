export type TaxMode = 'tax_included' | 'tax_excluded' | 'tax_free';
export type InvoiceCapability = 'invoice' | 'receipt' | 'personal_declaration' | 'none';
export type FulfillmentType = 'in_stock' | 'preorder' | 'proxy' | 'group_buy' | 'custom';
export type PaymentTermType =
  | 'pay_after_secured'
  | 'deposit_balance'
  | 'full_upfront'
  | 'cod_or_meetup';

export interface ProductMeta {
  category: string;
  condition: string;
  brand: string;
  hasMultiSpec: boolean;
  stock: number;
  deliveryMethods: string[];
  // 稅務與發票設定
  taxMode: TaxMode;
  invoiceCapability: InvoiceCapability;
  invoiceTypes: string[];
  // 預購 / 代購 / 缺貨取消與退費設定
  fulfillmentType: FulfillmentType;
  orderCutoffDate: string;      // 收單截止日或採購截止時間
  estimatedArrival: string;     // 預計到貨或發售期間
  paymentTerm: PaymentTermType; // 付款與訂金階段
  depositPercent: number;       // 訂金比例 (例: 30 代表 30%)
  shortagePolicy: string;       // 沒買到 / 缺貨 / 官方砍單之取消與退費承諾
  buyerCancelRule: string;      // 買家取消與防棄單規範
  purchaseLimit: string;        // 單人限購或配額說明
  // 交易條件與保固
  negotiable: string;
  shippingFeeRule: string;
  leadTime: string;
  warranty: string;
}

export interface TaxBreakdown {
  taxIncludedPrice: number;
  taxExcludedPrice: number;
  taxAmount: number;
  taxModeLabel: string;
}

export function calculateTaxBreakdown(rawPrice: number, taxMode: TaxMode): TaxBreakdown {
  const cleanPrice = Math.max(0, Math.round(Number(rawPrice) || 0));

  if (taxMode === 'tax_included') {
    const taxExcludedPrice = Math.round(cleanPrice / 1.05);
    const taxAmount = cleanPrice - taxExcludedPrice;
    return {
      taxIncludedPrice: cleanPrice,
      taxExcludedPrice,
      taxAmount,
      taxModeLabel: '含稅價 (內含5%營業稅)',
    };
  }

  if (taxMode === 'tax_excluded') {
    const taxExcludedPrice = cleanPrice;
    const taxIncludedPrice = Math.round(cleanPrice * 1.05);
    const taxAmount = taxIncludedPrice - taxExcludedPrice;
    return {
      taxIncludedPrice,
      taxExcludedPrice,
      taxAmount,
      taxModeLabel: '未稅價 (開立發票外加5%)',
    };
  }

  return {
    taxIncludedPrice: cleanPrice,
    taxExcludedPrice: cleanPrice,
    taxAmount: 0,
    taxModeLabel: '免稅 / 個人直購價 (不另加稅)',
  };
}

export function calculateDepositBreakdown(totalPrice: number, depositPercent: number) {
  const safePercent = Math.min(90, Math.max(10, Number(depositPercent) || 30));
  const depositAmount = Math.round((totalPrice * safePercent) / 100);
  const balanceAmount = Math.max(0, totalPrice - depositAmount);
  return {
    depositPercent: safePercent,
    depositAmount,
    balanceAmount,
  };
}

export const INVOICE_TYPE_OPTIONS = [
  '二聯式發票（對個人／自然人買家）',
  '三聯式發票（對公司行號／附統一編號與抬頭）',
  '電子發票／雲端載具（手機條碼／自然人憑證）',
];

export const FULFILLMENT_TYPE_OPTIONS: Array<{
  value: FulfillmentType;
  label: string;
  badge: string;
  desc: string;
}> = [
  {
    value: 'in_stock',
    label: '現貨供應（In Stock）',
    badge: '現貨',
    desc: '商品已在台現貨在庫，買賣雙方確認後即可依約定時效寄出或面交',
  },
  {
    value: 'preorder',
    label: '預購商品・較長備貨（Pre-order）',
    badge: '預購・較長備貨',
    desc: '官方尚未發售或需等待廠商批次出貨，等待期較長，支援設定預計到貨日與砍單退費保障',
  },
  {
    value: 'proxy',
    label: '海外／日本連線代購（Proxy Buying）',
    badge: '連線代購',
    desc: '委任賣家赴現場或海外官網代購，若遇現場完售／限購沒買到，依約定自動取消並退費',
  },
  {
    value: 'group_buy',
    label: '團購集單（Group Buy）',
    badge: '團購集單',
    desc: '累積達指定數量始向廠商下單；若截止未成團則自動取消訂單並全額退費',
  },
  {
    value: 'custom',
    label: '客製化／接單訂製（Made to Order）',
    badge: '接單訂製',
    desc: '依買家指定規格手工或排程製作，需要專屬備貨工期',
  },
];

export const PAYMENT_TERM_OPTIONS: Array<{
  value: PaymentTermType;
  label: string;
  desc: string;
}> = [
  {
    value: 'pay_after_secured',
    label: '先登記免預付・確認買到／到貨後再付款（推薦代購使用）',
    desc: '買家先私訊登記款式；若現場沒買到直接取消登記免退費困擾，確認買到後再匯款',
  },
  {
    value: 'deposit_balance',
    label: '分階段付款：先付訂金 ＋ 到貨後付尾款',
    desc: '下單時先支付指定比例訂金鎖定名額，商品抵台準備寄出或面交時再付清尾款',
  },
  {
    value: 'full_upfront',
    label: '全額預付（若未買到／缺貨砍單保證 100% 全額無息退費）',
    desc: '確認委託時先行付清全款，若遇缺貨或官方砍單則全額退還款項',
  },
  {
    value: 'cod_or_meetup',
    label: '面交當面點交付款 ／ 約定取貨付款',
    desc: '雙方約定時間地點當面驗貨付款，或依賣家指定方式交付',
  },
];

export const SHORTAGE_POLICY_OPTIONS = [
  '沒買到／缺貨／官方砍單：賣家主動通知取消訂單，並於 24 小時內 100% 全額無息退還已付款項（不扣跨行手續費）',
  '免預付登記制：採購當下若現場完售沒買到，賣家直接通知取消該筆登記，買賣雙方互不負賠償責任',
  '依登記順序配貨：若遇官方限購或配額不足（砍單），依買家登記先後順序配貨；未配到者全額退費取消或可改換同系列款式',
  '延後發售處理：若遇官方宣布延期發售，訂單自動順延；若超過原定到貨日 60 天以上，買家可選擇無條件取消並全額退費',
  '團購流團保障：若於收單截止日未達最低成團數量，本單自動取消並於 24 小時內全額無息退還已付訂金',
];

export const BUYER_CANCEL_RULE_OPTIONS = [
  '收單／採購前可免費取消；一旦賣家已完成海外下單或現場採購，除缺貨未買到外，恕不接受買家因等待期長或個人因素中途棄單',
  '預購／代購屬依買家指示採購之委任服務，賣家採購完成後若買家惡意棄單，已付訂金將不予退還以折抵採購成本',
  '商品尚未寄出前，買賣雙方可協議取消訂單並退還款項',
];

export const PURCHASE_LIMIT_OPTIONS = [
  '不限購（依實際庫存／可代購配額為準）',
  '每人每款限購 1 件（配合現場／官方限購防砍單）',
  '每人每款限購 2 件（配合現場／官方限購防砍單）',
  '限量孤品／最後現貨（售完即止）',
];

const DEFAULT_META: ProductMeta = {
  category: '其他精選好物',
  condition: '全新未拆 (New)',
  brand: '',
  hasMultiSpec: false,
  stock: 1,
  deliveryMethods: ['店到店（7-11 / 全家）', '面交當面點交'],
  taxMode: 'tax_included',
  invoiceCapability: 'none',
  invoiceTypes: [
    '二聯式發票（對個人／自然人買家）',
    '三聯式發票（對公司行號／附統一編號與抬頭）',
  ],
  fulfillmentType: 'in_stock',
  orderCutoffDate: '',
  estimatedArrival: '',
  paymentTerm: 'full_upfront',
  depositPercent: 30,
  shortagePolicy: SHORTAGE_POLICY_OPTIONS[0],
  buyerCancelRule: BUYER_CANCEL_RULE_OPTIONS[0],
  purchaseLimit: PURCHASE_LIMIT_OPTIONS[0],
  negotiable: '不二價（一口價）',
  shippingFeeRule: '買方負擔運費（依實支計）',
  leadTime: '現貨（24～48小時內寄出）',
  warranty: '二手／實品現況點交（售出無退換）',
};

const META_PREFIX = '<!--DUPE_META:';
const META_SUFFIX = '-->';

export function encodeDescriptionWithMeta(cleanDesc: string, meta: ProductMeta): string {
  const safeDesc = (cleanDesc || '').replace(/<!--DUPE_META:[\s\S]*?-->/g, '').trim();
  const jsonStr = JSON.stringify(meta);
  return `${safeDesc}\n\n${META_PREFIX}${jsonStr}${META_SUFFIX}`;
}

function normalizeInvoiceTypes(rawTypes?: string[]): string[] {
  if (!Array.isArray(rawTypes) || rawTypes.length === 0) {
    return DEFAULT_META.invoiceTypes;
  }
  const normalized: string[] = [];
  for (const item of rawTypes) {
    if (item.includes('二聯式')) {
      normalized.push(INVOICE_TYPE_OPTIONS[0]);
    } else if (item.includes('三聯式')) {
      normalized.push(INVOICE_TYPE_OPTIONS[1]);
    } else if (item.includes('電子發票') || item.includes('載具')) {
      normalized.push(INVOICE_TYPE_OPTIONS[2]);
    } else {
      normalized.push(item);
    }
  }
  return Array.from(new Set(normalized));
}

export function decodeDescriptionAndMeta(
  rawDesc: string,
  variants?: Array<{ name: string; price: number; stock: number }>
): { cleanDescription: string; meta: ProductMeta } {
  const text = rawDesc || '';
  const startIdx = text.indexOf(META_PREFIX);
  const endIdx = text.indexOf(META_SUFFIX, startIdx);

  let cleanDescription = text;
  let parsedMeta: Partial<ProductMeta> = {};

  if (startIdx !== -1 && endIdx !== -1) {
    const jsonPart = text.slice(startIdx + META_PREFIX.length, endIdx);
    cleanDescription = text.slice(0, startIdx).trim();
    try {
      parsedMeta = JSON.parse(jsonPart);
    } catch {
      parsedMeta = {};
    }
  }

  const isDefaultSingleVariant =
    !variants ||
    variants.length === 0 ||
    (variants.length === 1 &&
      ['標準規格', '預設規格', '單一規格', '__SINGLE__'].includes(variants[0].name));

  const hasMultiSpec =
    parsedMeta.hasMultiSpec !== undefined ? parsedMeta.hasMultiSpec : !isDefaultSingleVariant;

  const inferredStock =
    parsedMeta.stock !== undefined
      ? Number(parsedMeta.stock)
      : variants && variants.length > 0
      ? variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0)
      : 1;

  return {
    cleanDescription,
    meta: {
      category: parsedMeta.category || DEFAULT_META.category,
      condition: parsedMeta.condition || DEFAULT_META.condition,
      brand: parsedMeta.brand || '',
      hasMultiSpec,
      stock: inferredStock,
      deliveryMethods:
        Array.isArray(parsedMeta.deliveryMethods) && parsedMeta.deliveryMethods.length > 0
          ? parsedMeta.deliveryMethods
          : DEFAULT_META.deliveryMethods,
      taxMode: parsedMeta.taxMode || DEFAULT_META.taxMode,
      invoiceCapability: parsedMeta.invoiceCapability || DEFAULT_META.invoiceCapability,
      invoiceTypes: normalizeInvoiceTypes(parsedMeta.invoiceTypes),
      fulfillmentType: parsedMeta.fulfillmentType || DEFAULT_META.fulfillmentType,
      orderCutoffDate: parsedMeta.orderCutoffDate || '',
      estimatedArrival: parsedMeta.estimatedArrival || '',
      paymentTerm: parsedMeta.paymentTerm || DEFAULT_META.paymentTerm,
      depositPercent:
        parsedMeta.depositPercent !== undefined
          ? Number(parsedMeta.depositPercent)
          : DEFAULT_META.depositPercent,
      shortagePolicy: parsedMeta.shortagePolicy || DEFAULT_META.shortagePolicy,
      buyerCancelRule: parsedMeta.buyerCancelRule || DEFAULT_META.buyerCancelRule,
      purchaseLimit: parsedMeta.purchaseLimit || DEFAULT_META.purchaseLimit,
      negotiable: parsedMeta.negotiable || DEFAULT_META.negotiable,
      shippingFeeRule: parsedMeta.shippingFeeRule || DEFAULT_META.shippingFeeRule,
      leadTime: parsedMeta.leadTime || DEFAULT_META.leadTime,
      warranty: parsedMeta.warranty || DEFAULT_META.warranty,
    },
  };
}

export const PRODUCT_CATEGORIES = [
  '精品／服飾鞋包',
  '日貨／動漫周邊／展覽代購',
  '3C數位／筆電家電',
  '居家生活／無印良物',
  '古董／原石雅石收藏',
  '書籍／文具小物',
  '美妝保養／個人清潔',
  '其他精選好物',
];

export const PRODUCT_CONDITIONS = [
  '全新未拆 (New)',
  '全新代購／預購品 (Pre-order / Proxy)',
  '近全新・僅拆檢 (Like New)',
  '二手保存良好 (Good)',
  '二手有正常使用痕跡 (Fair)',
  '歲月老件／收藏品 (Vintage)',
];

export const INVOICE_CAPABILITY_OPTIONS: Array<{
  value: InvoiceCapability;
  label: string;
  desc: string;
}> = [
  {
    value: 'invoice',
    label: '可開立統一發票（公司／營業人賣家）',
    desc: '可依買家需求開立二聯式（對個人）或三聯式統一發票（對公司統編報帳）',
  },
  {
    value: 'receipt',
    label: '可開立免用統一發票收據（小規模營業人／工作室）',
    desc: '提供蓋有統一編號店章之正式收據，可供公司行號報支入帳',
  },
  {
    value: 'personal_declaration',
    label: '個人賣家／無發票（可配合簽立個人讓渡證明或一時貿易表）',
    desc: '個人賣家無統一發票，但若公司買家需入帳，可配合簽署讓渡證明書',
  },
  {
    value: 'none',
    label: '個人二手／個人代購（不提供發票或收據）',
    desc: '純個人閒置物品讓渡或個人順道代購，無開立統一發票或收據',
  },
];

export const NEGOTIABLE_OPTIONS = [
  '不二價（一口價）',
  '誠可小議（歡迎私訊討論）',
  '多件合購可議價',
];

export const SHIPPING_FEE_OPTIONS = [
  '買方負擔運費（依實支計）',
  '賣方負擔（本商品免運費）',
  '面交免運／寄送由買方自理',
  '國際運費已含，台灣端店到店運費買方自理',
];

export const LEAD_TIME_OPTIONS = [
  '現貨（24～48小時內寄出）',
  '現貨（2～3個工作天內寄出）',
  '日本連線／海外代購（採購後約 7～14 個工作天抵台寄出）',
  '預購較長備貨（依官方發售／預計到貨月份依序寄出）',
  '長途海運／預購排單（約 15～30 個工作天）',
  '僅限雙方預約時間面交點交',
];

export const WARRANTY_OPTIONS = [
  '二手／實品現況點交（售出無退換）',
  '全新專櫃／日本官方正品代購保證（未買到全額退費）',
  '原廠保固期限內（附購買證明／保固卡）',
  '賣家個人保固 7 天（非人為機能故障可退）',
];
