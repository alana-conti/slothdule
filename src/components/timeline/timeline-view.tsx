"use client";

import { useState } from "react";
import Link from "next/link";
import type { Task, Category, Client, Project, TaskPriority, TaskStatus } from "@/types/tasks";

type TimelineViewProps = {
  tasks: Task[];
  categories: Category[];
  clients: Client[];
  projects: Project[];
};

const priorityEmojis: Record<TaskPriority, string> = {
  critical: "🔴",
  high: "🟡",
  medium: "🟢",
  low: "⚪",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  done: "Concluída",
  archived: "Arquivada",
};

// Helper to parse timezone-naive date string to Local Date
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
  }).format(date).slice(0, 3);
}

export function TimelineView({ tasks, categories, clients, projects }: TimelineViewProps) {
  const [groupBy, setGroupBy] = useState<"category" | "client" | "project" | "status">("category");
  
  // Date window start (defaults to 7 days before today)
  const [windowStart, setWindowStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 7);
    return d;
  });

  // Calculate 30 days in the current window
  const days: Date[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  const handlePrev = () => {
    const nextStart = new Date(windowStart);
    nextStart.setDate(nextStart.getDate() - 30);
    setWindowStart(nextStart);
  };

  const handleNext = () => {
    const nextStart = new Date(windowStart);
    nextStart.setDate(nextStart.getDate() + 30);
    setWindowStart(nextStart);
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 7);
    setWindowStart(d);
  };

  // Helper Maps for mapping ID to Name/Label
  const categoriesMap = new Map(categories.map((c) => [c.id, c]));
  const clientsMap = new Map(clients.map((c) => [c.id, c]));
  const projectsMap = new Map(projects.map((p) => [p.id, p]));

  // 1. Group tasks
  const groupedTasks: Record<string, { name: string; color?: string | null; tasks: Task[] }> = {};

  tasks.forEach((task) => {
    let groupKey = "";
    let groupName = "";
    let groupColor: string | null | undefined = null;

    if (groupBy === "category") {
      groupKey = task.categoryId;
      const cat = categoriesMap.get(task.categoryId);
      groupName = cat?.name || "Sem Categoria";
      groupColor = cat?.color;
    } else if (groupBy === "client") {
      groupKey = task.clientId || "none";
      groupName = task.clientId ? (clientsMap.get(task.clientId)?.name || "Cliente Desconhecido") : "Sem Cliente";
    } else if (groupBy === "project") {
      groupKey = task.projectId || "none";
      groupName = task.projectId ? (projectsMap.get(task.projectId)?.name || "Projeto Desconhecido") : "Sem Projeto";
    } else if (groupBy === "status") {
      groupKey = task.status;
      groupName = statusLabels[task.status];
    }

    if (!groupedTasks[groupKey]) {
      groupedTasks[groupKey] = { name: groupName, color: groupColor, tasks: [] };
    }
    groupedTasks[groupKey].tasks.push(task);
  });

  // 2. Sort groups
  const sortedGroupKeys = Object.keys(groupedTasks).sort((a, b) => {
    if (groupBy === "status") {
      const order = ["todo", "in_progress", "waiting", "done", "archived"];
      return order.indexOf(a) - order.indexOf(b);
    }
    // "none" or "Sem Cliente" / "Sem Projeto" should ideally appear at the end
    if (a === "none") return 1;
    if (b === "none") return -1;
    return groupedTasks[a].name.localeCompare(groupedTasks[b].name);
  });

  // Window bounds for overlap checking
  const winStart = new Date(windowStart);
  winStart.setHours(0, 0, 0, 0);
  const winEnd = new Date(days[days.length - 1]);
  winEnd.setHours(0, 0, 0, 0);

  const oneDayMs = 24 * 60 * 60 * 1000;

  return (
    <div className="mt-8 rounded-card border border-sloth-border bg-sloth-card p-4 shadow-soft sm:p-6 lg:p-8">
      {/* Controles de Agrupamento e Janela Temporal */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-sloth-border/50 pb-6 mb-6">
        {/* Filtros de Agrupamento */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-sloth-muted">
            Agrupar por:
          </span>
          <div className="flex flex-wrap gap-2">
            {(["category", "client", "project", "status"] as const).map((option) => {
              const labels = {
                category: "Categoria",
                client: "Cliente",
                project: "Projeto",
                status: "Status",
              };
              const active = groupBy === option;
              return (
                <button
                  key={option}
                  onClick={() => setGroupBy(option)}
                  className={`min-h-10 rounded-xl px-4 text-xs font-semibold border transition cursor-pointer ${
                    active
                      ? "bg-sloth-moss border-sloth-moss text-white"
                      : "bg-sloth-card border-sloth-border text-sloth-forest hover:bg-sloth-beige/40"
                  }`}
                >
                  {labels[option]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controles do Calendário/Horizonte */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handlePrev}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-sloth-border bg-sloth-card text-sloth-forest transition hover:bg-sloth-beige/40 cursor-pointer"
            aria-label="Anterior"
          >
            ◀
          </button>
          
          <span className="text-sm font-semibold text-sloth-ink min-w-[200px] text-center bg-sloth-beige/20 border border-sloth-border/40 rounded-xl px-4 py-2">
            {formatDateLabel(days[0])} — {formatDateLabel(days[days.length - 1])}
          </span>

          <button
            onClick={handleNext}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-sloth-border bg-sloth-card text-sloth-forest transition hover:bg-sloth-beige/40 cursor-pointer"
            aria-label="Próximo"
          >
            ▶
          </button>

          <button
            onClick={handleToday}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-sloth-border bg-sloth-card px-5 text-xs font-semibold text-sloth-forest transition hover:bg-sloth-beige/40 cursor-pointer"
          >
            Hoje
          </button>
        </div>
      </header>

      {/* Timeline scrollable container */}
      <div className="overflow-x-auto rounded-2xl border border-sloth-border/40 bg-sloth-card shadow-sm">
        <div className="min-w-[1200px]">
          {/* Header Row */}
          <div className="grid grid-cols-[280px_1fr] border-b border-sloth-border/50 bg-sloth-beige/15">
            <div className="sticky left-0 bg-sloth-card/95 backdrop-blur-sm z-10 px-4 py-3 text-xs font-bold text-sloth-muted uppercase tracking-wider border-r border-sloth-border/40 flex items-center shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
              Tarefas
            </div>
            
            {/* Horizontal Timeline Scale */}
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}
            >
              {days.map((day, idx) => {
                const isToday = day.getTime() === todayTime;
                return (
                  <div
                    key={idx}
                    className={`border-r border-sloth-border/20 py-2.5 flex flex-col items-center justify-center text-center transition ${
                      isToday
                        ? "bg-sloth-moss/10 border-x border-dashed border-sloth-moss/30"
                        : "odd:bg-sloth-beige/5"
                    }`}
                  >
                    <span className={`text-[9px] font-semibold uppercase tracking-wider ${
                      isToday ? "text-sloth-moss font-bold" : "text-sloth-muted"
                    }`}>
                      {formatWeekday(day)}
                    </span>
                    <span className={`text-xs font-bold mt-0.5 ${
                      isToday
                        ? "text-sloth-moss h-5 w-5 bg-sloth-moss/20 rounded-full flex items-center justify-center font-extrabold"
                        : "text-sloth-ink"
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Groups and Tasks */}
          {sortedGroupKeys.map((groupKey) => {
            const group = groupedTasks[groupKey];
            if (!group || group.tasks.length === 0) return null;

            return (
              <div key={groupBy + "-" + groupKey}>
                {/* Group Header Row */}
                <div className="grid grid-cols-[280px_1fr] border-b border-sloth-border/40 bg-sloth-beige/25 font-bold text-sloth-ink text-xs uppercase tracking-wider">
                  <div className="sticky left-0 bg-sloth-beige/35 backdrop-blur-sm z-10 px-4 py-2 flex items-center gap-2 border-r border-sloth-border/40 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                    {group.color && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                    )}
                    <span>{group.name}</span>
                    <span className="ml-1 rounded-full bg-sloth-beige/60 px-1.5 py-0.5 text-[10px] font-medium normal-case text-sloth-forest border border-sloth-border/30">
                      {group.tasks.length}
                    </span>
                  </div>
                  <div className="py-2 bg-sloth-beige/10" />
                </div>

                {/* Task Rows */}
                {group.tasks.map((task) => {
                  const tStart = parseDate(task.startDate || task.dueDate);
                  const tEnd = parseDate(task.dueDate);
                  
                  tStart.setHours(0, 0, 0, 0);
                  tEnd.setHours(0, 0, 0, 0);

                  // Calculate column span
                  const startCol = Math.floor((tStart.getTime() - winStart.getTime()) / oneDayMs) + 1;
                  const endCol = Math.floor((tEnd.getTime() - winStart.getTime()) / oneDayMs) + 2;

                  const overlaps = tStart.getTime() <= winEnd.getTime() && tEnd.getTime() >= winStart.getTime();

                  const isDone = task.status === "done";
                  const isOverdue = !isDone && task.status !== "archived" && task.dueDate < today.toISOString().split("T")[0];

                  // Style class depending on status
                  let barStyle = "";
                  if (isDone) {
                    barStyle = "bg-sloth-beige/45 border border-sloth-border text-sloth-muted line-through opacity-80";
                  } else if (isOverdue) {
                    barStyle = "bg-sloth-terracotta/20 border border-sloth-terracotta/40 text-sloth-terracotta font-medium";
                  } else {
                    barStyle = "bg-sloth-moss/15 border border-sloth-moss/35 text-sloth-forest font-medium";
                  }

                  return (
                    <div
                      key={task.id}
                      className="grid grid-cols-[280px_1fr] border-b border-sloth-border/30 hover:bg-sloth-beige/10 min-h-[48px] transition"
                    >
                      {/* Sidebar Task Name */}
                      <div className="sticky left-0 bg-sloth-card/95 backdrop-blur-sm z-10 px-4 py-2 border-r border-sloth-border/40 flex items-center shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] select-none">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="text-xs font-medium text-sloth-ink truncate hover:text-sloth-forest hover:underline transition max-w-[248px]"
                          title={`${task.title} (Prazo: ${task.dueDate})`}
                        >
                          <span className="mr-1.5 inline-block text-[10px]">
                            {priorityEmojis[task.priority]}
                          </span>
                          {task.title}
                        </Link>
                      </div>

                      {/* Timeline Cell Area */}
                      <div
                        className="grid relative"
                        style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}
                      >
                        {/* Render columns background with today highlight */}
                        {days.map((day, idx) => {
                          const isToday = day.getTime() === todayTime;
                          return (
                            <div
                              key={idx}
                              className={`border-r border-sloth-border/10 h-full ${
                                isToday ? "bg-sloth-moss/5 border-x border-dashed border-sloth-moss/20" : ""
                              }`}
                            />
                          );
                        })}

                        {/* Render horizontal Gantt bar if task overlaps current window */}
                        {overlaps && (
                          <Link
                            href={`/tasks/${task.id}`}
                            className={`absolute inset-x-0 h-7 mx-1 flex items-center px-2 rounded-lg text-[10px] leading-none truncate shadow-sm transition hover:scale-[1.01] hover:shadow-md cursor-pointer select-none ${barStyle}`}
                            style={{
                              gridColumnStart: Math.max(1, startCol),
                              gridColumnEnd: Math.min(31, endCol),
                              alignSelf: "center",
                              zIndex: 1,
                            }}
                            title={`${task.title} (${task.startDate ? `De ${task.startDate} até` : "Prazo em:"} ${task.dueDate})`}
                          >
                            <span className="mr-1 text-[9px] shrink-0">
                              {priorityEmojis[task.priority]}
                            </span>
                            <span className="truncate">{task.title}</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda Discreta */}
      <footer className="mt-8 flex flex-wrap gap-5 text-xs text-sloth-muted justify-center border-t border-sloth-border/40 pt-5">
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-sloth-moss/15 border border-sloth-moss/35" />
          <span>Ativa / No prazo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-sloth-terracotta/20 border border-sloth-terracotta/40" />
          <span>Atrasada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-sloth-beige/45 border border-sloth-border" />
          <span>Concluída</span>
        </div>
        <div className="flex items-center gap-3 ml-2 border-l border-sloth-border/40 pl-5">
          <span>🔴 Crítica</span>
          <span>🟡 Alta</span>
          <span>🟢 Média</span>
          <span>⚪ Baixa</span>
        </div>
      </footer>
    </div>
  );
}
