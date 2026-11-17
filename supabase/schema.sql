-- TOQUIN APP Supabase schema. Run in SQL Editor before deploying app.
create extension if not exists pgcrypto;
do $$ begin create type public.toquin_role as enum ('admin','toquijefa','toquijefe','tachu'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique,
 display_name text not null,
 role public.toquin_role not null default 'tachu',
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.current_toquin_role()
returns public.toquin_role language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() $$;

create or replace function public.has_toquin_role(allowed public.toquin_role[])
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_toquin_role() = any(allowed),false) $$;

create or replace function public.handle_new_toquin_user()
returns trigger language plpgsql security definer set search_path=public
as $$
declare u text; d text;
begin
 u := lower(coalesce(new.raw_user_meta_data->>'username',split_part(new.email,'@',1)));
 d := coalesce(new.raw_user_meta_data->>'display_name',initcap(u));
 insert into public.profiles(id,username,display_name,role)
 values(new.id,u,d,'tachu') on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created_toquin on auth.users;
create trigger on_auth_user_created_toquin after insert on auth.users
for each row execute procedure public.handle_new_toquin_user();

drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles for select to authenticated
using(id=auth.uid() or public.has_toquin_role(array['admin']::public.toquin_role[]));
drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage on public.profiles for all to authenticated
using(public.has_toquin_role(array['admin']::public.toquin_role[]))
with check(public.has_toquin_role(array['admin']::public.toquin_role[]));

