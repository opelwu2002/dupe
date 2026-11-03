import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

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
        <header className="border-b border-[#E6E3DC] bg-white sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link className="flex items-baseline space-x-2" href="/">
              <span className="text-xl font-bold tracking-wider text-[#7F0019]">DUPE</span>
              <span className="text-sm font-medium tracking-tight text-[#222222]">嘟屁</span>
            </Link>
            <nav className="flex items-center space-x-6 text-xs text-[#666666]">
              <span>零抽成看板</span>
              <span>純資訊媒合</span>
              <span className="px-2.5 py-1 bg-[#FAF9F5] border border-[#E6E3DC] text-[#222222] rounded-sm">
                MUJI 極簡風格
              </span>
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-[#E6E3DC] bg-white py-8 mt-16 text-center">
          <div className="max-w-4xl mx-auto px-4 space-y-2">
            <p className="text-xs font-medium text-[#222222]">DUPE 嘟屁・極簡去中心化拍賣看板</p>
            <p className="text-[11px] text-[#666666] leading-relaxed">
              免責聲明：本平台（Dupe 嘟屁）僅提供去中心化商品資訊刊登與 P2P 媒合展示看板，不介入買賣雙方實質交易、金流收付與商品交付流程，亦不承擔任何買賣履約保證與物之瑕疵擔保責任。
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
