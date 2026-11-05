'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { QuickFilterMode } from '@/lib/portalConfig';
import { calculateTaxBreakdown } from '@/lib/productMeta';

export type PillarKey = 'direct_p2p' | 'refund_guarantee' | 'tax_invoice' | 'ready_to_ship';

interface PillarGuideSectionProps {
  onApplyProductFilter: (filter: QuickFilterMode) => void;
}

const PILLAR_CARDS: Array<{
  key: PillarKey;
  badge: string;
  title: string;
  desc: string;
  hint: string;
  filterMode: QuickFilterMode;
}> = [
  {
    key: 'direct_p2p',
    badge: 'DIRECT P2P',
    title: '0% 平台零抽成看板',
    desc: '無官方收銀台抽成，買賣雙方直接LINE/電話對接',
    hint: '點擊查看：平台費率比較表 ＆ 零抽成交易流程 →',
    filterMode: 'all',
  },
  {
    key: 'refund_guarantee',
    badge: 'REFUND GUARANTEE',
    title: '預購／代購沒買到退費',
    desc: '現場缺貨或官方砍單，保證取消訂單並全額退費',
    hint: '點擊查看：代購三大收款模式 ＆ 沒買到退費條款 →',
    filterMode: 'preorder_proxy',
  },
  {
    key: 'tax_invoice',
    badge: 'TAX & INVOICE',
    title: '二聯／三聯發票專區',
    desc: '含稅未稅雙標示，支援個人二聯與企業三聯統編',
    hint: '點擊查看：二/三聯發票規範 ＆ 5% 營業稅試算器 →',
    filterMode: 'invoice_only',
  },
  {
    key: 'ready_to_ship',
    badge: 'READY TO SHIP',
    title: '在台現貨・當面點交',
    desc: '24～48小時快速出貨或約定捷運站當面驗貨',
    hint: '點擊查看：當面點交驗貨守則 ＆ 實名制防詐保障 →',
    filterMode: 'in_stock',
  },
];

