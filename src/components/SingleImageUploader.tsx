'use client';

import React, { useRef, useState } from 'react';

interface SingleImageUploaderProps {
  label: string;
  imageUrl: string;
  onChange: (url: string) => void;
  aspectHint?: string;
}

export default function SingleImageUploader({
  label,
  imageUrl,
  onChange,
  aspectHint = '建議尺寸：1200 x 600 px 橫幅或高畫質主題圖',
}: SingleImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const compressBannerToBase64 = (file: File): Promise<{ base64: string; ext: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_SIDE = 1400;
          let width = img.width;
          let height = img.height;
          if (width > height && width > MAX_SIDE) {
            height = Math.round((height * MAX_SIDE) / width);
            width = MAX_SIDE;
          } else if (height > MAX_SIDE) {
            width = Math.round((width * MAX_SIDE) / height);
            height = MAX_SIDE;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('無法建立畫布'));
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve({ base64: dataUrl.split(',')[1], ext: 'jpg' });
        };
        img.onerror = () => reject(new Error('圖片解析失敗'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('讀取失敗'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const { base64, ext } = await compressBannerToBase64(file);
      const res = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_image',
          payload: { base64, ext, contentType: 'image/jpeg' },
        }),
      });
      const result = await res.json();
      if (result.ok && result.url) {
        onChange(result.url);
      } else {
        setErrorMsg(result.error || '上傳失敗');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '圖片上傳異常');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <label className="block text-xs font-bold text-[#222222]">{label}</label>
          <span className="text-[11px] text-[#666666]">{aspectHint}</span>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium rounded-sm disabled:opacity-50"
          >
            {uploading ? '上傳雲端中...' : '📷 選擇電腦／手機圖片上傳'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-2 text-xs bg-[#FAF9F5] border border-[#7F0019] text-[#7F0019]">
          {errorMsg}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => onChange(e.target.value)}
          placeholder="可直接貼上外部圖片連結 (https://...) 或點擊上方按鈕上傳圖片"
          className="flex-1 px-3 py-2 text-xs border border-[#E6E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
        />
      </div>

      {imageUrl && (
        <div className="relative h-32 w-full bg-[#222222] border border-[#E6E3DC] rounded-sm overflow-hidden flex items-center justify-center">
          <img src={imageUrl} alt="預覽圖" className="w-full h-full object-cover opacity-90" />
          <span className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/70 text-white text-[10px] rounded-sm">
            即時預覽
          </span>
        </div>
      )}
    </div>
  );
}
