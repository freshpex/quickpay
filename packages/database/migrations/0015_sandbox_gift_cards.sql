ALTER TABLE gift_products ADD COLUMN sandbox_only boolean NOT NULL DEFAULT false;
INSERT INTO gift_products(id,brand,region,card_type,enabled,buy_enabled,sell_enabled,rate_kobo,min_units,max_units,sandbox_only)
VALUES ('sandbox-apple-us','Apple (Sandbox)','US','digital',true,true,true,100000,10,500,true),
('sandbox-amazon-us','Amazon (Sandbox)','US','digital',true,true,true,100000,10,500,true),
('sandbox-steam-us','Steam (Sandbox)','US','digital',true,true,true,100000,10,500,true);
CREATE TABLE sandbox_gift_purchases (
 id uuid PRIMARY KEY,
 user_id text NOT NULL REFERENCES users(id),
 product_id text NOT NULL REFERENCES gift_products(id),
 units bigint NOT NULL CHECK(units BETWEEN 10 AND 500),
 amount bigint NOT NULL CHECK(amount>0),
 status text NOT NULL DEFAULT 'quoted' CHECK(status IN ('quoted','successful')),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
