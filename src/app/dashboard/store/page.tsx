'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function StoreManagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactLine, setContactLine] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [meetupLocation, setMeetupLocation] = useState('');
  const [customShippingNote, setCustomShippingNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadStore() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (store) {
        setStoreId(store.id);
        setName(store.name || '');
        setDescription(store.description || '');
        setContactLine(store.contact_line || '');
        setContactPhone(store.contact_phone || '');
        setMeetupLocation(store.meetup_location || '');
        setCustomShippingNote(store.custom_shipping_note || '');
      }
      setLoading(false);
    }
    loadStore();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name,
      description,
      contact_line: contactLine,
      contact_phone: contactPhone,
      meetup_location: meetupLocation,
      custom_shipping_note: customShippingNote,
      commission_rate: 0.000,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (storeId) {
      const { error } = await supabase.from('stores').update(payload).eq('id', storeId);
      if (error) setMessage(`更新失敗：${error.message}`);
      else setMessage('賣場資訊已成功更新！');
    } else {
      const { data, error } = await supabase.from('stores').insert([payload]).select().single();
      if (error) setMessage(`建立失敗：${error.message}`);
      else {
        setStoreId(data.id);
        setMessage('賣場已成功建立！');
      }
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-[#666666]">讀取賣場資訊中...</div>;
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white border border-[#E6E3DC] rounded-sm p-8 shadow-sm">
        <h1 className="text-lg font-bold text-[#222222] mb-1">
          {storeId ? '編輯賣場設定' : '建立我的賣場'}
        </h1>
        <p className="text-xs text-[#666666] mb-6">
          完善賣家聯絡方式與交易約定，讓買家能直接與您完成 P2P 聯繫。
        </p>

        {message && (
          <div className="mb-6 p-3 text-xs bg-[#FAF9F5] border border-[#E6E3DC] text-[#7F0019] rounded-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#666666] mb-1">賣場名稱 *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="例：原質日常工作室"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#666666] mb-1">賣場簡介</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="介紹您的賣場品項風格..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">LINE ID</label>
              <input
                type="text"
                value={contactLine}
                onChange={(e) => setContactLine(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                placeholder="供買家加好友私訊"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">聯絡電話</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
                placeholder="供買家通話約定"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#666666] mb-1">預設面交自取地點</label>
            <input
              type="text"
              value={meetupLocation}
              onChange={(e) => setMeetupLocation(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="例：台北捷運松山站 3 號出口"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#666666] mb-1">自訂交付 / 寄送備註</label>
            <input
              type="text"
              value={customShippingNote}
              onChange={(e) => setCustomShippingNote(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
              placeholder="例：7-11純取貨（運費60買方自理），亦可面交"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium tracking-wider rounded-sm transition-colors disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存賣場設定'}
          </button>
        </form>
      </div>
    </main>
  );
}
