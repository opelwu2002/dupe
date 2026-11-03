CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 賣場資料表 (stores)
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    contact_line VARCHAR(100),
    contact_phone VARCHAR(50),
    meetup_location TEXT,
    custom_shipping_note TEXT,
    commission_rate NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 商品資料表 (products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL CHECK (price >= 0),
    images TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'sold_out', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 多規格資料表 (product_variants)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 效能索引
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON public.product_variants(product_id);

-- 啟用 RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS 策略：stores
CREATE POLICY "公開讀取有效賣場" ON public.stores FOR SELECT USING (is_active = TRUE);
CREATE POLICY "賣家管理自身賣場" ON public.stores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS 策略：products
CREATE POLICY "公開讀取已發布商品" ON public.products FOR SELECT USING (status = 'published');
CREATE POLICY "賣家管理自身商品" ON public.products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
);

-- RLS 策略：product_variants
CREATE POLICY "公開讀取規格" ON public.product_variants FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products WHERE products.id = product_variants.product_id AND products.status = 'published')
);
CREATE POLICY "賣家管理自身規格" ON public.product_variants FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.products 
        JOIN public.stores ON stores.id = products.store_id 
        WHERE products.id = product_variants.product_id AND stores.user_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.products 
        JOIN public.stores ON stores.id = products.store_id 
        WHERE products.id = product_variants.product_id AND stores.user_id = auth.uid()
    )
);
