import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { decodeDescriptionAndMeta, calculateTaxBreakdown } from '@/lib/productMeta';

export const revalidate = 0;

interface ProductItem {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  product_variants?: Array<{ name: string; price: number; stock: number }>;
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
      description,
      price,
      images,
      product_variants (
        name,
        price,
        stock
      ),
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
          <p className="text-xs text-[#666666]">
            回歸物之本質・透明標示含稅／未稅價與二聯／三聯發票資訊・直接與賣家對接
          </p>
        </div>
        <Link
          className="text-xs px-3.5 py-2 bg-[#7F0019] hover:bg-[#660014] text-white rounded-sm font-medium transition-colors"
          href="/dashboard/products/new"
        >
          + 我要刊登
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white border border-[#E6E3DC] rounded-sm p-12 text-center space-y-3">
          <p className="text-sm text-[#222222] font-medium">目前尚無已刊登之商品</p>
          <p className="text-xs text-[#666666]">立即註冊並登入，即可 0 元免費上架您的第一個品項。</p>
          <div className="pt-2">
            <Link
              className="inline-block px-4 py-2 bg-[#7F0019] text-white text-xs font-medium rounded-sm"
              href="/auth"
            >
              登入以建立賣場
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map((item) => {
            const { meta } = decodeDescriptionAndMeta(item.description, item.product_variants);
            const taxInfo = calculateTaxBreakdown(item.price, meta.taxMode);
            return (
              <Link
                className="group block bg-white border border-[#E6E3DC] rounded-sm overflow-hidden hover:border-[#666666] transition-colors"
                href={`/products/${item.id}`}
                key={item.id}
              >
                <div className="relative aspect-square bg-[#FAF9F5] overflow-hidden flex items-center justify-center border-b border-[#E6E3DC]">
                  {item.images && item.images[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
                    />
                  ) : (
                    <span className="text-xs text-[#666666]">無商品圖片</span>
                  )}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 text-[10px] bg-white/90 border border-[#E6E3DC] text-[#222222] font-medium">
                      {meta.condition.split(' ')[0]}
                    </span>
                    {meta.invoiceCapability === 'invoice' && (
                      <span className="px-2 py-0.5 text-[10px] bg-[#7F0019] text-white font-medium">
                        可開發票(二聯/三聯)
                      </span>
                    )}
                    {meta.invoiceCapability === 'receipt' && (
                      <span className="px-2 py-0.5 text-[10px] bg-[#222222] text-white font-medium">
                        可開收據
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="text-[11px] text-[#666666] flex justify-between items-center">
                    <span>{item.stores?.name || '實名賣家'}</span>
                    <span>{item.stores?.meetup_location || '可洽詢交付'}</span>
                  </div>
                  <h2 className="text-sm font-medium text-[#222222] line-clamp-2 leading-snug">
                    {item.title}
                  </h2>
                  <div className="pt-1 border-t border-[#E6E3DC] flex items-baseline justify-between">
                    <div className="text-base font-bold text-[#7F0019]">
                      含稅 NT$ {taxInfo.taxIncludedPrice.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[#666666]">
                      未稅 ${taxInfo.taxExcludedPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
