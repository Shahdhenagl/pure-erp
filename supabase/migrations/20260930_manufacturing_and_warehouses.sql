-- PURE ERP: Manufacturing Cycle, BOM Recipes, and 4 Core Warehouses
-- 1. Raw Materials Warehouse (مخزن المواد الخام)
-- 2. Packaging Materials Warehouse (مخزن مواد التغليف)
-- 3. Distribution Warehouse (مخزن التوزيع والمنتجات التامة)
-- 4. Vehicle Warehouses (مخازن سيارات التوزيع للمناديب)

create extension if not exists pgcrypto;

-- Ensure warehouses table has the proper types
alter table public.erp_warehouses drop constraint if exists erp_warehouses_warehouse_type_check;
alter table public.erp_warehouses add constraint erp_warehouses_warehouse_type_check 
  check (warehouse_type in ('main', 'raw_material', 'packaging', 'distribution', 'vehicle', 'store'));

-- Seed the 4 official operational warehouses
insert into public.erp_warehouses(code, name, warehouse_type, location) values
  ('WH-RAW', 'مخزن المواد الخام الغذائية', 'raw_material', 'عنبر التخزين أ - المصنع'),
  ('WH-PKG', 'مخزن مواد التعبئة والتغليف', 'packaging', 'قسم التعبئة والتغليف'),
  ('WH-DIST', 'مخزن التوزيع والمنتجات التامة', 'distribution', 'المستودع الرئيسي للشحن'),
  ('VAN-01', 'سيارة توزيع القاهرة - م. أحمد حسن', 'vehicle', 'خط سير شرق القاهرة'),
  ('VAN-02', 'سيارة توزيع الجيزة - م. كريم محمود', 'vehicle', 'خط سير الجيزة والهرم')
on conflict(code) do update set
  name = excluded.name,
  warehouse_type = excluded.warehouse_type,
  location = excluded.location;

-- Recipes Table (وصفة تصنيع المنتج النهائي)
create table if not exists public.erp_recipes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.erp_products(id) on delete cascade,
  name text not null,
  output_quantity numeric(12,2) not null default 1,
  unit text not null default 'كرتونة',
  description text,
  is_approved boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recipe Items / Bill of Materials (BOM)
-- Every item is either raw_material (deducted from raw warehouse) or packaging (deducted from packaging warehouse)
create table if not exists public.erp_recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.erp_recipes(id) on delete cascade,
  ingredient_id uuid not null references public.erp_products(id) on delete cascade,
  required_quantity numeric(14,4) not null check (required_quantity > 0),
  unit text not null default 'كجم',
  item_type text not null check (item_type in ('raw_material', 'packaging')),
  created_at timestamptz not null default now()
);

