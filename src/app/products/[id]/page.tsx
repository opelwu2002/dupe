'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  decodeDescriptionAndMeta,
  calculateTaxBreakdown,
  calculateDepositBreakdown,
  FULFILLMENT_TYPE_OPTIONS,
  PAYMENT_TERM_OPTIONS,
  INVOICE_CAPABILITY_OPTIONS,
} from '@/lib/productMeta';

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface ProductData {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  status: string;
  created_at: string;
  product_variants: ProductVariant[];
  stores: {
    id: string;
    name: string;
    contact_line?: string;
    contact_phone?: string;
    meetup_location?: string;
    custom_shipping_note?: string;
  } | null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params?.id as string;

  const [product, setProduct] = useState<ProductData | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [buyQty, setBuyQty] = useState<number>(1);

  // 預購 / 代購等待期與沒買到取消條款知情勾選
  const [agreedToPreorderTerms, setAgreedToPreorderTerms] = useState(true);

  // 買家發票預填狀態
  const [buyerInvoiceChoice, setBuyerInvoiceChoice] = useState<'personal_2' | 'company_3' | 'none'>(
    'personal_2'
  );
  const [companyTitle, setCompanyTitle] = useState('');
  const [companyTaxId, setCompanyTaxId] = useState('');
  const [carrierCode, setCarrierCode] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          description,
          price,
          images,
          status,
          created_at,
          product_variants (
            id,
            name,
            price,
            stock
          ),
          stores (
            id,
            name,
            contact_line,
            contact_phone,
            meetup_location,
            custom_shipping_note
          )
        `)
        .eq('id', productId)
        .maybeSingle();

      if (!error && data) {
        const prod = data as unknown as ProductData;
        setProduct(prod);
        const { meta } = decodeDescriptionAndMeta(prod.description, prod.product_variants);
        if (meta.hasMultiSpec && prod.product_variants && prod.product_variants.length > 0) {
          setSelectedVariant(prod.product_variants[0]);
        } else {
          setSelectedVariant(null);
        }
        if (meta.invoiceCapability !== 'invoice') {
          setBuyerInvoiceChoice('none');
        }
      }
      setLoading(false);
    }
    loadProduct();
  }, [productId]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(type);
    setTimeout(() => setCopyStatus(null), 2500);
  };

  if (loading) {
    return <div className="p-16 text-center text-xs text-[#666666]">讀取商品資訊中...</div>;
  }

  if (!product) {
    return (
      <div className="p-16 text-center space-y-4">
        <p className="text-sm text-[#222222]">查無此商品或該商品已下架</p>
        <Link className="inline-block text-xs text-[#7F0019] underline" href="/">
          返回首頁
        </Link>
      </div>
    );
  }

  const { cleanDescription, meta } = decodeDescriptionAndMeta(
    product.description,
    product.product_variants
  );

  const validImages = (product.images || []).filter(Boolean).slice(0, 5);
  const showMultiVariants =
    meta.hasMultiSpec &&
    product.product_variants &&
    product.product_variants.length > 0 &&
    !(
      product.product_variants.length === 1 &&
      ['標準規格', '預設規格', '單一規格', '__SINGLE__'].includes(product.product_variants[0].name)
    );

  const rawCurrentPrice =
    showMultiVariants && selectedVariant ? selectedVariant.price : product.price;
  const currentStock =
    showMultiVariants && selectedVariant ? selectedVariant.stock : meta.stock;

  const priceTax = calculateTaxBreakdown(rawCurrentPrice, meta.taxMode);
  const totalTaxIncluded = priceTax.taxIncludedPrice * buyQty;
  const depositCalc = calculateDepositBreakdown(totalTaxIncluded, meta.depositPercent);

  const fulfillObj = FULFILLMENT_TYPE_OPTIONS.find((f) => f.value === meta.fulfillmentType);
  const paymentTermObj = PAYMENT_TERM_OPTIONS.find((p) => p.value === meta.paymentTerm);
  const invoiceCapObj = INVOICE_CAPABILITY_OPTIONS.find(
    (o) => o.value === meta.invoiceCapability
  );

  const isPreorderOrProxy = meta.fulfillmentType !== 'in_stock';

  const buildOrderInquiryText = () => {
    const specLine =
      showMultiVariants && selectedVariant ? `款式規格：${selectedVariant.name}` : '款式規格：單一標準品';

    let paymentLine = `付款模式：${paymentTermObj?.label || '全額付款'}`;
    if (isPreorderOrProxy && meta.paymentTerm === 'deposit_balance') {
      paymentLine = `付款階段：預付 ${depositCalc.depositPercent}% 訂金 NT$ ${depositCalc.depositAmount.toLocaleString()} ＋ 到貨尾款 NT$ ${depositCalc.balanceAmount.toLocaleString()}`;
    } else if (isPreorderOrProxy && meta.paymentTerm === 'pay_after_secured') {
      paymentLine = `付款階段：先登記代購免預付，待賣家確認買到後再通知匯款`;
    }

    let invoiceLine = '發票需求：個人交易／不需發票';
    if (meta.invoiceCapability === 'invoice') {
      if (buyerInvoiceChoice === 'company_3') {
        invoiceLine = `發票需求：三聯式統一發票（對公司報帳）｜公司抬頭：${
          companyTitle || '待補'
        }｜統一編號：${companyTaxId || '待補'}`;
      } else if (buyerInvoiceChoice === 'personal_2') {
        invoiceLine = `發票需求：二聯式統一發票（對個人）${
          carrierCode ? `｜雲端載具：${carrierCode}` : ''
        }`;
      }
    } else if (meta.invoiceCapability === 'receipt') {
      invoiceLine = `憑證需求：免用統一發票收據${
        companyTaxId ? `（統編：${companyTaxId} / 抬頭：${companyTitle}）` : ''
      }`;
    }

    const lines = [
      `您好！我在「嘟屁 DUPE」看到您的【${fulfillObj?.badge || '現貨'}】商品，想與您約定購買／登記：`,
      `・商品名稱：${product.title}`,
      `・${specLine}（數量：${buyQty} 件）`,
      `・單件價位：含稅 NT$ ${priceTax.taxIncludedPrice.toLocaleString()}（未稅 NT$ ${priceTax.taxExcludedPrice.toLocaleString()}）`,
      `・合計總額：含稅 NT$ ${totalTaxIncluded.toLocaleString()}`,
      `・${paymentLine}`,
      `・${invoiceLine}`,
    ];

    if (isPreorderOrProxy) {
      if (meta.estimatedArrival) {
        lines.push(`・預計到貨期：${meta.estimatedArrival}（買家已知悉並同意等待期）`);
      }
      lines.push(`・未買到／缺貨取消約定：${meta.shortagePolicy}`);
    }

    lines.push(`請問目前可受理登記／購買嗎？謝謝！`);
    return lines.join('\n');
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-4 text-xs text-[#666666] flex items-center space-x-2">
        <Link className="hover:text-[#222222]" href="/">
          首頁看板
        </Link>
        <span>/</span>
        <span>{meta.category}</span>
        <span>/</span>
        <span className="text-[#222222] font-medium line-clamp-1">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* 左側：5張照片互動相簿 */}
        <div className="space-y-3">
          <div className="relative aspect-square bg-white border border-[#E6E3DC] rounded-sm overflow-hidden flex items-center justify-center">
            {validImages.length > 0 ? (
              <>
                <img
                  src={validImages[activeImageIdx] || validImages[0]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                {validImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIdx((prev) =>
                          prev === 0 ? validImages.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white border border-[#E6E3DC] text-[#222222] flex items-center justify-center rounded-sm text-xs shadow-sm"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIdx((prev) =>
                          prev === validImages.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white border border-[#E6E3DC] text-[#222222] flex items-center justify-center rounded-sm text-xs shadow-sm"
                    >
                      ▶
                    </button>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] rounded-sm">
                      {activeImageIdx + 1} / {validImages.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <span className="text-xs text-[#666666]">賣家未提供商品圖片</span>
            )}
          </div>

          {validImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {validImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-square border rounded-sm overflow-hidden bg-white ${
                    activeImageIdx === idx
                      ? 'border-2 border-[#7F0019]'
                      : 'border-[#E6E3DC] opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`縮圖 ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右側：商品資訊、預購/代購保障、含稅/未稅價格與發票選擇 */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-sm ${
                  isPreorderOrProxy
                    ? 'bg-[#7F0019] text-white'
                    : 'bg-[#222222] text-white'
                }`}
              >
                {fulfillObj?.badge || '現貨'}
              </span>
              <span className="px-2 py-0.5 text-[11px] bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222] rounded-sm">
                {meta.condition}
              </span>
              <span className="px-2 py-0.5 text-[11px] bg-[#FAF9F5] border border-[#E6E3DC] text-[#666666] rounded-sm">
                {meta.negotiable}
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-[#222222] mb-3 leading-snug">
              {product.title}
            </h1>

            {/* 含稅價與未稅價雙重清晰標示面板 */}
            <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm mb-4 space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-[#666666]">含稅直購價：</span>
                <span className="text-2xl font-bold text-[#7F0019]">
                  NT$ {priceTax.taxIncludedPrice.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-[#E6E3DC] pt-1.5">
                <span className="text-[#666666]">未稅價位：</span>
                <span className="font-semibold text-[#222222]">
                  NT$ {priceTax.taxExcludedPrice.toLocaleString()}
                  {priceTax.taxAmount > 0
                    ? `（內含 5% 營業稅 NT$ ${priceTax.taxAmount.toLocaleString()}）`
                    : '（個人交易／免徵營業稅）'}
                </span>
              </div>
            </div>

            {/* 預購 / 海外代購 / 較長備貨 與「沒買到／缺貨砍單取消退費保障」專區 */}
            {isPreorderOrProxy && (
              <div className="p-4 bg-white border-2 border-[#7F0019] rounded-sm mb-5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-[#E6E3DC] pb-2">
                  <span className="font-bold text-[#7F0019]">
                    ⏳ {fulfillObj?.label}・等待期與未買到退費保障
                  </span>
                  {meta.orderCutoffDate && (
                    <span className="text-[11px] px-2 py-0.5 bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222]">
                      收單截止：{meta.orderCutoffDate}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-[11px] leading-relaxed">
                  {meta.estimatedArrival && (
                    <div>
                      <span className="font-bold text-[#222222]">預計到貨／出貨期：</span>
                      <span className="text-[#7F0019] font-semibold">{meta.estimatedArrival}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-[#222222]">收款與訂金模式：</span>
                    <span>{paymentTermObj?.label}</span>
                  </div>
                  {meta.paymentTerm === 'deposit_balance' && (
                    <div className="p-2 bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222]">
                      訂金試算：先付 {depositCalc.depositPercent}% 訂金{' '}
                      <strong className="text-[#7F0019]">
                        NT$ {depositCalc.depositAmount.toLocaleString()}
                      </strong>{' '}
                      ＋ 到貨尾款{' '}
                      <strong>NT$ {depositCalc.balanceAmount.toLocaleString()}</strong>
                    </div>
                  )}
                  <div className="p-2 bg-[#FAF9F5] border-l-2 border-[#7F0019] text-[#222222]">
                    <div className="font-bold text-[#7F0019]">
                      【沒買到／缺貨／官方砍單之訂單取消與退費承諾】
                    </div>
                    <div>{meta.shortagePolicy}</div>
                  </div>
                  <div className="text-[#666666]">
                    <span className="font-medium text-[#222222]">取消與棄單規範：</span>
                    {meta.buyerCancelRule}
                  </div>
                </div>
              </div>
            )}

            {/* 多規格款式選擇 */}
            {showMultiVariants ? (
              <div className="mb-5 space-y-2">
                <label className="block text-xs text-[#222222] font-bold">
                  選擇款式規格（款式名稱 ／ 含未稅價位 ／ 庫存數量）
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {product.product_variants.map((variant) => {
                    const isSelected = selectedVariant?.id === variant.id;
                    const vTax = calculateTaxBreakdown(variant.price, meta.taxMode);
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`p-2.5 text-left text-xs border rounded-sm transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'border-[#7F0019] bg-[#FAF9F5] text-[#7F0019] font-bold ring-1 ring-[#7F0019]'
                            : 'border-[#E6E3DC] bg-white text-[#222222] hover:border-[#666666]'
                        }`}
                      >
                        <span>
                          {isSelected ? '● ' : '○ '}
                          {variant.name}
                        </span>
                        <span className="text-[11px]">
                          含稅 ${vTax.taxIncludedPrice.toLocaleString()}（未稅 $
                          {vTax.taxExcludedPrice.toLocaleString()}）｜剩餘 {variant.stock} 件
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mb-5 py-2 px-3 bg-white border border-[#E6E3DC] rounded-sm flex items-center justify-between text-xs">
                <span className="text-[#666666]">
                  {isPreorderOrProxy ? '目前可登記／代購名額' : '可售現貨庫存'}
                </span>
                <span className="font-bold text-[#222222]">
                  剩餘 {currentStock} 件（{meta.purchaseLimit}）
                </span>
              </div>
            )}

            {/* 發票開立與買家二聯/三聯預選區 */}
            <div className="p-3.5 bg-white border border-[#E6E3DC] rounded-sm mb-5 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-[#222222] whitespace-nowrap">發票與報帳憑證：</span>
                <span className="text-right font-medium text-[#7F0019]">
                  {invoiceCapObj?.label || '個人二手讓渡'}
                </span>
              </div>

              {meta.invoiceCapability === 'invoice' && (
                <div className="pt-2 border-t border-[#E6E3DC] space-y-2.5">
                  <div className="text-[11px] text-[#666666]">
                    賣家支援：{meta.invoiceTypes.join('、')}
                  </div>
                  <div className="font-medium text-[#222222]">
                    預選您的發票需求（將自動帶入私訊明細）：
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBuyerInvoiceChoice('personal_2')}
                      className={`py-1.5 px-2 border rounded-sm text-xs ${
                        buyerInvoiceChoice === 'personal_2'
                          ? 'border-[#7F0019] bg-[#FAF9F5] text-[#7F0019] font-bold'
                          : 'border-[#E6E3DC] text-[#666666]'
                      }`}
                    >
                      二聯式發票（對個人）
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuyerInvoiceChoice('company_3')}
                      className={`py-1.5 px-2 border rounded-sm text-xs ${
                        buyerInvoiceChoice === 'company_3'
                          ? 'border-[#7F0019] bg-[#FAF9F5] text-[#7F0019] font-bold'
                          : 'border-[#E6E3DC] text-[#666666]'
                      }`}
                    >
                      三聯式發票（對公司報帳）
                    </button>
                  </div>

                  {buyerInvoiceChoice === 'company_3' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <input
                        type="text"
                        value={companyTitle}
                        onChange={(e) => setCompanyTitle(e.target.value)}
                        placeholder="輸入買受人公司抬頭"
                        className="px-2.5 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5] text-xs"
                      />
                      <input
                        type="text"
                        maxLength={8}
                        value={companyTaxId}
                        onChange={(e) => setCompanyTaxId(e.target.value)}
                        placeholder="輸入 8 碼統一編號"
                        className="px-2.5 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5] text-xs font-mono"
                      />
                    </div>
                  )}

                  {buyerInvoiceChoice === 'personal_2' && (
                    <input
                      type="text"
                      value={carrierCode}
                      onChange={(e) => setCarrierCode(e.target.value)}
                      placeholder="選填：手機條碼載具（例 /ABC1234）或留空索取紙本"
                      className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5] text-xs"
                    />
                  )}
                </div>
              )}
            </div>

            {/* 交易條件與保固資訊 */}
            <div className="border-t border-[#E6E3DC] pt-4 mb-5 space-y-2 text-xs text-[#666666]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium text-[#222222]">運費規則：</span>
                  {meta.shippingFeeRule}
                </div>
                <div>
                  <span className="font-medium text-[#222222]">出貨時效：</span>
                  {meta.leadTime}
                </div>
                <div>
                  <span className="font-medium text-[#222222]">售後保固：</span>
                  {meta.warranty}
                </div>
                <div>
                  <span className="font-medium text-[#222222]">支援交付：</span>
                  {meta.deliveryMethods.join(' / ')}
                </div>
              </div>
              {product.stores?.meetup_location && (
                <div>
                  <span className="font-medium text-[#222222]">面交地點：</span>{' '}
                  {product.stores.meetup_location}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6E3DC] space-y-3">
            {isPreorderOrProxy && (
              <label className="flex items-start space-x-2 text-xs text-[#222222] bg-[#FAF9F5] p-2.5 border border-[#E6E3DC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToPreorderTerms}
                  onChange={(e) => setAgreedToPreorderTerms(e.target.checked)}
                  className="mt-0.5 accent-[#7F0019]"
                />
                <span>
                  我已詳閱本商品為<strong>【{fulfillObj?.badge}】</strong>
                  ，了解較長備貨等待期，並同意若遇現場沒買到／缺貨砍單時，依賣家所列之取消與退費保障條款辦理。
                </span>
              </label>
            )}

            <button
              type="button"
              disabled={isPreorderOrProxy && !agreedToPreorderTerms}
              onClick={() => setIsModalOpen(true)}
              className="w-full h-12 bg-[#7F0019] hover:bg-[#660014] text-white text-sm font-medium tracking-wider rounded-sm transition-colors flex items-center justify-center disabled:opacity-40"
            >
              {isPreorderOrProxy
                ? '查看賣家聯絡方式 ／ 產生預購・代購登記與退費保障單'
                : '查看賣家聯絡方式 ／ 產生發票與採購洽詢單'}
            </button>
            <p className="text-[11px] text-[#666666] text-center">
              本平台僅提供去中心化商品資訊刊登與媒合看板服務，不介入買賣雙方實質交易、金流收付與商品交付，亦不承擔買賣履約與瑕疵擔保責任。
            </p>
          </div>
        </div>
      </div>

      <section className="mt-12 pt-8 border-t border-[#E6E3DC]">
        <h2 className="text-xs font-semibold tracking-wider text-[#222222] mb-3 uppercase">
          商品說明與物況備註
        </h2>
        <div className="bg-white p-6 border border-[#E6E3DC] rounded-sm text-xs leading-relaxed text-[#222222] whitespace-pre-line">
          {cleanDescription || '賣家未提供進一步備註。'}
        </div>
      </section>

      {/* 聯繫賣家與一鍵複製採購/預購退費保障明細彈窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-lg rounded-sm p-6 shadow-sm max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E3DC] mb-4">
              <h3 className="text-sm font-bold text-[#222222]">
                聯繫賣家：{product.stores?.name || '實名認證賣場'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#666666] hover:text-[#222222] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mb-5 p-3.5 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#222222]">
                  📋 採購／代購登記與退費保障明細（可直接複製貼給賣家）
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(buildOrderInquiryText(), 'inquiry')}
                  className="px-2.5 py-1 bg-[#7F0019] text-white text-[11px] rounded-sm"
                >
                  {copyStatus === 'inquiry' ? '✓ 已複製明細' : '一鍵複製洽詢單'}
                </button>
              </div>
              <pre className="text-[11px] text-[#222222] whitespace-pre-wrap font-sans bg-white p-2.5 border border-[#E6E3DC]">
                {buildOrderInquiryText()}
              </pre>
            </div>

            <div className="space-y-3 mb-6">
              {product.stores?.contact_line && (
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#666666]">賣家 LINE ID</div>
                    <div className="text-xs font-bold text-[#222222]">
                      {product.stores.contact_line}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(product.stores!.contact_line!, 'line')}
                    className="text-xs px-3 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5]"
                  >
                    {copyStatus === 'line' ? '已複製' : '複製 LINE ID'}
                  </button>
                </div>
              )}

              {product.stores?.contact_phone && (
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#666666]">賣家聯絡電話</div>
                    <div className="text-xs font-bold text-[#222222]">
                      {product.stores.contact_phone}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(product.stores!.contact_phone!, 'phone')}
                    className="text-xs px-3 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5]"
                  >
                    {copyStatus === 'phone' ? '已複製' : '複製電話'}
                  </button>
                </div>
              )}
            </div>

            <div className="text-[11px] text-[#666666] bg-[#FAF9F5] p-3 border border-[#E6E3DC] leading-relaxed mb-4">
              免責聲明：本平台僅提供去中心化商品資訊刊登與媒合看板服務，不介入買賣雙方實質交易、金流收付與商品交付，亦不承擔買賣履約與瑕疵擔保責任。
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2 border border-[#E6E3DC] bg-white text-xs text-[#222222] hover:bg-[#FAF9F5]"
            >
              關閉視窗
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
