import "server-only";

import { createClient } from "@/lib/supabase/server";
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
  due_date: string;
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

const taskSelect =
  "id, user_id, category_id, client_id, project_id, title, description, work_context, status, priority, start_date, due_date, due_time, estimated_minutes, completed_at, leaf_awarded_at, created_at, updated_at";

type RewardItemInput = {
  title: string;
  description: string | null;
  cost: number;
  icon: string | null;
};

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  return { supabase, userId };
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
    dueDate: row.due_date,
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
    completed_at: input.status === "done" ? new Date().toISOString() : null,
  };
}

export async function listCategories(): Promise<Category[]> {
  const { supabase } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, color")
    .order("name");

  if (error) {
    throw new Error("Não foi possível carregar as categorias.");
  }

  return data;
}

export async function listTasks(): Promise<Task[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskSelect)
    .eq("user_id", userId)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar suas tarefas.");
  }

  return (data as TaskRow[]).map(mapTask);
}

export async function getTask(taskId: string): Promise<Task | null> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskSelect)
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar essa tarefa.");
  }

  return data ? mapTask(data as TaskRow) : null;
}

export async function createTask(input: TaskInput) {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase.from("tasks").insert({
    ...toTaskPayload(input),
    user_id: userId,
  });

  if (error) {
    throw new Error("Não foi possível criar a tarefa.");
  }
}

export async function updateTask(
  taskId: string,
  input: TaskInput,
): Promise<{ leavesAwarded: number }> {
  const { supabase, userId } = await getAuthenticatedClient();

  const { data: currentTask, error: fetchError } = await supabase
    .from("tasks")
    .select("id, status, completed_at, leaf_awarded_at")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError || !currentTask) {
    throw new Error("Não foi possível carregar a tarefa para atualização.");
  }

  const payload = toTaskPayload(input);
  const shouldReportAward =
    input.status === "done" && !currentTask.leaf_awarded_at;

  if (
    input.status === "done" &&
    currentTask.status === "done" &&
    currentTask.completed_at
  ) {
    payload.completed_at = currentTask.completed_at;
  }

  // The database trigger awards Folhinhas atomically with this update.
  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível atualizar essa tarefa.");
  }

  if (!shouldReportAward) {
    return { leavesAwarded: 0 };
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from("leaf_transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("task_id", taskId);

  if (transactionsError) {
    return { leavesAwarded: 0 };
  }

  return {
    leavesAwarded: transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    ),
  };
}

export async function archiveTask(taskId: string) {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "archived" })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível arquivar essa tarefa.");
  }
}

export async function deleteTask(taskId: string) {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível excluir essa tarefa.");
  }
}

export async function listSubtasks(taskId: string): Promise<Subtask[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("subtasks")
    .select(
      "id, user_id, task_id, title, is_done, position, created_at, updated_at",
    )
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar as subtarefas.");
  }

  return (data as SubtaskRow[]).map(mapSubtask);
}

export async function createSubtask(taskId: string, title: string) {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (taskError || !task) {
    throw new Error("Tarefa inválida.");
  }

  const { data: lastSubtask, error: positionError } = await supabase
    .from("subtasks")
    .select("position")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (positionError) {
    throw new Error("Não foi possível definir a ordem da subtarefa.");
  }

  const { error } = await supabase.from("subtasks").insert({
    user_id: userId,
    task_id: taskId,
    title,
    position: (lastSubtask?.position ?? -1) + 1,
  });

  if (error) {
    throw new Error("Não foi possível adicionar a subtarefa.");
  }
}

export async function updateSubtaskTitle(
  taskId: string,
  subtaskId: string,
  title: string,
) {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("subtasks")
    .update({ title })
    .eq("id", subtaskId)
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível editar essa subtarefa.");
  }
}

export async function setSubtaskCompletion(
  taskId: string,
  subtaskId: string,
  isDone: boolean,
) {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("subtasks")
    .update({ is_done: isDone })
    .eq("id", subtaskId)
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível atualizar essa subtarefa.");
  }
}

export async function deleteSubtask(taskId: string, subtaskId: string) {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("subtasks")
    .delete()
    .eq("id", subtaskId)
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível remover essa subtarefa.");
  }
}

export async function getUserLeafBalance(): Promise<number> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("leaf_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Fallback: soma manual das transações
    const { data: txs, error: txError } = await supabase
      .from("leaf_transactions")
      .select("amount")
      .eq("user_id", userId);

    if (txError) {
      return 0;
    }
    return txs.reduce((sum, tx) => sum + tx.amount, 0);
  }

  return data?.balance ?? 0;
}

