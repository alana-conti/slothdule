from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.deps import get_current_user, get_db
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
