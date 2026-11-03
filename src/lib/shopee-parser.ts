export interface ConvertedProduct {
  title: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  variants: { name: string; price: number; stock: number }[];
}

export function parseShopeeCSV(csvContent: string): ConvertedProduct[] {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const titleIdx = headers.findIndex((h) => h.includes('商品名稱') || h.includes('Item Name'));
  const descIdx = headers.findIndex((h) => h.includes('商品描述') || h.includes('Description'));
  const priceIdx = headers.findIndex((h) => h.includes('價格') || h.includes('Price'));
  const stockIdx = headers.findIndex((h) => h.includes('數量') || h.includes('庫存') || h.includes('Stock'));
  const imgIdx = headers.findIndex((h) => h.includes('主圖') || h.includes('圖片') || h.includes('Image'));

  const results: ConvertedProduct[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (!cols[titleIdx]) continue;

    const rawPrice = Number(cols[priceIdx]) || 0;
    const rawStock = Number(cols[stockIdx]) || 0;
    const rawImage = cols[imgIdx] ? [cols[imgIdx]] : [];

    results.push({
      title: cols[titleIdx],
      description: cols[descIdx] || '',
      price: rawPrice,
      stock: rawStock,
      images: rawImage,
      variants: [
        {
          name: '預設規格',
          price: rawPrice,
          stock: rawStock,
        },
      ],
    });
  }

  return results;
}