export async function listActiveRewardItems(): Promise<RewardItem[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("reward_items")
    .select("id, user_id, title, description, cost, icon, is_default, is_active, created_at, updated_at")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .eq("is_active", true)
    .order("cost", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar as recompensas.");
  }

  return (data || []).map((row) => ({
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
}

export async function listRewardRedemptions(): Promise<RewardRedemption[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("reward_redemptions")
    .select(`
      id,
      user_id,
      reward_item_id,
      cost,
      status,
      notes,
      redeemed_at,
      delivered_at,
      cancelled_at,
      created_at,
      updated_at,
      reward_items (
        title,
        icon
      )
    `)
    .eq("user_id", userId)
    .order("redeemed_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar o histórico de resgates.");
  }

  return ((data || []) as Array<{
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
    reward_items: {
      title: string;
      icon: string | null;
    } | {
      title: string;
      icon: string | null;
    }[] | null;
  }>).map((row) => ({
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
    rewardItem: row.reward_items
      ? {
          title: Array.isArray(row.reward_items)
            ? row.reward_items[0]?.title
            : row.reward_items.title,
          icon: Array.isArray(row.reward_items)
            ? row.reward_items[0]?.icon
            : row.reward_items.icon,
        }
      : undefined,
  }));
}

export async function createRewardItem(input: RewardItemInput): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase.from("reward_items").insert({
    user_id: userId,
    title: input.title,
    description: input.description,
    cost: input.cost,
    icon: input.icon,
    is_default: false,
    is_active: true,
  });

  if (error?.code === "23505") {
    throw new Error("Você já tem uma recompensa com esse nome.");
  }

  if (error) {
    throw new Error("Não foi possível criar a recompensa.");
  }
}

export async function redeemReward(rewardItemId: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();

  // 1. Fetch the reward item to check the cost
  const { data: item, error: itemError } = await supabase
    .from("reward_items")
    .select("id, title, cost")
    .eq("id", rewardItemId)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .eq("is_active", true)
    .maybeSingle();

  if (itemError || !item) {
    throw new Error("Recompensa inválida ou inativa.");
  }

  // 2. Fetch the user's current balance
  const balance = await getUserLeafBalance();

  if (balance < item.cost) {
    throw new Error("Ainda faltam algumas Folhinhas para essa recompensa.");
  }

  // 3. Create the reward redemption
  const { data: redemption, error: redemptionError } = await supabase
    .from("reward_redemptions")
    .insert({
      user_id: userId,
      reward_item_id: rewardItemId,
      cost: item.cost,
      status: "requested"
    })
    .select("id")
    .maybeSingle();

  if (redemptionError || !redemption) {
    throw new Error("Não foi possível solicitar o resgate.");
  }

  // 4. Create the negative leaf transaction
  const { error: txError } = await supabase
    .from("leaf_transactions")
    .insert({
      user_id: userId,
      reward_redemption_id: redemption.id,
      type: "reward_redemption",
      amount: -item.cost,
      reason: `Resgate da recompensa: ${item.title}`
    });

  if (txError) {
    throw new Error("Não foi possível debitar o valor em Folhinhas.");
  }
}

export async function markRewardRedemptionDelivered(
  redemptionId: string,
): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("reward_redemptions")
    .update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
      cancelled_at: null,
    })
    .eq("id", redemptionId)
    .eq("user_id", userId)
    .eq("status", "requested")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível finalizar esse resgate.");
  }
}

export async function listClients(): Promise<Client[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, user_id, name, notes, created_at, updated_at")
    .eq("user_id", userId)
    .order("name");

  if (error) {
    throw new Error("Não foi possível carregar os clientes.");
  }

  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function listProjects(): Promise<Project[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, client_id, name, type, status, notes, created_at, updated_at")
    .eq("user_id", userId)
    .order("name");

  if (error) {
    throw new Error("Não foi possível carregar os projetos.");
  }

  return (data || []).map((row) => ({
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
}

export async function listReminders(taskId: string): Promise<Reminder[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("id, user_id, task_id, title, remind_at, channel, horizon, is_sent, created_at, updated_at")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .order("remind_at", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar os lembretes.");
  }

  return (data || []).map((row) => ({
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
}

export async function createReminder(input: {
  taskId: string;
  title: string;
  remindAt: string;
  channel: ReminderChannel;
  horizon: ReminderHorizon;
}): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", input.taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (taskError || !task) {
    throw new Error("Tarefa inválida.");
  }

  const { error } = await supabase.from("reminders").insert({
    user_id: userId,
    task_id: input.taskId,
    title: input.title,
    remind_at: input.remindAt,
    channel: input.channel,
    horizon: input.horizon,
  });

  if (error) {
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
  const { supabase, userId } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("reminders")
    .update({
      title: input.title,
      remind_at: input.remindAt,
      channel: input.channel,
      horizon: input.horizon,
    })
    .eq("id", input.id)
    .eq("task_id", input.taskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível atualizar o lembrete.");
  }
}

export async function deleteReminder(reminderId: string, taskId: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", reminderId)
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível remover o lembrete.");
  }
}

export async function listAttachments(taskId: string): Promise<Attachment[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("id, user_id, task_id, type, label, url, mime_type, size_bytes, created_at")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar os anexos.");
  }

  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    type: row.type,
    label: row.label,
    url: row.url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }));
}

export async function createAttachment(input: {
  taskId: string;
  type: AttachmentType;
  label: string | null;
  url: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", input.taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (taskError || !task) {
    throw new Error("Tarefa inválida.");
  }

  const { error } = await supabase.from("attachments").insert({
    user_id: userId,
    task_id: input.taskId,
    type: input.type,
    label: input.label,
    url: input.url,
    mime_type: input.mimeType || null,
    size_bytes: input.sizeBytes || null,
  });

  if (error) {
    throw new Error("Não foi possível adicionar o anexo.");
  }
}

export async function updateAttachment(input: {
  id: string;
  taskId: string;
  label: string | null;
  url: string;
}): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("attachments")
    .update({
      label: input.label,
      url: input.url,
    })
    .eq("id", input.id)
    .eq("task_id", input.taskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível atualizar o anexo.");
  }
}

export async function deleteAttachment(attachmentId: string, taskId: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível remover o anexo.");
  }
}
