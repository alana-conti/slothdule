import "server-only";

import { apiJson, getCurrentUser } from "@/lib/api/server";
import { resolveFileUrl } from "@/lib/api/config";
import type {
  Category,
  Client,
  Project,
  RewardItem,
  RewardRedemption,
  RewardRedemptionStatus,
  Subtask,
  Task,
  TaskInput,
  TaskPriority,
  TaskStatus,
  WorkContext,
  Reminder,
  ReminderChannel,
  ReminderHorizon,
  Attachment,
  AttachmentType,
} from "@/types/tasks";

type TaskRow = {
  id: string;
  user_id: string;
  category_id: string;
  client_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  work_context: WorkContext;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  due_time: string | null;
  estimated_minutes: number | null;
  completed_at: string | null;
  leaf_awarded_at: string | null;
  created_at: string;
  updated_at: string;
};

type SubtaskRow = {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

type RewardItemInput = {
  title: string;
  description: string | null;
  cost: number;
  icon: string | null;
};

async function requireUserId() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  return user;
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    workContext: row.work_context,
    status: row.status,
    priority: row.priority,
    startDate: row.start_date,
    dueDate: row.due_date || "",
    dueTime: row.due_time,
    estimatedMinutes: row.estimated_minutes,
    completedAt: row.completed_at,
    leafAwardedAt: row.leaf_awarded_at,
    clientId: row.client_id,
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    title: row.title,
    isDone: row.is_done,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTaskPayload(input: TaskInput) {
  return {
    category_id: input.categoryId,
    title: input.title,
    description: input.description,
    work_context: input.workContext,
    status: input.status,
    priority: input.priority,
    start_date: input.startDate,
    due_date: input.dueDate,
    due_time: input.dueTime,
    estimated_minutes: input.estimatedMinutes,
  };
}

export async function listCategories(): Promise<Category[]> {
  await requireUserId();

  try {
    const data = await apiJson<
      Array<{ id: string; name: string; slug: string; color: string | null }>
    >("/categories");
    return data;
  } catch {
    throw new Error("Não foi possível carregar as categorias.");
  }
}

export async function listTasks(): Promise<Task[]> {
  await requireUserId();

  try {
    const data = await apiJson<TaskRow[]>("/tasks");
    return data.map(mapTask);
  } catch {
    throw new Error("Não foi possível carregar suas tarefas.");
  }
}

export async function getTask(taskId: string): Promise<Task | null> {
  await requireUserId();

  try {
    const data = await apiJson<TaskRow>(
      `/tasks/${encodeURIComponent(taskId)}`,
    );
    return mapTask(data);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }

    throw new Error("Não foi possível carregar essa tarefa.");
  }
}

export async function createTask(input: TaskInput) {
  await requireUserId();

  try {
    await apiJson("/tasks", {
      body: JSON.stringify(toTaskPayload(input)),
      method: "POST",
    });
  } catch {
    throw new Error("Não foi possível criar a tarefa.");
  }
}

export async function updateTask(
  taskId: string,
  input: TaskInput,
): Promise<{ leavesAwarded: number }> {
  const user = await requireUserId();
  void user;

  let currentTask: TaskRow;
  try {
    currentTask = await apiJson<TaskRow>(
      `/tasks/${encodeURIComponent(taskId)}`,
    );
  } catch {
    throw new Error("Não foi possível carregar a tarefa para atualização.");
  }

  const shouldReportAward =
    input.status === "done" && !currentTask.leaf_awarded_at;

  try {
    await apiJson(`/tasks/${encodeURIComponent(taskId)}`, {
      body: JSON.stringify(toTaskPayload(input)),
      method: "PATCH",
    });
  } catch {
    throw new Error("Não foi possível atualizar essa tarefa.");
  }

  if (!shouldReportAward) {
    return { leavesAwarded: 0 };
  }

  try {
    const data = await apiJson<{ leavesAwarded: number }>(
      `/tasks/${encodeURIComponent(taskId)}/leaves-awarded`,
    );
    return { leavesAwarded: data.leavesAwarded };
  } catch {
    return { leavesAwarded: 0 };
  }
}

export async function archiveTask(taskId: string) {
  await requireUserId();

  try {
    await apiJson(`/tasks/${encodeURIComponent(taskId)}/archive`, {
      method: "POST",
    });
  } catch {
    throw new Error("Não foi possível arquivar essa tarefa.");
  }
}

export async function deleteTask(taskId: string) {
  await requireUserId();

  try {
    await apiJson(`/tasks/${encodeURIComponent(taskId)}`, {
      method: "DELETE",
    });
  } catch {
    throw new Error("Não foi possível excluir essa tarefa.");
  }
}

export async function listSubtasks(taskId: string): Promise<Subtask[]> {
  await requireUserId();

  try {
    const data = await apiJson<SubtaskRow[]>(
      `/tasks/${encodeURIComponent(taskId)}/subtasks`,
    );
    return data.map(mapSubtask);
  } catch {
    throw new Error("Não foi possível carregar as subtarefas.");
  }
}

