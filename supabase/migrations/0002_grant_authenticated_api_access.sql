-- Expose public application objects to Supabase's authenticated API role.
-- Row Level Security remains responsible for restricting rows by auth.uid().
grant usage on schema public to authenticated;

grant select, insert, update, delete
on all tables in schema public
to authenticated;

grant usage, select
on all sequences in schema public
to authenticated;

alter default privileges for role postgres in schema public
grant select, insert, update, delete on tables to authenticated;

alter default privileges for role postgres in schema public
grant usage, select on sequences to authenticated;
