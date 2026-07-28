create or replace function public.award_task_completion_leaves()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  base_amount integer;
  base_inserted boolean;
  completion_date date;
begin
  if new.status <> 'done' or new.leaf_awarded_at is not null then
    return new;
  end if;

  base_amount := case new.priority
    when 'low' then 1
    when 'medium' then 3
    when 'high' then 5
    when 'critical' then 8
  end;

  insert into public.leaf_transactions (
    user_id,
    task_id,
    type,
    amount,
    reason
  )
  values (
    new.user_id,
    new.id,
    'task_completion',
    base_amount,
    'Conclusão de tarefa de prioridade ' ||
      case new.priority
        when 'low' then 'baixa'
        when 'medium' then 'média'
        when 'high' then 'alta'
        when 'critical' then 'crítica'
      end
  )
  on conflict do nothing
  returning true into base_inserted;

  if coalesce(base_inserted, false) then
    completion_date := (
      coalesce(new.completed_at, now()) at time zone 'America/Sao_Paulo'
    )::date;

    if completion_date < new.due_date then
      insert into public.leaf_transactions (
        user_id,
        task_id,
        type,
        amount,
        reason
      )
      values (
        new.user_id,
        new.id,
        'early_completion_bonus',
        2,
        'Bônus: concluída antes do prazo'
      );
    end if;

    if exists (
      select 1
      from public.subtasks
      where subtasks.task_id = new.id
    ) and not exists (
      select 1
      from public.subtasks
      where subtasks.task_id = new.id
        and not subtasks.is_done
    ) then
      insert into public.leaf_transactions (
        user_id,
        task_id,
        type,
        amount,
        reason
      )
      values (
        new.user_id,
        new.id,
        'checklist_bonus',
        2,
        'Bônus: checklist completo finalizado'
      );
    end if;
  end if;

  update public.tasks
  set leaf_awarded_at = now()
  where id = new.id
    and leaf_awarded_at is null;

  return new;
end;
$$;

revoke all
on function public.award_task_completion_leaves()
from public, anon, authenticated;

drop trigger if exists tasks_award_completion_leaves on public.tasks;
create trigger tasks_award_completion_leaves
after insert or update of status on public.tasks
for each row
execute function public.award_task_completion_leaves();

-- Repair completed tasks created before automatic awards were enabled.
update public.tasks
set status = 'done'
where status = 'done'
  and leaf_awarded_at is null;