export default function PillarGuideSection({
  onApplyProductFilter,
}: PillarGuideSectionProps) {
  const [activeModalKey, setActiveModalKey] = useState<PillarKey | null>(null);
  const [samplePrice, setSamplePrice] = useState<number>(10000);

  const taxIncludedCalc = calculateTaxBreakdown(samplePrice, 'tax_included');
  const taxExcludedCalc = calculateTaxBreakdown(samplePrice, 'tax_excluded');

  return (
    <>
      {/* 首頁四大核心機制卡片列 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PILLAR_CARDS.map((card) => {
          const isOpen = activeModalKey === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveModalKey(card.key)}
              className={`group p-4 text-left border rounded-sm transition-all flex flex-col justify-between ${
                isOpen
                  ? 'bg-[#FAF9F5] border-[#7F0019] ring-1 ring-[#7F0019]'
                  : 'bg-white border-[#E6E3DC] hover:border-[#7F0019] hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-[#7F0019]">
                    {card.badge}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#FAF9F5] border border-[#E6E3DC] text-[#666666] group-hover:border-[#7F0019] group-hover:text-[#7F0019] rounded-sm">
                    機制詳解
                  </span>
                </div>
                <div className="text-sm font-bold text-[#222222] mt-1">{card.title}</div>
                <div className="text-[11px] text-[#666666] mt-1 leading-relaxed">
                  {card.desc}
                </div>
              </div>
              <div className="pt-2.5 mt-2.5 border-t border-[#E6E3DC]/70 text-[11px] font-medium text-[#7F0019] group-hover:underline">
                {card.hint}
              </div>
            </button>
          );
        })}
      </section>

      {/* 點擊後彈出之「四大核心機制與交易保障詳解視窗」 */}
      {activeModalKey && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-3xl rounded-sm shadow-lg max-h-[92vh] flex flex-col overflow-hidden">
            {/* 視窗頂部標題與關閉鈕 */}
            <div className="px-6 py-4 bg-[#FAF9F5] border-b border-[#E6E3DC] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#7F0019] uppercase">
                  DUPE PLATFORM POLICY & MECHANISM GUIDE
                </span>
                <h3 className="text-base font-bold text-[#222222] mt-0.5">
                  嘟屁 DUPE・四大公平交易機制與買賣保障詳解
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalKey(null)}
                className="w-8 h-8 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5] text-[#222222] text-sm flex items-center justify-center rounded-sm"
              >
                ✕
              </button>
            </div>

            {/* 視窗內部四大專章快速切換頁籤 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#E6E3DC] border-b border-[#E6E3DC] bg-[#FAF9F5]">
              {PILLAR_CARDS.map((tab) => {
                const active = activeModalKey === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveModalKey(tab.key)}
                    className={`p-3 text-left transition-colors ${
                      active
                        ? 'bg-[#7F0019] text-white'
                        : 'bg-[#FAF9F5] text-[#222222] hover:bg-white'
                    }`}
                  >
                    <div
                      className={`text-[10px] font-bold ${
                        active ? 'text-white/80' : 'text-[#7F0019]'
                      }`}
                    >
                      {tab.badge}
                    </div>
                    <div className="text-xs font-bold truncate mt-0.5">{tab.title}</div>
                  </button>
                );
              })}
            </div>

            {/* 視窗主體內容區 */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-[#222222]">
              {/* 專章 1：DIRECT P2P 0% 平台零抽成看板 */}
              {activeModalKey === 'direct_p2p' && (
                <div className="space-y-5">
                  <div className="p-4 bg-[#FAF9F5] border-l-4 border-[#7F0019] space-y-1.5">
                    <div className="text-sm font-bold text-[#222222]">
                      為什麼我們堅持「0% 平台成交抽成、0 元刊登費」？
                    </div>
                    <p className="text-[#666666]">
                      現有大型網購賣場向賣家收取高達 12%～15% 的複合抽成（成交手續費＋金流費＋活動強制抽成），導致賣家只能將抽成全數灌入商品售價轉嫁給消費者。DUPE 嘟屁回歸純粹資訊媒合，不設官方收銀台抽成，讓賣家得以提供最真實合理的直購價。
                    </p>
                  </div>

                  {/* 費率對照表 */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-[#222222]">
                      📊 傳統主流拍賣平台 vs. DUPE 嘟屁 成本結構對照表
                    </h4>
                    <div className="overflow-x-auto border border-[#E6E3DC] rounded-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#FAF9F5] border-b border-[#E6E3DC] text-[#666666]">
                            <th className="p-3">收費項目</th>
                            <th className="p-3">主流大型網購平台（例：蝦皮等）</th>
                            <th className="p-3 text-[#7F0019] font-bold">DUPE 嘟屁極簡拍賣看板</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E3DC]">
                          <tr>
                            <td className="p-3 font-medium">商品上架刊登費</td>
                            <td className="p-3 text-[#666666]">依廣告曝光競價收費</td>
                            <td className="p-3 font-bold text-emerald-800">NT$ 0（完全免費）</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-medium">平台成交手續費</td>
                            <td className="p-3 text-[#666666]">5.5% ～ 8.5%（促銷期更高）</td>
                            <td className="p-3 font-bold text-emerald-800">0.0%（零抽成）</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-medium">綁定金流與活動抽成</td>
                            <td className="p-3 text-[#666666]">約 2% ～ 7% 疊加扣款</td>
                            <td className="p-3 font-bold text-emerald-800">
                              0.0%（買賣雙方直接對接）
                            </td>
                          </tr>
                          <tr className="bg-[#FAF9F5]">
                            <td className="p-3 font-bold">以 10,000 元商品為例</td>
                            <td className="p-3 text-[#666666]">
                              賣家被扣 $1,200～$1,500，買家買貴
                            </td>
                            <td className="p-3 font-bold text-[#7F0019]">
                              抽成 $0，賣家可直接讓利回饋買家
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* P2P 對接四步驟 */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-[#222222]">
                      🤝 買賣雙方直接對接（Direct P2P）標準 4 步驟
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      {[
                        {
                          step: 'STEP 1',
                          title: '選購與試算',
                          desc: '於商品頁選擇款式規格、預覽含稅／未稅價與二／三聯發票需求。',
                        },
                        {
                          step: 'STEP 2',
                          title: '一鍵複製洽詢單',
                          desc: '點擊「產生採購洽詢單」，系統自動排版商品明細、統編與退費保障條款。',
                        },
                        {
                          step: 'STEP 3',
                          title: 'LINE / 電話直聯',
                          desc: '複製賣家公開之 LINE ID 或電話，將洽詢單貼給賣家確認現貨與交付方式。',
                        },
                        {
                          step: 'STEP 4',
                          title: '安心交付點交',
                          desc: '透過超商店到店、宅配或約定捷運站當面驗貨點交，完成零抽成公平交易。',
                        },
                      ].map((s, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1"
                        >
                          <div className="text-[10px] font-bold text-[#7F0019]">{s.step}</div>
                          <div className="font-bold text-[#222222]">{s.title}</div>
                          <p className="text-[11px] text-[#666666]">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 專章 2：REFUND GUARANTEE 預購／代購沒買到退費 */}
              {activeModalKey === 'refund_guarantee' && (
                <div className="space-y-5">
                  <div className="p-4 bg-[#FAF9F5] border-l-4 border-[#7F0019] space-y-1.5">
                    <div className="text-sm font-bold text-[#222222]">
                      徹底解決「日本連線代購、展覽限定品、海外預購」沒買到與砍單的退款糾紛
                    </div>
                    <p className="text-[#666666]">
                      針對等待期較長的「預購商品」與現場變數大的「海外／日本連線代購」，DUPE 嘟屁強制要求賣家於上架時透明公開「收單截止日」、「預計抵台到貨期」以及「當下沒買到／官方砍單之訂單取消與全額退費承諾」。
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="font-bold text-sm text-[#222222]">
                      🛡️ 平台支援之三大代購／預購安全收款與退費模式
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#7F0019] text-white rounded-sm">
                          模式一（最推薦代購）
                        </span>
                        <div className="font-bold text-[#222222] text-sm pt-1">
                          先登記免預付・買到再付款
                        </div>
                        <p className="text-[11px] text-[#666666]">
                          買家先私訊登記欲購款式，無須預先匯款。賣家於日本展場或專櫃現場確認買到後才通知匯款；若現場完售沒買到，直接通知取消登記，買賣雙方完全免除退款與跨行手續費困擾。
                        </p>
                      </div>

                      <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#222222] text-white rounded-sm">
                          模式二（高單價預購）
                        </span>
                        <div className="font-bold text-[#222222] text-sm pt-1">
                          預付訂金 ＋ 到貨付尾款
                        </div>
                        <p className="text-[11px] text-[#666666]">
                          支援賣家設定 10%～80% 訂金比例，系統自動於商品頁試算訂金與尾款金額。若遇官方砍單或配額不足未買到，賣家須於 24 小時內 100% 全額無息退還已付訂金。
                        </p>
                      </div>

                      <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#222222] text-white rounded-sm">
                          模式三（全額預付保障）
                        </span>
                        <div className="font-bold text-[#222222] text-sm pt-1">
                          沒買到 24 小時全額無息退費
                        </div>
                        <p className="text-[11px] text-[#666666]">
                          若採全額預付委託，一旦發生現場缺貨、官方砍單或團購流團，賣家必須主動通知取消訂單，並於 24 小時內 100% 全額退還款項（嚴禁扣除跨行轉帳手續費）。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-[#E6E3DC] rounded-sm space-y-1.5">
                    <div className="font-bold text-[#222222]">
                      📋 白紙黑字寫入「採購洽詢單」＋ 買賣雙方防棄單對等保護
                    </div>
                    <p className="text-[#666666]">
                      1. 買家於預購／代購商品頁點擊聯繫賣家時，系統會自動將賣家承諾之「預計到貨期」與「未買到退費條款」完整印在採購單上，作為雙方 LINE 對話之明確履約依據。
                      <br />
                      2. 為同時保護代購賣家權益：於收單截止前買家可免費取消；惟一旦賣家已完成海外下單或現場採購，除缺貨未買到外，買家不得因等待期長而中途惡意棄單。
                    </p>
                  </div>
                </div>
              )}

              {/* 專章 3：TAX & INVOICE 二聯／三聯發票專區 */}
              {activeModalKey === 'tax_invoice' && (
                <div className="space-y-5">
                  <div className="p-4 bg-[#FAF9F5] border-l-4 border-[#7F0019] space-y-1.5">
                    <div className="text-sm font-bold text-[#222222]">
                      全站含稅／未稅價格雙標示・支援個人二聯式與企業三聯式發票統編報帳
                    </div>
                    <p className="text-[#666666]">
                      過去網拍最常發生「談好價格後，買家要求開發票，賣家才說要外加 5% 稅金」的爭議。DUPE 嘟屁強制要求所有商品與多規格款式在刊登時，即由系統自動換算並同時並列「含稅價」與「未稅價」，並主動揭露賣家的發票或收據開立能力。
                    </p>
                  </div>

                  {/* 內建互動式 5% 營業稅含稅/未稅即時試算器 */}
                  <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[#222222]">
                        🧮 平台內建 5% 營業稅含稅／未稅即時試算器
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-[#666666]">輸入測試金額 (NT$)：</span>
                        <input
                          type="number"
                          min={0}
                          value={samplePrice}
                          onChange={(e) => setSamplePrice(Number(e.target.value))}
                          className="w-32 px-2.5 py-1 border border-[#7F0019] bg-white font-bold text-[#222222]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-white border border-[#E6E3DC] rounded-sm">
                        <div className="text-[11px] text-[#666666]">
                          情況 A：若賣家輸入之 {samplePrice.toLocaleString()} 元為「含稅價」
                        </div>
                        <div className="font-bold text-[#7F0019] text-sm mt-1">
                          含稅應付：NT$ {taxIncludedCalc.taxIncludedPrice.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-[#222222] mt-0.5">
                          反推未稅價：NT$ {taxIncludedCalc.taxExcludedPrice.toLocaleString()}（內含 5% 營業稅額 ${taxIncludedCalc.taxAmount.toLocaleString()}）
                        </div>
                      </div>

                      <div className="p-3 bg-white border border-[#E6E3DC] rounded-sm">
                        <div className="text-[11px] text-[#666666]">
                          情況 B：若賣家輸入之 {samplePrice.toLocaleString()} 元為「未稅價」
                        </div>
                        <div className="font-bold text-[#7F0019] text-sm mt-1">
                          加計 5% 含稅應付：NT$ {taxExcludedCalc.taxIncludedPrice.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-[#222222] mt-0.5">
                          原未稅價：NT$ {taxExcludedCalc.taxExcludedPrice.toLocaleString()}（外加 5% 營業稅額 ${taxExcludedCalc.taxAmount.toLocaleString()}）
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 四種發票與稅務憑證分類表 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-white border border-[#E6E3DC] rounded-sm space-y-1">
                      <div className="font-bold text-[#7F0019]">
                        1. 三聯式統一發票（對公司行號／機關報帳）
                      </div>
                      <p className="text-[11px] text-[#666666]">
                        企業採購可於商品頁直接點選「三聯式發票」，並輸入「買受人公司抬頭」與「8 碼統一編號」，一鍵產生含稅與稅額明細之正式採購單供進項扣抵。
                      </p>
                    </div>
                    <div className="p-3.5 bg-white border border-[#E6E3DC] rounded-sm space-y-1">
                      <div className="font-bold text-[#222222]">
                        2. 二聯式統一發票（對個人／自然人買家）
                      </div>
                      <p className="text-[11px] text-[#666666]">
                        適合一般個人消費者，支援於商品頁預填「手機條碼雲端載具（如 /ABC1234）」或索取紙本二聯式發票。
                      </p>
                    </div>
                    <div className="p-3.5 bg-white border border-[#E6E3DC] rounded-sm space-y-1">
                      <div className="font-bold text-[#222222]">
                        3. 免用統一發票收據（小規模營業人）
                      </div>
                      <p className="text-[11px] text-[#666666]">
                        由核定免用統一發票之工作室開立蓋有統一編號店章與負責人私章之正式收據，公司行號買家同樣可作為費用憑證報支入帳。
                      </p>
                    </div>
                    <div className="p-3.5 bg-white border border-[#E6E3DC] rounded-sm space-y-1">
                      <div className="font-bold text-[#222222]">
                        4. 個人二手讓渡（無發票／一時貿易讓渡證明）
                      </div>
                      <p className="text-[11px] text-[#666666]">
                        純個人出清二手閒置物品免徵營業稅（含未稅同價）；若公司買家向個人購買高單價二手品需入帳，可選擇支援簽立「個人讓渡證明」之賣家。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 專章 4：READY TO SHIP 在台現貨・當面點交 */}
              {activeModalKey === 'ready_to_ship' && (
                <div className="space-y-5">
                  <div className="p-4 bg-[#FAF9F5] border-l-4 border-[#7F0019] space-y-1.5">
                    <div className="text-sm font-bold text-[#222222]">
                      在台現貨 24～48 小時快速出貨 ＋ 捷運站當面點交驗貨 ＋ 全站防幽靈實名制
                    </div>
                    <p className="text-[#666666]">
                      為確保買賣雙方在去中心化環境下享有最高等級的交易安全，DUPE 嘟屁將「在台現貨」與「預購代購」嚴格區隔標示，並全面推行實名認證與當面點交機制。
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1.5">
                      <div className="text-xs font-bold text-[#7F0019]">01. 在台現貨快速寄出</div>
                      <div className="font-bold text-[#222222]">24～48 小時內安排出貨</div>
                      <p className="text-[11px] text-[#666666]">
                        凡左上角標示黑色【現貨】標籤之商品，皆代表實品已在台灣賣家手中，支援 7-11／全家店到店或郵寄宅配快速發貨，並提供最多 5 張實拍細節照供檢視。
                      </p>
                    </div>

                    <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1.5">
                      <div className="text-xs font-bold text-[#7F0019]">02. 當面點交驗貨零爭議</div>
                      <div className="font-bold text-[#222222]">公開預設面交自取地點</div>
                      <p className="text-[11px] text-[#666666]">
                        針對高單價精品包袋、3C 商務筆電或天然原石雅石，每個賣場均可公開標註「預設面交地點」（如：台北捷運小巨蛋站、松山站等），雙方當面清點物況再付款最安心。
                      </p>
                    </div>

                    <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1.5">
                      <div className="text-xs font-bold text-[#7F0019]">03. 防幽靈實名認證防線</div>
                      <div className="font-bold text-[#222222]">配合警政與司法調閱清冊</div>
                      <p className="text-[11px] text-[#666666]">
                        杜絕只留假信箱的幽靈帳號！全站會員皆須完成「真實姓名、身分證／居留證字號、行動電話與現居地址」實名登錄，遇有糾紛或詐欺案件，平台後台全力配合警方調閱偵辦。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 視窗底部：買家與賣家明確分流行動列 */}
            <div className="px-6 py-4 bg-[#FAF9F5] border-t border-[#E6E3DC] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Link
                  className="px-4 py-2 bg-[#222222] hover:bg-[#7F0019] text-white text-xs font-bold rounded-sm transition-colors"
                  href="/dashboard/store"
                >
                  我是賣家：前往賣家中心／蝦皮搬家
                </Link>
                <Link
                  className="px-4 py-2 border border-[#E6E3DC] bg-white hover:bg-[#FAF9F5] text-[#222222] text-xs font-medium rounded-sm"
                  href="/contact"
                >
                  與我們聯絡／客服留言板
                </Link>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const currentCard = PILLAR_CARDS.find((c) => c.key === activeModalKey);
                    const mode = currentCard ? currentCard.filterMode : 'all';
                    setActiveModalKey(null);
                    onApplyProductFilter(mode);
                  }}
                  className="px-4 py-2 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-bold rounded-sm transition-colors"
                >
                  🔍 篩選查看符合此機制之商品 →
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalKey(null)}
                  className="px-4 py-2 border border-[#E6E3DC] bg-white text-[#666666] hover:text-[#222222] text-xs rounded-sm"
                >
                  關閉視窗
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