-- Production Batches (دورات التصنيع المنفذة)
create table if not exists public.erp_production_batches (
  id uuid primary key default gen_random_uuid(),
  batch_number text not null unique,
  recipe_id uuid not null references public.erp_recipes(id),
  product_id uuid not null references public.erp_products(id),
  quantity numeric(14,2) not null check (quantity > 0),
  raw_warehouse_id uuid not null references public.erp_warehouses(id),
  packaging_warehouse_id uuid not null references public.erp_warehouses(id),
  distribution_warehouse_id uuid not null references public.erp_warehouses(id),
  status text not null default 'completed' check (status in ('in_progress', 'completed', 'cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz default now()
);

create index if not exists erp_recipes_product_idx on public.erp_recipes(product_id);
create index if not exists erp_recipe_items_recipe_idx on public.erp_recipe_items(recipe_id);
create index if not exists erp_production_batches_recipe_idx on public.erp_production_batches(recipe_id);

-- Stored Procedure to Execute a Manufacturing Batch
-- Validates raw & packaging stock, deducts components, adds finished product to distribution warehouse
create or replace function public.erp_execute_production(
  p_recipe_id uuid,
  p_quantity numeric,
  p_raw_wh_id uuid,
  p_packaging_wh_id uuid,
  p_distribution_wh_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_recipe record;
  v_item record;
  v_batch_number text;
  v_batch_id uuid;
  v_required_qty numeric;
  v_available_qty numeric;
  v_output_qty numeric;
  v_target_wh_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'كمية التصنيع يجب أن تكون أكبر من الصفر';
  end if;

  select * into v_recipe from public.erp_recipes where id = p_recipe_id and is_active = true limit 1;
  if not found then
    raise exception 'وصفة التصنيع غير موجودة أو غير مفعلة';
  end if;

  -- 1. Validate stock availability for all ingredients
  for v_item in select * from public.erp_recipe_items where recipe_id = p_recipe_id loop
    v_required_qty := (v_item.required_quantity / coalesce(nullif(v_recipe.output_quantity, 0), 1)) * p_quantity;
    v_target_wh_id := case when v_item.item_type = 'packaging' then p_packaging_wh_id else p_raw_wh_id end;

    select coalesce(quantity, 0) into v_available_qty 
    from public.erp_stock_balances 
    where product_id = v_item.ingredient_id and warehouse_id = v_target_wh_id 
    for update;

    if coalesce(v_available_qty, 0) < v_required_qty then
      raise exception 'الرصيد غير كاف في المخزن للمكون (ID: %): المطلوب % والمتاح %', v_item.ingredient_id, v_required_qty, coalesce(v_available_qty, 0);
    end if;
  end loop;

  -- Generate unique batch number
  v_batch_number := 'BATCH-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  -- 2. Deduct materials from respective warehouses
  for v_item in select * from public.erp_recipe_items where recipe_id = p_recipe_id loop
    v_required_qty := (v_item.required_quantity / coalesce(nullif(v_recipe.output_quantity, 0), 1)) * p_quantity;
    v_target_wh_id := case when v_item.item_type = 'packaging' then p_packaging_wh_id else p_raw_wh_id end;

    update public.erp_stock_balances
    set quantity = quantity - v_required_qty, updated_at = now()
    where product_id = v_item.ingredient_id and warehouse_id = v_target_wh_id;

    insert into public.erp_stock_movements(
      product_id, from_warehouse_id, to_warehouse_id, quantity, movement_type, reference
    ) values (
      v_item.ingredient_id, v_target_wh_id, null, v_required_qty, 'adjustment', 'صرف خامات تشغيلة ' || v_batch_number
    );
  end loop;

  -- 3. Add produced finished goods to distribution warehouse
  v_output_qty := p_quantity;
  insert into public.erp_stock_balances(product_id, warehouse_id, quantity)
  values (v_recipe.product_id, p_distribution_wh_id, v_output_qty)
  on conflict (product_id, warehouse_id) do update
  set quantity = public.erp_stock_balances.quantity + v_output_qty, updated_at = now();

  insert into public.erp_stock_movements(
    product_id, from_warehouse_id, to_warehouse_id, quantity, movement_type, reference
  ) values (
    v_recipe.product_id, null, p_distribution_wh_id, v_output_qty, 'opening', 'إنتاج تشغيلة تامة ' || v_batch_number
  );

  -- 4. Record production batch
  insert into public.erp_production_batches(
    batch_number, recipe_id, product_id, quantity, raw_warehouse_id, packaging_warehouse_id, distribution_warehouse_id, status, notes
  ) values (
    v_batch_number, p_recipe_id, v_recipe.product_id, v_output_qty, p_raw_wh_id, p_packaging_wh_id, p_distribution_wh_id, 'completed', p_notes
  ) returning id into v_batch_id;

  return jsonb_build_object(
    'success', true,
    'batch_id', v_batch_id,
    'batch_number', v_batch_number,
    'product_id', v_recipe.product_id,
    'quantity_produced', v_output_qty,
    'distribution_warehouse_id', p_distribution_wh_id
  );
end;
$$;