export async function createSubtask(taskId: string, title: string) {
  await requireUserId();

  try {
    await apiJson(`/tasks/${encodeURIComponent(taskId)}/subtasks`, {
      body: JSON.stringify({ title }),
      method: "POST",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      throw new Error("Tarefa inválida.");
    }

    throw new Error("Não foi possível adicionar a subtarefa.");
  }
}

export async function updateSubtaskTitle(
  taskId: string,
  subtaskId: string,
  title: string,
) {
  await requireUserId();
  void taskId;

  try {
    await apiJson(`/subtasks/${encodeURIComponent(subtaskId)}/title`, {
      body: JSON.stringify({ title }),
      method: "PATCH",
    });
  } catch {
    throw new Error("Não foi possível editar essa subtarefa.");
  }
}

export async function setSubtaskCompletion(
  taskId: string,
  subtaskId: string,
  isDone: boolean,
) {
  await requireUserId();
  void taskId;

  try {
    await apiJson(`/subtasks/${encodeURIComponent(subtaskId)}/done`, {
      body: JSON.stringify({ is_done: isDone }),
      method: "PATCH",
    });
  } catch {
    throw new Error("Não foi possível atualizar essa subtarefa.");
  }
}

export async function deleteSubtask(taskId: string, subtaskId: string) {
  await requireUserId();
  void taskId;

  try {
    await apiJson(`/subtasks/${encodeURIComponent(subtaskId)}`, {
      method: "DELETE",
    });
  } catch {
    throw new Error("Não foi possível remover essa subtarefa.");
  }
}

export async function getUserLeafBalance(): Promise<number> {
  await requireUserId();

  try {
    const data = await apiJson<{ balance: number }>("/leaves/balance");
    return data.balance ?? 0;
  } catch {
    return 0;
  }
}

export async function listActiveRewardItems(): Promise<RewardItem[]> {
  await requireUserId();

  try {
    const data = await apiJson<
      Array<{
        id: string;
        user_id: string | null;
        title: string;
        description: string | null;
        cost: number;
        icon: string | null;
        is_default: boolean;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>
    >("/rewards/items");
    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      cost: row.cost,
      icon: row.icon,
      isDefault: row.is_default,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    throw new Error("Não foi possível carregar as recompensas.");
  }
}

export async function listRewardRedemptions(): Promise<RewardRedemption[]> {
  await requireUserId();

  try {
    const data = await apiJson<
      Array<{
        id: string;
        user_id: string;
        reward_item_id: string;
        cost: number;
        status: RewardRedemptionStatus;
        notes: string | null;
        redeemed_at: string;
        delivered_at: string | null;
        cancelled_at: string | null;
        created_at: string;
        updated_at: string;
        reward_item: { title: string; icon: string | null } | null;
      }>
    >("/rewards/redemptions");
    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      rewardItemId: row.reward_item_id,
      cost: row.cost,
      status: row.status,
      notes: row.notes,
      redeemedAt: row.redeemed_at,
      deliveredAt: row.delivered_at,
      cancelledAt: row.cancelled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      rewardItem: row.reward_item
        ? { title: row.reward_item.title, icon: row.reward_item.icon }
        : undefined,
    }));
  } catch {
    throw new Error("Não foi possível carregar o histórico de resgates.");
  }
}

export async function createRewardItem(input: RewardItemInput): Promise<void> {
  await requireUserId();

  try {
    await apiJson("/rewards/items", {
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        cost: input.cost,
        icon: input.icon,
      }),
      method: "POST",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("esse nome")
    ) {
      throw new Error("Você já tem uma recompensa com esse nome.");
    }

    throw new Error("Não foi possível criar a recompensa.");
  }
}

export async function redeemReward(rewardItemId: string): Promise<void> {
  await requireUserId();

  try {
    await apiJson(`/rewards/items/${encodeURIComponent(rewardItemId)}/redeem`, {
      method: "POST",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Folhinhas")) {
        throw new Error("Ainda faltam algumas Folhinhas para essa recompensa.");
      }

      if (error.message.includes("inválida ou inativa")) {
        throw new Error("Recompensa inválida ou inativa.");
      }
    }

    throw new Error("Não foi possível solicitar o resgate.");
  }
}

export async function markRewardRedemptionDelivered(
  redemptionId: string,
): Promise<void> {
  await requireUserId();

  try {
    await apiJson(
      `/rewards/redemptions/${encodeURIComponent(redemptionId)}/deliver`,
      { method: "POST" },
    );
  } catch {
    throw new Error("Não foi possível finalizar esse resgate.");
  }
}

export async function listClients(): Promise<Client[]> {
  await requireUserId();

  try {
    const data = await apiJson<
      Array<{
        id: string;
        user_id: string;
        name: string;
        notes: string | null;
        created_at: string;
        updated_at: string;
      }>
    >("/clients");
    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    throw new Error("Não foi possível carregar os clientes.");
  }
}

