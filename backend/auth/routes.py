"""
API routes for authentication and user management in A7SYSTEM.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr

from shared.auth_middleware import get_current_user, require_role, UserContext
from shared.validators import sanitize_string
from shared.audit import log_action
from auth.services import (
    create_user,
    update_user,
    get_user_by_uid,
    list_users_by_company,
    refresh_user_claims
)
from shared.errors import ForbiddenError, ValidationError

router = APIRouter()

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

@router.post("/register", response_model=dict)
def register(
    payload: RegisterRequest,
    current_user: UserContext = Depends(require_role("master"))
):
    """
    Registers a new user. Only accessible by 'master'.
    """
    if not payload.nome.strip():
        raise ValidationError("O nome não pode ser vazio.")
        
    nome_sanitized = sanitize_string(payload.nome)
    
    user_data = create_user(
        email=payload.email,
        senha=payload.senha,
        nome=nome_sanitized,
        papeis=payload.papeis,
        empresas_ids=payload.empresasIds
    )
    
    log_action(
        empresa_id=payload.empresasIds[0] if payload.empresasIds else "none",
        user_id=current_user.uid,
        acao="CREATE_USER",
        alvo=user_data["uid"],
        antes=None,
        depois=user_data
    )
    
    return {
        "uid": user_data["uid"],
        "email": user_data["email"],
        "nome": user_data["nome"],
        "papeis": user_data["papeis"],
        "empresasIds": user_data["empresasIds"]
    }

@router.get("/me", response_model=dict)
def get_me(current_user: UserContext = Depends(get_current_user)):
    """
    Returns the currently authenticated user's details.
    """
    user_data = get_user_by_uid(current_user.uid)
    
    return {
        "uid": current_user.uid,
        "email": current_user.email,
        "nome": user_data.get("nome", ""),
        "papeis": current_user.papeis,
        "empresasIds": current_user.empresasIds,
        "ativo": user_data.get("ativo", True)
    }

@router.get("/users", response_model=List[dict])
def list_users(current_user: UserContext = Depends(require_role("master", "adm"))):
    """
    Lists users belonging to any of the caller's companies.
    """
    users = list_users_by_company(current_user.empresasIds)
    return users

@router.get("/users/{uid}", response_model=dict)
def get_user(uid: str, current_user: UserContext = Depends(require_role("master", "adm"))):
    """
    Gets details for a specific user with anti-IDOR checks.
    """
    target_user = get_user_by_uid(uid)
    
    target_companies = set(target_user.get("empresasIds", []))
    caller_companies = set(current_user.empresasIds)
    
    if not target_companies.intersection(caller_companies) and "master" not in current_user.papeis:
        raise ForbiddenError("Você não tem permissão para visualizar este usuário.")
        
    return target_user

@router.put("/users/{uid}", response_model=dict)
def update_user_details(
    uid: str,
    payload: UpdateUserRequest,
    current_user: UserContext = Depends(require_role("master"))
):
    """
    Updates a user. Only accessible by 'master'.
    """
    antes = get_user_by_uid(uid)
    nome_sanitized = sanitize_string(payload.nome) if payload.nome else None
    
    depois = update_user(
        uid=uid,
        nome=nome_sanitized,
        papeis=payload.papeis,
        empresas_ids=payload.empresasIds,
        ativo=payload.ativo
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

@router.post("/users/{uid}/refresh-claims", response_model=dict)
def force_refresh_claims(uid: str, current_user: UserContext = Depends(require_role("master"))):
    """
    Forces a refresh of a user's custom claims.
    """
    claims = refresh_user_claims(uid)
    return claims
