import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: '嘟屁 (Dupe) - 極簡非對稱 P2P 拍賣資訊平台｜宇沛實業股份有限公司',
  description: '回歸質樸交易，無中介抽成、無官方金流綁定的點對點商品展示看板。宇沛實業股份有限公司(UPAY Medical Technology Corporation) Estd. 2024。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="bg-[#FAF9F5] text-[#222222] min-h-screen flex flex-col antialiased selection:bg-[#7F0019] selection:text-white">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-[#E6E3DC] bg-white py-8 mt-16 text-center">
          <div className="max-w-4xl mx-auto px-4 space-y-2">
            <p className="text-xs font-bold text-[#222222]">DUPE 嘟屁・極簡去中心化拍賣看板</p>
            <p className="text-xs font-bold text-[#7F0019]">
              宇沛實業股份有限公司(UPAY Medical Technology Corporation) Estd. 2024
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-[#666666] py-1">
              <Link className="hover:text-[#7F0019] underline" href="/">
                首頁看板
              </Link>
              <span>｜</span>
              <Link className="hover:text-[#7F0019] font-bold text-[#222222] underline" href="/contact">
                與我們聯絡・意見反映留言板
              </Link>
              <span>｜</span>
              <a href="mailto:opelwu2002@gmail.com" className="hover:text-[#7F0019] underline">
                客服與商務信箱：opelwu2002@gmail.com
              </a>
            </div>
            <p className="text-[11px] text-[#666666] leading-relaxed">
              免責聲明：本平台僅提供商品資訊刊登與展示看板服務，不提供線上代收金流、信用卡收單或官方派單物流服務。買賣雙方請自行聯繫約定交易與交付細節，本平台依法不承擔民事買賣履約與瑕疵擔保責任。
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
