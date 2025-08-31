from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_active_user

router = APIRouter()


@router.post("/", response_model=schemas.Session)
def create_session(
    session: schemas.SessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_session = models.Session(**session.dict(), user_id=current_user.id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.get("/", response_model=List[schemas.Session])
def read_sessions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    sessions = (
        db.query(models.Session)
        .filter(models.Session.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return sessions


@router.get("/{session_id}", response_model=schemas.SessionFull)
def read_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return db_session


@router.put("/{session_id}", response_model=schemas.Session)
def update_session(
    session_id: int,
    session: schemas.SessionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    for key, value in session.dict().items():
        setattr(db_session, key, value)
    
    db.commit()
    db.refresh(db_session)
    return db_session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(db_session)
    db.commit()
    return None


# Variable endpoints
@router.post("/variables/", response_model=schemas.Variable)
def create_variable(
    variable: schemas.VariableCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    # Verify session belongs to user
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == variable.session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db_variable = models.Variable(**variable.dict())
    db.add(db_variable)
    db.commit()
    db.refresh(db_variable)
    return db_variable


@router.get("/variables/{variable_id}", response_model=schemas.Variable)
def read_variable(
    variable_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_variable = db.query(models.Variable).filter(models.Variable.id == variable_id).first()
    if db_variable is None:
        raise HTTPException(status_code=404, detail="Variable not found")
    
    # Verify session belongs to user
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == db_variable.session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return db_variable


@router.put("/variables/{variable_id}", response_model=schemas.Variable)
def update_variable(
    variable_id: int,
    variable: schemas.VariableUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_variable = db.query(models.Variable).filter(models.Variable.id == variable_id).first()
    if db_variable is None:
        raise HTTPException(status_code=404, detail="Variable not found")
    
    # Verify session belongs to user
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == db_variable.session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    for key, value in variable.dict().items():
        setattr(db_variable, key, value)
    
    db.commit()
    db.refresh(db_variable)
    return db_variable


@router.delete("/variables/{variable_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variable(
    variable_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_variable = db.query(models.Variable).filter(models.Variable.id == variable_id).first()
    if db_variable is None:
        raise HTTPException(status_code=404, detail="Variable not found")
    
    # Verify session belongs to user
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == db_variable.session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(db_variable)
    db.commit()
    return None


# History endpoints
@router.post("/history/", response_model=schemas.History)
def create_history(
    history: schemas.HistoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    # Verify session belongs to user
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == history.session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db_history = models.History(**history.dict())
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history


@router.get("/history/{session_id}", response_model=List[schemas.History])
def read_history(
    session_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    # Verify session belongs to user
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    history = (
        db.query(models.History)
        .filter(models.History.session_id == session_id)
        .order_by(models.History.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return history