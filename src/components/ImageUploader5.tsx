'use client';

import React, { useState, useRef } from 'react';

interface ImageUploader5Props {
  images: string[];
  onChange: (newImages: string[]) => void;
  maxImages?: number;
}

export default function ImageUploader5({
  images,
  onChange,
  maxImages = 5,
}: ImageUploader5Props) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 前端自動壓縮圖片，確保上傳極速且不超過 Serverless 限制
  const compressImageToBase64 = (file: File): Promise<{ base64: string; ext: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_SIDE = 1200;
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
          if (!ctx) return reject(new Error('無法建立圖片畫布'));
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64 = dataUrl.split(',')[1];
          resolve({ base64, ext: 'jpg' });
        };
        img.onerror = () => reject(new Error('圖片讀取失敗'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setErrorMsg(`最多僅能上傳 ${maxImages} 張商品照片`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setUploading(true);
    setErrorMsg(null);

    const uploadedUrls: string[] = [];
    for (const file of filesToProcess) {
      try {
        const { base64, ext } = await compressImageToBase64(file);
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
          uploadedUrls.push(result.url);
        } else {
          setErrorMsg(result.error || '圖片上傳失敗');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '上傳過程發生錯誤';
        setErrorMsg(msg);
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...images, ...uploadedUrls].slice(0, maxImages));
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddUrl = () => {
    const raw = urlInput.trim();
    if (!raw) return;
    if (images.length >= maxImages) {
      setErrorMsg(`已達 ${maxImages} 張照片上限`);
      return;
    }
    const newUrls = raw
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http'));

    if (newUrls.length === 0) {
      setErrorMsg('請輸入有效的 http:// 或 https:// 圖片網址');
      return;
    }

    const combined = [...images, ...newUrls].slice(0, maxImages);
    onChange(combined);
    setUrlInput('');
    setErrorMsg(null);
  };

  const handleRemove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const handleMove = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const temp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = temp;
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-bold text-[#222222]">
            商品展示照片（已設定 {images.length} / {maxImages} 張）
          </label>
          <p className="text-[11px] text-[#666666]">
            支援直接從電腦／手機上傳二手實拍照，或貼上外部圖片網址（第 1 張為封面主圖）
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading || images.length >= maxImages}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-[#7F0019] hover:bg-[#660014] text-white text-xs font-medium rounded-sm transition-colors disabled:opacity-40"
          >
            {uploading ? '圖片處理上傳中...' : '📷 選擇電腦 / 手機照片上傳'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 text-xs bg-[#FAF9F5] border border-[#7F0019] text-[#7F0019] rounded-sm">
          {errorMsg}
        </div>
      )}

      {/* 5 格照片預覽與排序列 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: maxImages }).map((_, slotIdx) => {
          const imgUrl = images[slotIdx];
          return (
            <div
              key={slotIdx}
              className={`relative aspect-square border rounded-sm overflow-hidden flex flex-col items-center justify-center bg-[#FAF9F5] ${
                imgUrl ? 'border-[#222222]' : 'border-dashed border-[#E6E3DC]'
              }`}
            >
              {imgUrl ? (
                <>
                  <img
                    src={imgUrl}
                    alt={`商品圖 ${slotIdx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-medium bg-[#222222]/80 text-white rounded-sm">
                    {slotIdx === 0 ? '封面主圖' : `圖 ${slotIdx + 1}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(slotIdx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-[#7F0019] text-white text-xs flex items-center justify-center rounded-sm hover:bg-red-800"
                    title="刪除此照片"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 flex justify-between px-2 py-1 text-[10px] text-white">
                    <button
                      type="button"
                      disabled={slotIdx === 0}
                      onClick={() => handleMove(slotIdx, -1)}
                      className="disabled:opacity-30 hover:underline"
                    >
                      ◀ 左移
                    </button>
                    <button
                      type="button"
                      disabled={slotIdx === images.length - 1}
                      onClick={() => handleMove(slotIdx, 1)}
                      className="disabled:opacity-30 hover:underline"
                    >
                      右移 ▶
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center text-[#666666] hover:text-[#222222] hover:bg-white/60 transition-colors p-2 text-center"
                >
                  <span className="text-lg mb-1">＋</span>
                  <span className="text-[11px]">
                    {slotIdx === 0 ? '上傳封面圖' : `照片欄位 ${slotIdx + 1}`}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 外部圖片網址輔助輸入區 */}
      {images.length < maxImages && (
        <div className="flex gap-2 pt-1">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="亦可直接貼上外部圖片網址 (https://...) 點擊右側加入"
            className="flex-1 px-3 py-1.5 text-xs border border-[#E6E3DC] rounded-sm bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#7F0019]"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-3 py-1.5 border border-[#222222] bg-white hover:bg-[#FAF9F5] text-[#222222] text-xs font-medium rounded-sm whitespace-nowrap"
          >
            + 加入圖片網址
          </button>
        </div>
      )}
    </div>
  );
}
