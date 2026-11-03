export type TaxMode = 'tax_included' | 'tax_excluded' | 'tax_free';
export type InvoiceCapability = 'invoice' | 'receipt' | 'personal_declaration' | 'none';

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
  invoiceTypes: string[]; // 例：['二聯式發票（對個人）', '三聯式發票（對公司）', '雲端載具／電子發票']
  // 周全交易條件
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

  // tax_free: 個人二手或免稅，含稅與未稅同價
  return {
    taxIncludedPrice: cleanPrice,
    taxExcludedPrice: cleanPrice,
    taxAmount: 0,
    taxModeLabel: '免稅 / 個人直購價 (不另加稅)',
  };
}

const DEFAULT_META: ProductMeta = {
  category: '其他精選好物',
  condition: '全新未拆 (New)',
  brand: '',
  hasMultiSpec: false,
  stock: 1,
  deliveryMethods: ['店到店（7-11 / 全家）', '面交當面點交'],
  taxMode: 'tax_included',
  invoiceCapability: 'none',
  invoiceTypes: ['二聯式發票（對個人）', '三聯式發票（對公司行號）'],
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
      invoiceTypes:
        Array.isArray(parsedMeta.invoiceTypes) && parsedMeta.invoiceTypes.length > 0
          ? parsedMeta.invoiceTypes
          : DEFAULT_META.invoiceTypes,
      negotiable: parsedMeta.negotiable || DEFAULT_META.negotiable,
      shippingFeeRule: parsedMeta.shippingFeeRule || DEFAULT_META.shippingFeeRule,
      leadTime: parsedMeta.leadTime || DEFAULT_META.leadTime,
      warranty: parsedMeta.warranty || DEFAULT_META.warranty,
    },
  };
}

export const PRODUCT_CATEGORIES = [
  '精品／服飾鞋包',
  '日貨／動漫周邊',
  '3C數位／筆電家電',
  '居家生活／無印良物',
  '古董／原石雅石收藏',
  '書籍／文具小物',
  '美妝保養／個人清潔',
  '其他精選好物',
];

export const PRODUCT_CONDITIONS = [
  '全新未拆 (New)',
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
    label: '個人二手／無發票（可配合簽立個人讓渡證明或一時貿易表）',
    desc: '個人賣家無統一發票，但若公司買家需入帳，可配合簽署讓渡證明書',
  },
  {
    value: 'none',
    label: '個人二手讓渡（不提供發票或收據）',
    desc: '純個人閒置物品交易，無開立統一發票或收據',
  },
];

export const INVOICE_TYPE_OPTIONS = [
  '二聯式發票（對個人／自然人買家）',
  '三聯式發票（對公司行號／附統一編號與抬頭）',
  '電子發票／雲端載具（手機條碼／自然人憑證）',
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
];

export const LEAD_TIME_OPTIONS = [
  '現貨（24～48小時內寄出）',
  '現貨（2～3個工作天內寄出）',
  '日本空運／預購（約7～14個工作天）',
  '僅限雙方預約時間面交點交',
];

export const WARRANTY_OPTIONS = [
  '二手／實品現況點交（售出無退換）',
  '全新專櫃／官方正品保證',
  '原廠保固期限內（附購買證明／保固卡）',
  '賣家個人保固 7 天（非人為機能故障可退）',
];
