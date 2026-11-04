'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  ContactPageConfig,
  DEFAULT_CONTACT_PAGE_CONFIG,
  FeedbackTicket,
} from '@/lib/portalConfig';

const FEEDBACK_CATEGORIES: Array<FeedbackTicket['category']> = [
  '一般平台諮詢',
  '賣場與商品刊登問題',
  '預購代購與退費申訴',
  '企業採購與合作提案',
  '檢舉違規與警政協查',
];

export default function ContactPage() {
  const [contactConfig, setContactConfig] = useState<ContactPageConfig>(
    DEFAULT_CONTACT_PAGE_CONFIG
  );
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // 表單欄位
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<FeedbackTicket['category']>('一般平台諮詢');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  // 留言板查詢關鍵字（可依主旨或自己的信箱查詢私密留言回覆）
  const [boardSearch, setBoardSearch] = useState('');

  const loadContactData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_contact_and_feedback' }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.contactPage) setContactConfig(data.contactPage);
        if (data.feedbackTickets) setTickets(data.feedbackTickets);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadContactData();
    // 若已登入會員，自動帶入實名姓名、信箱與電話
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = user.user_metadata || {};
        if (meta.full_name) setName(meta.full_name);
        if (user.email) setEmail(user.email);
        if (meta.phone) setPhone(meta.phone);
      }
    });
  }, [loadContactData]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(contactConfig.contactEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const res = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_feedback',
          payload: {
            name,
            email,
            phone,
            category,
            subject,
            content,
            isPublic,
          },
        }),
      });
      const result = await res.json();
      if (result.ok) {
        setSubmitMessage(
          '✓ 您的意見與留言已成功送出！管理團隊將於後台審閱並直接於下方留言板或透過信箱回覆您。'
        );
        setSubject('');
        setContent('');
        if (result.feedbackTickets) {
          setTickets(result.feedbackTickets);
        }
      } else {
        setSubmitMessage(`送出失敗：${result.error}`);
      }
    } catch {
      setSubmitMessage('網路連線異常，請稍後再試或直接來信 opelwu2002@gmail.com');
    }
    setSubmitting(false);
  };

  // 顯示公開留言，或當使用者輸入自己的 Email 時可一併查閱自己的非公開留言與官方回覆
  const visibleTickets = tickets.filter((t) => {
    const q = boardSearch.trim().toLowerCase();
    const isOwnerSearching = q && t.email.toLowerCase() === q;
    if (!t.isPublic && !isOwnerSearching) return false;
    if (!q) return true;
    return (
      t.subject.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.adminReply || '').toLowerCase().includes(q) ||
      isOwnerSearching
    );
  });

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      {/* 頂部企業形象與標題橫幅 */}
      <section className="bg-white border border-[#E6E3DC] rounded-sm p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6E3DC] pb-5">
          <div>
            <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-widest bg-[#7F0019] text-white rounded-sm mb-2">
              CONTACT & SUPPORT CENTER
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#222222]">
              {contactConfig.pageTitle}
            </h1>
            <p className="text-xs text-[#666666] mt-1.5 leading-relaxed max-w-3xl">
              {contactConfig.pageSubtitle}
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              className="inline-block px-4 py-2 border border-[#E6E3DC] bg-[#FAF9F5] hover:bg-white text-xs font-medium text-[#222222] rounded-sm"
              href="/"
            >
              ← 返回拍賣首頁
            </Link>
          </div>
        </div>

        {/* 官方營運主體與聯絡信箱卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-xs">
          <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1.5">
            <div className="text-[11px] text-[#666666]">營運管理機構</div>
            <div className="font-bold text-[#222222] text-sm leading-snug">
              {contactConfig.companyName}
            </div>
            <div className="text-[11px] text-[#666666] pt-1">
              {contactConfig.headquartersNote}
            </div>
          </div>

          <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1.5">
            <div className="text-[11px] text-[#666666]">官方客服與商務聯絡信箱</div>
            <div className="font-bold text-[#7F0019] text-sm font-mono">
              {contactConfig.contactEmail}
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={handleCopyEmail}
                className="px-2.5 py-1 bg-white border border-[#E6E3DC] hover:border-[#7F0019] text-[11px] font-medium rounded-sm"
              >
                {copiedEmail ? '✓ 已複製信箱' : '複製信箱'}
              </button>
              <a
                href={`mailto:${contactConfig.contactEmail}?subject=【DUPE嘟屁平台洽詢】`}
                className="px-2.5 py-1 bg-[#7F0019] text-white text-[11px] font-medium rounded-sm"
              >
                直接發送郵件
              </a>
            </div>
          </div>

          <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1.5">
            <div className="text-[11px] text-[#666666]">服務時間與處理時效</div>
            <div className="font-bold text-[#222222] leading-snug">
              {contactConfig.serviceHours}
            </div>
            <div className="text-[11px] text-[#666666] pt-1">
              一般諮詢與合作提案約 1 個工作天內於留言板或信箱回覆。
            </div>
          </div>
        </div>

        {contactConfig.announcement && (
          <div className="mt-4 p-3.5 bg-[#FAF9F5] border-l-4 border-[#7F0019] text-xs text-[#222222] leading-relaxed">
            <strong>官方服務公告：</strong>
            {contactConfig.announcement}
          </div>
        )}
      </section>

      {/* 中段雙欄：左側「常見問題與三大服務專責說明」 ＋ 右側「線上意見反映與客服留言表單」 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 左欄：服務專責說明與 FAQ */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-[#E6E3DC] rounded-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
              三大服務與專案窗口說明
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1">
                <div className="font-bold text-[#222222]">
                  1. 實名制賣場開立與買賣家諮詢窗口
                </div>
                <p className="text-[#666666] leading-relaxed">
                  協助賣家完成實名認證、開立零抽成賣場、5 張實拍照片上傳、多規格含稅／未稅設定，以及預購／代購沒買到退費保障機制設定。
                </p>
              </div>
              <div className="p-3.5 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1">
                <div className="font-bold text-[#222222]">
                  2. 企業 B2B 採購、二／三聯發票報帳與跨界合作提案
                </div>
                <p className="text-[#666666] leading-relaxed">
                  宇沛實業股份有限公司歡迎各大品牌商、日貨批發、工程與長照設備供應商進駐合作，或透過 opelwu2002@gmail.com 洽談專案合作。
                </p>
              </div>
              <div className="p-3.5 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1">
                <div className="font-bold text-[#7F0019]">
                  3. 交易糾紛申訴與警政／司法機關實名調閱窗口
                </div>
                <p className="text-[#666666] leading-relaxed">
                  若遇賣家違反「預購／代購未買到全額退費承諾」或疑似交易詐欺，請於右側表單選擇「檢舉違規與警政協查」，本平台將全力配合司法警察機關調閱實名清冊。
                </p>
              </div>
            </div>
          </div>

          {/* 常見問題 FAQ */}
          <div className="bg-white border border-[#E6E3DC] rounded-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
              常見問題與交易保障指南 (FAQ)
            </h2>
            <div className="space-y-3">
              {(contactConfig.faqs || []).map((faq) => (
                <div
                  key={faq.id}
                  className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1.5 text-xs"
                >
                  <div className="font-bold text-[#222222]">{faq.question}</div>
                  <p className="text-[#666666] leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右欄：線上意見反映與客服留言表單 */}
        <div className="lg:col-span-6 bg-white border border-[#E6E3DC] rounded-sm p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5 mb-1">
            線上意見反映與客服留言單
          </h2>
          <p className="text-xs text-[#666666] mb-6">
            填寫後將直接同步至平台管理後台，管理員回覆後您可於下方留言板或透過信箱查看。
          </p>

          {submitMessage && (
            <div className="mb-5 p-3.5 text-xs bg-[#FAF9F5] border border-[#7F0019] text-[#7F0019] font-medium rounded-sm">
              {submitMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#222222] mb-1">
                  您的姓名 / 稱呼 <span className="text-[#7F0019]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：吳先生 / 日貨小判"
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#222222] mb-1">
                  聯絡電話（選填，加速聯繫）
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="例：0911-xxx-xxx"
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#222222] mb-1">
                  聯絡電子信箱 <span className="text-[#7F0019]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#222222] mb-1">
                  反映與洽詢類別 <span className="text-[#7F0019]">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FeedbackTicket['category'])}
                  className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
                >
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#222222] mb-1">
                留言主旨 <span className="text-[#7F0019]">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="請簡述您的問題、建議或合作主旨..."
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#222222] mb-1">
                詳細反映內容 <span className="text-[#7F0019]">*</span>
              </label>
              <textarea
                rows={5}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="請詳述您的問題、相關賣場或商品名稱，管理員將儘速為您處理並回覆..."
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              />
            </div>

            <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="accent-[#7F0019]"
                />
                <span className="text-[#222222] font-medium">
                  公開顯示於下方「平台留言板」（若涉及個人隱私或檢舉可取消勾選，改為私密留言）
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-bold tracking-wider rounded-sm transition-colors disabled:opacity-50"
            >
              {submitting ? '正在傳送留言至管理後台...' : '確認送出意見反映留言'}
            </button>
          </form>
        </div>
      </div>

      {/* 底段：平台意見反映留言板與官方回覆紀錄 */}
      <section className="bg-white border border-[#E6E3DC] rounded-sm p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E3DC] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#222222] border-l-4 border-[#7F0019] pl-2.5">
              平台意見反映留言板 ＆ 官方管理員回覆紀錄
            </h2>
            <p className="text-xs text-[#666666] mt-1">
              公開透明呈現買賣家常見諮詢與宇沛實業管理團隊之官方處理回覆（若為私密留言，可輸入您的完整 Email 查詢回覆）。
            </p>
          </div>
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
              placeholder="搜尋留言關鍵字或輸入您的 Email 查詢..."
              className="w-full px-3 py-2 text-xs border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#666666]">載入留言板紀錄中...</div>
        ) : visibleTickets.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#666666]">
            目前尚無符合條件之留言紀錄
          </div>
        ) : (
          <div className="space-y-4">
            {visibleTickets.map((t) => (
              <div
                key={t.id}
                className="p-5 bg-[#FAF9F5]/60 border border-[#E6E3DC] rounded-sm space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E3DC] pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#222222] text-white rounded-sm">
                      {t.category}
                    </span>
                    {!t.isPublic && (
                      <span className="px-2 py-0.5 text-[10px] bg-amber-800 text-white rounded-sm">
                        私密留言（本人檢視）
                      </span>
                    )}
                    <span className="font-bold text-[#222222] text-sm">{t.subject}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-[#666666]">
                    <span>反映人：{t.name}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString('zh-TW')}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-sm ${
                        t.status === 'replied'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {t.status === 'replied' ? '✓ 官方已回覆' : '⏳ 待管理員回覆'}
                    </span>
                  </div>
                </div>

                <div className="text-[#222222] leading-relaxed whitespace-pre-line">
                  {t.content}
                </div>

                {t.adminReply && (
                  <div className="mt-3 p-4 bg-white border-l-4 border-[#7F0019] border border-[#E6E3DC] rounded-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#7F0019]">
                        ★ 宇沛實業・DUPE 平台管理團隊官方回覆：
                      </span>
                      {t.repliedAt && (
                        <span className="text-[10px] text-[#666666]">
                          回覆時間：{new Date(t.repliedAt).toLocaleString('zh-TW')}
                        </span>
                      )}
                    </div>
                    <p className="text-[#222222] leading-relaxed whitespace-pre-line">
                      {t.adminReply}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
