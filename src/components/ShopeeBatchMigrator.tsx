'use client';

import React, { useState, useRef } from 'react';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  FULFILLMENT_TYPE_OPTIONS,
  INVOICE_CAPABILITY_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  SHORTAGE_POLICY_OPTIONS,
  BUYER_CANCEL_RULE_OPTIONS,
  PURCHASE_LIMIT_OPTIONS,
  NEGOTIABLE_OPTIONS,
  SHIPPING_FEE_OPTIONS,
  LEAD_TIME_OPTIONS,
  WARRANTY_OPTIONS,
  encodeDescriptionWithMeta,
  calculateTaxBreakdown,
  TaxMode,
  InvoiceCapability,
  FulfillmentType,
} from '@/lib/productMeta';

interface ParsedBatchItem {
  title: string;
  price: number;
  stock: number;
  imageUrl: string;
  description: string;
}

export default function ShopeeBatchMigrator({
  storeId,
  storeName,
  onImportSuccess,
}: {
  storeId: string;
  storeName: string;
  onImportSuccess: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [batchText, setBatchText] = useState(
    '無印風亞麻收納籃, 390, 5, https://images.unsplash.com/photo-1544816155-12df9643f363?w=800, 質感居家收納好物\n日式白瓷馬克杯, 250, 10, https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800, 溫潤手感極簡設計'
  );

  // 批次套用之賣場預設分類與稅務發票設定
  const [defaultCategory, setDefaultCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [defaultCondition, setDefaultCondition] = useState(PRODUCT_CONDITIONS[0]);
  const [defaultFulfillment, setDefaultFulfillment] = useState<FulfillmentType>('in_stock');
  const [defaultTaxMode, setDefaultTaxMode] = useState<TaxMode>('tax_included');
  const [defaultInvoiceCap, setDefaultInvoiceCap] = useState<InvoiceCapability>('invoice');
  const [importing, setImporting] = useState(false);

  // 即時解析預覽清單
  const parsedPreview: ParsedBatchItem[] = batchText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,，\t]/).map((s) => s.trim());
      const title = parts[0] || '';
      const price = Math.max(0, Number(parts[1]?.replace(/[^0-9.]/g, '')) || 100);
      const stock = Math.max(1, Number(parts[2]?.replace(/[^0-9]/g, '')) || 1);
      // 若使用者貼上 Markdown [url](url) 格式，自動擷取純網址
      const rawUrl = (parts[3] || '').replace(/^\[.*?\]\((https?:\/\/[^)]+)\)$/, '$1');
      const imageUrl = rawUrl.startsWith('http') ? rawUrl : '';
      const description = parts.slice(4).join('，') || `${storeName} 嚴選商品`;
      return { title, price, stock, imageUrl, description };
    })
    .filter((item) => item.title.length > 0);

  // 支援直接上傳 CSV 或 TXT 報表檔
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) || '';
      if (content.trim()) {
        // 自動過濾掉第一行標題列（若包含「商品名稱」字樣）
        const lines = content
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        const filteredLines = lines.filter(
          (l, idx) => !(idx === 0 && (l.includes('商品名稱') || l.toLowerCase().includes('title')))
        );
        setBatchText(filteredLines.join('\n'));
      }
    };
    reader.readAsText(file, 'utf-8');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBatchSubmit = async () => {
    if (!storeId) {
      alert('請先完成「賣場基本設定」建立賣場後，再使用蝦皮批次搬家功能。');
      return;
    }
    if (parsedPreview.length === 0) {
      alert('請輸入至少一筆有效商品資料');
      return;
    }

    setImporting(true);
    let successCount = 0;

    for (const item of parsedPreview) {
      const encodedDesc = encodeDescriptionWithMeta(item.description, {
        category: defaultCategory,
        condition: defaultCondition,
        brand: '',
        hasMultiSpec: false,
        stock: item.stock,
        deliveryMethods: ['店到店（7-11 / 全家）', '面交當面點交'],
        taxMode: defaultTaxMode,
        invoiceCapability: defaultInvoiceCap,
        invoiceTypes:
          defaultInvoiceCap === 'invoice'
            ? [INVOICE_TYPE_OPTIONS[0], INVOICE_TYPE_OPTIONS[1]]
            : [],
        fulfillmentType: defaultFulfillment,
        orderCutoffDate: '',
        estimatedArrival: defaultFulfillment !== 'in_stock' ? '依賣場公告時程到貨' : '',
        paymentTerm: defaultFulfillment === 'proxy' ? 'pay_after_secured' : 'full_upfront',
        depositPercent: 30,
        shortagePolicy: SHORTAGE_POLICY_OPTIONS[0],
        buyerCancelRule: BUYER_CANCEL_RULE_OPTIONS[0],
        purchaseLimit: PURCHASE_LIMIT_OPTIONS[0],
        negotiable: NEGOTIABLE_OPTIONS[0],
        shippingFeeRule: SHIPPING_FEE_OPTIONS[0],
        leadTime: LEAD_TIME_OPTIONS[0],
        warranty: WARRANTY_OPTIONS[0],
      });

      const res = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_product',
          payload: {
            store_id: storeId,
            title: item.title,
            description: encodedDesc,
            price: item.price,
            images: item.imageUrl ? [item.imageUrl] : [],
            status: 'published',
            has_multi_spec: false,
            single_stock: item.stock,
            variants: [],
          },
        }),
      });
      const data = await res.json();
      if (data.ok) successCount++;
    }

    setImporting(false);
    alert(`🎉 成功將 ${successCount} 件商品批次搬家轉換並上架至您的賣場「${storeName}」！`);
    onImportSuccess();
  };

  return (
    <div className="bg-white border border-[#E6E3DC] rounded-sm p-6 space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E3DC] pb-4">
        <div>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-[#7F0019] text-white rounded-sm">
            SELLER MIGRATION TOOL
          </span>
          <h2 className="text-base font-bold text-[#222222] mt-1">
            蝦皮賣場商品・一鍵批次快速搬家工具（專屬賣場：{storeName}）
          </h2>
          <p className="text-[#666666] mt-0.5">
            專為賣家打造的批量轉移工具：支援直接貼上蝦皮商品清單或上傳 CSV 檔案，自動轉換含稅／未稅價與發票設定並上架至您的賣場。
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleCsvFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-[#222222] bg-[#FAF9F5] hover:bg-white text-[#222222] font-bold rounded-sm"
          >
            📂 上傳 CSV / TXT 商品清單檔
          </button>
        </div>
      </div>

      {/* 步驟 1：設定這批搬家商品的預設屬性 */}
      <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-3">
        <div className="font-bold text-[#222222]">
          步驟 1：設定本次批次匯入商品之預設屬性（匯入後仍可於「我的商品管理」單獨編輯）
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block font-medium text-[#666666] mb-1">預設商品分類</label>
            <select
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              className="w-full px-2.5 py-2 border border-[#E6E3DC] bg-white"
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-[#666666] mb-1">預設新舊物況</label>
            <select
              value={defaultCondition}
              onChange={(e) => setDefaultCondition(e.target.value)}
              className="w-full px-2.5 py-2 border border-[#E6E3DC] bg-white"
            >
              {PRODUCT_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-[#666666] mb-1">預設供貨型態</label>
            <select
              value={defaultFulfillment}
              onChange={(e) => setDefaultFulfillment(e.target.value as FulfillmentType)}
              className="w-full px-2.5 py-2 border border-[#E6E3DC] bg-white font-bold text-[#7F0019]"
            >
              {FULFILLMENT_TYPE_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.badge}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-[#666666] mb-1">價格稅務基準</label>
            <select
              value={defaultTaxMode}
              onChange={(e) => setDefaultTaxMode(e.target.value as TaxMode)}
              className="w-full px-2.5 py-2 border border-[#E6E3DC] bg-white"
            >
              <option value="tax_included">所填為「含稅價」(內含5%)</option>
              <option value="tax_excluded">所填為「未稅價」(外加5%)</option>
              <option value="tax_free">個人二手／免稅 (含未稅同價)</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-[#666666] mb-1">發票開立能力</label>
            <select
              value={defaultInvoiceCap}
              onChange={(e) => setDefaultInvoiceCap(e.target.value as InvoiceCapability)}
              className="w-full px-2.5 py-2 border border-[#E6E3DC] bg-white"
            >
              {INVOICE_CAPABILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label.slice(0, 10)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 步驟 2：輸入或貼上商品清單 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="font-bold text-[#222222]">
            步驟 2：貼上商品清單（每行一筆，格式：
            <span className="text-[#7F0019]">商品名稱, 售價, 庫存數量, 圖片網址, 商品說明</span>）
          </label>
          <span className="text-[#666666]">已解析 {parsedPreview.length} 件待上架商品</span>
        </div>
        <textarea
          rows={5}
          value={batchText}
          onChange={(e) => setBatchText(e.target.value)}
          placeholder="商品名稱, 售價, 庫存, https://圖片網址, 商品描述..."
          className="w-full p-3 font-mono border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
        />
      </div>

      {/* 步驟 3：即時解析預覽表格 */}
      {parsedPreview.length > 0 && (
        <div className="space-y-2">
          <div className="font-bold text-[#222222]">
            步驟 3：轉換預覽（確認含稅／未稅價格與庫存無誤後，點擊下方按鈕一鍵上架）
          </div>
          <div className="overflow-x-auto border border-[#E6E3DC] rounded-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#E6E3DC] text-[#666666]">
                  <th className="p-2.5">圖片預覽</th>
                  <th className="p-2.5">商品名稱</th>
                  <th className="p-2.5">含稅價 / 未稅價試算</th>
                  <th className="p-2.5">庫存數量</th>
                  <th className="p-2.5">商品說明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E3DC]">
                {parsedPreview.map((item, idx) => {
                  const tax = calculateTaxBreakdown(item.price, defaultTaxMode);
                  return (
                    <tr key={idx} className="hover:bg-[#FAF9F5]/50">
                      <td className="p-2.5">
                        <div className="w-10 h-10 bg-[#FAF9F5] border border-[#E6E3DC] overflow-hidden flex items-center justify-center">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-[#666666]">無圖</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 font-bold text-[#222222]">{item.title}</td>
                      <td className="p-2.5">
                        <span className="font-bold text-[#7F0019]">
                          含稅 NT$ {tax.taxIncludedPrice.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-[#666666] ml-2">
                          (未稅 ${tax.taxExcludedPrice.toLocaleString()})
                        </span>
                      </td>
                      <td className="p-2.5 font-medium">{item.stock} 件</td>
                      <td className="p-2.5 text-[#666666] truncate max-w-xs">{item.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="pt-2">
        <button
          type="button"
          disabled={importing || parsedPreview.length === 0}
          onClick={handleBatchSubmit}
          className="px-6 py-3 bg-[#7F0019] hover:bg-[#660014] text-white font-bold rounded-sm transition-colors disabled:opacity-50"
        >
          {importing
            ? '正在批量轉換並上架至您的賣場...'
            : `🚀 開始批次匯入這 ${parsedPreview.length} 件商品並公開上架至前台`}
        </button>
      </div>
    </div>
  );
}