create table if not exists public.app_state (
 id text primary key default 'main' check(id='main'),
 data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table public.app_state enable row level security;
drop policy if exists app_state_read_team on public.app_state;
create policy app_state_read_team on public.app_state for select to authenticated
using(public.has_toquin_role(array['admin','toquijefa']::public.toquin_role[]));
drop policy if exists app_state_write_team on public.app_state;
create policy app_state_write_team on public.app_state for all to authenticated
using(public.has_toquin_role(array['admin','toquijefa']::public.toquin_role[]))
with check(public.has_toquin_role(array['admin','toquijefa']::public.toquin_role[]));

create table if not exists public.inventory (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.inventory enable row level security;
drop policy if exists inventory_read_authenticated on public.inventory;
create policy inventory_read_authenticated on public.inventory for select to authenticated using(true);
drop policy if exists inventory_manage_admin_tachu on public.inventory;
create policy inventory_manage_admin_tachu on public.inventory for all to authenticated
using(public.has_toquin_role(array['admin','tachu']::public.toquin_role[]))
with check(public.has_toquin_role(array['admin','tachu']::public.toquin_role[]));

create table if not exists public.purchase_orders (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 status text not null default 'Enviado' check(status in ('Enviado','En compra','Respondido')),
 general_note text not null default '',
 replied_at timestamptz,
 last_seen_by_tachu timestamptz,
 last_seen_by_toquijefe timestamptz
);
alter table public.purchase_orders enable row level security;

create table if not exists public.purchase_order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.purchase_orders(id) on delete cascade,
 inventory_id uuid references public.inventory(id),
 product_name text not null,
 quantity_requested text not null,
 quantity_purchased text,
 status text not null default 'Pendiente' check(status in ('Pendiente','Comprado','No comprado','Otra cantidad')),
 tachu_note text not null default '',
 luisda_note text not null default '',
 created_at timestamptz not null default now()
);
alter table public.purchase_order_items enable row level security;

create table if not exists public.order_item_notes (
 id uuid primary key default gen_random_uuid(),
 order_item_id uuid not null references public.purchase_order_items(id) on delete cascade,
 author_id uuid not null references auth.users(id),
 author_role public.toquin_role not null,
 note text not null check(length(trim(note))>0),
 created_at timestamptz not null default now()
);
alter table public.order_item_notes enable row level security;

create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 order_id uuid references public.purchase_orders(id) on delete cascade,
 kind text not null,
 message text not null,
 read_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;

drop policy if exists orders_select_participants on public.purchase_orders;
create policy orders_select_participants on public.purchase_orders for select to authenticated
using(public.has_toquin_role(array['admin','toquijefe','tachu']::public.toquin_role[]));
drop policy if exists orders_insert_tachu on public.purchase_orders;
create policy orders_insert_tachu on public.purchase_orders for insert to authenticated
with check(created_by=auth.uid() and public.has_toquin_role(array['admin','tachu']::public.toquin_role[]));
drop policy if exists orders_update_participants on public.purchase_orders;
create policy orders_update_participants on public.purchase_orders for update to authenticated
using(public.has_toquin_role(array['admin','toquijefe','tachu']::public.toquin_role[]))
with check(public.has_toquin_role(array['admin','toquijefe','tachu']::public.toquin_role[]));
drop policy if exists orders_delete_admin on public.purchase_orders;
create policy orders_delete_admin on public.purchase_orders for delete to authenticated
using(public.has_toquin_role(array['admin']::public.toquin_role[]));

drop policy if exists order_items_select_participants on public.purchase_order_items;
create policy order_items_select_participants on public.purchase_order_items for select to authenticated
using(exists(select 1 from public.purchase_orders o where o.id=order_id));
drop policy if exists order_items_insert_tachu on public.purchase_order_items;
create policy order_items_insert_tachu on public.purchase_order_items for insert to authenticated
with check(exists(select 1 from public.purchase_orders o where o.id=order_id)
 and public.has_toquin_role(array['admin','tachu']::public.toquin_role[]));
drop policy if exists order_items_update_participants on public.purchase_order_items;
create policy order_items_update_participants on public.purchase_order_items for update to authenticated
using(public.has_toquin_role(array['admin','toquijefe','tachu']::public.toquin_role[]))
with check(public.has_toquin_role(array['admin','toquijefe','tachu']::public.toquin_role[]));
drop policy if exists order_items_delete_admin on public.purchase_order_items;
create policy order_items_delete_admin on public.purchase_order_items for delete to authenticated
using(public.has_toquin_role(array['admin']::public.toquin_role[]));

drop policy if exists order_notes_select_participants on public.order_item_notes;
create policy order_notes_select_participants on public.order_item_notes for select to authenticated
using(exists(select 1 from public.purchase_order_items i join public.purchase_orders o on o.id=i.order_id where i.id=order_item_id));
drop policy if exists order_notes_insert_participants on public.order_item_notes;
create policy order_notes_insert_participants on public.order_item_notes for insert to authenticated
with check(author_id=auth.uid() and public.has_toquin_role(array['admin','toquijefe','tachu']::public.toquin_role[])
 and exists(select 1 from public.purchase_order_items i where i.id=order_item_id));
drop policy if exists order_notes_delete_admin on public.order_item_notes;
create policy order_notes_delete_admin on public.order_item_notes for delete to authenticated
using(public.has_toquin_role(array['admin']::public.toquin_role[]));

drop policy if exists notifications_read_own_admin on public.notifications;
create policy notifications_read_own_admin on public.notifications for select to authenticated
using(user_id=auth.uid() or public.has_toquin_role(array['admin']::public.toquin_role[]));
drop policy if exists notifications_insert_ops on public.notifications;
create policy notifications_insert_ops on public.notifications for insert to authenticated
with check(public.has_toquin_role(array['admin','toquijefa','toquijefe','tachu']::public.toquin_role[]));
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists notifications_delete_own_admin on public.notifications;
create policy notifications_delete_own_admin on public.notifications for delete to authenticated
using(user_id=auth.uid() or public.has_toquin_role(array['admin']::public.toquin_role[]));

create or replace function public.notify_purchase_order()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v uuid;
begin
 if tg_op='INSERT' then
  select id into v from public.profiles where role='toquijefe' order by created_at limit 1;
  if v is not null then insert into public.notifications(user_id,order_id,kind,message)
   values(v,new.id,'new_order','Tienes un nuevo pedido de Tachu'); end if;
 elsif new.status='Respondido' and old.status is distinct from new.status then
  select id into v from public.profiles where id=new.created_by;
  if v is not null then insert into public.notifications(user_id,order_id,kind,message)
   values(v,new.id,'order_replied','Luisda respondió tu pedido'); end if;
 end if;
 return new;
end $$;
drop trigger if exists purchase_order_notify on public.purchase_orders;
create trigger purchase_order_notify after insert or update of status on public.purchase_orders
for each row execute procedure public.notify_purchase_order();

insert into public.inventory(name) values
  ("Aceite"),
  ("Aceite Litro"),
  ("Aguila 330"),
  ("Ajo"),
  ("Ajo En Polvo"),
  ("Alcaparras"),
  ("Americana"),
  ("Apio En Rama"),
  ("Arandanos"),
  ("Azucar Blanca"),
  ("Azucar Morena"),
  ("Bandeja Nº25 Semihonda"),
  ("Bbq"),
  ("Bbq Bocadillo"),
  ("Bbq Sweet"),
  ("Bocadillo"),
  ("Bolsa 3Kl Barata"),
  ("Bolsa De Aseo 200 Ltr"),
  ("Bolsa De Porciones (De Alta) 7X11"),
  ("Bolsas 10Kl"),
  ("Bolsas 15Kl"),
  ("Bolsas 3Kl"),
  ("Bolsas 5Kl"),
  ("Bolsa Vacio"),
  ("Botella Agua 300Ml"),
  ("Botella Agua 600Ml"),
  ("Brownies"),
  ("Budwaser"),
  ("Burrata"),
  ("Butifarra"),
  ("C1"),
  ("Café Frappe"),
  ("Caja Burger"),
  ("Caja Porta Perros"),
  ("Cajas Toquín"),
  ("Carne Burger X160Gr"),
  ("Carne Desmechada X 65Gr"),
  ("Carne En Bloque"),
  ("Carne Molida"),
  ("Cebolla Blanca"),
  ("Cebolla Caramelizada X 50Gr"),
  ("Cebolla Crispi X 50Gr"),
  ("Cebolla Encurtida X5Gr"),
  ("Cebolla Roja"),
  ("Cereza"),
  ("Cereza (Unidad)"),
  ("Champiñones"),
  ("Chedar"),
  ("Chedar Liquido"),
  ("Chimichurri"),
  ("Chips De Chocolate"),
  ("Chorizo De Ternera"),
  ("Coca Cola 1,5L"),
  ("Coca Cola 400Ml"),
  ("Coca Cola Vidrio"),
  ("Coco"),
  ("Coco Deshidratado"),
  ("Cogollo Europeo"),
  ("Coquito"),
  ("Corona Lata"),
  ("Crema Batida"),
  ("Crema De Leche"),
  ("Crema De Leña"),
  ("Crema De Leña Hot"),
  ("Cuchillos"),
  ("Curcuma"),
  ("Doña Gallina"),
  ("Doritos"),
  ("Ensalada"),
  ("Esferas De Queso Crema X3Porc"),
  ("Fresa"),
  ("Fresa (Fruta)"),
  ("Frutos Rojos (Pulpa)"),
  ("Gaseosa Mini"),
  ("Ginger"),
  ("Gochujang"),
  ("Grapas"),
  ("Guanabana"),
  ("Harina"),
  ("Hielo"),
  ("Huevo"),
  ("Jalapeños"),
  ("Jamón"),
  ("Js1"),
  ("Jugo De Cereza"),
  ("Jugo Hit Mini"),
  ("K1"),
  ("Kraf Nº1/2"),
  ("Kraf Nº6"),
  ("Laurel"),
  ("Leche"),
  ("Leche Condensada"),
  ("Leche De Coco"),
  ("Lechuga Batavia"),
  ("Lechuga Crespa"),
  ("Licuado Carnes X1,5 Galones"),
  ("Licuado Pepinillos"),
  ("Licuado Perejil"),
  ("Licuado Rojo Tartara X1,5 Galones"),
  ("Limon"),
  ("Limon Pimienta"),
  ("Limpia Pisos Full Fresh 4Lt"),
  ("Lomo De Cerdo"),
  ("Long"),
  ("Lulo"),
  ("Maiz"),
  ("Manguera"),
  ("Mantequilla"),
  ("Maracuya"),
  ("Maracuya (Pulpa 500 G)"),
  ("Mayonesa Natucampo Premium X3350"),
  ("Mayosiracha"),
  ("Mentas"),
  ("Mermelada De Tocineta X25G"),
  ("Mezcla De Coco"),
  ("Mezcla Piña Colada"),
  ("Miel Mostaza"),
  ("Miga De Pan"),
  ("Milo"),
  ("Mora"),
  ("Mostaza"),
  ("Mostaza En Polvo"),
  ("Mozzarella"),
  ("Nuggets De Pollo"),
  ("Oregano"),
  ("P1"),
  ("Palillo De Bebidas"),
  ("Palillos Extralargos"),
  ("Pan +57"),
  ("Pan Hamburguesa"),
  ("Panko"),
  ("Pan Perro"),
  ("Pan Sandwich"),
  ("Papa Farm Frites"),
  ("Papa Francesa"),
  ("Papel Aluminio X300Mtr"),
  ("Papel Parafinado"),
  ("Pechuga Adobada X75 Gr"),
  ("Pechuga Blanca Macpollo"),
  ("Pepinillos"),
  ("Perejil"),
  ("Pico E Gallo X30G"),
  ("Pimenton"),
  ("Pimenton Tatemado"),
  ("Pimienta"),
  ("Piña Calada"),
  ("Piña Oro Miel"),
  ("Piña Rodaja"),
  ("Piña Sabana"),
  ("Pitillo Plastico"),
  ("Pitillos De Bambu"),
  ("Pitorro De Coco"),
  ("Platano Verde"),
  ("Poker 330"),
  ("Pollo Cremoso X80 Gr"),
  ("Queso Costeño"),
  ("Queso Crema"),
  ("Quita Grasa"),
  ("Red Piper"),
  ("Ripio"),
  ("Ripio Platano"),
  ("Ron Blanco"),
  ("Rosada X7.5 Galones"),
  ("Salchicha Cazadora"),
  ("Sal Gruesa"),
  ("Sal Paprika"),
  ("Sal Refinada"),
  ("Salsa De Chocolate Hershey"),
  ("Salsa De Tomate"),
  ("Separadores"),
  ("Servilletas"),
  ("Siracha"),
  ("Soda 400Ml"),
  ("Soda Hatsu 310Ml"),
  ("Suero Costeño"),
  ("Suiza"),
  ("Super Ranchera"),
  ("T1"),
  ("Tacos De Papel (Comandera)"),
  ("Tajin"),
  ("Tapadoma Altura 3"),
  ("Tartara X6 Galones"),
  ("Tenedores"),
  ("Teriyaki"),
  ("Tocineta"),
  ("Tomate"),
  ("Tomate Cherry"),
  ("Tomate Zafran X4300"),
  ("Tomillo"),
  ("Vasos 7Oz Darnel"),
  ("Vasos Y Tapas 16Oz Darnel (Jugos) X24"),
  ("Velas De Cumpleaños"),
  ("Vinagre Blanco"),
  ("Vinagreta"),
  ("Vinipel"),
  ("Vino Blanco D1"),
  ("Ziploc 6*5")
on conflict(name) do update set active=true;

do $$ begin alter publication supabase_realtime add table public.purchase_orders; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.purchase_order_items; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.order_item_notes; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; when undefined_object then null; end $$;

-- Create JuanChef first in Authentication > Users as juanchef@toquin.app.
-- Then run: update public.profiles set role='admin',username='juanchef',display_name='JuanChef'
-- where id=(select id from auth.users where email='juanchef@toquin.app');
