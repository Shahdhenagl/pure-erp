-- PURE ERP: products, warehouses, stock ledger, public order tracking
create extension if not exists pgcrypto;

create table if not exists public.erp_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  product_type text not null check (product_type in ('finished','raw_material','packaging')),
  unit text not null default 'قطعة',
  sale_price numeric(12,2) not null default 0,
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  warehouse_type text not null check (warehouse_type in ('main','packaging','distribution','store')),
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.erp_stock_balances (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.erp_products(id) on delete cascade,
  warehouse_id uuid not null references public.erp_warehouses(id) on delete cascade,
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  reserved_quantity numeric(14,3) not null default 0 check (reserved_quantity >= 0),
  updated_at timestamptz not null default now(),
  unique(product_id, warehouse_id)
);

create table if not exists public.erp_stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.erp_products(id),
  from_warehouse_id uuid references public.erp_warehouses(id),
  to_warehouse_id uuid references public.erp_warehouses(id),
  quantity numeric(14,3) not null check (quantity > 0),
  movement_type text not null check (movement_type in ('opening','purchase','transfer','sale','adjustment','return')),
  reference text,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists status text not null default 'معلق';
alter table public.orders add column if not exists discount_percent numeric(5,2) not null default 0;
alter table public.orders add column if not exists representative_name text;
alter table public.orders add column if not exists representative_phone text;
alter table public.orders add column if not exists internal_notes text;
alter table public.orders add column if not exists customer_note text;

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  visible_to_customer boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists erp_stock_balances_product_idx on public.erp_stock_balances(product_id);
create index if not exists erp_stock_balances_warehouse_idx on public.erp_stock_balances(warehouse_id);
create index if not exists order_status_events_order_idx on public.order_status_events(order_id, created_at);

create or replace function public.erp_adjust_stock(p_product_id uuid, p_warehouse_id uuid, p_delta numeric, p_movement_type text, p_reference text default null)
returns public.erp_stock_balances
language plpgsql security definer set search_path = public as $$
declare result public.erp_stock_balances;
begin
  insert into public.erp_stock_balances(product_id, warehouse_id, quantity)
  values (p_product_id, p_warehouse_id, greatest(p_delta, 0))
  on conflict(product_id, warehouse_id) do update
    set quantity = public.erp_stock_balances.quantity + p_delta, updated_at = now();
  select * into result from public.erp_stock_balances where product_id=p_product_id and warehouse_id=p_warehouse_id;
  if result.quantity < 0 then raise exception 'رصيد المخزن غير كاف'; end if;
  insert into public.erp_stock_movements(product_id, to_warehouse_id, quantity, movement_type, reference)
  values (p_product_id, case when p_delta > 0 then p_warehouse_id else null end, abs(p_delta), p_movement_type, p_reference);
  return result;
end; $$;

create or replace function public.get_public_order_tracking(p_order_number text, p_phone text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o record; result jsonb;
begin
  select * into o from public.orders where order_number=p_order_number and (p_phone is null or phone=p_phone) limit 1;
  if not found then return null; end if;
  select jsonb_build_object(
    'order', jsonb_build_object('id', o.id, 'order_number', o.order_number, 'total', o.total, 'status', o.status, 'created_at', o.created_at, 'representative_name', o.representative_name, 'representative_phone', o.representative_phone, 'sales_rep', case when o.representative_name is not null then jsonb_build_object('name', o.representative_name, 'phone', o.representative_phone) else null end, 'customer_note', o.customer_note),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.order_status_events e where e.order_id=o.id and e.visible_to_customer), '[]'::jsonb)
  ) into result;
  return result;
end; $$;

-- Seed the four operational locations once.
insert into public.erp_warehouses(code,name,warehouse_type,location) values
 ('WH-01','المخزن الرئيسي','main','المصنع'),
 ('WH-02','مخزن الباكدجنج','packaging','قسم التعبئة'),
 ('VAN-03','مخزن التوزيع القاهرة','distribution','القاهرة'),
 ('STORE-01','متجر التجار','store','المتجر الإلكتروني')
on conflict(code) do nothing;

create or replace function public.erp_transfer_stock(p_product_id uuid, p_from_warehouse_id uuid, p_to_warehouse_id uuid, p_quantity numeric, p_reference text default null)
returns void language plpgsql security definer set search_path = public as $$
declare available numeric;
begin
  if p_quantity <= 0 or p_from_warehouse_id = p_to_warehouse_id then raise exception 'بيانات التحويل غير صحيحة'; end if;
  select quantity into available from public.erp_stock_balances where product_id=p_product_id and warehouse_id=p_from_warehouse_id for update;
  if coalesce(available, 0) < p_quantity then raise exception 'رصيد المصدر غير كاف'; end if;
  update public.erp_stock_balances set quantity=quantity-p_quantity, updated_at=now() where product_id=p_product_id and warehouse_id=p_from_warehouse_id;
  insert into public.erp_stock_balances(product_id, warehouse_id, quantity) values (p_product_id,p_to_warehouse_id,p_quantity)
    on conflict(product_id, warehouse_id) do update set quantity=public.erp_stock_balances.quantity+p_quantity, updated_at=now();
  insert into public.erp_stock_movements(product_id, from_warehouse_id, to_warehouse_id, quantity, movement_type, reference)
    values (p_product_id,p_from_warehouse_id,p_to_warehouse_id,p_quantity,'transfer',p_reference);
end; $$;

create or replace function public.erp_finalize_sale(p_items jsonb, p_reference text default null)
returns void language plpgsql security definer set search_path = public as $$
declare item jsonb; v_product_id uuid; qty numeric; distribution_id uuid; store_id uuid; dist_qty numeric; store_qty numeric;
begin
  select id into distribution_id from public.erp_warehouses where warehouse_type='distribution' order by code limit 1;
  select id into store_id from public.erp_warehouses where warehouse_type='store' order by code limit 1;
  if distribution_id is null or store_id is null then raise exception 'مخزن التوزيع أو المتجر غير معرف'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (item->>'product_id')::uuid; qty := coalesce((item->>'quantity')::numeric, 0);
    if qty <= 0 then continue; end if;
    select quantity into dist_qty from public.erp_stock_balances sb where sb.product_id=v_product_id and sb.warehouse_id=distribution_id for update;
    select quantity into store_qty from public.erp_stock_balances sb where sb.product_id=v_product_id and sb.warehouse_id=store_id for update;
    if coalesce(dist_qty, 0) < qty or coalesce(store_qty, 0) < qty then raise exception 'رصيد المنتج غير كاف في التوزيع أو المتجر'; end if;
    update public.erp_stock_balances sb set quantity=sb.quantity-qty, updated_at=now() where sb.product_id=v_product_id and sb.warehouse_id in (distribution_id, store_id);
    insert into public.erp_stock_movements(product_id, from_warehouse_id, quantity, movement_type, reference) values (v_product_id, distribution_id, qty, 'sale', coalesce(p_reference, 'بيع نهائي من المتجر'));
    insert into public.erp_stock_movements(product_id, from_warehouse_id, quantity, movement_type, reference) values (v_product_id, store_id, qty, 'sale', coalesce(p_reference, 'بيع نهائي من المتجر'));
  end loop;
end; $$;

create or replace function public.get_public_orders_by_phone(p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return coalesce((select jsonb_agg(public.get_public_order_tracking(o.order_number, p_phone) order by o.created_at desc) from public.orders o where o.phone = p_phone), '[]'::jsonb);
end; $$;
