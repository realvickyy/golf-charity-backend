CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT CHECK (plan IN ('monthly','yearly')),
  status TEXT DEFAULT 'inactive' 
    CHECK (status IN ('active','inactive','lapsed','cancelled')),
  amount NUMERIC NOT NULL,
  start_date TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 1 AND score <= 45),
  played_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE charities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  website TEXT,
  featured BOOLEAN DEFAULT false,
  events JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE charity_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  charity_id UUID REFERENCES charities(id),
  percentage NUMERIC DEFAULT 10 
    CHECK (percentage >= 10 AND percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  status TEXT DEFAULT 'draft' 
    CHECK (status IN ('draft','simulated','published')),
  winning_numbers JSONB,
  jackpot_amount NUMERIC DEFAULT 0,
  jackpot_rollover BOOLEAN DEFAULT false,
  total_pool NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE draw_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID REFERENCES draws(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  numbers JSONB NOT NULL,
  matched INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID REFERENCES draws(id),
  user_id UUID REFERENCES profiles(id),
  tier INTEGER CHECK (tier IN (3,4,5)),
  prize_amount NUMERIC DEFAULT 0,
  proof_url TEXT,
  verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status 
      IN ('pending','approved','rejected')),
  payout_status TEXT DEFAULT 'pending'
    CHECK (payout_status IN ('pending','paid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prize_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID REFERENCES draws(id),
  tier_5_pool NUMERIC DEFAULT 0,
  tier_4_pool NUMERIC DEFAULT 0,
  tier_3_pool NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_pools ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION expire_lapsed_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'lapsed'
  WHERE status = 'active'
    AND renewal_date IS NOT NULL
    AND renewal_date < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'expire-lapsed-subscriptions',     
  '0 0 * * *',
  $$ SELECT expire_lapsed_subscriptions(); $$
);

CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  charity_id UUID REFERENCES charities(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
