"use client";

import { useState } from "react";
import Link from "next/link";
import type { Task, TaskPriority } from "@/types/tasks";

type CalendarViewProps = {
  tasks: Task[];
};

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const priorityEmojis: Record<TaskPriority, string> = {
  critical: "🔴",
  high: "🟡",
  medium: "🟢",
  low: "⚪",
};

export function CalendarView({ tasks }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Data de hoje em formato YYYY-MM-DD local
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  // Lógica de Grid do Calendário
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = startOfMonth.getDay(); // 0 a 6
  const totalDays = endOfMonth.getDate();

  const prevMonthEnd = new Date(year, month, 0);
  const prevMonthTotalDays = prevMonthEnd.getDate();

  const daysGrid: {
    dateKey: string;
    dayNumber: number;
    isCurrentMonth: boolean;
  }[] = [];

  // Dias do mês anterior
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    daysGrid.push({
      dateKey: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`,
      dayNumber: dayNum,
      isCurrentMonth: false,
    });
  }

  // Dias do mês atual
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push({
      dateKey: `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
      dayNumber: i,
      isCurrentMonth: true,
    });
  }

  // Dias do próximo mês para completar a grade de 42 slots (6 linhas x 7 colunas)
  const remainingSlots = 42 - daysGrid.length;
  for (let i = 1; i <= remainingSlots; i++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    daysGrid.push({
      dateKey: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
      dayNumber: i,
      isCurrentMonth: false,
    });
  }

  // Agrupar tarefas por data de prazo (due_date)
  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (task.dueDate) {
      if (!acc[task.dueDate]) {
        acc[task.dueDate] = [];
      }
      acc[task.dueDate].push(task);
    }
    return acc;
  }, {});

  return (
    <div className="mt-8 rounded-card border border-sloth-border bg-sloth-card p-4 shadow-soft sm:p-6 lg:p-8">
      {/* Controles de Navegação */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-sloth-border/50 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-sloth-border bg-sloth-card text-sloth-forest transition hover:bg-sloth-beige/40 cursor-pointer"
            aria-label="Mês anterior"
          >
            ◀
          </button>
          <h2 className="text-xl font-semibold text-sloth-ink sm:text-2xl min-w-[180px] text-center">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={handleNextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-sloth-border bg-sloth-card text-sloth-forest transition hover:bg-sloth-beige/40 cursor-pointer"
            aria-label="Próximo mês"
          >
            ▶
          </button>
        </div>

        <button
          onClick={handleToday}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-sloth-border bg-sloth-card px-5 text-sm font-semibold text-sloth-forest transition hover:bg-sloth-beige/40 cursor-pointer"
        >
          Ir para Hoje
        </button>
      </header>

      {/* Grid do Calendário */}
      <div className="grid grid-cols-7 border-l border-t border-sloth-border/40 text-center rounded-2xl overflow-hidden shadow-sm">
        {/* Cabeçalho dos dias da semana */}
        {dayNames.map((day) => (
          <div
            key={day}
            className="bg-sloth-beige/25 border-b border-r border-sloth-border/40 py-3 text-xs font-semibold text-sloth-muted tracking-[0.1em] uppercase"
          >
            {day}
          </div>
        ))}

        {/* Grade de dias */}
        {daysGrid.map((day, idx) => {
          const dayTasks = tasksByDate[day.dateKey] || [];
          const isToday = day.dateKey === todayStr;

          return (
            <div
              key={`${day.dateKey}-${idx}`}
              className={`min-h-[110px] sm:min-h-[140px] border-b border-r border-sloth-border/40 p-2 flex flex-col text-left transition ${
                day.isCurrentMonth
                  ? "bg-sloth-card"
                  : "bg-sloth-cream/35 opacity-70"
              }`}
            >
              {/* Cabeçalho do Dia */}
              <div className="flex justify-between items-center mb-2">
                <span
                  className={`text-xs font-semibold flex items-center justify-center h-6 w-6 rounded-full ${
                    isToday
                      ? "bg-sloth-moss text-white font-bold"
                      : day.isCurrentMonth
                        ? "text-sloth-ink"
                        : "text-sloth-muted"
                  }`}
                >
                  {day.dayNumber}
                </span>
                {isToday && (
                  <span className="text-[9px] font-semibold text-sloth-moss uppercase tracking-wider">
                    Hoje
                  </span>
                )}
              </div>

              {/* Lista de Tarefas no dia */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] sm:max-h-[100px]">
                {dayTasks.map((task) => {
                  const isDone = task.status === "done";
                  const isOverdue =
                    task.status !== "done" &&
                    task.status !== "archived" &&
                    task.dueDate < todayStr;

                  // Estilos dos cartões dependendo do estado
                  let cardStyle = "";
                  if (isDone) {
                    cardStyle =
                      "bg-sloth-beige/30 border-sloth-border/40 text-sloth-muted line-through opacity-75";
                  } else if (isOverdue) {
                    cardStyle =
                      "bg-sloth-terracotta/10 border-sloth-terracotta/35 text-sloth-terracotta font-medium";
                  } else {
                    cardStyle =
                      "bg-sloth-moss/10 border-sloth-moss/20 text-sloth-forest font-medium";
                  }

                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className={`block rounded-lg border px-1.5 py-1 text-[11px] truncate leading-normal transition hover:opacity-90 hover:scale-[1.01] ${cardStyle}`}
                      title={`${task.title} (Prazo: ${task.dueDate})`}
                    >
                      <span className="mr-1 inline-block text-[9px]">
                        {priorityEmojis[task.priority]}
                      </span>
                      {task.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda Discreta */}
      <footer className="mt-6 flex flex-wrap gap-4 text-xs text-sloth-muted justify-center border-t border-sloth-border/40 pt-4">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-sloth-moss/10 border border-sloth-moss/20" />
          <span>Ativa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-sloth-terracotta/10 border border-sloth-terracotta/35" />
          <span>Passou do prazo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-sloth-beige/30 border border-sloth-border/40" />
          <span>Concluída</span>
        </div>
        <div className="flex items-center gap-3 ml-2 border-l border-sloth-border/40 pl-4">
          <span>🔴 Crítica</span>
          <span>🟡 Alta</span>
          <span>🟢 Média</span>
          <span>⚪ Baixa</span>
        </div>
      </footer>
    </div>
  );
}
