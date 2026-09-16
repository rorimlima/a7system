"""
Service layer for authentication logic in A7SYSTEM using PostgreSQL (Supabase).
"""
import re
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from shared.models import Usuario, Empresa
from shared.jwt_auth import hash_password, verify_password
from shared.errors import ValidationError, NotFoundError, ConflictError

def validate_password_strength(senha: str) -> bool:
    if len(senha) < 8:
        return False
    if not re.search(r"[A-Z]", senha):
        return False
    if not re.search(r"[a-z]", senha):
        return False
    if not re.search(r"\d", senha):
        return False
    return True

def authenticate_user(email: str, senha: str, db: Session) -> Optional[Usuario]:
    """Valida as credenciais do usuário."""
    user = db.query(Usuario).filter(Usuario.email == email.lower().strip()).first()
    if not user:
        return None
    if not user.ativo:
        return None
    if not verify_password(senha, user.senha_hash):
        return None
    return user

def create_user(
    email: str, 
    senha: str, 
    nome: str, 
    papeis: List[str], 
    empresas_ids: List[str],
    db: Session
) -> Dict[str, Any]:
    """Cria um novo usuário no banco PostgreSQL."""
    email_clean = email.lower().strip()
    existing = db.query(Usuario).filter(Usuario.email == email_clean).first()
    if existing:
        raise ConflictError(f"Usuário com e-mail '{email_clean}' já cadastrado.")

    empresa_id = None
    if empresas_ids:
        try:
            empresa_id = uuid.UUID(str(empresas_ids[0]))
        except ValueError:
            pass

    hashed = hash_password(senha)
    new_user = Usuario(
        nome=nome.strip(),
        email=email_clean,
        senha_hash=hashed,
        papeis=papeis,
        empresa_id=empresa_id,
        ativo=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "uid": str(new_user.id),
        "email": new_user.email,
        "nome": new_user.nome,
        "papeis": new_user.papeis or [],
        "empresasIds": [str(new_user.empresa_id)] if new_user.empresa_id else [],
        "ativo": new_user.ativo
    }

def update_user(
    uid: str,
    nome: Optional[str],
    papeis: Optional[List[str]],
    empresas_ids: Optional[List[str]],
    ativo: Optional[bool],
    db: Session
) -> Dict[str, Any]:
    """Atualiza os dados de um usuário no PostgreSQL."""
    user = db.query(Usuario).filter(Usuario.id == uid).first()
    if not user:
        raise NotFoundError(f"Usuário {uid} não encontrado.")

    if nome is not None:
        user.nome = nome.strip()
    if papeis is not None:
        user.papeis = papeis
    if empresas_ids is not None and empresas_ids:
        user.empresa_id = uuid.UUID(str(empresas_ids[0]))
    if ativo is not None:
        user.ativo = ativo

    db.commit()
    db.refresh(user)

    return {
        "uid": str(user.id),
        "email": user.email,
        "nome": user.nome,
        "papeis": user.papeis or [],
        "empresasIds": [str(user.empresa_id)] if user.empresa_id else [],
        "ativo": user.ativo
    }

def get_user_by_uid(uid: str, db: Session) -> Dict[str, Any]:
    """Busca usuário por ID."""
    user = db.query(Usuario).filter(Usuario.id == uid).first()
    if not user:
        raise NotFoundError(f"Usuário {uid} não encontrado.")
    return {
        "uid": str(user.id),
        "email": user.email,
        "nome": user.nome,
        "papeis": user.papeis or [],
        "empresasIds": [str(user.empresa_id)] if user.empresa_id else [],
        "ativo": user.ativo
    }

def list_users_by_company(empresas_ids: List[str], db: Session) -> List[Dict[str, Any]]:
    """Lista usuários pertencentes às empresas informadas."""
    query = db.query(Usuario)
    if empresas_ids:
        uuids = [uuid.UUID(str(eid)) for eid in empresas_ids if eid]
        query = query.filter(Usuario.empresa_id.in_(uuids))
    users = query.all()
    return [
        {
            "uid": str(u.id),
            "email": u.email,
            "nome": u.nome,
            "papeis": u.papeis or [],
            "empresasIds": [str(u.empresa_id)] if u.empresa_id else [],
            "ativo": u.ativo
        }
        for u in users
    ]
