-- Global categories are readable by every authenticated user through RLS.
-- Only trusted seed/migration execution may create rows with user_id = null.
insert into public.categories (user_id, name, slug, color, is_default)
values
  (null, 'Trabalho', 'trabalho', '#5F7A61', true),
  (null, 'Pessoal', 'pessoal', '#C49A4A', true),
  (null, 'Estudos', 'estudos', '#6F9B6D', true),
  (null, 'Mercado', 'mercado', '#D69E45', true),
  (null, 'Casa', 'casa', '#EFE3D0', true),
  (null, 'Saúde', 'saude', '#8FAF8F', true),
  (null, 'Ideias', 'ideias', '#BFA7D8', true),
  (null, 'Financeiro', 'financeiro', '#C46A4A', true)
on conflict (slug) where user_id is null
do update set
  name = excluded.name,
  color = excluded.color,
  is_default = true;
