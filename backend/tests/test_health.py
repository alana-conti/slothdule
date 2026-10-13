"""GET /health — pública, sem auth."""


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200, r.text
    assert r.json() == {"status": "ok"}
