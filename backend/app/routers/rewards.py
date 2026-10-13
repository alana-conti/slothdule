from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db
from app.services.leaves import user_balance

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("/items", response_model=list[schemas.RewardItemOut])
def list_items(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.RewardItem)
        .filter(
            ((models.RewardItem.user_id == user.id) | (models.RewardItem.user_id.is_(None))),
            models.RewardItem.is_active.is_(True),
        )
        .order_by(models.RewardItem.cost.asc())
        .all()
    )


@router.post("/items", response_model=schemas.RewardItemOut, status_code=201)
def create_item(
    payload: schemas.RewardItemIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    row = models.RewardItem(
        user_id=user.id,
        title=payload.title.strip(),
        description=payload.description,
        cost=payload.cost,
        icon=payload.icon,
        is_default=False,
        is_active=True,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Você já tem uma recompensa com esse nome.")
    db.refresh(row)
    return row


@router.get("/redemptions", response_model=list[schemas.RedemptionOut])
def list_redemptions(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    rows = (
        db.query(models.RewardRedemption)
        .filter(models.RewardRedemption.user_id == user.id)
        .order_by(models.RewardRedemption.redeemed_at.desc())
        .all()
    )
    out = []
    for r in rows:
        item = (
            db.query(models.RewardItem).filter(models.RewardItem.id == r.reward_item_id).first()
        )
        out.append(
            schemas.RedemptionOut(
                id=r.id,
                user_id=r.user_id,
                reward_item_id=r.reward_item_id,
                cost=r.cost,
                status=r.status,
                notes=r.notes,
                redeemed_at=r.redeemed_at,
                delivered_at=r.delivered_at,
                cancelled_at=r.cancelled_at,
                created_at=r.created_at,
                updated_at=r.updated_at,
                reward_item={"title": item.title, "icon": item.icon} if item else None,
            )
        )
    return out


@router.post("/items/{item_id}/redeem", response_model=schemas.RedemptionOut, status_code=201)
def redeem(
    item_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    item = (
        db.query(models.RewardItem)
        .filter(
            models.RewardItem.id == item_id,
            ((models.RewardItem.user_id == user.id) | (models.RewardItem.user_id.is_(None))),
            models.RewardItem.is_active.is_(True),
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Recompensa inválida ou inativa.")
    balance = user_balance(db, user.id)
    if balance < item.cost:
        raise HTTPException(status_code=400, detail="Ainda faltam algumas Folhinhas para essa recompensa.")
    redemption = models.RewardRedemption(
        user_id=user.id, reward_item_id=item.id, cost=item.cost, status=models.RewardRedemptionStatus.requested
    )
    db.add(redemption)
    db.flush()
    db.add(
        models.LeafTransaction(
            user_id=user.id,
            reward_redemption_id=redemption.id,
            type=models.LeafTransactionType.reward_redemption,
            amount=-item.cost,
            reason=f"Resgate da recompensa: {item.title}",
        )
    )
    db.commit()
    db.refresh(redemption)
    return schemas.RedemptionOut(
        id=redemption.id,
        user_id=redemption.user_id,
        reward_item_id=redemption.reward_item_id,
        cost=redemption.cost,
        status=redemption.status,
        notes=redemption.notes,
        redeemed_at=redemption.redeemed_at,
        delivered_at=redemption.delivered_at,
        cancelled_at=redemption.cancelled_at,
        created_at=redemption.created_at,
        updated_at=redemption.updated_at,
        reward_item={"title": item.title, "icon": item.icon},
    )


@router.post("/redemptions/{redemption_id}/deliver", response_model=schemas.RedemptionOut)
def deliver(
    redemption_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    row = (
        db.query(models.RewardRedemption)
        .filter(
            models.RewardRedemption.id == redemption_id,
            models.RewardRedemption.user_id == user.id,
            models.RewardRedemption.status == models.RewardRedemptionStatus.requested,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Não foi possível finalizar esse resgate.")
    row.status = models.RewardRedemptionStatus.delivered
    row.delivered_at = datetime.now(timezone.utc)
    row.cancelled_at = None
    db.commit()
    db.refresh(row)
    item = db.query(models.RewardItem).filter(models.RewardItem.id == row.reward_item_id).first()
    return schemas.RedemptionOut(
        id=row.id,
        user_id=row.user_id,
        reward_item_id=row.reward_item_id,
        cost=row.cost,
        status=row.status,
        notes=row.notes,
        redeemed_at=row.redeemed_at,
        delivered_at=row.delivered_at,
        cancelled_at=row.cancelled_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
        reward_item={"title": item.title, "icon": item.icon} if item else None,
    )


leaves_router = APIRouter(prefix="/leaves", tags=["leaves"])


@leaves_router.get("/balance", response_model=schemas.BalanceOut)
def balance(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return {"balance": user_balance(db, user.id)}


@leaves_router.get("/transactions", response_model=list[schemas.LeafTransactionOut])
def transactions(
    task_id: UUID | None = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = db.query(models.LeafTransaction).filter(models.LeafTransaction.user_id == user.id)
    if task_id is not None:
        q = q.filter(models.LeafTransaction.task_id == task_id)
    return q.order_by(models.LeafTransaction.created_at.desc()).all()
