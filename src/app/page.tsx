import { supabase, getServiceSupabase } from '@/lib/supabase';
import { DEFAULT_PORTAL_CONFIG, PortalConfig } from '@/lib/portalConfig';
import HomePortalClient, {
  PortalProductItem,
  PortalStoreItem,
} from '@/components/HomePortalClient';

export const revalidate = 0;

async function getInitialPortalConfig(): Promise<PortalConfig> {
  try {
    const adminSb = getServiceSupabase();
    const { data, error } = await adminSb.storage
      .from('product-images')
      .download('cms/portal_config.json');
    if (error || !data) return DEFAULT_PORTAL_CONFIG;
    const text = await data.text();
    const parsed = JSON.parse(text);
    return {
      ...DEFAULT_PORTAL_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_PORTAL_CONFIG;
  }
}

export default async function HomePage() {
  const [{ data: dbProducts }, { data: dbStores }, portalConfig] = await Promise.all([
    supabase
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
      .order('created_at', { ascending: false }),
    supabase.from('stores').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    getInitialPortalConfig(),
  ]);

  const products: PortalProductItem[] = (dbProducts as unknown as PortalProductItem[]) || [];
  const stores: PortalStoreItem[] = (dbStores as unknown as PortalStoreItem[]) || [];

  return (
    <HomePortalClient
      initialPortalConfig={portalConfig}
      initialProducts={products}
      initialStores={stores}
    />
  );
}
