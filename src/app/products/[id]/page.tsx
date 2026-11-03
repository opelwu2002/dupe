'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface StoreInfo {
  id: string;
  name: string;
  contact_line?: string;
  contact_phone?: string;
  meetup_location?: string;
  custom_shipping_note?: string;
}

export default function ProductDetailPage() {
  const product = {
    id: 'prod-001',
    title: '無染色純棉收納袋 / 輕量多功能置物袋',
    description:
      '採用未經漂染的自然純棉帆布製作，保留原棉質樸點狀纖維。容量充足，適用於居家物品收納、文具分類或日常外出隨身攜帶。',
    price: 350,
    images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'],
    variants: [
      { id: 'v1', name: '標準款（原色米白）', price: 350, stock: 12 },
      { id: 'v2', name: '大容量款（原色米白）', price: 450, stock: 5 },
    ],
    store: {
      id: 'store-001',
      name: '原質日常工作室',
      contact_line: 'dupe_seller_01',
      contact_phone: '0912-345-678',
      meetup_location: '台北捷運松山站 3 號出口或南京復興站',
      custom_shipping_note: '7-11 / 全家純取貨（運費 60 元由買方自理），亦可約定捷運站面交。',
    } as StoreInfo,
  };

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(type);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-xs text-[#666666] hover:text-[#222222] transition-colors">
          ← 返回商品看板
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="aspect-square bg-white border border-[#E6E3DC] rounded-sm overflow-hidden flex items-center justify-center">
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <div className="inline-block px-2 py-0.5 mb-3 text-xs bg-[#FAF9F5] border border-[#E6E3DC] text-[#666666]">
              賣家直接展示品
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#222222] mb-3 leading-snug">
              {product.title}
            </h1>
            <div className="text-2xl font-bold text-[#222222] mb-6">
              NT$ {selectedVariant.price.toLocaleString()}
            </div>

            <div className="mb-6 space-y-2">
              <label className="block text-xs text-[#666666] font-medium tracking-wide">
                選擇規格
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-3 py-2 text-xs border rounded-sm transition-colors ${
                        isSelected
                          ? 'border-[#7F0019] bg-white text-[#7F0019] font-medium'
                          : 'border-[#E6E3DC] bg-white text-[#222222] hover:border-[#666666]'
                      }`}
                    >
                      {variant.name} (剩餘 {variant.stock})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#E6E3DC] pt-4 mb-6 space-y-2 text-xs text-[#666666]">
              <div>
                <span className="font-medium text-[#222222]">寄送說明：</span>{' '}
                {product.store.custom_shipping_note}
              </div>
              <div>
                <span className="font-medium text-[#222222]">面交地點：</span>{' '}
                {product.store.meetup_location}
              </div>
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
          商品說明與備註
        </h2>
        <div className="bg-white p-6 border border-[#E6E3DC] rounded-sm text-xs leading-relaxed text-[#222222] whitespace-pre-line">
          {product.description}
        </div>
      </section>

      <section className="mt-8 p-4 bg-white border border-[#E6E3DC] rounded-sm">
        <p className="text-[11px] text-[#666666] leading-relaxed">
          免責聲明：本平台（Dupe 嘟屁）僅提供去中心化商品資訊刊登與 P2P 媒合展示看板，不介入買賣雙方實質交易、金流收付與商品交付流程，亦不承擔任何買賣履約保證與物之瑕疵擔保責任。
        </p>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-md rounded-sm p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E3DC] mb-4">
              <h3 className="text-sm font-bold text-[#222222]">
                聯繫賣家：{product.store.name}
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
              您所選的規格為「{selectedVariant.name}（NT$ {selectedVariant.price}）」，可透過以下管道直接與賣家洽談：
            </p>

            <div className="space-y-3 mb-6">
              {product.store.contact_line && (
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#666666]">LINE ID</div>
                    <div className="text-xs font-medium text-[#222222]">
                      {product.store.contact_line}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(product.store.contact_line!, 'line')}
                    className="text-xs px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5]"
                  >
                    {copyStatus === 'line' ? '已複製' : '複製'}
                  </button>
                </div>
              )}

              {product.store.contact_phone && (
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#666666]">聯絡電話</div>
                    <div className="text-xs font-medium text-[#222222]">
                      {product.store.contact_phone}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(product.store.contact_phone!, 'phone')}
                    className="text-xs px-2.5 py-1 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5]"
                  >
                    {copyStatus === 'phone' ? '已複製' : '複製'}
                  </button>
                </div>
              )}
            </div>

            <div className="text-[11px] text-[#666666] bg-[#FAF9F5] p-3 border border-[#E6E3DC] leading-relaxed mb-3">
              交易提示：建議優先選擇具備貨態追蹤之物流或當面清點面交，切勿依指示操作 ATM 進行身分驗證。
            </div>

            <div className="text-[10px] text-[#666666] leading-relaxed mb-4">
              免責聲明：本平台（Dupe 嘟屁）僅提供去中心化商品資訊刊登與 P2P 媒合展示看板，不介入買賣雙方實質交易、金流收付與商品交付流程，亦不承擔任何買賣履約保證與物之瑕疵擔保責任。
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
