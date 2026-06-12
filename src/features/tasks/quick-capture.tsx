"use client";

import { useState } from "react";
import type { Category, TaskPriority } from "@/types/tasks";
import { createTaskAction } from "@/features/tasks/actions";

type QuickCaptureProps = {
  categories: Category[];
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export function QuickCapture({ categories }: QuickCaptureProps) {
  const [text, setText] = useState("");
  
  // Suggestion states
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [categoryId, setCategoryId] = useState("");

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getNextFriday = () => {
    const today = new Date();
    const todayDay = today.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    let daysToAdd = 5 - todayDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    const nextFriday = new Date();
    nextFriday.setDate(today.getDate() + daysToAdd);
    return getLocalDateString(nextFriday);
  };

  const handleInputChange = (val: string) => {
    setText(val);
    if (!val.trim()) {
      setTitle("");
      setDueDate("");
      setPriority("medium");
      setCategoryId(categories[0]?.id || "");
      return;
    }

    const lower = val.toLowerCase();

    // 1. Due Date
    let parsedDate = getLocalDateString(new Date()); // default: hoje
    if (/\bhoje\b/i.test(lower)) {
      parsedDate = getLocalDateString(new Date());
    } else if (/\b(amanhã|amanha)\b/i.test(lower)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      parsedDate = getLocalDateString(tomorrow);
    } else if (/\bsexta\b/i.test(lower)) {
      parsedDate = getNextFriday();
    }
    setDueDate(parsedDate);

    // 2. Priority
    let parsedPriority: TaskPriority = "medium";
    if (/\b(crítico|critico)\b/i.test(lower)) {
      parsedPriority = "critical";
    } else if (/\burgente\b/i.test(lower)) {
      parsedPriority = "high";
    }
    setPriority(parsedPriority);

    // 3. Category
    let parsedCategory = "";
    if (/\bmercado\b/i.test(lower)) {
      const match = categories.find(
        (c) => c.name.toLowerCase().includes("mercado") || c.slug === "mercado"
      );
      if (match) parsedCategory = match.id;
    } else if (/\bfinanceiro\b/i.test(lower)) {
      const match = categories.find(
        (c) => c.name.toLowerCase().includes("financeiro") || c.slug === "financeiro"
      );
      if (match) parsedCategory = match.id;
    }

    // Work keywords: reunião, reuniao, poc, proposta, relatório, relatorio
    const workKeywords = ["reunião", "reuniao", "poc", "proposta", "relatório", "relatorio"];
    if (!parsedCategory && workKeywords.some((kw) => new RegExp(`\\b${kw}\\b`, "i").test(lower))) {
      const match = categories.find(
        (c) => c.name.toLowerCase().includes("trabalho") || c.slug === "trabalho"
      );
      if (match) parsedCategory = match.id;
    }

    // Fallback category
    if (!parsedCategory) {
      const workDefault = categories.find(
        (c) => c.slug === "trabalho" || c.name.toLowerCase() === "trabalho"
      );
      parsedCategory = workDefault?.id || categories[0]?.id || "";
    }
    setCategoryId(parsedCategory);

    // 4. Title clean up
    let cleaned = val.replace(
      /\b(hoje|amanhã|amanha|sexta|urgente|crítico|critico)\b/gi,
      ""
    );
    cleaned = cleaned.replace(
      /(\bpara\b|\bde\b|\bcom\b|\bo\b|\ba\b|\bem\b|\bna\b|\bno\b|\bpara\b)\s*$/gi,
      ""
    );
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    
    // Capitalize first letter
    const finalTitle = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : val.trim();
    setTitle(finalTitle);
  };

  return (
    <div className="rounded-2xl border border-sloth-border bg-sloth-cream/5 p-4 sm:p-5 mb-6">
      <h3 className="text-sm font-semibold text-sloth-ink mb-1.5 flex items-center gap-1.5">
        ⚡ Captura Rápida
      </h3>
      <p className="text-xs text-sloth-muted mb-4">
        Digite o que fazer. Use termos como: <code className="bg-sloth-beige/40 px-1 py-0.5 rounded text-sloth-forest font-semibold">hoje</code>, <code className="bg-sloth-beige/40 px-1 py-0.5 rounded text-sloth-forest font-semibold">amanhã</code>, <code className="bg-sloth-beige/40 px-1 py-0.5 rounded text-sloth-forest font-semibold">sexta</code>, <code className="bg-sloth-beige/40 px-1 py-0.5 rounded text-sloth-forest font-semibold">urgente</code>, <code className="bg-sloth-beige/40 px-1 py-0.5 rounded text-sloth-forest font-semibold">crítico</code>, <code className="bg-sloth-beige/40 px-1 py-0.5 rounded text-sloth-forest font-semibold">reunião</code>, <code className="bg-sloth-beige/40 px-1 py-0.5 rounded text-sloth-forest font-semibold">financeiro</code>...
      </p>

      <div className="space-y-4">
        <div>
          <label className="sr-only" htmlFor="quick-input">
            Descreva a tarefa rápida
          </label>
          <input
            className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss focus:ring-3 focus:ring-sloth-moss/15 text-sm"
            id="quick-input"
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Ex: Reunião com cliente amanhã urgente"
            type="text"
            value={text}
          />
        </div>

        {/* Suggestion Card */}
        {text.trim() && (
          <form
            action={createTaskAction}
            className="rounded-xl border border-dashed border-sloth-moss/30 bg-sloth-card p-4 space-y-4 animate-in fade-in duration-200"
          >
            {/* Hidden fields representing final data to submit */}
            <input type="hidden" name="status" value="todo" />
            <input type="hidden" name="workContext" value="personal" />

            <div className="flex items-center gap-1.5 text-xs font-semibold text-sloth-forest border-b border-sloth-border/30 pb-2">
              <span>🦥</span> Sugestão Estruturada (revise se quiser)
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-sloth-muted" htmlFor="suggested-title">
                  Título da Tarefa
                </label>
                <input
                  className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-xs font-medium"
                  id="suggested-title"
                  name="title"
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  type="text"
                  value={title}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-sloth-muted" htmlFor="suggested-category">
                  Categoria
                </label>
                <select
                  className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-xs font-medium"
                  id="suggested-category"
                  name="categoryId"
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  value={categoryId}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-sloth-muted" htmlFor="suggested-priority">
                  Prioridade
                </label>
                <select
                  className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-xs font-medium"
                  id="suggested-priority"
                  name="priority"
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  value={priority}
                >
                  <option value="low">{priorityLabels.low}</option>
                  <option value="medium">{priorityLabels.medium}</option>
                  <option value="high">{priorityLabels.high}</option>
                  <option value="critical">{priorityLabels.critical}</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-sloth-muted" htmlFor="suggested-date">
                  Prazo (Data)
                </label>
                <input
                  className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-xs font-medium"
                  id="suggested-date"
                  name="dueDate"
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  type="date"
                  value={dueDate}
                />
              </div>

              <div className="flex items-end">
                <button
                  className="min-h-10 w-full rounded-xl bg-sloth-moss px-4 text-xs font-semibold text-white transition hover:bg-sloth-forest cursor-pointer flex items-center justify-center gap-1.5"
                  type="submit"
                >
                  <span>🦥</span> Confirmar e Criar
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
