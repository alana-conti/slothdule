import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getTask, listSubtasks, listReminders, listAttachments } from "@/features/tasks/data";
import { SubtaskList } from "@/features/tasks/subtask-list";
import { ReminderList } from "@/features/tasks/reminder-list";
import { AttachmentList } from "@/features/tasks/attachment-list";
import { createClient } from "@/lib/supabase/server";
import type { TaskPriority, TaskStatus } from "@/types/tasks";

const priorityLabels: Record<TaskPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  done: "Concluída",
  archived: "Arquivada",
};

type TaskDetailPageProps = {
  params: Promise<{
    taskId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default async function TaskDetailPage({
  params,
  searchParams,
}: TaskDetailPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const [{ taskId }, { error, message }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [task, subtasks, reminders, attachments] = await Promise.all([
    getTask(taskId),
    listSubtasks(taskId),
    listReminders(taskId),
    listAttachments(taskId),
  ]);

  if (!task) {
    notFound();
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          className="inline-flex min-h-11 items-center rounded-2xl border border-sloth-border bg-sloth-card px-5 font-medium text-sloth-forest transition hover:bg-sloth-beige"
          href="/today"
        >
          Voltar para Hoje
        </Link>

        <header className="mt-5 rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-sloth-moss uppercase">
            Detalhe da tarefa
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink sm:text-4xl">
            {task.title}
          </h1>
          {task.description ? (
            <p className="mt-3 max-w-2xl leading-7 text-sloth-muted">
              {task.description}
            </p>
          ) : null}

          <dl className="mt-6 grid gap-3 rounded-2xl bg-sloth-beige/40 p-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-sloth-muted">Status</dt>
              <dd className="mt-1 font-semibold text-sloth-ink">
                {statusLabels[task.status]}
              </dd>
            </div>
            <div>
              <dt className="text-sloth-muted">Prioridade</dt>
              <dd className="mt-1 font-semibold text-sloth-ink">
                {priorityLabels[task.priority]}
              </dd>
            </div>
            <div>
              <dt className="text-sloth-muted">Prazo</dt>
              <dd className="mt-1 font-semibold text-sloth-ink">
                {formatDate(task.dueDate)}
                {task.dueTime ? ` às ${task.dueTime.slice(0, 5)}` : ""}
              </dd>
            </div>
          </dl>
        </header>

        {message ? (
          <p
            className="mt-5 rounded-2xl border border-sloth-leaf/30 bg-sloth-leaf/10 px-5 py-4 text-sm text-sloth-forest"
            role="status"
          >
            {message}
          </p>
        ) : null}

        {error ? (
          <p
            className="mt-5 rounded-2xl border border-sloth-terracotta/30 bg-sloth-terracotta/10 px-5 py-4 text-sm text-sloth-ink"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6">
          <SubtaskList subtasks={subtasks} taskId={task.id} />
        </div>

        <div className="mt-6">
          <ReminderList reminders={reminders} taskId={task.id} />
        </div>

        <div className="mt-6">
          <AttachmentList attachments={attachments} taskId={task.id} />
        </div>
      </div>
    </main>
  );
}
