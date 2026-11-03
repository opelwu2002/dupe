import Link from 'next/link';

interface MockProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  storeName: string;
  location: string;
}

const mockProducts: MockProduct[] = [
  {
    id: 'prod-001',
    title: '無染色純棉收納袋 / 輕量多功能置物袋',
    price: 350,
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    storeName: '原質日常工作室',
    location: '台北市・捷運松山站',
  },
  {
    id: 'prod-002',
    title: '白瓷圓口茶杯・自然燒結霧面款 (兩件組)',
    price: 480,
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
    storeName: '山林器物舍',
    location: '台中市・可店到店',
  },
  {
    id: 'prod-003',
    title: '極簡櫸木桌面立架・平板與筆記本通用',
    price: 620,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
    storeName: '木質思維工作室',
    location: '新北市・板橋面交',
  },
];

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10 text-left border-b border-[#E6E3DC] pb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#222222] mb-1">精選刊登品項</h1>
        <p className="text-xs text-[#666666]">回歸物之本質・無刺眼推播廣告・直接與賣家對接</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {mockProducts.map((item) => (
          <Link
            className="group block bg-white border border-[#E6E3DC] rounded-sm overflow-hidden hover:border-[#666666] transition-colors"
            href={`/products/${item.id}`}
            key={item.id}
          >
            <div className="aspect-square bg-[#FAF9F5] overflow-hidden flex items-center justify-center border-b border-[#E6E3DC]">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
              />
            </div>
            <div className="p-4 space-y-2">
              <div className="text-[11px] text-[#666666] flex justify-between items-center">
                <span>{item.storeName}</span>
                <span>{item.location}</span>
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
    </main>
  );
}