export async function listProjects(): Promise<Project[]> {
  await requireUserId();

  try {
    const data = await apiJson<
      Array<{
        id: string;
        user_id: string;
        client_id: string | null;
        name: string;
        type: string | null;
        status: string;
        notes: string | null;
        created_at: string;
        updated_at: string;
      }>
    >("/projects");
    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      clientId: row.client_id,
      name: row.name,
      type: row.type,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    throw new Error("Não foi possível carregar os projetos.");
  }
}

export async function listReminders(taskId: string): Promise<Reminder[]> {
  await requireUserId();

  try {
    const data = await apiJson<
      Array<{
        id: string;
        user_id: string;
        task_id: string | null;
        title: string;
        remind_at: string;
        channel: ReminderChannel;
        horizon: ReminderHorizon;
        is_sent: boolean;
        created_at: string;
        updated_at: string;
      }>
    >(`/tasks/${encodeURIComponent(taskId)}/reminders`);
    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      taskId: row.task_id,
      title: row.title,
      remindAt: row.remind_at,
      channel: row.channel,
      horizon: row.horizon,
      isSent: row.is_sent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    throw new Error("Não foi possível carregar os lembretes.");
  }
}

export async function createReminder(input: {
  taskId: string;
  title: string;
  remindAt: string;
  channel: ReminderChannel;
  horizon: ReminderHorizon;
}): Promise<void> {
  await requireUserId();

  try {
    await apiJson(`/tasks/${encodeURIComponent(input.taskId)}/reminders`, {
      body: JSON.stringify({
        title: input.title,
        remind_at: input.remindAt,
        channel: input.channel,
        horizon: input.horizon,
      }),
      method: "POST",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      throw new Error("Tarefa inválida.");
    }

    throw new Error("Não foi possível criar o lembrete.");
  }
}

export async function updateReminder(input: {
  id: string;
  taskId: string;
  title: string;
  remindAt: string;
  channel: ReminderChannel;
  horizon: ReminderHorizon;
}): Promise<void> {
  await requireUserId();
  void input.taskId;

  try {
    await apiJson(`/reminders/${encodeURIComponent(input.id)}`, {
      body: JSON.stringify({
        title: input.title,
        remind_at: input.remindAt,
        channel: input.channel,
        horizon: input.horizon,
      }),
      method: "PATCH",
    });
  } catch {
    throw new Error("Não foi possível atualizar o lembrete.");
  }
}

export async function deleteReminder(reminderId: string, taskId: string): Promise<void> {
  await requireUserId();
  void taskId;

  try {
    await apiJson(`/reminders/${encodeURIComponent(reminderId)}`, {
      method: "DELETE",
    });
  } catch {
    throw new Error("Não foi possível remover o lembrete.");
  }
}

export async function listAttachments(taskId: string): Promise<Attachment[]> {
  await requireUserId();

  try {
    const data = await apiJson<
      Array<{
        id: string;
        user_id: string;
        task_id: string;
        type: AttachmentType;
        label: string | null;
        url: string;
        mime_type: string | null;
        size_bytes: number | null;
        created_at: string;
      }>
    >(`/tasks/${encodeURIComponent(taskId)}/attachments`);
    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      taskId: row.task_id,
      type: row.type,
      label: row.label,
      url: resolveFileUrl(row.url),
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      createdAt: row.created_at,
    }));
  } catch {
    throw new Error("Não foi possível carregar os anexos.");
  }
}

export async function createAttachment(input: {
  taskId: string;
  type: AttachmentType;
  label: string | null;
  url: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}): Promise<void> {
  await requireUserId();

  try {
    await apiJson(`/tasks/${encodeURIComponent(input.taskId)}/attachments`, {
      body: JSON.stringify({
        type: input.type,
        label: input.label,
        url: input.url,
        mime_type: input.mimeType || null,
        size_bytes: input.sizeBytes || null,
      }),
      method: "POST",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      throw new Error("Tarefa inválida.");
    }

    throw new Error("Não foi possível adicionar o anexo.");
  }
}

export async function updateAttachment(input: {
  id: string;
  taskId: string;
  label: string | null;
  url: string;
}): Promise<void> {
  await requireUserId();
  void input.taskId;

  try {
    await apiJson(`/attachments/${encodeURIComponent(input.id)}`, {
      body: JSON.stringify({ label: input.label, url: input.url }),
      method: "PATCH",
    });
  } catch {
    throw new Error("Não foi possível atualizar o anexo.");
  }
}

export async function deleteAttachment(attachmentId: string, taskId: string): Promise<void> {
  await requireUserId();

  try {
    const attachments = await listAttachments(taskId);

    if (!attachments.some((attachment) => attachment.id === attachmentId)) {
      throw new Error("Não foi possível remover o anexo.");
    }

    await apiJson(`/attachments/${encodeURIComponent(attachmentId)}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Não foi possível remover o anexo."
    ) {
      throw error;
    }

    throw new Error("Não foi possível remover o anexo.");
  }
}
