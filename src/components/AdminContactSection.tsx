'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ContactPageConfig,
  ContactFaqItem,
  DEFAULT_CONTACT_PAGE_CONFIG,
  FeedbackTicket,
  PortalConfig,
} from '@/lib/portalConfig';

interface AdminContactSectionProps {
  portalConfig: PortalConfig;
  onSavePortalConfig: (next: PortalConfig, msg: string) => Promise<void>;
  feedbackTickets?: FeedbackTicket[];
  setFeedbackTickets?: React.Dispatch<React.SetStateAction<FeedbackTicket[]>>;
  savingCms?: boolean;
  setPortalConfig?: React.Dispatch<React.SetStateAction<PortalConfig>>;
  showToast?: (msg: string) => void;
}

export default function AdminContactSection({
  portalConfig,
  onSavePortalConfig,
  feedbackTickets: externalTickets,
  setFeedbackTickets: setExternalTickets,
  savingCms,
  showToast,
}: AdminContactSectionProps) {
  const [subTab, setSubTab] = useState<'tickets' | 'config'>('config');
  const [tickets, setTickets] = useState<FeedbackTicket[]>(externalTickets || []);
  const [contactForm, setContactForm] = useState<ContactPageConfig>(
    portalConfig.contactPage || DEFAULT_CONTACT_PAGE_CONFIG
  );

  // 新增 FAQ 狀態
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  // 修改現有 FAQ 狀態
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editFaqQ, setEditFaqQ] = useState('');
  const [editFaqA, setEditFaqA] = useState('');

  // 留言回覆彈窗狀態
  const [replyingTicket, setReplyingTicket] = useState<FeedbackTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyPublic, setReplyPublic] = useState(true);

  useEffect(() => {
    if (portalConfig.contactPage) {
      setContactForm({
        ...DEFAULT_CONTACT_PAGE_CONFIG,
        ...portalConfig.contactPage,
        faqs: Array.isArray(portalConfig.contactPage.faqs)
          ? portalConfig.contactPage.faqs
          : DEFAULT_CONTACT_PAGE_CONFIG.faqs,
      });
    }
  }, [portalConfig.contactPage]);

  const loadTickets = useCallback(async () => {
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_contact_and_feedback' }),
    });
    const data = await res.json();
    if (data.ok && data.feedbackTickets) {
      setTickets(data.feedbackTickets);
      if (setExternalTickets) setExternalTickets(data.feedbackTickets);
    }
  }, [setExternalTickets]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const saveContactConfigWithFaqs = async (nextFaqs: ContactFaqItem[], toastMsg: string) => {
    const updatedContact: ContactPageConfig = {
      ...contactForm,
      faqs: nextFaqs,
    };
    setContactForm(updatedContact);
    await onSavePortalConfig({ ...portalConfig, contactPage: updatedContact }, toastMsg);
  };

  // 新增一筆 FAQ
  const handleAddFaq = async () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) {
      alert('請填寫問題標題與解答內容');
      return;
    }
    const nextFaqs: ContactFaqItem[] = [
      ...(contactForm.faqs || []),
      {
        id: `faq-${Date.now()}`,
        question: newFaqQ.trim(),
        answer: newFaqA.trim(),
      },
    ];
    setNewFaqQ('');
    setNewFaqA('');
    await saveContactConfigWithFaqs(nextFaqs, '已新增 FAQ 並同步至前台！');
  };

  // 啟動編輯指定 FAQ
  const startEditFaq = (faq: ContactFaqItem) => {
    setEditingFaqId(faq.id);
    setEditFaqQ(faq.question);
    setEditFaqA(faq.answer);
  };

  // 儲存修改後的 FAQ
  const handleSaveFaqEdit = async (id: string) => {
    if (!editFaqQ.trim() || !editFaqA.trim()) {
      alert('問題標題與解答內容不可為空');
      return;
    }
    const nextFaqs = (contactForm.faqs || []).map((f) =>
      f.id === id ? { ...f, question: editFaqQ.trim(), answer: editFaqA.trim() } : f
    );
    setEditingFaqId(null);
    await saveContactConfigWithFaqs(
      nextFaqs,
      'FAQ 修改已儲存並同步至前台「與我們聯絡」頁面！'
    );
  };

  // 上下移動排序 FAQ
  const handleMoveFaq = async (idx: number, dir: -1 | 1) => {
    const list = [...(contactForm.faqs || [])];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    await saveContactConfigWithFaqs(list, 'FAQ 順序已更新！');
  };

  // 刪除指定 FAQ
  const handleDeleteFaq = async (id: string, qTitle: string) => {
    if (!confirm(`確定要刪除常見問題「${qTitle}」嗎？`)) return;
    const nextFaqs = (contactForm.faqs || []).filter((f) => f.id !== id);
    await saveContactConfigWithFaqs(nextFaqs, '該筆 FAQ 已刪除！');
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTicket) return;
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reply_feedback',
        payload: {
          id: replyingTicket.id,
          adminReply: replyText.trim(),
          status: 'replied',
          isPublic: replyPublic,
        },
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setTickets(data.feedbackTickets || []);
      if (setExternalTickets) setExternalTickets(data.feedbackTickets || []);
      setReplyingTicket(null);
      if (showToast) showToast('官方管理員回覆已發布並同步至前台留言板！');
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm('確定要刪除此則留言嗎？')) return;
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_feedback', payload: { id } }),
    });
    const data = await res.json();
    if (data.ok) {
      setTickets(data.feedbackTickets || []);
      if (setExternalTickets) setExternalTickets(data.feedbackTickets || []);
      if (showToast) showToast('留言已刪除');
    }
  };

  return (
    <div className="bg-white border border-[#E6E3DC] p-6 rounded-sm space-y-5 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E3DC] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#222222]">
            與我們聯絡 ＆ 平台意見反映留言管理中心
          </h3>
          <p className="text-[#666666] mt-0.5">
            管理員可於此檢視買賣家在前台「與我們聯絡」提交之留言、直接撰寫官方回覆，並新增／修改／排序宇沛實業公司資訊與常見問答 (FAQ)。
          </p>
        </div>
        <Link
          className="px-3.5 py-2 bg-[#222222] hover:bg-[#7F0019] text-white font-medium rounded-sm whitespace-nowrap"
          href="/contact"
          target="_blank"
        >
          ↗ 開新分頁預覽「與我們聯絡」前台
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#E6E3DC] pb-3">
        <button
          type="button"
          onClick={() => setSubTab('tickets')}
          className={`px-4 py-2 font-bold rounded-sm transition-colors ${
            subTab === 'tickets'
              ? 'bg-[#7F0019] text-white'
              : 'bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222]'
          }`}
        >
          A. 客服留言板與官方回覆管理 ({tickets.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('config')}
          className={`px-4 py-2 font-bold rounded-sm transition-colors ${
            subTab === 'config'
              ? 'bg-[#7F0019] text-white'
              : 'bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222]'
          }`}
        >
          B. 「與我們聯絡」頁面內容與 FAQ 管理（支援修改/排序/刪除）
        </button>
      </div>

      {subTab === 'tickets' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6E3DC] bg-[#FAF9F5] text-[#666666]">
                <th className="p-3">類別 / 狀態</th>
                <th className="p-3">反映人 / 聯絡信箱</th>
                <th className="p-3">主旨與留言內容</th>
                <th className="p-3">官方回覆內容</th>
                <th className="p-3 text-right">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E3DC]">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-[#FAF9F5]/60">
                  <td className="p-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#222222] text-white rounded-sm">
                      {t.category}
                    </span>
                    <div className="text-[11px] text-[#666666] mt-1">
                      {t.isPublic ? '🌐 公開留言' : '🔒 私密留言'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-[#222222]">{t.name}</div>
                    <div className="text-[#7F0019]">{t.email}</div>
                    {t.phone && <div className="text-[11px] text-[#666666]">{t.phone}</div>}
                  </td>
                  <td className="p-3 max-w-xs">
                    <div className="font-bold text-[#222222]">{t.subject}</div>
                    <div className="text-[#666666] line-clamp-2 mt-0.5">{t.content}</div>
                  </td>
                  <td className="p-3 max-w-xs">
                    {t.adminReply ? (
                      <div className="text-emerald-800 font-medium line-clamp-2">
                        ✓ {t.adminReply}
                      </div>
                    ) : (
                      <span className="text-amber-700 font-medium">⏳ 待管理員回覆</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTicket(t);
                        setReplyText(t.adminReply || '');
                        setReplyPublic(t.isPublic);
                      }}
                      className="px-3 py-1 bg-[#7F0019] text-white font-bold rounded-sm"
                    >
                      {t.adminReply ? '修改回覆' : '撰寫回覆'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTicket(t.id)}
                      className="px-2 py-1 text-[#7F0019] hover:underline"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 左側：營運公司主體與聯絡頁設定 */}
          <div className="lg:col-span-5 p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-3">
            <h4 className="font-bold text-sm text-[#222222]">
              1. 營運公司主體、官方信箱與聯絡頁橫幅設定
            </h4>
            <div>
              <label className="block font-bold mb-1">營運公司法定名稱 *</label>
              <input
                type="text"
                value={contactForm.companyName}
                onChange={(e) => setContactForm({ ...contactForm, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white font-bold text-[#7F0019]"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">官方客服與商務聯絡信箱 *</label>
              <input
                type="email"
                value={contactForm.contactEmail}
                onChange={(e) => setContactForm({ ...contactForm, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">服務時間說明</label>
              <input
                type="text"
                value={contactForm.serviceHours}
                onChange={(e) => setContactForm({ ...contactForm, serviceHours: e.target.value })}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">頁面主標題</label>
              <input
                type="text"
                value={contactForm.pageTitle}
                onChange={(e) => setContactForm({ ...contactForm, pageTitle: e.target.value })}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">頁面副標題說明</label>
              <textarea
                rows={3}
                value={contactForm.pageSubtitle}
                onChange={(e) => setContactForm({ ...contactForm, pageSubtitle: e.target.value })}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">聯絡頁置頂公告</label>
              <textarea
                rows={2}
                value={contactForm.announcement}
                onChange={(e) => setContactForm({ ...contactForm, announcement: e.target.value })}
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-white"
              />
            </div>
            <button
              type="button"
              disabled={savingCms}
              onClick={() =>
                onSavePortalConfig(
                  { ...portalConfig, contactPage: contactForm },
                  '「與我們聯絡」頁面設定已同步更新！'
                )
              }
              className="px-5 py-2.5 bg-[#7F0019] hover:bg-[#660014] text-white font-bold rounded-sm"
            >
              {savingCms ? '儲存中...' : '儲存與我們聯絡頁面設定'}
            </button>
          </div>

          {/* 右側：常見問題 (FAQ) 管理（含新增、修改、上下排序、刪除） */}
          <div className="lg:col-span-7 p-4 bg-[#FAF9F5] border border-[#E6E3DC] rounded-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-[#222222]">
                2. 常見問題 (FAQ) 管理（支援新增、直接修改、排序與刪除）
              </h4>
              <span className="text-[11px] text-[#666666]">
                共 {(contactForm.faqs || []).length} 題
              </span>
            </div>

            {/* 新增 FAQ 輸入框 */}
            <div className="p-3.5 bg-white border border-[#E6E3DC] rounded-sm space-y-2.5">
              <div className="font-bold text-[#7F0019]">＋ 新增一筆常見問答</div>
              <input
                type="text"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                placeholder="新增常見問題標題（例：Q5. 如何申請企業大宗採購？）"
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white"
              />
              <textarea
                rows={2}
                value={newFaqA}
                onChange={(e) => setNewFaqA(e.target.value)}
                placeholder="輸入問題解答內容..."
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddFaq}
                className="px-4 py-1.5 bg-[#7F0019] hover:bg-[#660014] text-white font-bold rounded-sm"
              >
                + 新增一筆 FAQ
              </button>
            </div>

            {/* 現有 FAQ 列表（每筆皆可點擊「修改」展開編輯） */}
            <div className="space-y-3">
              {(contactForm.faqs || []).map((faq, idx) => {
                const isEditing = editingFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`p-4 bg-white border rounded-sm space-y-2 ${
                      isEditing ? 'border-2 border-[#7F0019]' : 'border-[#E6E3DC]'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#7F0019]">
                            ✎ 正在修改第 {idx + 1} 題 FAQ
                          </span>
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#666666] mb-1">
                            問題標題 (Question) *
                          </label>
                          <input
                            type="text"
                            value={editFaqQ}
                            onChange={(e) => setEditFaqQ(e.target.value)}
                            className="w-full px-3 py-2 font-bold border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#666666] mb-1">
                            解答內容 (Answer) *
                          </label>
                          <textarea
                            rows={4}
                            value={editFaqA}
                            onChange={(e) => setEditFaqA(e.target.value)}
                            className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white leading-relaxed"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingFaqId(null)}
                            className="px-3.5 py-1.5 border border-[#E6E3DC] bg-white text-[#666666] hover:text-[#222222] rounded-sm"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveFaqEdit(faq.id)}
                            className="px-4 py-1.5 bg-[#7F0019] hover:bg-[#660014] text-white font-bold rounded-sm"
                          >
                            ✓ 儲存修改並同步前台
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-bold text-[#222222] text-xs leading-snug">
                            {faq.question}
                          </div>
                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveFaq(idx, -1)}
                              className="px-1.5 py-0.5 border border-[#E6E3DC] bg-[#FAF9F5] disabled:opacity-30"
                              title="上移"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === (contactForm.faqs || []).length - 1}
                              onClick={() => handleMoveFaq(idx, 1)}
                              className="px-1.5 py-0.5 border border-[#E6E3DC] bg-[#FAF9F5] disabled:opacity-30"
                              title="下移"
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditFaq(faq)}
                              className="px-2.5 py-1 border border-[#222222] bg-white hover:bg-[#FAF9F5] text-[#222222] font-bold rounded-sm"
                            >
                              修改
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFaq(faq.id, faq.question)}
                              className="px-2 py-1 text-[#7F0019] hover:underline font-medium"
                            >
                              刪除
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-[#666666] leading-relaxed whitespace-pre-line">
                          {faq.answer}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {replyingTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E3DC] w-full max-w-lg p-6 rounded-sm space-y-3">
            <h4 className="font-bold text-sm">回覆留言：{replyingTicket.subject}</h4>
            <p className="p-2.5 bg-[#FAF9F5] border border-[#E6E3DC] text-[#666666]">
              {replyingTicket.content}
            </p>
            <form onSubmit={handleSendReply} className="space-y-3">
              <textarea
                rows={4}
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="輸入官方回覆內容..."
                className="w-full px-3 py-2 border border-[#E6E3DC] bg-[#FAF9F5]"
              />
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={replyPublic}
                  onChange={(e) => setReplyPublic(e.target.checked)}
                />
                <span>公開顯示於前台留言板</span>
              </label>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReplyingTicket(null)}
                  className="px-4 py-1.5 border border-[#E6E3DC]"
                >
                  取消
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[#7F0019] text-white font-bold">
                  送出官方回覆
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
