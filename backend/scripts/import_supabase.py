"""Importa dados do Postgres do Supabase para o banco do backend próprio.

Uso:
    SUPABASE_DB_URL="postgresql://postgres:xxx@db.supabase..." \
    DATABASE_URL="postgresql+psycopg://slothdule:xxx@localhost:5432/slothdule" \
    ../.venv-backend/bin/python scripts/import_supabase.py

Pré-requisitos:
  1. `alembic upgrade head` já aplicado no banco de destino (tabelas + seeds).
  2. App em modo manutenção (sem escrita concorrente).

O que faz, por usuário de `auth.users`:
  - Cria `users` com o MESMO id, email e hash bcrypt (`encrypted_password`
    do Supabase é bcrypt — reutilizável direto; o login continua funcionando).
  - Cria `profiles` correspondente.
  - Copia todas as tabelas de negócio preservando ids (`categories`,
    `clients`, `projects`, `tasks`, `subtasks`, `reminders`, `attachments`,
    `reward_items`, `reward_redemptions`, `leaf_transactions`).
  - Itens globais (`user_id IS NULL`) são copiados uma vez (ON CONFLICT DO NOTHING).
  - NÃO copia `attachments` do Storage (ver `migrate_storage.py`).
"""

import os
import sys

import psycopg

SRC = os.environ["SUPABASE_DB_URL"]
DST = os.environ["DATABASE_URL"].replace("+psycopg", "")

TABLES_OWNED = (
    "categories",
    "clients",
    "projects",
    "tasks",
    "subtasks",
    "reminders",
    "attachments",
    "reward_items",
    "reward_redemptions",
    "leaf_transactions",
)


def columns(conn, table: str) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position",
            (table,),
        )
        return [r[0] for r in cur.fetchall()]


def main() -> None:
    src = psycopg.connect(SRC, row_factory=psycopg.rows.dict_row)
    dst = psycopg.connect(DST, autocommit=True)

    users = src.execute(
        "SELECT id, email, encrypted_password, raw_user_meta_data "
        "FROM auth.users WHERE deleted_at IS NULL"
    ).fetchall()
    print(f"Usuários no Supabase: {len(users)}")

    for u in users:
        meta = u["raw_user_meta_data"] or {}
        dst.execute(
            "INSERT INTO users (id, email, password_hash, display_name, avatar_url) "
            "VALUES (%s, %s, %s, %s, %s) ON CONFLICT (id) DO UPDATE SET "
            "email=EXCLUDED.email, password_hash=EXCLUDED.password_hash",
            (
                u["id"],
                u["email"].lower().strip(),
                u["encrypted_password"],
                meta.get("display_name"),
                meta.get("avatar_url"),
            ),
        )
        dst.execute(
            "INSERT INTO profiles (id, display_name, avatar_url) VALUES (%s, %s, %s) "
            "ON CONFLICT (id) DO NOTHING",
            (u["id"], meta.get("display_name"), meta.get("avatar_url")),
        )

    for table in TABLES_OWNED:
        cols = [c for c in columns(src, table)]
        collist = ", ".join(cols)
        placeholders = ", ".join(["%s"] * len(cols))
        rows = src.execute(f"SELECT {collist} FROM public.{table}").fetchall()
        inserted = 0
        with dst.cursor() as cur:
            for r in rows:
                # dict_row -> tupla na ordem das colunas
                if isinstance(r, dict):
                    vals = tuple(r[c] for c in cols)
                else:
                    vals = tuple(r)
                try:
                    cur.execute(
                        f"INSERT INTO {table} ({collist}) VALUES ({placeholders}) "
                        "ON CONFLICT (id) DO NOTHING",
                        vals,
                    )
                    inserted += cur.rowcount
                except Exception as exc:  # noqa: BLE001 — reporta e segue
                    print(f"  AVISO {table}: linha ignorada ({exc})", file=sys.stderr)
                    dst.rollback() if hasattr(dst, "rollback") else None
        print(f"{table}: {len(rows)} lidas, {inserted} inseridas")

    # Validação: saldo por usuário deve bater (sum(amount)).
    for u in users:
        s = src.execute(
            "SELECT COALESCE(SUM(amount),0) FROM public.leaf_transactions WHERE user_id=%s",
            (u["id"],),
        ).fetchone()
        d = dst.execute(
            "SELECT COALESCE(SUM(amount),0) FROM public.leaf_transactions WHERE user_id=%s",
            (u["id"],),
        ).fetchone()
        s_sum = s["coalesce"] if isinstance(s, dict) else s[0]
        d_sum = d["coalesce"] if isinstance(d, dict) else d[0]
        status = "OK" if s_sum == d_sum else "DIVERGENTE!"
        print(f"saldo {u['email']}: origem={s_sum} destino={d_sum} [{status}]")

    print("Import concluído. Rode em seguida scripts/migrate_storage.py para os arquivos.")


if __name__ == "__main__":
    main()
