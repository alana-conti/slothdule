from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from authlib.integrations.base_client.errors import OAuthError
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from pydantic import EmailStr
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.deps import get_current_user, get_db
from app.oauth import oauth
from app.security import (
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    cookie_kwargs,
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

LOGIN_ERROR = "E-mail ou senha incorretos. Confira os dados e tente novamente."
GOOGLE_OFF = "Login com o Google não está disponível. Entre com e-mail e senha."
GOOGLE_FAILED = "Não foi possível concluir o login com o Google. Tente novamente."
GOOGLE_LINK_REQUIRED = (
    "Este e-mail já tem conta com senha. Para vincular o Google, entre com e-mail e senha."
)


def _redirect_login(message: str) -> RedirectResponse:
    return RedirectResponse(
        f"{settings.frontend_url}/login?error={quote(message)}", status_code=303
    )


def _resolve_google_user(
    db: Session,
    *,
    sub: str,
    email: str,
    email_verified: bool,
    display_name: str | None,
    avatar_url: str | None,
) -> models.User | None:
    """Faz upsert do usuário vindo do Google. None = conflito com conta local."""
    link = (
        db.query(models.OAuthAccount)
        .filter(models.OAuthAccount.provider == "google", models.OAuthAccount.provider_user_id == sub)
        .first()
    )
    if link:
        return db.get(models.User, link.user_id)

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        # Só vincula automáticamente quando o Google confirma o e-mail.
        if not email_verified:
            return None
        db.add(models.OAuthAccount(user_id=existing.id, provider="google", provider_user_id=sub))
        if not existing.avatar_url and avatar_url:
            existing.avatar_url = avatar_url
        db.flush()
        return existing

    user = models.User(email=email, display_name=display_name or None, avatar_url=avatar_url or None)
    db.add(user)
    db.flush()
    db.add(models.Profile(id=user.id))
    db.add(models.OAuthAccount(user_id=user.id, provider="google", provider_user_id=sub))
    db.flush()
    return user


def _set_auth_cookies(response: Response, user_id: str, db: Session) -> None:
    access = create_access_token(user_id)
    refresh = new_refresh_token()
    db.add(
        models.RefreshToken(
            user_id=user_id,
            token_hash=hash_token(refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_ttl_days),
        )
    )
    db.commit()
    response.set_cookie(ACCESS_COOKIE, access, **cookie_kwargs(settings.access_ttl_seconds))
    response.set_cookie(
        REFRESH_COOKIE, refresh, **cookie_kwargs(settings.refresh_ttl_days * 86400)
    )


@router.post("/signup", response_model=schemas.UserOut, status_code=201)
def signup(payload: schemas.SignupIn, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este e-mail já está em uso.")
    user = models.User(email=email, password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()
    db.add(models.Profile(id=user.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Este e-mail já está em uso.")
    db.refresh(user)
    return user


@router.get("/lookup")
def lookup(email: EmailStr, db: Session = Depends(get_db)):
    """Fluxo email-first: informa se já existe conta local para o e-mail."""
    normalized = str(email).lower().strip()
    user = db.query(models.User).filter(models.User.email == normalized).first()
    return {"exists": user is not None}


@router.post("/login", response_model=schemas.UserOut)
def login(payload: schemas.LoginIn, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=LOGIN_ERROR)
    _set_auth_cookies(response, str(user.id), db)
    return user


@router.post("/refresh", response_model=schemas.UserOut)
def refresh(response: Response, refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE), db: Session = Depends(get_db)):
    from app.security import REFRESH_COOKIE  # noqa: F401  (re-export guard)

    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada. Entre novamente.")
    row = db.query(models.RefreshToken).filter(models.RefreshToken.token_hash == hash_token(refresh_token)).first()
    now = datetime.now(timezone.utc)
    if not row or row.revoked_at is not None or row.expires_at < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada. Entre novamente.")
    user = db.get(models.User, row.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada. Entre novamente.")
    row.revoked_at = now
    db.flush()
    _set_auth_cookies(response, str(user.id), db)
    return user


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")
    return None


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user


@router.get("/google/login", name="google_login")
async def google_login(request: Request):
    if not settings.google_client_id or not settings.google_client_secret:
        return _redirect_login(GOOGLE_OFF)
    redirect_uri = settings.google_redirect_uri or str(request.base_url).rstrip("/") + "/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError:
        return _redirect_login(GOOGLE_FAILED)

    userinfo = token.get("userinfo") or {}
    sub = str(userinfo.get("sub") or "")
    email = str(userinfo.get("email") or "").lower().strip()
    if not sub or not email:
        return _redirect_login(GOOGLE_FAILED)

    user = _resolve_google_user(
        db,
        sub=sub,
        email=email,
        email_verified=bool(userinfo.get("email_verified")),
        display_name=userinfo.get("name"),
        avatar_url=userinfo.get("picture"),
    )
    if user is None:
        return _redirect_login(GOOGLE_LINK_REQUIRED)

    response = RedirectResponse(f"{settings.frontend_url}/today", status_code=303)
    _set_auth_cookies(response, str(user.id), db)
    return response
