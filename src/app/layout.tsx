import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: '嘟屁 (Dupe) - 極簡非對稱 P2P 拍賣資訊平台',
  description: '回歸質樸交易，無中介抽成、無官方金流綁定的點對點商品展示看板。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="bg-[#FAF9F5] text-[#222222] min-h-screen flex flex-col antialiased selection:bg-[#7F0019] selection:text-white">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-[#E6E3DC] bg-white py-8 mt-16 text-center">
          <div className="max-w-4xl mx-auto px-4 space-y-2">
            <p className="text-xs font-medium text-[#222222]">DUPE 嘟屁・極簡去中心化拍賣看板</p>
            <p className="text-[11px] text-[#666666] leading-relaxed">
              免責聲明：本平台僅提供商品資訊刊登與展示看板服務，不提供線上代收金流、信用卡收單或官方派單物流服務。買賣雙方請自行聯繫約定交易與交付細節，本平台依法不承擔民事買賣履約與瑕疵擔保責任。
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
