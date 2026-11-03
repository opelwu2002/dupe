-- 1. 實名制會員資料表 (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,          -- 真實姓名（警方調閱必要）
    id_card_number VARCHAR(20) NOT NULL,      -- 身分證字號 / 居留證號（實名防幽靈）
    phone VARCHAR(30) NOT NULL,               -- 認證行動電話
    address TEXT NOT NULL,                    -- 聯絡 / 戶籍地址
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user' | 'seller' | 'admin'
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    notes TEXT,                               -- 管理者後台備註
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_profiles_id_card ON public.profiles(id_card_number);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. 啟用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 一般使用者僅能查看與更新自身資料；Admin 與後台 API 可管理所有資料
CREATE POLICY "公開或本人讀取資料" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "本人新增自身資料" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "本人更新自身資料" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "全權允許管理員存取" ON public.profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
