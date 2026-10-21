from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.routers import attachments, auth, categories, clients, files, projects, reminders, rewards, subtasks, tasks

app = FastAPI(title="Slothdule API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Sessão leve só para o fluxo OAuth (armazena o `state` anti-CSRF entre
# /auth/google/login e /auth/google/callback).
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret,
    same_site="lax",
    https_only=settings.cookie_secure,
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(clients.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(subtasks.router)
app.include_router(subtasks.sub_router)
app.include_router(reminders.router)
app.include_router(reminders.item_router)
app.include_router(attachments.router)
app.include_router(attachments.item_router)
app.include_router(rewards.router)
app.include_router(rewards.leaves_router)
app.include_router(files.upload_router)
app.include_router(files.files_router)
