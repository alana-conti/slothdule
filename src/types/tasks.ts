export const taskPriorities = ["low", "medium", "high", "critical"] as const;
export const taskStatuses = [
  "todo",
  "in_progress",
  "waiting",
  "done",
  "archived",
] as const;
export const workContexts = [
  "personal",
  "internal_work",
  "client_work",
] as const;

export type TaskPriority = (typeof taskPriorities)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type WorkContext = (typeof workContexts)[number];

export type Category = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

export type Task = {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  description: string | null;
  workContext: WorkContext;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string;
  dueTime: string | null;
  estimatedMinutes: number | null;
  completedAt: string | null;
  leafAwardedAt: string | null;
  clientId: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskInput = {
  categoryId: string;
  title: string;
  description: string | null;
  workContext: WorkContext;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string;
  dueTime: string | null;
  estimatedMinutes: number | null;
};

export type Subtask = {
  id: string;
  userId: string;
  taskId: string;
  title: string;
  isDone: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type RewardItem = {
  id: string;
  userId: string | null;
  title: string;
  description: string | null;
  cost: number;
  icon: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RewardRedemptionStatus = "requested" | "delivered" | "cancelled";

export type RewardRedemption = {
  id: string;
  userId: string;
  rewardItemId: string;
  cost: number;
  status: RewardRedemptionStatus;
  notes: string | null;
  redeemedAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  rewardItem?: {
    title: string;
    icon: string | null;
  };
};

export type Client = {
  id: string;
  userId: string;
  name: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  userId: string;
  clientId: string | null;
  name: string;
  type: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export const reminderChannels = ["push", "app", "telegram", "whatsapp"] as const;
export const reminderHorizons = ["short", "medium", "long"] as const;

export type ReminderChannel = (typeof reminderChannels)[number];
export type ReminderHorizon = (typeof reminderHorizons)[number];

export type Reminder = {
  id: string;
  userId: string;
  taskId: string | null;
  title: string;
  remindAt: string;
  channel: ReminderChannel;
  horizon: ReminderHorizon;
  isSent: boolean;
  createdAt: string;
  updatedAt: string;
};

export const attachmentTypes = ["link", "audio", "file"] as const;
export type AttachmentType = (typeof attachmentTypes)[number];

export type Attachment = {
  id: string;
  userId: string;
  taskId: string;
  type: AttachmentType;
  label: string | null;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};
