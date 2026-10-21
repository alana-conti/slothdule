"""Cliente OAuth (Authlib) — registro lazy por provedor.

O `state` anti-CSRF fica na sessão do Starlette (SessionMiddleware em
`main.py` com `jwt_secret`). Metadados do provedor vêm do discovery URL,
então nada de endpoints fixados no código.
"""

from authlib.integrations.starlette_client import OAuth

from app.config import settings

oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)
