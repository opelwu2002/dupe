import { supabase } from '@/lib/supabase';
import HomePortalClient, {
  PortalProductItem,
  PortalStoreItem,
} from '@/components/HomePortalClient';

export const revalidate = 0;

export default async function HomePage() {
  const { data: dbProducts } = await supabase
    .from('products')
    .select(`
      id,
      store_id,
      title,
      description,
      price,
      images,
      status,
      created_at,
      product_variants (
        name,
        price,
        stock
      ),
      stores (
        id,
        name,
        meetup_location,
        description,
        contact_line,
        custom_shipping_note
      )
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const { data: dbStores } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const products: PortalProductItem[] = (dbProducts as unknown as PortalProductItem[]) || [];
  const stores: PortalStoreItem[] = (dbStores as unknown as PortalStoreItem[]) || [];

  return <HomePortalClient initialProducts={products} initialStores={stores} />;
}
