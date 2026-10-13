"""Migra arquivos do Supabase Storage (bucket `attachments`) para disco local.

Uso:
    SUPABASE_URL="https://xyz.supabase.co" SUPABASE_SERVICE_KEY="..." \
    DATABASE_URL="postgresql+psycopg://..." DATA_DIR="/data" \
    ../.venv-backend/bin/python scripts/migrate_storage.py

Para cada `attachments.url` que aponte para o Storage público
(`.../storage/v1/object/public/attachments/<path>`):
  1. Baixa o objeto (bucket atual é público; service key como fallback).
  2. Salva em `$DATA_DIR/attachments/<path>` (mesmo layout user/task/arquivo).
  3. Atualiza a coluna `url` para `/files/<path>`.

URLs externas (links) são ignoradas. Rode DEPOIS de `import_supabase.py`.
"""

import os
from pathlib import Path

import httpx
import psycopg

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
DST = os.environ["DATABASE_URL"].replace("+psycopg", "")
DATA_DIR = Path(os.environ.get("DATA_DIR", "./data"))
MARKER = "/storage/v1/object/public/attachments/"


def main() -> None:
    conn = psycopg.connect(DST, autocommit=True)
    rows = conn.execute(
        "SELECT id, url FROM attachments WHERE url LIKE %s", (f"%{MARKER}%",)
    ).fetchall()
    print(f"Anexos no Storage: {len(rows)}")

    headers = {"apikey": SERVICE_KEY} if SERVICE_KEY else {}
    ok, failed, skipped = 0, 0, 0

    with httpx.Client(timeout=60) as http:
        for att_id, url in rows:
            rel = url.split(MARKER, 1)[1].split("?")[0]
            if ".." in rel or rel.startswith("/"):
                print(f"  IGNORADO (path suspeito): {url}")
                skipped += 1
                continue
            dest = DATA_DIR / "attachments" / rel
            try:
                resp = http.get(f"{SUPABASE_URL}/storage/v1/object/public/attachments/{rel}", headers=headers)
                resp.raise_for_status()
            except Exception as exc:  # noqa: BLE001
                print(f"  FALHOU download {rel}: {exc}")
                failed += 1
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(resp.content)
            conn.execute("UPDATE attachments SET url=%s WHERE id=%s", (f"/files/{rel}", att_id))
            ok += 1

    print(f"Concluído: {ok} migrados, {failed} falhas, {skipped} ignorados.")


if __name__ == "__main__":
    main()
