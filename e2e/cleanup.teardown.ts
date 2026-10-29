import { test as cleanup } from "@playwright/test";
import fs from "node:fs";

import { API_URL, AUTH_STATE_PATH, E2E_TITLE_PREFIX } from "./fixtures";

cleanup.use({ storageState: AUTH_STATE_PATH });

cleanup("remover tarefas e2e do banco local", async ({ request }) => {
  if (!fs.existsSync(AUTH_STATE_PATH)) {
    return;
  }

  const response = await request.get(`${API_URL}/tasks`);
  const tasks = (await response.json()) as Array<{
    id: string;
    title: string;
  }>;

  for (const task of tasks) {
    if (!task.title.startsWith(E2E_TITLE_PREFIX)) {
      continue;
    }

    await request.delete(`${API_URL}/tasks/${task.id}`);
  }

  fs.rmSync(AUTH_STATE_PATH, { force: true });
});
