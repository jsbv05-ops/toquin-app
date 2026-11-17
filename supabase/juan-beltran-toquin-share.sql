-- TOQUIN APP · acceso de lectura y edición exclusiva de cantidades en r_toquin
-- Ejecutar en el SQL Editor del proyecto Supabase sopvoedhxwuwbmvkysua.
-- Antes: crear en Authentication a toquijefa@toquin.app y juanchef@toquin.app.
-- Reemplazar los UUID de abajo después de ejecutar las consultas de identificación.

create table if not exists public.toquin_share (
  owner_user_id uuid not null,
  reader_user_id uuid not null,
  can_edit_qty boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (owner_user_id, reader_user_id),
  unique (reader_user_id)
);

alter table public.toquin_share enable row level security;
revoke all on public.toquin_share from anon, authenticated;

create or replace function public.get_toquin_recipes()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner uuid;
  v_data jsonb;
begin
  if auth.uid() is null then raise exception 'Se requiere iniciar sesión'; end if;

  select s.owner_user_id into v_owner
  from public.toquin_share s
  where s.reader_user_id = auth.uid()
  limit 1;

  if v_owner is null then
    -- El dueño puede consultar su propio documento sin compartirlo consigo mismo.
    if exists (select 1 from public.docs d where d.user_id = auth.uid() and d.k = 'r_toquin') then
      v_owner := auth.uid();
    else
      raise exception 'No tienes permiso para ver las recetas de Toquín';
    end if;
  end if;

  select d.data into v_data
  from public.docs d
  where d.user_id = v_owner and d.k = 'r_toquin'
  limit 1;

  if v_data is null then raise exception 'No existe el documento r_toquin'; end if;
  return v_data;
end;
$$;

create or replace function public.set_toquin_recipe_qty(
  p_recipe_id text,
  p_ing_id text,
  p_qty numeric
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner uuid;
  v_data jsonb;
  v_recipes jsonb;
  v_recipe jsonb;
  v_items jsonb;
  v_new_items jsonb;
  v_recipe_found boolean := false;
  v_item_found boolean := false;
  v_recipe_idx integer;
  v_item_idx integer;
begin
  if auth.uid() is null then raise exception 'Se requiere iniciar sesión'; end if;
  if p_recipe_id is null or length(trim(p_recipe_id)) = 0
     or p_ing_id is null or length(trim(p_ing_id)) = 0 then
    raise exception 'Identificadores inválidos';
  end if;
  if p_qty is null or p_qty < 0 or p_qty::text in ('NaN','Infinity','-Infinity') then
    raise exception 'La cantidad debe ser numérica y mayor o igual a cero';
  end if;

  select s.owner_user_id into v_owner
  from public.toquin_share s
  where s.reader_user_id = auth.uid() and s.can_edit_qty = true
  limit 1;

  if v_owner is null then
    if exists (select 1 from public.docs d where d.user_id = auth.uid() and d.k = 'r_toquin') then
      v_owner := auth.uid();
    else
      raise exception 'No tienes permiso para editar cantidades';
    end if;
  end if;

  select d.data into v_data
  from public.docs d
  where d.user_id = v_owner and d.k = 'r_toquin'
  for update;

  if v_data is null then raise exception 'No existe el documento r_toquin'; end if;
  v_recipes := coalesce(v_data->'recipes', '[]'::jsonb);

  for v_recipe, v_recipe_idx in
    select value, (ordinality - 1)::integer
    from jsonb_array_elements(v_recipes) with ordinality
  loop
    if v_recipe->>'id' = p_recipe_id then
      v_recipe_found := true;
      v_items := coalesce(v_recipe->'items', '[]'::jsonb);
      v_new_items := '[]'::jsonb;

      for v_recipe, v_item_idx in
        select value, (ordinality - 1)::integer
        from jsonb_array_elements(v_items) with ordinality
      loop
        if v_recipe->>'ing' = p_ing_id then
          v_item_found := true;
          v_new_items := v_new_items || jsonb_build_array(jsonb_set(v_recipe, '{qty}', to_jsonb(p_qty), true));
        else
          v_new_items := v_new_items || jsonb_build_array(v_recipe);
        end if;
      end loop;

      if not v_item_found then raise exception 'Ingrediente no encontrado en la receta'; end if;
      v_recipes := jsonb_set(v_recipes, array[v_recipe_idx::text,'items'], v_new_items, false);
      exit;
    end if;
  end loop;

  if not v_recipe_found then raise exception 'Receta no encontrada'; end if;

  update public.docs
  set data = jsonb_set(v_data, '{recipes}', v_recipes, false),
      updated_at = now()
  where user_id = v_owner and k = 'r_toquin';

  return jsonb_set(v_data, '{recipes}', v_recipes, false);
end;
$$;

revoke all on function public.get_toquin_recipes() from public, anon;
revoke all on function public.set_toquin_recipe_qty(text,text,numeric) from public, anon;
grant execute on function public.get_toquin_recipes() to authenticated;
grant execute on function public.set_toquin_recipe_qty(text,text,numeric) to authenticated;

-- Consulta para obtener el UUID del dueño (Juan Beltran):
-- select id, email from auth.users where lower(email) = lower('TU_CORREO_DE_JUAN');
--
-- Consultas para obtener los UUID de los usuarios invitados:
-- select id, email from auth.users
-- where lower(email) in ('toquijefa@toquin.app','juanchef@toquin.app');
--
-- Después de conocer los tres UUID, ejecutar (sustituye los valores):
-- insert into public.toquin_share(owner_user_id, reader_user_id, can_edit_qty)
-- values
--   ('UUID_DUENO', 'UUID_TOQUIJEFA', true),
--   ('UUID_DUENO', 'UUID_JUANCHEF', true)
-- on conflict (owner_user_id, reader_user_id)
-- do update set can_edit_qty = excluded.can_edit_qty;
