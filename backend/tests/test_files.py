"""Upload e download de arquivos: POST .../attachments/upload e GET /files/..."""

from .helpers import make_task


def test_upload_and_serve_pdf(user_client):
    task_id = make_task(user_client)["id"]
    content = b"%PDF-1.4 fake content"
    r = user_client.post(
        f"/tasks/{task_id}/attachments/upload",
        files={"file": ("doc.pdf", content, "application/pdf")},
        data={"label": "Contrato"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["mime_type"] == "application/pdf"
    assert body["size_bytes"] == len(content)
    assert body["label"] == "Contrato"
    assert body["url"].startswith(f"/files/{body['user_id']}/{task_id}/")

    r = user_client.get(body["url"])
    assert r.status_code == 200
    assert r.content == content


def test_upload_audio_marks_type_audio(user_client):
    task_id = make_task(user_client)["id"]
    r = user_client.post(
        f"/tasks/{task_id}/attachments/upload",
        files={"file": ("nota.webm", b"fake-audio", "audio/webm")},
    )
    assert r.status_code == 201, r.text
    assert r.json()["type"] == "audio"


def test_upload_rejects_bad_mime(user_client):
    task_id = make_task(user_client)["id"]
    r = user_client.post(
        f"/tasks/{task_id}/attachments/upload",
        files={"file": ("run.exe", b"MZ...", "application/x-msdownload")},
    )
    assert r.status_code == 400


def test_upload_rejects_empty_file(user_client):
    task_id = make_task(user_client)["id"]
    r = user_client.post(
        f"/tasks/{task_id}/attachments/upload",
        files={"file": ("vazio.txt", b"", "text/plain")},
    )
    assert r.status_code == 400


def test_upload_rejects_file_over_10mb(user_client):
    task_id = make_task(user_client)["id"]
    big = b"x" * (10 * 1024 * 1024 + 1)
    r = user_client.post(
        f"/tasks/{task_id}/attachments/upload",
        files={"file": ("grande.pdf", big, "application/pdf")},
    )
    assert r.status_code == 400


def test_upload_on_other_users_task_fails(user_client, second_user_client):
    task_id = make_task(user_client)["id"]
    r = second_user_client.post(
        f"/tasks/{task_id}/attachments/upload",
        files={"file": ("nota.txt", b"ola", "text/plain")},
    )
    assert r.status_code == 404


def test_upload_requires_auth(client):
    import uuid

    r = client.post(
        f"/tasks/{uuid.uuid4()}/attachments/upload",
        files={"file": ("nota.txt", b"ola", "text/plain")},
    )
    assert r.status_code == 401


def test_other_user_cannot_fetch_file(user_client, second_user_client):
    task_id = make_task(user_client)["id"]
    r = user_client.post(
        f"/tasks/{task_id}/attachments/upload",
        files={"file": ("nota.txt", b"ola", "text/plain")},
    )
    assert r.status_code == 201, r.text
    url = r.json()["url"]
    r = second_user_client.get(url)
    assert r.status_code in (403, 404)


def test_serve_missing_file_returns_404(user_client):
    me = user_client.get("/auth/me").json()
    task_id = make_task(user_client)["id"]
    r = user_client.get(f"/files/{me['id']}/{task_id}/arquivo-que-nao-existe.txt")
    assert r.status_code == 404


def test_serve_with_wrong_user_id_returns_404(user_client):
    import uuid

    task_id = make_task(user_client)["id"]
    r = user_client.post(
        f"/tasks/{task_id}/attachments/upload",
        files={"file": ("nota.txt", b"ola", "text/plain")},
    )
    filename = r.json()["url"].rsplit("/", 1)[1]
    r = user_client.get(f"/files/{uuid.uuid4()}/{task_id}/{filename}")
    assert r.status_code == 404


def test_serve_rejects_path_traversal(user_client):
    me = user_client.get("/auth/me").json()
    task_id = make_task(user_client)["id"]
    r = user_client.get(f"/files/{me['id']}/{task_id}/..%2Fsegredo.txt")
    # 400 se o ".." chegar ao handler; 404 se o servidor normalizar o path antes.
    assert r.status_code in (400, 404)


def test_serve_requires_auth(client):
    import uuid

    uid = uuid.uuid4()
    r = client.get(f"/files/{uid}/{uuid.uuid4()}/x.txt")
    assert r.status_code == 401
