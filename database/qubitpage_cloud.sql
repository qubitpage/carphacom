CREATE TABLE IF NOT EXISTS qp_provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  api_endpoint TEXT,
  api_credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  balance_cached NUMERIC,
  balance_updated_at TIMESTAMPTZ,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qp_catalog_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES qp_provider(id) ON DELETE CASCADE,
  provider_plan_code TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  datacenter TEXT,
  region TEXT,
  provider_price NUMERIC,
  currency TEXT DEFAULT 'USD',
  our_price NUMERIC,
  margin_pct NUMERIC NOT NULL DEFAULT 18,
  is_listed BOOLEAN NOT NULL DEFAULT false,
  availability TEXT NOT NULL DEFAULT 'unknown',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, provider_plan_code)
);

CREATE TABLE IF NOT EXISTS qp_server_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT,
  catalog_item_id UUID REFERENCES qp_catalog_item(id),
  provider_id UUID REFERENCES qp_provider(id),
  provider_order_id TEXT,
  provider_service_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  stripe_payment_intent TEXT,
  stripe_subscription_id TEXT,
  os_template TEXT,
  hostname TEXT,
  root_password_encrypted TEXT,
  vscode_token_hash TEXT,
  vscode_url TEXT,
  ip_address INET,
  provisioning_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provisioned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS qp_private_gpu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT,
  machine_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  gpu_model TEXT NOT NULL,
  gpu_count INTEGER NOT NULL DEFAULT 1,
  ram_gb INTEGER,
  price_per_hour NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  ssh_host TEXT,
  ssh_port INTEGER,
  connection_details_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO qp_provider (name, slug, type, api_endpoint, config)
VALUES
  ('OVHcloud', 'ovh', 'dedicated', 'https://eu.api.ovh.com/1.0', '{"subsidiary":"GB","margin_pct":18}'::jsonb),
  ('Vast.ai', 'vastai', 'gpu', 'https://console.vast.ai', '{"margin_pct":20}'::jsonb),
  ('Microsoft Azure', 'azure', 'cloud-vm', 'https://management.azure.com', '{"margin_pct":18}'::jsonb),
  ('Private GPU Pool', 'private', 'gpu', null, '{"requires_approval":true,"margin_pct":15}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  api_endpoint = EXCLUDED.api_endpoint,
  config = qp_provider.config || EXCLUDED.config,
  updated_at = now();
