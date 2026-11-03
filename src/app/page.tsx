import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const revalidate = 0; // 確保每次造訪皆取得最新刊登商品

interface ProductItem {
  id: string;
  title: string;
  price: number;
  images: string[];
  stores: {
    name: string;
    meetup_location: string;
  } | null;
}

export default async function HomePage() {
  const { data: dbProducts } = await supabase
    .from('products')
    .select(`
      id,
      title,
      price,
      images,
      stores (
        name,
        meetup_location
      )
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const products: ProductItem[] = (dbProducts as unknown as ProductItem[]) || [];

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10 text-left border-b border-[#E6E3DC] pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#222222] mb-1">精選刊登品項</h1>
          <p className="text-xs text-[#666666]">回歸物之本質・無刺眼推播廣告・直接與賣家對接</p>
        </div>
        <Link className="text-xs px-3 py-1.5 bg-[#7F0019] hover:bg-[#660014] text-white rounded-sm font-medium transition-colors" href="/dashboard/products/new">
          + 我要刊登
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white border border-[#E6E3DC] rounded-sm p-12 text-center space-y-3">
          <p className="text-sm text-[#222222] font-medium">目前尚無已刊登之商品</p>
          <p className="text-xs text-[#666666]">立即註冊並登入，即可 0 元免費上架您的第一個品項。</p>
          <div className="pt-2">
            <Link className="inline-block px-4 py-2 bg-[#7F0019] text-white text-xs font-medium rounded-sm" href="/auth">
              登入以建立賣場
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map((item) => (
            <Link
              className="group block bg-white border border-[#E6E3DC] rounded-sm overflow-hidden hover:border-[#666666] transition-colors"
              href={`/products/${item.id}`}
              key={item.id}
            >
              <div className="aspect-square bg-[#FAF9F5] overflow-hidden flex items-center justify-center border-b border-[#E6E3DC]">
                {item.images && item.images[0] ? (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
                  />
                ) : (
                  <span className="text-xs text-[#666666]">無商品圖片</span>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="text-[11px] text-[#666666] flex justify-between items-center">
                  <span>{item.stores?.name || '個人賣家'}</span>
                  <span>{item.stores?.meetup_location || '可洽詢約定'}</span>
                </div>
                <h2 className="text-sm font-medium text-[#222222] line-clamp-2 leading-snug">
                  {item.title}
                </h2>
                <div className="text-base font-bold text-[#222222] pt-1">
                  NT$ {item.price.toLocaleString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
