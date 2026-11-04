'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ContactFaqItem,
  DEFAULT_CONTACT_PAGE_CONFIG,
  FeedbackTicket,
  PortalConfig,
} from '@/lib/portalConfig';

interface AdminContactSectionProps {
  portalConfig: PortalConfig;
  setPortalConfig: React.Dispatch<React.SetStateAction<PortalConfig>>;
  feedbackTickets: FeedbackTicket[];
  setFeedbackTickets: React.Dispatch<React.SetStateAction<FeedbackTicket[]>>;
  savingCms: boolean;
  onSavePortalConfig: (nextConfig: PortalConfig, msg?: string) => Promise<void>;
  showToast: (msg: string) => void;
}

export default function AdminContactSection({
  portalConfig,
  setPortalConfig,
  feedbackTickets,
  setFeedbackTickets,
  savingCms,
  onSavePortalConfig,
  showToast,
}: AdminContactSectionProps) {
  const [subTab, setSubTab] = useState<'tickets' | 'page_settings'>('tickets');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [ticketSearch, setTicketSearch] = useState('');
  const [replyingTicket, setReplyingTicket] = useState<FeedbackTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyIsPublic, setReplyIsPublic] = useState(true);

  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  const contactPage = portalConfig.contactPage || DEFAULT_CONTACT_PAGE_CONFIG;

  const filteredTickets = feedbackTickets.filter((t) => {
    const matchStatus = ticketFilter === 'all' || t.status === ticketFilter;
    const q = ticketSearch.toLowerCase();
    const matchQuery =
      !q ||
      t.subject.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const openReplyModal = (ticket: FeedbackTicket) => {
    setReplyingTicket(ticket);
    setReplyText(ticket.adminReply || '');
    setReplyIsPublic(ticket.isPublic);
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTicket) return;
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reply_feedback',
        payload: {
          id: replyingTicket.id,
          adminReply: replyText,
          isPublic: replyIsPublic,
          status: replyText.trim() ? 'replied' : 'pending',
        },
      }),
    });
    const result = await res.json();
    if (result.ok) {
      setFeedbackTickets(result.feedbackTickets || []);
      setReplyingTicket(null);
      showToast('官方管理員回覆已發布並同步至前台留言板！');
    } else {
      alert(`回覆失敗：${result.error}`);
    }
  };

  const handleDeleteTicket = async (id: string, subject: string) => {
    if (!confirm(`確定要刪除留言「${subject}」嗎？`)) return;
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_feedback', payload: { id } }),
    });
    const result = await res.json();
    if (result.ok) {
      setFeedbackTickets(result.feedbackTickets || []);
      showToast('留言已刪除');
    }
  };

  const handleAddFaq = async () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
    const nextFaq: ContactFaqItem = {
      id: `faq-${Date.now()}`,
      question: newFaqQuestion.trim(),
      answer: newFaqAnswer.trim(),
    };
    const nextConfig: PortalConfig = {
      ...portalConfig,
      contactPage: {
        ...contactPage,
        faqs: [...(contactPage.faqs || []), nextFaq],
      },
    };
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    await onSavePortalConfig(nextConfig, '已新增「與我們聯絡」常見問答 FAQ！');
  };

  const handleRemoveFaq = async (id: string) => {
    const nextConfig: PortalConfig = {
      ...portalConfig,
      contactPage: {
        ...contactPage,
        faqs: (contactPage.faqs || []).filter((f) => f.id !== id),
      },
    };
    await onSavePortalConfig(nextConfig, '已刪除該筆 FAQ！');
  };

  return (
    <div className="bg-white border border-[#E6E3DC] p-6 rounded-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E3DC] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#222222]">
            與我們聯絡 ＆ 平台意見反映留言板管理中心
          </h3>
          <p className="text-xs text-[#666666] mt-0.5">
            管理員可於此檢視買賣家在前台「與我們聯絡」提交之留言、直接撰寫官方回覆（即時顯示於前台留言板），並編輯宇沛實業公司資訊與常見問答。
          </p>
        </div>
        <Link
          href="/contact"
          target="_blank"
          className="px-3.5 py-2 bg-[#222222] text-white text-xs font-bold rounded-sm hover:bg-[#7F0019]"
        >
          ↗ 開新分頁預覽「與我們聯絡」前台
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#E6E3DC] pb-3 text-xs">
        <button
          type="button"
          onClick={() => setSubTab('tickets')}
          className={`px-4 py-2 rounded-sm font-bold ${
            subTab === 'tickets'
              ? 'bg-[#7F0019] text-white'
              : 'bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222]'
          }`}
        >
          A. 客服留言板與官方回覆管理 ({feedbackTickets.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('page_settings')}
          className={`px-4 py-2 rounded-sm font-bold ${
            subTab === 'page_settings'
              ? 'bg-[#7F0019] text-white'
              : 'bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222]'
          }`}
        >
          B. 「與我們聯絡」頁面內容與 FAQ 管理
        </button>
      </div>

      {subTab === 'tickets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              placeholder="搜尋留言主旨、反映人姓名、信箱或內容..."
              className="sm:col-span-2 px-3 py-2 text-xs border border-[#E6E3DC] bg-[#FAF9F5]"
            />
            <select
              value={ticketFilter}
              onChange={(e) => setTicketFilter(e.target.value as 'all' | 'pending' | 'replied')}
              className="px-3 py-2 text-xs border border-[#E6E3DC] bg-[#FAF9F5]"
            >
              <option value="all">全部留言 ({feedbackTickets.length})</option>
              <option value="pending">
                ⏳ 待回覆 ({feedbackTickets.filter((t) => t.status === 'pending').length})
              </option>
              <option value="replied">
                ✓ 已回覆 ({feedbackTickets.filter((t) => t.status === 'replied').length})
              </option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E3DC] pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#222222] text-white rounded-sm">
                      {t.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-sm ${
                        t.isPublic ? 'bg-blue-50 text-blue-800' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {t.isPublic ? '公開於留言板' : '私密留言'}
                    </span>
                    <span className="font-bold text-[#222222] text-sm">{t.subject}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-sm ${
                        t.status === 'replied'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {t.status === 'replied' ? '✓ 已回覆' : '⏳ 待處理回覆'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openReplyModal(t)}
                      className="px-3 py-1 bg-[#7F0019] text-white font-bold rounded-sm"
                    >
                      {t.adminReply ? '編輯官方回覆' : '撰寫官方回覆'}
                    </button>
                    <a
                      href={`mailto:${t.email}?subject=Re: 【DUPE嘟屁客服回覆】${t.subject}`}
                      className="px-2.5 py-1 border border-[#E6E3DC] bg-white text-[#222222] rounded-sm"
                    >
                      發信回覆
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteTicket(t.id, t.subject)}
                      className="px-2 py-1 text-[#7F0019] hover:underline"
                    >
                      刪除
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-[#666666] flex flex-wrap gap-4">
                  <span>
                    反映人：<strong className="text-[#222222]">{t.name}</strong>
                  </span>
                  <span>
                    信箱：<strong className="text-[#7F0019]">{t.email}</strong>
                  </span>
                  {t.phone && <span>電話：{t.phone}</span>}
                  <span>提交時間：{new Date(t.createdAt).toLocaleString('zh-TW')}</span>
                </div>

                <div className="p-3 bg-white border border-[#E6E3DC] rounded-sm text-[#222222] whitespace-pre-line">
                  {t.content}
                </div>

                {t.adminReply && (
                  <div className="p-3 bg-white border-l-4 border-[#7F0019] border border-[#E6E3DC] rounded-sm">
                    <div className="font-bold text-[#7F0019] mb-1">
                      ★ 官方回覆內容（已同步顯示於前台留言板）：
                    </div>
                    <div className="text-[#222222] whitespace-pre-line">{t.adminReply}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'page_settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-3">
            <h4 className="font-bold text-sm text-[#222222]">
              1. 營運公司主體、官方信箱與聯絡頁橫幅設定
            </h4>
            <div>
              <label className="block font-bold mb-1">營運公司法定名稱 *</label>
              <input
                type="text"
                value={contactPage.companyName}
                onChange={(e) =>
                  setPortalConfig({
                    ...portalConfig,
                    contactPage: { ...contactPage, companyName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">官方客服與商務聯絡信箱 *</label>
              <input
                type="email"
                value={contactPage.contactEmail}
                onChange={(e) =>
                  setPortalConfig({
                    ...portalConfig,
                    contactPage: { ...contactPage, contactEmail: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">服務時間說明</label>
              <input
                type="text"
                value={contactPage.serviceHours}
                onChange={(e) =>
                  setPortalConfig({
                    ...portalConfig,
                    contactPage: { ...contactPage, serviceHours: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">頁面主標題</label>
              <input
                type="text"
                value={contactPage.pageTitle}
                onChange={(e) =>
                  setPortalConfig({
                    ...portalConfig,
                    contactPage: { ...contactPage, pageTitle: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">頁面副標題說明</label>
              <textarea
                rows={2}
                value={contactPage.pageSubtitle}
                onChange={(e) =>
                  setPortalConfig({
                    ...portalConfig,
                    contactPage: { ...contactPage, pageSubtitle: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">聯絡頁置頂公告</label>
              <textarea
                rows={2}
                value={contactPage.announcement}
                onChange={(e) =>
                  setPortalConfig({
                    ...portalConfig,
                    contactPage: { ...contactPage, announcement: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
              />
            </div>
            <button
              type="button"
              disabled={savingCms}
              onClick={() =>
                onSavePortalConfig(portalConfig, '「與我們聯絡」頁面設定已更新並同步至前台！')
              }
              className="px-5 py-2 bg-[#7F0019] text-white font-bold rounded-sm"
            >
              {savingCms ? '儲存中...' : '儲存與我們聯絡頁面設定'}
            </button>
          </div>

          <div className="p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-3">
            <h4 className="font-bold text-sm text-[#222222]">2. 常見問題 (FAQ) 管理</h4>
            <div className="space-y-2 p-3 bg-white border border-[#E6E3DC] rounded-sm">
              <input
                type="text"
                value={newFaqQuestion}
                onChange={(e) => setNewFaqQuestion(e.target.value)}
                placeholder="新增常見問題標題（例：Q5. 如何申請企業大宗採購？）"
                className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
              />
              <textarea
                rows={2}
                value={newFaqAnswer}
                onChange={(e) => setNewFaqAnswer(e.target.value)}
                placeholder="輸入問題解答內容..."
                className="w-full px-2.5 py-1.5 border border-[#E6E3DC] bg-[#FAF9F5]"
              />
              <button
                type="button"
                onClick={handleAddFaq}
                className="px-3 py-1.5 bg-[#7F0019] text-white font-bold rounded-sm"
              >
                + 新增一筆 FAQ
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(contactPage.faqs || []).map((f) => (
                <div
                  key={f.id}
                  className="p-3 bg-white border border-[#E6E3DC] rounded-sm space-y-1"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-[#222222]">{f.question}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(f.id)}
                      className="text-[#7F0019] hover:underline whitespace-nowrap"
                    >
                      刪除
                    </button>
                  </div>
                  <p className="text-[#666666] leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 官方回覆彈窗 */}
      {replyingTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-xl rounded-sm p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-[#E6E3DC] pb-3">
              <h3 className="text-base font-bold text-[#222222]">
                撰寫官方管理員回覆（同步顯示於前台留言板）
              </h3>
              <button
                type="button"
                onClick={() => setReplyingTicket(null)}
                className="text-[#666666] hover:text-[#222222]"
              >
                ✕
              </button>
            </div>
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-1">
              <div className="font-bold text-[#222222]">
                [{replyingTicket.category}] {replyingTicket.subject}
              </div>
              <div className="text-[11px] text-[#666666]">
                反映人：{replyingTicket.name} ({replyingTicket.email})
              </div>
              <p className="text-[#222222] pt-1 whitespace-pre-line">{replyingTicket.content}</p>
            </div>
            <form onSubmit={handleSaveReply} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">
                  宇沛實業・DUPE 官方管理員回覆內容 *
                </label>
                <textarea
                  rows={5}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="請輸入專業、親切的官方回覆內容..."
                  className="w-full p-3 border border-[#E6E3DC] bg-[#FAF9F5]"
                />
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replyIsPublic}
                  onChange={(e) => setReplyIsPublic(e.target.checked)}
                  className="accent-[#7F0019]"
                />
                <span>公開顯示此筆留言與回覆於前台「與我們聯絡」留言板</span>
              </label>
              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E6E3DC]">
                <button
                  type="button"
                  onClick={() => setReplyingTicket(null)}
                  className="px-4 py-2 border border-[#E6E3DC]"
                >
                  取消
                </button>
                <button type="submit" className="px-5 py-2 bg-[#7F0019] text-white font-bold">
                  發布官方回覆
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
