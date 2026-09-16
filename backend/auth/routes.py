"""
API routes for authentication and user management in A7SYSTEM.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.auth_middleware import get_current_user, require_role, UserContext
from shared.jwt_auth import create_access_token
from shared.validators import sanitize_string
from shared.audit import log_action
from auth.services import (
    authenticate_user,
    create_user,
    update_user,
    get_user_by_uid,
    list_users_by_company
)
from shared.errors import ForbiddenError, ValidationError

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    senha: str

class RegisterRequest(BaseModel):
    email: EmailStr
    senha: str
    nome: str
    papeis: List[str]
    empresasIds: List[str]

class UpdateUserRequest(BaseModel):
    nome: Optional[str] = None
    papeis: Optional[List[str]] = None
    empresasIds: Optional[List[str]] = None
    ativo: Optional[bool] = None

@router.post("/login", response_model=dict)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Endpoint de login. Valida email e senha e retorna token JWT.
    """
    user = authenticate_user(payload.email, payload.senha, db)
    if not user:
        raise ForbiddenError("E-mail ou senha incorretos ou usuário inativo.")
    
    empresa_id_str = str(user.empresa_id) if user.empresa_id else None
    token_data = {
        "sub": str(user.id),
        "uid": str(user.id),
        "email": user.email,
        "nome": user.nome,
        "papeis": user.papeis or [],
        "empresasIds": [empresa_id_str] if empresa_id_str else []
    }
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "uid": str(user.id),
            "email": user.email,
            "nome": user.nome,
            "papeis": user.papeis or [],
            "empresasIds": [empresa_id_str] if empresa_id_str else [],
            "empresa_ativa": empresa_id_str
        }
    }

@router.post("/register", response_model=dict)
def register(
    payload: RegisterRequest,
    current_user: UserContext = Depends(require_role("master")),
    db: Session = Depends(get_db)
):
    """
    Cadastra novo usuário (Apenas 'master').
    """
    if not payload.nome.strip():
        raise ValidationError("O nome não pode ser vazio.")
        
    nome_sanitized = sanitize_string(payload.nome)
    
    user_data = create_user(
        email=payload.email,
        senha=payload.senha,
        nome=nome_sanitized,
        papeis=payload.papeis,
        empresas_ids=payload.empresasIds,
        db=db
    )
    
    log_action(
        empresa_id=payload.empresasIds[0] if payload.empresasIds else "none",
        user_id=current_user.uid,
        acao="CREATE_USER",
        alvo=user_data["uid"],
        antes=None,
        depois=user_data
    )
    
    return user_data

@router.get("/me", response_model=dict)
def get_me(
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna os detalhes do usuário logado.
    """
    user_data = get_user_by_uid(current_user.uid, db=db)
    return {
        "uid": current_user.uid,
        "email": current_user.email,
        "nome": user_data.get("nome", ""),
        "papeis": current_user.papeis,
        "empresasIds": current_user.empresasIds,
        "ativo": user_data.get("ativo", True)
    }

@router.get("/users", response_model=List[dict])
def list_users(
    current_user: UserContext = Depends(require_role("master", "adm")),
    db: Session = Depends(get_db)
):
    """
    Lista usuários pertencentes às empresas do usuário autenticado.
    """
    users = list_users_by_company(current_user.empresasIds, db=db)
    return users

@router.get("/users/{uid}", response_model=dict)
def get_user(
    uid: str,
    current_user: UserContext = Depends(require_role("master", "adm")),
    db: Session = Depends(get_db)
):
    """
    Retorna detalhes de um usuário específico.
    """
    target_user = get_user_by_uid(uid, db=db)
    target_companies = set(target_user.get("empresasIds", []))
    caller_companies = set(current_user.empresasIds)
    
    if not target_companies.intersection(caller_companies) and "master" not in current_user.papeis:
        raise ForbiddenError("Você não tem permissão para visualizar este usuário.")
        
    return target_user

@router.put("/users/{uid}", response_model=dict)
def update_user_details(
    uid: str,
    payload: UpdateUserRequest,
    current_user: UserContext = Depends(require_role("master")),
    db: Session = Depends(get_db)
):
    """
    Atualiza usuário. Apenas 'master'.
    """
    antes = get_user_by_uid(uid, db=db)
    nome_sanitized = sanitize_string(payload.nome) if payload.nome else None
    
    depois = update_user(
        uid=uid,
        nome=nome_sanitized,
        papeis=payload.papeis,
        empresas_ids=payload.empresasIds,
        ativo=payload.ativo,
        db=db
    )
    
    log_action(
        empresa_id=current_user.empresa_ativa if current_user.empresa_ativa else "none",
        user_id=current_user.uid,
        acao="UPDATE_USER",
        alvo=uid,
        antes=antes,
        depois=depois
    )
    
    return depois
