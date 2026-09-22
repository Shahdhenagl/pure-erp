-- PURE ERP: Supabase Auth is the source of truth for trader accounts.
-- The client signs up/signs in with auth.signUp/signInWithPassword using phone + password.

revoke execute on function public.erp_trader_signup(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.erp_trader_login(text, text) from public, anon, authenticated;

create or replace function public.get_public_orders_by_phone(p_phone text)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  auth_phone text;
  normalized_phone text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;
  select phone into auth_phone from auth.users where id = auth.uid();
  normalized_phone := regexp_replace(trim(p_phone), '[^0-9+]', '', 'g');
  if auth_phone is null or regexp_replace(trim(auth_phone), '[^0-9+]', '', 'g') <> normalized_phone then
    raise exception 'لا يمكن عرض طلبات رقم هاتف مختلف';
  end if;
  return coalesce((select jsonb_agg(public.get_public_order_tracking(o.order_number, normalized_phone) order by o.created_at desc) from public.orders o where regexp_replace(trim(o.phone), '[^0-9+]', '', 'g') = normalized_phone), '[]'::jsonb);
end; $$;

revoke execute on function public.get_public_orders_by_phone(text) from public, anon;
grant execute on function public.get_public_orders_by_phone(text) to authenticated;

create or replace function public.get_public_order_tracking(p_order_number text, p_phone text default null)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare o record; result jsonb; auth_phone text; normalized_phone text;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول أولاً'; end if;
  select phone into auth_phone from auth.users where id=auth.uid();
  normalized_phone := regexp_replace(trim(coalesce(p_phone, auth_phone)), '[^0-9+]', '', 'g');
  if auth_phone is null or regexp_replace(trim(auth_phone), '[^0-9+]', '', 'g') <> normalized_phone then raise exception 'لا يمكن عرض طلبات رقم هاتف مختلف'; end if;
  select * into o from public.orders where order_number=p_order_number and regexp_replace(trim(phone), '[^0-9+]', '', 'g')=normalized_phone limit 1;
  if not found then return null; end if;
  select jsonb_build_object('order', jsonb_build_object('id',o.id,'order_number',o.order_number,'total',o.total,'status',o.status,'created_at',o.created_at,'representative_name',o.representative_name,'representative_phone',o.representative_phone,'sales_rep',case when o.representative_name is not null then jsonb_build_object('name',o.representative_name,'phone',o.representative_phone) else null end,'customer_note',o.customer_note),'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.order_status_events e where e.order_id=o.id and e.visible_to_customer),'[]'::jsonb)) into result;
  return result;
end; $$;

revoke execute on function public.get_public_order_tracking(text, text) from public, anon;
grant execute on function public.get_public_order_tracking(text, text) to authenticated;
