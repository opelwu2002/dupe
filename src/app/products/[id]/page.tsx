'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { decodeDescriptionAndMeta } from '@/lib/productMeta';

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
      }
      setLoading(false);
    }
    loadProduct();
  }, [productId]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(type);
    setTimeout(() => setCopyStatus(null), 2000);
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

  // 重要修正：單一規格商品一律直接採用主價格 product.price，確保賣家修改售價後 100% 即時顯示
  const currentPrice =
    showMultiVariants && selectedVariant ? selectedVariant.price : product.price;

  const currentStock =
    showMultiVariants && selectedVariant ? selectedVariant.stock : meta.stock;

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

          {/* 5 格縮圖切換列 */}
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

        {/* 右側：商品資訊與規格/庫存 */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="px-2 py-0.5 text-[11px] bg-[#7F0019]/10 text-[#7F0019] font-medium rounded-sm">
                {meta.condition}
              </span>
              <span className="px-2 py-0.5 text-[11px] bg-[#FAF9F5] border border-[#E6E3DC] text-[#666666] rounded-sm">
                {meta.category}
              </span>
              {meta.brand && (
                <span className="px-2 py-0.5 text-[11px] bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222] rounded-sm">
                  品牌/來源：{meta.brand}
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold tracking-tight text-[#222222] mb-3 leading-snug">
              {product.title}
            </h1>

            <div className="text-2xl font-bold text-[#7F0019] mb-6">
              NT$ {currentPrice.toLocaleString()}
            </div>

            {/* 僅在真正具備多規格時才渲染「選擇規格」按鈕群 */}
            {showMultiVariants ? (
              <div className="mb-6 space-y-2">
                <label className="block text-xs text-[#666666] font-medium tracking-wide">
                  選擇商品款式規格
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.product_variants.map((variant) => {
                    const isSelected = selectedVariant?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-3.5 py-2 text-xs border rounded-sm transition-colors ${
                          isSelected
                            ? 'border-[#7F0019] bg-[#FAF9F5] text-[#7F0019] font-bold'
                            : 'border-[#E6E3DC] bg-white text-[#222222] hover:border-[#666666]'
                        }`}
                      >
                        {variant.name}（剩餘 {variant.stock}）
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mb-6 py-2.5 px-3.5 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm flex items-center justify-between text-xs">
                <span className="text-[#666666]">可售庫存數量</span>
                <span className="font-bold text-[#222222]">剩餘 {currentStock} 件</span>
              </div>
            )}

            <div className="border-t border-[#E6E3DC] pt-4 mb-6 space-y-2.5 text-xs text-[#666666]">
              <div>
                <span className="font-medium text-[#222222]">賣場名稱：</span>{' '}
                {product.stores?.name || '實名認證賣家'}
              </div>
              <div>
                <span className="font-medium text-[#222222]">支援交付：</span>{' '}
                {meta.deliveryMethods.join(' ／ ')}
              </div>
              <div>
                <span className="font-medium text-[#222222]">寄送說明：</span>{' '}
                {product.stores?.custom_shipping_note || '店到店或宅配，請私訊賣家確認運費'}
              </div>
              {product.stores?.meetup_location && (
                <div>
                  <span className="font-medium text-[#222222]">面交地點：</span>{' '}
                  {product.stores.meetup_location}
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-[#E6E3DC] space-y-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full h-12 bg-[#7F0019] hover:bg-[#660014] text-white text-sm font-medium tracking-wider rounded-sm transition-colors flex items-center justify-center"
            >
              查看賣家聯絡方式 / 私訊約定交易
            </button>
            <p className="text-[11px] text-[#666666] text-center">
              本平台不設購物車與官方收銀台，買賣雙方請直接約定交易管道。
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-md rounded-sm p-6 shadow-sm">
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

            <p className="text-xs text-[#666666] mb-4 leading-relaxed">
              您欲洽詢的商品為「{product.title}
              {showMultiVariants && selectedVariant ? ` - ${selectedVariant.name}` : ''}
              （NT$ {currentPrice.toLocaleString()}）」，可透過以下管道直接與賣家聯繫：
            </p>

            <div className="space-y-3 mb-6">
              {product.stores?.contact_line && (
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#666666]">LINE ID</div>
                    <div className="text-xs font-medium text-[#222222]">
                      {product.stores.contact_line}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(product.stores!.contact_line!, 'line')}
                    className="text-xs px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5]"
                  >
                    {copyStatus === 'line' ? '已複製' : '複製'}
                  </button>
                </div>
              )}

              {product.stores?.contact_phone && (
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#666666]">聯絡電話</div>
                    <div className="text-xs font-medium text-[#222222]">
                      {product.stores.contact_phone}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(product.stores!.contact_phone!, 'phone')}
                    className="text-xs px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5]"
                  >
                    {copyStatus === 'phone' ? '已複製' : '複製'}
                  </button>
                </div>
              )}

              {!product.stores?.contact_line && !product.stores?.contact_phone && (
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] text-xs text-[#666666]">
                  賣家尚未填寫公開聯絡電話或 LINE，請至賣場設定補充或於面交地點聯繫。
                </div>
              )}
            </div>

            <div className="text-[11px] text-[#666666] bg-[#FAF9F5] p-3 border border-[#E6E3DC] leading-relaxed mb-4">
              交易提示：建議優先選擇具備貨態追蹤之物流或當面清點面交，切勿依指示操作 ATM 進行身分驗證。
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
