export interface ProductMeta {
  category: string;
  condition: string;
  brand: string;
  hasMultiSpec: boolean;
  stock: number;
  deliveryMethods: string[];
}

const DEFAULT_META: ProductMeta = {
  category: '其他精選好物',
  condition: '全新未拆',
  brand: '',
  hasMultiSpec: false,
  stock: 1,
  deliveryMethods: ['店到店', '面交自取'],
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

  // 自動判斷是否真的有多規格：若未明確開啟多規格，且只有 1 組「標準規格/預設規格/單一規格」，視為單一規格商品
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
